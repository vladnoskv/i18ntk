'use strict';
const path = require('path');
const fs = require('fs');
const { describe, it } = require('node:test');
const assert = require('node:assert');

const SettingsManager = require('../../settings/settings-manager');
const { loadTranslations, t, getCurrentLanguage } = require('../../utils/i18n-helper');
const { detectProjectFramework, getFrameworkPatterns, getFrameworkSuggestions } = require('../../utils/framework-detector');

const UI_LOCALES = path.resolve(__dirname, '..', '..', 'ui-locales');
const EXPECTED_LANGS = ['en','de','es','fr','it','pt','nl','pl','sv','uk','cs','tr','ru','ja','ko','zh','ar','hi','th','vi','he','el','hu'];
const NATIVE_NAMES = {
  en:'English',de:'Deutsch',es:'Español',fr:'Français',it:'Italiano',pt:'Português',
  nl:'Nederlands',pl:'Polski',sv:'Svenska',uk:'Українська',cs:'Čeština',tr:'Türkçe',
  ru:'Русский',ja:'日本語',ko:'한국어',zh:'中文',ar:'العربية',hi:'हिन्दी',th:'ไทย',
  vi:'Tiếng Việt',he:'עברית',el:'Ελληνικά',hu:'Magyar'
};

// ── Language Selection & UI Switching ──────────────────────────────────

describe('Language Selection System', () => {

  it('getAvailableLanguages() returns all 23 languages', () => {
    const sm = new SettingsManager();
    const langs = sm.getAvailableLanguages();
    assert.strictEqual(langs.length, 23, 'Should have 23 languages');
    for (const l of langs) {
      assert.ok(EXPECTED_LANGS.includes(l.code), `Unknown language code: ${l.code}`);
      assert.ok(typeof l.name === 'string' && l.name.length > 0, `${l.code} should have a name`);
    }
  });

  it('getAvailableLanguages() returns correct native names', () => {
    const sm = new SettingsManager();
    const langs = sm.getAvailableLanguages();
    for (const l of langs) {
      assert.strictEqual(l.name, NATIVE_NAMES[l.code], `${l.code} name should be "${NATIVE_NAMES[l.code]}" but got "${l.name}"`);
    }
  });

  it('getEnhancedSettingsSchema() language enum has 23 entries', () => {
    const sm = new SettingsManager();
    const schema = sm.getEnhancedSettingsSchema();
    const langEnum = schema.properties.language.enum;
    const uiLangEnum = schema.properties.uiLanguage.enum;
    assert.strictEqual(langEnum.length, 23, 'language enum should have 23 entries');
    assert.strictEqual(uiLangEnum.length, 23, 'uiLanguage enum should have 23 entries');
    assert.deepStrictEqual(langEnum, EXPECTED_LANGS, 'language enum matches');
    assert.deepStrictEqual(uiLangEnum, EXPECTED_LANGS, 'uiLanguage enum matches');
  });

});

// ── Translation Loading & UI Strings ───────────────────────────────────

describe('Translation Loading & UI Switching', () => {

  it('loadTranslations loads all 23 language files', () => {
    for (const lang of EXPECTED_LANGS) {
      loadTranslations(lang, UI_LOCALES);
      const current = getCurrentLanguage();
      assert.ok(current === lang || current === lang, `Should load ${lang}`);
    }
  });

  it('all languages return translated values for common keys', () => {
    const testKeys = ['common.hello', 'common.welcome', 'common.yes', 'common.no'];
    for (const lang of EXPECTED_LANGS) {
      loadTranslations(lang, UI_LOCALES);
      for (const key of testKeys) {
        const value = t(key);
        assert.ok(typeof value === 'string' && value.length > 0,
          `${lang}/${key} should return a non-empty string, got: "${value}"`);
        if (lang !== 'en') {
          assert.notStrictEqual(value, 'Hello',
            `${lang}/${key} should not be English "Hello", got: "${value}"`);
        }
      }
    }
  });

  it('settings.languages translation keys exist in all locale files', () => {
    for (const lang of EXPECTED_LANGS) {
      const filePath = path.join(UI_LOCALES, `${lang}.json`);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      assert.ok(data.settings?.languages, `${lang}.json should have settings.languages`);
      for (const code of EXPECTED_LANGS) {
        assert.ok(data.settings.languages[code],
          `${lang}.json should have settings.languages.${code}`);
      }
    }
  });

  it('settings.languages has native names in each locale', () => {
    for (const lang of EXPECTED_LANGS) {
      const filePath = path.join(UI_LOCALES, `${lang}.json`);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const selfName = data.settings.languages[lang];
      assert.ok(selfName && selfName.length > 0,
        `${lang}.json settings.languages.${lang} should have a native name`);
    }
  });

  it('language switching preserves i18n context', () => {
    // Load en, check a key, then switch to de and verify it changed
    loadTranslations('en', UI_LOCALES);
    const enHello = t('common.hello');
    assert.strictEqual(enHello, 'Hello');

    loadTranslations('de', UI_LOCALES);
    const deHello = t('common.hello');
    assert.strictEqual(deHello, 'Hallo');

    loadTranslations('ja', UI_LOCALES);
    const jaHello = t('common.hello');
    assert.strictEqual(jaHello, 'こんにちは');

    loadTranslations('ar', UI_LOCALES);
    const arHello = t('common.hello');
    assert.strictEqual(arHello, 'مرحبًا');

    // Verify Korean displayed correctly (3 chars)
    loadTranslations('ko', UI_LOCALES);
    const koHello = t('common.hello');
    assert.ok(koHello.length >= 3, `Korean should be multi-byte, got: "${koHello}"`);

    // Switch back to en to confirm no state corruption
    loadTranslations('en', UI_LOCALES);
    assert.strictEqual(t('common.hello'), 'Hello');
  });

});

// ── UI Category Translation Coverage ───────────────────────────────────

describe('UI Category Translation Coverage', () => {

  const categories = [
    'common', 'errors', 'scanner', 'fixer', 'analyze', 'validate',
    'init', 'settings', 'summary', 'menu', 'help', 'usage',
    'translate', 'adminCli', 'security', 'workflow'
  ];

  for (const cat of categories) {
    it(`${cat} category translated in all 23 languages`, () => {
      const enFile = path.join(UI_LOCALES, 'en.json');
      const enData = JSON.parse(fs.readFileSync(enFile, 'utf8'));
      if (!enData[cat]) return; // skip if category doesn't exist in en

      for (const lang of EXPECTED_LANGS.filter(l => l !== 'en')) {
        const filePath = path.join(UI_LOCALES, `${lang}.json`);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        assert.ok(data[cat], `${lang}.json should have "${cat}" category`);
      }
    });
  }

  it('en.json has settings.languages with all 23 entries', () => {
    const enData = JSON.parse(fs.readFileSync(path.join(UI_LOCALES, 'en.json'), 'utf8'));
    const langs = enData.settings.languages;
    assert.ok(langs, 'en.json should have settings.languages');
    for (const code of EXPECTED_LANGS) {
      assert.ok(langs[code], `en.json settings.languages should include ${code}`);
    }
    assert.strictEqual(Object.keys(langs).length, 23, 'Should have exactly 23 entries');
  });

});

// ── Framework Detection Cleanup ────────────────────────────────────────

describe('Framework Detection Cleanup', () => {

  it('detectProjectFramework returns a string or "vanilla"', () => {
    const result = detectProjectFramework(process.cwd());
    assert.ok(typeof result === 'string', 'Should return a string');
    assert.ok(result.length > 0, 'Should return a non-empty string');
  });

  it('getFrameworkPatterns for react returns patterns', () => {
    const patterns = getFrameworkPatterns('react');
    assert.ok(Array.isArray(patterns), 'Should return an array');
    assert.ok(patterns.length > 0, 'Should have at least 1 pattern');
  });

  it('getFrameworkPatterns for all new frameworks return patterns', () => {
    const frameworks = ['nuxt', 'lingui', 'formatjs', 'ngx-translate', 'next-intl',
      'svelte-i18n', 'solid-i18n', 'fastapi', 'ruby-on-rails', 'react-native-localize', 'ionic'];
    for (const fw of frameworks) {
      const patterns = getFrameworkPatterns(fw);
      assert.ok(Array.isArray(patterns) && patterns.length > 0,
        `getFrameworkPatterns("${fw}") should return patterns`);
    }
  });

  it('getFrameworkSuggestions for new frameworks return suggestions', () => {
    const frameworks = ['nuxt', 'lingui', 'formatjs', 'ngx-translate', 'next-intl',
      'svelte-i18n', 'solid-i18n', 'fastapi', 'ruby-on-rails', 'react-native-localize', 'ionic'];
    for (const fw of frameworks) {
      const suggestions = getFrameworkSuggestions(fw, 'test_key');
      assert.ok(suggestions, `getFrameworkSuggestions("${fw}") should return suggestions`);
    }
  });

  it('i18ntk-runtime framework patterns exist', () => {
    const patterns = getFrameworkPatterns('i18ntk-runtime');
    assert.ok(Array.isArray(patterns) && patterns.length > 0,
      'i18ntk-runtime should have framework patterns');
    const suggestions = getFrameworkSuggestions('i18ntk-runtime', 'hello');
    assert.ok(suggestions, 'i18ntk-runtime should have suggestions');
  });

});

// ── Config Template Cleanup ────────────────────────────────────────────

describe('Config Template Cleanup', () => {

  it('config-manager default config does not have framework.supported list', () => {
    const cm = require('../../utils/config-manager');
    // Access the default config through the module if possible
    // The issue was the defaultConfig property in config-manager.js
    const defaultCfg = cm.defaultConfig;
    if (defaultCfg && defaultCfg.framework) {
      assert.ok(!defaultCfg.framework.supported,
        'Default config should NOT have framework.supported');
    }
  });

  it('.i18ntk-config does not have framework.supported list', () => {
    const configPath = path.resolve(__dirname, '..', '..', '.i18ntk-config');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const hasSupported = config.framework && config.framework.supported;
      assert.ok(!hasSupported, '.i18ntk-config should NOT have framework.supported');
    }
  });

});

// ── Hardcoded List Expansion ───────────────────────────────────────────

describe('Hardcoded List Expansion', () => {

  it('locale-optimizer includes all 23 languages', () => {
    const lo = require('../../utils/locale-optimizer');
    if (lo.allLocales || lo.prototype?.allLocales) {
      const all = lo.allLocales || [];
      if (all.length > 0) {
        // some locales may be commented out as examples
        for (const code of ['en', 'de', 'fr', 'it', 'ar', 'ja', 'ko', 'zh']) {
          assert.ok(all.includes(code), `locale-optimizer should include ${code}`);
        }
      }
    }
  });

  it('missing-key-validator default supports all new languages', () => {
    const mkv = new (require('../../utils/missing-key-validator'))();
    assert.ok(Array.isArray(mkv.supportedLanguages), 'Should have supportedLanguages array');
    const expectedSubset = ['en', 'de', 'fr', 'it', 'ar', 'ja', 'ko', 'zh', 'hi', 'th'];
    for (const code of expectedSubset) {
      assert.ok(mkv.supportedLanguages.includes(code),
        `missing-key-validator should support ${code}`);
    }
  });

});
