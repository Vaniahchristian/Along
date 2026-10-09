# "I'm Free" — Integration Design (inspection-only)

**Status:** DESIGN — no implementation, no file edits, no SQL, no Supabase access performed.
**Project:** Tagwimi (`Along/`), Supabase project `jjhjuezixwelxcwnnlrt` (runtime-only URL; placeholder-only `.env.example`).
**Purpose:** Specify how the "I'm Free" (date-night matchmaker) feature can be built on top of the existing plan / membership / request / message / notification / expiry architecture. Everything marked `REUSE` is verified from repository evidence; everything marked `UNKNOWN — live-only` requires live Supabase verification.

---

## 1. What the feature needs

| Need | Existing Tagwimi asset | Verdict |
|---|---|---|
| Date/activity card (venue, time, capacity, host, photo, category) | `plans` + `plan_meeting_details` | **REUSE** |
| People → dates (guest list) | `memberships` (pair of plan_id + profile_id) | **REUSE** |
| "I'm free — want to come?" proposal | `join_requests` | **REUSE** |
| Date conversation | `messages` (one table per plan) | **REUSE** |
| Date updates / match notifications | `notifications` (9 kinds) | **REUSE** |
| Availability/interests signal | `profiles.interests` (array of text) | **REUSE** |
| Date lifecycle, auto-close, expiry | `plan-lifecycle.sql` + `pg_cron` + `close_expired_along_plans()` | **REUSE** |
| Auth / profile identity | Clerk → Supabase JWT → `current_along_profile_id()` / `along_account_active()` | **REUSE** |
| Existing category taxonomy | `plans-category-parties.sql` (Fitness/Outings/Learning/Parties) | **REUSE — no new category system** |
| Chat UI, notifications UI, shell unread counts | `chat/[id]/page`, `plans.jsx`, `explore.jsx`, `detail.jsx`, `notifications.jsx`, `shell.jsx` | **REUSE** |

**No new database tables are required for MVP.** The feature is a product layer over the existing "plan → membership → request → message → notification" graph. Only a thin new UI layer and (optionally) a couple of profile fields are added.

---

## 2. Data model & state machine

### 2.1 Entities (all repo-verified where marked)

| Entity | Repo-verified columns | Notes |
|---|---|---|
| `public.profiles` | id, clerk_user_id, display_name, initials, tone, interests, is_demo_seed, bio, city, avatar_path, suspended_at | Identity + interest signal. Public select grants (profiles RLS) |
| `public.plans` | host_id, category, title, venue, date_label, time_label, starts_at, ends_at, spots, size, intro, bring, meet, beginner_friendly, visibility, cost_note, image_path, status, cancelled_at, hidden_at, hidden_reason | Host-created event/date card. Statuses 'open'/'closed' + cancel/hide flags |
| `public.join_requests` | plan_id, requester_id, intro, status, created_at, cancelled_at, response_at, expires_at | The proposal/match record. Statuses 'pending'/'accepted'/'cancelled' (base CHECK not in repo) |
| `public.memberships` | plan_id, profile_id, role, checked_in, completed, chat_hidden_at | Guest list + attendance/presence flags |
| `public.messages` | plan_id, sender_id, body, media_type, media_path, created_at | One conversation per plan; RLS gates on membership |
| `public.notifications` | recipient_id, actor_id, plan_id, kind, title, body, created_at, read_at | 9 kinds: join_request, request_accepted, message, plan_closed, check_in, plan_completed, report, broadcast, support |
## 3. Availability signals (the "I'm Free" core)

**MVP — reuse only:**
- `profiles.interests` — 9-choice picker (Swimming, Hiking, Coffee, Art, Fitness classes, Walks, Food, Live music, Books) used both in the onboarding screen and the profile screen. Existing category taxonomy for `plans.category`: Fitness, Outings, Learning, Parties (CHECK constraint in `plans-category-parties.sql`).
- Public feed = open `plans` rows filtered by category/search/date (reuse `explore.jsx` + `loadAppState`).
- No new availability table needed: "I'm free for what I'm interested in" is expressed by `interests` + open plans she hosts.

**Optional phase 2 (NOT required, NOT in repo):**
- Profile-level `seeking` text ('open to dates' / 'everything') with CHECK — decide if an explicit dating-state flag is needed beyond interests. If added, it must be a live-DB addition with its own CHECK constraint and RLS grant.

---

## 4. Match / proposal flow (reuse, no new tables)

```text
requester                          host
   |--- insert join_requests (status 'pending') ---->|
   |<---- notifications (join_request) ----          |
   |<---- RPC accept_along_request ----              |  (host taps Accept)
   |---- memberships (role 'member') ---->           |
   |---- plans.spots - 1 ---->                       |
   |<---- notifications (request_accepted) ----      |
   |---- messages (chat channel) ---->               |  chat per plan is live
   |<-------------------------------------------->|  (realtime pub on messages)
   |<---- notifications (message) ----              |
```

- Proposal = `join_requests` row (`requester_id`, `plan_id`, `intro`). The host is the plan owner; the requester is the date proposer.
- Match = accepted request (membership created, seat consumed, chat unlocked).
- No dedicated `matches` table in the MVP. Optional later: `matches(user_a, user_b, matched_at)` with a composite unique constraint, populated only when the product needs a **reciprocal** match (two people liking each other) rather than a proposal.
- Rejection/cancel = `cancel_join_request` (DELETE on join_requests, `status='pending'` policy) or host decline with `status='cancelled'`.

---

## 5. Exact reuse contract (verified from repo)

### 5.1 Functions / RPCs to call (apps layer)

| Symbol | File | Contract |
|---|---|---|
| `publishPlan(viewerId, plan)` | `lib/along/plans.js:16` | inserts plans (host_id, category, title, venue, date_label, time_label, starts_at, ends_at, spots, size, intro, bring, beginner_friendly, visibility || 'public', cost_note, status 'open') → memberships 'host' → plan_meeting_details; returns plan id |
| `updatePlan(viewerId, planId, plan)` | `lib/along/plans.js:56` | updates fields; enforces size 2..5 and `nextSize >= going` |
| `updatePlanVisibility(viewerId, planId, visibility)` | `lib/along/plans.js:119` | 'public' | 'link_only' |
| `requestJoinPlan(viewerId, planId, intro)` | `lib/along/requests.js:4` | insert into join_requests (status pending) |
| `cancelJoinRequest(viewerId, planId)` | `lib/along/requests.js` | delete own pending request |
| `acceptHostRequest(planId, requestId)` | `lib/along/requests.js:21` | RPC `accept_along_request` |
| `markComplete(viewerId, planId)` | `lib/along/membership.js:14` | RPC `complete_along_plan` (member done; host also closes) |
| `markCheckIn(viewerId, planId)` | `lib/along/membership.js` | memberships.update checked_in |
| `hideConversation(memberId, planId)` | `lib/along/membership.js` | memberships.update chat_hidden_at |
| `closeExpiredPlans()` | `lib/along/membership.js` | RPC `close_expired_along_plans` (call on bootstrap in `loadAppState`) |
| `loadAppState(viewerId)` | `lib/along/state.js:127` | opens plans + hostRequests + joined + checkins + completed + hiddenChats; call `closeExpiredPlans()` first |
| `loadNotifications(viewerId)` | `lib/along/notifications.js:4` | latest 100, ordered desc |
### 5.3 RLS policies (launch-readiness.sql, the complete set for the five tables)

- **profiles:** see-real (not demo seed), create-own, edit-own.
- **plans:** see-real (host exists), create-own (host_id, status='open', spots>=0, size 2..5), update-own.
- **join_requests:** see (requester or host), ask-to-join (requester, pending, host<>requester, open, spots>0), hosts-decide (host), cancel-own-delete (pending).
- **memberships:** see (own or host), create-own-host, hosts-add-accepted (accepted request + host), update-own-attendance.
- **messages:** group-members-see, group-members-send (sender_id, body 1..500 chars, own membership).
- Grants: select on the five tables; insert on the five; update (display_name, initials, tone, interests) on profiles; update spots on plans; update status on join_requests; delete join_requests; update checked_in/completed on memberships.

### 5.4 Triggers (repo SQL)

- `notify_join_request` on join_requests (insert | update of status) → create_along_notifications()
- `notify_message` on messages → create_along_notifications() (recipient = all plan members except sender)
- `notify_plan_closed` on plans (update of status) → create_along_notifications()
- `notify_membership_activity` on memberships (update of checked_in, completed)
- `queue_email_request` on join_requests, `queue_email_plan` on plans (starts_at/date_label/time_label/venue/cost_note/cancelled_at)
- `reveal_hidden_chats_on_message` on messages insert → reset chat_hidden_at for other members of the same plan

### 5.5 Realtime (supabase_realtime)

- publication `supabase_realtime` includes `public.messages` (plan_id filter, plus the hidden-chat reveal trigger) and `public.notifications` (recipient filter). **No plans-table subscription** — plan list changes are driven by explicit `refresh()` calls in `along-core` (not by a pub/sub channel).
- Media: `/api/chat-media` + `/api/chat-media/urls` (signed URLs); plan images via `plan-images` bucket public URL.

### 5.6 UI contracts (reuse targets)

- `ExploreScreen` (explore.jsx): category pills (All/Fitness/Outings/Learning/Parties), search, pagination, plan cards, → opens detail.
- `DetailScreen` (detail.jsx): joined/requested/done state, request button (disabled busy), host incoming requests + Accept (detail.jsx:474), invite-only after join.
- `PlansScreen` (plans.jsx): hosted + my-requested lists with badges (mine/pending/done), cancel-request, manage plan, report.
- `ChatScreen` (chat.jsx): per-plan messages, composer, check-in button, complete/close button, hidden-chat reveal.
- `NotificationsScreen` (notifications.jsx): icons per kind, unread badge (`unread = notifications.filter(!read_at).length`), Mark all read, Clear all.
- `Shell` (shell.jsx): unread counts → badges; personalization surface.
- `ProfileScreen` + `ProfileOnboarding` (profile.jsx, auth/profile-onboarding.jsx): 9-choice `interests` picker; extra fields bio/city/avatar.

---
## 7. Design compromises & known risks

1. **Publish is not atomic.** `publishPlan()` performs 3 sequential client-side inserts (plans → memberships → plan_meeting_details). If the second/thirdfails, an orphan plan row remains. For "I'm Free" date publishing, recommend wrapping the create in **one stored procedure (transaction)** in the live DB and calling that RPC instead of the current 3-client-insert flow. This is a known defect in the existing app, not a blocker for the design.
4. **Identity wiring detail is not fully in the repo.** `/api/profile` POST uses `auth()` (serverless), validates a verified Clerk email, and links/clones a `profiles` row by `clerk_user_id`; the client uses a generic Clerk token getter (`clerk.getToken()`, no named "supabase" template in the repo). The exact Clerk JWT template + Supabase JWT claim mapping must be verified in the deployed env, and `along_account_active()`/JWT expiry behavior on Vercel is an environment fact, not a repo fact.
5. **Realtime publish list is limited.** Only messages + notifications subscribe; the plans view is pull-based. "I'm Free" notifications will therefore be DB-triggered (not realtime), which is fine and matches the existing pattern.
6. **No new category system needed** — the existing `plans.category` CHECK (`Fitness|Outings|Learning|Parties`) already covers the "I'm Free" tags; the 9-choice `interests` array covers profile-level signals.

---

## 8. Live-database unknowns (must verify after approval)

- Base definitions & CHECK constraints for `plans`, `memberships`, `messages`, `join_requests`, `notifications` (and indexes)
- Full RLS policy set for `notifications` (read/deny policies) and `profiles` (public select)
- Whether `plan-lifecycle.sql`/`launch-readiness.sql` has actually been applied to `jjhjuezixwelxcwnnlrt`
- pg_cron schedule + `close_expired_along_plans()` body/behavior live
- RPC bodies: `close_expired_along_plans`, `complete_along_plan`, notification function; exact `profile_id` mapping from Clerk/Supabase JWT
- Real-time publication state; any live indexes on plans/memberships/messages
- Current row data (statuses, interest seeds, visibility values) may differ from repo examples

---

## 9. Phase 2 follow-ups (after MVP approval)

- Optional `profiles.seeking` availability flag (live SQL + RLS + UI).
- Optional reciprocal-match table (`matches`) if product requires mutual liking.
- Transactional date-publish stored procedure to fix the 3-client-insert race.
- Demo seed script additions for "I'm Free" interest + date history.
2. **Base table DDL is not in the repo.** `plans`, `memberships`, `messages`, `join_requests`, `notifications` definitions + CHECK constraints (status lists, role lists, kind lists, body length) are only in the live DB. The app enforces some constraints (spots 2..5, body 1..500) and RPCs also guard (spots >= 1, no duplicate membership) — the DB CHECK list must be verified before trusting constraint-level safety.
3. **pg_cron schedule is not in the repo.** `close_expired_along_plans()` frequency and the cron entry must be verified live before relying on expiry timing.

## 6. MVP screen plan for "I'm Free"

1. **Free feed** (`/app/free`) — reuse Explore + `loadAppState`: open plans (public + link_only), category/date/input filter, host profile chips, "I'm Free" hero. No new data, no new search engine.
2. **Profile availability** (`/app/profile`) — reuse profile.jsx + onboarding: keep the 9-choice interests; date fields (venue/time) live on `plans` ("the date I'm offering").
3. **Date card** (`/app/plans/[id].page` — reuse `detail.jsx`) — request (propose a date), host accept (match), chat opens automatically.
4. **Chat** (`/app/chat/[id]/page`) — reuse existing screen; messages/notifications APIs unchanged.
5. **Match notifications** — reuse `notifications` rows: join_request, request_accepted, message; plan_closed at end of date.
6. **Expiry** — reuse `close_expired_along_plans()` + pg_cron: dates past auto-close; plan card routes to "completed" state.

**New UI screens needed:** only the free-feed entry + small profile availability toggles. Everything else reuses existing components.
| `sendPlanMessage(viewerId, planId, text)` | `lib/along/messages.js:53` | insert into messages (plan_id, sender_id, body) |
| `sendPlanMedia`, `loadPlanMessages`, `hydrateMessage` | `lib/along/messages.js` | media via `/api/chat-media`; realtime hydrates thread |
| `ensureClerkViewerProfile` | `lib/along/profile.js` | Clerk → profile resolution |

### 5.2 RPCs / functions defined in repo SQL

- `public.accept_along_request(target_request_id uuid)` — validate pending request, host owns plan, spots >= 1, no duplicate membership; then accept + insert member + spots−1. (clerk-identity.sql:64, launch-readiness.sql:78, plan-lifecycle.sql:64 — same body everywhere.)
- `public.close_expired_along_plans()` — expiry machinery (body not in repo).
- `public.complete_along_plan(target_plan_id)` — membership completed + host close side effect.
- `private.current_along_profile_id()` — Clerk JWT subject → profile UUID (auth.uid-style for legacy UUID).
- `private.along_account_active()` — not suspended (suspended_at is null) — gates plans/join_requests/messages inserts and membership updates.
- Notification function: `public.create_along_notifications()` — tg_table_name in ('join_requests','messages','plans','memberships','plan_reports'); inserts one row per recipient. Triggers: `notify_join_request` (join_requests insert/update status), `notify_message` (messages insert), `notify_plan_closed` (plans status update), `notify_membership_activity` (memberships checked_in/completed update), `notify_plan_report`.
| `public.plan_meeting_details` | plan_id, meet, maps_url | Extra logistics for the date |
| `public.plan_reports` | (admin) + subject_profile_id, message_id, target_type, evidence_text, image_path, priority, assigned_admin_id | Moderation via `private.along_account_active()` |

### 2.2 Lifecycle (reuse)

- `publishPlan()` → status 'open', host membership + meeting detail inserted (client-side, non-atomic — see §7).
- `accept_along_request()` (RPC) → join_requests accepted, membership 'member', spots−1 (all three SQL files agree on this contract).
- `close_expired_along_plans()` → marks members done; scheduled by pg_cron (schedule NOT in repo — live-only).
- `complete_along_plan()` (RPC) → membership completed + host closes plan (app: detail.jsx "Mark completed", chat.jsx "Plan completed" button).
- `updatePlanVisibility()` → 'public' | 'link_only' (shared `/p/[id]` preview page).
- Screen effects: `done = completed.includes(id) || status !== 'open'`; composer disabled when `done || status !== 'open'`; button disabled when `busy || done`.