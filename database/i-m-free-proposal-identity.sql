-- Phase 4D: Safe proposal identity 
--
-- Purpose: let an authenticated participant see the OTHER participant's public
-- profile card for a match proposal they belong to, without weakening RLS or
-- exposing private fields (email, clerk_user_id, suspension state).
--
-- Privacy gate: the peer row is returned ONLY when the caller has accepted
-- (their match_proposal_participants.decision = 'accepted') OR the proposal
-- itself is already 'active' or 'formed'. Pending invitees see no peer card.
-- Participant-count guard: proposals with <> 2 participant rows return no
-- peer (no arbitrary LIMIT 1 choice). Decision/status literals verified
-- against i-m-free-migration.sql: proposals pending/active/formed/closed,
-- participants pending/accepted/declined/expired.
--
-- Why an RPC: the applied Phase 3 RLS intentionally exposes only the caller's
-- own availability + participation rows, so the frontend cannot resolve the
-- counterpart through direct SELECTs. This SECURITY DEFINER function checks
-- membership first, then returns only the public columns already granted to
-- authenticated clients in database/member-profiles.sql:
--   id, display_name, initials, tone, interests, bio, city, avatar_path
-- Email / clerk_user_id / suspended_at / onboarding state are never returned.
-- Suspended or demo-seed profiles resolve to no rows (treated as missing).
--
-- Frontend: loadProposalPeers() maps a missing/empty RPC result to null and
-- free.jsx renders the placeholder text, both before acceptance (gated) and
-- for closed/decided proposals. No frontend change needed for this gate.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_match_proposal_peer(target_proposal_id uuid)
RETURNS TABLE (
    proposal_id  uuid,
    profile_id   uuid,
    display_name text,
    initials     text,
    tone         text,
    interests    text[],
    bio          text,
    city         text,
    avatar_path  text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_me uuid := (select private.current_along_profile_id());
    v_my_decision text;
    v_status text;
    v_count integer;
BEGIN
    IF v_me IS NULL THEN
        RAISE EXCEPTION 'Sign in to continue.' USING ERRCODE = '42501';
    END IF;

    -- Caller must be a participant in this proposal; capture their decision.
    SELECT mpp.decision INTO v_my_decision
    FROM public.match_proposal_participants mpp
    WHERE mpp.proposal_id = target_proposal_id
      AND mpp.profile_id = v_me;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'You are not part of this invitation.' USING ERRCODE = '42501';
    END IF;

    -- Resolve the proposal status for the privacy gate.
    SELECT mp.status INTO v_status
    FROM public.match_proposals mp
    WHERE mp.id = target_proposal_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Privacy gate: caller accepted, or the proposal is already active/formed.
    IF NOT (v_my_decision = 'accepted' OR v_status IN ('active', 'formed')) THEN
        RETURN;
    END IF;

    -- Guard: exactly two participants expected; otherwise return no peer
    -- rather than choosing an arbitrary row.
    SELECT count(*) INTO v_count
    FROM public.match_proposal_participants mpp
    WHERE mpp.proposal_id = target_proposal_id;
    IF v_count <> 2 THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        mpp.proposal_id,
        p.id,
        p.display_name,
        p.initials,
        p.tone,
        p.interests,
        p.bio,
        p.city,
        p.avatar_path
    FROM public.match_proposal_participants mpp
    JOIN public.profiles p ON p.id = mpp.profile_id
    WHERE mpp.proposal_id = target_proposal_id
      AND mpp.profile_id <> v_me
      AND COALESCE(p.is_demo_seed, false) = false
      AND p.suspended_at IS NULL
    ORDER BY p.id
    LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_match_proposal_peer(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_match_proposal_peer(uuid) TO authenticated;

COMMIT;
