-- Optional Google Maps pin on exact meeting details (host + accepted members only).
alter table public.plan_meeting_details
  add column if not exists maps_url text;

alter table public.plan_meeting_details
  drop constraint if exists plan_meeting_details_maps_url_check;

alter table public.plan_meeting_details
  add constraint plan_meeting_details_maps_url_check
  check (
    maps_url is null
    or (
      char_length(maps_url) <= 500
      and (
        maps_url ~* '^https://(maps\\.app\\.goo\\.gl|goo\\.gl/maps|maps\\.google\\.[a-z.]+|www\\.google\\.[a-z.]+/maps|google\\.[a-z.]+/maps)'
      )
    )
  );

comment on column public.plan_meeting_details.maps_url is 'Optional Google Maps link shared with accepted members and the host.';
