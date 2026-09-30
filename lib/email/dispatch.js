import { createClient } from '@supabase/supabase-js';

const origin = 'https://tagwimi.com';

export function emailDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Email database credentials are unavailable.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character]);

export function emailContent(item) {
  const p = item.payload || {};
  const title = String(p.title || 'Your plan');
  const details = [title, [p.date, p.time].filter(Boolean).join(' · '), p.location].filter(Boolean);
  const planUrl = item.plan_id ? `${origin}/p/${item.plan_id}` : `${origin}/app/explore`;
  let subject, heading, copy, action = 'View plan', href = planUrl;
  switch (item.event_type) {
    case 'welcome':
      subject = 'Welcome to Tagwimi'; heading = `Welcome to Tagwimi, ${p.name || 'friend'}!`;
      copy = 'Find a plan you would enjoy, or finish your profile so people can get to know you.';
      action = 'Explore plans'; href = `${origin}/app/explore`; break;
    case 'join_request':
      subject = `New request for ${title}`; heading = `${p.requester || 'Someone'} wants to join your plan`;
      copy = 'Review their request and decide whether to welcome them.';
      action = 'Review request'; href = `${origin}/app/plans/${item.plan_id}`; break;
    case 'request_accepted':
      subject = `You’re in: ${title}`; heading = 'Your request was accepted';
      copy = 'You can now say hello and coordinate with the group.';
      action = 'Open group chat'; href = `${origin}/app/chat/${item.plan_id}`; break;
    case 'request_declined':
      subject = `Update on ${title}`; heading = 'Your join request was declined';
      copy = 'There are more plans and people to discover.';
      action = 'Explore other plans'; href = `${origin}/app/explore`; break;
    case 'plan_reminder':
      subject = `Coming up: ${title}`; heading = 'Your plan is coming up';
      copy = 'Check the group chat for the latest details before heading out.';
      action = 'Open group chat'; href = `${origin}/app/chat/${item.plan_id}`; break;
    case 'plan_changed': {
      subject = `Details changed: ${title}`; heading = 'Your plan details changed';
      const labels = { date: 'Date', time: 'Time', location: 'Location', cost: 'Cost' };
      const lines = Object.entries(p.changes || {}).filter(([, v]) => Array.isArray(v));
      copy = lines.map(([key, value]) => `${labels[key]}: ${value[0] || 'Not specified'} → ${value[1] || 'Not specified'}`).join('\n');
      if (!copy) copy = 'Please review the latest details.';
      break;
    }
    case 'plan_cancelled':
      subject = `Cancelled: ${title}`; heading = 'This plan was cancelled';
      copy = p.reason ? `Reason: ${p.reason}` : 'The plan will not take place.';
      action = 'Explore other plans'; href = `${origin}/app/explore`; break;
    case 'participant_left':
      subject = `A spot opened: ${title}`; heading = `${p.participant || 'A participant'} left your plan`;
      copy = 'You have an available spot again.'; break;
    default: return null;
  }
  if (p.cost && !['welcome', 'request_declined', 'plan_cancelled'].includes(item.event_type)) details.push(`Cost: ${p.cost}`);
  const plain = `${heading}\n\n${copy}\n\n${item.event_type === 'welcome' ? '' : details.join('\n') + '\n\n'}${action}: ${href}\n\nTagwimi`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#10291d"><p style="color:#17763a;font-weight:800">Tagwimi</p><h1 style="font-size:26px">${escapeHtml(heading)}</h1><p style="white-space:pre-line;line-height:1.6">${escapeHtml(copy)}</p>${item.event_type === 'welcome' ? '' : `<div style="background:#eef5ed;border-radius:12px;padding:16px;line-height:1.7">${details.map(escapeHtml).join('<br>')}</div>`}<p style="margin:28px 0"><a href="${href}" style="background:#176c36;color:white;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">${escapeHtml(action)}</a></p><p style="font-size:12px;color:#637569">You received this because of your Tagwimi account or plan.</p></div>`;
  return { subject, text: plain, html };
}

export async function dispatchEmails({ actorId = null, recipientId = null, queueReminders = false, limit = 20 } = {}) {
  if (!process.env.RESEND_API_KEY) return { sent: 0, unavailable: true };
  const db = emailDatabase();
  if (queueReminders) {
    const queued = await db.rpc('queue_tagwimi_reminders');
    if (queued.error) throw queued.error;
  }
  const claimed = await db.rpc('claim_tagwimi_emails', { target_actor: actorId, target_recipient: recipientId, max_rows: limit });
  if (claimed.error) throw claimed.error;
  let sent = 0;
  for (const item of claimed.data || []) {
    try {
      const recipient = await db.from('profiles').select('email,email_reminders,is_demo_seed,suspended_at').eq('id', item.recipient_profile_id).single();
      if (recipient.error) throw recipient.error;
      const address = recipient.data?.email;
      if (!address || recipient.data.is_demo_seed || recipient.data.suspended_at || (item.event_type === 'plan_reminder' && !recipient.data.email_reminders)) {
        await db.from('email_outbox').update({ status: 'sent', sent_at: new Date().toISOString(), last_error: 'Skipped: recipient unavailable or opted out' }).eq('id', item.id);
        continue;
      }
      if (item.event_type === 'plan_reminder') {
        const plan = await db.from('plans').select('status,cancelled_at,starts_at').eq('id', item.plan_id).maybeSingle();
        if (plan.error) throw plan.error;
        if (!plan.data || plan.data.status !== 'open' || plan.data.cancelled_at || !plan.data.starts_at || new Date(plan.data.starts_at) <= new Date()) {
          await db.from('email_outbox').update({ status: 'sent', sent_at: new Date().toISOString(), lease_until: null, last_error: 'Skipped: plan no longer upcoming' }).eq('id', item.id);
          continue;
        }
      }
      const content = emailContent(item);
      if (!content) throw new Error('Unsupported email event');
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': item.dedupe_key },
        body: JSON.stringify({ from: `${item.event_type === 'welcome' ? 'Tagwimi' : 'Tagwimi Plans'} <${item.event_type === 'welcome' ? 'hello' : 'notifications'}@tagwimi.com>`, to: [address], ...content })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`Resend ${response.status}: ${result.message || 'Could not send'}`);
      const updated = await db.from('email_outbox').update({ status: 'sent', sent_at: new Date().toISOString(), provider_id: result.id || null, lease_until: null, last_error: null }).eq('id', item.id);
      if (updated.error) throw updated.error;
      sent++;
    } catch (error) {
      await db.from('email_outbox').update({ status: 'failed', lease_until: null, send_after: new Date(Date.now() + Math.min(60, 2 ** item.attempts) * 60_000).toISOString(), last_error: String(error.message || error).slice(0, 500) }).eq('id', item.id);
    }
  }
  return { sent, claimed: claimed.data?.length || 0 };
}
