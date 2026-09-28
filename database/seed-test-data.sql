-- Along full test seed: loginable accounts + data across all app tables.
-- Password for every seeded account: along123
-- Preserves real accounts (is_demo_seed = false) such as Mukisa / admin.

create extension if not exists pgcrypto;

-- Remove previous fake seed profiles (cascades plans, memberships, messages, etc.)
delete from public.profiles where is_demo_seed = true;

-- Also clear any prior @along.test auth users from a previous seed run
delete from auth.users where email like '%@along.test';

create or replace function public._seed_along_user(
  p_id uuid,
  p_email text,
  p_name text,
  p_initials text,
  p_tone text,
  p_interests text[]
) returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    email_change_token_current, reauthentication_token, is_sso_user, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    crypt('along123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', p_name, 'interests', to_jsonb(p_interests)),
    now(),
    now(),
    '', '', '', '', '', '',
    false,
    false
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    p_id,
    jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true, 'phone_verified', false),
    'email',
    p_id::text,
    now(),
    now(),
    now()
  );

  insert into public.profiles (id, display_name, email, initials, tone, interests, is_demo_seed)
  values (p_id, p_name, p_email, p_initials, p_tone, p_interests, false);
end;
$$;

select public._seed_along_user('a0000000-0000-4000-8000-000000000001', 'maya@along.test', 'Maya K.', 'MK', 'pink', array['Swimming','Fitness classes']);
select public._seed_along_user('a0000000-0000-4000-8000-000000000002', 'david@along.test', 'David O.', 'DO', 'green', array['Coffee','Walks']);
select public._seed_along_user('a0000000-0000-4000-8000-000000000003', 'brenda@along.test', 'Brenda N.', 'BN', '', array['Fitness classes']);
select public._seed_along_user('a0000000-0000-4000-8000-000000000004', 'aisha@along.test', 'Aisha M.', 'AM', 'pink', array['Walks','Outings']);
select public._seed_along_user('a0000000-0000-4000-8000-000000000005', 'joel@along.test', 'Joel T.', 'JT', 'green', array['Art & learning']);
select public._seed_along_user('a0000000-0000-4000-8000-000000000006', 'nina@along.test', 'Nina A.', 'NA', 'pink', array['Outings','Coffee']);
select public._seed_along_user('a0000000-0000-4000-8000-000000000007', 'sam@along.test', 'Sam R.', 'SR', 'green', array['Swimming','Walks']);
select public._seed_along_user('a0000000-0000-4000-8000-000000000008', 'alex@along.test', 'Alex P.', 'AP', '', array['Fitness classes','Coffee']);

-- Open plans for explore / join / host flows
insert into public.plans (id, host_id, category, title, venue, date_label, time_label, spots, size, intro, bring, meet, beginner_friendly, status, created_at) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Fitness', 'Saturday morning swim at Silver Springs', 'Silver Springs Hotel pool, Bugolobi', 'Sat, 4 Oct', '10:00 AM', 1, 3, 'Easy laps, beginners welcome. Juice afterwards if you are free.', 'Swimwear, towel, pool entry fee', 'Café entrance beside the pool', true, 'open', now() - interval '2 days'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'Outings', 'Coffee and a quiet work session', 'Endiro Coffee, Kisementi', 'Sun, 5 Oct', '2:30 PM', 2, 4, 'Ninety minutes of quiet work, then a proper coffee break.', 'Laptop or notebook; buy your own drink', 'Long table near the window', false, 'open', now() - interval '1 day'),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'Fitness', 'Try a beginner circuit class together', 'The Cube Fitness, Kololo', 'Mon, 6 Oct', '6:00 PM', 1, 2, 'First circuit class for both of us. Arrive early and figure it out together.', 'Workout clothes, water, class fee', 'Front desk, 15 minutes before class', true, 'open', now() - interval '20 hours'),
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', 'Outings', 'A slow walk through the botanical gardens', 'Entebbe Botanical Gardens', 'Sat, 11 Oct', '9:00 AM', 2, 5, 'Easy morning walk on the main paths, fresh air and conversation.', 'Comfortable shoes, water, entry fee', 'Main entrance ticket office', false, 'open', now() - interval '12 hours'),
  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000005', 'Learning', 'Sketch and sip at an art workshop', 'The Artfield, Ntinda', 'Sun, 12 Oct', '11:00 AM', 2, 3, 'No drawing skills required. Easier to walk in with company.', 'Workshop fee and curiosity', 'Outside the studio entrance', false, 'open', now() - interval '8 hours'),
  ('b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'Outings', 'Lakeside stretch and sunset chat', 'Munyonyo lakeside promenade', 'Fri, 19 Sep', '5:30 PM', 0, 3, 'Past meetup used for completed-plan testing.', 'Water bottle', 'Near the main parking lot gate', true, 'open', now() - interval '10 days'),
  ('b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000002', 'Outings', 'Weekend brunch that got cancelled', 'Café Javas, Bugolobi', 'Sat, 20 Sep', '11:00 AM', 0, 4, 'Closed plan for moderation and history testing.', 'Appetite', 'Host stand inside', false, 'closed', now() - interval '9 days');

-- Host memberships for every plan
insert into public.memberships (plan_id, profile_id, role, checked_in, completed, created_at) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'host', false, false, now() - interval '2 days'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'host', false, false, now() - interval '1 day'),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', 'host', false, false, now() - interval '20 hours'),
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', 'host', false, false, now() - interval '12 hours'),
  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000005', 'host', false, false, now() - interval '8 hours'),
  ('b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'host', true, true, now() - interval '10 days'),
  ('b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000002', 'host', false, false, now() - interval '9 days');

-- Confirmed members (chat + check-in + completed flows)
insert into public.memberships (plan_id, profile_id, role, checked_in, completed, created_at) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000007', 'member', false, false, now() - interval '1 day'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000006', 'member', false, false, now() - interval '10 hours'),
  ('b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000007', 'member', true, true, now() - interval '9 days'),
  ('b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000006', 'member', true, true, now() - interval '9 days');

-- Pending join requests (host approval flow)
insert into public.join_requests (id, plan_id, requester_id, status, created_at) values
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000006', 'pending', now() - interval '3 hours'),
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000008', 'pending', now() - interval '2 hours'),
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000007', 'pending', now() - interval '90 minutes'),
  ('c0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000008', 'pending', now() - interval '40 minutes'),
  ('c0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000006', 'pending', now() - interval '25 minutes');

-- Accepted request history (already reflected in memberships above)
alter table public.join_requests disable trigger notify_join_request;
insert into public.join_requests (id, plan_id, requester_id, status, created_at) values
  ('c0000000-0000-4000-8000-000000000010', 'b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000007', 'accepted', now() - interval '1 day'),
  ('c0000000-0000-4000-8000-000000000011', 'b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000006', 'accepted', now() - interval '10 hours'),
  ('c0000000-0000-4000-8000-000000000012', 'b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000007', 'accepted', now() - interval '9 days'),
  ('c0000000-0000-4000-8000-000000000013', 'b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000006', 'accepted', now() - interval '9 days');
alter table public.join_requests enable trigger notify_join_request;

-- Group chat messages (message notifications are useful for testing)
alter table public.messages disable trigger notify_message;
insert into public.messages (plan_id, sender_id, body, created_at) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Hi! The pool opens at 9, so 10 should be nice and calm.', now() - interval '22 hours'),
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000007', 'Perfect. I will bring an extra towel just in case.', now() - interval '21 hours'),
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Great. Meet at the café entrance and we can walk in together.', now() - interval '20 hours'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'I grabbed the long table near the window. Power sockets are free.', now() - interval '8 hours'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000006', 'On my way. Ordering a flat white when I arrive.', now() - interval '7 hours'),
  ('b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'Thanks for coming. That sunset was worth it.', now() - interval '9 days'),
  ('b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000007', 'Same here. Let’s do another walk soon.', now() - interval '9 days' + interval '10 minutes');
alter table public.messages enable trigger notify_message;

-- Admin moderation: open + resolved reports
insert into public.plan_reports (id, plan_id, reporter_id, reason, status, review_note, reviewed_by, reviewed_at, created_at) values
  ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000006', 'The host cancelled late and the details looked unclear after people had already planned transport.', 'open', null, null, null, now() - interval '1 day'),
  ('d0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000007', 'Venue fee was not mentioned clearly. Please check whether the plan description needs an update.', 'open', null, null, null, now() - interval '5 hours'),
  ('d0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000008', 'Looks fine after review — testing a resolved report for the admin dashboard.', 'resolved', 'Reviewed and no policy breach found.', 'ec62c77f-de18-4953-95b6-f436eb9d9be9', now() - interval '2 hours', now() - interval '6 hours');

-- Extra unread/read notifications beyond trigger-created ones
insert into public.notifications (recipient_id, actor_id, plan_id, kind, title, body, created_at, read_at) values
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000001', 'message', 'Reminder', 'Sam confirmed the swimming meetup details.', now() - interval '15 hours', null),
  ('a0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'request_accepted', 'You’re in!', 'Your coffee work session request was accepted.', now() - interval '10 hours', now() - interval '9 hours'),
  ('ec62c77f-de18-4953-95b6-f436eb9d9be9', 'a0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000007', 'join_request', 'Moderation queue', 'A new report is waiting on a closed brunch plan.', now() - interval '1 day', null);

drop function public._seed_along_user(uuid, text, text, text, text, text[]);
