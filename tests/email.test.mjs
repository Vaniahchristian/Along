import test from 'node:test';
import assert from 'node:assert/strict';
import { emailContent } from '../supabase/functions/tagwimi-email-worker/content.js';

const planId = '11111111-1111-4111-8111-111111111111';

test('acceptance gives a valid group chat link and plan details', () => {
  const message = emailContent({ event_type: 'request_accepted', plan_id: planId,
    payload: { title: 'Saturday swim', date: 'Sat, 3 Oct', time: '2 PM', location: 'Kololo' } });
  assert.match(message.html, new RegExp(`/app/chat/${planId}`));
  assert.match(message.text, /Sat, 3 Oct/);
  assert.match(message.text, /Kololo/);
});

test('change email shows old and new values and escapes user text', () => {
  const message = emailContent({ event_type: 'plan_changed', plan_id: planId,
    payload: { title: '<script>', date: 'Sat', time: '2 PM', location: 'Kololo',
      changes: { time: ['2 PM', '3 PM'] } } });
  assert.match(message.text, /Time: 2 PM → 3 PM/);
  assert.doesNotMatch(message.html, /<script>/);
  assert.match(message.html, /&lt;script&gt;/);
});
