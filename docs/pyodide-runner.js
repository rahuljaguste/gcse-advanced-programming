/* pyodide-runner.js — services /api/run via Pyodide (CPython in WebAssembly).
   Works as a browser <script> AND as a Node require() (pure helpers only). */
(function () {
  'use strict';

  var PYODIDE_BASE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
  var STDOUT_CAP = 5000, STDERR_CAP = 2000, TIME_LIMIT_MS = 5000;

  // Shape Pyodide output into the JSON the frontend expects (mirrors server.py).
  // The driver merges stdout+stderr into one stream, so an EOFError marker can
  // appear in EITHER argument — check both. When the program ran out of stdin
  // (it called input() with nothing left), the frontend protocol expects
  // needs_input:true plus stdout-so-far (which already includes the prompt),
  // and the EOF marker stripped from the visible output.
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
      // Watchdog. Pyodide runs on the main thread, so the only way to pre-empt a
      // runaway loop is the interrupt buffer — which requires SharedArrayBuffer.
      // SharedArrayBuffer is only available in a cross-origin-isolated context
      // (COOP+COEP response headers). GitHub Pages does NOT send those headers,
      // so on a stock Pages deploy this watchdog CANNOT interrupt a tight loop
      // like `while True: pass` — that program will hang the tab until reload.
      // (Verified empirically: crossOriginIsolated=false on `python3 -m http.server`
      // and on github.io.) When SharedArrayBuffer IS available (e.g. a host that
      // sends COOP/COEP, or a future Web-Worker port), the 5s SIGINT below fires
      // and surfaces "Code took too long". Programs that finish, error, or block
      // on input() are unaffected — only an infinite compute loop is at risk.
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
    // reuse the shared wrapper from api-shim if present; else install here
    w.__apiRoutes = w.__apiRoutes || [];
    if (!w.__fetchPatched && typeof w.fetch === 'function') {
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

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { shapeResult, buildDriver, PYODIDE_BASE, TIME_LIMIT_MS, runRoute };
  }
})();
