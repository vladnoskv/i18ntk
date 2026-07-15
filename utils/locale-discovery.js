'use strict';

const path = require('path');
const SecurityUtils = require('./security');

const DEFAULT_EXCLUDES = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', 'i18ntk-reports']);

function normalizeLocale(locale) {
  return String(locale || '').trim().toLowerCase().replace(/_/g, '-');
}

function isLocaleName(name) {
  return /^[a-z]{2,3}(?:[-_][a-z0-9]{2,8})*$/i.test(String(name || ''));
}

/** Discover monolith (en.json) and directory (en/*.json) layouts. */
function discoverLocaleFiles(baseDir, options = {}) {
  const root = path.resolve(baseDir);
  const sourceLocale = normalizeLocale(options.sourceLocale || '');
  const excludes = new Set([...DEFAULT_EXCLUDES, ...(options.excludeDirs || [])].map(String));
  const found = [];
  if (!SecurityUtils.safeExistsSync(root, path.dirname(root))) return found;
  const rootStat = SecurityUtils.safeStatSync(root, path.dirname(root));
  if (!rootStat || !rootStat.isDirectory()) return found;

  const walk = (dir, localeHint = '') => {
    const entries = SecurityUtils.safeReaddirSync(dir, path.dirname(dir), { withFileTypes: true }) || [];
    for (const entry of entries) {
      if (excludes.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const nextLocale = isLocaleName(entry.name) ? normalizeLocale(entry.name) : localeHint;
        walk(fullPath, nextLocale);
      } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.json') {
        const fileLocale = localeHint || normalizeLocale(path.basename(entry.name, '.json'));
        if (!isLocaleName(fileLocale)) continue;
        if (sourceLocale && fileLocale !== sourceLocale && options.sourceOnly) continue;
        found.push({ filePath: fullPath, locale: fileLocale,
          namespace: localeHint ? path.basename(entry.name, '.json') : 'default',
          type: localeHint ? 'namespaced' : 'direct' });
      }
    }
  };
  walk(root);
  return found.sort((a, b) => a.filePath.localeCompare(b.filePath));
}

function discoverLocales(baseDir, options = {}) {
  return [...new Set(discoverLocaleFiles(baseDir, options).map(item => item.locale))].sort();
}

module.exports = { discoverLocaleFiles, discoverLocales, isLocaleName, normalizeLocale };
