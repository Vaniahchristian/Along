begin;

create table if not exists public.along_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.along_admins enable row level security;
revoke all on public.along_admins from public, anon, authenticated;
grant select on public.along_admins to authenticated;
create policy "admins can see own role" on public.along_admins for select to authenticated
  using (user_id = (select auth.uid()));

-- Grant the first admin separately after the account is verified.

create table if not exists public.plan_reports (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (length(trim(reason)) between 10 and 500),
  status text not null default 'open' check (status in ('open', 'resolved')),
  review_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists plan_reports_status_created_idx on public.plan_reports (status, created_at desc);
create index if not exists plan_reports_plan_idx on public.plan_reports (plan_id);
create index if not exists plan_reports_reporter_idx on public.plan_reports (reporter_id);
alter table public.plan_reports enable row level security;
revoke all on public.plan_reports from public, anon, authenticated;
grant select, insert on public.plan_reports to authenticated;
grant update (status, review_note, reviewed_by, reviewed_at) on public.plan_reports to authenticated;

create policy "members can report a plan" on public.plan_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open' and reviewed_by is null and reviewed_at is null and review_note is null);
create policy "reporters and admins can read reports" on public.plan_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or exists (select 1 from public.along_admins where user_id = (select auth.uid())));
create policy "admins can review reports" on public.plan_reports for update to authenticated
  using (exists (select 1 from public.along_admins where user_id = (select auth.uid())))
  with check (exists (select 1 from public.along_admins where user_id = (select auth.uid())) and reviewed_by = (select auth.uid()));

create policy "admins can review requests" on public.join_requests for select to authenticated
  using (exists (select 1 from public.along_admins where user_id = (select auth.uid())));
create policy "admins can review memberships" on public.memberships for select to authenticated
  using (exists (select 1 from public.along_admins where user_id = (select auth.uid())));
grant update (status) on public.plans to authenticated;
create policy "admins can moderate plans" on public.plans for update to authenticated
  using (exists (select 1 from public.along_admins where user_id = (select auth.uid())))
  with check (exists (select 1 from public.along_admins where user_id = (select auth.uid())));

commit;
