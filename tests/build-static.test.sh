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
