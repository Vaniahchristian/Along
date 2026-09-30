import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { dispatchEmails } from '@/lib/email/dispatch';

export const dynamic = 'force-dynamic';

const fail = (error, status) =>
  Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
const uuid = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);

async function adminContext() {
  const { userId } = await auth();
  if (!userId) return { status: 401, error: 'Sign in to continue.' };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { status: 503, error: 'Support inbox is unavailable.' };
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const profile = await db.from('profiles').select('id').eq('clerk_user_id', userId).maybeSingle();
  if (profile.error) return { status: 500, error: 'Could not check admin access.' };
  if (!profile.data) return { status: 403, error: 'Admin access required.' };
  const role = await db
    .from('along_admins')
    .select('user_id')
    .eq('user_id', profile.data.id)
    .maybeSingle();
  if (role.error) return { status: 500, error: 'Could not check admin access.' };
  if (!role.data) return { status: 403, error: 'Admin access required.' };
  return { db, adminId: profile.data.id };
}

export async function GET(request) {
  const context = await adminContext();
  if (context.error) return fail(context.error, context.status);

  const threadId = new URL(request.url).searchParams.get('threadId');
  if (threadId) {
    if (!uuid(threadId)) return fail('Invalid thread.', 400);
    const thread = await context.db
      .from('support_threads')
      .select(
        'id,member_id,status,last_message_at,member_last_read_at,admin_last_read_at,created_at,member:profiles!support_threads_member_id_fkey(id,display_name,email,initials)'
      )
      .eq('id', threadId)
      .maybeSingle();
    if (thread.error) return fail('Could not load this conversation.', 500);
    if (!thread.data) return fail('Conversation not found.', 404);
    const messages = await context.db
      .from('support_messages')
      .select('id,thread_id,sender_id,sender_role,body,created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    if (messages.error) return fail('Could not load messages.', 500);
    await context.db
      .from('support_threads')
      .update({ admin_last_read_at: new Date().toISOString() })
      .eq('id', threadId);
    return Response.json(
      { thread: thread.data, messages: messages.data || [] },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const threads = await context.db
    .from('support_threads')
    .select(
      'id,member_id,status,last_message_at,member_last_read_at,admin_last_read_at,created_at,member:profiles!support_threads_member_id_fkey(id,display_name,email,initials)'
    )
    .order('last_message_at', { ascending: false })
    .limit(100);
  if (threads.error) return fail('Could not load support conversations.', 500);

  const ids = (threads.data || []).map((row) => row.id);
  let previews = {};
  if (ids.length) {
    const latest = await context.db
      .from('support_messages')
      .select('id,thread_id,sender_role,body,created_at')
      .in('thread_id', ids)
      .order('created_at', { ascending: false });
    if (!latest.error) {
      for (const row of latest.data || []) {
        if (!previews[row.thread_id]) previews[row.thread_id] = row;
      }
    }
  }

  const list = (threads.data || []).map((row) => {
    const preview = previews[row.id] || null;
    const unread =
      preview &&
      preview.sender_role === 'member' &&
      (!row.admin_last_read_at ||
        new Date(preview.created_at) > new Date(row.admin_last_read_at));
    return { ...row, preview, unread: Boolean(unread) };
  });

  list.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
    return new Date(b.last_message_at) - new Date(a.last_message_at);
  });

  return Response.json({ threads: list }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request) {
  const context = await adminContext();
  if (context.error) return fail(context.error, context.status);
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return fail('Invalid request origin.', 403);

  const body = await request.json().catch(() => ({}));
  const threadId = body.threadId;
  if (!uuid(threadId)) return fail('Invalid thread.', 400);

  if (body.action === 'resolve' || body.action === 'reopen') {
    const status = body.action === 'resolve' ? 'resolved' : 'open';
    const updated = await context.db
      .from('support_threads')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', threadId)
      .select('id,status')
      .single();
    if (updated.error) return fail('Could not update conversation status.', 500);
    return Response.json(updated.data, { headers: { 'Cache-Control': 'no-store' } });
  }

  const text = String(body.body || '').trim();
  if (!text || text.length > 2000)
    return fail('Write a reply up to 2000 characters.', 400);

  const thread = await context.db
    .from('support_threads')
    .select('id,member_id')
    .eq('id', threadId)
    .maybeSingle();
  if (thread.error) return fail('Could not load this conversation.', 500);
  if (!thread.data) return fail('Conversation not found.', 404);

  const inserted = await context.db
    .from('support_messages')
    .insert({
      thread_id: threadId,
      sender_id: context.adminId,
      sender_role: 'admin',
      body: text
    })
    .select('id,thread_id,sender_id,sender_role,body,created_at')
    .single();
  if (inserted.error) return fail('Could not send this reply.', 500);

  try {
    await dispatchEmails({ actorId: context.adminId });
  } catch {
    /* Cron retries support_response emails. */
  }

  return Response.json(inserted.data, { headers: { 'Cache-Control': 'no-store' } });
}
