const test = require('node:test');
const assert = require('node:assert');

// In-memory localStorage polyfill
function installStorage() {
  const store = {};
  global.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
  };
  return store;
}

// Minimal window/fetch stub so the module can install its wrapper
function installWindow() {
  global.window = global.window || {};
  global.window.fetch = async () => ({ __passthrough: true });
  global.fetch = global.window.fetch;
}

installStorage();
installWindow();
const shim = require('../docs/api-shim.js');

test('readJSON returns default for missing key', () => {
  assert.deepStrictEqual(shim.readJSON('nope', { a: 1 }), { a: 1 });
});

test('writeJSON then readJSON round-trips', () => {
  shim.writeJSON('k', { x: 5 });
  assert.deepStrictEqual(shim.readJSON('k', null), { x: 5 });
});

test('readJSON returns default on corrupt JSON', () => {
  localStorage.setItem('bad', '{not json');
  assert.deepStrictEqual(shim.readJSON('bad', 'DFLT'), 'DFLT');
});

test('keyFor builds namespaced key', () => {
  assert.strictEqual(shim.keyFor('alex', 'chapters'), 'gcse:alex:chapters');
});

test('installFetchWrapper installs once and dispatches routes', async () => {
  const w = global.window;
  shim.installFetchWrapper();
  assert.strictEqual(w.__fetchPatched, true);
  const f1 = w.fetch;
  shim.installFetchWrapper();            // idempotent — must not re-wrap
  assert.strictEqual(w.fetch, f1);
  // a route returning a truthy value is used for a matching URL
  w.__apiRoutes.push((url) => url === '/hit'
    ? { json: async () => ({ ok: true }) } : null);
  const hit = await w.fetch('/hit');
  assert.deepStrictEqual(await hit.json(), { ok: true });
  // a route returning null falls through to the real (stubbed) fetch
  const miss = await w.fetch('/miss');
  assert.strictEqual(miss.__passthrough, true);
});

test('jsonResponse exposes json() resolving to the object', async () => {
  const r = shim.jsonResponse({ ok: true, n: 3 }, 200);
  assert.strictEqual(r.status, 200);
  const body = await r.json();
  assert.deepStrictEqual(body, { ok: true, n: 3 });
});

test('jsonResponse defaults to status 200', async () => {
  const r = shim.jsonResponse({ a: 1 });
  assert.strictEqual(r.status, 200);
});
