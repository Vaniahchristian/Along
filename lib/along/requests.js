import { supabase } from '@/lib/supabase/client';
import { check } from '@/lib/along/errors';

export async function requestJoinPlan(viewerId, planId) {
  const result = await supabase
    .from('join_requests')
    .insert({ plan_id: planId, requester_id: viewerId, status: 'pending' });
  check(result.error);
}

export async function cancelJoinRequest(viewerId, planId) {
  const result = await supabase
    .from('join_requests')
    .delete()
    .eq('plan_id', planId)
    .eq('requester_id', viewerId)
    .eq('status', 'pending');
  check(result.error);
}

export async function acceptHostRequest(planId, requestId) {
  const result = await supabase.rpc('accept_along_request', { target_request_id: requestId });
  check(result.error);
}
