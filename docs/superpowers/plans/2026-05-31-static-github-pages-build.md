# Static GitHub Pages Build — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a static, GitHub-Pages-deployable build of the GCSE Advanced Programming site under `/docs`, replacing the Flask+Redis backend with a localStorage `fetch` shim and an in-browser Pyodide code runner, while leaving the existing Flask/Railway app fully intact.

**Architecture:** A build script copies the frontend into `/docs` and injects two small shim scripts. `api-shim.js` wraps `window.fetch` and services `/api/*` from localStorage, returning the same JSON shapes the Flask routes returned. `pyodide-runner.js` services `/api/run` by running real CPython compiled to WebAssembly. Both register handlers into a single shared, idempotent fetch wrapper so load order is irrelevant. The existing `app.js`, `features.js`, and inline page scripts are copied unchanged except for absolute→relative link rewrites needed for project-subpath hosting.

**Tech Stack:** Vanilla JS (browser), Pyodide v0.26.4 (jsDelivr CDN), localStorage, Bash build script, Node's built-in `node:test`/`node:assert` for unit tests (no new dependencies).

---

## Conventions for this plan

**Testing JS without a framework.** This repo has no test runner. We use Node's
**built-in** `node:test` + `node:assert` (Node ≥18, already required by the
toolchain) — zero new dependencies. Run any test file with `node <file>`.

**UMD guard.** `api-shim.js` and `pyodide-runner.js` must work both as plain
browser `<script>` tags **and** be `require()`-able in Node tests. Each file's
pure logic is placed in functions exported via a tail guard:

```js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { /* functions under test */ };
}
```

In the browser `module` is undefined, so the guard is skipped and the script
just defines globals + installs the fetch handler. In Node, the test file
`require()`s the module and exercises the exported functions.

**localStorage in Node tests.** Tests that touch storage install a tiny in-memory
`localStorage` polyfill on `global` before requiring the module (shown in the
relevant task).

**File structure (locked):**

- `build-static.sh` (repo root) — copy + inject + rewrite → `/docs`
- `docs/api-shim.js` — localStorage handlers + shared fetch wrapper
- `docs/pyodide-runner.js` — Pyodide `/api/run` handler
- `docs/.nojekyll` — disable Jekyll
- `tests/api-shim.test.js` — unit tests for shim logic
- `tests/pyodide-runner.test.js` — unit tests for runner helpers (pure parts)
- `tests/build-static.test.sh` — asserts the build produced correct `/docs`

**Pyodide version:** pinned to `v0.26.4`, base URL
`https://cdn.jsdelivr.net/pyodide/v0.26.4/full/`, loader script
`https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js`.

**`.gitignore` note:** the repo's `.gitignore` does not ignore `docs/`, so the
generated build is committed (GitHub Pages serves it from the branch). The
`docs/superpowers/` spec+plan folders already live there and are unaffected.

---

## Task 1: Shared fetch wrapper + storage helpers (api-shim.js foundation)

**Files:**
- Create: `docs/api-shim.js`
- Test: `tests/api-shim.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/api-shim.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/api-shim.test.js`
Expected: FAIL — `Cannot find module '../docs/api-shim.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `docs/api-shim.js`:

```js
/* api-shim.js — services /api/* from localStorage on GitHub Pages.
   Works as a browser <script> AND as a Node require() (for tests). */
(function () {
  'use strict';

  // ---- storage helpers ----
  function keyFor(student, suffix) {
    return 'gcse:' + student + ':' + suffix;
  }

  function readJSON(key, dflt) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) return dflt;
      return JSON.parse(raw);
    } catch (e) {
      return dflt;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      // quota exceeded or storage disabled — degrade silently
      return false;
    }
  }

  // ---- shared fetch wrapper (idempotent; both shims reuse it) ----
  function installFetchWrapper() {
    const w = (typeof window !== 'undefined') ? window : global;
    w.__apiRoutes = w.__apiRoutes || [];
    if (!w.__fetchPatched) {
      w.__fetchPatched = true;
      const realFetch = w.fetch.bind(w);
      w.fetch = function (url, opts) {
        for (const route of w.__apiRoutes) {
          const res = route(url, opts);   // Response or null
          if (res) return res;
        }
        return realFetch(url, opts);
      };
    }
    return w;
  }

  // expose for browser
  if (typeof window !== 'undefined') {
    window.__apiShim = { keyFor, readJSON, writeJSON };
  }

  // expose for Node tests
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { keyFor, readJSON, writeJSON, installFetchWrapper };
  }
})();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/api-shim.test.js`
Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add docs/api-shim.js tests/api-shim.test.js
git commit -m "feat: api-shim storage helpers + shared fetch wrapper"
```

---

## Task 2: Helper to build a Flask-shaped Response

**Files:**
- Modify: `docs/api-shim.js`
- Test: `tests/api-shim.test.js`

The shim must return objects shaped like `fetch` Responses — the frontend calls
`res.json()`. We add a `jsonResponse(obj, status)` helper that returns a
real `Response` in the browser, and a duck-typed object in Node.

- [ ] **Step 1: Write the failing test**

Append to `tests/api-shim.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/api-shim.test.js`
Expected: FAIL — `shim.jsonResponse is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `docs/api-shim.js`, add inside the IIFE (after `writeJSON`):

```js
  function jsonResponse(obj, status) {
    status = status || 200;
    if (typeof Response !== 'undefined') {
      return new Response(JSON.stringify(obj), {
        status: status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Node test fallback — duck-typed Response
    return {
      status: status,
      ok: status >= 200 && status < 300,
      json: async function () { return obj; },
    };
  }
```

Add `jsonResponse` to BOTH the `window.__apiShim` object and the
`module.exports` object.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/api-shim.test.js`
Expected: PASS — all tests pass.

- [ ] **Step 5: Commit**

```bash
git add docs/api-shim.js tests/api-shim.test.js
git commit -m "feat: jsonResponse helper for Flask-shaped responses"
```

---

## Task 3: Constants — chapters, quiz totals, badge definitions, card IDs

**Files:**
- Modify: `docs/api-shim.js`
- Test: `tests/api-shim.test.js`

Port the validation constants from `server.py` so behaviour matches exactly.
Source of truth: `server.py` lines 73-110.

- [ ] **Step 1: Write the failing test**

Append to `tests/api-shim.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/api-shim.test.js`
Expected: FAIL — `Cannot read properties of undefined (reading 'CHAPTERS')`.

- [ ] **Step 3: Write minimal implementation**

In `docs/api-shim.js`, add inside the IIFE (after `jsonResponse`):

```js
  var CHAPTERS = ['ch1','ch2','ch3','ch4','ch5','ch6','ch7','ch8','ch9','ch10',
                  'ch11','ch12','ch13','ch14'];

  var QUIZ_TOTALS = { ch1:4, ch2:4, ch3:3, ch4:3, ch5:3, ch6:3,
                      ch7:3, ch8:4, ch9:4,
                      ch11:4, ch12:3, ch13:4, ch14:4 };

  var VALID_CARD_IDS = new Set();
  for (var cn = 1; cn < 10; cn++) {
    for (var k = 1; k < 10; k++) { VALID_CARD_IDS.add('ch' + cn + '_' + k); }
  }

  var VALID_ASSIGNMENTS = new Set(['ch1','ch2','ch3','ch4','ch5','ch6','ch7',
    'ch8','ch10','proj1','proj2','proj3','proj5','ch13','ch14']);

  var NAME_PATTERN = /^[a-zA-Z0-9 \-]{1,30}$/;

  var BADGE_DEFINITIONS = [
    {id:'first_steps',     name:'First Steps',     icon:'🐣', desc:'Complete your first chapter',       condition:{type:'chapters_min', count:1}},
    {id:'halfway',         name:'Halfway There',   icon:'⚡', desc:'Complete 5 chapters',               condition:{type:'chapters_min', count:5}},
    {id:'array_master',    name:'Array Master',    icon:'📦', desc:'Complete Ch 2 and Ch 3',            condition:{type:'chapters_all', chapters:['ch2','ch3']}},
    {id:'file_wizard',     name:'File Wizard',     icon:'📁', desc:'Complete Ch 5 (External Files)',    condition:{type:'chapters_all', chapters:['ch5']}},
    {id:'security_expert', name:'Security Expert', icon:'🔐', desc:'Complete Ch 8 (Validation & Auth)', condition:{type:'chapters_all', chapters:['ch8']}},
    {id:'quiz_whiz',       name:'Quiz Whiz',       icon:'🧠', desc:'Score 80%+ on any 3 quizzes',       condition:{type:'quizzes_good', count:3}},
    {id:'perfect_score',   name:'Perfectionist',   icon:'💯', desc:'Get 100% on any quiz',              condition:{type:'quiz_perfect', count:1}},
    {id:'python_pro',      name:'Python Pro',      icon:'🐍', desc:'Complete ALL chapters',             condition:{type:'chapters_min', count:10}},
  ];

  var CONST = {
    CHAPTERS: CHAPTERS,
    VALID_CHAPTERS: new Set(CHAPTERS),
    QUIZ_TOTALS: QUIZ_TOTALS,
    VALID_CARD_IDS: VALID_CARD_IDS,
    VALID_ASSIGNMENTS: VALID_ASSIGNMENTS,
    NAME_PATTERN: NAME_PATTERN,
    BADGE_DEFINITIONS: BADGE_DEFINITIONS,
  };
```

Add `CONST` to BOTH `window.__apiShim` and `module.exports`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/api-shim.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/api-shim.js tests/api-shim.test.js
git commit -m "feat: port server.py validation constants to shim"
```

---

## Task 4: Pure logic — sanitizeName, parseScore, checkBadges

**Files:**
- Modify: `docs/api-shim.js`
- Test: `tests/api-shim.test.js`

Port `sanitize_name` (server.py:134), `parse_score` (server.py:149), and
`check_badges` (server.py:325) as pure functions. `checkBadges` takes the
chapters map and quizzes map directly (so it's testable without storage).

- [ ] **Step 1: Write the failing test**

Append to `tests/api-shim.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/api-shim.test.js`
Expected: FAIL — `shim.sanitizeName is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `docs/api-shim.js`, add inside the IIFE (after `CONST`):

```js
  function sanitizeName(name) {
    name = (name || '').trim().toLowerCase();
    if (!name || !NAME_PATTERN.test(name)) return null;
    return name;
  }

  function parseScore(s) {
    if (typeof s !== 'string') return null;
    var parts = s.split('/');
    if (parts.length !== 2) return null;
    var a = parseInt(parts[0], 10), b = parseInt(parts[1], 10);
    if (isNaN(a) || isNaN(b)) return null;
    return [a, b];
  }

  // Mirrors server.py check_badges. chapters/quizzes are plain objects.
  function checkBadges(chapters, quizzes) {
    var earned = [];
    BADGE_DEFINITIONS.forEach(function (badge) {
      var cond = badge.condition, met = false, i, p;
      if (cond.type === 'chapters_min') {
        var done = CHAPTERS.filter(function (ch) { return ch in chapters; }).length;
        met = done >= cond.count;
      } else if (cond.type === 'chapters_all') {
        met = cond.chapters.every(function (ch) { return ch in chapters; });
      } else if (cond.type === 'quizzes_good') {
        var good = 0;
        for (var ch in quizzes) {
          p = parseScore(quizzes[ch]);
          if (p && p[1] > 0 && (p[0] / p[1]) >= 0.8) good++;
        }
        met = good >= cond.count;
      } else if (cond.type === 'quiz_perfect') {
        var perfect = 0;
        for (var ch2 in quizzes) {
          p = parseScore(quizzes[ch2]);
          if (p && p[0] === p[1] && p[1] > 0) perfect++;
        }
        met = perfect >= cond.count;
      }
      if (met) earned.push(badge.id);
    });
    return earned;
  }
```

Add `sanitizeName`, `parseScore`, `checkBadges` to BOTH `window.__apiShim` and
`module.exports`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/api-shim.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/api-shim.js tests/api-shim.test.js
git commit -m "feat: port sanitizeName, parseScore, checkBadges to shim"
```

---

## Task 5: Route handler — register + progress (GET/POST)

**Files:**
- Modify: `docs/api-shim.js`
- Test: `tests/api-shim.test.js`

Now wire the actual `/api/*` dispatch. We add `handleRoute(url, opts)` that
returns a Response or null. Bodies arrive as JSON strings in `opts.body` (the
frontend always `JSON.stringify`s). This task covers `/api/register` and
`/api/progress/<student>` (GET + POST). Response shapes from server.py:223-273.

- [ ] **Step 1: Write the failing test**

Append to `tests/api-shim.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/api-shim.test.js`
Expected: FAIL — `shim.handleRoute is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `docs/api-shim.js`, add inside the IIFE (after `checkBadges`):

```js
  function nowStamp() {
    // server used local time "%Y-%m-%d %H:%M:%S"; ISO slice is fine here
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  function parseBody(opts) {
    if (!opts || !opts.body) return {};
    try { return JSON.parse(opts.body); } catch (e) { return {}; }
  }

  function urlPath(url) {
    // url may be absolute or relative; we only care about the pathname
    try {
      if (url.indexOf('http') === 0) return new URL(url).pathname;
    } catch (e) { /* fall through */ }
    return String(url).split('?')[0];
  }

  // Returns Response or null (null = not an api route, pass through)
  function handleRoute(url, opts) {
    var path = urlPath(url);
    if (path.indexOf('/api/') !== 0) return null;
    var method = (opts && opts.method ? opts.method : 'GET').toUpperCase();
    var body = parseBody(opts);
    var seg = path.split('/').filter(Boolean); // ['api','progress','sam']

    // /api/register
    if (seg[1] === 'register' && method === 'POST') {
      var name = sanitizeName(body.name);
      if (!name) return jsonResponse({ error: 'Name is required (letters, numbers, spaces, hyphens only)' }, 400);
      return jsonResponse({ status: 'ok', name: name });
    }

    // /api/progress/<student>
    if (seg[1] === 'progress') {
      var student = sanitizeName(seg[2]);
      if (!student) return jsonResponse({ error: 'Invalid student name' }, 400);
      var chKey = keyFor(student, 'chapters');
      if (method === 'GET') {
        var chapters = readJSON(chKey, {});
        var quizzes = readJSON(keyFor(student, 'quizzes'), {});
        return jsonResponse({ student: student, chapters: chapters, quizzes: quizzes });
      }
      if (method === 'POST') {
        var chapter = body.chapter || '';
        if (!CONST.VALID_CHAPTERS.has(chapter)) {
          return jsonResponse({ error: 'Invalid chapter. Must be one of: ' + CHAPTERS.join(',') }, 400);
        }
        var map = readJSON(chKey, {});
        if (body.completed) { map[chapter] = nowStamp(); }
        else { delete map[chapter]; }
        writeJSON(chKey, map);
        return jsonResponse({ status: 'ok', chapter: chapter, completed: !!body.completed });
      }
    }

    // Unrecognized /api/* path: this shim does not own it (e.g. /api/run is
    // handled by pyodide-runner.js). Return null so the shared fetch wrapper
    // tries the next registered route, then the real fetch. Returning a 404
    // Response here would short-circuit the chain and break those handlers.
    return null;
  }
```

Add `handleRoute` to BOTH `window.__apiShim` and `module.exports`.

> **Important (cross-router contract):** `handleRoute` MUST return `null` — not a
> 404 `Response` — for any `/api/*` path it doesn't recognize. The shared fetch
> wrapper returns the first *truthy* route result, and on `assignments.html` /
> `playground.html` the pyodide-runner registers `/api/run` as a second route.
> A truthy 404 here would short-circuit the chain and stop the code runner from
> ever executing. Later tasks/blocks that add more `/api/*` handlers to the
> dispatcher must keep this final `return null;` as the fallthrough.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/api-shim.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/api-shim.js tests/api-shim.test.js
git commit -m "feat: shim routes for register + progress"
```

---

## Task 6: Route handler — quiz (POST) with best-score + history

**Files:**
- Modify: `docs/api-shim.js`
- Test: `tests/api-shim.test.js`

Port `/api/quiz/<student>` (server.py:278-320): validate total against
`QUIZ_TOTALS`, append every attempt to history, keep only the best score.

- [ ] **Step 1: Write the failing test**

Append to `tests/api-shim.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/api-shim.test.js`
Expected: FAIL — quiz POST currently falls through (returns null).

- [ ] **Step 3: Write minimal implementation**

In `docs/api-shim.js`, inside `handleRoute`, add this block **before** the
final `return null;` fallthrough:

```js
    // /api/quiz/<student>
    if (seg[1] === 'quiz' && method === 'POST') {
      var qStudent = sanitizeName(seg[2]);
      if (!qStudent) return jsonResponse({ error: 'Invalid student name' }, 400);
      var qChapter = body.chapter || '';
      if (!CONST.VALID_CHAPTERS.has(qChapter)) {
        return jsonResponse({ error: 'Invalid chapter. Must be one of: ' + CHAPTERS.join(',') }, 400);
      }
      var score = parseInt(body.score, 10), total = parseInt(body.total, 10);
      if (isNaN(score) || isNaN(total)) {
        return jsonResponse({ error: 'Score and total must be integers' }, 400);
      }
      var expected = QUIZ_TOTALS[qChapter];
      if (expected !== undefined && total !== expected) {
        return jsonResponse({ error: 'Invalid total for ' + qChapter + '. Expected ' + expected }, 400);
      }
      if (score < 0 || score > total || total <= 0) {
        return jsonResponse({ error: 'Invalid score/total range' }, 400);
      }
      // record attempt history
      var histKey = keyFor(qStudent, 'quiz_history');
      var hist = readJSON(histKey, {});
      if (!hist[qChapter]) hist[qChapter] = [];
      hist[qChapter].push({ score: score, total: total, ts: nowStamp() });
      writeJSON(histKey, hist);
      // best-score logic
      var qKey = keyFor(qStudent, 'quizzes');
      var quizzesMap = readJSON(qKey, {});
      var existing = quizzesMap[qChapter];
      if (existing) {
        var pe = parseScore(existing);
        if (pe && pe[0] >= score) {
          return jsonResponse({ status: 'ok', chapter: qChapter, score: existing,
            note: 'Previous best score kept', attempt_saved: true });
        }
      }
      quizzesMap[qChapter] = score + '/' + total;
      writeJSON(qKey, quizzesMap);
      return jsonResponse({ status: 'ok', chapter: qChapter, score: score + '/' + total, attempt_saved: true });
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/api-shim.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/api-shim.js tests/api-shim.test.js
git commit -m "feat: shim route for quiz with best-score + history"
```

---

## Task 7: Route handlers — badges, flashcards, explanations, assignments

**Files:**
- Modify: `docs/api-shim.js`
- Test: `tests/api-shim.test.js`

Port the remaining storage routes. Shapes from server.py:365-502.

- [ ] **Step 1: Write the failing test**

Append to `tests/api-shim.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/api-shim.test.js`
Expected: FAIL — these routes fall through (return null).

- [ ] **Step 3: Write minimal implementation**

In `docs/api-shim.js`, inside `handleRoute`, add these blocks **before** the
final `return null;` fallthrough:

```js
    // /api/badges/<student> (GET)
    if (seg[1] === 'badges' && method === 'GET') {
      var bStudent = sanitizeName(seg[2]);
      if (!bStudent) return jsonResponse({ error: 'Invalid student name' }, 400);
      var bChapters = readJSON(keyFor(bStudent, 'chapters'), {});
      var bQuizzes = readJSON(keyFor(bStudent, 'quizzes'), {});
      var earnedNow = checkBadges(bChapters, bQuizzes);
      var prevKey = keyFor(bStudent, 'badges');
      var prev = readJSON(prevKey, []);
      var prevSet = new Set(prev);
      var newOnes = earnedNow.filter(function (b) { return !prevSet.has(b); });
      if (newOnes.length) { writeJSON(prevKey, prev.concat(newOnes)); }
      return jsonResponse({ earned: earnedNow, new: newOnes, all_badges: BADGE_DEFINITIONS });
    }

    // /api/flashcards/<student> (GET/POST)
    if (seg[1] === 'flashcards') {
      var fStudent = sanitizeName(seg[2]);
      if (!fStudent) return jsonResponse({ error: 'Invalid student name' }, 400);
      var fKey = keyFor(fStudent, 'flashcards');
      if (method === 'GET') {
        return jsonResponse({ student: fStudent, mastery: readJSON(fKey, {}) });
      }
      if (method === 'POST') {
        var cardId = body.card_id || '', result = body.result || '';
        if (!cardId || (result !== 'correct' && result !== 'wrong')) {
          return jsonResponse({ error: 'card_id and result (correct/wrong) required' }, 400);
        }
        if (!CONST.VALID_CARD_IDS.has(cardId)) {
          return jsonResponse({ error: 'Invalid card_id' }, 400);
        }
        var fMap = readJSON(fKey, {});
        var cur = parseInt(fMap[cardId], 10) || 0;
        cur = result === 'correct' ? Math.min(cur + 1, 5) : Math.max(cur - 1, 0);
        fMap[cardId] = cur;
        writeJSON(fKey, fMap);
        return jsonResponse({ status: 'ok', card_id: cardId, mastery: cur });
      }
    }

    // /api/explanations/<student> (GET/POST)
    if (seg[1] === 'explanations') {
      var eStudent = sanitizeName(seg[2]);
      if (!eStudent) return jsonResponse({ error: 'Invalid student name' }, 400);
      var eKey = keyFor(eStudent, 'explanations');
      if (method === 'GET') {
        return jsonResponse({ student: eStudent, explanations: readJSON(eKey, {}) });
      }
      if (method === 'POST') {
        var eChapter = body.chapter || '';
        var text = (body.text || '').trim();
        if (!CONST.VALID_CHAPTERS.has(eChapter)) {
          return jsonResponse({ error: 'Invalid chapter' }, 400);
        }
        if (!text) return jsonResponse({ error: 'Explanation text required' }, 400);
        if (text.length > 1000) text = text.slice(0, 1000);
        var eMap = readJSON(eKey, {});
        eMap[eChapter] = text;
        writeJSON(eKey, eMap);
        var etKey = keyFor(eStudent, 'explanation_times');
        var etMap = readJSON(etKey, {});
        etMap[eChapter] = nowStamp();
        writeJSON(etKey, etMap);
        return jsonResponse({ status: 'ok', chapter: eChapter });
      }
    }

    // /api/assignments/<student> (GET/POST)
    if (seg[1] === 'assignments') {
      var aStudent = sanitizeName(seg[2]);
      if (!aStudent) return jsonResponse({ error: 'Invalid student name' }, 400);
      var aKey = keyFor(aStudent, 'assignments');
      var atKey = keyFor(aStudent, 'assignment_times');
      if (method === 'GET') {
        return jsonResponse({ student: aStudent,
          submissions: readJSON(aKey, {}), times: readJSON(atKey, {}) });
      }
      if (method === 'POST') {
        var assignment = body.assignment || '';
        var code = body.code || '';
        if (!CONST.VALID_ASSIGNMENTS.has(assignment)) {
          return jsonResponse({ error: 'Invalid assignment' }, 400);
        }
        if (!code.trim()) return jsonResponse({ error: 'No code provided' }, 400);
        if (code.length > 10000) code = code.slice(0, 10000);
        var aMap = readJSON(aKey, {});
        aMap[assignment] = code;
        writeJSON(aKey, aMap);
        var atMap = readJSON(atKey, {});
        atMap[assignment] = nowStamp();
        writeJSON(atKey, atMap);
        return jsonResponse({ status: 'ok', assignment: assignment });
      }
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/api-shim.test.js`
Expected: PASS — all tests pass.

- [ ] **Step 5: Commit**

```bash
git add docs/api-shim.js tests/api-shim.test.js
git commit -m "feat: shim routes for badges, flashcards, explanations, assignments"
```

---

## Task 8: Register the shim handler on the shared fetch wrapper

**Files:**
- Modify: `docs/api-shim.js`
- Test: `tests/api-shim.test.js`

Wire `handleRoute` into the shared wrapper so a real `fetch('/api/...')` is
serviced in the browser. We verify the wrapper installs and routes.

- [ ] **Step 1: Write the failing test**

Append to `tests/api-shim.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/api-shim.test.js`
Expected: FAIL — `shim.installShim is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `docs/api-shim.js`, add inside the IIFE (after `handleRoute`):

```js
  function installShim() {
    var w = installFetchWrapper();
    // avoid double-registering our route on repeat calls
    if (!w.__apiShimRegistered) {
      w.__apiShimRegistered = true;
      w.__apiRoutes.push(function (url, opts) { return handleRoute(url, opts); });
    }
  }
```

Then, at the very end of the IIFE (just before the `module.exports` guard), add
the browser auto-install:

```js
  // Auto-install when loaded as a browser <script>
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    installShim();
  }
```

Add `installShim` to BOTH `window.__apiShim` and `module.exports`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/api-shim.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/api-shim.js tests/api-shim.test.js
git commit -m "feat: auto-install shim onto shared fetch wrapper"
```

---

## Task 9: Pyodide runner — pure helpers (output trimming, EOF detection)

**Files:**
- Create: `docs/pyodide-runner.js`
- Test: `tests/pyodide-runner.test.js`

Pyodide itself can't run under Node easily, so we unit-test the **pure** parts:
the response-shaping that mirrors server.py's `/api/run` (stdout/stderr caps,
`needs_input` on EOF). The actual WASM execution is verified later via the
`verify` skill in the browser (Task 13).

- [ ] **Step 1: Write the failing test**

Create `tests/pyodide-runner.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');

global.window = global.window || {};
global.window.fetch = async () => ({ __passthrough: true });
const R = require('../docs/pyodide-runner.js');

test('shapeResult caps stdout at 5000 and stderr at 2000', () => {
  const out = R.shapeResult('a'.repeat(6000), 'b'.repeat(3000), 1);
  assert.strictEqual(out.stdout.length, 5000);
  assert.strictEqual(out.stderr.length, 2000);
  assert.strictEqual(out.returncode, 1);
});

test('shapeResult flags needs_input when stderr has EOFError', () => {
  const out = R.shapeResult('Enter name: ', 'EOFError: EOF when reading a line', 1);
  assert.strictEqual(out.needs_input, true);
  assert.strictEqual(out.returncode, 0);
  assert.strictEqual(out.stderr, ''); // cleared when needs_input
});

test('shapeResult detects EOFError in STDOUT (the real driver path) and strips marker', () => {
  // The driver merges stdout+stderr into one stream, so the runner calls
  // shapeResult(output, '', rc) with the EOF marker living in stdout.
  const out = R.shapeResult('What is your name? EOFError: EOF when reading a line', '', 1);
  assert.strictEqual(out.needs_input, true);
  assert.strictEqual(out.returncode, 0);
  assert.strictEqual(out.stdout, 'What is your name? ');
});

test('shapeResult success path passes returncode 0', () => {
  const out = R.shapeResult('hello\n', '', 0);
  assert.strictEqual(out.returncode, 0);
  assert.ok(!out.needs_input);
});

test('makeDriver builds python that feeds stdin and echoes input', () => {
  const src = R.buildDriver('name = input()\nprint(name)', 'sam\n');
  assert.ok(src.includes('sam'));            // stdin embedded
  assert.ok(src.includes('name = input()')); // user code embedded
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/pyodide-runner.test.js`
Expected: FAIL — `Cannot find module '../docs/pyodide-runner.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `docs/pyodide-runner.js`:

```js
/* pyodide-runner.js — services /api/run via Pyodide (CPython in WebAssembly).
   Works as a browser <script> AND as a Node require() (pure helpers only). */
(function () {
  'use strict';

  var PYODIDE_BASE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
  var STDOUT_CAP = 5000, STDERR_CAP = 2000, TIME_LIMIT_MS = 5000;

  // Shape Pyodide output into the JSON the frontend expects (mirrors server.py).
  // The driver merges stdout+stderr into one stream, so an EOFError marker can
  // appear in EITHER argument — check both, and strip the marker from the
  // visible output when signalling needs_input.
  function shapeResult(stdout, stderr, returncode) {
    stdout = stdout || '';
    stderr = stderr || '';
    var EOF_MARK = 'EOFError';
    if (stdout.indexOf(EOF_MARK) !== -1 || stderr.indexOf(EOF_MARK) !== -1) {
      var cleaned = stdout
        .replace(/EOFError: EOF when reading a line\n?/g, '')
        .replace(/EOFError\n?/g, '');
      return { stdout: cleaned.slice(0, STDOUT_CAP), stderr: '', returncode: 0, needs_input: true };
    }
    return {
      stdout: stdout.slice(0, STDOUT_CAP),
      stderr: stderr.slice(0, STDERR_CAP),
      returncode: returncode,
    };
  }

  // Build the Python driver: pre-load stdin, echo input() like server.py wrapper.
  function buildDriver(userCode, stdinData) {
    // JSON.stringify makes a safe Python string literal (valid Python too).
    var stdinLit = JSON.stringify(stdinData || '');
    var codeLit = JSON.stringify(userCode || '');
    return [
      'import sys, io, builtins',
      '_stdin = io.StringIO(' + stdinLit + ')',
      '_out = io.StringIO()',
      'sys.stdout = _out',
      'sys.stderr = _out',
      '_orig_input = None',
      'def _echo(prompt=""):',
      '    if prompt:',
      '        _out.write(str(prompt))',
      '    line = _stdin.readline()',
      '    if line == "":',
      '        raise EOFError("EOF when reading a line")',
      '    line = line.rstrip("\\n")',
      '    _out.write(line + "\\n")',
      '    return line',
      'builtins.input = _echo',
      '_USER_CODE = ' + codeLit,
      '_rc = 0',
      'try:',
      '    exec(compile(_USER_CODE, "<playground>", "exec"), {"__name__": "__main__"})',
      'except SystemExit:',
      '    pass',
      'except EOFError:',
      '    _out.write("EOFError: EOF when reading a line")',
      '    _rc = 1',
      'except Exception:',
      '    import traceback',
      '    traceback.print_exc()',
      '    _rc = 1',
      '_RESULT = (_out.getvalue(), _rc)',
    ].join('\n');
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { shapeResult, buildDriver, PYODIDE_BASE, TIME_LIMIT_MS };
  }
})();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/pyodide-runner.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/pyodide-runner.js tests/pyodide-runner.test.js
git commit -m "feat: pyodide-runner pure helpers (shapeResult, buildDriver)"
```

---

## Task 10: Pyodide runner — browser load + /api/run handler

**Files:**
- Modify: `docs/pyodide-runner.js`

This is browser-only glue (Pyodide load + execution + watchdog) — not unit
testable in Node, so there's no failing-test step. It is exercised end-to-end in
Task 13 via the `verify` skill. Keep the logic minimal and obvious.

**On the "Loading Python…" message (spec error-handling item 2):** the copied
frontend already shows its own busy state on Run ("⏳ Running..." in
`features.js`; "Running..." in `playground.html`). We deliberately do **not**
modify the frontend to show a distinct "Loading Python…" string — the first-run
multi-second load simply displays under the existing "Running" status, which is
acceptable and keeps `app.js`/`features.js`/page scripts unchanged. The hard
requirement is the **failure** message (offline/CDN down), which `runRoute`'s
`.catch` provides. Do not chase a separate loading label.

- [ ] **Step 1: Add the loader + handler**

In `docs/pyodide-runner.js`, inside the IIFE (after `buildDriver`, before the
`module.exports` guard), add:

```js
  // ---- browser-only: load Pyodide lazily and run code ----
  var _pyodide = null, _loading = null;

  function loadPyodideOnce() {
    if (_pyodide) return Promise.resolve(_pyodide);
    if (_loading) return _loading;
    _loading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = PYODIDE_BASE + 'pyodide.js';
      s.onload = function () {
        // global loadPyodide comes from the CDN script
        loadPyodide({ indexURL: PYODIDE_BASE }).then(function (py) {
          _pyodide = py;
          resolve(py);
        }).catch(reject);
      };
      s.onerror = function () { reject(new Error('Failed to load Pyodide script')); };
      document.head.appendChild(s);
    });
    return _loading;
  }

  function runViaPyodide(code, stdinData) {
    return loadPyodideOnce().then(function (py) {
      var driver = buildDriver(code, stdinData);
      // Watchdog: interrupt buffer (SharedArrayBuffer if available)
      var interruptBuffer = null;
      try {
        if (typeof SharedArrayBuffer !== 'undefined' && py.setInterruptBuffer) {
          interruptBuffer = new Uint8Array(new SharedArrayBuffer(1));
          py.setInterruptBuffer(interruptBuffer);
        }
      } catch (e) { interruptBuffer = null; }

      var timer = null;
      if (interruptBuffer) {
        timer = setTimeout(function () { interruptBuffer[0] = 2; /* SIGINT */ }, TIME_LIMIT_MS);
      }

      try {
        py.runPython(driver);
        var result = py.globals.get('_RESULT');
        var stdout = result.get(0);
        var rc = result.get(1);
        result.destroy();
        return shapeResult(stdout, '', rc);
      } catch (err) {
        var msg = String(err && err.message ? err.message : err);
        if (msg.indexOf('KeyboardInterrupt') !== -1) {
          return { stdout: '', stderr: 'Error: Code took too long (5s limit)', returncode: 1 };
        }
        return shapeResult('', msg, 1);
      } finally {
        if (timer) clearTimeout(timer);
        if (interruptBuffer) interruptBuffer[0] = 0;
      }
    });
  }

  // /api/run route registered on the shared fetch wrapper
  function runRoute(url, opts) {
    var path = String(url).split('?')[0];
    if (path.indexOf('/api/run') !== 0) return null;
    if (!opts || (opts.method || 'GET').toUpperCase() !== 'POST') return null;
    var body = {};
    try { body = JSON.parse(opts.body || '{}'); } catch (e) { body = {}; }
    var code = body.code || '';
    var stdin = body.stdin || '';

    var p = runViaPyodide(code, stdin)
      .catch(function () {
        return { stdout: '', stderr: 'Python engine failed to load — check your connection.', returncode: 1 };
      })
      .then(function (obj) {
        return new Response(JSON.stringify(obj), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      });
    return p; // a Promise<Response> — await fetch(...) resolves it
  }

  function installRunner() {
    var w = (typeof window !== 'undefined') ? window : global;
    // reuse the shared wrapper installer from api-shim if present; else install here
    w.__apiRoutes = w.__apiRoutes || [];
    if (!w.__fetchPatched) {
      w.__fetchPatched = true;
      var realFetch = w.fetch.bind(w);
      w.fetch = function (u, o) {
        for (var i = 0; i < w.__apiRoutes.length; i++) {
          var r = w.__apiRoutes[i](u, o);
          if (r) return r;
        }
        return realFetch(u, o);
      };
    }
    if (!w.__runnerRegistered) {
      w.__runnerRegistered = true;
      w.__apiRoutes.push(runRoute);
    }
  }

  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    installRunner();
  }
```

Also extend the existing `module.exports` line to include the new testable-ish
names (harmless in Node):

```js
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { shapeResult, buildDriver, PYODIDE_BASE, TIME_LIMIT_MS, runRoute };
  }
```

- [ ] **Step 2: Re-run the pure helper tests (must still pass)**

Run: `node tests/pyodide-runner.test.js`
Expected: PASS — adding browser glue must not break the pure helpers. (`runRoute`
in Node returns a Promise for `/api/run`, but the existing tests don't call it.)

- [ ] **Step 3: Commit**

```bash
git add docs/pyodide-runner.js
git commit -m "feat: pyodide browser loader, watchdog, and /api/run handler"
```

---

## Task 11: Build script — copy, inject shims, rewrite links

**Files:**
- Create: `build-static.sh`
- Test: `tests/build-static.test.sh`

The build script assembles `/docs`. It must be **idempotent** (safe to re-run)
and must NOT overwrite `docs/api-shim.js`, `docs/pyodide-runner.js`, or the
`docs/superpowers/` folder.

Per-page injection (from the spec):

| Page | api-shim.js | pyodide-runner.js + CDN |
|---|:---:|:---:|
| index.html | ✓ | ✓ (features.js inline Run buttons) |
| flashcards.html | ✓ | — |
| playground.html | — | ✓ |
| assignments.html | ✓ | ✓ |
| cheatsheet.html | — | — |

Link rewrites (all copied HTML + app.js): `href="/"`→`href="index.html"`,
`/assignments`→`assignments.html`, `/playground`→`playground.html`,
`/flashcards`→`flashcards.html`, `/cheatsheet`→`cheatsheet.html`, and in app.js
`'/assignments#'`→`'assignments.html#'`.

- [ ] **Step 1: Write the failing test**

Create `tests/build-static.test.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

bash build-static.sh

fail() { echo "FAIL: $1"; exit 1; }

# Files copied
for f in index.html assignments.html flashcards.html cheatsheet.html \
         playground.html style.css features.css app.js features.js \
         api-shim.js pyodide-runner.js .nojekyll; do
  [ -f "docs/$f" ] || fail "missing docs/$f"
done

# dashboard NOT copied, server.py NOT copied
[ ! -f docs/dashboard.html ] || fail "dashboard.html should not be copied"
[ ! -f docs/server.py ] || fail "server.py should not be copied"

# Shim injection per page
grep -q 'api-shim.js' docs/index.html || fail "index.html missing api-shim"
grep -q 'pyodide-runner.js' docs/index.html && fail "index.html should NOT have pyodide" || true
grep -q 'pyodide-runner.js' docs/playground.html || fail "playground missing pyodide-runner"
grep -q 'cdn.jsdelivr.net/pyodide' docs/playground.html || fail "playground missing pyodide CDN"
grep -q 'api-shim.js' docs/playground.html && fail "playground should NOT have api-shim" || true
grep -q 'api-shim.js' docs/assignments.html || fail "assignments missing api-shim"
grep -q 'pyodide-runner.js' docs/assignments.html || fail "assignments missing pyodide-runner"
grep -q 'api-shim.js' docs/cheatsheet.html && fail "cheatsheet should have no shims" || true

# Link rewrites — no absolute server routes remain in copied HTML
for f in index.html assignments.html flashcards.html cheatsheet.html playground.html; do
  grep -Eq 'href="/(assignments|playground|flashcards|cheatsheet)"' "docs/$f" \
    && fail "absolute route link left in docs/$f" || true
  grep -Eq "href='/(assignments|playground|flashcards|cheatsheet)'" "docs/$f" \
    && fail "absolute route link (single-quote) left in docs/$f" || true
done
# app.js runtime link rewritten
grep -q "assignments.html#" docs/app.js || fail "app.js link not rewritten"
grep -q "'/assignments#'" docs/app.js && fail "app.js still has /assignments#" || true

# Shim files preserved (not clobbered): they export module
grep -q "module.exports" docs/api-shim.js || fail "api-shim.js was clobbered"

echo "PASS: build-static.test.sh"
```

Make it executable:

```bash
chmod +x tests/build-static.test.sh
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash tests/build-static.test.sh`
Expected: FAIL — `build-static.sh: No such file or directory` (or copy failures).

- [ ] **Step 3: Write minimal implementation**

Create `build-static.sh`:

```bash
#!/usr/bin/env bash
# Build the static GitHub Pages version into ./docs
# Idempotent: safe to re-run. Does NOT touch docs/api-shim.js,
# docs/pyodide-runner.js, docs/.nojekyll, or docs/superpowers/.
set -euo pipefail
cd "$(dirname "$0")"

DOCS=docs
mkdir -p "$DOCS"

# 1. Copy static assets (NOT dashboard.html, NOT server.py)
COPY_FILES=(index.html assignments.html flashcards.html cheatsheet.html \
            playground.html style.css features.css app.js features.js)
for f in "${COPY_FILES[@]}"; do
  cp "$f" "$DOCS/$f"
done

# 2. Ensure .nojekyll exists
touch "$DOCS/.nojekyll"

# 3. Rewrite absolute server-route links -> relative file paths
#    (applies to all copied HTML files)
HTML_FILES=(index.html assignments.html flashcards.html cheatsheet.html playground.html)
for f in "${HTML_FILES[@]}"; do
  p="$DOCS/$f"
  # double-quoted hrefs
  sed -i.bak \
    -e 's|href="/"|href="index.html"|g' \
    -e 's|href="/assignments"|href="assignments.html"|g' \
    -e 's|href="/playground"|href="playground.html"|g' \
    -e 's|href="/flashcards"|href="flashcards.html"|g' \
    -e 's|href="/cheatsheet"|href="cheatsheet.html"|g' \
    "$p"
  # single-quoted hrefs (index.html uses these in the sidebar)
  sed -i.bak \
    -e "s|href='/assignments'|href='assignments.html'|g" \
    -e "s|href='/playground'|href='playground.html'|g" \
    -e "s|href='/flashcards'|href='flashcards.html'|g" \
    -e "s|href='/cheatsheet'|href='cheatsheet.html'|g" \
    "$p"
  rm -f "$p.bak"
done

# 4. Rewrite app.js runtime-generated assignment link
sed -i.bak "s|'/assignments#'|'assignments.html#'|g" "$DOCS/app.js"
rm -f "$DOCS/app.js.bak"

# 5. Inject shim <script> tags before </head>, per page.
#    Helper: insert a line before the first </head>.
inject_before_head() {
  local file="$1"; local snippet="$2"
  # Use awk to insert before the first </head> only.
  awk -v ins="$snippet" '
    !done && /<\/head>/ { print ins; done=1 }
    { print }
  ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
}

PYODIDE_CDN='  <script src="https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js"></script>'

# index.html: api-shim + pyodide-runner (+ CDN). features.js adds inline
# "Live Demo" Run buttons that POST /api/run, so the runner is needed here too.
inject_before_head "$DOCS/index.html" "$PYODIDE_CDN"
inject_before_head "$DOCS/index.html" '  <script src="pyodide-runner.js"></script>'
inject_before_head "$DOCS/index.html" '  <script src="api-shim.js"></script>'

# flashcards.html: api-shim only
inject_before_head "$DOCS/flashcards.html" '  <script src="api-shim.js"></script>'

# playground.html: pyodide-runner (+ CDN). CDN first so loadPyodide global exists.
inject_before_head "$DOCS/playground.html" "$PYODIDE_CDN"
inject_before_head "$DOCS/playground.html" '  <script src="pyodide-runner.js"></script>'

# assignments.html: api-shim + pyodide-runner (+ CDN)
inject_before_head "$DOCS/assignments.html" "$PYODIDE_CDN"
inject_before_head "$DOCS/assignments.html" '  <script src="pyodide-runner.js"></script>'
inject_before_head "$DOCS/assignments.html" '  <script src="api-shim.js"></script>'

# cheatsheet.html: no shims (pure static)

echo "Build complete -> $DOCS/"
echo "Next: commit docs/, then enable GitHub Pages (Settings -> Pages ->"
echo "      Deploy from branch -> main -> /docs)."
```

Make it executable:

```bash
chmod +x build-static.sh
```

**Note on `pyodide-runner.js` loading order:** the runner calls `loadPyodide`
only on first Run (lazy), and the CDN `pyodide.js` tag is injected too. Because
the runner does not call `loadPyodide` at parse time, the CDN script being later
in `<head>` is fine — by the time a user clicks Run, both are parsed.

- [ ] **Step 4: Run test to verify it passes**

Run: `bash tests/build-static.test.sh`
Expected: PASS — `PASS: build-static.test.sh`.

- [ ] **Step 5: Commit**

```bash
git add build-static.sh tests/build-static.test.sh docs/
git commit -m "feat: build-static.sh generates /docs with shims + link rewrites"
```

---

## Task 12: README section + run all tests

**Files:**
- Modify: `README.md`
- Create: `tests/run-all.sh`

- [ ] **Step 1: Add a test runner**

Create `tests/run-all.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "== api-shim ==";        node tests/api-shim.test.js
echo "== pyodide-runner ==";  node tests/pyodide-runner.test.js
echo "== build-static ==";    bash tests/build-static.test.sh
echo "ALL TESTS PASSED"
```

Make it executable:

```bash
chmod +x tests/run-all.sh
```

- [ ] **Step 2: Run the full suite**

Run: `bash tests/run-all.sh`
Expected: PASS — ends with `ALL TESTS PASSED`.

- [ ] **Step 3: Add README section**

Append to `README.md` (end of file, before `## License` if present; otherwise at
the end):

```markdown
## Static GitHub Pages Build

A backend-free version of this site (no Flask, no Redis) can be deployed to
GitHub Pages. It stores progress in the browser (localStorage) and runs Python
in-browser via Pyodide (WebAssembly).

### Build

```bash
./build-static.sh        # generates ./docs
bash tests/run-all.sh    # run the unit + build tests
```

### Deploy

1. Commit the generated `docs/` folder.
2. GitHub repo → Settings → Pages → Source: **Deploy from a branch** →
   `main` / `/docs`.
3. Site goes live at `https://<user>.github.io/<repo>/`.

### Differences from the Flask version

- Progress, quizzes, flashcards, badges, and explanations are **per-browser**
  (localStorage) — no central store, no cross-device sync.
- The **teacher dashboard is not included** (it needs a central server).
- The **Run** button uses Pyodide; first run downloads ~6–10 MB (cached after).

The Flask + Redis app (`server.py`, `start.sh`, Railway config) is unchanged and
still works for full multi-student tracking.
```

- [ ] **Step 4: Commit**

```bash
git add README.md tests/run-all.sh
git commit -m "docs: README section for static build + test runner"
```

---

## Task 13: End-to-end browser verification (verify skill)

**Files:** none (verification only)

This task uses the **`verify` skill** to drive the real pages in a browser and
observe behaviour — the only way to validate localStorage persistence + Pyodide,
which Node unit tests can't cover. **The implementer MUST invoke the `verify`
skill** rather than asserting success.

- [ ] **Step 1: Serve the build locally**

Run (background):

```bash
cd docs && python3 -m http.server 8123
```

Open `http://localhost:8123/index.html`.

- [ ] **Step 2: Verify storage-backed features (via verify skill)**

Check each, confirming with DevTools that `/api/*` requests are intercepted
(Network tab shows them resolving instantly, not as real network calls):

- Log in as a student → reload → still logged in, progress intact.
- Mark Ch1 + Ch2 + Ch3 complete → "Array Master" badge toast appears → reload →
  badges persist.
- Take a quiz, get a score → reload → best score shown; retake lower → best kept.
- `flashcards.html`: mark a card correct/wrong → reload → mastery persists.
- Explain-it-back: type + save → reload → text restored.
- Confirm there is **no** dashboard link anywhere.

- [ ] **Step 3: Verify Pyodide playground (via verify skill)**

On `playground.html`:

- Run the **Hello World** template → correct output.
- Run the **Input Demo** template → prompt appears, type a name, Enter →
  continues and prints greeting (the `needs_input` round-trip).
- Run the **Random** template → 5 dice rolls printed.
- Run the **File I/O** template → writes/reads from Pyodide virtual FS, prints
  lines (no error).
- Run an infinite loop `while True: pass` → after ~5s shows "Code took too long
  (5s limit)" (or, if interrupt unsupported in this browser, document the
  observed behaviour — see Step 5).

- [ ] **Step 4: Verify assignments (via verify skill)**

On `assignments.html`:

- Open a chapter tab → starter code shows in the editor.
- Edit the code, click **Run** → output in terminal.
- Click **Save** → reload page → saved code restored (localStorage).
- Click **Reset** → starter code returns.

- [ ] **Step 5: Resolve the watchdog risk**

If Step 3's infinite-loop test did NOT interrupt (some browsers block
`SharedArrayBuffer` without cross-origin isolation headers, which GitHub Pages
does not send):

- Document the limitation in `pyodide-runner.js` with a comment, AND
- Add a user-facing note: when `SharedArrayBuffer` is unavailable, the timeout
  can't pre-empt a busy loop; the tab must be reloaded. Keep the 5s `setTimeout`
  message for the common (non-busy-loop / input-waiting) cases.

The fuller fix (running Pyodide in a Web Worker) is **out of scope for this
plan** — note it as a follow-up if the limitation matters in practice.

- [ ] **Step 6: Stop the server and commit any fixes**

Stop the `http.server`. If Steps 2–5 required code changes, commit them:

```bash
git add -A
git commit -m "fix: address issues found in browser verification"
```

- [ ] **Step 7: Finalize**

Invoke the **`superpowers:finishing-a-development-branch`** skill to decide how
to integrate (this work was done on `main` per repo convention; confirm with the
user whether to push).

---

## Verification checklist (whole plan)

- [ ] `bash tests/run-all.sh` passes.
- [ ] `/docs` contains all copied assets + `api-shim.js`, `pyodide-runner.js`,
  `.nojekyll`; no `dashboard.html`, no `server.py`.
- [ ] No absolute `/assignments` etc. links remain in `/docs` HTML; `app.js`
  uses `assignments.html#`.
- [ ] Browser verification (Task 13) passed for storage, playground, assignments.
- [ ] Flask app still runs unchanged (`./start.sh` unaffected — none of its files
  were modified).
- [ ] README documents build + deploy.
