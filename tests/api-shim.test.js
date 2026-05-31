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
  if (!global.fetch) global.fetch = global.window.fetch;
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
