// runtime/index.js
// Lightweight, framework-agnostic runtime translation API for applications.
// Works with both single-file and modular folder structures under a base directory.
// Defaults to config values when available, but can be fully configured via initRuntime().

const fs = require('fs');
const path = require('path');
const SecurityUtils = require('../utils/security');

let configManager = null;
try { configManager = require('../utils/config-manager'); } catch (_) { /* optional */ }

const state = {
  baseDir: null,                // absolute path to locales dir (e.g., ./locales)
  language: 'en',
  fallbackLanguage: 'en',
  keySeparator: '.',
  cache: new Map(),             // lang -> merged translations object
};

// --- Utilities ---
function stripBOMAndComments(s) {
  if (!s) return s;
  if (s.charCodeAt && s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
  s = s.replace(/\/\*[\s\S]*?\*\//g, '');
  s = s.replace(/^\s*\/\/.*$/mg, '');
  return s;
}

function readJsonSafe(file) {
  const raw = SecurityUtils.safeReadFileSync(file, 'utf8');
  if (!raw) return {};
  return JSON.parse(stripBOMAndComments(raw));
}

function deepMerge(target, source) {
  if (!target || typeof target !== 'object') target = {};
  if (!source || typeof source !== 'object') return target;
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (
      sv && typeof sv === 'object' && !Array.isArray(sv) &&
      tv && typeof tv === 'object' && !Array.isArray(tv)
    ) {
      target[key] = deepMerge({ ...tv }, sv);
    } else {
      target[key] = sv;
    }
  }
  return target;
}

function resolveBaseDir(explicitBaseDir) {
  // 1) Highest priority: explicit option
  if (explicitBaseDir) return path.resolve(explicitBaseDir);
  
  // 2) Environment override for CI/explicit control
  if (process.env.I18NTK_RUNTIME_DIR) {
    return path.resolve(process.env.I18NTK_RUNTIME_DIR);
  }
  
  // 2b) Respect config-style env overrides, even without config-manager
  if (process.env.I18NTK_I18N_DIR) {
    return path.resolve(process.env.I18NTK_I18N_DIR);
  }
  if (process.env.I18NTK_SOURCE_DIR) {
    return path.resolve(process.env.I18NTK_SOURCE_DIR);
  }
  
  // 3) Use config-manager if available (single source of truth: i18ntk-config.json)
  try {
    const cfgRaw = configManager?.getConfig?.() || {};
    const cfg = configManager?.resolvePaths ? configManager.resolvePaths(cfgRaw) : cfgRaw;
    const base = cfg.i18nDir || cfg.sourceDir || './locales';
    
    // If config-manager resolved absolute paths, use as-is; otherwise resolve from project cwd
    const isAbs = typeof base === 'string' && path.isAbsolute(base);
    if (isAbs) return base;
    
    // Use dynamic project root resolution
    const root = process.env.I18NTK_PROJECT_ROOT ? 
      path.resolve(process.env.I18NTK_PROJECT_ROOT) : 
      process.cwd();
    
    // Ensure the path is resolved relative to the actual project root
    return path.resolve(root, base);
  } catch (_) {
    // 4) Fallback to conventional './locales' from project CWD
    const root = process.env.I18NTK_PROJECT_ROOT ? 
      path.resolve(process.env.I18NTK_PROJECT_ROOT) : 
      process.cwd();
    return path.resolve(root, './locales');
  }
}

function listJsonFilesRecursively(dir) {
  const results = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    if (!SecurityUtils.safeExistsSync(d)) continue;
    const entries = SecurityUtils.safeReaddirSync(d, { withFileTypes: true });
    if (!entries) continue;
    for (const entry of entries) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
        results.push(full);
      }
    }
  }
  return results;
}

function readLanguageFromBase(baseDir, lang) {
  const merged = {};
  const langFile = path.join(baseDir, `${lang}.json`);
  const langDir = path.join(baseDir, lang);

  // Prefer folder if exists, otherwise single file
  const langDirStats = SecurityUtils.safeStatSync(langDir);
  if (langDirStats && langDirStats.isDirectory()) {
    const files = listJsonFilesRecursively(langDir);
    for (const file of files) {
      try {
        const data = readJsonSafe(file);
        if (data && typeof data === 'object') deepMerge(merged, data);
      } catch (e) {
        // Skip unreadable/invalid files
      }
    }
  } else {
    const langFileStats = SecurityUtils.safeStatSync(langFile);
    if (langFileStats && langFileStats.isFile()) {
      try {
        const data = readJsonSafe(langFile);
        if (data && typeof data === 'object') deepMerge(merged, data);
      } catch (_) { /* ignore */ }
    }
  }

  return merged;
}

function getTranslations(lang) {
  if (state.cache.has(lang)) return state.cache.get(lang);
  const data = readLanguageFromBase(state.baseDir, lang);
  state.cache.set(lang, data);
  return data;
}

function interpolate(template, params) {
  if (typeof template !== 'string') return template;
  return template
    .replace(/\{\{(\w+)\}\}/g, (m, p1) => (p1 in params ? String(params[p1]) : m))
    .replace(/\{(\w+)\}/g, (m, p1) => (p1 in params ? String(params[p1]) : m));
}

// Resolve a dotted key path from an object
function resolveKey(obj, key, sep = '.') {
  if (!obj || typeof obj !== 'object') return undefined;
  if (!key || typeof key !== 'string') return undefined;
  const parts = key.split(sep);
  let cur = obj;
  for (const p of parts) {
    if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
      cur = cur[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

// --- Public API ---
function initRuntime(options = {}) {
  state.baseDir = resolveBaseDir(options.baseDir);
  state.language = options.language || state.language || 'en';
  state.fallbackLanguage = options.fallbackLanguage || state.fallbackLanguage || 'en';
  state.keySeparator = options.keySeparator || state.keySeparator || '.';
  // Optional prewarm caches
  state.cache.clear();
  if (options.preload === true) {
    getTranslations(state.language);
    if (state.fallbackLanguage && state.fallbackLanguage !== state.language) {
      getTranslations(state.fallbackLanguage);
    }
  }
  return {
    t: translate,
    translate,
    setLanguage,
    getLanguage,
    getAvailableLanguages,
    refresh,
  };
}

function translate(key, params = {}) {
  const langData = getTranslations(state.language);
  let value = resolveKey(langData, key, state.keySeparator);

  if (typeof value === 'undefined' && state.fallbackLanguage) {
    const fbData = getTranslations(state.fallbackLanguage);
    value = resolveKey(fbData, key, state.keySeparator);
  }

  if (typeof value === 'string') return interpolate(value, params);
  return typeof value === 'undefined' ? key : value;
}

function setLanguage(lang) {
  if (!lang || typeof lang !== 'string') return;
  state.language = lang;
}

function getLanguage() {
  return state.language;
}

function getAvailableLanguages() {
  const langs = new Set();
  if (!state.baseDir) state.baseDir = resolveBaseDir();
  if (!SecurityUtils.safeExistsSync(state.baseDir)) return ['en'];
  for (const entry of SecurityUtils.safeReaddirSync(state.baseDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
      langs.add(entry.name.replace(/\.json$/i, ''));
    } else if (entry.isDirectory()) {
      // language folder convention
      const lang = entry.name;
      const idx = path.join(state.baseDir, lang, `${lang}.json`);
      if (SecurityUtils.safeExistsSync(idx)) langs.add(lang);
      else langs.add(lang); // be permissive
    }
  }
  return Array.from(langs.size ? langs : new Set(['en']));
}

function refresh(lang = state.language) {
  if (state.cache.has(lang)) state.cache.delete(lang);
  if (lang !== state.fallbackLanguage && state.cache.has(state.fallbackLanguage)) {
    // do nothing; keep or clear on demand
  }
}

module.exports = {
  initRuntime,
  translate,
  t: translate,
  setLanguage,
  getLanguage,
  getAvailableLanguages,
  refresh,
};
