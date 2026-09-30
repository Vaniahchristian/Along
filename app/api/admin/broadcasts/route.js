import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const fail = (error, status) => Response.json({ error }, {
  status, headers: { 'Cache-Control': 'no-store' }
});
const uuid = (value) => typeof value === 'string' &&
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);

async function adminContext() {
  const { userId } = await auth();
  if (!userId) return { status: 401, error: 'Sign in to continue.' };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { status: 503, error: 'Broadcasts are unavailable.' };
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const profile = await db.from('profiles').select('id').eq('clerk_user_id', userId).maybeSingle();
  if (profile.error) return { status: 500, error: 'Could not check admin access.' };
  if (!profile.data) return { status: 403, error: 'Admin access required.' };
  const role = await db.from('along_admins').select('user_id').eq('user_id', profile.data.id).maybeSingle();
  if (role.error) return { status: 500, error: 'Could not check admin access.' };
  if (!role.data) return { status: 403, error: 'Admin access required.' };
  return { db, adminId: profile.data.id };
}

export async function GET(request) {
  const context = await adminContext();
  if (context.error) return fail(context.error, context.status);
  const query = new URL(request.url).searchParams.get('q')?.trim().slice(0, 80) || '';
  const eligible = context.db.from('profiles').select('id,display_name,email', { count: 'exact' })
    .not('clerk_user_id', 'is', null).eq('is_demo_seed', false).is('suspended_at', null);
  const count = await context.db.from('profiles').select('id', { count: 'exact', head: true })
    .not('clerk_user_id', 'is', null).eq('is_demo_seed', false).is('suspended_at', null);
  if (count.error) return fail('Could not load recipient count.', 500);
  const emailCount = await context.db.from('profiles').select('id', { count: 'exact', head: true })
    .not('clerk_user_id', 'is', null).eq('is_demo_seed', false).is('suspended_at', null)
    .not('email', 'is', null).neq('email', '');
  if (emailCount.error) return fail('Could not load email count.', 500);
  const safeQuery = query.replace(/[%_,()]/g, ' ');
  if (safeQuery) eligible.or(`display_name.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%`);
  const members = await eligible.order('display_name').limit(20);
  if (members.error) return fail('Could not search members.', 500);
  return Response.json({ eligibleCount: count.count || 0, emailEligibleCount: emailCount.count || 0,
    members: members.data || [] },
    { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request) {
  const context = await adminContext();
  if (context.error) return fail(context.error, context.status);
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return fail('Invalid request origin.', 403);
  const body = await request.json().catch(() => ({}));
  const audience = body.audience;
  const channel = body.channel;
  const title = String(body.title || '').trim();
  const message = String(body.message || '').trim();
  const recipientId = body.recipientId || null;
  if (!['all', 'individual'].includes(audience) ||
    !['notification', 'email', 'both'].includes(channel) ||
    (audience === 'individual' && !uuid(recipientId)) ||
    (audience === 'all' && recipientId) ||
    !title || title.length > 120 || !message || message.length > 2000)
    return fail('Check the audience, delivery channel, title, and message.', 400);
  const sent = await context.db.rpc('send_tagwimi_broadcast', {
    admin_profile: context.adminId, audience, individual_profile: recipientId,
    delivery_channel: channel, message_title: title, message_body: message
  });
  if (sent.error) {
    if (sent.error.message.includes('No eligible recipients')) return fail('No eligible recipients.', 400);
    return fail('Could not send this broadcast.', 500);
  }
  return Response.json(sent.data, { headers: { 'Cache-Control': 'no-store' } });
}
