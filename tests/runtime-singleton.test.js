const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { describe, test } = require('node:test');

function loadFreshRuntime() {
  const modulePath = require.resolve('../runtime');
  delete require.cache[modulePath];
  return require('../runtime');
}

function writeLocale(baseDir, language, data) {
  fs.mkdirSync(baseDir, { recursive: true });
  fs.writeFileSync(
    path.join(baseDir, `${language}.json`),
    `${JSON.stringify(data)}\n`,
    'utf8'
  );
}

describe('runtime initRuntime state isolation', () => {
  test('multiple initRuntime calls return independent runtime instances', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-runtime-isolation-'));

    try {
      const runtimeModule = loadFreshRuntime();
      const firstBaseDir = path.join(tempRoot, 'first-locales');
      const secondBaseDir = path.join(tempRoot, 'second-locales');

      writeLocale(firstBaseDir, 'de', { common: { hello: 'Hallo' } });
      writeLocale(firstBaseDir, 'en', { common: { hello: 'Hello' } });
      writeLocale(secondBaseDir, 'fr', { common: { hello: 'Bonjour' } });

      const runtimeA = runtimeModule.initRuntime({
        baseDir: firstBaseDir,
        language: 'de',
        fallbackLanguage: 'en',
        preload: true
      });
      const runtimeB = runtimeModule.initRuntime({
        baseDir: secondBaseDir,
        language: 'fr',
        fallbackLanguage: 'fr',
        preload: true
      });

      assert.strictEqual(runtimeB.getLanguage(), 'fr');
      assert.strictEqual(runtimeB.t('common.hello'), 'Bonjour');

      assert.strictEqual(runtimeA.getLanguage(), 'de');
      assert.strictEqual(runtimeA.t('common.hello'), 'Hallo');
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('module-level singleton exports are not overwritten by later initRuntime calls', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-runtime-singleton-'));

    try {
      const runtimeModule = loadFreshRuntime();
      const firstBaseDir = path.join(tempRoot, 'first-locales');
      const secondBaseDir = path.join(tempRoot, 'second-locales');

      writeLocale(firstBaseDir, 'de', { common: { hello: 'Hallo' } });
      writeLocale(secondBaseDir, 'fr', { common: { hello: 'Bonjour' } });

      runtimeModule.initRuntime({
        baseDir: firstBaseDir,
        language: 'de',
        fallbackLanguage: 'de',
        preload: true
      });

      assert.strictEqual(runtimeModule.getLanguage(), 'de');
      assert.strictEqual(runtimeModule.t('common.hello'), 'Hallo');

      runtimeModule.initRuntime({
        baseDir: secondBaseDir,
        language: 'fr',
        fallbackLanguage: 'fr',
        preload: true
      });

      assert.strictEqual(runtimeModule.getLanguage(), 'de');
      assert.strictEqual(runtimeModule.t('common.hello'), 'Hallo');
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('lazy runtime instances load from their own language directories', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-runtime-lazy-'));

    try {
      const runtimeModule = loadFreshRuntime();
      const baseDir = path.join(tempRoot, 'locales');

      fs.mkdirSync(path.join(baseDir, 'en'), { recursive: true });
      fs.mkdirSync(path.join(baseDir, 'de'), { recursive: true });
      fs.mkdirSync(path.join(baseDir, 'fr'), { recursive: true });

      fs.writeFileSync(
        path.join(baseDir, 'en', 'common.json'),
        `${JSON.stringify({ common: { hello: 'Hello' } })}\n`,
        'utf8'
      );
      fs.writeFileSync(
        path.join(baseDir, 'de', 'common.json'),
        `${JSON.stringify({ common: { hello: 'Hallo' } })}\n`,
        'utf8'
      );
      fs.writeFileSync(
        path.join(baseDir, 'fr', 'common.json'),
        `${JSON.stringify({ common: { hello: 'Bonjour' } })}\n`,
        'utf8'
      );

      const runtimeA = runtimeModule.initRuntime({
        baseDir,
        language: 'de',
        fallbackLanguage: 'en',
        lazy: true
      });
      const runtimeB = runtimeModule.initRuntime({
        baseDir,
        language: 'fr',
        fallbackLanguage: 'en',
        lazy: true
      });

      assert.strictEqual(runtimeA.t('common.hello'), 'Hallo');
      assert.strictEqual(runtimeB.t('common.hello'), 'Bonjour');
      assert.strictEqual(runtimeModule.t('common.hello'), 'Hallo');
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('lazy runtime supports single-file locale layout', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-runtime-lazy-file-'));

    try {
      const runtimeModule = loadFreshRuntime();
      const baseDir = path.join(tempRoot, 'locales');

      fs.mkdirSync(baseDir, { recursive: true });
      writeLocale(baseDir, 'en', { common: { hello: 'Hello' } });
      writeLocale(baseDir, 'de', { common: { hello: 'Hallo' } });

      const runtime = runtimeModule.initRuntime({
        baseDir,
        language: 'de',
        fallbackLanguage: 'en',
        lazy: true
      });

      assert.strictEqual(runtime.t('common.hello'), 'Hallo');
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('lazy runtime falls back to eager language load for keys outside the manifest cap', () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-runtime-lazy-fallback-'));

    try {
      const runtimeModule = loadFreshRuntime();
      const baseDir = path.join(tempRoot, 'locales');
      const langDir = path.join(baseDir, 'en');
      fs.mkdirSync(langDir, { recursive: true });

      const largeManifestData = {};
      for (let i = 0; i < 220; i++) {
        largeManifestData[`key${i}_${'x'.repeat(500)}`] = `value ${i}`;
      }
      fs.writeFileSync(
        path.join(langDir, 'aa-large.json'),
        `${JSON.stringify(largeManifestData)}\n`,
        'utf8'
      );
      fs.writeFileSync(
        path.join(langDir, 'zz-target.json'),
        `${JSON.stringify({ target: 'Loaded by eager fallback' })}\n`,
        'utf8'
      );

      const runtime = runtimeModule.initRuntime({
        baseDir,
        language: 'en',
        fallbackLanguage: 'en',
        lazy: true
      });

      assert.strictEqual(runtime.t('target'), 'Loaded by eager fallback');
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
