import { supabase } from '@/lib/supabase/client';
import { check } from '@/lib/along/errors';

export async function loadMySupportThread(viewerId) {
  const thread = await supabase
    .from('support_threads')
    .select('id,member_id,status,last_message_at,member_last_read_at,admin_last_read_at,created_at')
    .eq('member_id', viewerId)
    .maybeSingle();
  check(thread.error);
  if (!thread.data) return { thread: null, messages: [] };

  const messages = await supabase
    .from('support_messages')
    .select('id,thread_id,sender_id,sender_role,body,created_at')
    .eq('thread_id', thread.data.id)
    .order('created_at', { ascending: true });
  check(messages.error);
  return { thread: thread.data, messages: messages.data || [] };
}

export async function ensureSupportThread(viewerId) {
  const existing = await supabase
    .from('support_threads')
    .select('id,member_id,status,last_message_at,member_last_read_at,admin_last_read_at,created_at')
    .eq('member_id', viewerId)
    .maybeSingle();
  check(existing.error);
  if (existing.data) return existing.data;

  const created = await supabase
    .from('support_threads')
    .insert({ member_id: viewerId, status: 'open' })
    .select('id,member_id,status,last_message_at,member_last_read_at,admin_last_read_at,created_at')
    .single();
  if (created.error?.code === '23505') {
    const again = await supabase
      .from('support_threads')
      .select('id,member_id,status,last_message_at,member_last_read_at,admin_last_read_at,created_at')
      .eq('member_id', viewerId)
      .single();
    check(again.error);
    return again.data;
  }
  check(created.error);
  return created.data;
}

export async function sendSupportMessage(viewerId, body) {
  const text = String(body || '').trim();
  if (!text || text.length > 2000) throw new Error('Write a message up to 2000 characters.');
  const thread = await ensureSupportThread(viewerId);
  const inserted = await supabase
    .from('support_messages')
    .insert({
      thread_id: thread.id,
      sender_id: viewerId,
      sender_role: 'member',
      body: text
    })
    .select('id,thread_id,sender_id,sender_role,body,created_at')
    .single();
  check(inserted.error);
  return { thread, message: inserted.data };
}

export async function markSupportThreadRead(viewerId, threadId) {
  if (!threadId) return;
  const result = await supabase
    .from('support_threads')
    .update({ member_last_read_at: new Date().toISOString() })
    .eq('id', threadId)
    .eq('member_id', viewerId);
  check(result.error);
}
