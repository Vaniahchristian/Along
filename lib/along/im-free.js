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
 * Cancel the caller's free window through the trusted RPC.
 * Closes any unresolved (pending/active) proposals referencing the window;
 * deletes the availability row only when no proposal references it, otherwise
 * expires it in place. Formed groups and group chat are never touched.
 * Idempotent: returns false when there was nothing to cancel (no availability
 * row) — not an error.
 * @returns {Promise<boolean>} true when a window existed and was cancelled
 */
export async function cancelAvailability() {
  const result = await supabase.rpc('cancel_availability');
  check(result.error);
  return Boolean(result.data);
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

/**
 * Load the signed-in profile's I'm Free groups (read-only).
 * RLS note: `groups` and `group_members` are visible only to members of each
 * group (via `private.im_free_is_group_member`), and `match_proposals` is
 * visible only to proposal participants. Identity is derived server-side, so
 * no profile ID is passed and no other user's private data is fetched.
 * Member counts come only from the visible `group_members` roster rows. When
 * a group's proposal row is not visible to the caller (e.g. late-join members
 * who are not proposal participants), the group still appears with the safe
 * fallback label 'Your group' instead of weakening authorization.
 * @returns {Promise<Array<{id:string,sharedInterest:string,status:string,maxSize:number,memberCount:number,joinedAt:string,createdAt:string}>>}
 */
export async function loadMyGroups() {
  const memberships = await supabase
    .from('group_members')
    .select('group_id,joined_at')
    .order('joined_at', { ascending: false });
  check(memberships.error);
  const roster = memberships.data || [];
  if (!roster.length) return [];
  const groupIds = [...new Set(roster.map((row) => row.group_id))];
  const groups = await supabase.from('groups').select('id,proposal_id,max_size,created_at').in('id', groupIds);
  check(groups.error);
  const groupRows = groups.data || [];
  if (!groupRows.length) return [];
  const memberCountByGroup = new Map();
  const joinedAtByGroup = new Map();
  for (const row of roster) {
    memberCountByGroup.set(row.group_id, (memberCountByGroup.get(row.group_id) || 0) + 1);
    const seen = joinedAtByGroup.get(row.group_id);
    if (!seen || String(row.joined_at) < String(seen)) joinedAtByGroup.set(row.group_id, row.joined_at);
  }
  const proposalIds = [...new Set(groupRows.map((row) => row.proposal_id))];
  const proposals = await supabase
    .from('match_proposals')
    .select('id,shared_interest,status,created_at')
    .in('id', proposalIds);
  check(proposals.error);
  const proposalById = new Map((proposals.data || []).map((row) => [row.id, row]));
  return groupRows
    .map((group) => {
      const proposal = proposalById.get(group.proposal_id) || null;
      return {
        id: group.id,
        sharedInterest: proposal?.shared_interest || 'Your group',
        status: proposal?.status || 'formed',
        maxSize: group.max_size,
        memberCount: memberCountByGroup.get(group.id) || 0,
        joinedAt: joinedAtByGroup.get(group.id) || group.created_at,
        createdAt: group.created_at
      };
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

async function loadGroupPeople(ids) {
  if (!ids.length) return new Map();
  const people = await supabase.from('profiles').select('id,display_name,initials,tone').in('id', ids);
  check(people.error);
  return new Map((people.data || []).map((person) => [person.id, person]));
}

/**
 * Load text messages for a group the caller belongs to (read-only refetch).
 * Membership is enforced by RLS on `group_messages`; a non-member reads
 * nothing. Sender names use only public profile columns.
 */
export async function loadGroupMessages(viewerId, target_group_id) {
  const result = await supabase
    .from('group_messages')
    .select('id,group_id,sender_id,body,created_at')
    .eq('group_id', target_group_id)
    .order('created_at');
  check(result.error);
  const rows = result.data || [];
  const people = await loadGroupPeople([...new Set(rows.map((row) => row.sender_id))]);
  return rows.map((row) => {
    const sender = people.get(row.sender_id);
    return {
      id: row.id,
      mine: row.sender_id === viewerId,
      senderId: row.sender_id,
      senderName: sender?.display_name || 'Member',
      senderInitials: sender?.initials || '??',
      senderTone: sender?.tone || '',
      text: row.body,
      createdAt: row.created_at
    };
  });
}

/**
 * Send a text message through the trusted RPC (never direct INSERT).
 * Uses exact RPC params: target_group_id + message_body. Membership, blank
 * body, and the 500-character limit are also enforced server-side.
 * @returns {Promise<string>} new message id
 */
export async function sendGroupMessage(target_group_id, message_body) {
  const text = String(message_body || '').trim();
  if (!text) throw new Error('Write a message before sending.');
  if (text.length > 500) throw new Error('Keep messages to 500 characters or less.');
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('You appear to be offline. Check your connection and try again.');
  }
  const result = await supabase.rpc('send_group_message', { target_group_id, message_body: text });
  check(result.error);
  return result.data;
}
