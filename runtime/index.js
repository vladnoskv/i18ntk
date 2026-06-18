// runtime/index.js
// Lightweight, framework-agnostic runtime translation API for applications.
// Works with both single-file and modular folder structures under a base directory.
// Defaults to config values when available, but can be fully configured via initRuntime().

const fs = require('fs');
const path = require('path');
const SecurityUtils = require('../utils/security');
const { envManager } = require('../utils/env-manager');

let configManager = null;
try { configManager = require('../utils/config-manager'); } catch (_) { /* optional */ }

const SAFE_LANGUAGE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,35}$/;

function normalizeLanguageCode(value, fallback = 'en') {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return SAFE_LANGUAGE_PATTERN.test(trimmed) ? trimmed : fallback;
}

function createState(options = {}) {
  return {
    baseDir: resolveBaseDir(options.baseDir),
    language: normalizeLanguageCode(options.language, 'en'),
    fallbackLanguage: normalizeLanguageCode(options.fallbackLanguage, 'en'),
    keySeparator: options.keySeparator || '.',
    cache: new Map(),
    lazy: options.lazy === true,
    keyManifest: new Map(),
    loadedFiles: new Set(),
    eagerLoadedLanguages: new Set(),
  };
}

const singletonState = {
  baseDir: null,                // absolute path to locales dir (e.g., ./locales)
  language: 'en',
  fallbackLanguage: 'en',
  keySeparator: '.',
  cache: new Map(),             // lang -> merged translations object
  lazy: false,
  keyManifest: new Map(),       // lang -> Map: keyName -> filePath
  loadedFiles: new Set(),       // tracks loaded files in lazy mode
  eagerLoadedLanguages: new Set(),
};
let singletonInitialized = false;

// --- Utilities ---
function stripBOMAndComments(s) {
  if (!s) return s;
  if (s.charCodeAt && s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
  s = s.replace(/\/\*[\s\S]*?\*\//g, '');
  s = s.replace(/^\s*\/\/.*$/mg, '');
  return s;
}

function readJsonSafe(file) {
  const raw = SecurityUtils.safeReadFileSync(file, path.resolve(file, '..'), 'utf8');
  if (raw === null || raw === undefined) {
    throw new Error(`Unable to read JSON file: ${file}`);
  }
  const withoutBOM = raw.charCodeAt && raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  if (!withoutBOM) {
    throw new Error(`Empty JSON file: ${file}`);
  }

  let depth = 0;
  let maxDepth = 0;
  for (let i = 0; i < Math.min(withoutBOM.length, 50000); i++) {
    if (withoutBOM[i] === '{' || withoutBOM[i] === '[') { depth++; maxDepth = Math.max(maxDepth, depth); }
    else if (withoutBOM[i] === '}' || withoutBOM[i] === ']') depth--;
  }
  if (maxDepth > 1000) {
    throw new Error(`JSON nesting too deep (${maxDepth} levels) in file: ${file}`);
  }

  try {
    return stripPrototypeKeys(JSON.parse(withoutBOM));
  } catch (parseError) {
    const cleaned = stripBOMAndComments(raw);
    if (!cleaned) {
      throw new Error(`Empty JSON file: ${file}`);
    }
    try {
      return stripPrototypeKeys(JSON.parse(cleaned));
    } catch (_) {
      throw new Error(`Invalid JSON in file ${file}: ${parseError.message}`);
    }
  }
}

function stripPrototypeKeys(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => stripPrototypeKeys(item));
  const clean = {};
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    const value = obj[key];
    clean[key] = (value && typeof value === 'object') ? stripPrototypeKeys(value) : value;
  }
  return clean;
}

function deepMerge(target, source) {
  if (!target || typeof target !== 'object') target = {};
  if (!source || typeof source !== 'object') return target;
  for (const key of Object.keys(source)) {
    // Block prototype pollution via __proto__, constructor, prototype keys
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
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
  const runtimeDir = envManager.get('I18NTK_RUNTIME_DIR');
  if (runtimeDir) {
    return path.resolve(runtimeDir);
  }
  // 2b) Respect config-style env overrides, even without config-manager
  const envI18nDir = envManager.get('I18NTK_I18N_DIR');
  if (envI18nDir) {
    return path.resolve(envI18nDir);
  }
  const envSourceDir = envManager.get('I18NTK_SOURCE_DIR');
  if (envSourceDir) {
    return path.resolve(envSourceDir);
  }
  // 3) Use config-manager if available (single source of truth: i18ntk-config.json)
  try {
    const cfgRaw = configManager?.getConfig?.() || {};
    const cfg = configManager?.resolvePaths ? configManager.resolvePaths(cfgRaw) : cfgRaw;
    const base = cfg.i18nDir || cfg.sourceDir || './locales';
    // If config-manager resolved absolute paths, use as-is; otherwise resolve from project cwd
    const isAbs = typeof base === 'string' && path.isAbsolute(base);
    if (isAbs) return base;
    const envProjectRoot = envManager.get('I18NTK_PROJECT_ROOT');
    const root = envProjectRoot ? path.resolve(envProjectRoot) : process.cwd();
    return path.resolve(root, base);
  } catch (_) {
    // 4) Fallback to conventional './locales' from project CWD
    const envProjectRoot = envManager.get('I18NTK_PROJECT_ROOT');
    const root = envProjectRoot ? path.resolve(envProjectRoot) : process.cwd();
    return path.resolve(root, './locales');
  }
}

function listJsonFilesRecursively(dir, baseDir = dir) {
  const results = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    if (!SecurityUtils.safeExistsSync(d, baseDir)) continue;
    try {
      for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, entry.name);
        if (entry.isDirectory()) {
          stack.push(full);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
          results.push(full);
        }
      }
    } catch (_) {
      // Skip directories we cannot read
    }
  }
  return results;
}

function loadKeyManifestFromDir(baseDir) {
  if (!baseDir || typeof baseDir !== 'string') return new Map();
  const validatedBase = SecurityUtils.validatePath(baseDir, path.dirname(baseDir));
  const baseStat = SecurityUtils.safeStatSync(validatedBase, path.dirname(validatedBase));
  const baseRoot = baseStat && baseStat.isFile() ? path.dirname(validatedBase) : validatedBase;
  const files = baseStat && baseStat.isFile() ? [validatedBase] : listJsonFilesRecursively(validatedBase, validatedBase);
  const manifest = new Map();
  const MAX_SIZE = 100 * 1024;
  let currentSize = 0;

  for (const file of files) {
    let validated;
    try { validated = SecurityUtils.validatePath(file, baseRoot); } catch (_) { continue; }
    const rel = path.relative(baseRoot, validated);
    if (rel.startsWith('..') || path.isAbsolute(rel)) continue;

    try {
      const data = readJsonSafe(validated);
      if (!data || typeof data !== 'object') continue;

      for (const key of Object.keys(data)) {
        if (manifest.has(key)) continue;

        const entrySize = JSON.stringify(key).length + JSON.stringify(validated).length + 5;
        if (currentSize + entrySize > MAX_SIZE) break;

        manifest.set(key, validated);
        currentSize += entrySize;
      }
    } catch (_) { continue; }

    if (currentSize >= MAX_SIZE) break;
  }

  return manifest;
}

function getLanguagePath(baseDir, lang) {
  lang = normalizeLanguageCode(lang, '');
  if (!lang) return null;
  const langDir = path.join(baseDir, lang);
  const langFile = path.join(baseDir, `${lang}.json`);
  const langDirStat = SecurityUtils.safeStatSync(langDir, baseDir);
  if (langDirStat && langDirStat.isDirectory()) return langDir;
  const langFileStat = SecurityUtils.safeStatSync(langFile, baseDir);
  if (langFileStat && langFileStat.isFile()) return langFile;
  return null;
}

function getManifestForLanguage(runtimeState, lang) {
  if (!runtimeState.keyManifest) runtimeState.keyManifest = new Map();
  if (runtimeState.keyManifest.has(lang)) return runtimeState.keyManifest.get(lang);

  const languagePath = getLanguagePath(runtimeState.baseDir, lang);
  const manifest = languagePath ? loadKeyManifestFromDir(languagePath) : new Map();
  runtimeState.keyManifest.set(lang, manifest);
  return manifest;
}

function loadFileLazy(runtimeState, filePath, lang) {
  const baseDir = runtimeState.baseDir;
  if (!baseDir) throw new Error('baseDir not initialized');

  let validatedPath;
  try { validatedPath = SecurityUtils.validatePath(filePath, baseDir); } catch (e) {
    throw new Error(`Invalid file path for lazy load: ${e.message}`);
  }

  const rel = path.relative(baseDir, validatedPath);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`File outside base directory: ${filePath}`);
  }

  const data = readJsonSafe(validatedPath);
  if (data && typeof data === 'object') {
    let cacheEntry = runtimeState.cache.get(lang);
    if (!cacheEntry) cacheEntry = {};
    deepMerge(cacheEntry, data);
    runtimeState.cache.set(lang, cacheEntry);
  }
  return data;
}

function readLanguageFromBase(baseDir, lang) {
  lang = normalizeLanguageCode(lang, '');
  if (!lang) return {};
  const merged = {};
  const langFile = path.join(baseDir, `${lang}.json`);
  const langDir = path.join(baseDir, lang);

  // Prefer folder if exists, otherwise single file
  const langDirStat = SecurityUtils.safeStatSync(langDir, baseDir);
  if (langDirStat && langDirStat.isDirectory()) {
    const files = listJsonFilesRecursively(langDir, langDir);
    for (const file of files) {
      try {
        const data = readJsonSafe(file);
        if (data && typeof data === 'object') deepMerge(merged, data);
      } catch (e) {
        // Skip unreadable/invalid files
      }
    }
  } else {
    const langFileStat = SecurityUtils.safeStatSync(langFile, baseDir);
    if (langFileStat && langFileStat.isFile()) {
      try {
        const data = readJsonSafe(langFile);
        if (data && typeof data === 'object') deepMerge(merged, data);
      } catch (_) { /* ignore */ }
    }
  }

  return merged;
}

function getTranslationsForState(runtimeState, lang) {
  if (!runtimeState.baseDir) runtimeState.baseDir = resolveBaseDir();
  lang = normalizeLanguageCode(lang, runtimeState.fallbackLanguage || 'en');

  if (runtimeState.lazy) {
    if (runtimeState.cache.has(lang)) return runtimeState.cache.get(lang);
    runtimeState.cache.set(lang, {});
    getManifestForLanguage(runtimeState, lang);
    return runtimeState.cache.get(lang);
  }

  if (runtimeState.cache.has(lang)) return runtimeState.cache.get(lang);
  const data = readLanguageFromBase(runtimeState.baseDir, lang);
  runtimeState.cache.set(lang, data);
  return data;
}

function interpolate(template, params) {
  if (typeof template !== 'string') return template;
  params = params && typeof params === 'object' ? params : {};
  return template
    .replace(/\{\{(\w+)\}\}/g, (m, p1) => (p1 in params ? String(params[p1]) : m))
    .replace(/\{(\w+)\}/g, (m, p1) => (p1 in params ? String(params[p1]) : m));
}

// Resolve a dotted key path from an object
function resolveKey(obj, key, sep = '.', runtimeState = null, lang = null) {
  if (!obj || typeof obj !== 'object') return undefined;
  if (!key || typeof key !== 'string') return undefined;
  const parts = key.split(sep);
  let cur = obj;
  for (const p of parts) {
    if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
      cur = cur[p];
    } else {
      if (runtimeState && lang && runtimeState.lazy) {
        const manifest = getManifestForLanguage(runtimeState, lang);
        for (let i = parts.length; i > 0; i--) {
          const prefix = parts.slice(0, i).join(sep);
          const filePath = manifest.get(prefix);
          const loadedFileKey = `${lang}\0${filePath}`;
          if (filePath && !runtimeState.loadedFiles.has(loadedFileKey)) {
            runtimeState.loadedFiles.add(loadedFileKey);
            try {
              loadFileLazy(runtimeState, filePath, lang);
            } catch (lazyErr) {
              // stale manifest entry — log and mark as loaded to prevent retry
              if (process.env.I18NTK_DEBUG) {
                console.warn(`[i18ntk/runtime] Lazy load failed for ${filePath}: ${lazyErr.message}`);
              }
            }
            const langData = runtimeState.cache.get(lang);
            return resolveKey(langData, key, sep, runtimeState, lang);
          }
        }
        if (!runtimeState.eagerLoadedLanguages.has(lang)) {
          const fullData = readLanguageFromBase(runtimeState.baseDir, lang);
          const langData = runtimeState.cache.get(lang) || {};
          deepMerge(langData, fullData);
          runtimeState.cache.set(lang, langData);
          runtimeState.eagerLoadedLanguages.add(lang);
          return resolveKey(langData, key, sep, runtimeState, lang);
        }
        return undefined;
      }
      return undefined;
    }
  }
  return cur;
}

// --- Public API ---
function initRuntime(options = {}) {
  // Support alias parameter names for better DX
  const opts = { ...options };
  if (opts.localeDir && !opts.baseDir) opts.baseDir = opts.localeDir;
  if (opts.targetLocale && !opts.language) opts.language = opts.targetLocale;
  if (opts.sourceLocale && !opts.fallbackLanguage) opts.fallbackLanguage = opts.sourceLocale;
  if (opts.projectRoot && !opts.baseDir && opts.localeDir) opts.baseDir = path.resolve(opts.projectRoot, opts.localeDir);

  const runtimeState = createState(opts);
  preload(runtimeState, options.preload);

  if (!singletonInitialized) {
    singletonState.baseDir = runtimeState.baseDir;
    singletonState.language = runtimeState.language;
    singletonState.fallbackLanguage = runtimeState.fallbackLanguage;
    singletonState.keySeparator = runtimeState.keySeparator;
    singletonState.lazy = runtimeState.lazy;
    singletonState.keyManifest = new Map();
    singletonState.loadedFiles = new Set();
    singletonState.eagerLoadedLanguages = new Set();
    singletonState.cache.clear();
    preload(singletonState, options.preload);
    singletonInitialized = true;
  }

  return createRuntime(runtimeState);
}

function preload(runtimeState, shouldPreload) {
  if (shouldPreload === true) {
    if (runtimeState.lazy) {
      getManifestForLanguage(runtimeState, runtimeState.language);
      if (!runtimeState.cache.has(runtimeState.language)) {
        runtimeState.cache.set(runtimeState.language, {});
      }
      if (runtimeState.fallbackLanguage && runtimeState.fallbackLanguage !== runtimeState.language) {
        getManifestForLanguage(runtimeState, runtimeState.fallbackLanguage);
        if (!runtimeState.cache.has(runtimeState.fallbackLanguage)) {
          runtimeState.cache.set(runtimeState.fallbackLanguage, {});
        }
      }
    } else {
      getTranslationsForState(runtimeState, runtimeState.language);
      if (runtimeState.fallbackLanguage && runtimeState.fallbackLanguage !== runtimeState.language) {
        getTranslationsForState(runtimeState, runtimeState.fallbackLanguage);
      }
    }
  }
}

function createRuntime(runtimeState) {
  const runtimeTranslate = (key, params, options) => translateWithState(runtimeState, key, params, options);
  return {
    t: runtimeTranslate,
    translate: runtimeTranslate,
    translateBatch: (keys, params, options) => translateBatchWithState(runtimeState, keys, params, options),
    setLanguage: (lang) => setLanguageForState(runtimeState, lang),
    getLanguage: () => getLanguageForState(runtimeState),
    getAvailableLanguages: () => getAvailableLanguagesForState(runtimeState),
    clearCache: (lang) => clearCacheForState(runtimeState, lang),
    getCacheInfo: () => getCacheInfoForState(runtimeState),
    refresh: (lang) => refreshForState(runtimeState, lang),
  };
}

function translate(key, params = {}, options = {}) {
  return translateWithState(singletonState, key, params, options);
}

function translateWithState(runtimeState, key, params = {}, options = {}) {
  params = params && typeof params === 'object' ? params : {};
  options = options && typeof options === 'object' ? options : {};

  const activeLanguage = normalizeLanguageCode(options.language, runtimeState.language);
  const fallbackLanguage = typeof options.fallbackLanguage === 'string'
    ? normalizeLanguageCode(options.fallbackLanguage, '')
    : runtimeState.fallbackLanguage;

  const langData = getTranslationsForState(runtimeState, activeLanguage);
  let value = resolveKey(langData, key, runtimeState.keySeparator, runtimeState, activeLanguage);

  if (typeof value === 'undefined' && fallbackLanguage && fallbackLanguage !== activeLanguage) {
    const fbData = getTranslationsForState(runtimeState, fallbackLanguage);
    value = resolveKey(fbData, key, runtimeState.keySeparator, runtimeState, fallbackLanguage);
  }

  if (typeof value === 'string') return interpolate(value, params);
  if (typeof value === 'undefined') return typeof key === 'string' ? key : String(key ?? '');
  return typeof value === 'string' ? value : String(value ?? '');
}

function translateBatch(keys, params = {}, options = {}) {
  return translateBatchWithState(singletonState, keys, params, options);
}

function translateBatchWithState(runtimeState, keys, params = {}, options = {}) {
  if (!Array.isArray(keys)) return [];
  return keys.map((key, index) => {
    const perKeyParams = Array.isArray(params) ? (params[index] || {}) : params;
    return translateWithState(runtimeState, key, perKeyParams, options);
  });
}

function setLanguage(lang) {
  setLanguageForState(singletonState, lang);
}

function setLanguageForState(runtimeState, lang) {
  const safeLang = normalizeLanguageCode(lang, '');
  if (!safeLang) return;
  runtimeState.language = safeLang;
}

function getLanguage() {
  return getLanguageForState(singletonState);
}

function getLanguageForState(runtimeState) {
  return runtimeState.language;
}

function getAvailableLanguages() {
  return getAvailableLanguagesForState(singletonState);
}

function getAvailableLanguagesForState(runtimeState) {
  const langs = new Set();
  if (!runtimeState.baseDir) runtimeState.baseDir = resolveBaseDir();
  if (!SecurityUtils.safeExistsSync(runtimeState.baseDir, path.dirname(runtimeState.baseDir))) return ['en'];
  try {
    for (const entry of fs.readdirSync(runtimeState.baseDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
        const lang = normalizeLanguageCode(entry.name.replace(/\.json$/i, ''), '');
        if (lang) langs.add(lang);
      } else if (entry.isDirectory()) {
        const lang = normalizeLanguageCode(entry.name, '');
        if (!lang) continue;
        const idx = path.join(runtimeState.baseDir, lang, `${lang}.json`);
        if (SecurityUtils.safeExistsSync(idx, runtimeState.baseDir)) langs.add(lang);
        else langs.add(lang); // be permissive
      }
    }
  } catch (_) {
    // Unreadable directory
    return ['en'];
  }
  return Array.from(langs.size ? langs : new Set(['en']));
}

function clearCache(lang) {
  clearCacheForState(singletonState, lang);
}

function clearCacheForState(runtimeState, lang) {
  if (typeof lang === 'string') {
    refreshForState(runtimeState, lang);
    return;
  }

  runtimeState.cache.clear();
  if (runtimeState.keyManifest) runtimeState.keyManifest.clear();
  if (runtimeState.loadedFiles) runtimeState.loadedFiles.clear();
  if (runtimeState.eagerLoadedLanguages) runtimeState.eagerLoadedLanguages.clear();
}

function getCacheInfo() {
  return getCacheInfoForState(singletonState);
}

function getCacheInfoForState(runtimeState) {
  return {
    language: runtimeState.language,
    fallbackLanguage: runtimeState.fallbackLanguage,
    lazy: runtimeState.lazy === true,
    cachedLanguages: Array.from(runtimeState.cache.keys()).sort(),
    manifestLanguages: runtimeState.keyManifest ? Array.from(runtimeState.keyManifest.keys()).sort() : [],
    loadedFileCount: runtimeState.loadedFiles ? runtimeState.loadedFiles.size : 0,
    eagerLoadedLanguages: runtimeState.eagerLoadedLanguages ? Array.from(runtimeState.eagerLoadedLanguages).sort() : [],
  };
}

function refresh(lang) {
  refreshForState(singletonState, lang);
}

function refreshForState(runtimeState, lang = runtimeState.language) {
  lang = normalizeLanguageCode(lang, '');
  if (!lang) return;
  if (runtimeState.cache.has(lang)) runtimeState.cache.delete(lang);
  if (runtimeState.eagerLoadedLanguages) runtimeState.eagerLoadedLanguages.delete(lang);
  if (runtimeState.keyManifest) runtimeState.keyManifest.delete(lang);
  if (runtimeState.loadedFiles) {
    for (const fileKey of Array.from(runtimeState.loadedFiles)) {
      if (fileKey.startsWith(`${lang}\0`)) runtimeState.loadedFiles.delete(fileKey);
    }
  }
  if (lang !== runtimeState.fallbackLanguage && runtimeState.cache.has(runtimeState.fallbackLanguage)) {
    // do nothing; keep or clear on demand
  }
}

module.exports = {
  initRuntime,
  translate,
  t: translate,
  translateBatch,
  setLanguage,
  getLanguage,
  getAvailableLanguages,
  clearCache,
  getCacheInfo,
  refresh,
  loadKeyManifest: (baseDir) => loadKeyManifestFromDir(baseDir || singletonState.baseDir),
};
