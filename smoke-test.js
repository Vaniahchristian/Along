const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const handlers = {};
const app = { innerHTML: '', addEventListener: (name, handler) => { handlers[name] = handler; } };
const store = new Map();
const context = vm.createContext({
  document: {
    getElementById: id => id === 'app' ? app : null,
    title: ''
  },
  localStorage: { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) },
  window: { scrollTo() {} },
  setTimeout() {},
  prompt: () => '',
  location: { reload() {} },
  console,
  AbortController,
  Date,
  FormData
});
vm.runInContext(fs.readFileSync('lib/prototype.js', 'utf8').replace('export function mountPrototype', 'function mountPrototype'), context);
context.root = app;
vm.runInContext('mountPrototype(root)', context);
const saved = () => JSON.parse(store.get('along-demo'));
assert.match(app.innerHTML, /Explore plans/);

function click(attribute, value) {
  const element = {
    dataset: { [attribute]: value },
    hasAttribute: name => name === `data-${attribute}`
  };
  handlers.click({ target: { closest: () => element } });
}
click('detail', '1');
assert.match(app.innerHTML, /Saturday morning swim/);
click('request', '1');
assert.deepEqual(saved().requests, [1]);
click('accept', '');
assert.deepEqual(saved().joined, [1]);
assert.equal(saved().plans[0].spots, 0);
click('chat', '1');
assert.match(app.innerHTML, /Group chat is for plan details/);
click('checkin', '1');
assert.deepEqual(saved().checkins, [1]);
click('complete', '1');
assert.deepEqual(saved().completed, [1]);
console.log('Along flow smoke test passed');
