begin;

-- One support thread per member; admins reply from the dashboard.
create table if not exists public.support_threads (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'resolved')),
  last_message_at timestamptz not null default now(),
  member_last_read_at timestamptz,
  admin_last_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null check (sender_role in ('member', 'admin')),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists support_threads_last_message_idx
  on public.support_threads (status, last_message_at desc);
create index if not exists support_messages_thread_created_idx
  on public.support_messages (thread_id, created_at);

alter table public.support_threads enable row level security;
alter table public.support_messages enable row level security;
revoke all on public.support_threads from public, anon, authenticated;
revoke all on public.support_messages from public, anon, authenticated;

grant select, insert, update on public.support_threads to authenticated;
grant select, insert on public.support_messages to authenticated;

create or replace function private.is_along_admin(profile_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.along_admins a where a.user_id = profile_id);
$$;
revoke all on function private.is_along_admin(uuid) from public, anon;
grant execute on function private.is_along_admin(uuid) to authenticated;

drop policy if exists "members see own support thread" on public.support_threads;
create policy "members see own support thread" on public.support_threads for select to authenticated
  using (
    member_id = (select private.current_along_profile_id())
    or private.is_along_admin((select private.current_along_profile_id()))
  );

drop policy if exists "members create own support thread" on public.support_threads;
create policy "members create own support thread" on public.support_threads for insert to authenticated
  with check (member_id = (select private.current_along_profile_id()));

drop policy if exists "members and admins update support threads" on public.support_threads;
create policy "members and admins update support threads" on public.support_threads for update to authenticated
  using (
    member_id = (select private.current_along_profile_id())
    or private.is_along_admin((select private.current_along_profile_id()))
  )
  with check (
    member_id = (select private.current_along_profile_id())
    or private.is_along_admin((select private.current_along_profile_id()))
  );

drop policy if exists "members see own support messages" on public.support_messages;
create policy "members see own support messages" on public.support_messages for select to authenticated
  using (
    exists (
      select 1 from public.support_threads t
      where t.id = thread_id
        and (
          t.member_id = (select private.current_along_profile_id())
          or private.is_along_admin((select private.current_along_profile_id()))
        )
    )
  );

drop policy if exists "members and admins send support messages" on public.support_messages;
create policy "members and admins send support messages" on public.support_messages for insert to authenticated
  with check (
    sender_id = (select private.current_along_profile_id())
    and (
      (
        sender_role = 'member'
        and exists (
          select 1 from public.support_threads t
          where t.id = thread_id and t.member_id = (select private.current_along_profile_id())
        )
      )
      or (
        sender_role = 'admin'
        and private.is_along_admin((select private.current_along_profile_id()))
        and exists (select 1 from public.support_threads t where t.id = thread_id)
      )
    )
  );

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in (
    'join_request', 'request_accepted', 'message', 'plan_closed', 'check_in',
    'plan_completed', 'report', 'broadcast', 'support'
  ));

create or replace function public.handle_support_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  thread public.support_threads%rowtype;
  actor_name text;
  preview text;
begin
  select * into thread from public.support_threads where id = new.thread_id for update;
  if not found then return new; end if;

  update public.support_threads
  set last_message_at = new.created_at,
      updated_at = now(),
      status = case when new.sender_role = 'member' then 'open' else status end,
      member_last_read_at = case
        when new.sender_role = 'member' then new.created_at
        else member_last_read_at
      end,
      admin_last_read_at = case
        when new.sender_role = 'admin' then new.created_at
        else admin_last_read_at
      end
  where id = new.thread_id;

  select display_name into actor_name from public.profiles where id = new.sender_id;
  preview := left(btrim(new.body), 120);

  if new.sender_role = 'member' then
    insert into public.notifications (recipient_id, actor_id, kind, title, body)
    select a.user_id, new.sender_id, 'support', 'New support message',
      coalesce(actor_name, 'A member') || ': ' || preview
    from public.along_admins a
    where a.user_id is distinct from new.sender_id;
  else
    insert into public.notifications (recipient_id, actor_id, kind, title, body)
    values (
      thread.member_id, new.sender_id, 'support', 'Reply from Tagwimi support', preview
    );
    insert into public.email_outbox (
      recipient_profile_id, actor_profile_id, event_type, payload, dedupe_key
    )
    values (
      thread.member_id,
      new.sender_id,
      'support_response',
      jsonb_build_object('preview', preview, 'name', coalesce(actor_name, 'Tagwimi')),
      'support-response:' || new.id
    )
    on conflict (dedupe_key) do nothing;
  end if;

  return new;
end $$;

revoke all on function public.handle_support_message() from public, anon, authenticated;
drop trigger if exists support_message_side_effects on public.support_messages;
create trigger support_message_side_effects
  after insert on public.support_messages
  for each row execute function public.handle_support_message();

do $$ begin
  alter publication supabase_realtime add table public.support_messages;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.support_threads;
exception when duplicate_object then null;
end $$;

commit;
