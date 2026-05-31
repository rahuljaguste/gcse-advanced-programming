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

# index.html: api-shim only
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
