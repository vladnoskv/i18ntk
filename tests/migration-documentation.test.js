'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('v4 to v5 migration guide is published and linked from core documentation', () => {
  const guide = read('docs/migration-v4-to-v5.md');
  const readme = read('README.md');
  const docsIndex = read('docs/README.md');
  const manifest = JSON.parse(read('package.json'));

  assert.match(guide, /PolyForm Noncommercial 1\.0\.0/);
  assert.match(guide, /one-time configuration migration/);
  assert.match(guide, /makes no network request/i);
  assert.match(readme, /docs\/migration-v4-to-v5\.md/);
  assert.match(docsIndex, /migration-v4-to-v5\.md/);
  assert.ok(manifest.files.includes('docs/migration-v4-to-v5.md'));
});

test('security policy documents local-only public license marker handling', () => {
  const security = read('SECURITY.md');
  assert.match(security, /supported production line is `5\.x`/);
  assert.match(security, /make no network request, phone-home call, telemetry event/i);
  assert.match(security, /Never place license keys, contracts, names, email addresses/i);
});
