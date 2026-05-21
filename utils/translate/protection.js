const path = require('path');
const SecurityUtils = require('../security');

const DEFAULT_PROTECTION_FILE = 'i18ntk-auto-translate.json';
const TOKEN_PREFIX = '__I18NTK_KEEP_';
const MAX_CONTEXT_RULES = 100;
const MAX_CONTEXT_INPUT_LENGTH = 200;

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

function parseContextString(context) {
  if (typeof context !== 'string') return null;
  if (context.length > MAX_CONTEXT_INPUT_LENGTH) return null;

  const trimmed = context.trim();

  if (trimmed === 'standalone') {
    return { mode: 'standalone' };
  }

  const afterMatch = trimmed.match(/^after:(.+)$/i);
  if (afterMatch) {
    const words = afterMatch[1].split('|').map(w => w.trim()).filter(Boolean);
    if (words.length === 0) return null;
    return { mode: 'after', words };
  }

  const beforeMatch = trimmed.match(/^before:(.+)$/i);
  if (beforeMatch) {
    const words = beforeMatch[1].split('|').map(w => w.trim()).filter(Boolean);
    if (words.length === 0) return null;
    return { mode: 'before', words };
  }

  const prefix = trimmed.substring(0, 'surrounded:'.length);
  if (prefix.toLowerCase() === 'surrounded:') {
    const rest = trimmed.substring('surrounded:'.length);
    const idx = rest.indexOf(',');
    if (idx === -1) return null;
    const left = rest.slice(0, idx).trim();
    const right = rest.slice(idx + 1).trim();
    const leftWords = left.split('|').map(w => w.trim()).filter(Boolean);
    const rightWords = right.split('|').map(w => w.trim()).filter(Boolean);
    if (leftWords.length === 0 || rightWords.length === 0) return null;
    return { mode: 'surrounded', left: leftWords, right: rightWords };
  }

  return null;
}

function parseContextRule(rule) {
  if (typeof rule === 'string') {
    const trimmed = rule.trim();
    if (!trimmed || trimmed.length > MAX_CONTEXT_INPUT_LENGTH) return null;
    return { value: trimmed, type: 'global' };
  }

  if (
    typeof rule === 'object' &&
    rule !== null &&
    typeof rule.value === 'string' &&
    typeof rule.context === 'string'
  ) {
    const value = rule.value.trim();
    const rawContext = rule.context;

    if (!value || value.length > MAX_CONTEXT_INPUT_LENGTH) return null;
    if (!rawContext || rawContext.length > MAX_CONTEXT_INPUT_LENGTH) return null;

    const parsed = parseContextString(rawContext);
    if (!parsed) return null;

    return { value, type: 'context', context: parsed };
  }

  return null;
}

function normalizeProtectionConfig(config = {}, filePath = null) {
  const terms = normalizeList(config.terms);
  const keys = normalizeList(config.keys);
  const values = normalizeList(config.values);
  const patterns = normalizeList(config.patterns);

  const rawTerms = Array.isArray(config.terms) ? config.terms : [];
  const normalizedTerms = [];
  for (const term of rawTerms) {
    const normalized = parseContextRule(term);
    if (normalized) {
      normalizedTerms.push(normalized);
    }
  }
  const cappedTerms = normalizedTerms.slice(0, MAX_CONTEXT_RULES);

  return {
    enabled: true,
    filePath,
    terms,
    keys,
    values,
    patterns,
    compiledPatterns: compilePatterns(patterns),
    normalizedTerms: cappedTerms
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

  const rawTerms = Array.isArray(config?.terms) ? config.terms : [];
  const sanitizedTerms = [];
  for (const term of rawTerms) {
    const normalized = parseContextRule(term);
    if (normalized) {
      sanitizedTerms.push(term);
    }
  }

  const nextConfig = {
    ...defaultProtectionConfig(),
    ...(config || {}),
    terms: sanitizedTerms.slice(0, MAX_CONTEXT_RULES),
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
  return protection.values.includes(valueText) ||
    (protection.normalizedTerms || []).some(rule => rule.type === 'global' && rule.value === valueText);
}

function addReplacement(replacements, original) {
  if (!original) return;
  if (replacements.some(item => item.original === original)) return;
  replacements.push({ original });
}

function shouldProtectInContext(value, rule, index, fullText) {
  if (rule.type === 'global') return true;

  const { context } = rule;
  const before = fullText.substring(0, index);
  const after = fullText.substring(index + value.length);

  if (context.mode === 'after') {
    const alternation = context.words.map(escapeRegExp).join('|');
    const regex = new RegExp(`(^|[\\s\\p{P}])(${alternation})\\s+$`, 'iu');
    return regex.test(before);
  }

  if (context.mode === 'before') {
    const alternation = context.words.map(escapeRegExp).join('|');
    const regex = new RegExp(`^\\s+(${alternation})([\\s\\p{P}]|$)`, 'iu');
    return regex.test(after);
  }

  if (context.mode === 'standalone') {
    const isBoundaryBefore = before === '' || /(?:\s|\(|\[|\{|"|'|\-|–|—|。|、|」)$/.test(before);
    const isBoundaryAfter = after === '' || /^[\s.,!?;:)\]}<>"'\-–—。、」]/.test(after);
    return isBoundaryBefore && isBoundaryAfter;
  }

  if (context.mode === 'surrounded') {
    const leftAlternation = context.left.map(escapeRegExp).join('|');
    const rightAlternation = context.right.map(escapeRegExp).join('|');
    const leftRegex = new RegExp(`(^|[\\s\\p{P}])(${leftAlternation})\\s+$`, 'iu');
    const rightRegex = new RegExp(`^\\s+(${rightAlternation})([\\s\\p{P}]|$)`, 'iu');
    return leftRegex.test(before) && rightRegex.test(after);
  }

  return false;
}

function collectReplacements(value, protection) {
  const text = String(value);
  const replacements = [];

  const rules = protection.normalizedTerms || (protection.terms || [])
    .map(parseContextRule)
    .filter(Boolean);
  for (const rule of rules) {
    if (rule.type === 'global') {
      if (text.includes(rule.value)) {
        addReplacement(replacements, rule.value);
      }
    } else {
      if (!rule.value) continue;
      const escaped = escapeRegExp(rule.value);
      const regex = new RegExp(escaped, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        if (shouldProtectInContext(rule.value, rule, match.index, text)) {
          addReplacement(replacements, match[0]);
        }
        if (match[0] === '') regex.lastIndex++;
      }
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
      (protection.normalizedTerms && protection.normalizedTerms.length) ||
      (protection.terms && protection.terms.length) ||
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
  parseContextRule,
  protectText,
  readProtectionFile,
  restoreText,
  saveProtectionFile,
  shouldPreserveWholeValue
};
