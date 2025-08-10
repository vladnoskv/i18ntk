/**
 * Centralized CLI Helper - Shared readline interface management
 * 
 * This module provides a single readline interface instance to prevent
 * multiple instances and simplify cleanup across the application.
 * 
 * @version 1.7.0
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

  const t = ui && typeof ui.t === 'function' ? ui.t.bind(ui) : (key) => {
    const messages = {
      'init.suggestions.noFramework': 'No i18n framework detected. Consider using one of the following:',
      'init.frameworks.react': ' - react-i18next',
      'init.frameworks.vue': ' - vue-i18n',
      'init.frameworks.i18next': ' - i18next',
      'init.frameworks.nuxt': ' - @nuxtjs/i18n',
      'init.frameworks.svelte': ' - svelte-i18n'
    };
    return messages[key] || key;
  };

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