import { supabase } from '@/lib/supabase/client';
import { initialDemoData } from '@/lib/demo-state.mjs';

export const DEMO_PROFILE_ID = '11111111-1111-1111-1111-111111111099';
export const NINA_PROFILE_ID = '11111111-1111-1111-1111-111111111006';
export const FIRST_SEED_PLAN_ID = '22222222-2222-2222-2222-222222222001';

function throwIfError(error, fallback = 'Supabase request failed') {
  if (error) throw new Error(error.message || fallback);
}

function formatMessageTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Just now';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return 'Just now';
  if (diffMs < 86_400_000) return date.toLocaleTimeString('en-UG', { hour: 'numeric', minute: '2-digit' });
  if (diffMs < 172_800_000) return 'Yesterday';
  return date.toLocaleDateString('en-UG', { weekday: 'short', day: 'numeric', month: 'short' });
}

function mapPlan(row, viewerId) {
  const host = row.host;
  const isMine = row.host_id === viewerId;
  return {
    id: row.id,
    category: row.category,
    beginnerFriendly: Boolean(row.beginner_friendly),
    title: row.title,
    venue: row.venue,
    date: row.date_label,
    time: row.time_label,
    spots: row.spots,
    size: row.size,
    host: isMine ? 'You' : host?.display_name ?? 'Host',
    initials: isMine ? 'YO' : host?.initials ?? '??',
    tone: host?.tone ?? '',
    intro: row.intro,
    bring: row.bring,
    meet: row.meet,
    status: row.status,
    hostId: row.host_id
  };
}

export async function loadAlongState(viewerId) {
  if (!viewerId) return initialDemoData();

  const [plansRes, requestsRes, membershipsRes, hostRequestRes, messagesRes] = await Promise.all([
    supabase.from('plans').select('*, host:profiles!plans_host_id_fkey(*)').order('created_at', { ascending: false }),
    supabase.from('join_requests').select('plan_id').eq('requester_id', viewerId).eq('status', 'pending'),
    supabase.from('memberships').select('plan_id, role, checked_in, completed').eq('profile_id', viewerId),
    supabase.from('join_requests').select('plan_id, plan:plans!join_requests_plan_id_fkey(host_id)').eq('status', 'pending'),
    supabase.from('messages').select('id, plan_id, sender_id, body, created_at').order('created_at', { ascending: true })
  ]);

  throwIfError(plansRes.error);
  throwIfError(requestsRes.error);
  throwIfError(membershipsRes.error);
  throwIfError(hostRequestRes.error);
  throwIfError(messagesRes.error);

  const plans = (plansRes.data ?? []).map((row) => mapPlan(row, viewerId));
  const requests = (requestsRes.data ?? []).map((row) => row.plan_id);
  const joined = (membershipsRes.data ?? []).filter((row) => row.role === 'member').map((row) => row.plan_id);
  const checkins = (membershipsRes.data ?? []).filter((row) => row.checked_in).map((row) => row.plan_id);
  const completed = (membershipsRes.data ?? []).filter((row) => row.completed).map((row) => row.plan_id);
  const hostRequests = (hostRequestRes.data ?? [])
    .filter((row) => row.plan?.host_id === viewerId)
    .map((row) => row.plan_id);

  const messages = {};
  for (const message of messagesRes.data ?? []) {
    messages[message.plan_id] ??= [];
    messages[message.plan_id].push({
      mine: message.sender_id === viewerId,
      text: message.body,
      time: formatMessageTime(message.created_at)
    });
  }

  return { plans, requests, joined, hostRequests, messages, checkins, completed };
}

export async function ensureViewerProfile(viewer) {
  if (viewer.guest) {
    if (viewer.id) {
      const existing = await supabase.from('profiles').select('*').eq('id', viewer.id).maybeSingle();
      throwIfError(existing.error);
      if (existing.data) {
        return {
          id: existing.data.id,
          name: existing.data.display_name,
          email: existing.data.email,
          interests: existing.data.interests ?? [],
          guest: true
        };
      }
    }

    const created = await supabase.from('profiles').insert({
      display_name: viewer.name || 'Guest',
      email: null,
      initials: (viewer.name || 'Guest').slice(0, 2).toUpperCase(),
      tone: '',
      interests: viewer.interests ?? [],
      is_demo_seed: false
    }).select('*').single();
    throwIfError(created.error);
    return {
      id: created.data.id,
      name: created.data.display_name,
      email: null,
      interests: created.data.interests ?? [],
      guest: true
    };
  }

  if (viewer.email === 'demo@along.app') {
    const demo = await supabase.from('profiles').select('*').eq('id', DEMO_PROFILE_ID).single();
    throwIfError(demo.error);
    if (viewer.name && viewer.name !== demo.data.display_name) {
      await supabase.from('profiles').update({ display_name: viewer.name, interests: viewer.interests ?? demo.data.interests }).eq('id', DEMO_PROFILE_ID);
    }
    return {
      id: DEMO_PROFILE_ID,
      name: viewer.name || demo.data.display_name,
      email: 'demo@along.app',
      interests: viewer.interests?.length ? viewer.interests : (demo.data.interests ?? []),
      guest: false
    };
  }

  if (viewer.email) {
    const existing = await supabase.from('profiles').select('*').eq('email', viewer.email).maybeSingle();
    throwIfError(existing.error);
    if (existing.data) {
      const updated = await supabase.from('profiles').update({
        display_name: viewer.name || existing.data.display_name,
        interests: viewer.interests ?? existing.data.interests,
        initials: (viewer.name || existing.data.display_name).slice(0, 2).toUpperCase()
      }).eq('id', existing.data.id).select('*').single();
      throwIfError(updated.error);
      return {
        id: updated.data.id,
        name: updated.data.display_name,
        email: updated.data.email,
        interests: updated.data.interests ?? [],
        guest: false
      };
    }
  }

  const created = await supabase.from('profiles').insert({
    display_name: viewer.name || 'You',
    email: viewer.email,
    initials: (viewer.name || 'You').slice(0, 2).toUpperCase(),
    tone: '',
    interests: viewer.interests ?? [],
    is_demo_seed: false
  }).select('*').single();
  throwIfError(created.error);
  return {
    id: created.data.id,
    name: created.data.display_name,
    email: created.data.email,
    interests: created.data.interests ?? [],
    guest: false
  };
}

export async function requestJoinPlan(viewerId, planId) {
  const inserted = await supabase.from('join_requests').upsert({
    plan_id: planId,
    requester_id: viewerId,
    status: 'pending'
  }, { onConflict: 'plan_id,requester_id' });
  throwIfError(inserted.error);
}

export async function acceptJoinRequest(viewerId, planId) {
  const request = await supabase.from('join_requests').select('id, status').eq('plan_id', planId).eq('requester_id', viewerId).eq('status', 'pending').maybeSingle();
  throwIfError(request.error);
  if (!request.data) return;

  const plan = await supabase.from('plans').select('id, spots, meet, host_id').eq('id', planId).single();
  throwIfError(plan.error);

  const updateRequest = await supabase.from('join_requests').update({ status: 'accepted' }).eq('id', request.data.id);
  throwIfError(updateRequest.error);

  const membership = await supabase.from('memberships').upsert({
    plan_id: planId,
    profile_id: viewerId,
    role: 'member'
  }, { onConflict: 'plan_id,profile_id' });
  throwIfError(membership.error);

  const spots = await supabase.from('plans').update({ spots: Math.max(0, plan.data.spots - 1) }).eq('id', planId);
  throwIfError(spots.error);

  const message = await supabase.from('messages').insert({
    plan_id: planId,
    sender_id: plan.data.host_id,
    body: `Hi! Happy you can join. Let’s meet ${plan.data.meet.toLowerCase()}.`
  });
  throwIfError(message.error);
}

export async function acceptHostRequest(planId) {
  const request = await supabase.from('join_requests').select('id, requester_id').eq('plan_id', planId).eq('requester_id', NINA_PROFILE_ID).eq('status', 'pending').maybeSingle();
  throwIfError(request.error);
  if (!request.data) return;

  const plan = await supabase.from('plans').select('id, spots').eq('id', planId).single();
  throwIfError(plan.error);

  const updateRequest = await supabase.from('join_requests').update({ status: 'accepted' }).eq('id', request.data.id);
  throwIfError(updateRequest.error);

  const membership = await supabase.from('memberships').upsert({
    plan_id: planId,
    profile_id: NINA_PROFILE_ID,
    role: 'member'
  }, { onConflict: 'plan_id,profile_id' });
  throwIfError(membership.error);

  const spots = await supabase.from('plans').update({ spots: Math.max(0, plan.data.spots - 1) }).eq('id', planId);
  throwIfError(spots.error);

  const message = await supabase.from('messages').insert({
    plan_id: planId,
    sender_id: NINA_PROFILE_ID,
    body: 'Hi! Thanks for accepting me. I’ll be there a few minutes early.'
  });
  throwIfError(message.error);
}

export async function publishPlan(viewerId, plan) {
  const inserted = await supabase.from('plans').insert({
    host_id: viewerId,
    category: plan.category,
    title: plan.title,
    venue: plan.venue,
    date_label: plan.date,
    time_label: plan.time,
    spots: plan.spots,
    size: plan.size,
    intro: plan.intro,
    bring: plan.bring,
    meet: plan.meet,
    beginner_friendly: Boolean(plan.beginnerFriendly),
    status: 'open'
  }).select('id').single();
  throwIfError(inserted.error);

  const membership = await supabase.from('memberships').insert({
    plan_id: inserted.data.id,
    profile_id: viewerId,
    role: 'host'
  });
  throwIfError(membership.error);

  const ninaRequest = await supabase.from('join_requests').insert({
    plan_id: inserted.data.id,
    requester_id: NINA_PROFILE_ID,
    status: 'pending'
  });
  throwIfError(ninaRequest.error);

  return inserted.data.id;
}

export async function sendPlanMessage(viewerId, planId, text) {
  const body = text.trim();
  if (!body) return;
  const inserted = await supabase.from('messages').insert({
    plan_id: planId,
    sender_id: viewerId,
    body
  });
  throwIfError(inserted.error);
}

export async function markCheckIn(viewerId, planId) {
  const updated = await supabase.from('memberships').update({ checked_in: true }).eq('plan_id', planId).eq('profile_id', viewerId);
  throwIfError(updated.error);
}

export async function markComplete(viewerId, planId) {
  const updated = await supabase.from('memberships').update({ completed: true }).eq('plan_id', planId).eq('profile_id', viewerId);
  throwIfError(updated.error);
}

export async function resetAlongDemo() {
  const reset = await supabase.rpc('reset_along_demo');
  throwIfError(reset.error);
}
