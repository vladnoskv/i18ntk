// utils/i18n-helper.js
const path = require('path');
const fs = require('fs');

// Lazy load SecurityUtils to prevent circular dependencies
let securityUtils;
function getSecurityUtils() {
  if (!securityUtils) {
    try {
      securityUtils = require('./security');
    } catch (error) {
      // Fallback: use basic fs operations if SecurityUtils is not available
      return {
        safeExistsSync: (path) => {
          try {
            return require('fs').existsSync(path);
          } catch {
            return false;
          }
        },
        safeWriteFileSync: (path, encoding) => {
          try {
            return require('fs').readFileSync(path, encoding);
          } catch {
            return null;
          }
        }
      };
    }
  }
  return securityUtils;
}

// Helper functions for OS-agnostic path handling
function toPosix(p) { return String(p).replace(/\\/g, '/'); }
function isBundledPath(p) {
  const s = toPosix(p);
  return s.includes('/node_modules/i18ntk/') || s.includes('/i18ntk/ui-locales/');
}

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
  const SecurityUtils = getSecurityUtils();
  const raw = SecurityUtils.safeWriteFileSync(file, 'utf8');
  return JSON.parse(stripBOMAndComments(raw));
}

function pkgUiLocalesDirViaThisFile() {
  return path.resolve(__dirname, '..', 'ui-locales');
}

function pkgUiLocalesDirViaResolve() {
  try {
    const enJson = require.resolve('i18ntk/ui-locales/en.json');
    return path.dirname(enJson);
  } catch { return null; }
}

function resolveLocalesDirs() {
  const dirs = [];
  const addDir = (dir) => {
    if (typeof dir === 'string' && dir.trim()) {
      try {
        const normalized = path.normalize(path.resolve(dir.trim()));

        const SecurityUtils = getSecurityUtils();
        if (SecurityUtils.safeExistsSync(normalized) && fs.statSync(normalized).isDirectory()) {
          dirs.push(normalized);
        }
      } catch {
        // Silently ignore invalid paths
      }
    }
  };

  const pkgA = pkgUiLocalesDirViaThisFile();
  addDir(pkgA);

  const pkgB = pkgUiLocalesDirViaResolve();
  if (pkgB && pkgB !== pkgA) {
    addDir(pkgB);
  }

  // Deduplicate while preserving order
  const seen = new Set();
    return dirs.filter(dir => {
    if (seen.has(dir)) return false;
    seen.add(dir);
    return true;
  });
}

function candidatesForLang(dir, lang) {
  return [
    path.join(dir, `${lang}.json`),          // ui-locales/en.json
    path.join(dir, lang, 'index.json')       // ui-locales/en/index.json
  ];
}

function findLocaleFilesAllDirs(lang) {
  const dirs = resolveLocalesDirs();

  if (process.env.I18NTK_DEBUG_LOCALES === '1') {
    console.log('🔎 i18ntk locale search dirs:', dirs);
  }

  const files = [];
  const errors = [];

  for (const dir of dirs) {
    for (const candidate of candidatesForLang(dir, lang)) {
      try {
        const SecurityUtils = getSecurityUtils();
        if (SecurityUtils.safeExistsSync(candidate)) {
          const stats = fs.statSync(candidate);
          if (stats.isFile() && stats.size > 0) {
            // Validate file is readable and parseable
            fs.accessSync(candidate, fs.constants.R_OK);
            // Quick JSON validation
            const content = SecurityUtils.safeReadFileSync(candidate, 'utf8');
            if (content) {
              if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
                files.push(candidate);
              } else {
                errors.push({ file: candidate, error: 'Invalid JSON format' });
              }
            } else {
              errors.push({ file: candidate, error: 'Empty or unreadable file' });
            }
          }
        }
      } catch (error) {
        errors.push({ file: candidate, error: error.message });
      }
    }
  }

  if (process.env.I18NTK_DEBUG_LOCALES === '1' && errors.length > 0) {
    console.warn(`⚠️ Locale resolution errors for ${lang}:`, errors);
  }

  return files;
}

let translations = {};
let currentLanguage = 'en';
let isInitialized = false;
const missingWarned = new Set();

function loadTranslations(language) {
  const cfg = safeRequireConfig();
  const settings = cfg?.getConfig?.() || {};
  const configuredLanguage = settings.uiLanguage || settings.language || 'en';

  // Prioritize settings file language over environment variable
  const requested = (configuredLanguage || language || 'en').toString();
  const short = requested.split('-')[0].toLowerCase();
  const tryOrder = [requested, short, 'en'];

  const loadErrors = [];

  for (const lang of tryOrder) {
    const files = findLocaleFilesAllDirs(lang);

    // Prioritize bundled locales over project ones
      const prioritizedFiles = files.sort((a, b) => Number(isBundledPath(b)) - Number(isBundledPath(a)));

    for (const file of prioritizedFiles) {
      try {
        translations = readJsonSafe(file);
        currentLanguage = lang;
        isInitialized = true;

        if (process.env.I18NTK_DEBUG_LOCALES === '1') {
          console.log(`🗂 Loaded UI locale → ${file} (${lang})`);
        }

        // Validate translations object
        if (typeof translations === 'object' && translations !== null) {
          return translations;
        } else {
          loadErrors.push({ file, error: 'Invalid translation format' });
        }
      } catch (e) {
        loadErrors.push({ file, error: e.message });
        if (process.env.I18NTK_DEBUG_LOCALES === '1') {
          console.warn(`⚠️ Failed to parse ${file}: ${e.message}`);
        }
      }
    }
  }

  // Log comprehensive error summary if debugging
  if (process.env.I18NTK_DEBUG_LOCALES === '1' && loadErrors.length > 0) {
    console.warn(`📊 Locale loading errors summary:`, {
      requested: requested,
      triedLanguages: tryOrder,
      errors: loadErrors
    });
  }

  // Fallback to built-in minimal translations
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

  if (loadErrors.length > 0) {
    console.warn(`⚠️ No valid UI locale files found. Using built-in English strings.`);
  }

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
    if (!missingWarned.has(key)) {
      missingWarned.add(key);
      console.warn(`Translation key not found: ${key}`);
    }
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
function getAvailableLanguages() {
  const dirs = resolveLocalesDirs();
  const langs = new Set();
  for (const d of dirs) {
    try {
      const SecurityUtils = getSecurityUtils();
      if (!SecurityUtils.safeExistsSync(d)) continue;
      for (const f of fs.readdirSync(d)) {
        if (f.endsWith('.json')) langs.add(path.basename(f, '.json'));
      }
      for (const f of fs.readdirSync(d, { withFileTypes: true })) {
        if (f.isDirectory() && SecurityUtils.safeExistsSync(path.join(d, f.name, `${f.name}.json`))) {
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