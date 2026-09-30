import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { emailContent } from '../supabase/functions/tagwimi-email-worker/content.js';

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const i = line.indexOf('=');
  if (i <= 0 || line.startsWith('#')) continue;
  const k = line.slice(0, i).trim();
  let v = line.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  if (!process.env[k]) process.env[k] = v;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('FAIL: missing Supabase URL or service key');
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const stamp = Date.now();
const to = process.argv[2] || 'christianvaniah@gmail.com';

const profile = await db
  .from('profiles')
  .select('id,email,display_name,is_demo_seed,suspended_at,email_reminders')
  .eq('email', to)
  .maybeSingle();
if (profile.error || !profile.data) {
  console.error('FAIL profile', profile.error?.message || `no profile for ${to}`);
  process.exit(1);
}

const plan = await db
  .from('plans')
  .select('id,title,date_label,time_label,venue,cost_note,starts_at,status,cancelled_at,host_id')
  .is('cancelled_at', null)
  .eq('status', 'open')
  .order('created_at', { ascending: false })
  .limit(20);

if (plan.error || !plan.data?.length) {
  console.error('FAIL plan', plan.error?.message || 'no open plan');
  process.exit(1);
}

let planRow = null;
for (const candidate of plan.data) {
  const members = await db
    .from('memberships')
    .select('id', { count: 'exact', head: true })
    .eq('plan_id', candidate.id)
    .neq('role', 'host');
  if (!members.error && (members.count || 0) === 0) {
    planRow = candidate;
    break;
  }
}
if (!planRow) planRow = plan.data[0];

const planId = planRow.id;
const basePayload = {
  title: planRow.title || 'Test plan',
  date: planRow.date_label || 'Sat, 4 Oct',
  time: planRow.time_label || '10:00 AM',
  location: planRow.venue || 'Kampala',
  cost: planRow.cost_note || null
};

const paths = [
  {
    event_type: 'welcome',
    payload: { name: profile.data.display_name || 'friend' },
    plan_id: null
  },
  {
    event_type: 'join_request',
    payload: { ...basePayload, requester: 'Test Member' },
    plan_id: planId
  },
  {
    event_type: 'request_accepted',
    payload: basePayload,
    plan_id: planId
  },
  {
    event_type: 'request_declined',
    payload: basePayload,
    plan_id: planId
  },
  {
    event_type: 'plan_changed',
    payload: {
      ...basePayload,
      changes: { time: ['10:00 AM', '11:00 AM'], location: [basePayload.location, 'Updated venue'] }
    },
    plan_id: planId
  },
  {
    event_type: 'plan_cancelled',
    payload: { ...basePayload, reason: 'Host had to cancel (email path test).' },
    plan_id: planId
  },
  {
    event_type: 'participant_left',
    payload: { ...basePayload, participant: 'Test Member' },
    plan_id: planId
  },
  {
    event_type: 'plan_reminder',
    payload: basePayload,
    plan_id: planId
  },
  {
    event_type: 'admin_broadcast',
    payload: {
      title: 'Tagwimi email path test',
      body: 'This confirms admin broadcast rendering and delivery.'
    },
    plan_id: null
  }
];

const unsupported = ['attendance_followup', 'support_response'];

console.log(`\nRecipient: ${(profile.data.email || '').replace(/(^.).+(@.*)$/, '$1***$2')}`);
console.log(`Plan fixture: ${planId}\n`);

const contentResults = [];
for (const path of paths) {
  const content = emailContent({
    event_type: path.event_type,
    plan_id: path.plan_id,
    payload: path.payload
  });
  const ok = Boolean(content?.subject && content?.html && content?.text);
  contentResults.push({ event_type: path.event_type, ok, subject: content?.subject || null });
  console.log(`${ok ? 'PASS' : 'FAIL'}  content:${path.event_type}${ok ? `  "${content.subject}"` : ''}`);
}
for (const event_type of unsupported) {
  const content = emailContent({ event_type, payload: {} });
  const ok = content === null;
  contentResults.push({ event_type, ok, note: 'expected null (not implemented)' });
  console.log(`${ok ? 'PASS' : 'FAIL'}  content:${event_type} (expect null)`);
}

const previousStartsAt = planRow.starts_at;
const reminderStartsAt = new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString();
const startPatch = await db
  .from('plans')
  .update({ starts_at: reminderStartsAt })
  .eq('id', planId);
if (startPatch.error) {
  console.error('FAIL could not set starts_at for reminder test', startPatch.error.message);
  process.exit(1);
}

const sideEffects = await db
  .from('email_outbox')
  .select('id,event_type,status')
  .eq('plan_id', planId)
  .eq('event_type', 'plan_changed')
  .eq('status', 'pending')
  .gte('created_at', new Date(Date.now() - 60_000).toISOString());
if (!sideEffects.error && sideEffects.data?.length) {
  await db
    .from('email_outbox')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      last_error: 'Skipped: side effect from email path test starts_at bump'
    })
    .in(
      'id',
      sideEffects.data.map((row) => row.id)
    );
  console.log(`PASS  neutralize:${sideEffects.data.length} plan_changed side effects`);
}

const insertedIds = [];
try {
  for (const path of paths) {
    const dedupe = `test:path:${path.event_type}:${stamp}`;
    const inserted = await db
      .from('email_outbox')
      .insert({
        recipient_profile_id: profile.data.id,
        actor_profile_id: profile.data.id,
        plan_id: path.plan_id,
        event_type: path.event_type,
        payload: path.payload,
        dedupe_key: dedupe,
        status: 'pending',
        send_after: new Date().toISOString()
      })
      .select('id')
      .single();
    if (inserted.error) {
      console.log(`FAIL  queue:${path.event_type}  ${inserted.error.message}`);
      continue;
    }
    insertedIds.push({ id: inserted.data.id, event_type: path.event_type });
    console.log(`PASS  queue:${path.event_type}`);
  }

  let worker = { sent: 0, skipped: 0, failed: 0, claimed: 0 };
  let httpOk = true;
  for (let round = 0; round < 5; round++) {
    const issued = await db.rpc('issue_tagwimi_worker_token');
    if (issued.error || !issued.data) {
      console.error('FAIL token', issued.error?.message || 'no token');
      process.exit(1);
    }

    const response = await fetch(`${url}/functions/v1/tagwimi-email-worker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workerToken: issued.data,
        source: 'app',
        recipientId: profile.data.id
      }),
      signal: AbortSignal.timeout(45000)
    });
    const result = await response.json().catch(() => ({}));
    httpOk = httpOk && response.ok;
    worker.sent += result.sent || 0;
    worker.skipped += result.skipped || 0;
    worker.failed += result.failed || 0;
    worker.claimed += result.claimed || 0;
    if (!response.ok) {
      worker.error = result.error || `HTTP ${response.status}`;
      break;
    }
    if (!result.claimed) break;
  }
  console.log(
    `\n${httpOk ? 'PASS' : 'FAIL'}  worker  ${JSON.stringify({
      sent: worker.sent,
      skipped: worker.skipped,
      failed: worker.failed,
      claimed: worker.claimed,
      error: worker.error || null
    })}`
  );

  let deliveryFails = 0;
  for (const row of insertedIds) {
    const check = await db
      .from('email_outbox')
      .select('status,provider_id,last_error,attempts')
      .eq('id', row.id)
      .single();
    const status = check.data?.status;
    const ok = status === 'sent' && Boolean(check.data?.provider_id);
    if (!ok) deliveryFails++;
    console.log(
      `${ok ? 'PASS' : 'FAIL'}  deliver:${row.event_type}  ${JSON.stringify({
        status,
        attempts: check.data?.attempts,
        provider: check.data?.provider_id ? 'yes' : null,
        error: check.data?.last_error || null
      })}`
    );
  }

  const contentFails = contentResults.filter((r) => !r.ok).length;
  process.exitCode = httpOk && deliveryFails === 0 && contentFails === 0 ? 0 : 1;
} finally {
  await db.from('plans').update({ starts_at: previousStartsAt }).eq('id', planId);
}
