import { supabase } from '@/lib/supabase/client';
import { check } from '@/lib/along/errors';
import { prepareChatImage } from '@/lib/media/prepare-chat-image';

function formatMessageTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-UG', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function mapMessage(message, viewerId, people, signedUrls = {}) {
  const sender = people.get(message.sender_id);
  return {
    id: message.id,
    mine: message.sender_id === viewerId,
    senderId: message.sender_id,
    senderName: sender?.display_name || 'Member',
    senderInitials: sender?.initials || '??',
    senderTone: sender?.tone || '',
    text: message.body,
    mediaType: message.media_type,
    mediaUrl: message.media_path
      ? signedUrls[message.id] || `/api/chat-media/${message.id}`
      : null,
    createdAt: message.created_at,
    time: formatMessageTime(message.created_at)
  };
}

async function resolveMediaUrls(messages) {
  const ids = messages.filter((row) => row.media_path).map((row) => row.id);
  if (!ids.length) return {};
  try {
    const response = await fetch('/api/chat-media/urls', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    if (!response.ok) return {};
    const result = await response.json().catch(() => ({}));
    return result.urls || {};
  } catch {
    return {};
  }
}

export async function sendPlanMessage(viewerId, planId, text) {
  const result = await supabase
    .from('messages')
    .insert({ plan_id: planId, sender_id: viewerId, body: text.trim() })
    .select('id,plan_id,sender_id,body,created_at,media_type,media_path')
    .single();
  check(result.error);
  return result.data;
}

export async function sendPlanMedia(planId, file, caption = '') {
  let upload = file;
  if (file?.type?.startsWith('image/')) upload = await prepareChatImage(file);
  const body = new FormData();
  body.set('planId', planId);
  body.set('file', upload);
  body.set('caption', caption);
  const response = await fetch('/api/chat-media', {
    method: 'POST',
    body,
    credentials: 'same-origin'
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not send the attachment.');
  return result;
}

export async function loadPlanMessages(viewerId, planId) {
  const result = await supabase
    .from('messages')
    .select('id,plan_id,sender_id,body,created_at,media_type,media_path')
    .eq('plan_id', planId)
    .order('created_at');
  check(result.error);
  const rows = result.data || [];
  const participantIds = [...new Set(rows.map((row) => row.sender_id))];
  const peopleRes = participantIds.length
    ? await supabase.from('profiles').select('id,display_name,initials,tone').in('id', participantIds)
    : { data: [], error: null };
  check(peopleRes.error);
  const people = new Map((peopleRes.data || []).map((person) => [person.id, person]));
  const signedUrls = await resolveMediaUrls(rows);
  return rows.map((row) => mapMessage(row, viewerId, people, signedUrls));
}
