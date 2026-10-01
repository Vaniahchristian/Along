import { supabase } from '@/lib/supabase/client';
import { check } from '@/lib/along/errors';
import { normalizeMapsUrl } from '@/lib/along/maps-url';
import { defaultEndsAt } from '@/lib/along/plan-lifecycle';

function resolveEndsAt(plan) {
  const startsAt = plan.startsAt;
  const endsAt = plan.endsAt || defaultEndsAt(startsAt);
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) throw new Error('Choose a valid start and end time.');
  if (end < start) throw new Error('End time must be after the start time.');
  return endsAt;
}

export async function publishPlan(viewerId, plan) {
  const mapsUrl = normalizeMapsUrl(plan.mapsUrl);
  const endsAt = resolveEndsAt(plan);
  const result = await supabase
    .from('plans')
    .insert({
      host_id: viewerId,
      category: plan.category,
      title: plan.title,
      venue: plan.venue,
      date_label: plan.date,
      time_label: plan.time,
      starts_at: plan.startsAt,
      ends_at: endsAt,
      spots: plan.spots,
      size: plan.size,
      intro: plan.intro,
      bring: plan.bring,
      meet: plan.meet,
      beginner_friendly: Boolean(plan.beginnerFriendly),
      visibility: plan.visibility || 'public',
      cost_note: plan.costNote || null,
      status: 'open'
    })
    .select('id')
    .single();
  check(result.error);
  const membership = await supabase
    .from('memberships')
    .insert({ plan_id: result.data.id, profile_id: viewerId, role: 'host' });
  check(membership.error);
  const meeting = await supabase.from('plan_meeting_details').insert({
    plan_id: result.data.id,
    meet: plan.meet,
    maps_url: mapsUrl
  });
  check(meeting.error);
  return result.data.id;
}

export async function updatePlan(viewerId, planId, plan) {
  const mapsUrl = normalizeMapsUrl(plan.mapsUrl);
  const endsAt = resolveEndsAt(plan);
  const current = await supabase
    .from('plans')
    .select('id,host_id,size,spots')
    .eq('id', planId)
    .eq('host_id', viewerId)
    .maybeSingle();
  check(current.error);
  if (!current.data) throw new Error('Plan not found.');

  const going = Math.max(0, current.data.size - current.data.spots);
  const nextSize = Number(plan.size);
  if (!Number.isFinite(nextSize) || nextSize < 2 || nextSize > 5) {
    throw new Error('Choose a group size between 2 and 5.');
  }
  if (nextSize < going) {
    throw new Error(`This plan already has ${going} people. Pick a larger group size.`);
  }
  const nextSpots = nextSize - going;

  const result = await supabase
    .from('plans')
    .update({
      category: plan.category,
      title: plan.title,
      venue: plan.venue,
      date_label: plan.date,
      time_label: plan.time,
      starts_at: plan.startsAt,
      ends_at: endsAt,
      spots: nextSpots,
      size: nextSize,
      intro: plan.intro,
      bring: plan.bring,
      meet: plan.meet,
      beginner_friendly: Boolean(plan.beginnerFriendly),
      visibility: plan.visibility || 'public',
      cost_note: plan.costNote || null
    })
    .eq('id', planId)
    .eq('host_id', viewerId)
    .select('id')
    .single();
  check(result.error);

  const meetingUpdate = await supabase
    .from('plan_meeting_details')
    .update({ meet: plan.meet, maps_url: mapsUrl })
    .eq('plan_id', planId)
    .select('plan_id')
    .maybeSingle();
  check(meetingUpdate.error);
  if (!meetingUpdate.data) {
    const meetingInsert = await supabase
      .from('plan_meeting_details')
      .insert({ plan_id: planId, meet: plan.meet, maps_url: mapsUrl });
    check(meetingInsert.error);
  }
  return planId;
}

export async function updatePlanVisibility(viewerId, planId, visibility) {
  if (!['public', 'link_only'].includes(visibility)) throw new Error('Choose a valid visibility.');
  const result = await supabase
    .from('plans')
    .update({ visibility })
    .eq('id', planId)
    .eq('host_id', viewerId)
    .select('id')
    .single();
  check(result.error);
}
