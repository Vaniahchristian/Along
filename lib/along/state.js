import { supabase } from '@/lib/supabase/client';
import { check } from '@/lib/along/errors';

export const emptyAlongState = () => ({
  plans: [],
  requests: [],
  joined: [],
  hostRequests: [],
  messages: {},
  messagePreviews: {},
  checkins: [],
  completed: []
});

export function formatMessageTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-UG', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function mapPlan(row, viewerId) {
  const mine = row.host_id === viewerId;
  return {
    id: row.id,
    hostId: row.host_id,
    category: row.category,
    beginnerFriendly: Boolean(row.beginner_friendly),
    title: row.title,
    venue: row.venue,
    date: row.date_label,
    time: row.time_label,
    spots: row.spots,
    size: row.size,
    host: mine ? 'You' : row.host?.display_name || 'Host',
    initials: mine ? 'YO' : row.host?.initials || '??',
    tone: row.host?.tone || '',
    hostAvatarUrl: row.host?.avatar_path
      ? supabase.storage.from('profile-photos').getPublicUrl(row.host.avatar_path).data.publicUrl
      : null,
    hostBio: row.host?.bio || '',
    hostCity: row.host?.city || '',
    hostInterests: row.host?.interests || [],
    intro: row.intro,
    bring: row.bring,
    meet: '',
    status: row.status,
    visibility: row.visibility || 'public',
    costNote: row.cost_note || '',
    imagePath: row.image_path,
    imageUrl: row.image_path
      ? supabase.storage.from('plan-images').getPublicUrl(row.image_path).data.publicUrl
      : null
  };
}

const planSelect =
  'id,host_id,category,beginner_friendly,title,venue,date_label,time_label,spots,size,intro,bring,status,visibility,cost_note,image_path,created_at,host:profiles!plans_host_id_fkey(display_name,initials,tone,is_demo_seed,avatar_path,bio,city,interests)';

async function loadPlanRows() {
  const rows = [];
  const batchSize = 200;
  for (let offset = 0; ; offset += batchSize) {
    const result = await supabase
      .from('plans')
      .select(planSelect)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + batchSize - 1);
    check(result.error);
    rows.push(...(result.data || []));
    if ((result.data || []).length < batchSize) return rows;
  }
}

/** Latest message per related plan for chat list previews — not full threads. */
export async function loadChatPreviews(viewerId, planIds) {
  if (!planIds.length) return {};
  const result = await supabase
    .from('messages')
    .select('id,plan_id,sender_id,body,created_at,media_type,media_path')
    .in('plan_id', planIds)
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(planIds.length * 2, 20), 120));
  check(result.error);
  const latestByPlan = new Map();
  for (const row of result.data || []) {
    if (!latestByPlan.has(row.plan_id)) latestByPlan.set(row.plan_id, row);
  }
  const rows = [...latestByPlan.values()];
  const senderIds = [...new Set(rows.map((row) => row.sender_id))];
  const peopleRes = senderIds.length
    ? await supabase.from('profiles').select('id,display_name,initials,tone').in('id', senderIds)
    : { data: [], error: null };
  check(peopleRes.error);
  const people = new Map((peopleRes.data || []).map((person) => [person.id, person]));
  const previews = {};
  for (const row of rows) {
    const sender = people.get(row.sender_id);
    previews[row.plan_id] = {
      id: row.id,
      mine: row.sender_id === viewerId,
      senderId: row.sender_id,
      senderName: sender?.display_name || 'Member',
      senderInitials: sender?.initials || '??',
      senderTone: sender?.tone || '',
      text: row.body,
      mediaType: row.media_type,
      mediaUrl: null,
      createdAt: row.created_at,
      time: formatMessageTime(row.created_at)
    };
  }
  return previews;
}

/** Explore + my-plans bootstrap. Does not load full chat histories. */
export async function loadAppState(viewerId) {
  const [plansRes, requestsRes, membershipsRes] = await Promise.all([
    loadPlanRows(),
    supabase
      .from('join_requests')
      .select('plan_id')
      .eq('requester_id', viewerId)
      .eq('status', 'pending'),
    supabase
      .from('memberships')
      .select('plan_id,role,checked_in,completed')
      .eq('profile_id', viewerId)
  ]);
  [requestsRes, membershipsRes].forEach((result) => check(result.error));

  const plans = plansRes
    .filter((row) => !row.host?.is_demo_seed)
    .map((row) => mapPlan(row, viewerId));
  const hostedIds = plans.filter((plan) => plan.hostId === viewerId).map((plan) => plan.id);
  const membershipIds = (membershipsRes.data || []).map((row) => row.plan_id);
  const relatedIds = [...new Set([...hostedIds, ...membershipIds])];

  const [incomingRes, messagePreviews] = await Promise.all([
    hostedIds.length
      ? supabase
          .from('join_requests')
          .select('id,plan_id,requester_id,intro')
          .in('plan_id', hostedIds)
          .eq('status', 'pending')
      : Promise.resolve({ data: [], error: null }),
    loadChatPreviews(viewerId, relatedIds)
  ]);
  check(incomingRes.error);

  const meetingRes = relatedIds.length
    ? await supabase.from('plan_meeting_details').select('plan_id,meet').in('plan_id', relatedIds)
    : { data: [], error: null };
  check(meetingRes.error);
  const meetingByPlan = new Map((meetingRes.data || []).map((row) => [row.plan_id, row.meet]));
  for (const plan of plans) plan.meet = meetingByPlan.get(plan.id) || '';

  const requesterIds = [...new Set((incomingRes.data || []).map((row) => row.requester_id))];
  const peopleRes = requesterIds.length
    ? await supabase
        .from('profiles')
        .select('id,display_name,initials,tone')
        .in('id', requesterIds)
    : { data: [], error: null };
  check(peopleRes.error);
  const people = new Map((peopleRes.data || []).map((person) => [person.id, person]));
  const hostRequests = (incomingRes.data || []).map((row) => ({
    id: row.id,
    planId: row.plan_id,
    requesterId: row.requester_id,
    intro: row.intro || '',
    name: people.get(row.requester_id)?.display_name || 'Member',
    initials: people.get(row.requester_id)?.initials || '??'
  }));

  return {
    plans,
    requests: (requestsRes.data || []).map((row) => row.plan_id),
    joined: (membershipsRes.data || [])
      .filter((row) => row.role === 'member')
      .map((row) => row.plan_id),
    hostRequests,
    messages: {},
    messagePreviews,
    checkins: (membershipsRes.data || []).filter((row) => row.checked_in).map((row) => row.plan_id),
    completed: (membershipsRes.data || []).filter((row) => row.completed).map((row) => row.plan_id)
  };
}

/** @deprecated Use loadAppState — kept as a thin alias. */
export async function loadAlongState(viewerId) {
  return loadAppState(viewerId);
}
