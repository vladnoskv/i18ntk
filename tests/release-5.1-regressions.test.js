'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
const FIXER = path.join(ROOT, 'main', 'i18ntk-fixer.js');
const VALIDATOR = path.join(ROOT, 'main', 'i18ntk-validate.js');
const FixerCommand = require('../main/manage/commands/FixerCommand');
const { parseCommonArgs } = require('../utils/config-helper');
const { analyzeTranslationCompleteness, completionPercentage } = require('../utils/translation-quality');
const I18nUsageAnalyzer = require('../main/i18ntk-usage');

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMinimalConfig(projectRoot, overrides = {}) {
  writeJson(path.join(projectRoot, '.i18ntk-config'), {
    version: '5.1.0',
    setup: { completed: true, version: '5.1.0' },
    sourceDir: './locales',
    i18nDir: './locales',
    sourceLanguage: 'en',
    defaultLanguages: ['en', 'fr'],
    ...overrides
  });
}

function run(script, args, cwd) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 20000,
    env: { ...process.env, CI: 'true', NO_COLOR: '1' }
  });
}

test('common JSON flags are parsed centrally with bounded indentation', () => {
  assert.deepEqual(parseCommonArgs(['--json', '--indent=0']), { json: true, indent: 0 });
  assert.equal(parseCommonArgs(['--indent=99']).indent, 2);
  const paths = parseCommonArgs(['--code-dir', './src', '--locales-dir', './locales']);
  assert.equal(paths.codeDir, './src');
  assert.equal(paths.i18nDir, './locales');
});

test('fixer uses the locale root, ignores source folders, filters requested locales, and emits only JSON', () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-51-fixer-'));
  try {
    writeMinimalConfig(project, { sourceDir: './src', i18nDir: './locales' });
    for (const folder of ['app', 'components', 'lib']) {
      writeJson(path.join(project, 'src', folder, 'fixture.json'), { label: 'Not a locale' });
    }
    writeJson(path.join(project, 'locales', 'en', 'common.json'), { hello: 'Hello' });
    writeJson(path.join(project, 'locales', 'fr', 'common.json'), { hello: 'Bonjour' });
    writeJson(path.join(project, 'locales', 'pt-BR', 'common.json'), { hello: 'Olá' });

    const result = run(FIXER, [
      '--code-dir=./src', '--locales-dir=./locales', '--source-locale=en',
      '--languages=fr', '--dry-run', '--json', '--indent=0', '--no-prompt'
    ], project);

    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.stats.languages, 1);
    assert.equal(output.status, 'info');
    assert.doesNotMatch(result.stdout, /Starting translation fixing|Source directory:/);
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('fixer placeholder mode scans the locale root and invalid locale layouts fail', () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-51-placeholder-'));
  try {
    writeMinimalConfig(project, { sourceDir: './src', i18nDir: './locales' });
    writeJson(path.join(project, 'src', 'app', 'copy.json'), { label: 'Application source' });
    writeJson(path.join(project, 'locales', 'en', 'common.json'), { label: '[FR] Label' });

    const placeholder = run(FIXER, [
      '--code-dir=./src', '--locales-dir=./locales', '--source-locale=en',
      '--check-placeholders', '--dry-run', '--json', '--no-prompt'
    ], project);
    assert.notEqual(placeholder.status, 0);
    const placeholderOutput = JSON.parse(placeholder.stdout);
    assert.equal(placeholderOutput.stats.files, 1);
    assert.equal(placeholderOutput.stats.placeholders, 1);

    writeMinimalConfig(project, { sourceDir: './src', i18nDir: './src' });
    const invalid = run(FIXER, ['--locales-dir=./src', '--source-locale=en', '--dry-run', '--json', '--no-prompt'], project);
    assert.notEqual(invalid.status, 0);
    assert.ok(invalid.stdout.trim(), invalid.stderr);
    assert.match(JSON.parse(invalid.stdout).message, /No JSON locale files found/);
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('fixer repairs monolith locale files using matching logical paths', async () => {
  const localeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-51-monolith-'));
  try {
    writeJson(path.join(localeRoot, 'en.json'), { hello: 'Hello', nested: { label: 'Label' } });
    writeJson(path.join(localeRoot, 'fr.json'), { hello: '', nested: {} });
    const command = new FixerCommand({
      sourceDir: localeRoot,
      sourceLanguage: 'en',
      notTranslatedMarker: 'NOT_TRANSLATED',
      backup: { enabled: false }
    });
    command.sourceDir = localeRoot;

    const result = await command.fixLanguage('fr');
    assert.equal(result.fixedIssues, 2);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(localeRoot, 'fr.json'), 'utf8')), {
      hello: 'Hello', nested: { label: 'Label' }
    });
  } finally {
    fs.rmSync(localeRoot, { recursive: true, force: true });
  }
});

test('validator defaults outputDir and reports 100% for matching non-string leaves', () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-51-validator-'));
  try {
    writeMinimalConfig(project);
    const source = {
      group: { first: 'Hello', second: 'World', count: 2, enabled: true, empty: null, choices: ['One', 'Two'] }
    };
    const target = {
      group: { first: 'Bonjour', second: 'Monde', count: 2, enabled: true, empty: null, choices: ['Un', 'Deux'] }
    };
    writeJson(path.join(project, 'locales', 'en', 'common.json'), source);
    writeJson(path.join(project, 'locales', 'fr', 'common.json'), target);

    const result = run(VALIDATOR, ['--source-dir=./locales', '--source-locale=en', '--json', '--no-prompt'], project);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.data.results.fr.summary.percentage, 100);
    assert.equal(output.data.results.fr.summary.sourceTotalKeys, 4);
    assert.equal(output.data.results.fr.summary.translatedKeys, 4);
    assert.doesNotMatch(result.stdout, /Source directory:/);
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('validation and usage agree on incomplete markers without rounding up to 100%', () => {
  const translations = {
    sourceCopy: '[FR] Source copy',
    empty: '',
    partial: 'Prefix NOT_TRANSLATED suffix',
    legitimateSameValue: 'same',
    nestedArray: ['Traduit', '(NOT TRANSLATED)']
  };
  const markers = ['NOT_TRANSLATED', '(NOT TRANSLATED)'];
  const shared = analyzeTranslationCompleteness(translations, { markers });
  const usage = new I18nUsageAnalyzer({ notTranslatedMarkers: markers }).analyzeFileCompleteness(translations);
  assert.deepEqual({ total: usage.total, translated: usage.translated }, { total: shared.total, translated: shared.translated });
  assert.equal(shared.total, 6);
  assert.equal(shared.translated, 2);
  assert.equal(completionPercentage(999, 1000), 99.9);
  assert.equal(completionPercentage(1000, 1000), 100);
});

test('strict validator exits non-zero for incomplete translation values', () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-511-strict-validator-'));
  try {
    writeMinimalConfig(project);
    writeJson(path.join(project, 'locales', 'en', 'common.json'), { one: 'One', two: 'Two', three: 'Three' });
    writeJson(path.join(project, 'locales', 'fr', 'common.json'), { one: '[FR] One', two: '', three: 'NOT_TRANSLATED' });
    const result = run(VALIDATOR, ['--source-dir=./locales', '--source-locale=en', '--strict', '--json', '--no-prompt'], project);
    assert.notEqual(result.status, 0, result.stdout);
    const output = JSON.parse(result.stdout);
    assert.equal(output.data.results.fr.summary.percentage, 0);
    assert.ok(output.stats.errors >= 3);
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});
