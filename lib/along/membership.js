import { supabase } from '@/lib/supabase/client';
import { check } from '@/lib/along/errors';

export async function markCheckIn(viewerId, planId) {
  const result = await supabase
    .from('memberships')
    .update({ checked_in: true })
    .eq('plan_id', planId)
    .eq('profile_id', viewerId);
  check(result.error);
}

/** Members mark themselves done; hosts also close the plan for everyone. */
export async function markComplete(viewerId, planId) {
  const result = await supabase.rpc('complete_along_plan', { target_plan_id: planId });
  check(result.error);
}

export async function hideConversation(viewerId, planId) {
  const result = await supabase
    .from('memberships')
    .update({ chat_hidden_at: new Date().toISOString() })
    .eq('plan_id', planId)
    .eq('profile_id', viewerId);
  check(result.error);
}

/** Best-effort close of plans past ends_at (also runs hourly via cron). */
export async function closeExpiredPlans() {
  const result = await supabase.rpc('close_expired_along_plans');
  if (result.error) return 0;
  return result.data || 0;
}
