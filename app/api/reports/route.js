import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function fail(error, status) { return Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } }); }

export async function POST(request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return fail('Invalid request origin.', 403);
  const { userId } = await auth();
  if (!userId) return fail('Sign in to continue.', 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail('Reporting is temporarily unavailable.', 503);
  const body = await request.json().catch(() => null);
  const reason = String(body?.reason || '').trim();
  const targetType = body?.targetType;
  const planId = body?.planId;
  if (!/^[0-9a-f-]{36}$/i.test(planId || '') || !['plan', 'member', 'image', 'message'].includes(targetType) || reason.length < 1 || reason.length > 500) return fail('Choose what to report and describe the concern.', 400);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const profile = await db.from('profiles').select('id').eq('clerk_user_id', userId).maybeSingle();
  if (profile.error || !profile.data) return fail('Could not verify your account.', 403);
  const plan = await db.from('plans').select('id,host_id,image_path').eq('id', planId).maybeSingle();
  if (plan.error || !plan.data) return fail('Plan not found.', 404);
  const report = { reporter_id: profile.data.id, plan_id: planId, reason, target_type: targetType };
  if (targetType === 'member') report.subject_profile_id = plan.data.host_id;
  if (targetType === 'image') {
    if (!plan.data.image_path) return fail('This plan has no host photo to report.', 400);
    report.image_path = plan.data.image_path;
  }
  if (targetType === 'message') {
    const membership = await db.from('memberships').select('id').eq('plan_id', planId).eq('profile_id', profile.data.id).maybeSingle();
    if (membership.error || !membership.data) return fail('Only group members can report a message.', 403);
    const message = await db.from('messages').select('id,body,sender_id').eq('id', body?.messageId || '').eq('plan_id', planId).maybeSingle();
    if (message.error || !message.data) return fail('Choose a message from this group.', 400);
    report.message_id = message.data.id;
    report.subject_profile_id = message.data.sender_id;
    report.evidence_text = message.data.body;
  }
  const inserted = await db.from('plan_reports').insert(report).select('id').single();
  if (inserted.error) return fail('Could not send your report. Please try again.', 500);
  return Response.json({ id: inserted.data.id }, { headers: { 'Cache-Control': 'no-store' } });
}
