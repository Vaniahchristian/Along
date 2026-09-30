import { createClient } from '@supabase/supabase-js';

export function emailDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Email database credentials are unavailable.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function dispatchEmails({ actorId = null, recipientId = null } = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('Email worker URL is unavailable.');
  const issued = await emailDatabase().rpc('issue_tagwimi_worker_token');
  if (issued.error || !issued.data) throw new Error('Could not authorize the email worker.');
  const response = await fetch(`${url}/functions/v1/tagwimi-email-worker`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workerToken: issued.data, source: 'app', actorId, recipientId }),
    cache: 'no-store',
    signal: AbortSignal.timeout(25000)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Email worker is unavailable.');
  return result;
}
