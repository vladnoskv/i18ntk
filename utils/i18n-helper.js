// utils/i18n-helper.js
const path = require('path');
const fs = require('fs');

function safeRequireConfig() {
  try { return require('./config-manager'); } catch { return null; }
}

function stripBOMAndComments(s) {
  if (s.charCodeAt(0) === 0xFEFF) s = s.slice(1);
  s = s.replace(/\/\*[\s\S]*?\*\//g, '');
  s = s.replace(/^\s*\/\/.*$/mg, '');
  return s;
}

function readJsonSafe(file) {
  const raw = fs.readFileSync(file, 'utf8');
  return JSON.parse(stripBOMAndComments(raw));
}

function pkgUiLocalesDirViaThisFile() {
  return path.resolve(__dirname, '..', 'ui-locales');
}

function pkgUiLocalesDirViaResolve() {
  try {
    const mainPath = require.resolve('i18ntk'); // .../i18ntk/main/i18ntk-manage.js
    const root = path.dirname(path.dirname(mainPath));
    return path.join(root, 'ui-locales');
  } catch { return null; }
}

function projectUiLocalesDir() {
  return path.resolve(process.cwd(), 'ui-locales');
}

function resolveLocalesDirs(baseDir) {
  const dirs = [];
  const addDir = dir => {
    if (typeof dir === 'string' && dir.trim())
      dirs.push(path.resolve(dir.trim()));
  };

  // If a baseDir is provided, normalise it. Handle file paths gracefully.
  if (typeof baseDir === 'string' && baseDir.trim()) {
    const resolved = path.resolve(baseDir.trim());
    addDir(fs.existsSync(resolved) && fs.statSync(resolved).isFile()
      ? path.dirname(resolved)
      : resolved);
  }

  // Environment override
  if (process.env.I18NTK_UI_LOCALE_DIR && process.env.I18NTK_UI_LOCALE_DIR.trim())
        addDir(process.env.I18NTK_UI_LOCALE_DIR);

  // Settings configuration

  const cfg = safeRequireConfig();
  if (cfg) {
    try {
      const settings = cfg.getConfig?.() || {};
      if (typeof settings.uiLocalesDir === 'string' && settings.uiLocalesDir.trim())
        addDir(settings.uiLocalesDir);
    } catch {}
  }

// Package directories take precedence over project directories
  const pkgA = pkgUiLocalesDirViaThisFile();
  addDir(pkgA);
  const pkgB = pkgUiLocalesDirViaResolve();
  if (pkgB && pkgB !== pkgA) addDir(pkgB);

  // Finally fall back to project directory
  addDir(projectUiLocalesDir());

  return [...new Set(dirs)];
}

function candidatesForLang(dir, lang) {
  return [
    path.join(dir, `${lang}.json`),
    path.join(dir, lang, `${lang}.json`),
    path.join(dir, lang, 'index.json')
  ];
}

function findLocaleFilesAllDirs(lang, baseDir) {
  const dirs = resolveLocalesDirs(baseDir);
  const files = [];
  for (const d of dirs) {
    for (const p of candidatesForLang(d, lang)) {
      try {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) files.push(p);
      } catch {}
    }
  }
  return files;
}

let translations = {};
let currentLanguage = 'en';
let isInitialized = false;

function loadTranslations(language, baseDir) {
  const cfg = safeRequireConfig();
  const settings = cfg?.getConfig?.() || {};
  const configuredLanguage = settings.uiLanguage || settings.language || 'en';

  const requested = (language || configuredLanguage || 'en').toString();
  const short = requested.split('-')[0].toLowerCase();
  const tryOrder = [requested, short, 'en'];

  for (const lang of tryOrder) {
   const files = findLocaleFilesAllDirs(lang, baseDir);
    for (const file of files) {
      try {
        translations = readJsonSafe(file);
        currentLanguage = lang;
        isInitialized = true;
        if (process.env.I18NTK_DEBUG_LOCALES === '1') {
          console.log(`🗂 Loaded UI locale → ${file}`);
        }
        return translations;
      } catch (e) {
        console.warn(`⚠️ Failed to parse ${file}: ${e.message}. Trying next fallback...`);
      }
    }
  }

  translations = {
    menu: {
      title: '🌍 i18ntk - I18N Management',
      separator: '============================================================',
      options: {
        init: 'Initialize new languages',
        analyze: 'Analyze translations',
        validate: 'Validate translations',
        usage: 'Check key usage',
        complete: 'Complete translations',
        sizing: 'Analyze sizing',
        workflow: 'Run full workflow',
        status: 'Show project status',
        delete: 'Delete all reports',
        settings: 'Settings',
        help: 'Help',
        debug: 'Debug Tools',
        language: 'Change UI language',
        exit: 'Exit'
      },
      selectOptionPrompt: 'Select an option:'
    }
  };
  currentLanguage = 'en';
  isInitialized = true;
  console.warn('⚠️ No UI locale files found/parsable. Using minimal built-in strings.');
  return translations;
}

/**
 * Get a translated string by key
 * @param {string} key - Translation key (e.g., 'module.subkey')
 * @param {object} params - Parameters to interpolate into the translation
 * @returns {string} - Translated string or the key if translation not found
 */
function t(key, params = {}) {
  // Auto-initialize translations if not already loaded
  if (!isInitialized) {
    loadTranslations();
    isInitialized = true;
  }
  
  // Split the key into parts (e.g., 'module.subkey' -> ['module', 'subkey'])
  const keyParts = key.split('.');
  let value = translations;

  // Try to find the key in the main translations object
  for (let i = 0; i < keyParts.length; i++) {
    const part = keyParts[i];
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      value = undefined; // Key not found in main path
      break;
    }
  }

  // If not found, try to find it in hardcodedTexts
  if (typeof value === 'undefined' && translations.hardcodedTexts) {
    let hardcodedValue = translations.hardcodedTexts;
    for (const part of keyParts) {
      if (hardcodedValue && typeof hardcodedValue === 'object' && part in hardcodedValue) {
        hardcodedValue = hardcodedValue[part];
      } else {
        hardcodedValue = undefined; // Key not found in hardcodedTexts path
        break;
      }
    }
    if (typeof hardcodedValue !== 'undefined') {
      value = hardcodedValue;
    }
  }

  if (typeof value === 'undefined') {
    console.warn(`Translation not found for key: ${key}`);
    return key;
  }
  
  // If we found a string, interpolate parameters
  if (typeof value === 'string') {
    return interpolateParams(value, params);
  }
  
  // Return the key if the final value is not a string
  console.warn(`Translation key does not resolve to a string: ${key}`);
  return key;
}

/**
 * Interpolate parameters into a translation string
 * @param {string} template - Template string with {{param or {param} placeholders
 * @param {object} params - Parameters to interpolate
 * @returns {string} - Interpolated string
 */
function interpolateParams(template, params) {
  // Handle both {{param}} and {param} formats
  return template
    .replace(/\{\{(\w+)\}\}/g, (match, paramName) => {
      if (paramName in params) {
        return params[paramName];
      }
      return match;
    })
    .replace(/\{(\w+)\}/g, (match, paramName) => {
      if (paramName in params) {
        return params[paramName];
      }
      return match;
    });
}

/**
 * Get the current language
 * @returns {string} - Current language code
 */
function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * Get all available languages
 * @returns {string[]} - Array of available language codes
 */
function getAvailableLanguages(baseDir) {
  const dirs = resolveLocalesDirs(baseDir);
  const langs = new Set();
  for (const d of dirs) {
    try {
      if (!fs.existsSync(d)) continue;
      for (const f of fs.readdirSync(d)) {
        if (f.endsWith('.json')) langs.add(path.basename(f, '.json'));
      }
      for (const f of fs.readdirSync(d, { withFileTypes: true })) {
        if (f.isDirectory() && fs.existsSync(path.join(d, f.name, `${f.name}.json`))) {
          langs.add(f.name);
        }
      }
    } catch {}
  }
  return Array.from(langs.size ? langs : new Set(['en']));
}

/**
 * Deep merges two objects.
 * @param {object} target - The target object.
 * @param {object} source - The source object.
 * @returns {object} - The merged object.
 */
function deepMerge(target, source) {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key]) &&
          typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key])) {
        target[key] = deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
  return target;
}

/**
 * Refresh language from settings manager
 * This ensures translations stay in sync with settings changes
 */
function refreshLanguageFromSettings() {
  const cfg = safeRequireConfig();
  const settings = cfg?.getConfig?.() || {};
  const configuredLanguage = settings.language || settings.uiLanguage || 'en';
  
  if (configuredLanguage !== currentLanguage) {
    isInitialized = false;
    loadTranslations(configuredLanguage);
  }
}

/**
 * Refresh translations (alias for refreshLanguageFromSettings)
 */
function refreshTranslations() {
  refreshLanguageFromSettings();
}

module.exports = {
  loadTranslations,
  t,
  getCurrentLanguage,
  getAvailableLanguages,
  deepMerge,
  refreshTranslations,
  refreshLanguageFromSettings
};