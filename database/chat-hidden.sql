begin;

alter table public.memberships
  add column if not exists chat_hidden_at timestamptz;

grant update (checked_in, completed, chat_hidden_at) on public.memberships to authenticated;

-- A new group message brings the conversation back for everyone else who hid it.
create or replace function public.reveal_hidden_chats_on_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.memberships
  set chat_hidden_at = null
  where plan_id = new.plan_id
    and chat_hidden_at is not null
    and profile_id is distinct from new.sender_id;
  return new;
end $$;

revoke all on function public.reveal_hidden_chats_on_message() from public, anon, authenticated;

drop trigger if exists reveal_hidden_chats_on_message on public.messages;
create trigger reveal_hidden_chats_on_message
  after insert on public.messages
  for each row execute function public.reveal_hidden_chats_on_message();

commit;
