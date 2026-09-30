import { supabase } from '@/lib/supabase/client';
import { check } from '@/lib/along/errors';

export async function sendPlanMessage(viewerId, planId, text) {
  const result = await supabase
    .from('messages')
    .insert({ plan_id: planId, sender_id: viewerId, body: text.trim() });
  check(result.error);
}

export async function sendPlanMedia(planId, file, caption = '') {
  const body = new FormData();
  body.set('planId', planId);
  body.set('file', file);
  body.set('caption', caption);
  const response = await fetch('/api/chat-media', { method: 'POST', body, credentials: 'same-origin' });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not send the attachment.');
  return result;
}
