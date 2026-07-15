'use strict';

const { isRtlLanguage } = require('./language-registry');
const PLACEHOLDER = /(?:\{\{\s*([\w.-]+)\s*\}\}|\{\s*([\w.-]+)(?:\s*,[^}]*)?\}|%\(([\w.-]+)\)s|%([a-z])|:\b([A-Za-z_]\w*)\b)/g;
const TAG = /<\/?([A-Za-z][\w-]*)\b[^>]*>/g;
const BIDI_CONTROL = /[\u202A-\u202E\u2066-\u2069]/g;
const SOURCE_COPY_MARKER = /^\s*\[[A-Z]{2,3}(?:[-_][A-Z0-9]{2,4})?\]\s+/i;

function isSourceCopyMarker(value) {
  return typeof value === 'string' && SOURCE_COPY_MARKER.test(value);
}

function collect(regex, value) {
  const found = []; let match;
  regex.lastIndex = 0;
  while ((match = regex.exec(String(value || ''))) !== null) found.push(match.slice(1).find(Boolean) || match[0]);
  return found.sort();
}

function validateTranslation(source, target, locale) {
  const issues = [];
  const sourceText = String(source ?? '');
  const targetText = String(target ?? '');
  const sourcePlaceholders = collect(PLACEHOLDER, sourceText);
  const targetPlaceholders = collect(PLACEHOLDER, targetText);
  if (JSON.stringify(sourcePlaceholders) !== JSON.stringify(targetPlaceholders)) {
    issues.push({ code: 'placeholderMismatch', severity: 'error', source: sourcePlaceholders, target: targetPlaceholders });
  }
  if (JSON.stringify(collect(TAG, sourceText)) !== JSON.stringify(collect(TAG, targetText))) {
    issues.push({ code: 'tagMismatch', severity: 'error' });
  }
  if (targetText.match(BIDI_CONTROL)) issues.push({ code: 'unsafeBidiControl', severity: 'error' });
  if (isSourceCopyMarker(targetText)) issues.push({ code: 'sourceCopyMarker', severity: 'warning' });
  if (sourceText.length >= 4 && sourceText === targetText && !String(locale).toLowerCase().startsWith('en')) {
    issues.push({ code: 'possiblyUntranslated', severity: 'warning' });
  }
  return { valid: !issues.some(issue => issue.severity === 'error'), locale, direction: isRtlLanguage(locale) ? 'rtl' : 'ltr', issues };
}

function isolateForTerminal(value, locale) {
  const text = String(value ?? '').replace(BIDI_CONTROL, '');
  return isRtlLanguage(locale) ? `\u2067${text}\u2069` : text;
}

function validateTranslationEntries(entries, locale) {
  const results = [];
  for (const entry of entries || []) {
    const result = validateTranslation(entry?.source, entry?.target, entry?.locale || locale);
    results.push({ key: entry?.key, ...result });
  }
  const issues = results.flatMap(result => result.issues.map(issue => ({ key: result.key, locale: result.locale, ...issue })));
  return {
    valid: results.every(result => result.valid),
    checked: results.length,
    errors: issues.filter(issue => issue.severity === 'error').length,
    warnings: issues.filter(issue => issue.severity === 'warning').length,
    issues,
    results
  };
}

module.exports = { validateTranslation, validateTranslationEntries, isolateForTerminal, isSourceCopyMarker };
