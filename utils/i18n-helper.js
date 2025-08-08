const path = require('path');
const fs = require('fs');
const configManager = require('./config-manager');

// Get configuration from settings manager
function getConfig() {
  const settings = configManager.getConfig();
  
  // Always use the package's ui-locales directory, regardless of current working directory
  const packageDir = path.join(__dirname, '..');
  const uiLocalesDir = path.join(packageDir, 'ui-locales');
  
  return {
    uiLocalesDir
  };
}

// Global translations object
let translations = {};
let currentLanguage = 'en';
let isInitialized = false;

/**
 * Load translations from the ui-locales directory
 * @param {string} language - Language code (default: 'en')
 * @param {string} baseDir - Base directory for locale files (optional)
 */
function loadTranslations(language, baseDir) {
  const settings = configManager.getConfig();
  const configuredLanguage = settings.uiLanguage || settings.language || 'en';
  currentLanguage = language || configuredLanguage;
  
  // Use provided directory, environment variable, or default
  let localesDir = baseDir;

  // Ensure we have a string path to resolve
  if (typeof localesDir !== 'string' || localesDir.trim() === '') {
    localesDir = process.env.I18NTK_UI_LOCALE_DIR;
  }
  if (typeof localesDir !== 'string' || localesDir.trim() === '') {
    const config = getConfig();
    localesDir = config.uiLocalesDir || path.join(__dirname, '..', 'ui-locales');
  }

  // Ensure localesDir is a valid string
  if (typeof localesDir !== 'string' || localesDir.trim() === '') {
    localesDir = path.join(__dirname, '..', 'ui-locales');
  }

  try {
    localesDir = path.resolve(localesDir);
  } catch (resolveError) {
    // Fallback to package ui-locales directory if resolution fails
    localesDir = path.join(__dirname, '..', 'ui-locales');
  }
  
  try {
    translations = {}; // Reset translations for the new language
    
    // Primary: Use monolith JSON file (en.json, de.json, etc.)
    const monolithTranslationFile = path.join(localesDir, `${language}.json`);
    
    if (fs.existsSync(monolithTranslationFile)) {
      try {
        const content = fs.readFileSync(monolithTranslationFile, 'utf8');
        translations = JSON.parse(content);
        isInitialized = true;
      } catch (error) {
        console.error(`Error parsing monolith translation file ${monolithTranslationFile}: ${error.message}`);
        translations = {};
      }
    } else {
      // Fallback: Use folder-based structure if monolith file doesn't exist
      const langDir = path.join(localesDir, language);
      
      if (fs.existsSync(langDir) && fs.statSync(langDir).isDirectory()) {
        const files = fs.readdirSync(langDir).filter(file => file.endsWith('.json'));

        for (const file of files) {
          const filePath = path.join(langDir, file);
          try {
            const content = fs.readFileSync(filePath, 'utf8');
            const fileTranslations = JSON.parse(content);
            
            // Merge translations, using the filename (without .json) as the top-level key
            const moduleName = path.basename(file, '.json');
            translations[moduleName] = deepMerge(translations[moduleName] || {}, fileTranslations);
          } catch (parseError) {
            console.error(`Error parsing translation file ${filePath}: ${parseError.message}`);
          }
        }
        isInitialized = true;
      } else {
        console.warn(`Translation file or directory not found for language ${language}: ${monolithTranslationFile} or ${langDir}`);
        translations = {};
      }
    }
  } catch (error) {
    console.error(`Error loading translations: ${error.message}`);
    translations = {};
  }
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
function getAvailableLanguages() {
  const config = getConfig();
  const localesDir = path.resolve(config.uiLocalesDir);
  try {
    if (fs.existsSync(localesDir)) {
      const files = fs.readdirSync(localesDir);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      const languages = jsonFiles.map(file => path.basename(file, '.json'));
      return languages.length > 0 ? languages : ['en'];
    }
  } catch (error) {
    console.error(`Error reading locales directory: ${error.message}`);
  }
  return ['en']; // Default fallback
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
  const settings = configManager.getConfig();
  const configuredLanguage = settings.language || settings.uiLanguage || 'en';
  
  if (configuredLanguage !== currentLanguage) {
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