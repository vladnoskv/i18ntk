const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('localized confirmation accepts native yes/no tokens with English fallback', () => {
  const { parseConfirmation } = require('../utils/localized-confirm');

  assert.equal(parseConfirmation('\u662f', { language: 'zh', defaultValue: false }), true);
  assert.equal(parseConfirmation('\u5426', { language: 'zh', defaultValue: true }), false);
  assert.equal(parseConfirmation('\u306f\u3044', { language: 'ja', defaultValue: false }), true);
  assert.equal(parseConfirmation('\u3044\u3044\u3048', { language: 'ja', defaultValue: true }), false);
  assert.equal(parseConfirmation('s\u00ed', { language: 'es', defaultValue: false }), true);
  assert.equal(parseConfirmation('no', { language: 'es', defaultValue: true }), false);
  assert.equal(parseConfirmation('yes', { language: 'ru', defaultValue: false }), true);
  assert.equal(parseConfirmation('', { language: 'ru', defaultValue: true }), true);
});

test('report writer defaults to readable markdown and pretty json', () => {
  const { buildReportFile, formatReportContent } = require('../utils/report-writer');
  const textReport = 'TITLE\n=====\n\nBody line';
  const objectReport = { title: 'Init Report', summary: { languagesProcessed: 2 } };

  assert.equal(buildReportFile('translation-report-de', 'markdown').fileName, 'translation-report-de.md');
  assert.equal(formatReportContent(textReport, 'markdown'), `${textReport}\n`);

  const json = formatReportContent(objectReport, 'json');
  assert.match(json, /{\n  "title": "Init Report"/);
  assert.doesNotMatch(json, /\\n/);
});

test('usage source resolver does not scan project root when locales are also the source dir', () => {
  const { resolveUsageSourceDir } = require('../utils/usage-source');
  const projectRoot = path.resolve(__dirname, '..');
  const localesDir = path.join(projectRoot, 'locales');

  const resolved = resolveUsageSourceDir({
    sourceDir: localesDir,
    i18nDir: localesDir,
    projectRoot,
    explicitSourceDir: false,
  });

  assert.equal(resolved.sourceDir, null);
  assert.equal(resolved.disabled, true);
  assert.match(resolved.reason, /sourceDir equals i18nDir/);
});

test('initializer defaults include English as a target language', () => {
  const I18nInitializer = require('../main/i18ntk-init');
  const initializer = new I18nInitializer({});

  assert.deepEqual(initializer.config.defaultLanguages, ['en', 'de', 'es', 'fr', 'ru']);
});

test('bundled UI locales include setup and prompt text needed by init', () => {
  const uiLocalesDir = path.resolve(__dirname, '..', 'ui-locales');
  const requiredKeys = [
    'init.backup.title',
    'init.backup.description',
    'init.backup.enablePrompt',
    'init.backup.keepPrompt',
    'init.completionSummaryTitle',
    'init.totalChanges',
    'init.languagesProcessed',
    'init.missingKeysAdded',
    'init.reportPrompt',
    'init.reportGenerated',
    'init.reportFailed',
    'init.optimize.title',
    'init.optimize.prompt',
    'init.optimize.completed',
    'init.optimize.unavailable',
    'settings.fields.reports_format.label',
    'settings.fields.reports_format.help',
    'prompt.yesTokens',
    'prompt.noTokens',
  ];

  for (const file of fs.readdirSync(uiLocalesDir).filter(name => name.endsWith('.json'))) {
    const data = JSON.parse(fs.readFileSync(path.join(uiLocalesDir, file), 'utf8'));
    for (const key of requiredKeys) {
      const value = key.split('.').reduce((current, part) => current && current[part], data);
      assert.ok(value, `${file} missing ${key}`);
    }
  }
});

test('manager validate output prints the path block only once', async () => {
  const ValidateCommand = require('../main/manage/commands/ValidateCommand');
  const tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-i18ntk-validate-output-'));
  const localeDir = path.join(tmpDir, 'locales');
  const reportsDir = path.join(tmpDir, 'reports');
  const originalArgv = process.argv;
  const originalLog = console.log;
  const originalError = console.error;
  const lines = [];

  try {
    fs.mkdirSync(path.join(localeDir, 'en'), { recursive: true });
    fs.mkdirSync(path.join(localeDir, 'de'), { recursive: true });
    fs.writeFileSync(path.join(localeDir, 'en', 'common.json'), JSON.stringify({ hello: 'Hello' }, null, 2));
    fs.writeFileSync(path.join(localeDir, 'de', 'common.json'), JSON.stringify({ hello: 'Hallo' }, null, 2));

    process.argv = ['node', 'i18ntk', 'validate'];
    console.log = (...args) => lines.push(args.join(' '));
    console.error = (...args) => lines.push(args.join(' '));

    const command = new ValidateCommand({
      sourceDir: localeDir,
      i18nDir: localeDir,
      outputDir: reportsDir,
      sourceLanguage: 'en',
    });
    command.setRuntimeDependencies(async () => '', false, null);

    await command.execute({ fromMenu: true });

    const output = lines.join('\n');
    const sourceDirLines = output.match(/^📁 Source directory:/gm) || [];
    const i18nDirLines = output.match(/^🌐 I18n directory:/gm) || [];
    const outputDirLines = output.match(/^📤 Output directory:/gm) || [];

    assert.equal(sourceDirLines.length, 1);
    assert.equal(i18nDirLines.length, 1);
    assert.equal(outputDirLines.length, 1);
    assert.doesNotMatch(output, /Source directory:[\s\S]*Source directory:[\s\S]*Source directory:/);
  } finally {
    console.log = originalLog;
    console.error = originalError;
    process.argv = originalArgv;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('usage fallback does not make sizing analyze the application source directory', async () => {
  const UsageService = require('../main/manage/services/UsageService');
  const SizingAnalyzer = require('../main/i18ntk-sizing');
  const configManager = require('../utils/config-manager');
  const tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-i18ntk-usage-sizing-'));
  const localeDir = path.join(tmpDir, 'locales');
  const srcDir = path.join(tmpDir, 'src');
  const reportsDir = path.join(tmpDir, 'reports');
  const originalCwd = process.cwd();
  const originalArgv = process.argv;
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const lines = [];

  try {
    fs.mkdirSync(path.join(localeDir, 'en'), { recursive: true });
    fs.mkdirSync(path.join(localeDir, 'de'), { recursive: true });
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(localeDir, 'en', 'common.json'), JSON.stringify({ hello: 'Hello' }, null, 2));
    fs.writeFileSync(path.join(localeDir, 'de', 'common.json'), JSON.stringify({ hello: 'Hallo' }, null, 2));
    fs.writeFileSync(path.join(srcDir, 'App.js'), "const title = t('common.hello');\n");

    process.chdir(tmpDir);
    process.argv = ['node', 'i18ntk'];
    await configManager.setConfig({
      projectRoot: '.',
      sourceDir: './locales',
      i18nDir: './locales',
      outputDir: './reports',
      sourceLanguage: 'en',
      setup: { completed: true },
      framework: { detected: true },
    });

    console.log = (...args) => lines.push(args.join(' '));
    console.warn = (...args) => lines.push(args.join(' '));
    console.error = (...args) => lines.push(args.join(' '));

    const usage = new UsageService();
    await usage.run({ fromMenu: true });

    const configAfterUsage = configManager.getConfig();
    assert.equal(configAfterUsage.sourceDir, path.join(tmpDir, 'locales'));

    const sizing = new SizingAnalyzer();
    const sizingResult = await sizing.run({ fromMenu: true });
    const output = lines.join('\n');

    assert.equal(sizingResult.success, true);
    assert.match(output, /I18n Sizing Analysis Results/);
    assert.match(output, /en\s+1\s+/);
    assert.doesNotMatch(output, /No translation files found/);
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
    process.argv = originalArgv;
    process.chdir(originalCwd);
    await configManager.resetToDefaults();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('validation summary report includes warning details', () => {
  const ValidateCommand = require('../main/manage/commands/ValidateCommand');
  const tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'tmp-i18ntk-validation-report-'));
  const command = new ValidateCommand({
    outputDir: tmpDir,
    sourceLanguage: 'en',
  });

  try {
    command.addWarning('Possible untranslated English content in sv/xtra-risk.json', {
      key: 'xtra_risk.body.p4',
      value: '[SV] Multiplier and settlement details can be adjusted by platform policy.',
      type: 'english_content',
      englishPercentage: 35.29,
    });

    const reportPath = command.saveValidationSummaryReport({
      sv: { summary: { percentage: 100, translatedKeys: 1, totalKeys: 1 } },
    }, true);

    const report = fs.readFileSync(reportPath, 'utf8');
    assert.match(report, /Warnings: 1/);
    assert.match(report, /Possible untranslated English content in sv\/xtra-risk\.json/);
    assert.match(report, /xtra_risk\.body\.p4/);
    assert.match(report, /english_content/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('main menu layout uses readable grouped spacing and no beta label', () => {
  const { buildMainMenuLines } = require('../utils/menu-layout');
  const locale = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'ui-locales', 'en.json'), 'utf8'));
  const translate = (key) => key.split('.').reduce((current, part) => current && current[part], locale) || key;

  const lines = buildMainMenuLines(translate);
  const blankLineCount = lines.filter(line => line === '').length;
  const output = lines.join('\n');

  assert.ok(blankLineCount >= 4);
  assert.match(output, /^ 1\. /m);
  assert.match(output, /^10\. /m);
  assert.match(output, /^14\. 🌐 Auto Translate$/m);
  assert.doesNotMatch(output, /Beta/i);
});
