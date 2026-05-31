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
      // getItem returns string|null per spec; the undefined check is a
      // defensive guard for non-conforming polyfills.
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

  // ---- validation constants (ported from server.py) ----
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

  // ---- pure logic (ported from server.py) ----
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
      var cond = badge.condition, met = false, p;
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

  // ---- route dispatch helpers ----
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

    return jsonResponse({ error: 'Not found' }, 404);
  }

  // ---- shared fetch wrapper (idempotent; both shims reuse it) ----
  function installFetchWrapper() {
    const w = (typeof window !== 'undefined') ? window : global;
    w.__apiRoutes = w.__apiRoutes || [];
    if (!w.__fetchPatched && typeof w.fetch === 'function') {
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
    window.__apiShim = { keyFor, readJSON, writeJSON, jsonResponse, CONST,
      sanitizeName, parseScore, checkBadges, handleRoute, installFetchWrapper };
  }

  // expose for Node tests
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { keyFor, readJSON, writeJSON, jsonResponse, CONST,
      sanitizeName, parseScore, checkBadges, handleRoute, installFetchWrapper };
  }
})();
