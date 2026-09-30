import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const i = line.indexOf('=');
  if (i <= 0 || line.startsWith('#')) continue;
  const k = line.slice(0, i).trim();
  let v = line.slice(i + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
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

const checks = [];
async function check(name, fn) {
  try {
    const detail = await fn();
    checks.push({ name, ok: true, detail });
  } catch (e) {
    checks.push({
      name,
      ok: false,
      detail: (e && e.message ? e.message : String(e)).slice(0, 240)
    });
  }
}

await check('email_outbox table', async () => {
  const r = await db
    .from('email_outbox')
    .select('id,status,event_type', { count: 'exact' })
    .limit(5);
  if (r.error) throw r.error;
  return { sample: (r.data || []).length, count: r.count };
});

await check('issue_tagwimi_worker_token', async () => {
  const r = await db.rpc('issue_tagwimi_worker_token');
  if (r.error || !r.data) throw r.error || new Error('no token');
  return { tokenIssued: true };
});

await check('claim_tagwimi_emails rpc', async () => {
  const r = await db.rpc('claim_tagwimi_emails', {
    target_actor: null,
    target_recipient: null,
    max_rows: 1
  });
  if (r.error) throw r.error;
  return { claimed: (r.data || []).length };
});

await check('queue_tagwimi_reminders rpc', async () => {
  const r = await db.rpc('queue_tagwimi_reminders');
  if (r.error) throw r.error;
  return { queued: r.data };
});

await check('edge worker tagwimi-email-worker', async () => {
  const issued = await db.rpc('issue_tagwimi_worker_token');
  if (issued.error || !issued.data) throw issued.error || new Error('token failed');
  const response = await fetch(`${url}/functions/v1/tagwimi-email-worker`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workerToken: issued.data, source: 'app' }),
    signal: AbortSignal.timeout(30000)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((result.error || `HTTP ${response.status}`).slice(0, 200));
  }
  return {
    status: response.status,
    sent: result.sent,
    skipped: result.skipped,
    failed: result.failed,
    claimed: result.claimed
  };
});

await check('outbox status summary', async () => {
  const r = await db.from('email_outbox').select('status');
  if (r.error) throw r.error;
  const summary = {};
  for (const row of r.data || []) {
    summary[row.status] = (summary[row.status] || 0) + 1;
  }
  return summary;
});

let failed = 0;
for (const c of checks) {
  console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}  ${JSON.stringify(c.detail)}`);
  if (!c.ok) failed++;
}
process.exit(failed ? 1 : 0);
