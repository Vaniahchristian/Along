import { supabase } from '@/lib/supabase/client';

export const emptyAlongState = () => ({ plans: [], requests: [], joined: [], hostRequests: [], messages: {}, checkins: [], completed: [] });

function check(error) { if (error) throw new Error(error.message || 'The request could not be completed.'); }

function formatMessageTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-UG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

function mapPlan(row, viewerId) {
  const mine = row.host_id === viewerId;
  return {
    id: row.id, hostId: row.host_id, category: row.category, beginnerFriendly: Boolean(row.beginner_friendly),
    title: row.title, venue: row.venue, date: row.date_label, time: row.time_label,
    spots: row.spots, size: row.size, host: mine ? 'You' : row.host?.display_name || 'Host',
    initials: mine ? 'YO' : row.host?.initials || '??', tone: row.host?.tone || '',
    intro: row.intro, bring: row.bring, meet: row.meet, status: row.status
  };
}

export async function ensureViewerProfile(user) {
  const existing = await supabase.from('profiles').select('id,display_name,email,interests').eq('id', user.id).maybeSingle();
  check(existing.error);
  if (!existing.data) {
    const name = String(user.user_metadata?.display_name || user.email?.split('@')[0] || 'Member').trim().slice(0, 40);
    const created = await supabase.from('profiles').insert({
      id: user.id, display_name: name, email: user.email, initials: name.slice(0, 2).toUpperCase(),
      tone: '', interests: user.user_metadata?.interests || [], is_demo_seed: false
    }).select('id,display_name,email,interests').single();
    check(created.error);
    return { id: created.data.id, name: created.data.display_name, email: created.data.email, interests: created.data.interests || [] };
  }
  return { id: existing.data.id, name: existing.data.display_name, email: existing.data.email, interests: existing.data.interests || [] };
}

export async function updateInterests(userId, interests) {
  const result = await supabase.from('profiles').update({ interests }).eq('id', userId);
  check(result.error);
}

export async function loadAlongState(viewerId) {
  const [plansRes, requestsRes, membershipsRes] = await Promise.all([
    supabase.from('plans').select('*, host:profiles!plans_host_id_fkey(display_name,initials,tone,is_demo_seed)').order('created_at', { ascending: false }),
    supabase.from('join_requests').select('plan_id').eq('requester_id', viewerId).eq('status', 'pending'),
    supabase.from('memberships').select('plan_id,role,checked_in,completed').eq('profile_id', viewerId)
  ]);
  [plansRes, requestsRes, membershipsRes].forEach((result) => check(result.error));
  const rows = (plansRes.data || []).filter((row) => !row.host?.is_demo_seed);
  const plans = rows.map((row) => mapPlan(row, viewerId));
  const hostedIds = plans.filter((plan) => plan.hostId === viewerId).map((plan) => plan.id);
  const relatedIds = [...new Set([...hostedIds, ...(membershipsRes.data || []).map((row) => row.plan_id)])];
  const [incomingRes, messagesRes] = await Promise.all([
    hostedIds.length ? supabase.from('join_requests').select('id,plan_id,requester_id').in('plan_id', hostedIds).eq('status', 'pending') : Promise.resolve({ data: [], error: null }),
    relatedIds.length ? supabase.from('messages').select('id,plan_id,sender_id,body,created_at').in('plan_id', relatedIds).order('created_at') : Promise.resolve({ data: [], error: null })
  ]);
  check(incomingRes.error); check(messagesRes.error);
  const requesterIds = [...new Set((incomingRes.data || []).map((row) => row.requester_id))];
  const peopleRes = requesterIds.length ? await supabase.from('profiles').select('id,display_name,initials').in('id', requesterIds) : { data: [], error: null };
  check(peopleRes.error);
  const people = new Map((peopleRes.data || []).map((person) => [person.id, person]));
  const hostRequests = (incomingRes.data || []).map((row) => ({ id: row.id, planId: row.plan_id, requesterId: row.requester_id, name: people.get(row.requester_id)?.display_name || 'Member', initials: people.get(row.requester_id)?.initials || '??' }));
  const messages = {};
  for (const message of messagesRes.data || []) {
    messages[message.plan_id] ||= [];
    messages[message.plan_id].push({ id: message.id, mine: message.sender_id === viewerId, text: message.body, time: formatMessageTime(message.created_at) });
  }
  return {
    plans, requests: (requestsRes.data || []).map((row) => row.plan_id),
    joined: (membershipsRes.data || []).filter((row) => row.role === 'member').map((row) => row.plan_id),
    hostRequests, messages,
    checkins: (membershipsRes.data || []).filter((row) => row.checked_in).map((row) => row.plan_id),
    completed: (membershipsRes.data || []).filter((row) => row.completed).map((row) => row.plan_id)
  };
}

export async function requestJoinPlan(viewerId, planId) {
  const result = await supabase.from('join_requests').insert({ plan_id: planId, requester_id: viewerId, status: 'pending' });
  check(result.error);
}

export async function acceptHostRequest(planId, requestId) {
  const result = await supabase.rpc('accept_along_request', { target_request_id: requestId });
  check(result.error);
}

export async function publishPlan(viewerId, plan) {
  const result = await supabase.from('plans').insert({
    host_id: viewerId, category: plan.category, title: plan.title, venue: plan.venue,
    date_label: plan.date, time_label: plan.time, spots: plan.spots, size: plan.size,
    intro: plan.intro, bring: plan.bring, meet: plan.meet,
    beginner_friendly: Boolean(plan.beginnerFriendly), status: 'open'
  }).select('id').single();
  check(result.error);
  const membership = await supabase.from('memberships').insert({ plan_id: result.data.id, profile_id: viewerId, role: 'host' });
  check(membership.error);
  return result.data.id;
}

export async function sendPlanMessage(viewerId, planId, text) {
  const result = await supabase.from('messages').insert({ plan_id: planId, sender_id: viewerId, body: text.trim() });
  check(result.error);
}

export async function markCheckIn(viewerId, planId) {
  const result = await supabase.from('memberships').update({ checked_in: true }).eq('plan_id', planId).eq('profile_id', viewerId);
  check(result.error);
}

export async function markComplete(viewerId, planId) {
  const result = await supabase.from('memberships').update({ completed: true }).eq('plan_id', planId).eq('profile_id', viewerId);
  check(result.error);
}
