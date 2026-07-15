'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { discoverLocaleFiles, discoverLocales } = require('../utils/locale-discovery');
const { isSourceCopyMarker, validateTranslation } = require('../utils/translation-quality');
const { resolveSourceFiles } = require('../main/i18ntk-translate');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-5-0-'));
  fs.mkdirSync(path.join(root, 'locales', 'en'), { recursive: true });
  fs.mkdirSync(path.join(root, 'locales', 'fr'), { recursive: true });
  fs.mkdirSync(path.join(root, 'locales', 'pt-BR'), { recursive: true });
  fs.writeFileSync(path.join(root, 'locales', 'en', 'common.json'), '{}');
  fs.writeFileSync(path.join(root, 'locales', 'fr', 'common.json'), '{}');
  fs.writeFileSync(path.join(root, 'locales', 'pt-BR', 'common.json'), '{}');
  fs.writeFileSync(path.join(root, 'locales', 'de.json'), '{}');
  return root;
}

test('locale discovery finds every locale without a hard-coded language allowlist', () => {
  const root = fixture();
  assert.deepEqual(discoverLocales(path.join(root, 'locales')), ['de', 'en', 'fr', 'pt-br']);
  assert.equal(discoverLocaleFiles(path.join(root, 'locales'), { sourceLocale: 'en', sourceOnly: true }).length, 1);
});

test('source-copy completion markers are not treated as translated', () => {
  assert.equal(isSourceCopyMarker('[AR] English source text'), true);
  assert.equal(isSourceCopyMarker('العربية'), false);
  assert.equal(validateTranslation('English source text', '[AR] English source text', 'ar').valid, true);
  assert.ok(validateTranslation('English source text', '[AR] English source text', 'ar').issues.some(i => i.code === 'sourceCopyMarker'));
});

test('a positional source file wins over --source-dir', () => {
  const root = fixture();
  const file = path.join(root, 'locales', 'en', 'common.json');
  const result = resolveSourceFiles(file, path.join(root, 'missing'), null);
  assert.deepEqual(result, [file]);
});
