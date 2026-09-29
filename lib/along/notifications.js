import { supabase } from '@/lib/supabase/client';
import { check } from '@/lib/along/errors';

export async function loadNotifications(viewerId) {
  const result = await supabase
    .from('notifications')
    .select('id,plan_id,kind,title,body,created_at,read_at')
    .eq('recipient_id', viewerId)
    .order('created_at', { ascending: false })
    .limit(100);
  check(result.error);
  return result.data || [];
}

export async function markNotificationRead(viewerId, id) {
  const result = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('recipient_id', viewerId)
    .is('read_at', null);
  check(result.error);
}

export async function markAllNotificationsRead(viewerId) {
  const result = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', viewerId)
    .is('read_at', null);
  check(result.error);
}

export async function deleteNotification(viewerId, id) {
  const result = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('recipient_id', viewerId);
  check(result.error);
}

export async function clearNotifications(viewerId) {
  const result = await supabase.from('notifications').delete().eq('recipient_id', viewerId);
  check(result.error);
}
