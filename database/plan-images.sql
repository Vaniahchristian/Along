-- Applied to the Tagwimi Supabase project as migration plan_image_uploads.
-- Only the server image endpoint writes to this bucket. Public reads allow
-- plan cards to show host photos without exposing the service key.
alter table public.plans add column if not exists image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('plan-images', 'plan-images', true, 5242880, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
