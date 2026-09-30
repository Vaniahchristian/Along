-- Private chat attachments are served only after Clerk and plan membership checks.
alter table public.messages add column if not exists media_type text;
alter table public.messages add column if not exists media_path text;
alter table public.messages add column if not exists media_mime text;
alter table public.messages add constraint messages_media_type_check check (media_type is null or media_type in ('image','audio'));
alter table public.messages add constraint messages_media_consistency_check check ((media_type is null and media_path is null and media_mime is null) or (media_type is not null and media_path is not null and media_mime is not null));
create policy "members send text only through client" on public.messages as restrictive for insert to authenticated with check (media_type is null and media_path is null and media_mime is null);
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('chat-media','chat-media',false,8388608,array['image/webp','audio/webm','audio/mp4','audio/ogg','audio/mpeg'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
