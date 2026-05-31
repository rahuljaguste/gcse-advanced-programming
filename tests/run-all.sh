#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "== api-shim ==";        node tests/api-shim.test.js
echo "== pyodide-runner ==";  node tests/pyodide-runner.test.js
echo "== build-static ==";    bash tests/build-static.test.sh
echo "ALL TESTS PASSED"
