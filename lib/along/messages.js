import { supabase } from '@/lib/supabase/client';
import { check } from '@/lib/along/errors';

export async function sendPlanMessage(viewerId, planId, text) {
  const result = await supabase
    .from('messages')
    .insert({ plan_id: planId, sender_id: viewerId, body: text.trim() });
  check(result.error);
}
