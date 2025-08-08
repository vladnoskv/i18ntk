const assert = require('assert');
const path = require('path');
const { toRelative, resolvePaths } = require('../utils/path-utils');

(function testWindowsPaths() {
  const base = 'C:\\project';
  const target = 'C:\\project\\src\\file.txt';
  const relative = toRelative(base, target);
  assert.strictEqual(relative, 'src/file.txt', 'Windows relative path');
  const [resolved] = resolvePaths(base, ['src\\file.txt']);
  assert.strictEqual(resolved, path.win32.resolve(base, 'src\\file.txt'), 'Windows resolved path');
})();

(function testPosixPaths() {
  const base = '/project';
  const target = '/project/src/file.txt';
  const relative = toRelative(base, target);
  assert.strictEqual(relative, 'src/file.txt', 'POSIX relative path');
  const [resolved] = resolvePaths(base, ['src/file.txt']);
  assert.strictEqual(resolved, path.posix.resolve(base, 'src/file.txt'), 'POSIX resolved path');
})();

console.log('path-utils tests passed');
