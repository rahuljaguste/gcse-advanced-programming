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
  // the prompt is preserved; the EOF marker is stripped from visible output
  assert.strictEqual(out.stdout, 'What is your name? ');
});

test('shapeResult success path passes returncode 0', () => {
  const out = R.shapeResult('hello\n', '', 0);
  assert.strictEqual(out.returncode, 0);
  assert.ok(!out.needs_input);
});

test('buildDriver builds python that feeds stdin and echoes input', () => {
  const src = R.buildDriver('name = input()\nprint(name)', 'sam\n');
  assert.ok(src.includes('sam'));            // stdin embedded
  assert.ok(src.includes('name = input()')); // user code embedded
});
