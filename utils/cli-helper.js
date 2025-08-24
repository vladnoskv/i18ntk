/**
 * Centralized CLI Helper - Shared readline interface management
 * 
 * This module provides a single readline interface instance to prevent
 * multiple instances and simplify cleanup across the application.
 * 
 * @version 1.10.0
 * @since 2025-08-08
 */

const { getGlobalReadline, closeGlobalReadline, ask, askHidden } = require('./cli');

class CliHelper {
  constructor() {
    // Use the global readline interface from cli.js instead of creating our own
    this.rl = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the shared readline interface
   * @returns {readline.Interface} The readline interface
   */
  initialize() {
    if (!this.isInitialized) {
      this.rl = getGlobalReadline();
      this.isInitialized = true;
    }
    return this.rl;
  }

  /**
   * Get the shared readline interface
   * @returns {readline.Interface} The readline interface
   */
  getInterface() {
    return this.initialize();
  }

  /**
   * Prompt user for input with optional masking
   * @param {string} question - The prompt question
   * @param {boolean} maskInput - Whether to mask the input (for passwords)
   * @returns {Promise<string>} The user's input
   */
  async prompt(question, maskInput = false) {
    if (maskInput) {
      return askHidden(question);
    } else {
      return ask(question);
    }
  }

  /**
   * Prompt for PIN with secure masking
   * @param {string} message - Custom message for PIN prompt
   * @returns {Promise<string>} The PIN entered by user
   */
  async promptPin(message = 'Enter PIN: ') {
    return askHidden(message);
  }

  /**
   * Close the readline interface and clean up resources
   */
  close() {
    if (this.isInitialized) {
      const { closeGlobalReadline } = require('./cli');
      closeGlobalReadline();
      this.rl = null;
      this.isInitialized = false;
    }
  }

  /**
   * Check if the interface is initialized
   * @returns {boolean} Whether the interface is initialized
   */
  isActive() {
    return this.isInitialized && this.rl !== null;
  }

  /**
   * Get a yes/no confirmation from user
   * @param {string} question - The confirmation question
   * @param {boolean} defaultValue - Default value if user just presses enter
   * @returns {Promise<boolean>} The user's confirmation
   */
  async confirm(question, defaultValue = false) {
    const promptText = `${question} (${defaultValue ? 'Y/n' : 'y/N'}): `;
    
    const answer = await ask(promptText);
    const normalized = answer.trim().toLowerCase();
    if (normalized === '') {
      return defaultValue;
    } else {
      return normalized === 'y' || normalized === 'yes';
    }
  }

  /**
   * Display a menu and get user selection
   * @param {Array<string>} options - Array of menu options
   * @param {string} title - Optional menu title
   * @returns {Promise<number>} The selected option index (0-based)
   */
  async selectMenu(options, title = 'Please select an option:') {
    console.log(`\n${title}`);
    options.forEach((option, index) => {
      console.log(`  ${index + 1}. ${option}`);
    });
    
    while (true) {
      const answer = await ask('\nEnter your choice: ');
      const choice = parseInt(answer.trim(), 10);
      if (isNaN(choice) || choice < 1 || choice > options.length) {
        console.log('Invalid choice. Please try again.');
        continue;
      } else {
        return choice - 1;
      }
    }
  }
}

// Utility: Show framework suggestion warning only once per process
let frameworkWarningShown = false;
function showFrameworkWarningOnce(ui) {
  if (frameworkWarningShown) return;
  frameworkWarningShown = true;

  // Try to use the proper translation system first
  let t;
  if (ui && typeof ui.t === 'function') {
    t = ui.t.bind(ui);
  } else {
    // Fallback to loading the UI i18n system properly
    try {
      const UIi18n = require('../main/i18ntk-ui');
      const fallbackUI = new UIi18n();
      fallbackUI.loadLanguage('en'); // Load English as fallback
      t = fallbackUI.t.bind(fallbackUI);
    } catch (error) {
      // Last resort: use locale files directly
      try {
        const path = require('path');
        const fs = require('fs');
        const localePath = path.join(__dirname, '..', 'resources', 'i18n', 'ui-locales', 'en.json');
        if (SecurityUtils.safeExistsSync(localePath)) {
          const translations = JSON.parse(SecurityUtils.safeReadFileSync(localePath, 'utf8'));
          t = (key) => {
            const keys = key.split('.');
            let result = translations;
            for (const k of keys) {
              result = result && result[k];
            }
            return result || key;
          };
        } else {
          throw new Error('Locale file not found');
        }
      } catch (fallbackError) {
        // Final fallback: load from current UI locale or English
        try {
          const path = require('path');
          const fs = require('fs');
          
          // Try to determine current language from settings
          const settingsManager = require('../settings/settings-manager');
          const settings = settingsManager.loadSettings();
          const currentLang = settings.uiLanguage || 'en';
          
          const localePath = path.join(__dirname, '..', 'resources', 'i18n', 'ui-locales', `${currentLang}.json`);
          if (SecurityUtils.safeExistsSync(localePath)) {
            const translations = JSON.parse(SecurityUtils.safeReadFileSync(localePath, 'utf8'));
            t = (key) => {
              const keys = key.split('.');
              let result = translations;
              for (const k of keys) {
                result = result && result[k];
              }
              return result || key;
            };
          } else {
            // Fallback to English
            const enLocalePath = path.join(__dirname, '..', 'resources', 'i18n', 'ui-locales', 'en.json');
            if (SecurityUtils.safeExistsSync(enLocalePath)) {
              const translations = JSON.parse(SecurityUtils.safeReadFileSync(enLocalePath, 'utf8'));
              t = (key) => {
                const keys = key.split('.');
                let result = translations;
                for (const k of keys) {
                  result = result && result[k];
                }
                return result || key;
              };
            } else {
              throw new Error('No locale files found');
            }
          }
        } catch (finalError) {
          // Absolute last resort: basic hardcoded fallback
          const messages = {
            'init.suggestions.noFramework': 'No i18n framework detected. Consider using one of the following:',
            'init.frameworks.react': ' - React i18next (react-i18next)',
            'init.frameworks.vue': ' - Vue i18n (vue-i18next)',
            'init.frameworks.i18next': ' - i18next (i18next)',
            'init.frameworks.nuxt': ' - Nuxt i18n (@nuxtjs/i18next)',
            'init.frameworks.svelte': ' - Svelte i18n (svelte-i18next)'
          };
          t = (key) => messages[key] || key;
        }
      }
    }
  }

  console.log(t('init.suggestions.noFramework'));
  console.log(t('init.frameworks.react'));
  console.log(t('init.frameworks.vue'));
  console.log(t('init.frameworks.i18next'));
  console.log(t('init.frameworks.nuxt'));
  console.log(t('init.frameworks.svelte'));
}

// Export a singleton instance and attach utility for backward compatibility
const cliHelper = new CliHelper();
cliHelper.showFrameworkWarningOnce = showFrameworkWarningOnce;

module.exports = cliHelper;