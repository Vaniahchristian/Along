import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { dispatchEmails } from '@/lib/email/dispatch';

const allowed = new Set([
  'cancel_plan',
  'hide_plan',
  'reopen_plan',
  'suspend_member',
  'reinstate_member',
  'resolve_report',
  'reopen_report',
  'prioritize_report',
  'assign_report'
]);
const tableFor = (action) =>
  action.endsWith('_plan') ? 'plans' : action.endsWith('_member') ? 'profiles' : 'plan_reports';
const fail = (error, status) =>
  Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return fail('Sign in to continue.', 401);
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return fail('Invalid request origin.', 403);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail('Admin actions are unavailable.', 503);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const profile = await db.from('profiles').select('id').eq('clerk_user_id', userId).maybeSingle();
  if (profile.error || !profile.data) return fail('Admin access required.', 403);
  const role = await db
    .from('along_admins')
    .select('user_id')
    .eq('user_id', profile.data.id)
    .maybeSingle();
  if (role.error || !role.data) return fail('Admin access required.', 403);
  const body = await request.json().catch(() => ({}));
  const { action, id } = body;
  const reason = String(body.reason || '').trim();
  if (!allowed.has(action) || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id || ''))
    return fail('Invalid action.', 400);
  if (!reason || reason.length > 500) return fail('Add a reason of up to 500 characters.', 400);
  const table = tableFor(action);
  const before = await db.from(table).select('*').eq('id', id).maybeSingle();
  if (before.error) return fail('Could not load this record.', 500);
  if (!before.data) return fail('Record not found.', 404);
  if (action.endsWith('_member')) {
    if (id === profile.data.id) return fail('You cannot change your own access.', 400);
    const otherAdmin = await db
      .from('along_admins')
      .select('user_id')
      .eq('user_id', id)
      .maybeSingle();
    if (otherAdmin.error || otherAdmin.data)
      return fail('Admin accounts cannot be suspended here.', 400);
  }
  const now = new Date().toISOString();
  let patch;
  switch (action) {
    case 'cancel_plan':
      patch = { status: 'closed', cancelled_at: now, cancelled_reason: reason };
      break;
    case 'hide_plan':
      patch = { status: 'closed', hidden_at: now, hidden_reason: reason };
      break;
    case 'reopen_plan':
      patch = {
        status: 'open',
        cancelled_at: null,
        cancelled_reason: null,
        hidden_at: null,
        hidden_reason: null
      };
      break;
    case 'suspend_member':
      patch = { suspended_at: now, suspension_reason: reason };
      break;
    case 'reinstate_member':
      patch = { suspended_at: null, suspension_reason: null };
      break;
    case 'resolve_report':
      patch = {
        status: 'resolved',
        review_note: reason,
        reviewed_by: profile.data.id,
        reviewed_at: now
      };
      break;
    case 'reopen_report':
      patch = {
        status: 'open',
        review_note: reason,
        reviewed_by: profile.data.id,
        reviewed_at: now
      };
      break;
    case 'prioritize_report':
      patch = { priority: body.priority === 'high' ? 'high' : 'normal' };
      break;
    case 'assign_report':
      patch = { assigned_admin_id: profile.data.id };
      break;
  }
  const changed = await db.from(table).update(patch).eq('id', id).select('id').single();
  if (changed.error) return fail(changed.error.message, 500);
  const audit = await db
    .from('admin_actions')
    .insert({
      actor_id: profile.data.id,
      action,
      target_type: table,
      target_id: id,
      reason,
      details: {
        before: Object.fromEntries(
          Object.keys(patch).map((key) => [key, before.data[key] ?? null])
        ),
        after: patch
      }
    });
  if (audit.error)
    return fail('Action saved, but its history could not be recorded. Contact support.', 500);
  if (action === 'cancel_plan') {
    try { await dispatchEmails({ actorId: before.data.host_id }); }
    catch { /* Scheduled delivery will retry the queued cancellation. */ }
  }
  return Response.json({ id }, { headers: { 'Cache-Control': 'no-store' } });
}
