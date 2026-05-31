const fs = require('fs');
const path = require('path');

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
  if (!fs.existsSync(dir)) return [];

  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) return [];

  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectJsonFiles(fullPath, rootDir));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push({
        fullPath,
        displayPath: path.relative(rootDir, fullPath) || entry.name
      });
    }
  }

  return results;
}

function getEnglishLocaleFiles(sourceDir, sourceLanguage = 'en') {
  const localeRoot = path.resolve(sourceDir || './locales');
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
  if (fs.existsSync(monolithFile) && fs.statSync(monolithFile).isFile()) {
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
  const files = getEnglishLocaleFiles(sourceDir, sourceLanguage);
  const placeholders = [];
  const errors = [];
  let keyCount = 0;

  for (const file of files) {
    try {
      const content = fs.readFileSync(file.fullPath, 'utf8');
      const parsed = JSON.parse(content);
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
