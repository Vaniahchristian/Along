import { auth, currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function fail(error, status) {
  return Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}
function planTime(plan) {
  const label = String(plan.date_label || '').replace(/^[A-Za-z]{3},?\s+/, '');
  const year = new Date(plan.created_at).getUTCFullYear();
  let stamp = Date.parse(`${label} ${year} ${plan.time_label} GMT+0300`);
  if (stamp < new Date(plan.created_at).getTime() - 864e5)
    stamp = Date.parse(`${label} ${year + 1} ${plan.time_label} GMT+0300`);
  return stamp;
}

async function loadPlans(db) {
  const rows = [];
  let total = 0;
  for (let offset = 0; ; offset += 500) {
    const result = await db
      .from('plans')
      .select(
        'id,title,venue,date_label,time_label,category,status,visibility,spots,size,created_at,host_id,cancelled_at,cancelled_reason,hidden_at,hidden_reason,image_path,host:profiles!plans_host_id_fkey(display_name,email,avatar_path,initials)',
        { count: offset === 0 ? 'exact' : undefined }
      )
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + 499);
    if (result.error) return result;
    if (offset === 0) total = result.count || 0;
    rows.push(...(result.data || []));
    if ((result.data || []).length < 500) return { data: rows, count: total, error: null };
  }
}

export async function GET(request) {
  const { userId } = await auth();
  if (!userId) return fail('Sign in to continue.', 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail('Admin dashboard is temporarily unavailable.', 503);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const profile = await db
    .from('profiles')
    .select('id,email')
    .eq('clerk_user_id', userId)
    .maybeSingle();
  if (profile.error) return fail('Could not check admin access.', 500);
  if (!profile.data) return fail('Admin access required.', 403);
  const role = await db
    .from('along_admins')
    .select('user_id')
    .eq('user_id', profile.data.id)
    .maybeSingle();
  if (role.error) return fail('Could not check admin access.', 500);
  if (!role.data) return fail('Admin access required.', 403);
  if (new URL(request.url).searchParams.has('access')) {
    const user = await currentUser();
    return Response.json(
      {
        user: {
          id: profile.data.id,
          email: user?.primaryEmailAddress?.emailAddress || profile.data.email
        },
        allowed: true
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const [
    reports,
    plans,
    members,
    pending,
    history,
    memberships,
    openReportCount,
    suspendedCount,
    joinRequests
  ] = await Promise.all([
    db
      .from('plan_reports')
      .select(
        'id,plan_id,reporter_id,reason,status,review_note,reviewed_at,created_at,target_type,subject_profile_id,message_id,evidence_text,image_path,priority,assigned_admin_id,plan:plans!plan_reports_plan_id_fkey(id,title,status),reporter:profiles!plan_reports_reporter_id_fkey(display_name,email)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .limit(100),
    loadPlans(db),
    db
      .from('profiles')
      .select(
        'id,display_name,email,interests,created_at,suspended_at,suspension_reason,avatar_path,initials',
        { count: 'exact' }
      )
      .eq('is_demo_seed', false)
      .order('created_at', { ascending: false })
      .limit(100),
    db.from('join_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    db
      .from('admin_actions')
      .select(
        'id,actor_id,action,target_type,target_id,reason,details,created_at,actor:profiles!admin_actions_actor_id_fkey(display_name,email)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .limit(100),
    db.from('memberships').select('plan_id,profile_id,checked_in,completed,created_at'),
    db.from('plan_reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    db
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_demo_seed', false)
      .not('suspended_at', 'is', null),
    db.from('join_requests').select('id,plan_id,status').eq('status', 'pending')
  ]);
  if (
    [
      reports,
      plans,
      members,
      pending,
      history,
      memberships,
      openReportCount,
      suspendedCount,
      joinRequests
    ].some((result) => result.error)
  )
    return fail('Could not load the admin dashboard.', 500);

  const membershipList = memberships.data || [];
  const planList = (plans.data || []).map((plan) => {
    const accepted = membershipList.filter((row) => row.plan_id === plan.id).length;
    return {
      ...plan,
      visibility: plan.visibility || 'public',
      accepted,
      imageUrl: plan.image_path
        ? db.storage.from('plan-images').getPublicUrl(plan.image_path).data.publicUrl
        : null,
      host: plan.host
        ? {
            ...plan.host,
            avatarUrl: plan.host.avatar_path
              ? db.storage.from('profile-photos').getPublicUrl(plan.host.avatar_path).data
                  .publicUrl
              : null
          }
        : null
    };
  });
  const memberList = (members.data || []).map((person) => ({
    ...person,
    avatarUrl: person.avatar_path
      ? db.storage.from('profile-photos').getPublicUrl(person.avatar_path).data.publicUrl
      : null
  }));
  const reportList = reports.data || [];
  const now = Date.now();
  const upcoming = planList.filter(
    (plan) => plan.status === 'open' && !plan.cancelled_at && planTime(plan) > now
  ).length;
  const full = planList.filter(
    (plan) =>
      plan.status === 'open' &&
      !plan.cancelled_at &&
      plan.size > 0 &&
      plan.accepted >= plan.size
  ).length;
  const hidden = planList.filter((plan) => Boolean(plan.hidden_at)).length;
  const cancelled = planList.filter((plan) => Boolean(plan.cancelled_at)).length;
  const membersWithReports = new Set(
    reportList.map((report) => report.subject_profile_id).filter(Boolean)
  ).size;
  const activeIds = new Set([
    ...planList
      .filter((plan) => new Date(plan.created_at).getTime() > now - 30 * 864e5)
      .map((plan) => plan.host_id),
    ...membershipList
      .filter((membership) => new Date(membership.created_at).getTime() > now - 30 * 864e5)
      .map((membership) => membership.profile_id)
  ]);

  return Response.json(
    {
      reports: reportList,
      plans: planList,
      members: memberList,
      history: history.data || [],
      memberships: membershipList,
      joinRequests: joinRequests.data || [],
      counts: {
        reports: reports.count || 0,
        plans: plans.count || 0,
        members: members.count || 0,
        pending: pending.count || 0,
        upcoming,
        full,
        hidden,
        cancelled,
        suspended: suspendedCount.count || 0,
        membersWithReports,
        activeMembers: activeIds.size,
        openReports: openReportCount.count || 0
      }
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
