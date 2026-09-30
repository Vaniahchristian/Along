begin;

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists private.email_worker_tokens (
  token uuid primary key default gen_random_uuid(),
  expires_at timestamptz not null default now() + interval '5 minutes'
);
alter table private.email_worker_tokens enable row level security;
revoke all on private.email_worker_tokens from public, anon, authenticated;

create or replace function public.issue_tagwimi_worker_token()
returns uuid language plpgsql security definer set search_path = '' as $$
declare issued uuid;
begin
  insert into private.email_worker_tokens default values returning token into issued;
  return issued;
end $$;
revoke all on function public.issue_tagwimi_worker_token() from public, anon, authenticated;
grant execute on function public.issue_tagwimi_worker_token() to service_role;

create or replace function public.consume_tagwimi_worker_token(presented_token uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare consumed uuid;
begin
  delete from private.email_worker_tokens
  where token = presented_token and expires_at > now()
  returning token into consumed;
  return consumed is not null;
end $$;
revoke all on function public.consume_tagwimi_worker_token(uuid) from public, anon, authenticated;
grant execute on function public.consume_tagwimi_worker_token(uuid) to service_role;

create or replace function private.invoke_tagwimi_email_worker()
returns bigint language plpgsql security definer set search_path = '' as $$
declare invocation_token uuid;
declare request_id bigint;
begin
  delete from private.email_worker_tokens where expires_at <= now();
  invocation_token := public.issue_tagwimi_worker_token();
  select net.http_post(
    url := 'https://jjhjuezixwelxcwnnlrt.supabase.co/functions/v1/tagwimi-email-worker',
    body := jsonb_build_object('workerToken', invocation_token, 'source', 'cron'),
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 30000
  ) into request_id;
  return request_id;
end $$;
revoke all on function private.invoke_tagwimi_email_worker() from public, anon, authenticated;

create or replace function public.queue_tagwimi_reminders()
returns integer language plpgsql security definer set search_path = '' as $$
declare queued integer;
begin
  insert into public.email_outbox (recipient_profile_id, plan_id, event_type, payload, dedupe_key, send_after)
  select m.profile_id, p.id, 'plan_reminder',
    jsonb_build_object('title', p.title, 'date', p.date_label, 'time', p.time_label, 'location', p.venue, 'cost', p.cost_note),
    'reminder:' || p.id || ':' || m.profile_id, now()
  from public.plans p
  join public.memberships m on m.plan_id = p.id
  join public.profiles u on u.id = m.profile_id
  where p.starts_at between now() + interval '3 hours' and now() + interval '25 hours'
    and p.cancelled_at is null and p.status = 'open'
    and u.email_reminders and u.email is not null and not coalesce(u.is_demo_seed, false)
  on conflict (dedupe_key) do nothing;
  get diagnostics queued = row_count;
  return queued;
end $$;
revoke all on function public.queue_tagwimi_reminders() from public, anon, authenticated;
grant execute on function public.queue_tagwimi_reminders() to service_role;

select cron.schedule(
  'tagwimi-email-hourly',
  '5 * * * *',
  'select private.invoke_tagwimi_email_worker()'
);

commit;
