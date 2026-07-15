'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { getLanguages, getLanguage, normalizeLanguageCode, isRtlLanguage } = require('../utils/language-registry');
const { validateTranslation, validateTranslationEntries, isolateForTerminal } = require('../utils/translation-quality');
const { extractFrameworkMessages, detectProjectFrameworks } = require('../utils/framework-detector');
const { createLicenseMarker, validateLicenseMarker, createMetaTag, getDiscoveryQueries } = require('../utils/license-marker');

describe('5.0.0 reliability contracts', () => {
  it('exposes one immutable 23-language registry with RTL metadata', () => {
    const languages = getLanguages();
    assert.equal(languages.length, 23);
    assert.equal(new Set(languages.map(x => x.code)).size, 23);
    assert.equal(isRtlLanguage('ar'), true);
    assert.equal(isRtlLanguage('he'), true);
    assert.equal(getLanguage('pt-BR').code, 'pt');
    assert.equal(normalizeLanguageCode('ZH_cn'), 'zh');
    assert.equal(isRtlLanguage('iw-IL'), true);
  });
  it('normalizes framework extraction and skips empty captures', () => {
    const nuxt = extractFrameworkMessages("localePath('account.settings')", 'nuxt', { includeGeneric: false });
    const nextIntl = extractFrameworkMessages("useTranslations('Dashboard')", 'next-intl', { includeGeneric: false });
    assert.equal(nuxt[0].value, 'account.settings');
    assert.equal(nextIntl[0].value, 'Dashboard');
    assert.ok(nuxt[0].end > nuxt[0].start);
  });
  it('reports multiple dependency-backed frameworks', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-detect-'));
    try {
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { next: '15.0.0', 'next-intl': '4.0.0' } }));
      const result = detectProjectFrameworks(dir);
      assert.ok(result.detected.includes('next'));
      assert.ok(result.detected.includes('next-intl'));
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
  it('validates placeholders, tags, untranslated values and bidi controls', () => {
    assert.equal(validateTranslation('Hi {{name}}', 'مرحباً {{name}}', 'ar').valid, true);
    assert.equal(validateTranslation('Hi {{name}}', 'مرحباً', 'ar').valid, false);
    assert.ok(validateTranslation('<b>Save</b>', 'حفظ', 'ar').issues.some(x => x.code === 'tagMismatch'));
    assert.ok(validateTranslation('Save now', 'Save now', 'de').issues.some(x => x.code === 'possiblyUntranslated'));
    assert.equal(isolateForTerminal('العربية', 'ar'), '\u2067العربية\u2069');
    const batch = validateTranslationEntries([
      { key: 'hello', source: 'Hi {{name}}', target: 'Hallo {{name}}' },
      { key: 'save', source: '<b>Save</b>', target: 'Speichern' }
    ], 'de-DE');
    assert.equal(batch.checked, 2);
    assert.equal(batch.errors, 1);
    assert.equal(batch.valid, false);
  });
  it('creates searchable public deployment markers without network tracking', () => {
    const marker = createLicenseMarker({ licenseId: 'LIC-ACME-2026', domains: ['www.example.com', '*.example.org'] });
    assert.deepEqual(marker.domains, ['*.example.org', 'example.com']);
    assert.match(createMetaTag(marker), /i18ntk-site-verification:LIC-ACME-2026/);
    assert.equal(validateLicenseMarker(marker, { domain: 'app.example.org' }).valid, true);
    assert.equal(validateLicenseMarker(marker, { domain: 'unlicensed.test' }).valid, false);
    assert.ok(getDiscoveryQueries(marker.licenseId).every(query => query.includes(marker.licenseId)));
    assert.throws(() => createLicenseMarker({ licenseId: 'LIC-LOCAL-TEST', domains: ['localhost'] }), /public domain/);
    assert.equal(validateLicenseMarker({ ...marker, licenseType: 'unknown' }).valid, false);
    assert.equal(validateLicenseMarker({ ...marker, domains: ['example.com', 'example.com'] }).valid, false);
    assert.equal(validateLicenseMarker({ ...marker, $schema: 'https://attacker.invalid/schema' }).valid, false);
  });
});
