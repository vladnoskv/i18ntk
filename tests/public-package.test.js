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

test('public package files list does not contain self-referential i18ntk/ entries', () => {
  const publicManifest = readJson('package.public.json');
  const files = publicManifest.files || [];

  const selfRefEntries = files.filter(f => f.startsWith('i18ntk/') || f === 'i18ntk');
  assert.deepStrictEqual(selfRefEntries, [], 'files list must not contain i18ntk/ nested package entries');
});

test('public package exports do not use wildcard for runtime', () => {
  const publicManifest = readJson('package.public.json');
  const exports = publicManifest.exports || {};

  assert.equal(exports['./runtime/*'], undefined, 'runtime wildcard export must not exist');
});
