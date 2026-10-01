import { supabase } from '@/lib/supabase/client';
import { check } from '@/lib/along/errors';
import { normalizeMapsUrl } from '@/lib/along/maps-url';

export async function publishPlan(viewerId, plan) {
  const mapsUrl = normalizeMapsUrl(plan.mapsUrl);
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

  const meeting = await supabase
    .from('plan_meeting_details')
    .upsert({ plan_id: planId, meet: plan.meet, maps_url: mapsUrl }, { onConflict: 'plan_id' });
  check(meeting.error);
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
