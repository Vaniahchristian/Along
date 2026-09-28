const assert = require('node:assert/strict');

async function main() {
  const { initialDemoData, demoReducer, restoreDemoData } = await import('./lib/demo-state.mjs');
  let data = initialDemoData();
  assert.equal(data.plans.length, 5);
  assert.equal(data.requests.length, 0);

  data = demoReducer(data, { type: 'request', id: 1 });
  data = demoReducer(data, { type: 'request', id: 1 });
  assert.deepEqual(data.requests, [1], 'duplicate requests are ignored');

  data = demoReducer(data, { type: 'accept-request', id: 1 });
  assert.deepEqual(data.requests, []);
  assert.deepEqual(data.joined, [1]);
  assert.equal(data.plans[0].spots, 0);
  assert.match(data.messages[1][0].text, /Happy you can join/);

  data = demoReducer(data, { type: 'message', id: 1, text: '  See you there!  ' });
  assert.equal(data.messages[1][1].text, 'See you there!');
  data = demoReducer(data, { type: 'checkin', id: 1 });
  data = demoReducer(data, { type: 'complete', id: 1 });
  assert.deepEqual(data.checkins, [1]);
  assert.deepEqual(data.completed, [1]);

  const hosted = { ...data.plans[1], id: 42, host: 'You', initials: 'YO', spots: 2, size: 3 };
  data = demoReducer(data, { type: 'publish', plan: hosted });
  assert.equal(data.plans[0].id, 42);
  assert.deepEqual(data.hostRequests, [42]);
  data = demoReducer(data, { type: 'accept-host', id: 42 });
  assert.deepEqual(data.hostRequests, []);
  assert.equal(data.plans[0].spots, 1);
  assert.match(data.messages[42][0].text, /Thanks for accepting/);

  assert.deepEqual(restoreDemoData(JSON.parse(JSON.stringify(data))), data);
  const legacy = initialDemoData();
  delete legacy.plans[0].beginnerFriendly;
  assert.equal(restoreDemoData(legacy).plans[0].beginnerFriendly, true);
  data = demoReducer(data, { type: 'reset' });
  assert.equal(data.plans.length, 5);
  assert.deepEqual(data.joined, []);
  console.log('Along React state-flow smoke test passed');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
