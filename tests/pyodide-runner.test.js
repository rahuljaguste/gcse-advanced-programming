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

test('shapeResult flags needs_input from the explicit flag (not by sniffing output)', () => {
  // The driver reports EOF out-of-band; shapeResult takes an explicit boolean.
  const out = R.shapeResult('Enter name: ', '', 1, true);
  assert.strictEqual(out.needs_input, true);
  assert.strictEqual(out.returncode, 0);   // needs_input normalizes rc to 0
  assert.strictEqual(out.stderr, '');
  assert.strictEqual(out.stdout, 'Enter name: '); // prompt preserved verbatim
});

test('shapeResult does NOT mangle a program that legitimately prints "EOFError"', () => {
  // Regression: a successful program printing the word must be untouched —
  // not flagged needs_input, returncode kept, output preserved exactly.
  const out = R.shapeResult('Watch out for EOFError when reading files\n', '', 0, false);
  assert.ok(!out.needs_input, 'must not be flagged needs_input');
  assert.strictEqual(out.returncode, 0);
  assert.strictEqual(out.stdout, 'Watch out for EOFError when reading files\n');
});

test('shapeResult preserves "EOFError" lines in multi-line output', () => {
  const out = R.shapeResult('EOFError\nValueError\nDone.\n', '', 0, false);
  assert.ok(!out.needs_input);
  assert.strictEqual(out.stdout, 'EOFError\nValueError\nDone.\n'); // no line deleted
});

test('shapeResult success path passes returncode 0', () => {
  const out = R.shapeResult('hello\n', '', 0, false);
  assert.strictEqual(out.returncode, 0);
  assert.ok(!out.needs_input);
});

test('buildDriver feeds stdin, echoes input, and reports EOF via a flag (no stdout marker)', () => {
  const src = R.buildDriver('name = input()\nprint(name)', 'sam\n');
  assert.ok(src.includes('sam'));            // stdin embedded
  assert.ok(src.includes('name = input()')); // user code embedded
  // EOF must be signalled out-of-band, NOT by writing "EOFError" into stdout.
  assert.ok(!/_out\.write\(["']EOFError/.test(src),
    'driver must not write an EOFError marker into stdout');
  // _RESULT must carry a needs-input flag the runner can read.
  assert.ok(/_RESULT = \(.*needs_input.*\)/.test(src) || /_needs_input/.test(src),
    'driver must expose a needs-input flag in _RESULT');
});
