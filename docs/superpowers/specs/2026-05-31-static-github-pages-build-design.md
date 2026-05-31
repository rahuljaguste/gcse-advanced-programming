# Static GitHub Pages Build — Design

**Date:** 2026-05-31
**Status:** Approved (pending written-spec review)

## Goal

Produce a static, GitHub-Pages-deployable version of the GCSE Advanced
Programming site. The current app is Flask + Redis (`server.py`); GitHub Pages
serves static files only, so every backend-dependent feature must be
reimplemented client-side. The existing Flask/Railway app stays untouched and
fully runnable — the two versions coexist in one repo.

## Decisions (locked)

| Question | Decision |
|---|---|
| Where does student data live? | Browser **localStorage** (per-device, no sync, no central view) |
| How does the Run button work? | **Pyodide** — real CPython compiled to WebAssembly, runs in-browser |
| Coexistence with Flask app | **Separate static build in `/docs`**; `server.py` etc. stay in repo root, still work |
| Teacher dashboard | **Removed entirely** (no central data to show; avoids a broken page) |
| How is the static version produced? | **Build script** generates `/docs` and injects shared shims; one source of truth |

## Architecture — core mechanism

The static build loads **one shim script first** that wraps `window.fetch`.
When it sees an `/api/...` URL it answers locally; anything else (CDNs, fonts)
passes through untouched. This means **`app.js`, `features.js`, and all inline
page scripts stay byte-for-byte identical** — they keep calling the same
endpoints; the shim services them client-side.

```
Browser
  └── api-shim.js   (loaded first, wraps window.fetch)
        ├── /api/register, /api/progress, /api/quiz,
        │   /api/badges, /api/flashcards, /api/explanations,
        │   /api/assignments   ──►  localStorage  (returns Flask-shaped JSON)
        └── /api/run           ──►  pyodide-runner.js  (real Python in WASM)
```

The shim reproduces the same JSON response shapes the Flask routes returned
(e.g. `{student, chapters, quizzes}`) and the same client-side validation (name
pattern, valid chapters, score totals, badge logic) so behaviour matches.

**Output location:** `/docs`. GitHub Pages serves from `main` → `/docs` with no
branch juggling. `server.py`, `Procfile`, `railway.toml`, `requirements.txt`,
`runtime.txt`, `start.sh` stay in the repo root, fully working.

## Components

Three new files plus a build script. Everything else is copied verbatim.

| File | Purpose |
|---|---|
| `build-static.sh` (repo root) | Copies `index.html`, `assignments.html`, `flashcards.html`, `cheatsheet.html`, `playground.html`, `style.css`, `features.css`, `app.js`, `features.js` into `/docs`. Injects shim tags per the table below. **Skips** `dashboard.html` and `server.py`. Performs the targeted server-only rewrites (see below). Re-run after editing originals. |
| `docs/api-shim.js` (new, ~250 lines) | Wraps `window.fetch`. Routes `/api/*` to localStorage handlers that mirror each Flask endpoint's response shape + validation. Ports the badge logic and quiz-totals from `server.py` into JS. |
| `docs/pyodide-runner.js` (new, ~120 lines) | Loads Pyodide from CDN lazily (first Run). Handles `/api/run`: runs code, captures stdout/stderr, supports `input()` via the existing stdin-replay protocol, enforces a 5s timeout. Returns the same `{stdout, stderr, returncode, needs_input}` JSON the frontend already expects. |
| `docs/.nojekyll` (new, empty) | Stops GitHub Pages running Jekyll, which would mangle files. |

### Per-page tag injection

The build injects only the tags a page actually needs (verified from each
page's current `fetch`/feature usage):

| Page | `api-shim.js` | `pyodide-runner.js` + Pyodide CDN | Why |
|---|:---:|:---:|---|
| `index.html` | ✓ | ✓ | progress/quiz/badges/explanations **and** `features.js`'s inline "Live Demo" Run buttons (POST `/api/run`) |
| `flashcards.html` | ✓ | — | flashcard mastery only |
| `playground.html` | — | ✓ | Run only; no `/api/*` storage calls |
| `assignments.html` | ✓ | ✓ | assignments save/load **and** Run |
| `cheatsheet.html` | — | — | pure static, zero API calls |

**Shared fetch wrapper (avoids the double-wrap problem).** On `assignments.html`
both scripts need to service `/api/*`. Rather than each wrapping `window.fetch`
independently (order-dependent, fragile), both register into a single shared
registry installed by whichever loads first:

```js
// installed once, idempotent — both files start with this guard
window.__apiRoutes = window.__apiRoutes || [];
if (!window.__fetchPatched) {
  window.__fetchPatched = true;
  const realFetch = window.fetch.bind(window);
  window.fetch = (url, opts) => {
    for (const route of window.__apiRoutes) {
      const res = route(url, opts);      // returns a Response, or null to skip
      if (res) return res;
    }
    return realFetch(url, opts);          // pass through (CDNs, fonts)
  };
}
```

`api-shim.js` pushes the localStorage handler; `pyodide-runner.js` pushes the
`/api/run` handler. Load order no longer matters. On `playground.html`,
`pyodide-runner.js` loads standalone and installs the wrapper itself.

### localStorage data model

Mirrors the Redis keys, namespaced under one prefix per student. The `students`
set is dropped (no cross-student view needed).

| Was (Redis) | Now (localStorage key) |
|---|---|
| `student:{name}` hash | `gcse:{name}:chapters` → JSON `{ch1: timestamp, …}` |
| `quiz:{name}` hash | `gcse:{name}:quizzes` → JSON `{ch1: "3/4", …}` |
| `quiz_history:{name}:{ch}` | `gcse:{name}:quiz_history` → JSON `{ch1: [...]}` |
| `badges:{name}` set | `gcse:{name}:badges` → JSON array |
| `flashcards:{name}` hash | `gcse:{name}:flashcards` → JSON `{ch1_1: 3, …}` |
| `explanations:{name}` hash | `gcse:{name}:explanations` → JSON `{ch1: "...", …}` |
| `assignments:{name}` hash | `gcse:{name}:assignments` → JSON `{ch1: "code", …}` |
| `students` set | (dropped) |

## Server-only bits the build rewrites

1. **Dashboard** — `dashboard.html` is simply not copied. (Verified: no page we
   copy contains any link or reference to the dashboard, so there is no link to
   strip — the original `index.html` sidebar links only to assignments,
   flashcards, cheatsheet, and playground.)
2. **Internal route links → relative file paths.** The pages link with clean
   server routes (`href="/"`, `/assignments`, `/playground`, `/flashcards`,
   `/cheatsheet`), and `app.js` generates `'/assignments#' + chapter.id` at
   runtime. On GitHub Pages served from a project subpath
   (`username.github.io/<repo>/`), absolute `/...` paths resolve to the **domain
   root**, not the repo — so every nav link would break. The build rewrites
   these to relative file paths that work at any subpath:
   `/` → `index.html`, `/assignments` → `assignments.html`,
   `/playground` → `playground.html`, `/flashcards` → `flashcards.html`,
   `/cheatsheet` → `cheatsheet.html`. The `app.js` runtime link becomes
   `'assignments.html#' + chapter.id`.
3. **Pyodide preload tag** — the build injects the Pyodide CDN `<script>` into
   `playground.html` and `assignments.html` (the two pages with Run). Loaded but
   only initialized on first Run, so pages stay fast.
3. **`/api/run` semantics** — the Flask runner enforced an import allowlist and
   blocked dangerous `os` calls. Pyodide runs in a sandboxed WASM environment
   with no real filesystem, network, or OS access by design, so the security
   wrapper is largely moot. We keep `input()` support and the 5s timeout; file
   I/O works against Pyodide's in-memory virtual FS (Ch5 diary / Ch10 highscores
   assignments still run). Input-echo behaviour is ported so prompts look
   identical.
4. **Everything else passes through unchanged** — CDN links (Prism, CodeMirror,
   Google Fonts) already work on any host.

**Behaviour change worth noting:** the server kept best quiz score + full
attempt history server-side; the localStorage version does the same but
per-browser — clearing browser data or switching devices resets progress.
Inherent to static hosting and consistent with the localStorage decision.

## Error handling & edge cases

1. **Pyodide load failure** (offline / CDN down) — first Run shows a clear
   terminal message ("Python engine failed to load — check your connection")
   instead of hanging; status dot goes red, matching existing "connection
   failed" UX.
2. **Pyodide still loading** — first Run shows "⏳ Loading Python…" then proceeds
   automatically. Subsequent runs are instant (Pyodide stays loaded).
3. **`input()` protocol** — the frontend re-runs code from scratch each time it
   needs input, replaying accumulated stdin (seen in `playground.html` and
   `features.js`). The runner reproduces this: run with the stdin buffer, detect
   EOF when input is exhausted, return `needs_input: true` with stdout-so-far.
   No frontend change.
4. **Infinite loops** — Pyodide runs on the main thread, so `while True:` with no
   input would freeze the tab. Mitigation: a watchdog interrupts after 5s via
   Pyodide's interrupt buffer, surfacing "Code took too long (5s limit)" — the
   server's message. **To validate during implementation:** if the interrupt
   buffer is fragile, the fallback is running Pyodide in a Web Worker (keeps the
   tab responsive). This is the one area flagged for validation.
5. **localStorage quota / disabled** — wrapped in try/catch. If storage is
   unavailable (private mode), the shim degrades to in-memory (works for the
   session, warns it won't persist).
6. **Corrupt localStorage JSON** — every read is `try/parse/catch → default`, so
   a bad value never breaks the page.

## Testing & verification

No server, so testing is browser-based. Serve `/docs` with
`python3 -m http.server` from that folder and click through every page:

- Login → progress persists across reload
- Mark chapters complete → badges unlock → survive reload
- Take a quiz → score saves, best-score logic holds
- Flashcards → mastery up/down persists
- Explain-it-back → text saves and reloads
- Playground → Run a template (incl. one with `input()`, one with `random`, one
  with file I/O) → correct output
- Assignments → edit starter code, Run, Save → reload restores saved code
- Cheatsheet → renders
- No dashboard link; `/api/...` never hits the network (DevTools Network tab
  shows them intercepted)

Pyodide-specific: first-run load message; offline failure message; 5s timeout on
an infinite loop; `input()` round-trips.

Verification will be done by driving the real pages in a browser (via the
`verify` skill) and observing behaviour before the work is called done — not by
asserting it works.

## Deployment (one-time GitHub setup)

Documented in the build script output + README:

1. Run `./build-static.sh` → commit `/docs`.
2. GitHub repo → Settings → Pages → Source: "Deploy from a branch" → `main` /
   `/docs`.
3. Site goes live at `https://rahuljaguste.github.io/<repo-name>/`.

## Scope boundaries (YAGNI)

- No export/import (plain localStorage chosen).
- No local progress-report page (dashboard removed entirely).
- No service worker / PWA.
- No build tooling beyond a shell script.
