'use strict';

const fs = require('fs');
const path = require('path');
const { getSourceExtensions, getExcludeDirs } = require('./framework-detector');
const SecurityUtils = require('./security');

const EXCLUDE_DIRS = new Set(getExcludeDirs());
const SOURCE_EXTENSIONS = getSourceExtensions();

const ISSUE_TYPES = new Set([
  'missing_key',
  'unused_key',
  'placeholder_mismatch',
  'likely_untranslated',
  'expansion_risk',
  'hardcoded_text',
]);

const JS_BUILTIN_NAMES = new Set([
  'Promise', 'Boolean', 'String', 'Number', 'Array', 'Object', 'Function',
  'Symbol', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Date', 'RegExp', 'Error',
  'BigInt', 'Int8Array', 'Uint8Array', 'Int16Array', 'Uint16Array',
  'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array', 'Buffer',
  'ReadableStream', 'WritableStream', 'FormData', 'URL', 'URLSearchParams',
  'Headers', 'Request', 'Response', 'AbortController', 'AbortSignal',
  'Blob', 'File', 'FileList', 'JSON', 'Math', 'Reflect', 'Proxy', 'Intl',
  'console', 'process', 'global', 'globalThis', 'window', 'document',
  'navigator', 'Element', 'HTMLElement', 'Node', 'Event', 'Component',
  'React', 'NextResponse', 'NextRequest', 'NextApiRequest', 'NextApiResponse',
]);

const CODE_EXPRESSION_PATTERN = /[&|!=<>+\-*/%]=|&&|\|\||===|!==|=>|;|function\b|\$\{/;

function generateI18ntkReport(options = {}) {
  const projectRoot = path.resolve(options.projectRoot || process.cwd());
  const localesDir = path.resolve(projectRoot, options.localesDir || options.i18nDir || './locales');
  const sourceDir = path.resolve(projectRoot, options.sourceDir || './src');
  const sourceLocale = String(options.sourceLocale || 'en');

  ensureWithin(projectRoot, localesDir, 'Locale directory');
  ensureWithin(projectRoot, sourceDir, 'Source directory');
  if (!SecurityUtils.safeExistsSync(localesDir, projectRoot)) {
    throw new Error(`Locale directory not found: ${localesDir}`);
  }

  const localeFiles = discoverLocaleFiles(localesDir);
  if (localeFiles.length === 0) {
    throw new Error(`No locale JSON files found in ${localesDir}`);
  }

  const locales = [...new Set(localeFiles.map(file => file.locale))].sort();
  if (!locales.includes(sourceLocale)) {
    throw new Error(`Source locale "${sourceLocale}" was not found in ${localesDir}`);
  }

  const localeValues = {};
  const keyLocations = new Map();
  for (const item of localeFiles) {
    const raw = SecurityUtils.safeReadFileSync(item.filePath, localesDir);
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      const rel = path.relative(projectRoot, item.filePath);
      console.warn(`Skipping malformed JSON file: ${rel} (${error.message})`);
      continue;
    }
    const flat = flattenObject(parsed);
    localeValues[item.locale] = { ...(localeValues[item.locale] || {}), ...flat };
    for (const key of Object.keys(flat)) {
      keyLocations.set(`${item.locale}:${key}`, {
        file: item.filePath,
        line: findLine(raw, key),
        column: 1,
      });
    }
  }

  const sourceValues = localeValues[sourceLocale] || {};
  const allKeys = new Set(Object.keys(sourceValues));
  for (const values of Object.values(localeValues)) {
    Object.keys(values).forEach(key => allKeys.add(key));
  }

  const sourceScan = scanSourceFiles(sourceDir, new Set(Object.keys(sourceValues)));
  const usedKeys = sourceScan.usedKeys;
  const issues = [];
  const addIssue = issue => issues.push(normalizeIssue(issue, issues.length + 1, projectRoot));

  for (const locale of locales) {
    if (locale === sourceLocale) continue;
    const values = localeValues[locale] || {};
    for (const key of allKeys) {
      if (sourceValues[key] === undefined) continue;
      const targetValue = values[key];
      const location = keyLocations.get(`${locale}:${key}`);
      if (targetValue === undefined || targetValue === null || targetValue === '') {
        const usage = sourceScan.usageLocations.get(key)?.[0];
        addIssue({
          type: 'missing_key',
          severity: 'warning',
          locale,
          key,
          file: usage?.file || location?.file,
          line: usage?.line || location?.line,
          column: usage?.column || location?.column,
          message: `${locale} is missing translation key "${key}".`,
          suggestion: 'Add this key to the locale file.',
        });
        continue;
      }

      const sourcePlaceholders = extractPlaceholders(sourceValues[key]);
      const targetPlaceholders = extractPlaceholders(targetValue);
      const missing = [...sourcePlaceholders].filter(name => !targetPlaceholders.has(name));
      const extra = [...targetPlaceholders].filter(name => !sourcePlaceholders.has(name));
      if (missing.length || extra.length) {
        addIssue({
          type: 'placeholder_mismatch',
          severity: 'error',
          locale,
          key,
          file: location?.file,
          line: location?.line,
          column: location?.column,
          message: `${locale}.${key} has placeholder mismatch.`,
          suggestion: `Missing: ${missing.join(', ') || 'none'}; extra: ${extra.join(', ') || 'none'}.`,
        });
      }

      if (looksLikelyUntranslated(sourceValues[key], targetValue, locale)) {
        addIssue({
          type: 'likely_untranslated',
          severity: 'warning',
          locale,
          key,
          file: location?.file,
          line: location?.line,
          column: location?.column,
          confidence: 0.85,
          message: `${locale}.${key} looks untranslated.`,
          suggestion: 'Review this value against the source locale.',
        });
      }

      const expansionPercent = getExpansionPercent(sourceValues[key], targetValue);
      if (expansionPercent >= Number(options.expansionThresholdPct || 30)) {
        addIssue({
          type: 'expansion_risk',
          severity: 'info',
          locale,
          key,
          file: location?.file,
          line: location?.line,
          column: location?.column,
          confidence: 0.75,
          message: `${locale}.${key} is ${expansionPercent}% longer than the source value.`,
          suggestion: 'Check layouts with constrained space.',
        });
      }
    }
  }

  for (const key of Object.keys(sourceValues)) {
    if (!usedKeys.has(key)) {
      const location = keyLocations.get(`${sourceLocale}:${key}`);
      addIssue({
        type: 'unused_key',
        severity: 'info',
        locale: sourceLocale,
        key,
        file: location?.file,
        line: location?.line,
        column: location?.column,
        confidence: sourceScan.scannedFiles > 0 ? 0.8 : 0.4,
        message: `Translation key "${key}" was not found in scanned source files.`,
        suggestion: 'Review before deleting; dynamic key construction may hide usage.',
      });
    }
  }

  for (const item of sourceScan.hardcodedTexts) {
    addIssue({
      type: 'hardcoded_text',
      severity: 'warning',
      file: item.file,
      line: item.line,
      column: item.column,
      confidence: item.existingKey ? 0.9 : 0.65,
      message: item.existingKey
        ? `Hardcoded text matches existing key "${item.existingKey}".`
        : `Hardcoded user-facing text: "${item.text}".`,
      suggestion: item.existingKey ? `Use t('${item.existingKey}') instead.` : 'Move this text into locale files.',
    });
  }

  const localeReports = locales.map(locale => {
    const values = localeValues[locale] || {};
    const missingKeys = Object.keys(sourceValues).filter(key => values[key] === undefined || values[key] === null || values[key] === '').length;
    const translatedKeys = Math.max(0, Object.keys(sourceValues).length - missingKeys);
    const byLocale = issues.filter(issue => issue.locale === locale);
    return {
      locale,
      totalKeys: Object.keys(sourceValues).length,
      translatedKeys,
      missingKeys,
      completenessPct: pct(translatedKeys, Object.keys(sourceValues).length),
      placeholderMismatchCount: byLocale.filter(issue => issue.type === 'placeholder_mismatch').length,
      likelyUntranslatedCount: byLocale.filter(issue => issue.type === 'likely_untranslated').length,
      expansionRiskCount: byLocale.filter(issue => issue.type === 'expansion_risk').length,
    };
  });

  const averageCompletenessPct = localeReports.length
    ? Math.round(localeReports.reduce((sum, locale) => sum + locale.completenessPct, 0) / localeReports.length)
    : 0;

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    projectRoot,
    config: {
      sourceLocale,
      localesDir,
      namespaces: [...new Set(localeFiles.map(file => file.namespace).filter(Boolean))].sort(),
    },
    summary: {
      totalKeys: Object.keys(sourceValues).length,
      localeCount: locales.length,
      averageCompletenessPct,
      issueCount: issues.length,
      missingKeyCount: issues.filter(issue => issue.type === 'missing_key').length,
      unusedKeyCount: issues.filter(issue => issue.type === 'unused_key').length,
      placeholderMismatchCount: issues.filter(issue => issue.type === 'placeholder_mismatch').length,
      likelyUntranslatedCount: issues.filter(issue => issue.type === 'likely_untranslated').length,
      expansionRiskCount: issues.filter(issue => issue.type === 'expansion_risk').length,
      hardcodedTextCount: issues.filter(issue => issue.type === 'hardcoded_text').length,
    },
    locales: localeReports,
    issues,
  };
}

function discoverLocaleFiles(localesDir) {
  const files = [];
  const entries = fs.readdirSync(localesDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(localesDir, entry.name);
    if (entry.isDirectory()) {
      for (const filePath of walk(entryPath, ['.json'], [], entryPath)) {
        files.push({
          locale: entry.name,
          namespace: path.basename(filePath, '.json'),
          filePath,
        });
      }
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push({
        locale: path.basename(entry.name, '.json'),
        namespace: 'default',
        filePath: entryPath,
      });
    }
  }
  return files;
}

function walk(dir, extensions, acc = [], basePath = process.cwd()) {
  if (!SecurityUtils.safeExistsSync(dir, basePath)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(entryPath, extensions, acc, basePath);
    else if (entry.isFile() && extensions.includes(path.extname(entry.name))) acc.push(entryPath);
  }
  return acc;
}

function flattenObject(value, prefix = '', out = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flattenObject(child, prefix ? `${prefix}.${key}` : key, out);
    }
  } else if (prefix) {
    out[prefix] = value == null ? '' : String(value);
  }
  return out;
}

function scanSourceFiles(sourceDir, availableKeys) {
  const usedKeys = new Set();
  const usageLocations = new Map();
  const hardcodedTexts = [];
  const translationValueIndex = new Map();
  const basePath = path.resolve(sourceDir);
  const files = walk(sourceDir, SOURCE_EXTENSIONS, [], basePath);

  for (const file of files) {
    const content = SecurityUtils.safeReadFileSync(file, basePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const keyPatterns = [
      /\b(?:t|tx|__|_t)\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /\bi18n\.t\s*\(\s*['"`]([^'"`]+)['"`]/g,
      /\bi18nKey\s*=\s*['"`]([^'"`]+)['"`]/g,
    ];
    for (const pattern of keyPatterns) {
      let match;
      while ((match = pattern.exec(content))) {
        const key = match[1];
        usedKeys.add(key);
        const location = offsetToLocation(content, match.index);
        const list = usageLocations.get(key) || [];
        list.push({ file, line: location.line, column: location.column });
        usageLocations.set(key, list);
      }
    }

    lines.forEach((lineText, index) => {
      const textPattern = />\s*([A-Z][A-Za-z0-9 ,.!?'-]{3,})\s*</g;
      const attrPattern = /\b(?:aria-label|title|alt|placeholder)=["']([A-Z][^"']{3,})["']/g;
      const assignmentPattern = /\b(?:label|title|text|message|placeholder)\s*=\s*["']([A-Z][^"']{3,})["']/g;
      for (const pattern of [textPattern, attrPattern, assignmentPattern]) {
        let match;
        while ((match = pattern.exec(lineText))) {
          const text = match[1].trim();
          if (JS_BUILTIN_NAMES.has(text)) continue;
          if (CODE_EXPRESSION_PATTERN.test(text)) continue;
          const existingKey = translationValueIndex.get(text) || findKeyByValue(text, availableKeys);
          hardcodedTexts.push({ file, line: index + 1, column: match.index + 1, text, existingKey });
        }
      }
    });
  }

  return { usedKeys, usageLocations, hardcodedTexts, scannedFiles: files.length };
}

function findKeyByValue(_text, _availableKeys) {
  return undefined;
}

function extractPlaceholders(value) {
  const placeholders = new Set();
  const text = String(value || '');
  const patterns = [
    /\{\{\s*([\w.-]+)\s*\}\}/g,
    /%\{([\w.-]+)\}/g,
    /\{([\w.-]+)\}/g,
    /\$\{([\w.-]+)\}/g,
    /\$([a-zA-Z_][a-zA-Z0-9_-]+)/g
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text))) placeholders.add(match[1]);
  }
  return placeholders;
}

function looksLikelyUntranslated(source, target, locale) {
  if (!source || !target || locale === 'en') return false;
  const normalizedSource = normalizeText(source);
  const normalizedTarget = normalizeText(target);
  if (!/[a-z]/i.test(normalizedSource)) return false;
  return normalizedSource.length >= 4 && normalizedSource === normalizedTarget;
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\{\{[^}]+\}\}|\{[^}]+\}|%\{[^}]+\}/g, '')
    .replace(/\$[a-zA-Z_][a-zA-Z0-9_-]*(?:\s*\{\s*[^}]+\})?/g, '')
    .trim().toLowerCase();
}

function getExpansionPercent(source, target) {
  const sourceLength = String(source || '').length;
  const targetLength = String(target || '').length;
  if (sourceLength < 4 || targetLength <= sourceLength) return 0;
  return Math.round(((targetLength - sourceLength) / sourceLength) * 100);
}

function pct(part, total) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function normalizeIssue(issue, index, projectRoot) {
  if (!ISSUE_TYPES.has(issue.type)) throw new Error(`Invalid report issue type: ${issue.type}`);
  return {
    id: `${issue.type}-${index}`,
    type: issue.type,
    severity: issue.severity || 'warning',
    locale: issue.locale,
    key: issue.key,
    file: issue.file ? path.relative(projectRoot, issue.file).split(path.sep).join('/') : undefined,
    line: issue.line,
    column: issue.column,
    confidence: issue.confidence,
    message: issue.message,
    suggestion: issue.suggestion,
  };
}

function findLine(content, key) {
  const escaped = key.split('.').pop().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const lines = content.split(/\r?\n/);
  const pattern = new RegExp(`"${escaped}"\\s*:`);
  const index = lines.findIndex(line => pattern.test(line));
  return index >= 0 ? index + 1 : undefined;
}

function offsetToLocation(content, offset) {
  const before = content.slice(0, offset).split(/\r?\n/);
  return { line: before.length, column: before[before.length - 1].length + 1 };
}

function ensureWithin(root, target, label) {
  const rel = path.relative(root, target);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`${label} must be inside the project root.`);
  }
}

function renderReportAsMarkdown(report) {
  const lines = [
    '# i18ntk Report',
    '',
    `Generated: ${report.generatedAt}`,
    `Project: ${report.projectRoot}`,
    '',
    '## Summary',
    '',
    `- Total keys: ${report.summary.totalKeys}`,
    `- Locales: ${report.summary.localeCount}`,
    `- Average completeness: ${report.summary.averageCompletenessPct}%`,
    `- Issues: ${report.summary.issueCount}`,
    '',
    '## Translation completeness',
    '',
    '| Locale | Translated | Missing | Complete | Placeholder | Untranslated | Expansion |',
    '|---|---:|---:|---:|---:|---:|---:|',
    ...report.locales.map(locale => `| ${md(locale.locale)} | ${locale.translatedKeys}/${locale.totalKeys} | ${locale.missingKeys} | ${locale.completenessPct}% | ${locale.placeholderMismatchCount} | ${locale.likelyUntranslatedCount} | ${locale.expansionRiskCount} |`),
    '',
    '## Issues',
    '',
    ...(report.issues.length
      ? report.issues.map(issue => `- **${issue.severity} ${issue.type}** ${md(issue.locale || '')} ${issue.key ? `\`${md(issue.key)}\`` : ''} ${md(issue.message)}${issue.file ? ` (${md(issue.file)}${issue.line ? `:${issue.line}` : ''})` : ''}`)
      : ['_No issues found._']),
    '',
  ];
  return lines.join('\n');
}

function renderReportAsHtml(report) {
  const issues = report.issues.map(issue => `<tr><td>${html(issue.type)}</td><td>${html(issue.severity)}</td><td>${html(issue.locale || '')}</td><td>${html(issue.key || '')}</td><td>${html(issue.message)}</td><td>${html(issue.file || '')}</td></tr>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>i18ntk Report</title>
<style>body{font-family:system-ui,sans-serif;margin:24px;line-height:1.45}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:6px;text-align:left}.cards{display:flex;gap:12px;flex-wrap:wrap}.card{border:1px solid #ddd;padding:12px}</style>
</head><body><h1>i18ntk Report</h1><div class="cards"><div class="card">Keys: ${report.summary.totalKeys}</div><div class="card">Locales: ${report.summary.localeCount}</div><div class="card">Completeness: ${report.summary.averageCompletenessPct}%</div><div class="card">Issues: ${report.summary.issueCount}</div></div>
<h2>Translation completeness</h2><table><thead><tr><th>Locale</th><th>Translated</th><th>Missing</th><th>Complete</th></tr></thead><tbody>${report.locales.map(locale => `<tr><td>${html(locale.locale)}</td><td>${locale.translatedKeys}/${locale.totalKeys}</td><td>${locale.missingKeys}</td><td>${locale.completenessPct}%</td></tr>`).join('')}</tbody></table>
<h2>Issues</h2><table><thead><tr><th>Type</th><th>Severity</th><th>Locale</th><th>Key</th><th>Message</th><th>File</th></tr></thead><tbody>${issues || '<tr><td colspan="6">No issues found.</td></tr>'}</tbody></table></body></html>`;
}

function md(value) {
  return String(value || '').replace(/[\\|`*_{}\[\]()#+\-.!]/g, '\\$&');
}

function html(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

module.exports = {
  generateI18ntkReport,
  renderReportAsMarkdown,
  renderReportAsHtml,
};
