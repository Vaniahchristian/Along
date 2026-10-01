begin;

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

-- Existing members should not be forced through this flow.
update public.profiles
set onboarding_completed_at = coalesce(onboarding_completed_at, created_at, now())
where onboarding_completed_at is null;

commit;
