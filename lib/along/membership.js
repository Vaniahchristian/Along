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

export async function markComplete(viewerId, planId) {
  const result = await supabase
    .from('memberships')
    .update({ completed: true })
    .eq('plan_id', planId)
    .eq('profile_id', viewerId);
  check(result.error);
}
