-- Apply to the Along project only after reviewing existing policies and data.
-- This script replaces policies and grants for the five public application tables.
begin;

do $$
declare policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('profiles','plans','join_requests','memberships','messages')
  loop
    execute format('drop policy %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.join_requests enable row level security;
alter table public.memberships enable row level security;
alter table public.messages enable row level security;

drop function if exists public.reset_along_demo();

revoke all on public.profiles, public.plans, public.join_requests, public.memberships, public.messages from public, anon, authenticated;
grant select on public.profiles, public.plans, public.join_requests, public.memberships, public.messages to authenticated;
grant insert on public.profiles, public.plans, public.join_requests, public.memberships, public.messages to authenticated;
grant update (display_name, initials, tone, interests) on public.profiles to authenticated;
grant update (spots) on public.plans to authenticated;
grant update (status) on public.join_requests to authenticated;
grant delete on public.join_requests to authenticated;
grant update (checked_in, completed) on public.memberships to authenticated;

create policy "members see real profiles" on public.profiles for select to authenticated
  using (is_demo_seed = false);
create policy "members create own profile" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()) and is_demo_seed = false);
create policy "members edit own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()) and is_demo_seed = false);

create policy "members see real plans" on public.plans for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = host_id and p.is_demo_seed = false));
create policy "members create own plans" on public.plans for insert to authenticated
  with check (host_id = (select auth.uid()) and status = 'open' and spots >= 0 and size between 2 and 5);
create policy "hosts update own plans" on public.plans for update to authenticated
  using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()));

create policy "members and hosts see requests" on public.join_requests for select to authenticated
  using (requester_id = (select auth.uid()) or exists (select 1 from public.plans p where p.id = plan_id and p.host_id = (select auth.uid())));
create policy "members ask to join" on public.join_requests for insert to authenticated
  with check (requester_id = (select auth.uid()) and status = 'pending' and exists (
    select 1 from public.plans p where p.id = plan_id and p.host_id <> (select auth.uid()) and p.status = 'open' and p.spots > 0
  ));
create policy "hosts decide requests" on public.join_requests for update to authenticated
  using (exists (select 1 from public.plans p where p.id = plan_id and p.host_id = (select auth.uid())))
  with check (exists (select 1 from public.plans p where p.id = plan_id and p.host_id = (select auth.uid())));
create policy "members cancel own pending requests" on public.join_requests for delete to authenticated
  using (requester_id = (select auth.uid()) and status = 'pending');

create policy "members and hosts see memberships" on public.memberships for select to authenticated
  using (profile_id = (select auth.uid()) or exists (select 1 from public.plans p where p.id = plan_id and p.host_id = (select auth.uid())));
create policy "hosts create own membership" on public.memberships for insert to authenticated
  with check (profile_id = (select auth.uid()) and role = 'host' and exists (select 1 from public.plans p where p.id = plan_id and p.host_id = (select auth.uid())));
create policy "hosts add accepted members" on public.memberships for insert to authenticated
  with check (role = 'member' and exists (
    select 1 from public.plans p join public.join_requests r on r.plan_id = p.id
    where p.id = plan_id and p.host_id = (select auth.uid()) and r.requester_id = profile_id and r.status = 'accepted'
  ));
create policy "members update own attendance" on public.memberships for update to authenticated
  using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

create policy "group members see messages" on public.messages for select to authenticated
  using (exists (select 1 from public.memberships m where m.plan_id = messages.plan_id and m.profile_id = (select auth.uid())));
create policy "group members send messages" on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and length(trim(body)) between 1 and 500 and exists (
    select 1 from public.memberships m where m.plan_id = messages.plan_id and m.profile_id = (select auth.uid())
  ));

create or replace function public.accept_along_request(target_request_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  request_row public.join_requests%rowtype;
  plan_row public.plans%rowtype;
begin
  select * into request_row from public.join_requests where id = target_request_id and status = 'pending' for update;
  if not found then raise exception 'Request is no longer pending'; end if;
  select * into plan_row from public.plans where id = request_row.plan_id for update;
  if not found or plan_row.host_id <> (select auth.uid()) then raise exception 'Only the host can accept this request'; end if;
  if plan_row.spots < 1 then raise exception 'This plan is full'; end if;
  if exists (select 1 from public.memberships where plan_id = request_row.plan_id and profile_id = request_row.requester_id) then
    raise exception 'This person has already joined';
  end if;
  update public.join_requests set status = 'accepted' where id = target_request_id;
  insert into public.memberships (plan_id, profile_id, role) values (request_row.plan_id, request_row.requester_id, 'member')
    on conflict (plan_id, profile_id) do nothing;
  update public.plans set spots = spots - 1 where id = request_row.plan_id;
end $$;
revoke all on function public.accept_along_request(uuid) from public, anon;
grant execute on function public.accept_along_request(uuid) to authenticated;

commit;
