import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const fail = (error, status) =>
  Response.json({ error }, { status, headers: { 'Cache-Control': 'private, no-store' } });
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export async function GET(_request, { params }) {
  const { id } = await params;
  if (!uuid.test(id)) return fail('Attachment not found.', 404);
  const { userId } = await auth();
  if (!userId) return fail('Sign in to view this attachment.', 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail('Attachment unavailable.', 503);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const [profile, message] = await Promise.all([
    db.from('profiles').select('id,suspended_at').eq('clerk_user_id', userId).maybeSingle(),
    db.from('messages').select('plan_id,media_path').eq('id', id).maybeSingle()
  ]);
  if (profile.error || !profile.data || profile.data.suspended_at)
    return fail('Attachment unavailable.', 403);
  if (message.error || !message.data?.media_path) return fail('Attachment not found.', 404);

  const membership = await db
    .from('memberships')
    .select('id')
    .eq('plan_id', message.data.plan_id)
    .eq('profile_id', profile.data.id)
    .maybeSingle();
  if (membership.error || !membership.data)
    return fail('Only plan members can view this attachment.', 403);

  const signed = await db.storage.from('chat-media').createSignedUrl(message.data.media_path, 3600);
  if (signed.error || !signed.data?.signedUrl) return fail('Attachment unavailable.', 500);
  return Response.redirect(signed.data.signedUrl, 302);
}
