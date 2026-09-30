import { dispatchEmails } from '@/lib/email/dispatch';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const token = process.env.CRON_SECRET;
  if (!token)
    return Response.json({ error: 'Cron secret is not configured.' }, { status: 503 });
  if (request.headers.get('authorization') !== `Bearer ${token}`)
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    const result = await dispatchEmails({ queueReminders: true, limit: 50 });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Email worker failed.' }, { status: 503 });
  }
}
