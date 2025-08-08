const fs = require('fs');
const path = require('path');

// Project root is where commands are executed
const projectRoot = process.cwd();
const CONFIG_DIR = path.join(projectRoot, '.i18ntk');
const CONFIG_PATH = path.join(CONFIG_DIR, 'i18ntk-config.json');

// Default configuration values
const DEFAULT_CONFIG = {
  projectRoot: '.',
  sourceDir: './locales',
  i18nDir: './locales',
  outputDir: './i18ntk-reports',
  uiLocalesDir: './ui-locales',
  scriptDirectories: {
    init: null,
    analyze: null,
    validate: null,
    usage: null,
    sizing: null,
    summary: null,
    complete: null,
    manage: null,
  },
  sourceLanguage: 'en',
  uiLanguage: 'en',
  defaultLanguages: ['de', 'es', 'fr', 'ru'],
  notTranslatedMarker: 'NOT_TRANSLATED',
  excludeFiles: ['.DS_Store', 'Thumbs.db'],
  strictMode: false,
};

let currentConfig = null;

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function toRelative(absPath) {
  if (!absPath) return absPath;
  const rel = path.relative(projectRoot, absPath);
  const normalized = rel ? `./${rel.replace(/\\/g, '/')}` : '.';
  return normalized;
}

function normalizePathValue(keyPath, value) {
  if (typeof value !== 'string') return value;
  const last = keyPath.split('.').pop();
  if (/dir|directory|root|path$/i.test(last)) {
    const abs = path.resolve(projectRoot, value);
    return toRelative(abs);
  }
  return value;
}

function deepMerge(target, source, basePath = '') {
  for (const [key, val] of Object.entries(source || {})) {
    const pathKey = basePath ? `${basePath}.${key}` : key;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {};
      deepMerge(target[key], val, pathKey);
    } else {
      target[key] = normalizePathValue(pathKey, val);
    }
  }
  return target;
}

function loadConfig() {
  if (currentConfig) return currentConfig;
  let cfg = clone(DEFAULT_CONFIG);
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      const parsed = JSON.parse(data);
      cfg = deepMerge(clone(DEFAULT_CONFIG), parsed);
    }
  } catch (_) {
    // ignore and use defaults
  }
  currentConfig = cfg;
  return currentConfig;
}

function saveConfig(cfg = currentConfig) {
  if (!cfg) return;
  ensureConfigDir();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

function getConfig() {
  return loadConfig();
}

function setConfig(cfg) {
  currentConfig = deepMerge(clone(DEFAULT_CONFIG), cfg || {});
  saveConfig();
  return currentConfig;
}

function updateConfig(patch) {
  const cfg = loadConfig();
  deepMerge(cfg, patch);
  saveConfig();
  return cfg;
}

function resetToDefaults() {
  currentConfig = clone(DEFAULT_CONFIG);
  saveConfig();
  return currentConfig;
}

function resolvePaths(cfg = getConfig()) {
  const root = path.resolve(projectRoot, cfg.projectRoot || '.');
  const resolved = clone(cfg);
  resolved.projectRoot = root;
  ['sourceDir', 'i18nDir', 'outputDir', 'uiLocalesDir'].forEach(key => {
    if (resolved[key]) resolved[key] = path.resolve(root, resolved[key]);
  });
  if (resolved.scriptDirectories) {
    resolved.scriptDirectories = { ...resolved.scriptDirectories };
    for (const [k, v] of Object.entries(resolved.scriptDirectories)) {
      if (v) resolved.scriptDirectories[k] = path.resolve(root, v);
    }
  }
  return resolved;
}

function toRelative(absolutePath) {
  const rel = path.relative(projectRoot, absolutePath);
  return rel || '.';
}

module.exports = {
  CONFIG_PATH,
  DEFAULT_CONFIG,
  loadConfig,
  saveConfig,
  getConfig,
  updateConfig,
  setConfig,
  resetToDefaults,
  resolvePaths,
  toRelative,
  normalizePathValue,
};
