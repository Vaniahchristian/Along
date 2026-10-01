-- Let hosts edit their plan details and meeting pin.
grant update (
  category,
  title,
  venue,
  date_label,
  time_label,
  starts_at,
  spots,
  size,
  intro,
  bring,
  meet,
  beginner_friendly,
  visibility,
  cost_note,
  status
) on public.plans to authenticated;

grant select (starts_at) on public.plans to authenticated;

grant update (meet, maps_url) on public.plan_meeting_details to authenticated;

drop policy if exists "hosts update meeting points" on public.plan_meeting_details;
create policy "hosts update meeting points" on public.plan_meeting_details
for update to authenticated
using (
  exists (
    select 1 from public.plans p
    where p.id = plan_meeting_details.plan_id
      and p.host_id = (select private.current_along_profile_id())
  )
)
with check (
  exists (
    select 1 from public.plans p
    where p.id = plan_meeting_details.plan_id
      and p.host_id = (select private.current_along_profile_id())
  )
);
