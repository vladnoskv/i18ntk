/**
 * Configuration Service
 * Handles configuration management, initialization, and settings integration
 * @module services/ConfigurationService
 */

const path = require('path');
const configManager = require('../../../settings/settings-manager');
const { loadTranslations, t, refreshLanguageFromSettings } = require('../../../utils/i18n-helper');

const { createPrompt, isInteractive } = require('../../../utils/prompt-helper');
const { loadConfig, saveConfig, ensureConfigDefaults } = require('../../../utils/config');
const { getUnifiedConfig, ensureInitialized, validateSourceDir } = require('../../../utils/config-helper');
const cliHelper = require('../../../utils/cli-helper');
const pkg = require('../../../package.json');
const SetupEnforcer = require('../../../utils/setup-enforcer');

module.exports = class ConfigurationService {
  constructor(config = {}) {
    this.config = config;
    this.settings = null;
    this.configManager = configManager;
    this.ui = null;
    this.rl = null;
    this.isReadlineClosed = false;
  }

  /**
   * Initialize the service with required dependencies
   * @param {Object} configManager - Configuration manager instance
   */
  initialize(configManager) {
    this.configManager = configManager || this.configManager;
    this.settings = this.configManager.loadSettings ? this.configManager.loadSettings() : (this.configManager.getConfig ? this.configManager.getConfig() : {});
  }

  /**
   * Initialize configuration using unified system
   * @param {Object} options - Initialization options
   * @returns {Promise<Object>} Initialization result
   */
  async initialize(options = {}) {
    try {
      // Parse args here for other initialization needs (but language is already loaded)
      const args = this.parseArgs();
      if (args.help) {
        this.showHelp();
        process.exit(0);
      }

      // Load translations for the UI language
      const settings = this.settings || (this.configManager.loadSettings ? this.configManager.loadSettings() : (this.configManager.getConfig ? this.configManager.getConfig() : {}));
      const uiLanguage = args.uiLanguage || settings.uiLanguage || settings.language || this.config.uiLanguage || 'en';
      loadTranslations(uiLanguage);

      // Validate source directory exists
      const { validateSourceDir, displayPaths } = require('../../../utils/config-helper');
      try {
        validateSourceDir(this.config.sourceDir, 'i18ntk-manage');
      } catch (err) {
        console.log(t('init.requiredTitle'));
        console.log(t('init.requiredBody'));
        const answer = await cliHelper.prompt(t('init.promptRunNow'));
        if (answer.trim().toLowerCase() === 'y') {
          // Note: Initialization should be handled by the calling code
          // to avoid circular dependencies
          console.log('Please run initialization manually or use the init command');
        } else {
          throw err;
        }
      }

    } catch (error) {
      throw error;
    }
  }

  /**
   * Run the main configuration and initialization flow
   * @returns {Promise<Object>} Configuration result
   */
  async run() {
    // Add timeout to prevent hanging
    const args = this.parseArgs();

    const timeout = setTimeout(() => {
      console.error('❌ CLI startup timeout - something is hanging');
      if (args.debug) {
        console.error('🔍 DEBUG: Last known execution point reached');
      }
      process.exit(1);
    }, 10000); // 10 second timeout

    if (args.debug) {
      console.log('🔍 DEBUG: Starting configuration service...');
      console.log('🔍 DEBUG: Process.argv:', process.argv);
      console.log('🔍 DEBUG: Parsed args:', args);
    }

    let prompt;
    try {
      // Ensure setup is complete before running any operations
      await SetupEnforcer.checkSetupCompleteAsync();

      prompt = createPrompt({ noPrompt: args.noPrompt || Boolean(args.adminPin) });
      const interactive = isInteractive({ noPrompt: args.noPrompt || Boolean(args.adminPin) });

      // Load settings and UI language
      const settings = this.settings || (this.configManager.loadSettings ? this.configManager.loadSettings() : (this.configManager.getConfig ? this.configManager.getConfig() : {}));
      const uiLanguage = args.uiLanguage || settings.uiLanguage || settings.language || this.config.uiLanguage || 'en';
      loadTranslations(uiLanguage);

      if (args.adminPin) {
        // Handle admin PIN mode
        this.prompt = async () => '';
      }

      if (args.help) {
        this.showHelp();
        return;
      }

      let cfgAfterInitCheck = {};
      if (interactive) {
        cfgAfterInitCheck = await this.ensureInitializedOrExit(prompt);
        const frameworksDetected = await this.checkI18nDependencies();
        if (!frameworksDetected) {
          await this.maybePromptFramework(prompt, cfgAfterInitCheck, pkg.version);
        }
      }

      this.config = { ...this.config, ...cfgAfterInitCheck };
      await this.initialize();

      return { config: this.config, settings, ui: null, prompt };

    } catch (error) {
      if (this.ui && this.ui.t) {
        console.error(t('common.genericError', { error: error.message }));
      } else {
        console.error(`Error: ${error.message}`);
      }
      process.exit(1);
    } finally {
      if (prompt && typeof prompt.close === 'function') {
        prompt.close();
      }
      this.safeClose();
    }
  }

  /**
   * Ensures the project is properly initialized or exits the process
   * @param {Object} prompt - Prompt interface for user interaction
   * @returns {Promise<Object>} Configuration object if initialized
   */
  async ensureInitializedOrExit(prompt) {
    const { checkInitialized } = require('../../../utils/init-helper');
    const cliHelper = require('../../../utils/cli-helper');
    const pkg = require('../../../package.json');

    const { initialized, config } = await checkInitialized();

    if (!initialized) {
      console.log('\nThis project is not yet initialized with i18ntk.');
      const shouldInitialize = await cliHelper.confirm('Would you like to initialize it now?');

      if (!shouldInitialize) {
        console.log('Exiting. Please initialize the project first.');
        process.exit(1);
      }

      // The initialization will be handled by the init command
      return config;
    }

    // Check if we need to prompt for framework detection
    const settings = this.settings || (this.configManager.loadSettings ? this.configManager.loadSettings() : (this.configManager.getConfig ? this.configManager.getConfig() : {}));

    // Ensure framework configuration exists with all required fields
    if (!settings.framework) {
      settings.framework = {
        detected: false,
        preference: null,
        prompt: 'always',
        lastPromptedVersion: null,
        installed: [],
        version: '1.0' // Schema version for future compatibility
      };
    }

    // Check if we need to prompt for framework detection
    if (!settings.framework.detected &&
        settings.framework.prompt !== 'suppress' &&
        settings.framework.lastPromptedVersion !== pkg.version) {

      console.log('\nWe noticed you haven\'t set up an i18n framework yet.');
      console.log('Would you like to detect your i18n framework automatically?');

      console.log('1. Detect automatically');
      console.log('2. I\'ll set it up manually');
      console.log('3. Don\'t show this again');

      const answer = await prompt.question('\nSelect an option (1-3): ');
      const choice = answer.trim();

      let action;
      if (choice === '1') action = 'detect';
      else if (choice === '2') action = 'manual';
      else if (choice === '3') action = 'dont-show';
      else action = 'manual'; // default fallback

      if (action === 'dont-show') {
        // Update settings to suppress future prompts for this version
        settings.framework.prompt = 'suppress';
        settings.framework.lastPromptedVersion = pkg.version;

        if (this.configManager.saveSettings) {
          await this.configManager.saveSettings(settings);
        } else if (this.configManager.saveConfig) {
          await this.configManager.saveConfig(settings);
        }

        console.log('Framework detection prompt will be suppressed for this version.');
      } else if (action === 'detect') {
        // Run framework detection
        const FrameworkDetectionService = require('./FrameworkDetectionService');
        const frameworkService = new FrameworkDetectionService();
        frameworkService.initialize(this.configManager);

        const { detectedLanguage, detectedFramework } = await frameworkService.detectEnvironmentAndFramework();

        if (detectedFramework && detectedFramework !== 'generic') {
          console.log(`\nDetected framework: ${detectedFramework}`);

          // Update settings with detected framework
          settings.framework.detected = true;
          settings.framework.preference = detectedFramework;
          settings.framework.lastDetected = new Date().toISOString();

          if (this.configManager.saveSettings) {
            await this.configManager.saveSettings(settings);
          } else if (this.configManager.saveConfig) {
            await this.configManager.saveConfig(settings);
          }

          console.log(`Framework set to: ${detectedFramework}`);
        } else {
          console.log('\nCould not detect a specific i18n framework.');
          console.log('Please set up your i18n framework manually.');
        }
      }
    }

    return { ...config, ...settings };
  }

  /**
   * Check if i18n framework is installed - configuration-based check without prompts
   * @returns {Promise<boolean>} True if frameworks detected, false otherwise
   */
  async checkI18nDependencies() {
    const FrameworkDetectionService = require('./FrameworkDetectionService');
    const frameworkService = new FrameworkDetectionService();
    frameworkService.initialize(this.configManager);
    return await frameworkService.checkI18nDependencies(null);
  }

  /**
   * Handle framework detection and prompting logic
   * @param {Object} prompt - Prompt interface for user interaction
   * @param {Object} cfg - Configuration object
   * @param {string} currentVersion - Current version of the tool
   * @returns {Promise<Object>} Updated configuration
   */
  async maybePromptFramework(prompt, cfg, currentVersion) {
    const FrameworkDetectionService = require('./FrameworkDetectionService');
    const frameworkService = new FrameworkDetectionService();
    frameworkService.initialize(this.configManager);
    return await frameworkService.maybePromptFramework(prompt, cfg, currentVersion);
  }

  /**
   * Parse command line arguments
   * @returns {Object} Parsed arguments
   */
  parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};

    args.forEach(arg => {
      if (arg.startsWith('--')) {
        const [key, value] = arg.substring(2).split('=');
        const sanitizedKey = key?.trim();
        const sanitizedValue = value !== undefined ? value.trim() : true;

        switch (sanitizedKey) {
          case 'source-dir':
            parsed.sourceDir = sanitizedValue;
            break;
          case 'i18n-dir':
            parsed.i18nDir = sanitizedValue;
            break;
          case 'output-dir':
            parsed.outputDir = sanitizedValue;
            break;
          case 'source-language':
            parsed.sourceLanguage = sanitizedValue;
            break;
          case 'ui-language':
            parsed.uiLanguage = sanitizedValue;
            break;
          case 'no-prompt':
            parsed.noPrompt = true;
            break;
          case 'admin-pin':
            parsed.adminPin = sanitizedValue || '';
            break;
          case 'help':
          case 'h':
            parsed.help = true;
            break;
          default:
            // Handle language shorthand flags like --de, --fr
            if (['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'].includes(sanitizedKey)) {
              parsed.uiLanguage = sanitizedKey;
            }
            break;
        }
      }
    });

    return parsed;
  }

  /**
   * Show help information
   */
  showHelp() {
    const localT = (key) => {
      // Fallback help text when UI is not initialized
      const helpTexts = {
        'help.usage': 'Usage: npm run i18ntk [command] [options]',
        'help.interactiveMode': 'Run without arguments for interactive mode',
        'help.initProject': '  init    - Initialize i18n project structure',
        'help.analyzeTranslations': '  analyze - Analyze translation files',
        'help.validateTranslations': '  validate - Validate translations for errors',
        'help.checkUsage': '  usage   - Check translation usage in code',
        'help.showHelp': '  help    - Show this help message',
        'help.availableCommands': '\nAvailable commands:',
        'help.initCommand': '  --command=init    Initialize i18n project',
        'help.analyzeCommand': '  --command=analyze Analyze translations',
        'help.validateCommand': '  --command=validate Validate translations',
        'help.usageCommand': '  --command=usage   Check translation usage',
        'help.sizingCommand': '  --command=sizing  Analyze translation sizing',
        'help.completeCommand': '  --command=complete Run complete analysis',
        'help.summaryCommand': '  --command=summary Generate summary report',
        'help.debugCommand': '  --command=debug   Run debug utilities',
        'help.scannerCommand': '  --command=scanner Scan for translation keys'
      };
      return helpTexts[key] || key;
    };

    console.log(t('help.usage'));
    console.log(t('help.interactiveMode'));
    console.log(t('help.initProject'));
    console.log(t('help.analyzeTranslations'));
    console.log(t('help.validateTranslations'));
    console.log(t('help.checkUsage'));
    console.log(t('help.showHelp'));
    console.log(t('help.availableCommands'));
    console.log(t('help.initCommand'));
    console.log(t('help.analyzeCommand'));
    console.log(t('help.validateCommand'));
    console.log(t('help.usageCommand'));
    console.log(t('help.sizingCommand'));
    console.log(t('help.completeCommand'));
    console.log(t('help.summaryCommand'));
    console.log(t('help.debugCommand'));
    console.log(t('help.scannerCommand'));

    // Ensure proper exit for direct command execution
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
      this.safeClose();
      process.exit(0);
    }
  }

  /**
   * Prompt user for input with fallback for non-interactive mode
   * @param {string} question - Question to ask
   * @returns {Promise<string>} User input or empty string
   */
  prompt(question) {
    const cliHelper = require('../../../utils/cli-helper');
    // If interactive not available, return empty string to avoid hangs
    if (!process.stdin.isTTY || process.stdin.destroyed) {
      console.log('\n⚠️ Interactive input not available, using default response.');
      return Promise.resolve('');
    }
    return cliHelper.prompt(`${question} `);
  }

  /**
   * Check if we're in non-interactive mode
   * @returns {boolean} True if in non-interactive mode
   */
  isNonInteractiveMode() {
    return !process.stdin.isTTY || process.stdin.destroyed || this.isReadlineClosed;
  }

  /**
   * Safe method to close readline interface
   */
  safeClose() {
    if (this.rl && !this.isReadlineClosed) {
      try {
        this.rl.close();
        this.isReadlineClosed = true;
      } catch (error) {
        // Ignore close errors
      }
    }
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Get current settings
   * @returns {Object} Current settings
   */
  getSettings() {
    return this.settings;
  }

  /**
   * Get UI instance
   * @returns {Object} UI instance
   */
  getUI() {
    return this.ui;
  }
};