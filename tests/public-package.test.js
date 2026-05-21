const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

test('public package manifest keeps CLI version metadata in sync', () => {
  const rootManifest = readJson('package.json');
  const publicManifest = readJson('package.public.json');

  assert.deepStrictEqual(publicManifest.versionInfo, rootManifest.versionInfo);
  assert.match(publicManifest.versionInfo.releaseDate, /^\d{2}\/\d{2}\/\d{4}$/);
  assert.equal(typeof publicManifest.versionInfo.maintainer, 'string');
  assert.notEqual(publicManifest.versionInfo.maintainer.trim(), '');
});

test('public package manifest keeps searchable keywords in sync', () => {
  const rootManifest = readJson('package.json');
  const publicManifest = readJson('package.public.json');

  assert.deepStrictEqual(publicManifest.keywords, rootManifest.keywords);
});
