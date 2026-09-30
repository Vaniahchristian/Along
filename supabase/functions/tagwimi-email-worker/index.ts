import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { emailContent } from './content.js';

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const uuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'Database configuration unavailable.' }, 503);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return json({ error: 'Invalid request.' }, 400);

  if (!uuid(body.workerToken)) return json({ error: 'Unauthorized.' }, 401);
  const consumed = await db.rpc('consume_tagwimi_worker_token', { presented_token: body.workerToken });
  if (consumed.error || consumed.data !== true) return json({ error: 'Unauthorized.' }, 401);
  const fromCron = body.source === 'cron';
  if (body.source !== 'cron' && body.source !== 'app') return json({ error: 'Invalid source.' }, 400);
  const actorId = uuid(body.actorId) ? body.actorId : null;
  const recipientId = uuid(body.recipientId) ? body.recipientId : null;
  if (!fromCron && ((body.actorId && !actorId) || (body.recipientId && !recipientId)))
    return json({ error: 'Invalid profile.' }, 400);
  if (fromCron && (body.actorId || body.recipientId)) return json({ error: 'Invalid cron request.' }, 400);
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) return json({ error: 'Resend key is not configured.' }, 503);

  try {
    if (fromCron) {
      const queued = await db.rpc('queue_tagwimi_reminders');
      if (queued.error) throw queued.error;
    }
    const claimed = await db.rpc('claim_tagwimi_emails', {
      target_actor: fromCron ? null : actorId,
      target_recipient: fromCron ? null : recipientId,
      max_rows: fromCron ? 40 : 10
    });
    if (claimed.error) throw claimed.error;
    let sent = 0;
    let skipped = 0;
    let failed = 0;
    for (const item of claimed.data || []) {
      try {
        const recipient = await db.from('profiles').select('email,email_reminders,is_demo_seed,suspended_at')
          .eq('id', item.recipient_profile_id).single();
        if (recipient.error) throw recipient.error;
        const address = recipient.data?.email;
        if (!address || recipient.data.is_demo_seed || recipient.data.suspended_at || (item.event_type === 'plan_reminder' && !recipient.data.email_reminders)) {
          const update = await db.from('email_outbox').update({ status: 'sent', sent_at: new Date().toISOString(), lease_until: null, last_error: 'Skipped: recipient unavailable or opted out' }).eq('id', item.id);
          if (update.error) throw update.error;
          skipped++;
          continue;
        }
        if (item.event_type === 'plan_reminder') {
          const plan = await db.from('plans').select('status,cancelled_at,starts_at').eq('id', item.plan_id).maybeSingle();
          if (plan.error) throw plan.error;
          if (!plan.data || plan.data.status !== 'open' || plan.data.cancelled_at || !plan.data.starts_at || new Date(plan.data.starts_at) <= new Date()) {
            const update = await db.from('email_outbox').update({ status: 'sent', sent_at: new Date().toISOString(), lease_until: null, last_error: 'Skipped: plan no longer upcoming' }).eq('id', item.id);
            if (update.error) throw update.error;
            skipped++;
            continue;
          }
        }
        const content = emailContent(item);
        if (!content) throw new Error('Unsupported email event');
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': item.dedupe_key },
          body: JSON.stringify({ from: `${['welcome', 'admin_broadcast'].includes(item.event_type) ? 'Tagwimi' : 'Tagwimi Plans'} <${item.event_type === 'welcome' ? 'hello' : 'notifications'}@tagwimi.com>`, to: [address], ...content }),
          signal: AbortSignal.timeout(15000)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(`Resend ${response.status}: ${result.message || 'Could not send'}`);
        const update = await db.from('email_outbox').update({ status: 'sent', sent_at: new Date().toISOString(), provider_id: result.id || null, lease_until: null, last_error: null }).eq('id', item.id);
        if (update.error) throw update.error;
        sent++;
      } catch (error) {
        failed++;
        await db.from('email_outbox').update({ status: 'failed', lease_until: null,
          send_after: new Date(Date.now() + Math.min(60, 2 ** item.attempts) * 60_000).toISOString(),
          last_error: (error instanceof Error ? error.message : String(error)).slice(0, 500) }).eq('id', item.id);
      }
    }
    return json({ sent, skipped, failed, claimed: claimed.data?.length || 0 });
  } catch (error) {
    return json({ error: (error instanceof Error ? error.message : String(error)).slice(0, 200) }, 503);
  }
});
