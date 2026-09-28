import { supabase } from '@/lib/supabase/client';

function check(error) { if (error) throw new Error(error.message || 'The admin request failed.'); }

export async function getAdminAccess() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { user: null, allowed: false };
  const { data, error } = await supabase.from('along_admins').select('user_id').eq('user_id', authData.user.id).maybeSingle();
  check(error);
  return { user: authData.user, allowed: Boolean(data) };
}

export async function loadAdminDashboard() {
  const [reports, plans, members, pending] = await Promise.all([
    supabase.from('plan_reports').select('id,plan_id,reporter_id,reason,status,review_note,reviewed_at,created_at,plan:plans!plan_reports_plan_id_fkey(id,title,status),reporter:profiles!plan_reports_reporter_id_fkey(display_name,email)', { count: 'exact' }).order('created_at', { ascending: false }).limit(100),
    supabase.from('plans').select('id,title,venue,date_label,time_label,category,status,spots,size,created_at,host:profiles!plans_host_id_fkey(display_name,email)', { count: 'exact' }).order('created_at', { ascending: false }).limit(100),
    supabase.from('profiles').select('id,display_name,email,interests,created_at', { count: 'exact' }).eq('is_demo_seed', false).order('created_at', { ascending: false }).limit(100),
    supabase.from('join_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
  ]);
  [reports, plans, members, pending].forEach((result) => check(result.error));
  return {
    reports: reports.data || [], plans: plans.data || [], members: members.data || [],
    counts: { reports: reports.count || 0, plans: plans.count || 0, members: members.count || 0, pending: pending.count || 0 }
  };
}

export async function setPlanStatus(id, status) {
  if (!['open', 'closed'].includes(status)) throw new Error('Invalid plan status.');
  const result = await supabase.from('plans').update({ status }).eq('id', id).select('id').single();
  check(result.error);
  return result.data;
}

export async function setReportStatus(id, status, reviewNote, adminId) {
  if (!['open', 'resolved'].includes(status)) throw new Error('Invalid report status.');
  const result = await supabase.from('plan_reports').update({
    status, review_note: reviewNote.trim() || null, reviewed_by: adminId, reviewed_at: new Date().toISOString()
  }).eq('id', id).select('id').single();
  check(result.error);
  return result.data;
}
