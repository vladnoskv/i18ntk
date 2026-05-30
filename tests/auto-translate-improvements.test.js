const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

function makeTempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-auto-translate-'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n');
}

function defaultTranslateArgs(overrides = {}) {
  return {
    customRegex: [],
    noConfirm: true,
    preservePlaceholders: false,
    skipPlaceholders: false,
    sendPlaceholders: false,
    protectionFile: './i18ntk-auto-translate.json',
    protectionEnabled: false,
    createProtectionFile: false,
    concurrency: 2,
    batchSize: 10,
    progressInterval: 1000,
    dryRun: false,
    reportFile: null,
    reportStdout: false,
    bom: false,
    translateFnPath: null,
    retryCount: 1,
    retryDelay: 0,
    timeout: 1000,
    sourceLang: 'en',
    provider: 'custom',
    unknown: [],
    ...overrides,
  };
}

test('auto translate preserves existing translated values and only sends missing or English target values', async () => {
  const { processFile } = require('../main/i18ntk-translate');
  const cwd = process.cwd();
  const project = makeTempProject();
  const sourceFile = path.join(project, 'locales', 'en', 'common.json');
  const targetDir = path.join(project, 'locales', 'de');
  const targetFile = path.join(targetDir, 'common.json');
  const calls = [];

  writeJson(sourceFile, {
    title: 'Welcome',
    cta: 'Start now',
    missing: 'Continue',
    nested: {
      saved: 'Saved',
    },
  });
  writeJson(targetFile, {
    title: 'Willkommen',
    cta: 'Start now',
    nested: {
      saved: 'Gespeichert',
    },
  });

  try {
    process.chdir(project);
    const result = await processFile(sourceFile, 'de', defaultTranslateArgs({
      outputDir: targetDir,
      translateFn: async (text) => {
        calls.push(text);
        return `[de] ${text}`;
      },
      englishThresholdPercent: 10,
    }));

    const output = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
    assert.deepEqual(calls.sort(), ['Continue', 'Start now'].sort());
    assert.equal(output.title, 'Willkommen');
    assert.equal(output.cta, '[de] Start now');
    assert.equal(output.missing, '[de] Continue');
    assert.equal(output.nested.saved, 'Gespeichert');
    assert.equal(result.translated, 2);
    assert.equal(result.skipped, 0);
    assert.equal(result.skippedExisting, 2);
  } finally {
    process.chdir(cwd);
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('auto translate retranslates visibly broken target values from the English source', async () => {
  const { processFile } = require('../main/i18ntk-translate');
  const cwd = process.cwd();
  const project = makeTempProject();
  const sourceFile = path.join(project, 'locales', 'en', 'common.json');
  const targetDir = path.join(project, 'locales', 'de');
  const targetFile = path.join(targetDir, 'common.json');
  const calls = [];

  writeJson(sourceFile, {
    questionMarks: 'Open settings',
    singleQuestionMark: 'Yes',
    questionMarksWithPlaceholder: 'Report generated',
    replacement: 'Save changes',
    mojibake: 'Delete report',
    valid: 'Project status',
  });
  writeJson(targetFile, {
    questionMarks: '?????',
    singleQuestionMark: '?',
    questionMarksWithPlaceholder: '???????????: {reportPath}',
    replacement: 'Speichern \uFFFD',
    mojibake: 'Ð\x9EÑ\x82Ñ\x87ÐµÑ\x82',
    valid: 'Projektstatus',
  });

  try {
    process.chdir(project);
    const result = await processFile(sourceFile, 'de', defaultTranslateArgs({
      outputDir: targetDir,
      translateFn: async (text) => {
        calls.push(text);
        return `[de] ${text}`;
      },
    }));

    const output = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
    assert.deepEqual(calls.sort(), ['Delete report', 'Open settings', 'Report generated', 'Save changes', 'Yes'].sort());
    assert.equal(output.questionMarks, '[de] Open settings');
    assert.equal(output.singleQuestionMark, '[de] Yes');
    assert.equal(output.questionMarksWithPlaceholder, '[de] Report generated');
    assert.equal(output.replacement, '[de] Save changes');
    assert.equal(output.mojibake, '[de] Delete report');
    assert.equal(output.valid, 'Projektstatus');
    assert.equal(result.translated, 5);
    assert.equal(result.skippedExisting, 1);
  } finally {
    process.chdir(cwd);
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('auto translate progress output names keys and placeholder segment stages separately', async () => {
  const { processFile } = require('../main/i18ntk-translate');
  const cwd = process.cwd();
  const project = makeTempProject();
  const sourceFile = path.join(project, 'locales', 'en', 'common.json');
  const targetDir = path.join(project, 'locales', 'de');
  const writes = [];
  const originalWrite = process.stdout.write;

  writeJson(sourceFile, {
    cta: 'Start now',
    greeting: 'Hello {name}',
  });

  try {
    process.chdir(project);
    process.stdout.write = (chunk, ...args) => {
      writes.push(String(chunk));
      return originalWrite.call(process.stdout, chunk, ...args);
    };
    await processFile(sourceFile, 'de', defaultTranslateArgs({
      outputDir: targetDir,
      progressInterval: 1,
      translateFn: async (text) => `[de] ${text}`,
    }));

    const output = writes.join('');
    assert.match(output, /Translating strings: 1\/1 strings .*cta/);
    assert.match(output, /Translating placeholder-safe text segments: 1\/1 segments .*greeting#segment0/);
  } finally {
    process.stdout.write = originalWrite;
    process.chdir(cwd);
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('placeholder detection covers common ICU and framework interpolation formats', () => {
  const {
    detectPlaceholders,
    splitByPlaceholders,
  } = require('../utils/translate/placeholder');

  const value = 'Cart {count, plural, one {# item} other {# items}} for {{- user}}, %1$s, %(total).2f, and $t(common.save)';
  const placeholders = detectPlaceholders(value);

  assert.ok(placeholders.includes('{count, plural, one {# item} other {# items}}'));
  assert.ok(placeholders.includes('{{- user}}'));
  assert.ok(placeholders.includes('%1$s'));
  assert.ok(placeholders.includes('%(total).2f'));
  assert.ok(placeholders.includes('$t(common.save)'));

  const parts = splitByPlaceholders(value);
  assert.ok(parts.some(part => part.type === 'placeholder' && part.value === '{count, plural, one {# item} other {# items}}'));
});

test('managed auto translate does not force the UI locale back to English', async () => {
  const helperPath = require.resolve('../utils/i18n-helper');
  const commandPath = require.resolve('../main/manage/commands/TranslateCommand');
  const setupPath = require.resolve('../utils/setup-enforcer');
  const helper = require(helperPath);
  const setup = require(setupPath);
  const originalLoad = helper.loadTranslations;
  const originalCheck = setup.checkSetupCompleteAsync;
  const calls = [];
  const project = makeTempProject();

  writeJson(path.join(project, 'locales', 'en', 'common.json'), { hello: 'Hello' });

  try {
    helper.loadTranslations = (language, localeDir) => {
      calls.push({ language, localeDir });
      return true;
    };
    setup.checkSetupCompleteAsync = async () => true;
    delete require.cache[commandPath];
    const TranslateCommand = require('../main/manage/commands/TranslateCommand');
    const command = new TranslateCommand({
      sourceDir: path.join(project, 'locales'),
      sourceLanguage: 'en',
      uiLanguage: 'zh',
      defaultLanguages: ['de'],
      autoTranslate: { dryRunFirst: false },
    });
    command.setRuntimeDependencies(null, true, null);

    await command.execute({});

    assert.equal(calls.some(call => call.language === 'en'), false);
    assert.equal(calls.some(call => call.language === 'zh'), true);
  } finally {
    helper.loadTranslations = originalLoad;
    setup.checkSetupCompleteAsync = originalCheck;
    delete require.cache[commandPath];
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('auto translate UI labels are localized and no longer marked beta', () => {
  const uiLocalesDir = path.resolve(__dirname, '..', 'ui-locales');
  const english = JSON.parse(fs.readFileSync(path.join(uiLocalesDir, 'en.json'), 'utf8'));

  function collectStrings(value, prefix = '', results = []) {
    if (typeof value === 'string') {
      results.push({ key: prefix, value });
    } else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        collectStrings(child, prefix ? `${prefix}.${key}` : key, results);
      }
    }
    return results;
  }

  const requiredKeys = collectStrings(english)
    .filter(entry => entry.key.startsWith('translate.')
      || entry.key === 'settings.mainMenu.autoTranslate'
      || entry.key === 'settings.mainMenu.autoTranslateDesc'
      || entry.key === 'settings.categories.autoTranslate'
      || /^settings\.fields\.autoTranslate_/.test(entry.key))
    .map(entry => entry.key);

  for (const file of fs.readdirSync(uiLocalesDir).filter(name => name.endsWith('.json'))) {
    const data = JSON.parse(fs.readFileSync(path.join(uiLocalesDir, file), 'utf8'));
    for (const key of requiredKeys) {
      const value = key.split('.').reduce((current, part) => current && current[part], data);
      assert.ok(value, `${file} missing ${key}`);
    }
    const translateStrings = collectStrings(data)
      .filter(entry => /(^|\.)(translate|translateCommand)$/.test(entry.key) || /auto translate/i.test(entry.value));
    for (const entry of translateStrings) {
      assert.doesNotMatch(entry.value, /beta|bêta|бета|ベータ|测试版/i, `${file} ${entry.key} still says beta`);
    }
  }
});
