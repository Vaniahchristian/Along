import { supabase } from '@/lib/supabase/client';
import { check } from '@/lib/along/errors';
import { prepareChatImage } from '@/lib/media/prepare-chat-image';
import { formatMessageTime } from '@/lib/along/state';

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

async function loadPeople(ids) {
  if (!ids.length) return new Map();
  const peopleRes = await supabase
    .from('profiles')
    .select('id,display_name,initials,tone')
    .in('id', ids);
  check(peopleRes.error);
  return new Map((peopleRes.data || []).map((person) => [person.id, person]));
}

export async function sendPlanMessage(viewerId, planId, text) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('You appear to be offline. Check your connection and try again.');
  }
  const result = await supabase
    .from('messages')
    .insert({ plan_id: planId, sender_id: viewerId, body: text.trim() })
    .select('id,plan_id,sender_id,body,created_at,media_type,media_path')
    .single();
  check(result.error);
  return result.data;
}

export async function sendPlanMedia(planId, file, caption = '') {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('You appear to be offline. Check your connection and try again.');
  }
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
  const people = await loadPeople([...new Set(rows.map((row) => row.sender_id))]);
  const signedUrls = await resolveMediaUrls(rows);
  return rows.map((row) => mapMessage(row, viewerId, people, signedUrls));
}

/** Map a newly inserted realtime/DB message into UI shape. */
export async function hydrateMessage(viewerId, row) {
  if (!row?.id) return null;
  const people = await loadPeople([row.sender_id]);
  const signedUrls = row.media_path ? await resolveMediaUrls([row]) : {};
  return mapMessage(row, viewerId, people, signedUrls);
}
