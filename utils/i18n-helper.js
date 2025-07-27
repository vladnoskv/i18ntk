const fs = require('fs');
const path = require('path');
const settingsManager = require('../settings/settings-manager');

// Get configuration from settings manager
function getConfig() {
  const settings = settingsManager.getSettings();
  return {
    uiLocalesDir: settings.directories?.uiLocalesDir || path.join(__dirname, '..', 'ui-locales')
  };
}

// Global translations object
let translations = {};
let currentLanguage = 'en';
let isInitialized = false;

/**
 * Load translations from the ui-locales directory
 * @param {string} language - Language code (default: 'en')
 */
function loadTranslations(language = 'en') {
  currentLanguage = language;
  const config = getConfig();
  const localesDir = path.resolve(config.uiLocalesDir);
  const translationFile = path.join(localesDir, `${language}.json`);
  
  try {
    if (fs.existsSync(translationFile)) {
      const content = fs.readFileSync(translationFile, 'utf8');
      translations = JSON.parse(content);
      isInitialized = true;
    } else {
      console.warn(`Translation file not found: ${translationFile}`);
      translations = {};
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
    loadTranslations('en');
    isInitialized = true;
  }
  
  // Split the key into parts (e.g., 'module.subkey' -> ['module', 'subkey'])
  const keyParts = key.split('.');
  let value = translations;
  
  // Navigate through the nested object
  for (const part of keyParts) {
    if (value && typeof value === 'object' && part in value) {
      value = value[part];
    } else {
      // Return the key if translation not found
      console.warn(`Translation not found for key: ${key}`);
      return key;
    }
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
 * @param {string} template - Template string with {{param}} or {param} placeholders
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
      return fs.readdirSync(localesDir)
        .filter(file => file.endsWith('.json'))
        .map(file => path.basename(file, '.json'));
    }
  } catch (error) {
    console.error(`Error reading locales directory: ${error.message}`);
  }
  return ['en']; // Default fallback
}

module.exports = {
  loadTranslations,
  t,
  getCurrentLanguage,
  getAvailableLanguages
};