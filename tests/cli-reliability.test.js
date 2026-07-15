const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const mainDir = path.join(repoRoot, 'main');
const managerScript = path.join(mainDir, 'manage', 'index.js');

function writeConfig(projectRoot, overrides = {}) {
  fs.writeFileSync(path.join(projectRoot, '.i18ntk-config'), JSON.stringify({
    version: '4.5.3',
    sourceDir: './src',
    i18nDir: './locales',
    outputDir: './i18ntk-reports',
    sourceLanguage: 'en',
    defaultLanguages: ['en', 'de'],
    setup: { completed: true },
    security: { adminPinEnabled: false, pinProtection: { enabled: false, protectedScripts: {} } },
    processing: { excludeFiles: [], excludeDirs: ['node_modules', '.git'] },
    ...overrides
  }, null, 2));
}

function makeProject() {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-cli-'));
  fs.mkdirSync(path.join(projectRoot, 'src'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, 'locales', 'en'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, 'locales', 'de'), { recursive: true });
  fs.writeFileSync(path.join(projectRoot, 'src', 'app.js'), "const title = t('home.title');\n");
  fs.writeFileSync(path.join(projectRoot, 'locales', 'en', 'common.json'), JSON.stringify({ home: { title: 'Home' } }, null, 2));
  fs.writeFileSync(path.join(projectRoot, 'locales', 'de', 'common.json'), JSON.stringify({ home: { title: 'Startseite' } }, null, 2));
  writeConfig(projectRoot);
  return projectRoot;
}

function run(script, args, cwd, env = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 20000,
    env: {
      ...process.env,
      CI: 'true',
      NO_COLOR: '1',
      I18NTK_SKIP_NPM_VERSION_CHECK: '1',
      ...env
    }
  });
}

function outputOf(result) {
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}

test('complete --help prints usage and does not run completion', () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-help-'));
  try {
    const result = run(path.join(mainDir, 'i18ntk-complete.js'), ['--help'], projectRoot);
    const output = outputOf(result);
    assert.equal(result.status, 0, output);
    assert.match(result.stdout, /Usage:/);
    assert.match(result.stdout, /i18ntk-complete/);
    assert.doesNotMatch(output, /displayHelp is not defined/);
    assert.doesNotMatch(output, /Error during completion/);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('analyze handles missing target locales with setup guidance instead of crashing', () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-analyze-guidance-'));
  try {
    fs.mkdirSync(path.join(projectRoot, 'locales', 'en'), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'locales', 'en', 'common.json'), JSON.stringify({ hello: 'Hello' }));
    writeConfig(projectRoot, { sourceDir: './locales', i18nDir: './locales' });

    const result = run(path.join(mainDir, 'i18ntk-analyze.js'), [
      '--source-dir', './locales',
      '--i18n-dir', './locales',
      '--output-dir', './i18ntk-reports',
      '--no-prompt'
    ], projectRoot);
    const output = outputOf(result);

    assert.equal(result.status, 0, output);
    assert.doesNotMatch(output, /provideSetupGuidance is not a function/);
    assert.match(output, /No target languages|target languages|add/i);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('manager command route propagates analyze failure and never prints success after failure', () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-manager-fail-'));
  try {
    writeConfig(projectRoot);
    const result = run(managerScript, [
      '--command=analyze',
      '--source-dir', './missing-src',
      '--i18n-dir', './missing-locales',
      '--output-dir', './i18ntk-reports',
      '--no-prompt'
    ], projectRoot);
    const output = outputOf(result);

    assert.notEqual(result.status, 0, output);
    assert.doesNotMatch(output, /Operation completed successfully|Operation completed|completed successfully/i);
    assert.match(output, /failed|not found|No target languages|missing/i);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('summary uses locale aliases, never prints NaN, and reports missing locale roots as argument errors', () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-summary-'));
  try {
    fs.mkdirSync(path.join(projectRoot, 'locales'), { recursive: true });
    writeConfig(projectRoot, { sourceDir: './src', i18nDir: './locales' });

    const empty = run(path.join(mainDir, 'i18ntk-summary.js'), [
      '--locales-dir', './locales',
      '--source-locale', 'en',
      '--no-prompt'
    ], projectRoot);
    const emptyOutput = outputOf(empty);
    assert.notEqual(empty.status, 2, emptyOutput);
    assert.doesNotMatch(emptyOutput, /NaN/);
    assert.match(emptyOutput, /no language|no locale|0/i);

    const missing = run(path.join(mainDir, 'i18ntk-summary.js'), [
      '--locales-dir', './missing-locales',
      '--source-locale', 'en',
      '--no-prompt'
    ], projectRoot);
    assert.equal(missing.status, 2, outputOf(missing));
    assert.match(outputOf(missing), /not found|does not exist|missing/i);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('validate failure output is status-based and never followed by success wording', () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-validate-fail-'));
  try {
    writeConfig(projectRoot, { sourceDir: './src', i18nDir: './missing-locales' });
    const result = run(path.join(mainDir, 'i18ntk-validate.js'), [
      '--locales-dir', './missing-locales',
      '--source-locale', 'en',
      '--no-prompt'
    ], projectRoot);
    const output = outputOf(result);

    assert.notEqual(result.status, 0, output);
    assert.match(output, /failed|not found|missing/i);
    assert.doesNotMatch(output, /Validation process completed successfully|completed successfully/i);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('usage accepts space-separated aliases in CI without prompting', () => {
  const projectRoot = makeProject();
  try {
    const result = run(path.join(mainDir, 'i18ntk-usage.js'), [
      '--code-dir', './src',
      '--locales-dir', './locales',
      '--source-locale', 'en',
      '--no-prompt'
    ], projectRoot);
    const output = outputOf(result);

    assert.equal(result.status, 0, output);
    assert.doesNotMatch(output, /Press Enter to continue/);
    assert.doesNotMatch(output, /paths\[0\].*boolean/);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('scanner writes an inspectable report when --output-report is requested', () => {
  const projectRoot = makeProject();
  try {
    fs.writeFileSync(path.join(projectRoot, 'src', 'app.js'), "export const heading = 'Welcome to your profile';\n");
    const result = run(path.join(mainDir, 'i18ntk-scanner.js'), [
      '--code-dir', './src',
      '--output-report',
      '--no-prompt'
    ], projectRoot);
    const output = outputOf(result);
    const reportDir = path.join(projectRoot, 'i18ntk-reports');
    const reportFile = fs.existsSync(reportDir) && fs.readdirSync(reportDir)
      .find(file => file.startsWith('text-analysis-') && file.endsWith('.json'));

    assert.equal(result.status, 0, output);
    assert.ok(reportFile, output);
    assert.match(fs.readFileSync(path.join(reportDir, reportFile), 'utf8'), /Welcome to your profile/);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});

test('complete summary distinguishes unique source keys from total insertions', () => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-complete-summary-'));
  try {
    const localesDir = path.join(projectRoot, 'locales');
    fs.mkdirSync(path.join(localesDir, 'en'), { recursive: true });
    fs.mkdirSync(path.join(localesDir, 'es'), { recursive: true });
    fs.mkdirSync(path.join(localesDir, 'fr'), { recursive: true });
    fs.writeFileSync(path.join(localesDir, 'en', 'common.json'), JSON.stringify({
      one: 'One',
      two: 'Two',
      three: 'Three'
    }, null, 2));
    fs.writeFileSync(path.join(localesDir, 'es', 'common.json'), JSON.stringify({ one: 'Uno' }, null, 2));
    fs.writeFileSync(path.join(localesDir, 'fr', 'common.json'), JSON.stringify({}, null, 2));
    writeConfig(projectRoot, { sourceDir: './locales', i18nDir: './locales' });

    const result = run(path.join(mainDir, 'i18ntk-complete.js'), [
      '--locales-dir', './locales',
      '--source-locale', 'en',
      '--no-prompt',
      '--dry-run'
    ], projectRoot);
    const output = outputOf(result);

    assert.equal(result.status, 0, output);
    assert.match(output, /Unique source keys added:\s*3/i);
    assert.match(output, /Total key insertions:\s*5/i);
    assert.doesNotMatch(output, /Missing keys added:/i);
    assert.match(output, /Dry run only\. No files were modified\./i);
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
});
