-- Private chat attachments are served only after Clerk and plan membership checks.
alter table public.messages add column if not exists media_type text;
alter table public.messages add column if not exists media_path text;
alter table public.messages add column if not exists media_mime text;

do $$ begin
  alter table public.messages add constraint messages_media_type_check
    check (media_type is null or media_type in ('image','audio'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.messages add constraint messages_media_consistency_check
    check (
      (media_type is null and media_path is null and media_mime is null)
      or (media_type is not null and media_path is not null and media_mime is not null)
    );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "members send text only through client" on public.messages
    as restrictive for insert to authenticated
    with check (media_type is null and media_path is null and media_mime is null);
exception when duplicate_object then null;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  false,
  8388608,
  array['image/webp','audio/webm','audio/mp4','audio/ogg','audio/mpeg']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- No public/authenticated storage policies on purpose: objects are private and
-- only reachable through server-signed URLs after membership checks in /api/chat-media.

-- Realtime for live chat (safe if already added).
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
