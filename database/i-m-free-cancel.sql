-- Phase 5D: I'm Free availability cancellation --------------------------------
-- Adds public.cancel_availability(): removes the caller's free window without
-- touching formed groups or other users' history.
--
-- Behavior (single transaction):
--   1. Caller identity is derived server-side (never passed in). Suspension is
--      deliberately NOT a blocker here: cancellation only removes state, it
--      never grants an entitlement (create/find/accept/decline gate on
--      activity because they create or change matching state).
--   2. The caller's availability row is locked FOR UPDATE first, using the
--      same lock point as create_availability/find_and_create_matches, so
--      concurrent saves, matching, and cancellation serialize.
--   3. No row -> RETURN false (idempotent no-op; the frontend must not treat
--      this as a failure).
--   4. All UNRESOLVED proposals (pending/active) referencing the window are
--      closed (status + closed_at). Participant decisions are preserved as
--      history, matching the H1 sweep in create_availability and the decline
--      RPC. 'formed' proposals and their groups are never modified.
--   5. The availability row is DELETED only when no proposal references it
--      (match_proposals.availability_*_id are ON DELETE CASCADE, so deleting
--      a referenced row would destroy proposals, participants, groups, group
--      messages, and group_ready notifications). Otherwise the row is expired
--      in place while preserving the from_at < until_at CHECK.
--
-- Concurrency note: find_and_create_matches() reads candidate windows without
-- locking them, and its proposal INSERT blocks on this function's FOR UPDATE
-- via the FK's KEY SHARE lock. After commit, a delete makes that INSERT fail
-- with an FK violation (benign, retryable); an expire lets a stale 'pending'
-- proposal land against an already-ended window. That residue cannot form a
-- group (accept_match_proposal's shared-window check re-reads live timestamps
-- and raises 'This match window has already passed') and is swept by the H1
-- pass on the caller's next create_availability. Fully preventing it would
-- require re-validating candidate windows inside find_and_create_matches —
-- out of scope here; see the Phase 5D Step 2 report.
--
-- No tables, columns, statuses, or notification rows are added or changed.

BEGIN;

CREATE OR REPLACE FUNCTION public.cancel_availability()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_profile_id uuid := private.current_along_profile_id();
    v_avail_id   uuid;
BEGIN
    IF v_profile_id IS NULL THEN
        RAISE insufficient_privilege;
    END IF;

    -- Lock the caller's row (if any) to serialize concurrent cancellation,
    -- saves, and matching. This is the same lock point used by
    -- create_availability and find_and_create_matches.
    SELECT id INTO v_avail_id
    FROM public.availabilities
    WHERE profile_id = v_profile_id
    FOR UPDATE;

    IF v_avail_id IS NULL THEN
        -- Nothing to cancel: idempotent success, not a failure.
        RETURN false;
    END IF;

    -- Close unresolved proposals referencing this window. Formed proposals
    -- (and their groups/messages) are untouched; participant decisions are
    -- preserved as history, exactly like the H1 sweep and the decline RPC.
    UPDATE public.match_proposals
    SET status = 'closed', closed_at = now()
    WHERE status IN ('pending','active')
      AND (availability_a_id = v_avail_id OR availability_b_id = v_avail_id);

    -- Delete the row ONLY when nothing references it; a DELETE of a
    -- referenced row would cascade away proposals, participants, groups,
    -- group messages, and group notifications. Otherwise expire in place.
    IF NOT EXISTS (
        SELECT 1 FROM public.match_proposals
        WHERE availability_a_id = v_avail_id OR availability_b_id = v_avail_id
    ) THEN
        DELETE FROM public.availabilities WHERE id = v_avail_id;
    ELSE
        -- Expire now while preserving from_at < until_at: an already-started
        -- window keeps its original start; a not-yet-started window's start
        -- is pulled just behind now. Under the existing matching rules an
        -- expired window immediately stops participating (until_at > now()
        -- filters in find_and_create_matches/join_group) and the shared-
        -- window checks in accept_match_proposal block any group from
        -- forming against it.
        UPDATE public.availabilities
        SET from_at = LEAST(from_at, now() - interval '1 millisecond'),
            until_at = now()
        WHERE id = v_avail_id;
    END IF;

    RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_availability() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cancel_availability() TO authenticated;

COMMIT;
