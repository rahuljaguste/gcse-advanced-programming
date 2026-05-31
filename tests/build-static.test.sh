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
# index.html has features.js inline "Live Demo" Run buttons -> needs the runner
grep -q 'pyodide-runner.js' docs/index.html || fail "index.html missing pyodide-runner"
grep -q 'cdn.jsdelivr.net/pyodide' docs/index.html || fail "index.html missing pyodide CDN"
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

# JS location.href navigations to absolute routes rewritten (would break on a
# Pages project subpath). Covers index.html onclick nav + flashcards redirect.
for f in index.html assignments.html flashcards.html cheatsheet.html playground.html; do
  grep -Eq "location\.href[[:space:]]*=[[:space:]]*'/(assignments|playground|flashcards|cheatsheet)?'" "docs/$f" \
    && fail "absolute location.href left in docs/$f" || true
done
# flashcards not-logged-in redirect now points at index.html
grep -q "location.href = 'index.html'" docs/flashcards.html \
  || fail "flashcards.html redirect not rewritten to index.html"

# Shim files preserved (not clobbered): they export module
grep -q "module.exports" docs/api-shim.js || fail "api-shim.js was clobbered"

echo "PASS: build-static.test.sh"
