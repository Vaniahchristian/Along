-- Public member details. Account email remains private to the owner and admins.
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists city text not null default '';
alter table public.profiles alter column city set default '';
alter table public.profiles add column if not exists avatar_path text;
update public.profiles set city = '' where city = 'Kampala, Uganda' and bio = '' and avatar_path is null;

-- Members can read public details without gaining access to each other's email.
revoke select on public.profiles from authenticated;
grant select (id, display_name, initials, tone, interests, is_demo_seed, bio, city, avatar_path)
  on public.profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', true, 2097152, array['image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
