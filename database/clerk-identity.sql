-- Keep existing UUID profile IDs while allowing verified Clerk JWT subjects.
alter table public.profiles add column if not exists clerk_user_id text;
create unique index if not exists profiles_clerk_user_id_key on public.profiles (clerk_user_id) where clerk_user_id is not null;

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.current_along_profile_id()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare subject text := auth.jwt()->>'sub';
declare profile_id uuid;
begin
  if subject is null then return null; end if;
  if subject ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return subject::uuid;
  end if;
  if subject !~ '^user_[A-Za-z0-9]+$' then return null; end if;
  select id into profile_id from public.profiles where clerk_user_id = subject;
  return profile_id;
end $$;
revoke all on function private.current_along_profile_id() from public, anon;
grant execute on function private.current_along_profile_id() to authenticated;

-- The caller's JWT determines the profile. A new Clerk user may insert only
-- their own, previously unclaimed Clerk subject; legacy Supabase IDs still work.
alter policy "members create own profile" on public.profiles
  with check (
    is_demo_seed = false and (
      (id = (select private.current_along_profile_id()) and clerk_user_id is null)
      or (clerk_user_id = (select auth.jwt()->>'sub')
          and clerk_user_id like 'user\_%' escape '\'
          and (select private.current_along_profile_id()) is null)
    )
  );

-- Keep the original policy names and intent, replacing only the identity source.
do $$
declare p record;
declare new_qual text;
declare new_check text;
begin
  for p in select tablename, policyname, qual, with_check
    from pg_policies where schemaname = 'public'
      and (qual like '%auth.uid()%' or with_check like '%auth.uid()%')
      and not (tablename = 'profiles' and policyname = 'members create own profile')
  loop
    new_qual := replace(p.qual, 'auth.uid()', 'private.current_along_profile_id()');
    new_check := replace(p.with_check, 'auth.uid()', 'private.current_along_profile_id()');
    execute format('alter policy %I on public.%I %s %s', p.policyname, p.tablename,
      case when new_qual is null then '' else 'using (' || new_qual || ')' end,
      case when new_check is null then '' else 'with check (' || new_check || ')' end);
  end loop;
end $$;

-- Auth users and Along profiles have the same UUID today. Future Clerk-only
-- profiles have no auth.users row, so moderation references the profile.
alter table public.along_admins drop constraint along_admins_user_id_fkey;
alter table public.along_admins add constraint along_admins_user_id_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;
alter table public.plan_reports drop constraint plan_reports_reviewed_by_fkey;
alter table public.plan_reports add constraint plan_reports_reviewed_by_fkey
  foreign key (reviewed_by) references public.profiles(id);

create or replace function public.accept_along_request(target_request_id uuid)
returns void language plpgsql set search_path = '' as $$
declare request_row public.join_requests%rowtype;
declare plan_row public.plans%rowtype;
begin
  select * into request_row from public.join_requests where id = target_request_id and status = 'pending' for update;
  if not found then raise exception 'Request is no longer pending'; end if;
  select * into plan_row from public.plans where id = request_row.plan_id for update;
  if not found or plan_row.host_id <> (select private.current_along_profile_id()) then raise exception 'Only the host can accept this request'; end if;
  if plan_row.spots < 1 then raise exception 'This plan is full'; end if;
  if exists (select 1 from public.memberships where plan_id = request_row.plan_id and profile_id = request_row.requester_id) then
    raise exception 'This person has already joined';
  end if;
  update public.join_requests set status = 'accepted' where id = target_request_id;
  insert into public.memberships (plan_id, profile_id, role) values (request_row.plan_id, request_row.requester_id, 'member')
    on conflict (plan_id, profile_id) do nothing;
  update public.plans set spots = spots - 1 where id = request_row.plan_id;
end $$;
