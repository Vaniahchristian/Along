import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const fail = (error, status) => Response.json({ error }, { status, headers: { 'Cache-Control': 'private, no-store' } });
const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export async function GET(_request, { params }) {
  const { id } = await params;
  if (!uuid.test(id)) return fail('Evidence not found.', 404);
  const { userId } = await auth();
  if (!userId) return fail('Sign in to continue.', 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return fail('Evidence unavailable.', 503);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const profile = await db.from('profiles').select('id').eq('clerk_user_id', userId).maybeSingle();
  if (profile.error || !profile.data) return fail('Admin access required.', 403);
  const role = await db.from('along_admins').select('user_id').eq('user_id', profile.data.id).maybeSingle();
  if (role.error || !role.data) return fail('Admin access required.', 403);
  const report = await db.from('plan_reports').select('target_type,image_path').eq('id', id).maybeSingle();
  if (report.error || !report.data?.image_path || !['image', 'message'].includes(report.data.target_type)) return fail('Evidence not found.', 404);
  const bucket = report.data.target_type === 'message' ? 'chat-media' : 'plan-images';
  const signed = await db.storage.from(bucket).createSignedUrl(report.data.image_path, 60);
  if (signed.error || !signed.data?.signedUrl) return fail('Evidence unavailable.', 500);
  return Response.redirect(signed.data.signedUrl, 302);
}
