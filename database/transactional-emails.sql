begin;

alter table public.plans add column if not exists starts_at timestamptz;
grant insert (starts_at) on public.plans to authenticated;

alter table public.profiles add column if not exists email_reminders boolean not null default true;
alter table public.profiles add column if not exists email_chat_summaries boolean not null default false;

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  plan_id uuid references public.plans(id) on delete cascade,
  event_type text not null check (event_type in ('welcome','join_request','request_accepted','request_declined','plan_reminder','plan_changed','plan_cancelled','participant_left','attendance_followup','support_response')),
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text not null unique,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  attempts integer not null default 0,
  send_after timestamptz not null default now(),
  lease_until timestamptz,
  sent_at timestamptz,
  provider_id text,
  last_error text,
  created_at timestamptz not null default now()
);
create index if not exists email_outbox_due_idx on public.email_outbox (send_after, created_at) where status in ('pending','failed','sending');
create index if not exists email_outbox_actor_idx on public.email_outbox (actor_profile_id, created_at) where status in ('pending','failed');
alter table public.email_outbox enable row level security;
revoke all on public.email_outbox from public, anon, authenticated;

create or replace function public.queue_tagwimi_email()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  plan_row public.plans%rowtype;
  actor_name text;
  recipient uuid;
  base jsonb;
  changes jsonb;
begin
  if tg_table_name = 'profiles' then
    if tg_op = 'INSERT' and new.clerk_user_id is not null and not coalesce(new.is_demo_seed, false) then
      insert into public.email_outbox (recipient_profile_id, event_type, payload, dedupe_key)
      values (new.id, 'welcome', jsonb_build_object('name', new.display_name), 'welcome:' || new.id)
      on conflict (dedupe_key) do nothing;
    end if;
    return new;
  end if;

  if tg_table_name = 'join_requests' then
    select * into plan_row from public.plans where id = new.plan_id;
    if not found then return new; end if;
    base := jsonb_build_object('title', plan_row.title, 'date', plan_row.date_label, 'time', plan_row.time_label, 'location', plan_row.venue);
    if tg_op = 'INSERT' and new.status = 'pending' then
      select display_name into actor_name from public.profiles where id = new.requester_id;
      insert into public.email_outbox (recipient_profile_id, actor_profile_id, plan_id, event_type, payload, dedupe_key)
      values (plan_row.host_id, new.requester_id, new.plan_id, 'join_request', base || jsonb_build_object('requester', actor_name), 'request:' || new.id)
      on conflict (dedupe_key) do nothing;
    elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
      if new.status = 'accepted' then
        insert into public.email_outbox (recipient_profile_id, actor_profile_id, plan_id, event_type, payload, dedupe_key)
        values (new.requester_id, plan_row.host_id, new.plan_id, 'request_accepted', base, 'accepted:' || new.id)
        on conflict (dedupe_key) do nothing;
      elsif new.status = 'declined' then
        insert into public.email_outbox (recipient_profile_id, actor_profile_id, plan_id, event_type, payload, dedupe_key)
        values (new.requester_id, plan_row.host_id, new.plan_id, 'request_declined', base, 'declined:' || new.id)
        on conflict (dedupe_key) do nothing;
      end if;
    end if;
    return new;
  end if;

  if tg_table_name = 'plans' then
    base := jsonb_build_object('title', new.title, 'date', new.date_label, 'time', new.time_label, 'location', new.venue, 'cost', new.cost_note);
    if old.cancelled_at is null and new.cancelled_at is not null then
      for recipient in select m.profile_id from public.memberships m where m.plan_id = new.id and m.role <> 'host' loop
        insert into public.email_outbox (recipient_profile_id, actor_profile_id, plan_id, event_type, payload, dedupe_key)
        values (recipient, new.host_id, new.id, 'plan_cancelled', base || jsonb_build_object('reason', new.cancelled_reason), 'cancelled:' || new.id || ':' || recipient)
        on conflict (dedupe_key) do nothing;
      end loop;
    elsif new.cancelled_at is null and old.cancelled_at is null and (
      old.starts_at is distinct from new.starts_at or old.date_label is distinct from new.date_label or
      old.time_label is distinct from new.time_label or old.venue is distinct from new.venue or
      old.cost_note is distinct from new.cost_note
    ) then
      changes := jsonb_build_object(
        'date', case when old.date_label is distinct from new.date_label then jsonb_build_array(old.date_label, new.date_label) end,
        'time', case when old.time_label is distinct from new.time_label then jsonb_build_array(old.time_label, new.time_label) end,
        'location', case when old.venue is distinct from new.venue then jsonb_build_array(old.venue, new.venue) end,
        'cost', case when old.cost_note is distinct from new.cost_note then jsonb_build_array(old.cost_note, new.cost_note) end
      );
      for recipient in select m.profile_id from public.memberships m where m.plan_id = new.id and m.role <> 'host' loop
        insert into public.email_outbox (recipient_profile_id, actor_profile_id, plan_id, event_type, payload, dedupe_key)
        values (recipient, new.host_id, new.id, 'plan_changed', base || jsonb_build_object('changes', changes), 'changed:' || new.id || ':' || recipient || ':' || txid_current())
        on conflict (dedupe_key) do nothing;
      end loop;
    end if;
    return new;
  end if;

  if tg_table_name = 'memberships' and tg_op = 'DELETE' and old.role <> 'host' then
    select * into plan_row from public.plans where id = old.plan_id;
    if found and plan_row.cancelled_at is null then
      select display_name into actor_name from public.profiles where id = old.profile_id;
      insert into public.email_outbox (recipient_profile_id, actor_profile_id, plan_id, event_type, payload, dedupe_key)
      values (plan_row.host_id, old.profile_id, old.plan_id, 'participant_left',
        jsonb_build_object('title', plan_row.title, 'date', plan_row.date_label, 'time', plan_row.time_label, 'location', plan_row.venue, 'participant', actor_name),
        'left:' || old.id)
      on conflict (dedupe_key) do nothing;
    end if;
    return old;
  end if;
  return new;
end $$;

revoke all on function public.queue_tagwimi_email() from public, anon, authenticated;
drop trigger if exists queue_email_profile on public.profiles;
create trigger queue_email_profile after insert on public.profiles for each row execute function public.queue_tagwimi_email();
drop trigger if exists queue_email_request on public.join_requests;
create trigger queue_email_request after insert or update of status on public.join_requests for each row execute function public.queue_tagwimi_email();
drop trigger if exists queue_email_plan on public.plans;
create trigger queue_email_plan after update of starts_at, date_label, time_label, venue, cost_note, cancelled_at on public.plans for each row execute function public.queue_tagwimi_email();
drop trigger if exists queue_email_departure on public.memberships;
create trigger queue_email_departure after delete on public.memberships for each row execute function public.queue_tagwimi_email();

create or replace function public.queue_tagwimi_reminders()
returns integer language plpgsql security definer set search_path = '' as $$
declare queued integer;
begin
  insert into public.email_outbox (recipient_profile_id, plan_id, event_type, payload, dedupe_key, send_after)
  select m.profile_id, p.id, 'plan_reminder',
    jsonb_build_object('title', p.title, 'date', p.date_label, 'time', p.time_label, 'location', p.venue, 'cost', p.cost_note),
    'reminder:' || p.id || ':' || m.profile_id,
    now()
  from public.plans p
  join public.memberships m on m.plan_id = p.id
  join public.profiles u on u.id = m.profile_id
  where p.starts_at between now() + interval '12 hours' and now() + interval '36 hours'
    and p.cancelled_at is null and p.status = 'open'
    and u.email_reminders and u.email is not null and not coalesce(u.is_demo_seed, false)
  on conflict (dedupe_key) do nothing;
  get diagnostics queued = row_count;
  return queued;
end $$;
revoke all on function public.queue_tagwimi_reminders() from public, anon, authenticated;
grant execute on function public.queue_tagwimi_reminders() to service_role;

create or replace function public.claim_tagwimi_emails(target_actor uuid default null, target_recipient uuid default null, max_rows integer default 20)
returns setof public.email_outbox language plpgsql security definer set search_path = '' as $$
begin
  return query
  with due as (
    select q.id from public.email_outbox q
    where q.send_after <= now() and q.attempts < 5
      and (target_actor is null or q.actor_profile_id = target_actor)
      and (target_recipient is null or q.recipient_profile_id = target_recipient)
      and (q.status in ('pending','failed') or (q.status = 'sending' and q.lease_until < now()))
    order by q.created_at
    limit least(greatest(max_rows, 1), 50)
    for update skip locked
  )
  update public.email_outbox q set status = 'sending', attempts = q.attempts + 1,
    lease_until = now() + interval '2 minutes'
  from due where q.id = due.id
  returning q.*;
end $$;
revoke all on function public.claim_tagwimi_emails(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_tagwimi_emails(uuid, uuid, integer) to service_role;

commit;
