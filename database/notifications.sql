begin;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  plan_id uuid references public.plans(id) on delete cascade,
  kind text not null check (kind in ('join_request', 'request_accepted', 'message', 'plan_closed', 'check_in', 'plan_completed', 'report')),
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('join_request', 'request_accepted', 'message', 'plan_closed', 'check_in', 'plan_completed', 'report'));

create index if not exists notifications_recipient_created_idx on public.notifications (recipient_id, created_at desc);
alter table public.notifications enable row level security;
revoke all on public.notifications from public, anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

drop policy if exists "members read own notifications" on public.notifications;
create policy "members read own notifications" on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));
drop policy if exists "members mark own notifications read" on public.notifications;
create policy "members mark own notifications read" on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));

create or replace function public.create_along_notifications()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  plan_row public.plans%rowtype;
  plan_title text;
  actor_name text;
begin
  if tg_table_name = 'join_requests' then
    select * into plan_row from public.plans where id = new.plan_id;
    select display_name into actor_name from public.profiles where id = new.requester_id;
    if tg_op = 'INSERT' and new.status = 'pending' then
      insert into public.notifications (recipient_id, actor_id, plan_id, kind, title, body)
      values (plan_row.host_id, new.requester_id, new.plan_id, 'join_request', 'New join request', coalesce(actor_name, 'Someone') || ' wants to join ' || plan_row.title || '.');
    elsif tg_op = 'UPDATE' then
      if old.status = 'pending' and new.status = 'accepted' then
        insert into public.notifications (recipient_id, actor_id, plan_id, kind, title, body)
        values (new.requester_id, plan_row.host_id, new.plan_id, 'request_accepted', 'You’re in!', 'Your request to join ' || plan_row.title || ' was accepted. Say hello in the group chat.');
      end if;
    end if;
  elsif tg_table_name = 'messages' then
    select title into plan_title from public.plans where id = new.plan_id;
    select display_name into actor_name from public.profiles where id = new.sender_id;
    insert into public.notifications (recipient_id, actor_id, plan_id, kind, title, body)
    select m.profile_id, new.sender_id, new.plan_id, 'message', 'New message in ' || plan_title,
      coalesce(actor_name, 'Someone') || ': ' || left(new.body, 120)
    from public.memberships m where m.plan_id = new.plan_id and m.profile_id <> new.sender_id;
  elsif tg_table_name = 'plans' then
    if old.status is distinct from 'closed' and new.status = 'closed' then
      insert into public.notifications (recipient_id, plan_id, kind, title, body)
      select distinct recipients.profile_id, new.id, 'plan_closed', 'Plan closed', new.title || ' is no longer available.'
      from (select new.host_id as profile_id union select m.profile_id from public.memberships m where m.plan_id = new.id) recipients
      where recipients.profile_id is not null;
    end if;
  elsif tg_table_name = 'memberships' then
    select title into plan_title from public.plans where id = new.plan_id;
    select display_name into actor_name from public.profiles where id = new.profile_id;
    if tg_op = 'UPDATE' and coalesce(old.checked_in, false) is distinct from true and new.checked_in is true then
      insert into public.notifications (recipient_id, actor_id, plan_id, kind, title, body)
      select m.profile_id, new.profile_id, new.plan_id, 'check_in', 'Checked in',
        coalesce(actor_name, 'Someone') || ' checked in for ' || plan_title || '.'
      from public.memberships m where m.plan_id = new.plan_id and m.profile_id <> new.profile_id;
    end if;
    if tg_op = 'UPDATE' and coalesce(old.completed, false) is distinct from true and new.completed is true then
      insert into public.notifications (recipient_id, actor_id, plan_id, kind, title, body)
      select m.profile_id, new.profile_id, new.plan_id, 'plan_completed', 'Plan completed',
        coalesce(actor_name, 'Someone') || ' marked ' || plan_title || ' as completed.'
      from public.memberships m where m.plan_id = new.plan_id and m.profile_id <> new.profile_id;
    end if;
  elsif tg_table_name = 'plan_reports' then
    if tg_op = 'INSERT' then
      select title into plan_title from public.plans where id = new.plan_id;
      select display_name into actor_name from public.profiles where id = new.reporter_id;
      insert into public.notifications (recipient_id, actor_id, plan_id, kind, title, body)
      select a.user_id, new.reporter_id, new.plan_id, 'report', 'New plan report',
        coalesce(actor_name, 'Someone') || ' reported ' || coalesce(plan_title, 'a plan') || ': ' || left(new.reason, 120)
      from public.along_admins a;
    end if;
  end if;
  return new;
end $$;

revoke all on function public.create_along_notifications() from public, anon, authenticated;
drop trigger if exists notify_join_request on public.join_requests;
create trigger notify_join_request after insert or update of status on public.join_requests
  for each row execute function public.create_along_notifications();
drop trigger if exists notify_message on public.messages;
create trigger notify_message after insert on public.messages
  for each row execute function public.create_along_notifications();
drop trigger if exists notify_plan_closed on public.plans;
create trigger notify_plan_closed after update of status on public.plans
  for each row execute function public.create_along_notifications();
drop trigger if exists notify_membership_activity on public.memberships;
create trigger notify_membership_activity after update of checked_in, completed on public.memberships
  for each row execute function public.create_along_notifications();
drop trigger if exists notify_plan_report on public.plan_reports;
create trigger notify_plan_report after insert on public.plan_reports
  for each row execute function public.create_along_notifications();

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

commit;
