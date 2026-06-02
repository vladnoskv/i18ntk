const path = require('path');
const SecurityUtils = require('./security');

const LANGUAGE_PREFIX_PATTERN = /^\s*\[[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,8})?\]\s+\S/;

function isLanguagePrefixPlaceholder(value) {
  return typeof value === 'string' && LANGUAGE_PREFIX_PATTERN.test(value);
}

function collectStringLeaves(value, prefix = '') {
  const leaves = [];

  if (typeof value === 'string') {
    leaves.push({ key: prefix || '<root>', value });
    return leaves;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const nextPrefix = `${prefix}[${index}]`;
      leaves.push(...collectStringLeaves(item, nextPrefix));
    });
    return leaves;
  }

  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      leaves.push(...collectStringLeaves(child, nextPrefix));
    }
  }

  return leaves;
}

function collectJsonFiles(dir, rootDir = dir) {
  const baseDir = path.resolve(rootDir);
  const validatedDir = SecurityUtils.validatePath(path.resolve(dir), baseDir);
  if (!validatedDir || !SecurityUtils.safeExistsSync(validatedDir, baseDir)) return [];

  const stat = SecurityUtils.safeStatSync(validatedDir, baseDir);
  if (!stat.isDirectory()) return [];

  const results = [];
  for (const entry of SecurityUtils.safeReaddirSync(validatedDir, baseDir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

    const fullPath = path.join(validatedDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectJsonFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push({
        fullPath,
        displayPath: path.relative(baseDir, fullPath) || entry.name
      });
    }
  }

  return results;
}

function getEnglishLocaleFiles(sourceDir, sourceLanguage = 'en') {
  const requestedRoot = path.resolve(sourceDir || './locales');
  const localeRoot = SecurityUtils.validatePath(requestedRoot, requestedRoot);
  if (!localeRoot) return [];

  const files = [];
  const seen = new Set();

  const addFile = (file) => {
    const resolved = path.resolve(file.fullPath);
    if (seen.has(resolved)) return;
    seen.add(resolved);
    files.push(file);
  };

  const languageDir = path.join(localeRoot, sourceLanguage);
  for (const file of collectJsonFiles(languageDir, languageDir)) {
    addFile(file);
  }

  const monolithFile = path.join(localeRoot, `${sourceLanguage}.json`);
  const monolithStat = SecurityUtils.safeStatSync(monolithFile, localeRoot);
  if (monolithStat && monolithStat.isFile()) {
    addFile({
      fullPath: monolithFile,
      displayPath: path.basename(monolithFile)
    });
  }

  if (files.length === 0 && path.basename(localeRoot).toLowerCase() === sourceLanguage.toLowerCase()) {
    for (const file of collectJsonFiles(localeRoot, localeRoot)) {
      addFile(file);
    }
  }

  return files.sort((a, b) => a.displayPath.localeCompare(b.displayPath));
}

function scanEnglishPlaceholders(options = {}) {
  const sourceDir = options.sourceDir || './locales';
  const sourceLanguage = options.sourceLanguage || 'en';
  const requestedRoot = path.resolve(sourceDir);
  const localeRoot = SecurityUtils.validatePath(requestedRoot, requestedRoot);
  if (!localeRoot) {
    return {
      success: false,
      sourceDir: requestedRoot,
      sourceLanguage,
      fileCount: 0,
      keyCount: 0,
      placeholderCount: 0,
      placeholders: [],
      errors: [{ file: sourceDir, path: requestedRoot, error: 'Invalid source directory' }]
    };
  }
  const files = getEnglishLocaleFiles(sourceDir, sourceLanguage);
  const placeholders = [];
  const errors = [];
  let keyCount = 0;

  for (const file of files) {
    try {
      const content = SecurityUtils.safeReadFileSync(file.fullPath, localeRoot, 'utf8');
      if (!content) {
        throw new Error('Unable to read locale file');
      }

      const parseFailed = { __i18ntkParseFailed: true };
      const parsed = SecurityUtils.safeParseJSON(content, parseFailed);
      if (parsed === parseFailed) {
        throw new Error('Invalid JSON content');
      }

      const leaves = collectStringLeaves(parsed);
      keyCount += leaves.length;

      for (const leaf of leaves) {
        if (isLanguagePrefixPlaceholder(leaf.value)) {
          placeholders.push({
            file: file.displayPath,
            path: file.fullPath,
            key: leaf.key,
            value: leaf.value
          });
        }
      }
    } catch (error) {
      errors.push({
        file: file.displayPath,
        path: file.fullPath,
        error: error.message
      });
    }
  }

  return {
    success: placeholders.length === 0 && errors.length === 0,
    sourceDir: path.resolve(sourceDir),
    sourceLanguage,
    fileCount: files.length,
    keyCount,
    placeholderCount: placeholders.length,
    placeholders,
    errors
  };
}

module.exports = {
  LANGUAGE_PREFIX_PATTERN,
  collectStringLeaves,
  getEnglishLocaleFiles,
  isLanguagePrefixPlaceholder,
  scanEnglishPlaceholders
};
