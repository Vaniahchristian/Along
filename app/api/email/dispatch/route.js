import { auth } from '@clerk/nextjs/server';
import { dispatchEmails, emailDatabase } from '@/lib/email/dispatch';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid origin.' }, { status: 403 });
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Sign in required.' }, { status: 401 });
  try {
    const db = emailDatabase();
    const profile = await db.from('profiles').select('id').eq('clerk_user_id', userId).maybeSingle();
    if (profile.error || !profile.data) return Response.json({ error: 'Profile not found.' }, { status: 403 });
    const result = await dispatchEmails({ actorId: profile.data.id, limit: 10 });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Email delivery will be retried.' }, { status: 503 });
  }
}
