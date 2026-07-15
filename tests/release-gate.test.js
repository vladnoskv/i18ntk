'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');

const packageRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(packageRoot, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

test('release verification includes the isolated packed-package check', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
  const releaseVerify = manifest.scripts['release:verify'];

  assert.match(releaseVerify, /npm run verify:packed-install/);
  assert.match(releaseVerify, /npm audit --omit=dev --audit-level=high/);
});

test('build and version updates stop when the shared release gate fails', () => {
  const build = read('build.bat');
  const update = read('update.bat');

  assert.match(build, /call npm run release:verify/);
  assert.match(build, /Release verification failed\. No package artifacts were created\./);
  assert.match(update, /call npm run release:verify/);
  assert.match(update, /Release verification failed\. No version files were changed\./);
});
