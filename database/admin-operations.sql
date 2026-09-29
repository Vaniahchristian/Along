-- Admin operations remain server-owned; members never receive table access.
alter table public.plans add column if not exists cancelled_at timestamptz;
alter table public.plans add column if not exists cancelled_reason text;
alter table public.plans add column if not exists hidden_at timestamptz;
alter table public.plans add column if not exists hidden_reason text;
alter table public.profiles add column if not exists suspended_at timestamptz;
alter table public.profiles add column if not exists suspension_reason text;

alter table public.plan_reports add column if not exists target_type text not null default 'plan';
alter table public.plan_reports add column if not exists subject_profile_id uuid references public.profiles(id);
alter table public.plan_reports add column if not exists message_id uuid references public.messages(id);
alter table public.plan_reports add column if not exists evidence_text text;
alter table public.plan_reports add column if not exists image_path text;
alter table public.plan_reports add column if not exists priority text not null default 'normal';
alter table public.plan_reports add column if not exists assigned_admin_id uuid references public.profiles(id);
alter table public.plan_reports add constraint report_target_type_check check (target_type in ('plan','member','message','image'));
alter table public.plan_reports add constraint report_priority_check check (priority in ('normal','high'));

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  action text not null,
  target_type text not null,
  target_id text not null,
  reason text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_actions_created_idx on public.admin_actions (created_at desc);
alter table public.admin_actions enable row level security;
revoke all on public.admin_actions from public, anon, authenticated;

-- A suspended account cannot create plans, request places, send messages, or change attendance.
create or replace function private.along_account_active()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.clerk_user_id = (select auth.jwt()->>'sub')
      and p.suspended_at is null
  );
$$;
revoke all on function private.along_account_active() from public, anon;
grant execute on function private.along_account_active() to authenticated;

create policy "active accounts create plans" on public.plans as restrictive for insert to authenticated
  with check ((select private.along_account_active()));
create policy "active accounts request places" on public.join_requests as restrictive for insert to authenticated
  with check ((select private.along_account_active()));
create policy "active accounts send messages" on public.messages as restrictive for insert to authenticated
  with check ((select private.along_account_active()));
create policy "active accounts update attendance" on public.memberships as restrictive for update to authenticated
  using ((select private.along_account_active())) with check ((select private.along_account_active()));

-- Reports pass through a Clerk-verified endpoint that captures only relevant evidence.
revoke insert on public.plan_reports from authenticated;
