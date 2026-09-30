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
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const profile = await db
  .from('profiles')
  .select('id,email,display_name,is_demo_seed,suspended_at')
  .eq('email', 'christianvaniah@gmail.com')
  .maybeSingle();

if (profile.error) {
  console.error('FAIL profile', profile.error.message);
  process.exit(1);
}
if (!profile.data) {
  console.error('FAIL no admin profile');
  process.exit(1);
}

const dedupe = `test:welcome:${Date.now()}`;
const inserted = await db
  .from('email_outbox')
  .insert({
    recipient_profile_id: profile.data.id,
    event_type: 'welcome',
    payload: { name: profile.data.display_name || 'friend' },
    dedupe_key: dedupe,
    status: 'pending',
    send_after: new Date().toISOString()
  })
  .select('id')
  .single();

if (inserted.error) {
  console.error('FAIL insert', inserted.error.message);
  process.exit(1);
}

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
  signal: AbortSignal.timeout(30000)
});

const result = await response.json().catch(() => ({}));
const row = await db
  .from('email_outbox')
  .select('status,provider_id,last_error,sent_at')
  .eq('id', inserted.data.id)
  .single();

console.log(
  JSON.stringify(
    {
      httpOk: response.ok,
      worker: {
        sent: result.sent,
        skipped: result.skipped,
        failed: result.failed,
        claimed: result.claimed,
        error: result.error || null
      },
      outbox: row.data,
      recipientMasked: (profile.data.email || '').replace(/(^.).+(@.*)$/, '$1***$2')
    },
    null,
    2
  )
);

process.exit(response.ok && row.data?.status === 'sent' ? 0 : 1);
