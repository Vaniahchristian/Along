-- Applied to project jjhjuezixwelxcwnnlrt as two migrations:
-- plan_sharing_visibility_cost_and_request_intro
-- restrict_exact_plan_meeting_points
-- fix_clerk_meeting_point_access (the policy definitions below include the fix)
alter table public.plans add column if not exists visibility text not null default 'public';
alter table public.plans add column if not exists cost_note text;
alter table public.join_requests add column if not exists intro text;
alter table public.plans add constraint plans_visibility_check check (visibility in ('public','link_only'));
alter table public.plans add constraint plans_cost_note_length check (cost_note is null or char_length(cost_note) <= 120);
alter table public.join_requests add constraint join_requests_intro_length check (intro is null or char_length(intro) <= 240);
grant update (visibility) on public.plans to authenticated;

create table public.plan_meeting_details (
  plan_id uuid primary key references public.plans(id) on delete cascade,
  meet text not null
);
insert into public.plan_meeting_details(plan_id,meet)
select id,meet from public.plans where meet is not null and meet <> ''
on conflict(plan_id) do nothing;
alter table public.plan_meeting_details enable row level security;
revoke all on public.plan_meeting_details from public,anon,authenticated;
grant select,insert on public.plan_meeting_details to authenticated;
create policy "accepted members and hosts see meeting points" on public.plan_meeting_details
for select to authenticated using (
  exists (select 1 from public.plans p where p.id=plan_meeting_details.plan_id and p.host_id=(select private.current_along_profile_id()))
  or exists (select 1 from public.memberships m where m.plan_id=plan_meeting_details.plan_id and m.profile_id=(select private.current_along_profile_id()))
);
create policy "hosts add meeting points" on public.plan_meeting_details
for insert to authenticated with check (
  exists (select 1 from public.plans p where p.id=plan_meeting_details.plan_id and p.host_id=(select private.current_along_profile_id()))
);
revoke select on public.plans from authenticated;
grant select (id,host_id,category,title,venue,date_label,time_label,spots,size,intro,bring,beginner_friendly,status,image_path,created_at,visibility,cost_note)
on public.plans to authenticated;
