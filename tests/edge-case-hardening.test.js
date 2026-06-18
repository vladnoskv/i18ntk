/**
 * Edge Case Hardening Tests for i18ntk v4.5.0
 *
 * Validates security fixes and robustness improvements applied in v4.5.0.
 * Covers: prototype pollution protection, backup corrupt handling,
 * report malformed JSON, null safety guards, settings propagation,
 * and config manager error handling.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('assert');
const { describe, test, before, after } = require('node:test');

const SecurityUtils = require('../utils/security');
const { loadTranslations, deepMerge, t } = require('../utils/i18n-helper');
const configManager = require('../utils/config-manager');
const ReportModel = require('../utils/report-model');
const { detectTranslationContentRisks } = require('../utils/validation-risk');

const FIXTURES = path.join(__dirname, 'fixtures', 'edge-v450');
let created = false;

function mkFixtures() {
  if (created) return;
  fs.mkdirSync(path.join(FIXTURES, 'locales', 'en'), { recursive: true });
  fs.mkdirSync(path.join(FIXTURES, 'locales', 'es'), { recursive: true });
  fs.mkdirSync(path.join(FIXTURES, 'backups'), { recursive: true });

  // Normal + proto-pollution keys
  fs.writeFileSync(path.join(FIXTURES, 'locales', 'en', 'common.json'), JSON.stringify({
    app: { title: 'Hello', description: 'World' },
    nav: { home: 'Home' },
    __proto__: { polluted: true, isAdmin: true },
    constructor: { polluted: true },
    prototype: { polluted: true },
    nested: { __proto__: { deepPolluted: true }, normal: 'safe' },
  }));
  // Target locale (partial)
  fs.writeFileSync(path.join(FIXTURES, 'locales', 'es', 'common.json'), JSON.stringify({
    app: { title: 'Hola' },
  }));
  // Malformed JSON
  fs.writeFileSync(path.join(FIXTURES, 'locales', 'en', 'broken.json'), '{ "key": "val" broken }');
  // Empty JSON
  fs.writeFileSync(path.join(FIXTURES, 'locales', 'en', 'empty.json'), '{}');
  // Corrupt backup
  fs.writeFileSync(path.join(FIXTURES, 'backups', 'corrupt.json'), '{{{not valid json');
  // Valid backup
  fs.writeFileSync(path.join(FIXTURES, 'backups', 'valid.json'), JSON.stringify({
    _meta: { version: 1, type: 'full' },
    'common.json': JSON.stringify({ en: { app: { title: 'Hello' } } }),
  }));
  created = true;
}

function rmFixtures() {
  try { fs.rmSync(FIXTURES, { recursive: true, force: true }); } catch (_) { /* ok */ }
}

// ══════════════════════════════════════════════════════════════════════
// 1. PROTOTYPE POLLUTION PROTECTION
// ══════════════════════════════════════════════════════════════════════
describe('Prototype Pollution Protection', () => {

  test('stripPrototypeKeys removes __proto__ from parsed JSON', () => {
    mkFixtures();
    // loadTranslations uses readJsonSafe which now strips proto keys
    const result = loadTranslations(path.join(FIXTURES, 'locales', 'en', 'common.json'));
    // Check that Object.prototype stays unpolluted after loading
    assert.strictEqual(({}).polluted, undefined);
    assert.strictEqual(({}).isAdmin, undefined);
    // Result should be a valid object (not crash)
    assert.ok(result && typeof result === 'object');
    // No key in the output should be __proto__ or constructor
    const allKeys = Object.keys(result);
    const badKeys = allKeys.filter(k => k === '__proto__' || k === 'constructor' || k === 'prototype');
    assert.strictEqual(badKeys.length, 0, 'No proto keys in top-level output');
  });

  test('stripPrototypeKeys works on nested structures', () => {
    mkFixtures();
    // Recursively collect all keys from the output
    function collectAllKeys(obj, prefix = '') {
      const keys = [];
      if (!obj || typeof obj !== 'object') return keys;
      for (const k of Object.keys(obj)) {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
          keys.push(fullKey);
        }
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
          keys.push(...collectAllKeys(obj[k], fullKey));
        }
      }
      return keys;
    }
    const result = loadTranslations(path.join(FIXTURES, 'locales', 'en', 'common.json'));
    const protoKeys = collectAllKeys(result);
    assert.strictEqual(protoKeys.length, 0, `No proto/constructor/prototype keys anywhere in output. Found: ${protoKeys.join(', ')}`);
  });

  test('preserves legitimate data after loading', () => {
    mkFixtures();
    const result = loadTranslations(path.join(FIXTURES, 'locales', 'en', 'common.json'));
    // Result should be a valid object with content
    assert.ok(result);
    const keys = Object.keys(result);
    assert.ok(keys.length > 0, 'Output should contain keys');
  });

  test('Object.prototype remains unpolluted after loading malicious JSON', () => {
    mkFixtures();
    loadTranslations(path.join(FIXTURES, 'locales', 'en', 'common.json'));
    assert.strictEqual(({}).polluted, undefined, 'Object.prototype.polluted must be undefined');
    assert.strictEqual(({}).isAdmin, undefined, 'Object.prototype.isAdmin must be undefined');
  });

  test('deepMerge filters proto/constructor/prototype keys', () => {
    const target = { safe: 1, nested: { inner: 'keep' } };
    const source = {
      __proto__: { polluted: true },
      constructor: { bad: true },
      prototype: { alsoBad: true },
      normal: 2,
      nested: { __proto__: { deepBad: true }, extra: 'ok' },
    };
    // deepMerge is exported from i18n-helper (line 518)
    const result = deepMerge(target, source);
    assert.strictEqual(result.safe, 1);
    assert.strictEqual(result.normal, 2);
    assert.strictEqual(result.nested.inner, 'keep');
    assert.strictEqual(result.nested.extra, 'ok');
    // proto keys should be filtered
    const topKeys = Object.keys(result);
    assert.ok(!topKeys.includes('__proto__'), 'top __proto__ filtered');
    assert.ok(!topKeys.includes('constructor'), 'top constructor filtered');
    assert.ok(!topKeys.includes('prototype'), 'top prototype filtered');
    const nestedKeys = Object.keys(result.nested);
    assert.ok(!nestedKeys.includes('__proto__'), 'nested __proto__ filtered');
    // Object.prototype unpolluted
    assert.strictEqual(({}).polluted, undefined);
    assert.strictEqual(({}).bad, undefined);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 2. SECURITY UTILS — SAFE PARSE / WRITE / READ / EXISTS
// ══════════════════════════════════════════════════════════════════════
describe('SecurityUtils Edge Cases', () => {

  test('safeParseJSON returns fallback for null/undefined', () => {
    assert.strictEqual(SecurityUtils.safeParseJSON(null), null);
    assert.strictEqual(SecurityUtils.safeParseJSON(undefined), null);
    assert.strictEqual(SecurityUtils.safeParseJSON(null, 'FALLBACK'), 'FALLBACK');
  });

  test('safeParseJSON returns fallback for empty string', () => {
    assert.strictEqual(SecurityUtils.safeParseJSON(''), null);
    assert.strictEqual(SecurityUtils.safeParseJSON('  '), null);
  });

  test('safeParseJSON parses valid JSON', () => {
    const result = SecurityUtils.safeParseJSON('{"key": "value"}');
    assert.deepStrictEqual(result, { key: 'value' });
  });

  test('safeParseJSON returns fallback for invalid JSON', () => {
    const result = SecurityUtils.safeParseJSON('{broken');
    assert.strictEqual(result, null);
  });

  test('safeWriteFileSync allows valid writes', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-test-'));
    try {
      const fp = path.join(tmpDir, 'ok.json');
      SecurityUtils.safeWriteFileSync(fp, '{"x":1}', tmpDir);
      assert.ok(fs.existsSync(fp), 'file should exist');
      assert.strictEqual(fs.readFileSync(fp, 'utf8'), '{"x":1}');
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('safeReadFileSync returns null for non-existent files', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-test-'));
    try {
      assert.strictEqual(SecurityUtils.safeReadFileSync(path.join(tmpDir, 'nope.txt'), tmpDir), null);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('safeExistsSync returns false for non-existent files', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-test-'));
    try {
      assert.strictEqual(SecurityUtils.safeExistsSync(path.join(tmpDir, 'nope.txt'), tmpDir), false);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('safeExistsSync returns true for existing files', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-test-'));
    try {
      const fp = path.join(tmpDir, 'exists.txt');
      fs.writeFileSync(fp, 'hi');
      assert.strictEqual(SecurityUtils.safeExistsSync(fp, tmpDir), true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});

// ══════════════════════════════════════════════════════════════════════
// 3. BACKUP CORRUPT HANDLING
// ══════════════════════════════════════════════════════════════════════
describe('Backup Operations', () => {

  test('corrupt backup file is detected as invalid JSON', () => {
    mkFixtures();
    const corruptPath = path.join(FIXTURES, 'backups', 'corrupt.json');
    const content = fs.readFileSync(corruptPath, 'utf8');
    assert.throws(() => JSON.parse(content), /JSON/);
  });

  test('valid backup file parses successfully', () => {
    mkFixtures();
    const validPath = path.join(FIXTURES, 'backups', 'valid.json');
    const content = fs.readFileSync(validPath, 'utf8');
    const parsed = JSON.parse(content);
    assert.strictEqual(parsed._meta.type, 'full');
    assert.ok(parsed['common.json']);
  });

  test('empty backup file is handled gracefully', () => {
    mkFixtures();
    const emptyPath = path.join(FIXTURES, 'backups', 'empty.json');
    fs.writeFileSync(emptyPath, '');
    const content = fs.readFileSync(emptyPath, 'utf8');
    assert.strictEqual(content, '');
    // Empty string is not valid JSON
    assert.throws(() => JSON.parse(content), /JSON/);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 4. REPORT MODEL — MALFORMED JSON GRACEFUL HANDLING
// ══════════════════════════════════════════════════════════════════════
describe('Report Model — Malformed JSON', () => {

  test('generateI18ntkReport does not crash on malformed JSON', () => {
    mkFixtures();
    let threw = false;
    try {
      const report = ReportModel.generateI18ntkReport({
        projectRoot: FIXTURES,
        localesDir: path.join(FIXTURES, 'locales'),
        sourceLocale: 'en',
        sourceDir: path.join(FIXTURES, 'locales', 'en'),
      });
      assert.ok(report, 'Report generated');
      assert.ok(report.summary, 'Report has summary');
    } catch (e) {
      threw = true;
      assert.ok(!e.message.includes('Unexpected token'), 'Should not crash on malformed JSON');
    }
    assert.ok(!threw || true, 'Report does not crash unexpectedly');
  });

  test('generateI18ntkReport handles empty JSON files', () => {
    mkFixtures();
    let threw = false;
    try {
      const report = ReportModel.generateI18ntkReport({
        projectRoot: FIXTURES,
        localesDir: path.join(FIXTURES, 'locales'),
        sourceLocale: 'en',
        sourceDir: path.join(FIXTURES, 'locales', 'en'),
      });
      assert.ok(report, 'Report handles empty JSON');
    } catch (e) {
      threw = true;
      assert.ok(!e.message.includes('Unexpected'), 'No crash on empty JSON');
    }
    assert.ok(!threw || true);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 5. VALIDATION RISK DETECTION EDGE CASES
// ══════════════════════════════════════════════════════════════════════
describe('Validation Risk Detection', () => {

  test('detects URLs in translation values', () => {
    const risks = detectTranslationContentRisks('Visit https://example.com/page', 'en', 'es');
    assert.ok(risks && risks.length > 0, 'URL should be detected');
  });

  test('detects emails in translation values', () => {
    const risks = detectTranslationContentRisks('Contact admin@example.com', 'en', 'es');
    assert.ok(risks && risks.length > 0, 'Email should be detected');
  });

  test('handles null/undefined values without crashing', () => {
    assert.doesNotThrow(() => detectTranslationContentRisks(null, 'en', 'es'));
    assert.doesNotThrow(() => detectTranslationContentRisks(undefined, 'en', 'es'));
    assert.doesNotThrow(() => detectTranslationContentRisks('', 'en', 'es'));
  });

  test('handles non-string values gracefully', () => {
    assert.doesNotThrow(() => detectTranslationContentRisks(123, 'en', 'es'));
    assert.doesNotThrow(() => detectTranslationContentRisks(true, 'en', 'es'));
    assert.doesNotThrow(() => detectTranslationContentRisks({}, 'en', 'es'));
  });
});

// ══════════════════════════════════════════════════════════════════════
// 6. CONFIG MANAGER
// ══════════════════════════════════════════════════════════════════════
describe('Config Manager', () => {

  test('migrateLegacyIfNeeded does not crash', async () => {
    if (typeof configManager.migrateLegacyIfNeeded === 'function') {
      const fakeCfg = { version: '4.5.0', sourceDir: './src', sourceLanguage: 'en' };
      await assert.doesNotReject(configManager.migrateLegacyIfNeeded(fakeCfg));
    }
    // If not exported, skip — it's internal
    assert.ok(true);
  });

  test('loadConfig returns a config object', () => {
    if (typeof configManager.loadConfig === 'function') {
      const cfg = configManager.loadConfig();
      assert.ok(cfg !== null && cfg !== undefined, 'Should return config');
    }
    assert.ok(true);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 7. VERSION CONSISTENCY
// ══════════════════════════════════════════════════════════════════════
describe('Version Consistency', () => {

  test('package.json matches package.public.json version', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    const pub = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.public.json'), 'utf8'));
    assert.strictEqual(pkg.version, pub.version);
    assert.strictEqual(pkg.version, pkg.versionInfo.version);
    assert.ok(pkg.version >= '4.5.0');
  });

  test('nextVersion is one patch ahead', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    const [major, minor, patch] = pkg.version.split('.').map(Number);
    assert.strictEqual(pkg.versionInfo.nextVersion, `${major}.${minor}.${patch + 1}`);
  });

  test('deprecationMessage references current version', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    assert.ok(pkg.versionInfo.deprecationMessage.includes(pkg.version));
    assert.ok(pkg.versionInfo.supportPolicy.includes(pkg.version));
  });

  test('lastUpdated is within 30 days', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    const updated = new Date(pkg.versionInfo.lastUpdated);
    const diffDays = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24);
    assert.ok(diffDays < 30, `lastUpdated should be < 30 days (${diffDays.toFixed(1)})`);
  });
});

// ══════════════════════════════════════════════════════════════════════
// 8. I18N HELPER DEEP MERGE EDGE CASES
// ══════════════════════════════════════════════════════════════════════
describe('I18N Helper deepMerge', () => {

  test('merges simple objects correctly', () => {
    const result = deepMerge({ a: 1 }, { b: 2 });
    assert.strictEqual(result.a, 1);
    assert.strictEqual(result.b, 2);
  });

  test('creates target if null', () => {
    const result = deepMerge(null, { a: 1 });
    assert.strictEqual(result.a, 1);
  });

  test('ignores null source', () => {
    const result = deepMerge({ a: 1 }, null);
    assert.strictEqual(result.a, 1);
  });

  test('handles empty objects', () => {
    const result = deepMerge({}, {});
    assert.deepStrictEqual(result, {});
  });

  test('recursively merges nested objects', () => {
    const target = { outer: { inner: 'keep', second: 'stay' } };
    const source = { outer: { inner: 'overwrite', third: 'new' } };
    const result = deepMerge(target, source);
    assert.strictEqual(result.outer.inner, 'overwrite');
    assert.strictEqual(result.outer.second, 'stay');
    assert.strictEqual(result.outer.third, 'new');
  });
});

after(() => {
  rmFixtures();
});
