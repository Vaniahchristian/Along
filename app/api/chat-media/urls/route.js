import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const fail = (error, status) =>
  Response.json({ error }, { status, headers: { 'Cache-Control': 'private, no-store' } });
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

function dbClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function POST(request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return fail('Invalid request origin.', 403);
  const { userId } = await auth();
  if (!userId) return fail('Sign in to view this attachment.', 401);
  const db = dbClient();
  if (!db) return fail('Attachment unavailable.', 503);
  const body = await request.json().catch(() => null);
  const ids = [...new Set((body?.ids || []).filter((id) => uuid.test(id)))].slice(0, 100);
  if (!ids.length) return Response.json({ urls: {} }, { headers: { 'Cache-Control': 'private, no-store' } });

  const [profile, messages] = await Promise.all([
    db.from('profiles').select('id,suspended_at').eq('clerk_user_id', userId).maybeSingle(),
    db.from('messages').select('id,plan_id,media_path').in('id', ids)
  ]);
  if (profile.error || !profile.data || profile.data.suspended_at)
    return fail('Attachment unavailable.', 403);
  if (messages.error) return fail('Could not load attachments.', 500);

  const planIds = [...new Set((messages.data || []).map((row) => row.plan_id))];
  const membership = planIds.length
    ? await db
        .from('memberships')
        .select('plan_id')
        .eq('profile_id', profile.data.id)
        .in('plan_id', planIds)
    : { data: [], error: null };
  if (membership.error) return fail('Could not verify access.', 500);
  const allowed = new Set((membership.data || []).map((row) => row.plan_id));
  const paths = (messages.data || []).filter(
    (row) => row.media_path && allowed.has(row.plan_id)
  );
  if (!paths.length)
    return Response.json({ urls: {} }, { headers: { 'Cache-Control': 'private, no-store' } });

  const signed = await db.storage
    .from('chat-media')
    .createSignedUrls(
      paths.map((row) => row.media_path),
      3600
    );
  if (signed.error) return fail('Attachment unavailable.', 500);

  const byPath = new Map(
    (signed.data || [])
      .filter((row) => row.signedUrl)
      .map((row) => [row.path, row.signedUrl])
  );
  const urls = {};
  for (const row of paths) {
    const url = byPath.get(row.media_path);
    if (url) urls[row.id] = url;
  }
  return Response.json(
    { urls },
    { headers: { 'Cache-Control': 'private, max-age=300' } }
  );
}
