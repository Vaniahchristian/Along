begin;

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('join_request', 'request_accepted', 'message', 'plan_closed', 'check_in', 'plan_completed', 'report', 'broadcast'));

alter table public.email_outbox drop constraint if exists email_outbox_event_type_check;
alter table public.email_outbox add constraint email_outbox_event_type_check
  check (event_type in ('welcome', 'join_request', 'request_accepted', 'request_declined', 'plan_reminder', 'plan_changed', 'plan_cancelled', 'participant_left', 'attendance_followup', 'support_response', 'admin_broadcast'));

-- Only the server's service role can call this transaction. It resolves the audience
-- at send time, so "all" is never limited to the dashboard's first 100 members.
create or replace function public.send_tagwimi_broadcast(
  admin_profile uuid, audience text, individual_profile uuid,
  delivery_channel text, message_title text, message_body text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  broadcast_id uuid := gen_random_uuid();
  recipient_count integer;
  email_count integer := 0;
begin
  if not exists (select 1 from public.along_admins where user_id = admin_profile) then
    raise exception 'Admin access required';
  end if;
  if audience not in ('all', 'individual') or delivery_channel not in ('notification', 'email', 'both')
    or (audience = 'individual' and individual_profile is null)
    or (audience = 'all' and individual_profile is not null)
    or length(btrim(message_title)) not between 1 and 120
    or length(btrim(message_body)) not between 1 and 2000 then
    raise exception 'Invalid broadcast';
  end if;

  select count(*) into recipient_count from public.profiles p
  where p.clerk_user_id is not null and not coalesce(p.is_demo_seed, false)
    and p.suspended_at is null and (audience = 'all' or p.id = individual_profile)
    and (delivery_channel = 'notification' or nullif(btrim(p.email), '') is not null);
  if recipient_count = 0 then raise exception 'No eligible recipients'; end if;

  if delivery_channel in ('notification', 'both') then
    insert into public.notifications (recipient_id, actor_id, kind, title, body)
    select p.id, admin_profile, 'broadcast', btrim(message_title), btrim(message_body)
    from public.profiles p
    where p.clerk_user_id is not null and not coalesce(p.is_demo_seed, false)
      and p.suspended_at is null and (audience = 'all' or p.id = individual_profile);
  end if;

  if delivery_channel in ('email', 'both') then
    insert into public.email_outbox (recipient_profile_id, actor_profile_id, event_type, payload, dedupe_key)
    select p.id, admin_profile, 'admin_broadcast',
      jsonb_build_object('title', btrim(message_title), 'body', btrim(message_body)),
      'admin-broadcast:' || broadcast_id || ':' || p.id
    from public.profiles p
    where p.clerk_user_id is not null and not coalesce(p.is_demo_seed, false)
      and p.suspended_at is null and nullif(btrim(p.email), '') is not null
      and (audience = 'all' or p.id = individual_profile);
    get diagnostics email_count = row_count;
  end if;

  insert into public.admin_actions (actor_id, action, target_type, target_id, reason, details)
  values (admin_profile, 'send_broadcast', 'broadcast', broadcast_id::text,
    btrim(message_title), jsonb_build_object('audience', audience,
    'individual_profile', individual_profile, 'channel', delivery_channel,
    'body', btrim(message_body), 'recipient_count', recipient_count,
    'email_count', email_count));
  return jsonb_build_object('id', broadcast_id, 'recipientCount', recipient_count,
    'emailCount', email_count);
end;
$$;

revoke all on function public.send_tagwimi_broadcast(uuid, text, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.send_tagwimi_broadcast(uuid, text, uuid, text, text, text) to service_role;

commit;
