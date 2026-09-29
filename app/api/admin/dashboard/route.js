import { auth, currentUser } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function fail(error, status) { return Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } }); }

async function loadPlans(db) {
  const rows = [];
  let total = 0;
  for (let offset = 0; ; offset += 500) {
    const result = await db.from('plans').select('id,title,venue,date_label,time_label,category,status,spots,size,created_at,host:profiles!plans_host_id_fkey(display_name,email)', { count: offset === 0 ? 'exact' : undefined }).order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 499);
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
  const profile = await db.from('profiles').select('id,email').eq('clerk_user_id', userId).maybeSingle();
  if (profile.error) return fail('Could not check admin access.', 500);
  if (!profile.data) return fail('Admin access required.', 403);
  const role = await db.from('along_admins').select('user_id').eq('user_id', profile.data.id).maybeSingle();
  if (role.error) return fail('Could not check admin access.', 500);
  if (!role.data) return fail('Admin access required.', 403);
  if (new URL(request.url).searchParams.has('access')) {
    const user = await currentUser();
    return Response.json({ user: { id: profile.data.id, email: user?.primaryEmailAddress?.emailAddress || profile.data.email }, allowed: true }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const [reports, plans, members, pending] = await Promise.all([
    db.from('plan_reports').select('id,plan_id,reporter_id,reason,status,review_note,reviewed_at,created_at,plan:plans!plan_reports_plan_id_fkey(id,title,status),reporter:profiles!plan_reports_reporter_id_fkey(display_name,email)', { count: 'exact' }).order('created_at', { ascending: false }).limit(100),
    loadPlans(db),
    db.from('profiles').select('id,display_name,email,interests,created_at', { count: 'exact' }).eq('is_demo_seed', false).order('created_at', { ascending: false }).limit(100),
    db.from('join_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
  ]);
  if ([reports, plans, members, pending].some((result) => result.error)) return fail('Could not load the admin dashboard.', 500);
  return Response.json({ reports: reports.data || [], plans: plans.data || [], members: members.data || [], counts: { reports: reports.count || 0, plans: plans.count || 0, members: members.count || 0, pending: pending.count || 0 } }, { headers: { 'Cache-Control': 'no-store' } });
}
