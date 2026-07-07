'use strict';
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  detectFramework,
  detectProjectFramework,
  FRAMEWORKS,
  FRAMEWORK_COMPATIBILITY,
  SOURCE_EXTENSIONS,
  SCANNER_EXTENSIONS,
  getFrameworkPatterns,
  getFrameworkSuggestions,
  FRAMEWORK_PATTERNS,
  FRAMEWORK_SUGGESTIONS,
  WRAPPER_SKIP_PATTERNS
} = require('../../utils/framework-detector');

const SANDBOX = __dirname;

function fixture(name) {
  return path.join(SANDBOX, name);
}

describe('Framework Detection Sandbox', () => {

  it('detects react-i18next from package.json', () => {
    const result = detectFramework(fixture('react-i18next'));
    assert.ok(result, 'Should detect a framework');
    assert.strictEqual(result.id, 'react-i18next');
    assert.ok(result.confidence > 0);
    assert.ok(result.version);
  });

  it('detects vue-i18n from package.json', () => {
    const result = detectFramework(fixture('vue'));
    assert.ok(result);
    assert.strictEqual(result.id, 'vue-i18n');
  });

  it('detects ngx-translate from package.json', () => {
    const result = detectFramework(fixture('angular'));
    assert.ok(result);
    assert.strictEqual(result.id, 'ngx-translate');
  });

  it('detects Django from requirements.txt', () => {
    const result = detectFramework(fixture('django'));
    assert.ok(result);
    assert.strictEqual(result.id, 'django');
  });

  it('detects Flask from requirements.txt', () => {
    const result = detectFramework(fixture('flask'));
    assert.ok(result);
    assert.strictEqual(result.id, 'flask');
  });

  it('detects Rust from Cargo.toml', () => {
    const result = detectFramework(fixture('rust'));
    assert.ok(result);
    assert.strictEqual(result.id, 'rust');
  });

  it('detects Go from go.mod', () => {
    const result = detectFramework(fixture('go'));
    assert.ok(result);
    assert.strictEqual(result.id, 'go');
  });

  it('detects Rails from Gemfile', () => {
    const result = detectFramework(fixture('rails'));
    assert.ok(result);
    assert.strictEqual(result.id, 'ruby-on-rails');
  });

  it('detects Nuxt from package.json', () => {
    const result = detectFramework(fixture('nuxt'));
    assert.ok(result);
    assert.strictEqual(result.id, 'nuxt-i18n');
  });

  it('detects next-intl from package.json', () => {
    const result = detectFramework(fixture('next-intl'));
    assert.ok(result);
    assert.strictEqual(result.id, 'next-intl');
  });

  it('detects svelte-i18n from package.json', () => {
    const result = detectFramework(fixture('svelte'));
    assert.ok(result);
    assert.strictEqual(result.id, 'svelte-i18n');
  });

  it('returns null for vanilla project with no i18n deps', () => {
    const result = detectFramework(fixture('vanilla'));
    assert.strictEqual(result, null);
  });

  it('detectProjectFramework returns "vanilla" when no framework found', () => {
    const result = detectProjectFramework(fixture('vanilla'));
    assert.strictEqual(result, 'vanilla');
  });

  it('detectProjectFramework returns framework id when found', () => {
    const result = detectProjectFramework(fixture('react-i18next'));
    assert.strictEqual(result, 'react-i18next');
  });

  it('throws on invalid projectRoot', () => {
    assert.throws(() => detectFramework(null), /Invalid project root/);
    assert.throws(() => detectFramework(123), /Invalid project root/);
  });

});

// Alias map: FRAMEWORKS key -> FRAMEWORK_PATTERNS / FRAMEWORK_SUGGESTIONS key
const FRAMEWORK_KEY_ALIAS = {
  'react-i18next': 'react',
  'vue-i18n': 'vue',
  'i18next': 'vanilla',
  'nuxt-i18n': 'nuxt',
  'ember-intl': 'ember',
  'next-intl': 'next',
  'react-native-localize': 'react-native-localize',
};

describe('FRAMEWORK_PATTERNS coverage', () => {
  const expectedFrameworkKeys = Object.keys(FRAMEWORKS).filter(k => !k.startsWith('_'));

  for (const key of expectedFrameworkKeys) {
    it(`has FRAMEWORK_PATTERNS entry for "${key}"`, () => {
      const alias = FRAMEWORK_KEY_ALIAS[key] || key;
      const patterns = FRAMEWORK_PATTERNS[alias];
      assert.ok(Array.isArray(patterns) && patterns.length > 0,
        `No patterns found for "${key}" (alias: ${alias})`);
    });
  }
});

describe('FRAMEWORK_SUGGESTIONS coverage', () => {
  const expectedFrameworkKeys = Object.keys(FRAMEWORKS).filter(k => !k.startsWith('_'));

  for (const key of expectedFrameworkKeys) {
    it(`has FRAMEWORK_SUGGESTIONS entry for "${key}"`, () => {
      const alias = FRAMEWORK_KEY_ALIAS[key] || key;
      const suggestions = FRAMEWORK_SUGGESTIONS[alias];
      assert.ok(suggestions, `No suggestions for "${key}" (alias: ${alias})`);
    });
  }
});

describe('FRAMEWORK_COMPATIBILITY coverage', () => {
  const expectedKeys = Object.keys(FRAMEWORKS).filter(k => !k.startsWith('_'));
  for (const key of expectedKeys) {
    it(`has FRAMEWORK_COMPATIBILITY entry for "${key}"`, () => {
      assert.ok(FRAMEWORK_COMPATIBILITY[key], `Missing compatibility entry for "${key}"`);
      assert.ok(FRAMEWORK_COMPATIBILITY[key].minVersion, `Missing minVersion for "${key}"`);
    });
  }
});

describe('WRAPPER_SKIP_PATTERNS coverage', () => {
  it('includes patterns for detected frameworks', () => {
    const patterns = WRAPPER_SKIP_PATTERNS;
    // Should cover the most common wrappers
    const required = ['t(', 'i18n.t(', '$t(', '_('];
    for (const r of required) {
      assert.ok(patterns.some(p => p.startsWith(r)), `Missing "${r}*" in WRAPPER_SKIP_PATTERNS`);
    }
    // Should cover all the new framework entries
    const wrappers = ['I18n.t(', 'useTranslate(', 't.get(', '$tc(', 'translateService.instant('];
    for (const w of wrappers) {
      assert.ok(patterns.includes(w), `Missing "${w}" in WRAPPER_SKIP_PATTERNS`);
    }
  });
});

describe('SCANNER_EXTENSIONS coverage', () => {
  it('includes all language extensions', () => {
    const exts = [...SCANNER_EXTENSIONS];
    const required = ['.js', '.ts', '.py', '.go', '.rs', '.rb', '.java', '.php', '.vue', '.svelte', '.astro'];
    for (const r of required) {
      assert.ok(exts.includes(r), `Missing "${r}" in SCANNER_EXTENSIONS`);
    }
  });
});

describe('getFrameworkPatterns fallback', () => {
  it('returns patterns for known frameworks', () => {
    const patterns = getFrameworkPatterns('react');
    assert.ok(Array.isArray(patterns));
    assert.ok(patterns.length > 0);
  });

  it('falls back to vanilla for unknown frameworks', () => {
    const patterns = getFrameworkPatterns('nonexistent_framework_xyz');
    assert.ok(Array.isArray(patterns));
    assert.ok(patterns.length > 0);
  });

  it('returns patterns for all FRAMEWORKS keys', () => {
    const keys = ['vanilla', ...Object.keys(FRAMEWORK_PATTERNS)];
    for (const key of keys) {
      const patterns = getFrameworkPatterns(key);
      assert.ok(Array.isArray(patterns), `getFrameworkPatterns("${key}") should return array`);
      assert.ok(patterns.length > 0, `getFrameworkPatterns("${key}") should have at least 1 pattern`);
    }
  });
});

describe('getFrameworkSuggestions', () => {
  it('returns suggestions for known frameworks', () => {
    const suggestions = getFrameworkSuggestions('react', 'Hello World');
    assert.ok(suggestions);
    assert.ok(suggestions.hook || suggestions.usage || suggestions.component);
  });

  it('uses key snippet in suggestions', () => {
    const suggestions = getFrameworkSuggestions('react', 'Click Me');
    assert.ok(suggestions.usage.includes('click_me') || suggestions.usage.includes('Click_Me'));
  });

  it('falls back to vanilla for unknown frameworks', () => {
    const suggestions = getFrameworkSuggestions('nonexistent', 'text');
    assert.ok(suggestions);
    assert.ok(suggestions.generic);
  });
});
