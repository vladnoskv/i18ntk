const assert = require('assert');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { test } = require('node:test');

const completeScript = path.resolve(__dirname, '..', 'main', 'i18ntk-complete.js');

test('complete command fills missing target keys with language-prefixed English source values', () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-complete-'));

  try {
    const localesDir = path.join(projectRoot, 'locales');
    fs.mkdirSync(path.join(localesDir, 'en'), { recursive: true });
    fs.mkdirSync(path.join(localesDir, 'de'), { recursive: true });

    fs.writeFileSync(path.join(projectRoot, '.i18ntk-config'), JSON.stringify({
      version: '3.3.0',
      sourceDir: './locales',
      i18nDir: './locales',
      outputDir: './i18ntk-reports',
      sourceLanguage: 'en',
      defaultLanguages: ['de'],
      setup: { completed: true },
      security: { adminPinEnabled: false, pinProtection: { enabled: false, protectedScripts: {} } },
      processing: { excludeFiles: [] }
    }, null, 2));

    fs.writeFileSync(path.join(localesDir, 'en', 'common.json'), JSON.stringify({
      navigation: {
        home: 'Home'
      }
    }, null, 2));
    fs.writeFileSync(path.join(localesDir, 'de', 'common.json'), JSON.stringify({}, null, 2));

    execFileSync(process.execPath, [completeScript, '--source-dir=./locales', '--no-prompt'], {
      cwd: projectRoot,
      env: { ...process.env, NO_INTERACTIVE: 'true' },
      encoding: 'utf8'
    });

    const generated = JSON.parse(fs.readFileSync(path.join(localesDir, 'de', 'navigation.json'), 'utf8'));
    assert.strictEqual(generated.home, '[DE] Home');
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('complete command fills missing monolith locale file keys from en.json', () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-complete-monolith-'));

  try {
    const localesDir = path.join(projectRoot, 'locales');
    fs.mkdirSync(localesDir, { recursive: true });

    fs.writeFileSync(path.join(projectRoot, '.i18ntk-config'), JSON.stringify({
      version: '3.3.0',
      sourceDir: './locales',
      i18nDir: './locales',
      outputDir: './i18ntk-reports',
      sourceLanguage: 'en',
      defaultLanguages: ['de'],
      setup: { completed: true },
      security: { adminPinEnabled: false, pinProtection: { enabled: false, protectedScripts: {} } },
      processing: { excludeFiles: [] }
    }, null, 2));

    fs.writeFileSync(path.join(localesDir, 'en.json'), JSON.stringify({
      home: 'Home'
    }, null, 2));
    fs.writeFileSync(path.join(localesDir, 'de.json'), JSON.stringify({}, null, 2));

    execFileSync(process.execPath, [completeScript, '--source-dir=./locales', '--no-prompt'], {
      cwd: projectRoot,
      env: { ...process.env, NO_INTERACTIVE: 'true' },
      encoding: 'utf8'
    });

    const generated = JSON.parse(fs.readFileSync(path.join(localesDir, 'de.json'), 'utf8'));
    assert.strictEqual(generated.home, '[DE] Home');
    assert.strictEqual(fs.existsSync(path.join(localesDir, 'de', 'common.json')), false);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});
