/**
 * Validates that package.json and package.public.json stay in sync for
 * the fields that the build script (scripts/build-public-package.js)
 * requires to be identical.  This prevents version mismatches from
 * reaching `npm run pack:public`.
 */
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');

const root = path.resolve(__dirname, '..');
const rootManifest = require(path.join(root, 'package.json'));
const publicManifest = require(path.join(root, 'package.public.json'));

const SYNCED_FIELDS = [
  'name',
  'version',
  'description',
  'keywords',
  'homepage',
  'bugs',
  'repository',
  'funding',
  'license',
  'author',
  'type',
  'main',
  'types',
  'exports',
  'bin',
  'files',
  'sideEffects',
  'engines',
  'publishConfig',
  'preferGlobal',
  'versionInfo',
];

function stableJson(value) {
  return JSON.stringify(value);
}

test('package.json and package.public.json synced fields match', (t) => {
  for (const field of SYNCED_FIELDS) {
    const rootVal = stableJson(rootManifest[field]);
    const publicVal = stableJson(publicManifest[field]);
    assert.strictEqual(
      publicVal,
      rootVal,
      `Field "${field}" differs between package.json and package.public.json`
    );
  }
});

test('package.json version matches versionInfo.version', () => {
  const topLevel = rootManifest.version;
  const embedded = rootManifest.versionInfo?.version;
  assert.strictEqual(
    embedded,
    topLevel,
    `Top-level version "${topLevel}" does not match versionInfo.version "${embedded}"`
  );
});

test('package.json version is not stale (greater than 4.4.4)', () => {
  const v = rootManifest.version;
  assert.ok(
    v >= '4.4.5',
    `Version "${v}" should be >= 4.4.5 (was 4.4.5 or newer expected)`
  );
});

test('versionInfo.nextVersion is one patch ahead of version', () => {
  const current = rootManifest.version;
  const next = rootManifest.versionInfo?.nextVersion;
  if (next && current) {
    const curParts = current.split('.').map(Number);
    const nextParts = next.split('.').map(Number);
    if (curParts.length === 3 && nextParts.length === 3) {
      assert.strictEqual(nextParts[0], curParts[0], 'Major version mismatch in nextVersion');
      assert.strictEqual(nextParts[1], curParts[1], 'Minor version mismatch in nextVersion');
      assert.strictEqual(nextParts[2], curParts[2] + 1, 'nextVersion should be one patch ahead');
    }
  }
});

test('versionInfo.lastUpdated is today or newer (format MM/DD/YYYY)', () => {
  const lastUpdated = rootManifest.versionInfo?.lastUpdated;
  if (!lastUpdated) return;
  const match = lastUpdated.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  assert.ok(match, `lastUpdated "${lastUpdated}" should be MM/DD/YYYY format`);
  if (match) {
    const [, month, day, year] = match;
    const timestamp = Date.UTC(+year, +month - 1, +day);
    const now = Date.now();
    const endOfToday = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1)).getTime() - 1;
    assert.ok(
      timestamp <= endOfToday,
      `lastUpdated timestamp ${new Date(timestamp).toISOString()} should not be after end of today UTC`
    );
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    assert.ok(
      timestamp >= (now - thirtyDaysMs),
      `lastUpdated "${lastUpdated}" is more than 30 days ago`
    );
  }
});

test('versionInfo.deprecationMessage uses the current version', () => {
  const msg = rootManifest.versionInfo?.deprecationMessage || '';
  const current = rootManifest.version;
  assert.ok(
    msg.includes(`i18ntk@${current}`),
    `deprecationMessage should reference i18ntk@${current} but got: ${msg}`
  );
});

test('versionInfo.supportPolicy uses the current version', () => {
  const policy = rootManifest.versionInfo?.supportPolicy || '';
  const current = rootManifest.version;
  assert.ok(
    policy.includes(current),
    `supportPolicy should reference ${current} but got: ${policy}`
  );
});
