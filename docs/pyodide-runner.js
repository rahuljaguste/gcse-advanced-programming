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

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { shapeResult, buildDriver, PYODIDE_BASE, TIME_LIMIT_MS };
  }
})();
