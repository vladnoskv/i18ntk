'use strict';

const templates = require('../settings/framework-templates.json');
const CURRENT_CONFIG_VERSION = '5.0.0';

const TEMPLATE_BY_FRAMEWORK = {
  'i18ntk-runtime': 'node',
  'react-i18next': 'node',
  i18next: 'node',
  'next-intl': 'next',
  next: 'next',
  react: 'node',
  remix: 'node',
  gatsby: 'node',
  expo: 'node',
  'react-native': 'node',
  solid: 'node',
  qwik: 'node',
  vue: 'vue',
  'vue-i18n': 'vue',
  nuxt: 'vue',
  'nuxt-i18n': 'vue',
  angular: 'angular',
  'angular-i18n': 'angular',
  'ngx-translate': 'angular',
  ionic: 'angular',
  svelte: 'svelte',
  'svelte-i18n': 'svelte',
  astro: 'astro',
  django: 'django',
  flask: 'python',
  fastapi: 'python',
  python: 'python',
  laravel: 'php',
  'ruby-on-rails': 'ruby',
  ruby: 'ruby',
  'spring-boot': 'java',
  go: 'go',
  rust: 'rust',
  vanilla: 'generic'
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function unique(values) {
  return [...new Set((values || []).filter(value => typeof value === 'string' && value.length > 0))];
}

function getTemplateId(framework) {
  return TEMPLATE_BY_FRAMEWORK[String(framework || 'vanilla').toLowerCase()] || 'generic';
}

function getFrameworkConfigTemplate(framework) {
  const id = getTemplateId(framework);
  const template = templates.templates[id] || templates.templates.generic;
  const defaults = templates.defaults || {};
  return {
    id,
    ...clone(template),
    excludeFiles: unique([...(defaults.excludeFiles || []), ...(template.excludeFiles || [])]),
    processing: { ...(defaults.processing || {}), ...(template.processing || {}) },
    reports: { ...(defaults.reports || {}), ...(template.reports || {}) },
    advanced: { ...(defaults.advanced || {}), ...(template.advanced || {}) }
  };
}

function shouldSetFrameworkPreference(current, framework) {
  const preference = current?.framework?.preference;
  return !preference || preference === 'auto' || preference === 'none' || preference === framework;
}

function compareVersions(left, right) {
  const parse = value => String(value || '0.0.0').split('-')[0].split('.').map(part => Number.parseInt(part, 10) || 0);
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const difference = (a[index] || 0) - (b[index] || 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

/**
 * Adds safe framework defaults without removing a project's existing choices.
 * Exclusions and supported extensions are merged because each framework needs
 * to skip generated/dependency directories while custom project rules remain
 * authoritative.
 */
function applyFrameworkConfigTemplate(config = {}, framework = 'vanilla') {
  const template = getFrameworkConfigTemplate(framework);
  const existing = clone(config);
  const extensions = unique([...(existing.supportedExtensions || []), ...template.supportedExtensions]);
  const excludeDirs = unique([...(existing.excludeDirs || []), ...template.excludeDirs]);
  const excludeFiles = unique([...(existing.excludeFiles || []), ...(template.excludeFiles || [])]);
  const processing = {
    ...(template.processing || {}),
    ...(existing.processing || {}),
    excludeDirs: unique([...(existing.processing?.excludeDirs || []), ...template.excludeDirs])
  };
  const reports = { ...(template.reports || {}), ...(existing.reports || {}) };
  const advanced = { ...(template.advanced || {}), ...(existing.advanced || {}) };
  const canSetPreference = shouldSetFrameworkPreference(existing, framework);
  const nextFramework = {
    ...(existing.framework || {}),
    detected: framework !== 'vanilla',
    template: template.id,
    templateVersion: templates.version
  };
  if (canSetPreference) nextFramework.preference = framework;

  const next = {
    ...existing,
    supportedExtensions: extensions,
    excludeDirs,
    excludeFiles,
    processing,
    reports,
    advanced,
    framework: nextFramework
  };

  const changed = JSON.stringify(existing) !== JSON.stringify(next);
  return {
    config: next,
    patch: { supportedExtensions: extensions, excludeDirs, excludeFiles, processing, reports, advanced, framework: nextFramework },
    template,
    changed,
    outdated: changed
  };
}

function getConfigUpgradeStatus(config = {}, framework = 'vanilla') {
  const templateUpgrade = applyFrameworkConfigTemplate(config, framework);
  const setupVersion = config.setup?.version || config.version || '0.0.0';
  const versionOutdated = compareVersions(setupVersion, CURRENT_CONFIG_VERSION) < 0;
  return {
    ...templateUpgrade,
    currentVersion: setupVersion,
    requiredVersion: CURRENT_CONFIG_VERSION,
    versionOutdated,
    needsUpgrade: versionOutdated || templateUpgrade.changed
  };
}

function upgradeConfig(config = {}, framework = 'vanilla') {
  const status = getConfigUpgradeStatus(config, framework);
  const upgraded = {
    ...status.config,
    setup: {
      ...(status.config.setup || {}),
      version: CURRENT_CONFIG_VERSION
    }
  };
  return { ...status, config: upgraded };
}

module.exports = {
  CURRENT_CONFIG_VERSION,
  TEMPLATE_BY_FRAMEWORK,
  compareVersions,
  getTemplateId,
  getFrameworkConfigTemplate,
  applyFrameworkConfigTemplate,
  getConfigUpgradeStatus,
  upgradeConfig
};
