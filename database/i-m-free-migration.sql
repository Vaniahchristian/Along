-- Phase 3: I'm Free Migration
-- Timestamp: 2026-10-08
-- Description: Creates the I'm Free temporary matching system on top of
--              the existing profiles/interests infrastructure.
--
-- Scope:
--   - Creates new tables: availabilities, match_proposals,
--     match_proposal_participants, groups, group_members, group_messages.
--   - Extends public.notifications (nullable group_id + new kinds).
--   - Implements trusted SECURITY DEFINER functions.
--   - Enables RLS for new tables.
--   - Does NOT modify normal plans, memberships, join_requests, or messages.

BEGIN;

-- 1a. availabilities
CREATE TABLE IF NOT EXISTS public.availabilities (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    from_at      timestamptz NOT NULL,
    until_at     timestamptz NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT availabilities_from_before_until CHECK (from_at < until_at),
    UNIQUE (profile_id)
);

-- 1b. match_proposals
CREATE TABLE IF NOT EXISTS public.match_proposals (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    availability_a_id  uuid NOT NULL REFERENCES availabilities(id) ON DELETE CASCADE,
    availability_b_id  uuid NOT NULL REFERENCES availabilities(id) ON DELETE CASCADE,
    shared_interest    text NOT NULL,
    status             text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','active','formed','closed')),
    created_at         timestamptz NOT NULL DEFAULT now(),
    closed_at          timestamptz,
    CONSTRAINT match_proposals_canonical CHECK (availability_a_id < availability_b_id)
);

-- 1c. match_proposal_participants
CREATE TABLE IF NOT EXISTS public.match_proposal_participants (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id uuid NOT NULL REFERENCES match_proposals(id) ON DELETE CASCADE,
    profile_id  uuid NOT NULL REFERENCES profiles(id),
    decision    text NOT NULL DEFAULT 'pending'
                CHECK (decision IN ('pending','accepted','declined','expired')),
    decided_at  timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (proposal_id, profile_id)
);

-- 1d. groups
CREATE TABLE IF NOT EXISTS public.groups (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id uuid NOT NULL UNIQUE REFERENCES match_proposals(id) ON DELETE CASCADE,
    max_size   integer NOT NULL DEFAULT 5
                CHECK (max_size >= 2 AND max_size <= 5),
    created_at   timestamptz NOT NULL DEFAULT now()
);

-- 1e. group_members
CREATE TABLE IF NOT EXISTS public.group_members (
    group_id   uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    profile_id uuid NOT NULL REFERENCES profiles(id),
    joined_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (group_id, profile_id)
);

-- 1f. group_messages
CREATE TABLE IF NOT EXISTS public.group_messages (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    sender_id   uuid NOT NULL REFERENCES profiles(id),
    body        text NOT NULL CHECK (char_length(body) <= 500),
    created_at  timestamptz NOT NULL DEFAULT now(),
    media_type  text CHECK (media_type IS NULL OR media_type IN ('image','audio')),
    media_path  text,
    media_mime  text,
    CHECK (
        (media_path IS NULL AND media_mime IS NULL AND media_type IS NULL)
        OR
        (media_path IS NOT NULL AND media_mime IS NOT NULL AND media_type IS NOT NULL)
    )
);
-- 2. Security‑definer helper / RPC functions

-- create_availability --------------------------------------------------------
-- Creates or reschedules the caller's single availability window.
-- Lifecycle rule: a window may NOT be changed while an UNRESOLVED proposal
-- (pending/active) depends on it. 'formed' and 'closed' proposals are treated
-- as resolved and never freeze availability. An expired window (until_at<=now)
-- simply stops participating in matching; no cron/cleanup job is required.
CREATE OR REPLACE FUNCTION public.create_availability(
    p_from_at  timestamptz,
    p_until_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_profile_id uuid := private.current_along_profile_id();
    v_avail_id   uuid;
    v_existing   public.availabilities%rowtype;
BEGIN
    IF v_profile_id IS NULL THEN
        RAISE insufficient_privilege;
    END IF;
    IF private.along_account_active() IS NOT TRUE THEN
        RAISE SQLSTATE '45000'
        USING MESSAGE = 'Suspended accounts cannot create availability';
    END IF;
    IF p_from_at IS NULL OR p_until_at IS NULL OR p_from_at >= p_until_at THEN
        RAISE SQLSTATE '22000'
        USING MESSAGE = 'from_at must be before until_at';
    END IF;

    -- Lock the existing row (if any) to serialize concurrent reschedules.
    SELECT * INTO v_existing
    FROM public.availabilities
    WHERE profile_id = v_profile_id
    FOR UPDATE;

    -- H1: Auto-close any pending/active proposals whose shared availability
    -- window has already elapsed, so a stale, never-answered proposal (there is
    -- no cron sweeper) cannot lock this availability forever. The shared end is
    -- the earliest until_at of the two referenced windows. Proposals whose
    -- shared window is still in the future, and any formed groups, are untouched.
    IF v_existing.id IS NOT NULL THEN
        UPDATE public.match_proposals mp
        SET status = 'closed', closed_at = now()
        FROM public.availabilities aa, public.availabilities ab
        WHERE aa.id = mp.availability_a_id
          AND ab.id = mp.availability_b_id
          AND mp.status IN ('pending','active')
          AND (aa.id = v_existing.id OR ab.id = v_existing.id)
          AND least(aa.until_at, ab.until_at) <= now();
    END IF;

    -- Only an UNRESOLVED proposal (still pending/active) locks the window.
    IF v_existing.id IS NOT NULL AND EXISTS (
        SELECT 1
        FROM public.match_proposals
        WHERE (availability_a_id = v_existing.id OR availability_b_id = v_existing.id)
          AND status IN ('pending','active')
    ) THEN
        RAISE SQLSTATE '23505'
        USING MESSAGE = 'Cannot change availability while an unresolved match is in progress';
    END IF;

    INSERT INTO public.availabilities (profile_id, from_at, until_at, created_at)
    VALUES (v_profile_id, p_from_at, p_until_at, now())
    ON CONFLICT (profile_id) DO UPDATE SET
        from_at = EXCLUDED.from_at,
        until_at = EXCLUDED.until_at,
        created_at = now()
    RETURNING id INTO v_avail_id;

    RETURN v_avail_id;
END;
$$;

-- find_and_create_matches ---------------------------------------------------
-- ONLY client‑facing matching entrypoint. Internally calls the trusted
-- proposal creator for each newly discovered compatible pair.
CREATE OR REPLACE FUNCTION public.find_and_create_matches()
RETURNS TABLE (
    proposal_id        uuid,
    availability_a_id  uuid,
    availability_b_id  uuid,
    shared_interest    text,
    status             text,
    created_at         timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_profile_id     uuid := private.current_along_profile_id();
    v_avail          public.availabilities%rowtype;
    v_my_interests   text[];
    v_other_avail_id uuid;
    v_a_id           uuid;
    v_b_id           uuid;
    v_existing_id    uuid;
    v_other_profile_id uuid;
    v_other_from      timestamptz;
    v_other_until     timestamptz;
    v_other_interests text[];
    v_shared_int     text;
    v_shared_start   timestamptz;
    v_shared_end     timestamptz;
    v_proposal_id    uuid;
    v_status         text;
    v_created        timestamptz;
    v_created_new    boolean := false;
BEGIN
    IF v_profile_id IS NULL THEN RAISE insufficient_privilege; END IF;
    IF private.along_account_active() IS NOT TRUE THEN
        RAISE SQLSTATE '45000'
        USING MESSAGE = 'Suspended accounts cannot find matches';
    END IF;

    -- Caller must have a non-expired availability window. A window may start
    -- in the future; only its end must still be ahead of now().
    SELECT * INTO v_avail
    FROM public.availabilities
    WHERE profile_id = v_profile_id
      AND until_at > now()
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE SQLSTATE '45000'
        USING MESSAGE = 'No active availability found';
    END IF;

    SELECT interests INTO v_my_interests
    FROM public.profiles
    WHERE id = v_profile_id;

    -- Discover other non-expired windows whose interval overlaps the caller's.
    -- Windows starting in the future are eligible; overlap uses strict
    -- interval intersection, and the resulting shared window must not have
    -- already elapsed (shared_end > now()).
    FOR v_other_avail_id, v_other_profile_id, v_other_from, v_other_until, v_other_interests IN (
        SELECT b.id, b.profile_id, b.from_at, b.until_at, p.interests
        FROM public.availabilities b
        JOIN public.profiles p ON p.id = b.profile_id
        WHERE b.profile_id <> v_profile_id
          AND b.until_at > v_avail.from_at
          AND v_avail.until_at > b.from_at
          AND b.until_at > now()
          AND p.suspended_at IS NULL
          AND p.is_demo_seed = false
    ) LOOP
        -- Reset per-candidate state so a candidate with no shared interest (or
        -- one that resolves to an already-formed proposal) can never inherit a
        -- value left over from a previous iteration (PL/pgSQL does not null
        -- SELECT ... INTO targets on zero rows).
        v_shared_int  := NULL;
        v_existing_id := NULL;
        v_proposal_id := NULL;
        v_status      := NULL;
        v_created     := NULL;
        v_created_new := false;

        v_shared_start := greatest(v_avail.from_at, v_other_from);
        v_shared_end   := least(v_avail.until_at, v_other_until);

        -- Shared window must still be ahead of now() (may start in the future).
        IF v_shared_end > now() THEN
            -- Canonical ordering: availability_a_id < availability_b_id (CHECK constraint)
            v_a_id := least(v_avail.id, v_other_avail_id);
            v_b_id := greatest(v_avail.id, v_other_avail_id);

            SELECT i INTO v_shared_int
            FROM unnest(v_other_interests) AS i
            WHERE i = ANY(v_my_interests)
            LIMIT 1;

            IF v_shared_int IS NULL THEN
                CONTINUE;
            END IF;

            -- Look for an existing active proposal for this pair (parenthesized OR).
            SELECT id INTO v_existing_id
            FROM public.match_proposals
            WHERE availability_a_id = v_a_id
              AND availability_b_id = v_b_id
              AND status IN ('pending','active','formed')
            FOR UPDATE;

            IF v_existing_id IS NULL THEN
                INSERT INTO public.match_proposals (availability_a_id, availability_b_id, shared_interest, status, created_at)
                VALUES (v_a_id, v_b_id, v_shared_int, 'pending', now())
                ON CONFLICT (availability_a_id, availability_b_id)
                WHERE status IN ('pending','active','formed')
                DO NOTHING
                RETURNING id INTO v_proposal_id;

                -- v_created_new is true ONLY when THIS invocation actually
                -- inserted a brand-new proposal (RETURNING produced a row).
                -- A concurrent winner that made ON CONFLICT DO NOTHING fire
                -- leaves v_proposal_id NULL here and must NOT trigger a notify.
                v_created_new := (v_proposal_id IS NOT NULL);

                IF v_proposal_id IS NULL THEN
                    SELECT id INTO v_proposal_id
                    FROM public.match_proposals
                    WHERE availability_a_id = v_a_id
                      AND availability_b_id = v_b_id
                      AND status IN ('pending','active','formed');
                END IF;
            ELSE
                v_proposal_id := v_existing_id;
            END IF;

            IF v_proposal_id IS NOT NULL THEN
                INSERT INTO public.match_proposal_participants (proposal_id, profile_id, decision, created_at)
                VALUES (v_proposal_id, v_profile_id, 'pending', now()),
                       (v_proposal_id, v_other_profile_id, 'pending', now())
                ON CONFLICT (proposal_id, profile_id) DO NOTHING;

                -- Only notify when this invocation created a genuinely new
                -- proposal (H2): never on repeat matching runs or when a
                -- concurrent transaction already created the row.
                IF v_created_new THEN
                    INSERT INTO public.notifications (recipient_id, actor_id, kind, title, body)
                    VALUES (v_other_profile_id, v_profile_id, 'match_proposal',
                            'New match available', 'Someone free at a similar time shares an interest with you.');
                END IF;

                SELECT status, created_at INTO v_status, v_created
                FROM public.match_proposals WHERE id = v_proposal_id;

                -- M3: ordinary discovery surfaces only actionable proposals.
                -- A formed proposal is reachable through the existing group, not
                -- re-offered as a new opportunity here.
                IF v_status <> 'formed' THEN
                    RETURN QUERY SELECT v_proposal_id, v_a_id, v_b_id,
                                        v_shared_int,
                                        coalesce(v_status, 'pending'),
                                        coalesce(v_created, now());
                END IF;
            END IF;
        END IF;
    END LOOP;
    RETURN;
END;
$$;

-- accept_match_proposal -----------------------------------------------------
-- The second acceptance atomically forms exactly one group. Caller identity is
-- derived server-side; the client cannot choose a profile or a proposal state.
CREATE OR REPLACE FUNCTION public.accept_match_proposal(target_proposal_id uuid)
RETURNS TABLE (
    proposal_id      uuid,
    status           text,
    participant_count integer,
    group_id         uuid,
    created_at       timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_profile_id       uuid := private.current_along_profile_id();
    v_proposal         public.match_proposals%rowtype;
    v_participant      public.match_proposal_participants%rowtype;
    v_accepted_count   integer;
    v_group_id         uuid;
    v_status           text;
    v_shared_end       timestamptz;
BEGIN
    IF v_profile_id IS NULL THEN RAISE insufficient_privilege; END IF;
    IF private.along_account_active() IS NOT TRUE THEN
        RAISE SQLSTATE '45000'
        USING MESSAGE = 'Suspended accounts cannot accept proposals';
    END IF;

    -- Lock the proposal row so concurrent acceptances serialize here.
    SELECT * INTO v_proposal FROM public.match_proposals WHERE id = target_proposal_id FOR UPDATE;
    IF NOT FOUND THEN RAISE SQLSTATE '45000' USING MESSAGE = 'Proposal not found'; END IF;

    -- Authorization (F1): the caller must be a participant of this proposal
    -- before ANY state — including an already-formed group id/status — is
    -- disclosed. Fetch the caller's participation row once (any decision) and
    -- reuse it below. Identity is server-derived, so a non-participant can never
    -- reach the idempotent early return.
    SELECT * INTO v_participant
    FROM public.match_proposal_participants
    WHERE proposal_id = target_proposal_id AND profile_id = v_profile_id;
    IF NOT FOUND THEN
        RAISE SQLSTATE '42501' USING MESSAGE = 'You are not a participant in this proposal';
    END IF;

    -- Idempotent retry (participant-authorized): if a group already exists,
    -- return its current state without creating anything (no duplicate group/
    -- notifications).
    SELECT id INTO v_group_id FROM public.groups WHERE proposal_id = target_proposal_id;
    IF v_group_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_accepted_count
        FROM public.match_proposal_participants
        WHERE proposal_id = target_proposal_id AND decision = 'accepted';
        RETURN QUERY SELECT target_proposal_id, 'formed', v_accepted_count, v_group_id, v_proposal.created_at;
        RETURN;
    END IF;

    -- F2: if the caller already accepted but no group has formed yet, return the
    -- current proposal state consistently instead of raising. Read-only; no group
    -- is created and the public return shape is unchanged (group_id NULL).
    IF v_participant.decision = 'accepted' THEN
        SELECT status INTO v_status
        FROM public.match_proposals WHERE id = target_proposal_id;
        SELECT COUNT(*) INTO v_accepted_count
        FROM public.match_proposal_participants
        WHERE proposal_id = target_proposal_id AND decision = 'accepted';
        RETURN QUERY SELECT target_proposal_id, v_status, v_accepted_count, NULL::uuid, v_proposal.created_at;
        RETURN;
    END IF;

    IF v_proposal.status NOT IN ('pending','active') THEN
        RAISE SQLSTATE '23505' USING MESSAGE = 'Proposal is already formed or closed';
    END IF;

    -- M1: a NEW acceptance cannot form a group once the proposal's shared
    -- availability window has elapsed. The window is derived server-side from
    -- the two referenced availabilities (earliest until_at); never from the
    -- client.
    SELECT least(aa.until_at, ab.until_at) INTO v_shared_end
    FROM public.availabilities aa, public.availabilities ab
    WHERE aa.id = v_proposal.availability_a_id
      AND ab.id = v_proposal.availability_b_id;
    IF v_shared_end IS NOT NULL AND v_shared_end <= now() THEN
        RAISE SQLSTATE '45000' USING MESSAGE = 'This match window has already passed';
    END IF;

    -- Only a still-pending participant may make a NEW acceptance. A caller who
    -- already responded (declined/expired) is rejected here.
    IF v_participant.decision <> 'pending' THEN
        RAISE SQLSTATE '23505' USING MESSAGE = 'You have already responded to this proposal';
    END IF;

    UPDATE public.match_proposal_participants
    SET decision = 'accepted', decided_at = now()
    WHERE proposal_id = target_proposal_id AND profile_id = v_profile_id;

    SELECT COUNT(*) INTO v_accepted_count
    FROM public.match_proposal_participants
    WHERE proposal_id = target_proposal_id AND decision = 'accepted';

    IF v_accepted_count >= 2 THEN
        INSERT INTO public.groups (proposal_id, max_size, created_at)
        VALUES (target_proposal_id, 5, now())
        ON CONFLICT (proposal_id) DO NOTHING
        RETURNING id INTO v_group_id;

        -- Resolve the group id even if a concurrent tx already created it.
        IF v_group_id IS NULL THEN
            SELECT id INTO v_group_id FROM public.groups WHERE proposal_id = target_proposal_id;
        END IF;

        UPDATE public.match_proposals
        SET status = 'formed', closed_at = now()
        WHERE id = target_proposal_id;
        v_status := 'formed';

        INSERT INTO public.group_members (group_id, profile_id, joined_at)
        SELECT v_group_id, mp.profile_id, now()
        FROM public.match_proposal_participants mp
        WHERE mp.proposal_id = target_proposal_id AND mp.decision = 'accepted'
        ON CONFLICT (group_id, profile_id) DO NOTHING;

        INSERT INTO public.notifications (recipient_id, actor_id, group_id, kind, title, body)
        SELECT mp.profile_id, v_profile_id, v_group_id, 'group_ready',
               'Group ready', 'Your group is ready for chat.'
        FROM public.match_proposal_participants mp
        WHERE mp.proposal_id = target_proposal_id AND mp.decision = 'accepted'
          AND mp.profile_id <> v_profile_id;
    ELSE
        UPDATE public.match_proposals SET status = 'active' WHERE id = target_proposal_id;
        v_status := 'active';
    END IF;

    RETURN QUERY SELECT target_proposal_id, v_status, v_accepted_count, v_group_id, v_proposal.created_at;
END;
$$;


-- decline_match_proposal ----------------------------------------------------
-- Records a participant-local decline. Does NOT cancel the proposal for others.
-- Decline lifecycle: if the proposal can no longer reach two acceptances
-- (fewer than two participants remain pending/accepted), it is closed so it
-- stops blocking future matches. The declined decision + history is preserved.
CREATE OR REPLACE FUNCTION public.decline_match_proposal(target_proposal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_profile_id  uuid := private.current_along_profile_id();
    v_participant public.match_proposal_participants%rowtype;
    v_live_count  integer;
BEGIN
    IF v_profile_id IS NULL THEN RAISE insufficient_privilege; END IF;
    IF private.along_account_active() IS NOT TRUE THEN
        RAISE SQLSTATE '45000'
        USING MESSAGE = 'Suspended accounts cannot decline proposals';
    END IF;

    -- Lock the proposal to serialize concurrent decisions.
    PERFORM 1 FROM public.match_proposals WHERE id = target_proposal_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE SQLSTATE '45000' USING MESSAGE = 'Proposal not found';
    END IF;

    SELECT * INTO v_participant
    FROM public.match_proposal_participants
    WHERE proposal_id = target_proposal_id AND profile_id = v_profile_id AND decision = 'pending';

    IF NOT FOUND THEN
        RAISE SQLSTATE '23505'
        USING MESSAGE = 'You are not a pending participant';
    END IF;

    UPDATE public.match_proposal_participants
    SET decision = 'declined', decided_at = now()
    WHERE proposal_id = target_proposal_id AND profile_id = v_profile_id;

    -- If this proposal can no longer form a group (fewer than 2 participants
    -- can still accept), close it so the availability pair frees up for
    -- future matching. Already-formed groups are unaffected.
    SELECT COUNT(*) INTO v_live_count
    FROM public.match_proposal_participants
    WHERE proposal_id = target_proposal_id
      AND decision IN ('pending','accepted');

    IF v_live_count < 2 THEN
        UPDATE public.match_proposals
        SET status = 'closed', closed_at = now()
        WHERE id = target_proposal_id
          AND status IN ('pending','active');
    END IF;
END;
$$;

-- 6. SECURITY DEFINER membership helper -------------------------------------
-- Used by RLS policies on groups / group_members / group_messages so those
-- policies never have to self-reference group_members (avoids RLS recursion).
CREATE OR REPLACE FUNCTION private.im_free_is_group_member(target_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.group_members gm
        WHERE gm.group_id = target_group_id
          AND gm.profile_id = private.current_along_profile_id()
    );
$$;
REVOKE ALL ON FUNCTION private.im_free_is_group_member(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.im_free_is_group_member(uuid) TO authenticated;

-- 7. join_group ---------------------------------------------------------------
-- Late/third-party join into an already-formed group. Enforces capacity,
-- active availability, overlap with the proposal's shared window, and at
-- least one shared interest with an existing member.
CREATE OR REPLACE FUNCTION public.join_group(target_group_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_profile_id    uuid := private.current_along_profile_id();
    v_group         public.groups%rowtype;
    v_proposal      public.match_proposals%rowtype;
    v_avail_a       public.availabilities%rowtype;
    v_avail_b       public.availabilities%rowtype;
    v_my_avail      public.availabilities%rowtype;
    v_member_count  integer;
    v_my_interests  text[];
    v_has_shared    boolean;
    v_shared_start  timestamptz;
    v_shared_end    timestamptz;
BEGIN
    IF v_profile_id IS NULL THEN RAISE insufficient_privilege; END IF;
    IF private.along_account_active() IS NOT TRUE THEN
        RAISE SQLSTATE '45000'
        USING MESSAGE = 'Suspended accounts cannot join groups';
    END IF;

    -- Lock the group row: serializes concurrent joins so the capacity check
    -- and membership insert are atomic (no capacity race).
    SELECT * INTO v_group FROM public.groups WHERE id = target_group_id FOR UPDATE;
    IF NOT FOUND THEN RAISE SQLSTATE '45000' USING MESSAGE = 'Group not found'; END IF;

    -- Capacity check (authoritative; frontend never counts).
    SELECT COUNT(*) INTO v_member_count
    FROM public.group_members WHERE group_id = target_group_id;
    IF v_member_count >= v_group.max_size THEN
        RAISE SQLSTATE '45000' USING MESSAGE = 'This group is full';
    END IF;

    -- Not already a member (duplicate membership prevented here and by PK).
    IF EXISTS (SELECT 1 FROM public.group_members
               WHERE group_id = target_group_id AND profile_id = v_profile_id) THEN
        RAISE SQLSTATE '23505' USING MESSAGE = 'You are already in this group';
    END IF;

    -- Caller must have a non-expired availability (may start in the future).
    SELECT * INTO v_my_avail
    FROM public.availabilities
    WHERE profile_id = v_profile_id
      AND until_at > now();
    IF NOT FOUND THEN
        RAISE SQLSTATE '45000' USING MESSAGE = 'You have no active availability';
    END IF;

    -- Resolve the proposal's shared time window from its two availabilities.
    SELECT * INTO v_proposal FROM public.match_proposals WHERE id = v_group.proposal_id;
    IF NOT FOUND THEN
        RAISE SQLSTATE '45000' USING MESSAGE = 'Originating proposal not found';
    END IF;

    SELECT * INTO v_avail_a FROM public.availabilities WHERE id = v_proposal.availability_a_id;
    SELECT * INTO v_avail_b FROM public.availabilities WHERE id = v_proposal.availability_b_id;

    -- The proposal's intended shared window.
    v_shared_start := greatest(v_avail_a.from_at, v_avail_b.from_at);
    v_shared_end   := least(v_avail_a.until_at, v_avail_b.until_at);

    -- Reject joining once the group's shared window has already ended.
    IF v_shared_end <= now() THEN
        RAISE SQLSTATE '45000' USING MESSAGE = 'This group window has already ended';
    END IF;

    -- Caller availability must overlap that shared window (strict intersection).
    IF NOT (v_my_avail.from_at < v_shared_end AND v_shared_start < v_my_avail.until_at) THEN
        RAISE SQLSTATE '45000' USING MESSAGE = 'Your availability does not overlap the group window';
    END IF;

    -- Caller must share at least one interest with an existing group member.
    SELECT interests INTO v_my_interests FROM public.profiles WHERE id = v_profile_id;
    SELECT EXISTS (
        SELECT 1
        FROM public.group_members gm
        JOIN public.profiles p ON p.id = gm.profile_id
        WHERE gm.group_id = target_group_id
          AND p.interests && v_my_interests
    ) INTO v_has_shared;
    IF NOT v_has_shared THEN
        RAISE SQLSTATE '45000' USING MESSAGE = 'No shared interest with group members';
    END IF;

    INSERT INTO public.group_members (group_id, profile_id, joined_at)
    VALUES (target_group_id, v_profile_id, now())
    ON CONFLICT (group_id, profile_id) DO NOTHING;

    RETURN target_group_id;
END;
$$;

-- 8. send_group_message -------------------------------------------------------
-- Membership-gated message insert. Kept separate from public.messages (plan
-- chat). Media columns mirror the existing chat-media convention.
-- NOTE: SQL validates the body and that the sender is a member; it does NOT
-- and cannot verify uploaded file contents. The eventual server upload path
-- (/api route) must enforce group membership + media type/size before calling
-- this function with a media_path.
CREATE OR REPLACE FUNCTION public.send_group_message(
    target_group_id uuid,
    message_body    text,
    p_media_type    text DEFAULT NULL,
    p_media_path    text DEFAULT NULL,
    p_media_mime    text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_profile_id uuid := private.current_along_profile_id();
    v_message_id uuid;
BEGIN
    IF v_profile_id IS NULL THEN RAISE insufficient_privilege; END IF;
    IF private.along_account_active() IS NOT TRUE THEN
        RAISE SQLSTATE '45000'
        USING MESSAGE = 'Suspended accounts cannot send messages';
    END IF;

    -- Reject blank bodies; enforce length (mirrors the table CHECK).
    IF message_body IS NULL OR btrim(message_body) = '' THEN
        RAISE SQLSTATE '22000' USING MESSAGE = 'Message body cannot be blank';
    END IF;
    IF char_length(message_body) > 500 THEN
        RAISE SQLSTATE '22000' USING MESSAGE = 'Message body exceeds 500 characters';
    END IF;

    -- Must be a member of the group.
    IF NOT private.im_free_is_group_member(target_group_id) THEN
        RAISE SQLSTATE '42501' USING MESSAGE = 'You are not a member of this group';
    END IF;

    INSERT INTO public.group_messages (group_id, sender_id, body, media_type, media_path, media_mime, created_at)
    VALUES (target_group_id, v_profile_id, message_body, p_media_type, p_media_path, p_media_mime, now())
    RETURNING id INTO v_message_id;

    RETURN v_message_id;
END;
$$;

-- 9. Grants for the I'm Free RPCs --------------------------------------------
REVOKE ALL ON FUNCTION public.create_availability(timestamptz, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_availability(timestamptz, timestamptz) TO authenticated;

REVOKE ALL ON FUNCTION public.find_and_create_matches() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.find_and_create_matches() TO authenticated;

REVOKE ALL ON FUNCTION public.accept_match_proposal(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.accept_match_proposal(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.decline_match_proposal(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.decline_match_proposal(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.join_group(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.join_group(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.send_group_message(uuid, text, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.send_group_message(uuid, text, text, text, text) TO authenticated;

-- 10. Indexes -----------------------------------------------------------------
-- Duplicate proposal prevention: only one live proposal per availability pair.
CREATE UNIQUE INDEX IF NOT EXISTS match_proposals_active_pair_uk
    ON public.match_proposals (availability_a_id, availability_b_id)
    WHERE status IN ('pending', 'active', 'formed');

CREATE INDEX IF NOT EXISTS match_proposal_participants_proposal_idx
    ON public.match_proposal_participants (proposal_id);

CREATE INDEX IF NOT EXISTS match_proposal_participants_profile_idx
    ON public.match_proposal_participants (profile_id);

CREATE INDEX IF NOT EXISTS group_members_profile_idx
    ON public.group_members (profile_id);

CREATE INDEX IF NOT EXISTS group_messages_group_created_idx
    ON public.group_messages (group_id, created_at);

-- 11. Extend public.notifications --------------------------------------------
-- Add a nullable group_id and two new I'm Free notification kinds, while
-- preserving ALL existing kinds and rows. Done AFTER groups exists so the
-- FK can be created safely.
ALTER TABLE public.notifications
    ADD COLUMN IF NOT EXISTS group_id uuid;

ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS notifications_group_id_fkey;
ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_group_id_fkey
    FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

-- Recreate the kind CHECK to include the existing kinds plus the new ones.
-- All existing valid values remain valid, so existing rows stay valid.
ALTER TABLE public.notifications
    DROP CONSTRAINT IF EXISTS notifications_kind_check;
ALTER TABLE public.notifications
    ADD CONSTRAINT notifications_kind_check
    CHECK (kind IN (
        'join_request', 'request_accepted', 'message', 'plan_closed',
        'check_in', 'plan_completed', 'report', 'broadcast', 'support',
        'match_proposal', 'group_ready'
    ));

-- 12. RLS policies for the new tables ----------------------------------------
-- All writes go through SECURITY DEFINER RPCs, so authenticated receives
-- SELECT only. Writes (INSERT/UPDATE/DELETE) are never granted to the client.

-- availabilities: a user sees only their own availability row.
ALTER TABLE public.availabilities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.availabilities FROM public, anon, authenticated;
GRANT SELECT ON public.availabilities TO authenticated;
DROP POLICY IF EXISTS "members read own availability" ON public.availabilities;
CREATE POLICY "members read own availability" ON public.availabilities
    FOR SELECT TO authenticated
    USING (profile_id = (select private.current_along_profile_id()));

-- match_proposals: visible only to their participants.
ALTER TABLE public.match_proposals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.match_proposals FROM public, anon, authenticated;
GRANT SELECT ON public.match_proposals TO authenticated;
DROP POLICY IF EXISTS "participants read own proposals" ON public.match_proposals;
CREATE POLICY "participants read own proposals" ON public.match_proposals
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.match_proposal_participants mpp
        WHERE mpp.proposal_id = match_proposals.id
          AND mpp.profile_id = (select private.current_along_profile_id())
    ));

-- match_proposal_participants: a user sees only their own participation rows.
ALTER TABLE public.match_proposal_participants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.match_proposal_participants FROM public, anon, authenticated;
GRANT SELECT ON public.match_proposal_participants TO authenticated;
DROP POLICY IF EXISTS "members read own participation" ON public.match_proposal_participants;
CREATE POLICY "members read own participation" ON public.match_proposal_participants
    FOR SELECT TO authenticated
    USING (profile_id = (select private.current_along_profile_id()));

-- groups: visible only to members (helper avoids RLS recursion).
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.groups FROM public, anon, authenticated;
GRANT SELECT ON public.groups TO authenticated;
DROP POLICY IF EXISTS "members read own groups" ON public.groups;
CREATE POLICY "members read own groups" ON public.groups
    FOR SELECT TO authenticated
    USING (private.im_free_is_group_member(id));

-- group_members: members see the membership roster of their own groups.
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.group_members FROM public, anon, authenticated;
GRANT SELECT ON public.group_members TO authenticated;
DROP POLICY IF EXISTS "members see roster of their groups" ON public.group_members;
CREATE POLICY "members see roster of their groups" ON public.group_members
    FOR SELECT TO authenticated
    USING (private.im_free_is_group_member(group_id));

-- group_messages: only members can read their group's messages.
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.group_messages FROM public, anon, authenticated;
GRANT SELECT ON public.group_messages TO authenticated;
DROP POLICY IF EXISTS "members read group messages" ON public.group_messages;
CREATE POLICY "members read group messages" ON public.group_messages
    FOR SELECT TO authenticated
    USING (private.im_free_is_group_member(group_id));

COMMIT;

