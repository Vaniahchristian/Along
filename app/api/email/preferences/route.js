import { auth } from '@clerk/nextjs/server';
import { emailDatabase } from '@/lib/email/dispatch';

export async function PATCH(request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid origin.' }, { status: 403 });
  const { userId } = await auth();
  if (!userId) return Response.json({ error: 'Sign in required.' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.emailReminders !== 'boolean' || typeof body.emailChatSummaries !== 'boolean')
    return Response.json({ error: 'Invalid preferences.' }, { status: 400 });
  try {
    const db = emailDatabase();
    const saved = await db.from('profiles').update({ email_reminders: body.emailReminders, email_chat_summaries: body.emailChatSummaries })
      .eq('clerk_user_id', userId).is('suspended_at', null)
      .select('email_reminders,email_chat_summaries').single();
    if (saved.error) throw saved.error;
    return Response.json({ emailReminders: saved.data.email_reminders, emailChatSummaries: saved.data.email_chat_summaries });
  } catch {
    return Response.json({ error: 'Could not save email preferences.' }, { status: 500 });
  }
}
