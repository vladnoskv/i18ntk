'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const {
  getFrameworkConfigTemplate,
  getTemplateId,
  applyFrameworkConfigTemplate,
  getConfigUpgradeStatus,
  upgradeConfig
} = require('../utils/framework-config-templates');

test('framework templates provide source types and safe exclusions for supported stacks', () => {
  for (const framework of ['react-i18next', 'next-intl', 'vue-i18n', 'angular-i18n', 'django', 'laravel', 'ruby-on-rails', 'spring-boot', 'go', 'rust']) {
    const template = getFrameworkConfigTemplate(framework);
    assert.ok(template.supportedExtensions.length > 0, `${framework} should include source extensions`);
    assert.ok(template.excludeDirs.includes('.git'), `${framework} should exclude Git metadata`);
  }
  assert.equal(getTemplateId('next-intl'), 'next');
  assert.equal(getTemplateId('laravel'), 'php');
  assert.equal(getTemplateId('unknown-framework'), 'generic');
});

test('template upgrade appends safe defaults without replacing user configuration', () => {
  const result = applyFrameworkConfigTemplate({
    supportedExtensions: ['.custom'],
    excludeDirs: ['generated-by-user'],
    processing: { excludeDirs: ['private-build'] },
    framework: { preference: 'manual-framework' }
  }, 'next-intl');

  assert.equal(result.outdated, true);
  assert.ok(result.config.supportedExtensions.includes('.custom'));
  assert.ok(result.config.supportedExtensions.includes('.tsx'));
  assert.ok(result.config.excludeDirs.includes('generated-by-user'));
  assert.ok(result.config.excludeDirs.includes('.next'));
  assert.ok(result.config.processing.excludeDirs.includes('private-build'));
  assert.equal(result.config.processing.cacheEnabled, true);
  assert.equal(result.config.reports.includeUsageStats, true);
  assert.equal(result.config.advanced.performanceTracking, true);
  assert.equal(result.config.framework.preference, 'manual-framework');
  assert.equal(result.config.framework.template, 'next');
  assert.equal(result.config.framework.templateVersion, 1);
});

test('an up-to-date template does not produce another upgrade', () => {
  const first = applyFrameworkConfigTemplate({}, 'django');
  const second = applyFrameworkConfigTemplate(first.config, 'django');

  assert.equal(first.changed, true);
  assert.equal(second.changed, false);
});

test('existing configurations are warned about a required v5 framework update', () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-template-upgrade-'));
  const configHelper = path.resolve(__dirname, '../utils/config-helper.js');
  try {
    fs.writeFileSync(path.join(project, 'package.json'), JSON.stringify({
      name: 'template-upgrade-fixture',
      dependencies: { 'react-i18next': '15.0.0', i18next: '24.0.0' }
    }), 'utf8');
    fs.writeFileSync(path.join(project, '.i18ntk-config'), JSON.stringify({
      sourceDir: './src',
      i18nDir: './locales',
      framework: { preference: 'auto' },
      supportedExtensions: ['.custom'],
      excludeDirs: ['generated-by-user']
    }), 'utf8');

    const script = `require(${JSON.stringify(configHelper)}).getUnifiedConfig('analyze').catch(error => { console.error(error); process.exit(1); });`;
    const result = spawnSync(process.execPath, ['-e', script], { cwd: project, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /needs a v5\.0\.0 update for Node\.js or React project/);

    const existing = JSON.parse(fs.readFileSync(path.join(project, '.i18ntk-config'), 'utf8'));
    assert.equal(existing.supportedExtensions.includes('.tsx'), false);
    assert.equal(existing.framework.template, undefined);
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});

test('v5 upgrades preserve setup details and append recommended framework defaults', () => {
  const current = {
    setup: { completed: true, completedAt: '2026-01-01T00:00:00.000Z', version: '4.7.3' },
    defaultLanguages: ['en', 'fr'],
    excludeDirs: ['project-generated']
  };
  const status = getConfigUpgradeStatus(current, 'laravel');
  const upgraded = upgradeConfig(current, 'laravel').config;

  assert.equal(status.needsUpgrade, true);
  assert.equal(upgraded.setup.completed, true);
  assert.equal(upgraded.setup.completedAt, current.setup.completedAt);
  assert.equal(upgraded.setup.version, '5.0.0');
  assert.deepEqual(upgraded.defaultLanguages, ['en', 'fr']);
  assert.ok(upgraded.excludeDirs.includes('project-generated'));
  assert.ok(upgraded.excludeDirs.includes('vendor'));
});
