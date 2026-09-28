const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function client(email) {
  const s = createClient(url, key);
  const { error } = await s.auth.signInWithPassword({ email, password: 'along123' });
  if (error) throw error;
  return s;
}

async function main() {
  const alex = await client('alex@along.test');
  const brenda = await client('brenda@along.test');
  const alexId = (await alex.auth.getUser()).data.user.id;
  const brendaId = (await brenda.auth.getUser()).data.user.id;
  const planId = 'b0000000-0000-4000-8000-000000000008';
  const results = {};

  await alex.from('memberships').update({ checked_in: false, completed: false }).eq('plan_id', planId).eq('profile_id', alexId);
  await brenda.from('memberships').update({ checked_in: false, completed: false }).eq('plan_id', planId).eq('profile_id', brendaId);

  const msg = await alex.from('messages').insert({
    plan_id: planId,
    sender_id: alexId,
    body: 'E2E message ping for notifications.'
  }).select('id').single();
  const afterMsg = await brenda.from('notifications').select('id,title,body')
    .eq('recipient_id', brendaId).eq('kind', 'message')
    .order('created_at', { ascending: false }).limit(1);
  results.message = {
    ok: !!msg.data && (afterMsg.data?.[0]?.body || '').includes('E2E message'),
    for: 'Brenda',
    sample: afterMsg.data?.[0],
    error: msg.error
  };

  const check = await brenda.from('memberships').update({ checked_in: true })
    .eq('plan_id', planId).eq('profile_id', brendaId).select('checked_in');
  const checkNotif = await alex.from('notifications').select('id,kind,title,body')
    .eq('recipient_id', alexId).eq('kind', 'check_in')
    .order('created_at', { ascending: false }).limit(1);
  results.check_in = {
    ok: check.data?.[0]?.checked_in === true && checkNotif.data?.[0]?.kind === 'check_in',
    for: 'Alex',
    sample: checkNotif.data?.[0],
    error: check.error
  };

  const done = await brenda.from('memberships').update({ completed: true })
    .eq('plan_id', planId).eq('profile_id', brendaId).select('completed');
  const doneNotif = await alex.from('notifications').select('id,kind,title,body')
    .eq('recipient_id', alexId).eq('kind', 'plan_completed')
    .order('created_at', { ascending: false }).limit(1);
  results.plan_completed = {
    ok: done.data?.[0]?.completed === true && doneNotif.data?.[0]?.kind === 'plan_completed',
    for: 'Alex',
    sample: doneNotif.data?.[0],
    error: done.error
  };

  const report = await alex.from('plan_reports').insert({
    plan_id: planId,
    reporter_id: alexId,
    reason: 'E2E report notification test'
  }).select('id').single();
  results.report_insert = { ok: !!report.data, id: report.data?.id, error: report.error };

  const circuit = 'b0000000-0000-4000-8000-000000000003';
  await alex.from('join_requests').delete().eq('plan_id', circuit).eq('requester_id', alexId);
  await alex.from('memberships').delete().eq('plan_id', circuit).eq('profile_id', alexId);
  const pending = await alex.from('join_requests').insert({
    plan_id: circuit,
    requester_id: alexId,
    status: 'pending'
  }).select('id').single();
  if (pending.error || !pending.data) {
    results.request_accepted = { ok: false, error: pending.error || 'no pending request created' };
  } else {
    const accept = await brenda.rpc('accept_along_request', { target_request_id: pending.data.id });
    const acceptedNotif = await alex.from('notifications').select('id,kind,title,body')
      .eq('recipient_id', alexId).eq('kind', 'request_accepted')
      .order('created_at', { ascending: false }).limit(1);
    results.request_accepted = {
      ok: !accept.error && acceptedNotif.data?.[0]?.kind === 'request_accepted',
      for: 'Alex',
      sample: acceptedNotif.data?.[0],
      error: accept.error
    };
  }

  const alexInbox = await alex.from('notifications').select('kind,title,body,created_at')
    .eq('recipient_id', alexId).order('created_at', { ascending: false }).limit(10);
  results.alex_inbox = alexInbox.data;

  console.log(JSON.stringify(results, null, 2));
  await alex.auth.signOut();
  await brenda.auth.signOut();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
