'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const packageRoot = process.env.I18NTK_PACKAGE_ROOT
  ? path.resolve(process.env.I18NTK_PACKAGE_ROOT)
  : path.resolve(__dirname, '..');
const scripts = {
  init: 'main/i18ntk-init.js',
  analyze: 'main/i18ntk-analyze.js',
  validate: 'main/i18ntk-validate.js',
  usage: 'main/i18ntk-usage.js',
  complete: 'main/i18ntk-complete.js',
  sizing: 'main/i18ntk-sizing.js',
  summary: 'main/i18ntk-summary.js',
  doctor: 'main/i18ntk-doctor.js',
  report: 'main/i18ntk-report.js',
  fixer: 'main/i18ntk-fixer.js',
  scanner: 'main/i18ntk-scanner.js',
  backup: 'main/i18ntk-backup.js',
  translate: 'main/i18ntk-translate.js',
  license: 'main/i18ntk-license.js'
};

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function run(project, script, args = [], allowed = [0]) {
  const result = spawnSync(process.execPath, [path.join(packageRoot, script), ...args], {
    cwd: project,
    encoding: 'utf8',
    env: { ...process.env, CI: 'true', I18NTK_DISABLE_AUTOSAVE: 'false' },
    timeout: 30000
  });
  assert.ok(allowed.includes(result.status), `${path.basename(script)} ${args.join(' ')} exited ${result.status}\n${result.stdout}\n${result.stderr}`);
  return `${result.stdout}\n${result.stderr}`;
}

test('release sandbox initializes a new project without prompts', () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-new-project-'));
  try {
    writeJson(path.join(project, 'package.json'), { name: 'new-project', private: true, dependencies: { i18next: '24.0.0' } });
    run(project, scripts.init, ['--source-dir=./locales', '--languages=en,fr', '--no-prompt']);
    assert.ok(fs.existsSync(path.join(project, '.i18ntk-config')));
    assert.ok(fs.existsSync(path.join(project, 'locales', 'en')));
    assert.ok(fs.existsSync(path.join(project, 'locales', 'fr')));
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('release sandbox runs the core CLI against an existing React project', () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-existing-project-'));
  try {
    writeJson(path.join(project, 'package.json'), {
      name: 'existing-project', private: true,
      dependencies: { react: '19.0.0', i18next: '24.0.0', 'react-i18next': '15.0.0' }
    });
    writeJson(path.join(project, '.i18ntk-config'), {
      sourceDir: './src', i18nDir: './locales', outputDir: './i18ntk-reports', sourceLanguage: 'en',
      defaultLanguages: ['en', 'fr'],
      setup: { completed: true, version: '5.0.0' },
      framework: { preference: 'react-i18next', template: 'node', templateVersion: 1 }
    });
    writeJson(path.join(project, 'locales/en/common.json'), { common: { hello: 'Hello {{name}}', save: 'Save' } });
    writeJson(path.join(project, 'locales/fr/common.json'), { common: { hello: 'Bonjour {{name}}', save: 'Enregistrer' } });
    fs.mkdirSync(path.join(project, 'src'), { recursive: true });
    fs.writeFileSync(path.join(project, 'src', 'app.tsx'), "import { t } from 'i18next';\nexport const label = t('common.hello');\nexport const save = t('common.save');\n", 'utf8');

    const commonArgs = ['--no-prompt'];
    run(project, scripts.analyze, commonArgs);
    run(project, scripts.validate, commonArgs);
    run(project, scripts.usage, commonArgs);
    run(project, scripts.complete, ['--dry-run', ...commonArgs]);
    run(project, scripts.sizing, commonArgs);
    run(project, scripts.summary, commonArgs);
    run(project, scripts.doctor, commonArgs);
    run(project, scripts.report, ['--json', ...commonArgs]);
    run(project, scripts.fixer, ['--dry-run', ...commonArgs]);
    const scannerOutput = run(project, scripts.scanner, ['--code-dir=./src', '--no-prompt']);
    assert.equal(scannerOutput.includes("from 'i18next'"), false, 'module specifiers must not be reported as user-facing text');

    run(project, scripts.backup, ['create', 'locales', '--output', './backups']);
    const backup = fs.readdirSync(path.join(project, 'backups')).find(file => file.endsWith('.json'));
    assert.ok(backup, 'backup create should write an archive');
    run(project, scripts.backup, ['verify', path.join('backups', backup)]);
    run(project, scripts.backup, ['list', '--output', './backups']);

    run(project, scripts.translate, ['locales/en/common.json', 'fr', '--dry-run', '--no-confirm']);
    run(project, scripts.license, ['generate', '--license-id', 'LIC-SANDBOX', '--domains', 'example.com', '--output', './i18ntk-license.json']);
    run(project, scripts.license, ['verify', '--file', './i18ntk-license.json', '--domain', 'example.com']);
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});
