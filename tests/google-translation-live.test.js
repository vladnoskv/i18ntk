'use strict';

// This test is opt-in because it makes a real request to Google Translate.
// Run it explicitly with I18NTK_LIVE_TRANSLATION_TEST=1 before a release.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const packageRoot = path.resolve(__dirname, '..');
const scripts = {
  analyze: 'main/i18ntk-analyze.js',
  complete: 'main/i18ntk-complete.js',
  validate: 'main/i18ntk-validate.js',
  usage: 'main/i18ntk-usage.js',
  scanner: 'main/i18ntk-scanner.js',
  translate: 'main/i18ntk-translate.js',
};

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function run(project, script, args = []) {
  const result = spawnSync(process.execPath, [path.join(packageRoot, script), ...args], {
    cwd: project,
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, CI: 'true', I18NTK_DISABLE_AUTOSAVE: 'false' },
  });
  const output = `${result.stdout}\n${result.stderr}`;
  assert.equal(result.status, 0, `${path.basename(script)} failed:\n${output}`);
  return output;
}

test('live Google workflow completes, translates, and reports a new Spanish locale', {
  skip: process.env.I18NTK_LIVE_TRANSLATION_TEST !== '1' && 'set I18NTK_LIVE_TRANSLATION_TEST=1 to make a real provider request',
  timeout: 120000,
}, () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-google-live-'));
  try {
    writeJson(path.join(project, 'package.json'), {
      name: 'i18ntk-google-live', private: true,
      dependencies: { react: '19.0.0', i18next: '24.0.0', 'react-i18next': '15.0.0' },
    });
    writeJson(path.join(project, '.i18ntk-config'), {
      sourceDir: './src', i18nDir: './locales', outputDir: './i18ntk-reports', sourceLanguage: 'en',
      defaultLanguages: ['en', 'es'],
      setup: { completed: true, version: '5.0.0' },
      framework: { preference: 'react-i18next', template: 'node', templateVersion: 1 },
    });
    writeJson(path.join(project, 'locales/en/common.json'), {
      common: {
        welcome: 'Welcome, {{name}}!',
        save: 'Save changes',
        profile: 'Manage your profile',
      },
    });
    writeJson(path.join(project, 'locales/es/common.json'), {
      common: { welcome: '¡Bienvenido, {{name}}!' },
    });
    fs.mkdirSync(path.join(project, 'src'), { recursive: true });
    fs.writeFileSync(path.join(project, 'src', 'app.tsx'), [
      "import { t } from 'i18next';",
      "export const title = t('common.profile');",
      "export const save = t('common.save');",
      "export const heading = 'Your profile settings';",
    ].join('\n'), 'utf8');

    const beforeAnalysis = run(project, scripts.analyze, ['--no-prompt']);
    const beforeUsage = run(project, scripts.usage, ['--no-prompt']);
    assert.match(beforeAnalysis + beforeUsage, /es|Spanish/i);

    run(project, scripts.complete, ['--no-prompt']);
    const completed = JSON.parse(fs.readFileSync(path.join(project, 'locales/es/common.json'), 'utf8'));
    assert.equal(completed.common.save, '[ES] Save changes');
    assert.equal(completed.common.profile, '[ES] Manage your profile');

    run(project, scripts.translate, [
      'locales/en/common.json', 'es', '--provider', 'google', '--no-confirm',
      '--preserve-placeholders', '--report-stdout', '--timeout', '20000',
    ]);
    const translated = JSON.parse(fs.readFileSync(path.join(project, 'locales/es/common.json'), 'utf8'));
    assert.match(translated.common.welcome, /\{\{name\}\}/);
    assert.doesNotMatch(translated.common.save, /^\[ES\]/);
    assert.doesNotMatch(translated.common.profile, /^\[ES\]/);
    assert.notEqual(translated.common.profile, 'Manage your profile');

    const afterAnalysis = run(project, scripts.analyze, ['--no-prompt']);
    const afterUsage = run(project, scripts.usage, ['--no-prompt']);
    const validation = run(project, scripts.validate, ['--no-prompt']);
    const scanner = run(project, scripts.scanner, ['--code-dir=./src', '--output-report', '--no-prompt']);
    assert.match(afterAnalysis + afterUsage + validation, /es|Spanish/i);
    assert.match(scanner, /Found 1 potential hardcoded text instances/);
    assert.doesNotMatch(scanner, /from 'i18next'/);
    const scannerReport = fs.readdirSync(path.join(project, 'i18ntk-reports'))
      .find(file => file.startsWith('text-analysis-') && file.endsWith('.json'));
    assert.ok(scannerReport, 'scanner should create an inspectable JSON report when requested');
    assert.match(fs.readFileSync(path.join(project, 'i18ntk-reports', scannerReport), 'utf8'), /Your profile settings/);
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});
