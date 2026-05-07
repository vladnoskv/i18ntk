const path = require('path');
const SecurityUtils = require('../security');

const DEFAULT_PROTECTION_FILE = 'i18ntk-auto-translate.json';
const TOKEN_PREFIX = '__I18NTK_KEEP_';

function defaultProtectionConfig() {
  return {
    version: 1,
    description: 'Auto Translate protection rules. Terms are masked before translation and restored after translation. Keys and values are copied from the source without translation.',
    terms: [],
    keys: [],
    values: [],
    patterns: []
  };
}

function resolveProtectionFile(filePath, cwd = process.cwd()) {
  const requested = filePath || DEFAULT_PROTECTION_FILE;
  const resolved = path.isAbsolute(requested)
    ? path.resolve(requested)
    : path.resolve(cwd, requested);
  const root = path.resolve(cwd);

  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    throw new Error(`Protection file must be inside the project: ${requested}`);
  }

  return resolved;
}

function normalizeList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(item => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean);
}

function compilePatterns(patterns) {
  const compiled = [];
  for (const pattern of patterns) {
    try {
      compiled.push(new RegExp(pattern, 'g'));
    } catch (error) {
      console.warn(`Invalid Auto Translate protection pattern ignored: ${pattern} (${error.message})`);
    }
  }
  return compiled;
}

function normalizeProtectionConfig(config = {}, filePath = null) {
  const terms = normalizeList(config.terms);
  const keys = normalizeList(config.keys);
  const values = normalizeList(config.values);
  const patterns = normalizeList(config.patterns);

  return {
    enabled: true,
    filePath,
    terms,
    keys,
    values,
    patterns,
    compiledPatterns: compilePatterns(patterns)
  };
}

function createProtectionFile(filePath, options = {}) {
  const resolved = resolveProtectionFile(filePath, options.cwd);
  const dir = path.dirname(resolved);
  if (!SecurityUtils.safeExistsSync(dir, path.dirname(dir))) {
    SecurityUtils.safeMkdirSync(dir, path.dirname(dir), { recursive: true });
  }

  if (!SecurityUtils.safeExistsSync(resolved, dir)) {
    SecurityUtils.safeWriteFileSync(
      resolved,
      JSON.stringify(defaultProtectionConfig(), null, 2) + '\n',
      dir,
      'utf8'
    );
  }

  return resolved;
}

function readProtectionFile(filePath, options = {}) {
  const resolved = resolveProtectionFile(filePath, options.cwd);
  const raw = SecurityUtils.safeReadFileSync(resolved, path.dirname(resolved), 'utf8');
  if (!raw) return defaultProtectionConfig();
  return JSON.parse(raw.replace(/^\uFEFF/, ''));
}

function saveProtectionFile(filePath, config, options = {}) {
  const resolved = resolveProtectionFile(filePath, options.cwd);
  const dir = path.dirname(resolved);
  if (!SecurityUtils.safeExistsSync(dir, path.dirname(dir))) {
    SecurityUtils.safeMkdirSync(dir, path.dirname(dir), { recursive: true });
  }
  const nextConfig = {
    ...defaultProtectionConfig(),
    ...(config || {}),
    terms: normalizeList(config?.terms),
    keys: normalizeList(config?.keys),
    values: normalizeList(config?.values),
    patterns: normalizeList(config?.patterns)
  };
  SecurityUtils.safeWriteFileSync(resolved, JSON.stringify(nextConfig, null, 2) + '\n', dir, 'utf8');
  return resolved;
}

function loadProtectionConfig(filePath, options = {}) {
  if (options.enabled === false) {
    return normalizeProtectionConfig({}, null);
  }

  const resolved = resolveProtectionFile(filePath, options.cwd);
  const dir = path.dirname(resolved);

  if (!SecurityUtils.safeExistsSync(resolved, dir)) {
    if (options.create) {
      createProtectionFile(resolved, options);
    } else {
      return normalizeProtectionConfig({}, resolved);
    }
  }

  const raw = SecurityUtils.safeReadFileSync(resolved, dir, 'utf8');
  if (!raw) {
    return normalizeProtectionConfig({}, resolved);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw.replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new Error(`Invalid Auto Translate protection JSON at ${resolved}: ${error.message}`);
  }

  return normalizeProtectionConfig(parsed, resolved);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function keyMatchesRule(keyPath, rule) {
  if (rule === keyPath) return true;
  if (!rule.includes('*')) return false;
  const regex = new RegExp(`^${rule.split('*').map(escapeRegExp).join('.*')}$`);
  return regex.test(keyPath);
}

function shouldPreserveWholeValue(keyPath, value, protection) {
  if (!protection || protection.enabled === false) return false;
  if (protection.keys.some(rule => keyMatchesRule(keyPath, rule))) return true;
  const valueText = String(value);
  return protection.values.includes(valueText) || protection.terms.includes(valueText);
}

function addReplacement(replacements, original) {
  if (!original) return;
  if (replacements.some(item => item.original === original)) return;
  replacements.push({ original });
}

function collectReplacements(value, protection) {
  const text = String(value);
  const replacements = [];

  for (const term of protection.terms || []) {
    if (text.includes(term)) {
      addReplacement(replacements, term);
    }
  }

  for (const pattern of protection.compiledPatterns || []) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      addReplacement(replacements, match[0]);
      if (match[0] === '') pattern.lastIndex++;
    }
  }

  return replacements.sort((a, b) => b.original.length - a.original.length);
}

function protectText(value, protection) {
  if (!protection || protection.enabled === false || typeof value !== 'string') {
    return { value, map: new Map(), count: 0 };
  }

  const replacements = collectReplacements(value, protection);
  if (replacements.length === 0) {
    return { value, map: new Map(), count: 0 };
  }

  let protectedValue = value;
  const map = new Map();
  replacements.forEach((replacement, index) => {
    const token = `${TOKEN_PREFIX}${index}__`;
    map.set(token, replacement.original);
    protectedValue = protectedValue.split(replacement.original).join(token);
  });

  return { value: protectedValue, map, count: map.size };
}

function restoreText(value, map) {
  if (!(map instanceof Map) || map.size === 0 || typeof value !== 'string') return value;
  let restored = value;
  for (const [token, original] of map.entries()) {
    restored = restored.split(token).join(original);
  }
  return restored;
}

function hasProtectionRules(protection) {
  return Boolean(
    protection &&
    (
      protection.terms.length ||
      protection.keys.length ||
      protection.values.length ||
      protection.patterns.length
    )
  );
}

module.exports = {
  DEFAULT_PROTECTION_FILE,
  createProtectionFile,
  defaultProtectionConfig,
  hasProtectionRules,
  loadProtectionConfig,
  protectText,
  readProtectionFile,
  restoreText,
  saveProtectionFile,
  shouldPreserveWholeValue
};
