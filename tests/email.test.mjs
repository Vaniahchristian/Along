import test from 'node:test';
import assert from 'node:assert/strict';
import { emailContent } from '../supabase/functions/tagwimi-email-worker/content.js';

const planId = '11111111-1111-4111-8111-111111111111';
const planPayload = {
  title: 'Saturday swim',
  date: 'Sat, 3 Oct',
  time: '2 PM',
  location: 'Kololo',
  cost: 'UGX 20,000'
};

test('acceptance gives a valid group chat link and plan details', () => {
  const message = emailContent({
    event_type: 'request_accepted',
    plan_id: planId,
    payload: planPayload
  });
  assert.match(message.html, new RegExp(`/app/chat/${planId}`));
  assert.match(message.text, /Sat, 3 Oct/);
  assert.match(message.text, /Kololo/);
});

test('change email shows old and new values and escapes user text', () => {
  const message = emailContent({
    event_type: 'plan_changed',
    plan_id: planId,
    payload: {
      title: '<script>',
      date: 'Sat',
      time: '2 PM',
      location: 'Kololo',
      changes: { time: ['2 PM', '3 PM'] }
    }
  });
  assert.match(message.text, /Time: 2 PM → 3 PM/);
  assert.doesNotMatch(message.html, /<script>/);
  assert.match(message.html, /&lt;script&gt;/);
});

test('every active event type renders subject, text, and html', () => {
  const cases = [
    ['welcome', { name: 'Ada' }],
    ['join_request', { ...planPayload, requester: 'Bea' }],
    ['request_accepted', planPayload],
    ['request_declined', planPayload],
    ['plan_reminder', planPayload],
    ['plan_changed', { ...planPayload, changes: { date: ['Sat', 'Sun'] } }],
    ['plan_cancelled', { ...planPayload, reason: 'Rain' }],
    ['participant_left', { ...planPayload, participant: 'Chris' }],
    ['admin_broadcast', { title: 'Update', body: 'Hello members' }],
    ['support_response', { preview: 'We can help with that.' }]
  ];
  for (const [event_type, payload] of cases) {
    const message = emailContent({ event_type, plan_id: planId, payload });
    assert.ok(message?.subject, event_type);
    assert.ok(message?.text?.includes('Tagwimi'), event_type);
    assert.ok(message?.html?.includes('Tagwimi'), event_type);
  }
});

test('unimplemented event types return null', () => {
  assert.equal(emailContent({ event_type: 'attendance_followup', payload: {} }), null);
  assert.equal(emailContent({ event_type: 'nope', payload: {} }), null);
});
