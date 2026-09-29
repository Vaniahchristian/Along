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
      meet: plan.meet,
      beginner_friendly: Boolean(plan.beginnerFriendly),
      status: 'open'
    })
    .select('id')
    .single();
  check(result.error);
  const membership = await supabase
    .from('memberships')
    .insert({ plan_id: result.data.id, profile_id: viewerId, role: 'host' });
  check(membership.error);
  return result.data.id;
}
