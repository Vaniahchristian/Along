import { supabase } from '@/lib/supabase/client';
import { check } from '@/lib/along/errors';

const availabilitySelect = 'id,from_at,until_at,created_at';

/**
 * Load the signed-in profile's own availability row.
 * RLS restricts `availabilities` to the caller's own row; identity is
 * derived server-side from the Clerk JWT, so no profile ID is passed.
 */
export async function loadMyAvailability() {
  const result = await supabase.from('availabilities').select(availabilitySelect).maybeSingle();
  check(result.error);
  return result.data || null;
}

/**
 * Save (insert or reschedule) availability through the trusted RPC.
 * @param {string} p_from_at ISO timestamptz, inclusive start
 * @param {string} p_until_at ISO timestamptz, exclusive end
 * @returns {Promise<string>} availability id
 */
export async function saveAvailability(p_from_at, p_until_at) {
  const result = await supabase.rpc('create_availability', { p_from_at, p_until_at });
  check(result.error);
  return result.data;
}

/**
 * Run explicit match discovery for the caller's active availability.
 * No arguments. Returns rows: proposal_id, availability_a_id,
 * availability_b_id, shared_interest, status, created_at.
 */
export async function findMatches() {
  const result = await supabase.rpc('find_and_create_matches');
  check(result.error);
  return result.data || [];
}

const proposalSelect =
  'id,shared_interest,status,created_at,availability_a_id,availability_b_id';

/**
 * Load proposals the signed-in profile participates in.
 * RLS note: match_proposals is visible only to participants, and
 * match_proposal_participants exposes only the caller's own rows, so each
 * entry carries the shared interest + status + the caller's own decision.
 * The other party's identity is NOT readable under the applied migration
 * (no policy exposes it), so no counterpart profile is returned here.
 */
export async function loadMyProposals() {
  const mine = await supabase
    .from('match_proposal_participants')
    .select('proposal_id,decision,decided_at,created_at')
    .order('created_at', { ascending: false });
  check(mine.error);
  const rows = mine.data || [];
  if (!rows.length) return [];
  const ids = [...new Set(rows.map((row) => row.proposal_id))];
  const proposals = await supabase.from('match_proposals').select(proposalSelect).in('id', ids);
  check(proposals.error);
  const byId = new Map((proposals.data || []).map((row) => [row.id, row]));
  return rows
    .map((part) => {
      const proposal = byId.get(part.proposal_id);
      if (!proposal) return null;
      return {
        id: proposal.id,
        sharedInterest: proposal.shared_interest,
        status: proposal.status,
        createdAt: proposal.created_at,
        myDecision: part.decision,
        myDecidedAt: part.decided_at
      };
    })
    .filter(Boolean);
}

/**
 * Accept a proposal. Returns the RPC row:
 * proposal_id, status, participant_count, group_id, created_at.
 */
export async function acceptProposal(target_proposal_id) {
  const result = await supabase.rpc('accept_match_proposal', { target_proposal_id });
  check(result.error);
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  return row || null;
}

/** Decline a proposal. Returns void on success. */
export async function declineProposal(target_proposal_id) {
  const result = await supabase.rpc('decline_match_proposal', { target_proposal_id });
  check(result.error);
}

/**
 * Load the other participant's PUBLIC profile card for proposals the caller
 * belongs to. Requires the Phase 4D migration
 * (database/i-m-free-proposal-identity.sql) to be applied; when it is not,
 * the RPC is missing and each proposal resolves to null (card hidden).
 * Returns a Map of proposalId -> person|null. Only public columns are ever
 * returned: id, display_name, initials, tone, interests, bio, city,
 * avatar_path. Email and internal identity fields are never exposed.
 */
export async function loadProposalPeers(proposals) {
  const result = new Map();
  if (!proposals.length) return result;
  await Promise.all(
    proposals.map(async (proposal) => {
      try {
        const peer = await supabase.rpc('get_match_proposal_peer', {
          target_proposal_id: proposal.id
        });
        if (peer.error) {
          result.set(proposal.id, null);
          return;
        }
        const row = Array.isArray(peer.data) ? peer.data[0] : peer.data;
        if (!row?.profile_id) {
          result.set(proposal.id, null);
          return;
        }
        let avatarUrl = null;
        if (row.avatar_path) {
          try {
            avatarUrl = supabase.storage
              .from('profile-photos')
              .getPublicUrl(row.avatar_path).data.publicUrl;
          } catch {
            avatarUrl = null;
          }
        }
        result.set(proposal.id, {
          id: row.profile_id,
          name: row.display_name || 'Member',
          initials: row.initials || '?',
          tone: row.tone || '',
          interests: row.interests || [],
          bio: row.bio || '',
          city: row.city || '',
          avatarUrl
        });
      } catch {
        result.set(proposal.id, null);
      }
    })
  );
  return result;
}
