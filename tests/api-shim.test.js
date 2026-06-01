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

test('constants match server.py', () => {
  const C = shim.CONST;
  assert.strictEqual(C.CHAPTERS.length, 14);
  assert.strictEqual(C.CHAPTERS[0], 'ch1');
  assert.strictEqual(C.QUIZ_TOTALS.ch1, 4);
  assert.strictEqual(C.QUIZ_TOTALS.ch3, 3);
  assert.ok(!('ch10' in C.QUIZ_TOTALS)); // ch10 has no quiz
  assert.strictEqual(C.BADGE_DEFINITIONS.length, 8);
  assert.ok(C.VALID_CARD_IDS.has('ch1_1'));
  assert.ok(C.VALID_CARD_IDS.has('ch9_9'));
  assert.ok(!C.VALID_CARD_IDS.has('ch10_1'));
  assert.ok(C.VALID_ASSIGNMENTS.has('proj5'));
  assert.ok(C.VALID_ASSIGNMENTS.has('ch13'));
});

test('NAME_PATTERN accepts/rejects like server.py', () => {
  assert.ok(shim.CONST.NAME_PATTERN.test('alex-1'));
  assert.ok(!shim.CONST.NAME_PATTERN.test('bad@name'));
  assert.ok(!shim.CONST.NAME_PATTERN.test('')); // empty rejected
});

test('sanitizeName lowercases and trims, rejects invalid', () => {
  assert.strictEqual(shim.sanitizeName('  Alex  '), 'alex');
  assert.strictEqual(shim.sanitizeName('Bad@Name'), null);
  assert.strictEqual(shim.sanitizeName(''), null);
});

test('parseScore parses "3/4"', () => {
  assert.deepStrictEqual(shim.parseScore('3/4'), [3, 4]);
  assert.strictEqual(shim.parseScore('garbage'), null);
});

test('checkBadges awards first_steps + array_master', () => {
  const chapters = { ch1: 't', ch2: 't', ch3: 't' };
  const quizzes = {};
  const earned = shim.checkBadges(chapters, quizzes);
  assert.ok(earned.includes('first_steps'));
  assert.ok(earned.includes('array_master'));
  assert.ok(!earned.includes('halfway'));
});

test('checkBadges awards quiz badges from scores', () => {
  const chapters = {};
  const quizzes = { ch1: '4/4', ch2: '4/4', ch8: '4/4' };
  const earned = shim.checkBadges(chapters, quizzes);
  assert.ok(earned.includes('perfect_score'));   // 100% on a quiz
  assert.ok(earned.includes('quiz_whiz'));        // 3 quizzes >= 80%
});

test('checkBadges awards python_pro at 10+ chapters', () => {
  const chapters = {};
  for (let i = 1; i <= 10; i++) chapters['ch' + i] = 't';
  const earned = shim.checkBadges(chapters, {});
  assert.ok(earned.includes('python_pro'));
});

// helper to call a route and read JSON
async function call(method, path, body) {
  const opts = { method };
  if (body) opts.body = JSON.stringify(body);
  const res = shim.handleRoute(path, opts);
  assert.ok(res, 'route should match: ' + path);
  return { status: res.status, body: await res.json() };
}

test('register stores name and returns ok', async () => {
  localStorage.clear();
  const r = await call('POST', '/api/register', { name: 'Sam' });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.body, { status: 'ok', name: 'sam' });
});

test('register rejects invalid name', async () => {
  const r = await call('POST', '/api/register', { name: 'no@good' });
  assert.strictEqual(r.status, 400);
  assert.ok(r.body.error);
});

test('progress POST then GET reflects completion', async () => {
  localStorage.clear();
  await call('POST', '/api/progress/sam', { chapter: 'ch1', completed: true });
  const g = await call('GET', '/api/progress/sam');
  assert.strictEqual(g.status, 200);
  assert.ok('ch1' in g.body.chapters);
  assert.deepStrictEqual(g.body.quizzes, {});
});

test('progress POST completed:false removes chapter', async () => {
  await call('POST', '/api/progress/sam', { chapter: 'ch1', completed: false });
  const g = await call('GET', '/api/progress/sam');
  assert.ok(!('ch1' in g.body.chapters));
});

test('progress POST rejects invalid chapter', async () => {
  const r = await call('POST', '/api/progress/sam', { chapter: 'ch99', completed: true });
  assert.strictEqual(r.status, 400);
});

test('handleRoute returns null for non-api url', () => {
  assert.strictEqual(shim.handleRoute('style.css', { method: 'GET' }), null);
});

test('quiz saves score and records attempt', async () => {
  localStorage.clear();
  const r = await call('POST', '/api/quiz/sam', { chapter: 'ch1', score: 3, total: 4 });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.score, '3/4');
  assert.strictEqual(r.body.attempt_saved, true);
  const g = await call('GET', '/api/progress/sam');
  assert.strictEqual(g.body.quizzes.ch1, '3/4');
});

test('quiz keeps previous best when new score is lower', async () => {
  await call('POST', '/api/quiz/sam', { chapter: 'ch1', score: 2, total: 4 });
  const g = await call('GET', '/api/progress/sam');
  assert.strictEqual(g.body.quizzes.ch1, '3/4'); // unchanged
});

test('quiz updates when new score is higher', async () => {
  await call('POST', '/api/quiz/sam', { chapter: 'ch1', score: 4, total: 4 });
  const g = await call('GET', '/api/progress/sam');
  assert.strictEqual(g.body.quizzes.ch1, '4/4');
});

test('quiz rejects wrong total for chapter', async () => {
  const r = await call('POST', '/api/quiz/sam', { chapter: 'ch1', score: 1, total: 5 });
  assert.strictEqual(r.status, 400);
});

test('quiz rejects out-of-range score', async () => {
  const r = await call('POST', '/api/quiz/sam', { chapter: 'ch3', score: 9, total: 3 });
  assert.strictEqual(r.status, 400);
});

test('badges GET returns earned + all_badges', async () => {
  localStorage.clear();
  await call('POST', '/api/progress/sam', { chapter: 'ch1', completed: true });
  const r = await call('GET', '/api/badges/sam');
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.earned.includes('first_steps'));
  assert.strictEqual(r.body.all_badges.length, 8);
  // first call reports it as new
  assert.ok(r.body.new.includes('first_steps'));
  // second call: no longer new
  const r2 = await call('GET', '/api/badges/sam');
  assert.ok(!r2.body.new.includes('first_steps'));
});

test('flashcards POST clamps mastery 0..5', async () => {
  localStorage.clear();
  let r;
  for (let i = 0; i < 7; i++) {
    r = await call('POST', '/api/flashcards/sam', { card_id: 'ch1_1', result: 'correct' });
  }
  assert.strictEqual(r.body.mastery, 5); // capped
  r = await call('POST', '/api/flashcards/sam', { card_id: 'ch1_1', result: 'wrong' });
  assert.strictEqual(r.body.mastery, 4);
});

test('flashcards POST rejects bad card_id', async () => {
  const r = await call('POST', '/api/flashcards/sam', { card_id: 'ch99_9', result: 'correct' });
  assert.strictEqual(r.status, 400);
});

test('flashcards GET returns mastery map', async () => {
  const r = await call('GET', '/api/flashcards/sam');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(typeof r.body.mastery, 'object');
});

test('explanations POST then GET round-trips, truncates at 1000', async () => {
  localStorage.clear();
  await call('POST', '/api/explanations/sam', { chapter: 'ch1', text: 'hello' });
  const g = await call('GET', '/api/explanations/sam');
  assert.strictEqual(g.body.explanations.ch1, 'hello');
  const long = 'x'.repeat(1500);
  await call('POST', '/api/explanations/sam', { chapter: 'ch2', text: long });
  const g2 = await call('GET', '/api/explanations/sam');
  assert.strictEqual(g2.body.explanations.ch2.length, 1000);
});

test('assignments POST then GET round-trips', async () => {
  localStorage.clear();
  await call('POST', '/api/assignments/sam', { assignment: 'ch1', code: 'print(1)' });
  const g = await call('GET', '/api/assignments/sam');
  assert.strictEqual(g.body.submissions.ch1, 'print(1)');
  assert.ok(g.body.times.ch1);
});

test('assignments POST rejects invalid assignment id', async () => {
  const r = await call('POST', '/api/assignments/sam', { assignment: 'ch99', code: 'x' });
  assert.strictEqual(r.status, 400);
});

test('installed fetch wrapper services /api and passes others through', async () => {
  // window.fetch was stubbed to return {__passthrough:true}
  shim.installShim(); // idempotent install
  localStorage.clear();

  const apiRes = await global.window.fetch('/api/progress/sam', { method: 'GET' });
  const body = await apiRes.json();
  assert.ok('chapters' in body);

  const through = await global.window.fetch('style.css', { method: 'GET' });
  assert.strictEqual(through.__passthrough, true);
});

test('handleRoute returns null (not a 404 Response) for /api paths it does not own', () => {
  // Regression: a localStorage shim must NOT own /api/run — pyodide-runner does.
  // Returning a truthy 404 here would short-circuit the shared fetch chain and
  // stop the next registered route (the code runner) from ever running.
  assert.strictEqual(shim.handleRoute('/api/run', { method: 'POST', body: '{}' }), null);
  assert.strictEqual(shim.handleRoute('/api/students', { method: 'GET' }), null);
});

test('a second router can own /api/run after api-shim is installed', async () => {
  // Simulates pyodide-runner registering its /api/run route on the shared
  // wrapper AFTER api-shim. api-shim must pass through so the runner wins.
  shim.installShim();
  const w = global.window;
  w.__apiRoutes.push((url) => {
    const path = String(url).split('?')[0];
    if (path === '/api/run') {
      return { status: 200, json: async () => ({ stdout: 'ran', returncode: 0 }) };
    }
    return null;
  });
  const res = await w.fetch('/api/run', { method: 'POST', body: '{}' });
  const out = await res.json();
  assert.strictEqual(out.stdout, 'ran'); // the runner handled it, not api-shim
});

test('multi-word student name works via percent-encoded path (browser sends %20)', async () => {
  localStorage.clear();
  // NAME_PATTERN allows spaces, so "Jon Smith" registers and is stored as "jon smith".
  const reg = await call('POST', '/api/register', { name: 'Jon Smith' });
  assert.strictEqual(reg.status, 200);
  assert.strictEqual(reg.body.name, 'jon smith');
  // The browser encodes the space, so subsequent calls hit "/api/.../jon%20smith".
  // The shim must decode the segment, not 400 on the '%'.
  const enc = await call('GET', '/api/flashcards/jon%20smith');
  assert.strictEqual(enc.status, 200);
  assert.strictEqual(enc.body.student, 'jon smith');
  // And a write round-trips under the encoded path.
  const w = await call('POST', '/api/progress/jon%20smith', { chapter: 'ch1', completed: true });
  assert.strictEqual(w.status, 200);
  const g = await call('GET', '/api/progress/jon%20smith');
  assert.ok('ch1' in g.body.chapters, 'progress stored under decoded name');
});
