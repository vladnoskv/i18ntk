const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const SecurityUtils = require('../utils/security');

(function testParentDirectoryTraversal() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sec-base-'));
  assert.strictEqual(
    SecurityUtils.validatePath('../secret.txt', base),
    null,
    'Parent directory traversal should be rejected'
  );
})();

(function testMixedSeparatorsTraversal() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sec-base-'));
  assert.strictEqual(
    SecurityUtils.validatePath('..\\secret.txt', base),
    null,
    'Mixed separator traversal should be rejected'
  );
})();

(function testSymlinkTraversal() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sec-base-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'sec-outside-'));
  const outsideFile = path.join(outside, 'secret.txt');
  fs.writeFileSync(outsideFile, 'secret');
  const linkPath = path.join(base, 'link.txt');
  fs.symlinkSync(outsideFile, linkPath);
  assert.strictEqual(
    SecurityUtils.validatePath('link.txt', base),
    null,
    'Symlink traversal should be rejected'
  );
})();

(function testValidPath() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sec-base-'));
  const result = SecurityUtils.validatePath('file.txt', base);
  assert.strictEqual(
    result,
    path.join(base, 'file.txt'),
    'Valid path should resolve inside base'
  );
})();

console.log('security-utils tests passed');