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

function main() {
  let files;
  try {
    files = fs.readdirSync(uiLocalesDir).filter(f => f.endsWith('.json'));
  } catch (error) {
    console.error(`Locale lint failed: unable to read locales directory: ${error.message}`);
    process.exit(1);
  }

  const allIssues = files.flatMap(f => lintFile(path.join(uiLocalesDir, f)));

  if (allIssues.length) {
    console.error('Locale lint failed:');
    allIssues.forEach(msg => console.error(` - ${msg}`));
    process.exit(1);
  }

  console.log('Locale lint passed.');
}

main();
