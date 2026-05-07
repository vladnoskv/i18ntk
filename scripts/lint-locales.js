#!/usr/bin/env node
/**
 * Simple locale lint:
 * - flags control characters in any locale string
 * - en locale: ensures a small set of CLI strings stay plain ASCII (catches mojibake)
 */
const fs = require('fs');
const path = require('path');
const SecurityUtils = require('../utils/security');

const uiLocalesDir = path.join(__dirname, '..', 'ui-locales');
const asciiOnlyKeys = new Set([
  'ui.autoDetectedI18nDirectory',
  'ui.executingCommand',
  'ui.unknownCommand',
  'ui.errorExecutingCommand',
  'ui.errorLoadingTranslationFile',
  'ui.errorSavingLanguagePreference',
  'ui.noActiveReadlineInterface',
  'ui.uiLanguageUpdated',
  'menu.invalidChoice',
  'menu.returning',
  'menu.invalidOption',
  'menu.nonInteractiveModeWarning',
  'menu.useDirectExecution',
  'menu.useHelpForCommands',
  'menu.autoDetectedI18nDirectory'
]);

function walk(value, pathParts, onString) {
  if (typeof value === 'string') {
    onString(value, pathParts.join('.'));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, idx) => walk(item, pathParts.concat(idx), onString));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      walk(v, pathParts.concat(k), onString);
    }
  }
}

function flatten(value, pathParts = [], out = {}) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, pathParts.concat(index), out));
    return out;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, pathParts.concat(key), out);
    }
    return out;
  }
  out[pathParts.join('.')] = value;
  return out;
}

function readLocale(filePath) {
  const raw = SecurityUtils.safeReadFileSync(filePath, path.dirname(filePath), 'utf8');
  if (!raw) {
    throw new Error('unable to read locale file');
  }
  const normalized = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  return JSON.parse(normalized);
}

function lintFile(filePath) {
  const raw = SecurityUtils.safeReadFileSync(filePath, path.dirname(filePath), 'utf8');
  if (!raw) {
    return [`${path.basename(filePath, '.json')}: unable to read locale file`];
  }
  let data;
  try {
    const normalized = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
    data = JSON.parse(normalized);
  } catch (error) {
    return [`${path.basename(filePath, '.json')}: invalid JSON - ${error.message}`];
  }
  const locale = path.basename(filePath, '.json');
  const issues = [];

  walk(data, [], (str, keyPath) => {
    if (/[\u0000-\u001F]/.test(str)) {
      issues.push(`${locale}: control char in ${keyPath}`);
    }
    if (locale === 'en' && asciiOnlyKeys.has(keyPath) && /[^\x20-\x7E]/.test(str)) {
      issues.push(`${locale}: non-ASCII in ${keyPath} -> "${str}"`);
    }
  });

  return issues;
}

function collectCoverageIssues(files) {
  const enFile = files.find(file => file === 'en.json');
  if (!enFile) {
    return ['ui-locales: missing en.json source locale'];
  }

  let sourceKeys;
  try {
    sourceKeys = new Set(Object.keys(flatten(readLocale(path.join(uiLocalesDir, enFile)))));
  } catch (error) {
    return [`en: unable to build source key set - ${error.message}`];
  }

  const issues = [];
  for (const file of files) {
    if (file === enFile) continue;

    const locale = path.basename(file, '.json');
    let targetKeys;
    try {
      targetKeys = new Set(Object.keys(flatten(readLocale(path.join(uiLocalesDir, file)))));
    } catch (error) {
      issues.push(`${locale}: unable to build key set - ${error.message}`);
      continue;
    }

    const missing = [...sourceKeys].filter(key => !targetKeys.has(key));
    const extra = [...targetKeys].filter(key => !sourceKeys.has(key));

    if (missing.length) {
      issues.push(`${locale}: missing ${missing.length} key(s): ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ', ...' : ''}`);
    }
    if (extra.length) {
      issues.push(`${locale}: extra ${extra.length} key(s): ${extra.slice(0, 10).join(', ')}${extra.length > 10 ? ', ...' : ''}`);
    }
  }

  return issues;
}

function main() {
  let files;
  try {
    files = fs.readdirSync(uiLocalesDir).filter(f => f.endsWith('.json'));
  } catch (error) {
    console.error(`Locale lint failed: unable to read locales directory: ${error.message}`);
    process.exit(1);
  }

  const allIssues = files.flatMap(f => lintFile(path.join(uiLocalesDir, f)))
    .concat(collectCoverageIssues(files));

  if (allIssues.length) {
    console.error('Locale lint failed:');
    allIssues.forEach(msg => console.error(` - ${msg}`));
    process.exit(1);
  }

  console.log('Locale lint passed.');
}

main();
