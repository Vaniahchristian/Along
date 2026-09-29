import { supabase } from '@/lib/supabase/client';

function check(error) { if (error) throw new Error(error.message || 'The admin request failed.'); }

export async function getAdminAccess(clerkUser = null) {
  if (!clerkUser) return { user: null, allowed: false };
  const response = await fetch('/api/admin/dashboard?access=1', { cache: 'no-store', credentials: 'same-origin' });
  if (response.status === 403) return { user: null, allowed: false };
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not check admin access.');
  return result;
}

export async function loadAdminDashboard() {
  const response = await fetch('/api/admin/dashboard', { cache: 'no-store', credentials: 'same-origin' });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not load the dashboard.');
  return result;
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
