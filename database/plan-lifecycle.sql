-- Plan lifecycle: ends_at (default start + 24h), auto-close after end, host complete early.
alter table public.plans
  add column if not exists ends_at timestamptz;

update public.plans
set ends_at = coalesce(starts_at, created_at, now()) + interval '24 hours'
where ends_at is null;

alter table public.plans
  alter column ends_at set default (now() + interval '24 hours');

alter table public.plans
  alter column ends_at set not null;

alter table public.plans
  drop constraint if exists plans_ends_after_starts;

alter table public.plans
  add constraint plans_ends_after_starts
  check (starts_at is null or ends_at >= starts_at);

grant select (ends_at) on public.plans to authenticated;
grant update (ends_at) on public.plans to authenticated;

drop policy if exists "members ask to join" on public.join_requests;
create policy "members ask to join" on public.join_requests
for insert to authenticated
with check (
  requester_id = (select private.current_along_profile_id())
  and status = 'pending'
  and exists (
    select 1 from public.plans p
    where p.id = join_requests.plan_id
      and p.host_id <> (select private.current_along_profile_id())
      and p.status = 'open'
      and p.spots > 0
      and p.ends_at > now()
  )
);

create or replace function public.accept_along_request(target_request_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  request_row public.join_requests%rowtype;
  plan_row public.plans%rowtype;
begin
  select * into request_row from public.join_requests where id = target_request_id and status = 'pending' for update;
  if not found then raise exception 'Request is no longer pending'; end if;
  select * into plan_row from public.plans where id = request_row.plan_id for update;
  if not found or plan_row.host_id <> (select private.current_along_profile_id()) then
    raise exception 'Only the host can accept this request';
  end if;
  if plan_row.status <> 'open' or plan_row.ends_at <= now() then
    raise exception 'This plan is no longer open for new people';
  end if;
  if plan_row.spots < 1 then raise exception 'This plan is full'; end if;
  if exists (
    select 1 from public.memberships
    where plan_id = request_row.plan_id and profile_id = request_row.requester_id
  ) then
    raise exception 'This person has already joined';
  end if;
  update public.join_requests set status = 'accepted' where id = target_request_id;
  insert into public.memberships (plan_id, profile_id, role)
  values (request_row.plan_id, request_row.requester_id, 'member')
  on conflict (plan_id, profile_id) do nothing;
  update public.plans set spots = spots - 1 where id = request_row.plan_id;
end;
$$;

create or replace function public.close_expired_along_plans()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  closed_count integer := 0;
begin
  with closed as (
    update public.plans
    set status = 'closed'
    where status = 'open'
      and ends_at <= now()
    returning id
  ),
  done as (
    update public.memberships m
    set completed = true
    from closed c
    where m.plan_id = c.id
      and coalesce(m.completed, false) = false
    returning m.plan_id
  )
  select count(*)::integer into closed_count from closed;
  return coalesce(closed_count, 0);
end;
$$;

revoke all on function public.close_expired_along_plans() from public, anon;
grant execute on function public.close_expired_along_plans() to authenticated, service_role;

create or replace function public.complete_along_plan(target_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  viewer uuid := private.current_along_profile_id();
  host_id uuid;
  is_host boolean;
begin
  if viewer is null then raise exception 'Sign in to continue.'; end if;
  select p.host_id into host_id from public.plans p where p.id = target_plan_id;
  if host_id is null then raise exception 'Plan not found.'; end if;
  is_host := host_id = viewer;
  if not is_host and not exists (
    select 1 from public.memberships m
    where m.plan_id = target_plan_id and m.profile_id = viewer
  ) then
    raise exception 'Only people on this plan can mark it completed.';
  end if;

  update public.memberships
  set completed = true
  where plan_id = target_plan_id and profile_id = viewer;

  if is_host then
    update public.plans
    set status = 'closed'
    where id = target_plan_id and host_id = viewer and status = 'open';
    update public.memberships
    set completed = true
    where plan_id = target_plan_id and coalesce(completed, false) = false;
  end if;
end;
$$;

revoke all on function public.complete_along_plan(uuid) from public, anon;
grant execute on function public.complete_along_plan(uuid) to authenticated;

select cron.unschedule(jobid)
from cron.job
where jobname = 'close-expired-along-plans';

select cron.schedule(
  'close-expired-along-plans',
  '15 * * * *',
  $$select public.close_expired_along_plans()$$
);
