import { supabase } from '@/lib/supabase/client';
import { check } from '@/lib/along/errors';

export async function publishPlan(viewerId, plan) {
  const result = await supabase
    .from('plans')
    .insert({
      host_id: viewerId,
      category: plan.category,
      title: plan.title,
      venue: plan.venue,
      date_label: plan.date,
      time_label: plan.time,
      spots: plan.spots,
      size: plan.size,
      intro: plan.intro,
      bring: plan.bring,
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
  const meeting = await supabase.from('plan_meeting_details').insert({ plan_id: result.data.id, meet: plan.meet });
  check(meeting.error);
  return result.data.id;
}

export async function updatePlanVisibility(viewerId, planId, visibility) {
  if (!['public', 'link_only'].includes(visibility)) throw new Error('Choose a valid visibility.');
  const result = await supabase.from('plans').update({ visibility }).eq('id', planId).eq('host_id', viewerId).select('id').single();
  check(result.error);
}
