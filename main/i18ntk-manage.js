#!/usr/bin/env node
/**
 * I18NTK MANAGEMENT TOOLKIT - MAIN MANAGER
 * 
 * This is the main entry point for all i18n operations.
 * It provides an interactive interface to manage translations.
 * 
 * Usage:
 *   npm run i18ntk:manage
 *   npm run i18ntk:manage -- --command=init
 *   npm run i18ntk:manage -- --command=analyze
 *   npm run i18ntk:manage -- --command=validate
 *   npm run i18ntk:manage -- --command=usage
 *   npm run i18ntk:manage -- --help
 * 
 * Alternative direct usage:
 *   node i18ntk-manage.js
 *   node i18ntk-manage.js --command=init
 */

const fs = require('fs');
const path = require('path');
const UIi18n = require('./i18ntk-ui');
const AdminAuth = require('../utils/admin-auth');
const SecurityUtils = require('../utils/security');
const AdminCLI = require('../utils/admin-cli');
const configManager = require('../settings/settings-manager');
const { showFrameworkWarningOnce } = require('../utils/cli-helper');
const I18nInitializer = require('./i18ntk-init');
const { I18nAnalyzer } = require('./i18ntk-analyze');
const I18nValidator = require('./i18ntk-validate');
const I18nUsageAnalyzer = require('./i18ntk-usage');
const I18nSizingAnalyzer = require('./i18ntk-sizing');
const I18nFixer = require('./i18ntk-fixer');
const SettingsCLI = require('../settings/settings-cli');
const I18nDebugger = require('../scripts/debug/debugger');
const { createPrompt, isInteractive } = require('../utils/prompt-helper');

const { loadTranslations, t, refreshLanguageFromSettings} = require('../utils/i18n-helper');
const cliHelper = require('../utils/cli-helper');
const { loadConfig, saveConfig, ensureConfigDefaults } = require('../utils/config');
const pkg = require('../package.json');

async function runInitFlow() {
  const initializer = new I18nInitializer();
  await initializer.run({ fromMenu: true });
  const settings = configManager.loadSettings ? configManager.loadSettings() : (configManager.getConfig ? configManager.getConfig() : {});
  return { i18nDir: settings.i18nDir, sourceDir: settings.sourceDir };
}

function askYesNo(prompt, question) {
  return prompt.question(question).then(a => /^y(es)?$/i.test(a.trim()));
}

async function ensureInitializedOrExit(prompt) {
  const path = require('path');
  const fs = require('fs');
  const { ensureDirectory } = require('../utils/config-helper');
  const SettingsManager = require('../settings/settings-manager');
  const settingsManager = new SettingsManager();
  
  // Get configuration from settings manager
  const settings = settingsManager.getSettings();
  
  const cfg = {
    sourceDir: path.resolve(settings.sourceDir || './locales'),
    sourceLanguage: settings.sourceLanguage || 'en',
    projectRoot: path.resolve('.'),
    framework: settings.framework || { detected: false, prompt: 'always' }
  };
  
  // Check if already initialized using new tracking system
  const initFilePath = path.join(settingsManager.configDir, 'initialization.json');
  
  let isInitialized = false;
  if (fs.existsSync(initFilePath)) {
    try {
      const initStatus = JSON.parse(fs.readFileSync(initFilePath, 'utf8'));
      isInitialized = initStatus.initialized && initStatus.version === '1.8.3, 1.8.3';
    } catch (e) {
      // Invalid init file, proceed with check
    }
  }
  
  if (isInitialized) {
    return cfg;
  }

  // Check if source language files exist
  const langDir = path.join(cfg.sourceDir, cfg.sourceLanguage);
  
  const hasLanguageFiles = fs.existsSync(langDir) &&
    fs.readdirSync(langDir).some(f => f.endsWith('.json'));
  
  // If language files exist, mark as initialized
  if (hasLanguageFiles) {
    const initDir = path.dirname(initFilePath);
    ensureDirectory(initDir);
    fs.writeFileSync(initFilePath, JSON.stringify({
      initialized: true,
      version: '1.8.3, 1.8.3',
      timestamp: new Date().toISOString(),
      sourceDir: cfg.sourceDir,
      sourceLanguage: cfg.sourceLanguage
    }, null, 2));
    return cfg;
  }

  const answer = await askYesNo(prompt, 'Initialization Required\nThis project must be initialized before running this command.\nWould you like to run initialization now? (y/N): ');
  if (!answer) {
    console.log('Operation cancelled.');
    process.exit(0);
  }

  const result = await runInitFlow();
  
  // Mark as initialized after successful init
  const initDir = path.dirname(initFilePath);
  ensureDirectory(initDir);
  fs.writeFileSync(initFilePath, JSON.stringify({
    initialized: true,
    version: '1.8.3, 1.8.3',
    timestamp: new Date().toISOString(),
    sourceDir: result.sourceDir || cfg.sourceDir,
    sourceLanguage: cfg.sourceLanguage
  }, null, 2));
  
  return {
    ...cfg,
    sourceDir: result.sourceDir || cfg.sourceDir,
    i18nDir: result.i18nDir || cfg.i18nDir
  };
}

async function maybePromptFramework(prompt, cfg, currentVersion) {
  // Load current settings to check framework configuration
  const settings = configManager.loadSettings ? configManager.loadSettings() : (configManager.getConfig ? configManager.getConfig() : {});
  
  // Ensure framework configuration exists
  if (!settings.framework) {
    settings.framework = {
      detected: false,
      preference: null,
      prompt: 'always',
      lastPromptedVersion: null
    };
  }
  
  // Reload settings to ensure we have latest framework detection results
  const freshSettings = configManager.loadSettings ? configManager.loadSettings() : (configManager.getConfig ? configManager.getConfig() : {});
  if (freshSettings.framework) {
    settings.framework = freshSettings.framework;
  }
  
  // Check if framework is already detected or preference is set to none
  if (settings.framework.detected || settings.framework.preference === 'none') {
    return cfg;
  }

  // Check if dnr (do not remind) is active for this version
  if (settings.framework.prompt === 'suppress' && settings.framework.lastPromptedVersion === currentVersion) {
    return cfg;
  }

  // Reset suppress if version changed
  if (settings.framework.prompt === 'suppress' && settings.framework.lastPromptedVersion !== currentVersion) {
    settings.framework.prompt = 'always';
  }

  if (settings.framework.prompt === 'always') {
    const ans = await prompt.question([
        t('init.suggestions.noFramework'),
        t('init.frameworks.react'),
        t('init.frameworks.vue'),
        t('init.frameworks.i18next'),
        t('init.frameworks.nuxt'),
        t('init.frameworks.svelte'),
        '',
        t('init.continueWithoutI18nPrompt') + ' (y/N/dnr = do not remind until next update): '
      ].join('\n')).then(a => a.trim().toLowerCase());

    if (ans === 'y' || ans === 'yes') {
      settings.framework.preference = 'none';
      settings.framework.prompt = 'always'; // Keep asking until explicitly suppressed
    } else if (ans === 'dnr') {
      settings.framework.preference = 'none';
      settings.framework.prompt = 'suppress';
      settings.framework.lastPromptedVersion = currentVersion;
    } else {
      console.log('Operation cancelled.');
      process.exit(0);
    }
    
    // Save configuration using settings manager
    if (configManager.saveSettings) {
      configManager.saveSettings(settings);
    } else if (configManager.saveConfig) {
      configManager.saveConfig(settings);
    }
  }

  return cfg;
}

// Use unified configuration system
const { getUnifiedConfig, ensureInitialized, validateSourceDir } = require('../utils/config-helper');

class I18nManager {
  constructor(config = {}) {
    this.config = config;
    this.rl = null;
    this.isReadlineClosed = false;
    this.isAuthenticated = false;
    this.ui = null;
    this.adminAuth = new AdminAuth();
    
    // No longer create readline interface here - use CLI helpers
  }
  
  initializeReadline() {
    // Use centralized CLI helper instead of direct readline
    this.rl = null;
    this.isReadlineClosed = false;
  }

  // Initialize configuration using unified system
  async initialize() {
    try {
      // Parse args here for other initialization needs (but language is already loaded)
      const args = this.parseArgs();
      if (args.help) {
        this.showHelp();
        process.exit(0);
      }
      
      // Ensure UI is initialized (it should already be loaded in run())
      if (!this.ui) {
        const settings = configManager.loadSettings ? configManager.loadSettings() : (configManager.getConfig ? configManager.getConfig() : {});
        const uiLanguage = args.uiLanguage || settings.uiLanguage || settings.language || this.config.uiLanguage || 'en';
        this.ui.loadLanguage(uiLanguage);
        loadTranslations(uiLanguage);
      }
      
      // Validate source directory exists
      const {validateSourceDir, displayPaths} = require('../utils/config-helper');
       try {
        validateSourceDir(this.config.sourceDir, 'i18ntk-manage');
      } catch (err) {
        console.log(this.ui.t('init.requiredTitle'));
        console.log(this.ui.t('init.requiredBody'));
        const answer = await cliHelper.prompt(this.ui.t('init.promptRunNow'));
        if (answer.trim().toLowerCase() === 'y') {
          const initializer = new I18nInitializer(this.config);
          await initializer.run({ fromMenu: true });
        } else {
          throw err;
        }
      }
      
    } catch (error) {

      throw error;
    }
  }

  // Auto-detect i18n directory from common locations only if not configured in settings
  detectI18nDirectory() {
      
    const settings = configManager.loadSettings ? configManager.loadSettings() : (configManager.getConfig ? configManager.getConfig() : {});
    const projectRoot = path.resolve(settings.projectRoot || this.config.projectRoot || '.');
    
    // Use per-script directory configuration if available, fallback to global sourceDir
    const sourceDir = settings.scriptDirectories?.manage || settings.sourceDir;
    
    if (sourceDir) {
      this.config.sourceDir = path.resolve(projectRoot, sourceDir);
      return;
    }
    
    // Define possible i18n paths for auto-detection
    const possibleI18nPaths = [
      './locales',
      './src/locales', 
      './src/i18n',
      './src/i18n/locales',
      './app/locales',
      './app/i18n',
      './public/locales',
      './assets/locales',
      './translations',
      './lang'
    ];
    
    // Only auto-detect if no settings are configured
    for (const possiblePath of possibleI18nPaths) {
      const resolvedPath = path.resolve(projectRoot, possiblePath);
      if (fs.existsSync(resolvedPath)) {
        // Check if it contains language directories
        try {
          const items = fs.readdirSync(resolvedPath);
          const hasLanguageDirs = items.some(item => {
            const itemPath = path.join(resolvedPath, item);
            return fs.statSync(itemPath).isDirectory() && 
                   ['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'].includes(item);
          });
          
          if (hasLanguageDirs) {
            this.config.sourceDir = possiblePath;
            t('init.autoDetectedI18nDirectory', { path: possiblePath });
            break;
          }
        } catch (error) {
          // Continue checking other paths
        }
      }
    }
  }

  // Check if i18n framework is installed - configuration-based check without prompts
  async checkI18nDependencies() {
    const packageJsonPath = path.resolve('./package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      console.log(this.ui ? this.ui.t('errors.noPackageJson') : 'No package.json found');
      return false; // Treat as no framework detected
    }
    
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      // Include peerDependencies in the check
      const dependencies = { 
        ...packageJson.dependencies, 
        ...packageJson.devDependencies,
        ...packageJson.peerDependencies 
      };
      
      const i18nFrameworks = [
        'react-i18next',
        'vue-i18n', 
        'angular-i18n',
        'i18next',
        'next-i18next',
        'svelte-i18n',
        '@nuxtjs/i18n'
      ];
      
      const installedFrameworks = i18nFrameworks.filter(framework => dependencies[framework]);

      if (installedFrameworks.length > 0) {
        if (this.ui && this.ui.t) {
          console.log(this.ui.t('init.detectedFrameworks', { frameworks: installedFrameworks.join(', ') }));
        } else {
          console.log(`Detected frameworks: ${installedFrameworks.join(', ')}`);
        }
        const cfg = configManager.loadSettings ? configManager.loadSettings() : (configManager.getConfig ? configManager.getConfig() : {});
        cfg.framework = cfg.framework || {};
        cfg.framework.detected = true;
        cfg.framework.installed = installedFrameworks;
        if (configManager.saveSettings) {
          configManager.saveSettings(cfg);
        } else if (configManager.saveConfig) {
          configManager.saveConfig(cfg);
        }
        return true;
      } else {
        const cfg = configManager.loadSettings ? configManager.loadSettings() : (configManager.getConfig ? configManager.getConfig() : {});
        if (cfg.framework) {
          cfg.framework.detected = false;
          if (configManager.saveSettings) {
            configManager.saveSettings(cfg);
          } else if (configManager.saveConfig) {
            configManager.saveConfig(cfg);
          }
        }
        // Always signal that frameworks were not detected
        return false;
      }
    } catch (error) {
      console.log(t('init.errors.packageJsonRead'));
      return false; // Treat as no framework detected on error
    }
  }

  /**
   * Prompt user to continue without i18n framework
   */
  async promptContinueWithoutI18n() {
    const promptText = this.ui && this.ui.t ? this.ui.t('init.continueWithoutI18nPrompt') : 'Do you want to continue without one? (y/N)';
    const answer = await this.prompt('\n' + promptText);
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
  }

  // Parse command line arguments
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

  // Add this run method after the checkI18nDependencies method
  async run() {
    let prompt;
    try {
      const args = this.parseArgs();
      prompt = createPrompt({ noPrompt: args.noPrompt || Boolean(args.adminPin) });
      const interactive = isInteractive({ noPrompt: args.noPrompt || Boolean(args.adminPin) });

      // Load settings and UI language
      const settings = configManager.loadSettings ? configManager.loadSettings() : (configManager.getConfig ? configManager.getConfig() : {});
      this.ui = new UIi18n();
      const uiLanguage = args.uiLanguage || settings.uiLanguage || settings.language || this.config.uiLanguage || 'en';
      this.ui.loadLanguage(uiLanguage);

      if (args.adminPin) {
        this.adminAuth.verifyPin = async () => true;
        this.prompt = async () => '';
      }

      if (args.help) {
        this.showHelp();
        return;
      }

      let cfgAfterInitCheck = {};
      if (interactive) {
        cfgAfterInitCheck = await ensureInitializedOrExit(prompt);
        const frameworksDetected = await this.checkI18nDependencies();
        if (!frameworksDetected) {
          await maybePromptFramework(prompt, cfgAfterInitCheck, pkg.version);
        }
      }

      this.config = { ...this.config, ...cfgAfterInitCheck };
      await this.initialize();

      const rawArgs = process.argv.slice(2); // Preserve original CLI args array for positional checks
      let commandToExecute = null;

      // Define valid direct commands
      const directCommands = [
        'init', 'analyze', 'validate', 'usage', 'sizing', 'complete', 'fix', 'summary', 'debug', 'workflow'
      ];

      // Handle help immediately without dependency checks
      if (args.help) {
        this.showHelp();
        this.safeClose();
        process.exit(0);
      }

      // Handle debug flag
      if (args.debug) {
        // Enable debug mode for this session
        console.log(chalk.blue('Debug mode enabled'));
      }

      // Check for --command= argument first
      const commandFlagArg = rawArgs.find(arg => arg.startsWith('--command='));
      if (commandFlagArg) {
        commandToExecute = commandFlagArg.split('=')[1];
      } else if (rawArgs.length > 0 && directCommands.includes(rawArgs[0])) {
        // If no --command=, check if the first argument is a direct command
        commandToExecute = rawArgs[0];
      }

      if (commandToExecute) {
        console.log(t('ui.executingCommand', { command: commandToExecute }));
        await this.executeCommand(commandToExecute);
        this.safeClose();
        return;
      }

      // If no command provided and --no-prompt is set, exit gracefully
      if (args.noPrompt) {
        this.safeClose();
        process.exit(0);
      }

      // Framework detection is now handled by maybePromptFramework above
      // Skip the redundant checkI18nDependencies prompt
      
      // Interactive mode - showInteractiveMenu will handle the title
      await this.showInteractiveMenu();
      
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

  showHelp() {
    const localT = this.ui && this.ui.t ? this.ui.t.bind(this.ui) : (key) => {
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
        'help.debugCommand': '  --command=debug   Run debug utilities'
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

    // Ensure proper exit for direct command execution
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
      this.safeClose();
      process.exit(0);
    }
  }



  /**
   * Determine execution context based on options and environment
   */
  getExecutionContext(options = {}) {
    // Check if called from interactive menu
    if (options.fromMenu === true) {
      return { type: 'manager', source: 'interactive_menu' };
    }
    
    // Check if called from workflow/autorun
    if (options.fromWorkflow === true) {
      return { type: 'workflow', source: 'autorun_script' };
    }
    
    // Check if this is a direct command line execution
    if (process.argv.some(arg => arg.startsWith('--command='))) {
      return { type: 'direct', source: 'command_line' };
    }
    
    // Default to direct execution
    return { type: 'direct', source: 'unknown' };
  }

  async executeCommand(command, options = {}) {
    console.log(t('menu.executingCommand', { command }));
    
    // Enhanced context detection
    const executionContext = this.getExecutionContext(options);
    const isDirectCommand = executionContext.type === 'direct';
    const isWorkflowExecution = executionContext.type === 'workflow';
    const isManagerExecution = executionContext.type === 'manager';
    
    // Ensure UI language is refreshed from settings for workflow and direct execution
    if (isWorkflowExecution || isDirectCommand) {
      this.ui.refreshLanguageFromSettings();
    }
    
    // Check admin authentication for all commands when PIN protection is enabled
    const authRequiredCommands = ['init', 'analyze', 'validate', 'usage', 'complete', 'fix', 'sizing', 'workflow', 'status', 'delete', 'settings', 'debug'];
    if (authRequiredCommands.includes(command)) {
      const authPassed = await this.checkAdminAuth();
      if (!authPassed) {
        if (!this.isNonInteractiveMode() && !isDirectCommand) {
          await this.prompt(t('menu.pressEnterToContinue'));
          await this.showInteractiveMenu();
        }
        return;
      }
    }
    
    try {
        switch (command) {
            case 'init':
                const initializer = new I18nInitializer(this.config);
                await initializer.run({fromMenu: isManagerExecution});
                break;
            case 'analyze':
                const analyzer = new I18nAnalyzer();
                await analyzer.run({fromMenu: isManagerExecution});
                break;
            case 'validate':
                const validator = new I18nValidator();
                await validator.run({fromMenu: isManagerExecution});
                break;
            case 'usage':
                const usageAnalyzer = new I18nUsageAnalyzer();
                await usageAnalyzer.run({fromMenu: isManagerExecution});
                break;
            case 'sizing':
                const sizingAnalyzer = new I18nSizingAnalyzer();
                await sizingAnalyzer.run({fromMenu: isManagerExecution});
                break;
            case 'complete':
                const completeTool = require('./i18ntk-complete');
                const tool = new completeTool();
                await tool.run({fromMenu: isManagerExecution});
                break;
            case 'fix':
                const fixerTool = new I18nFixer();
                await fixerTool.run({fromMenu: isManagerExecution});
                break;

            case 'debug':
                const debuggerTool = new I18nDebugger();
                await debuggerTool.run();
                break;
            case 'help':
                this.showHelp();
                if (isManagerExecution && !this.isNonInteractiveMode()) {
                  await this.prompt(t('usage.pressEnterToReturnToMenu'));
                  await this.showInteractiveMenu();
                } else {
                  console.log(t('workflow.exitingCompleted'));
                  this.safeClose();
                  process.exit(0);
                }
                return;
                break;
            default:
                console.log(t('menu.unknownCommand', { command }));
                this.showHelp();
                // No return here, let the completion logic handle the exit/menu return
                break;
        }
        
        // Handle command completion based on execution context
        console.log(t('operations.completed'));
        
        if (isManagerExecution && !this.isNonInteractiveMode()) {
          // Interactive menu execution - return to menu
          await this.prompt(t('menu.returnToMainMenu'));
          await this.showInteractiveMenu();
        } else {
          // Direct commands, non-interactive mode, or workflow execution - exit immediately
          console.log(t('workflow.exitingCompleted'));
          this.safeClose();
          process.exit(0);
        }
        
    } catch (error) {
        console.error(t('common.errorExecutingCommand', { error: error.message }));
        
        if (isManagerExecution && !this.isNonInteractiveMode()) {
          // Interactive menu execution - show error and return to menu
          await this.prompt(t('menu.pressEnterToContinue'));
          await this.showInteractiveMenu();
        } else if (isDirectCommand && !this.isNonInteractiveMode()) {
          // Direct command execution - show "enter to continue" and exit with error
          await this.prompt(t('menu.pressEnterToContinue'));
          this.safeClose();
          process.exit(1);
        } else {
          // Non-interactive mode or workflow execution - exit immediately with error
          this.safeClose();
          process.exit(1);
        }
    }
}

  // Add admin authentication check
  async checkAdminAuth() {
    const isRequired = await this.adminAuth.isAuthRequired();
    if (!isRequired) {
      return true;
    }

    // Check if admin PIN was provided via command line
    const args = this.parseArgs();
    if (args.adminPin) {
      const isValid = await this.adminAuth.verifyPin(args.adminPin);
      if (isValid) {
        console.log(t('adminCli.authSuccess'));
        return true;
      } else {
        console.log(t('adminCli.invalidPin'));
        return false;
      }
    }

    console.log(t('adminCli.authRequired'));
    const cliHelper = require('../utils/cli-helper');
    const pin = await cliHelper.promptPin(t('adminCli.enterPin'));
    const isValid = await this.adminAuth.verifyPin(pin);
    
    if (!isValid) {
      console.log(t('adminCli.invalidPin'));
      return false;
    }
    
    console.log(t('adminCli.authSuccess'));
    return true;
  }

  async showInteractiveMenu() {
    // Check if we're in non-interactive mode (like echo 0 | node script)
    if (this.isNonInteractiveMode()) {
      console.log(`\n${t('menu.title')}`);
      console.log(t('menu.separator'));
      console.log(`1. ${t('menu.options.init')}`);
    console.log(`2. ${t('menu.options.analyze')}`);
    console.log(`3. ${t('menu.options.validate')}`);
    console.log(`4. ${t('menu.options.usage')}`);
    console.log(`5. ${t('menu.options.complete')}`);
    console.log(`6. ${t('menu.options.sizing')}`);
    console.log(`7. ${t('menu.options.fix')}`);
    console.log(`8. ${t('menu.options.status')}`);
    console.log(`9. ${t('menu.options.delete')}`);
    console.log(`10. ${t('menu.options.settings')}`);
    console.log(`11. ${t('menu.options.help')}`);
    console.log(`12. ${t('menu.options.language')}`);
    console.log(`0. ${t('menu.options.exit')}`);
      console.log('\n' + t('menu.nonInteractiveModeWarning'));
      console.log(t('menu.useDirectExecution'));
      console.log(t('menu.useHelpForCommands'));
      this.safeClose();
      process.exit(0);
      return;
    }
    
    console.log(`\n${t('menu.title')}`);
    console.log(t('menu.separator'));
    console.log(`1. ${t('menu.options.init')}`);
    console.log(`2. ${t('menu.options.analyze')}`);
    console.log(`3. ${t('menu.options.validate')}`);
    console.log(`4. ${t('menu.options.usage')}`);
    console.log(`5. ${t('menu.options.complete')}`);
    console.log(`6. ${t('menu.options.sizing')}`);
    console.log(`7. ${t('menu.options.fix')}`);
    console.log(`8. ${t('menu.options.status')}`);
    console.log(`9. ${t('menu.options.delete')}`);
    console.log(`10. ${t('menu.options.settings')}`);
    console.log(`11. ${t('menu.options.help')}`);
    console.log(`12. ${t('menu.options.language')}`);
    console.log(`0. ${t('menu.options.exit')}`);
    
    const choice = await this.prompt('\n' + t('menu.selectOptionPrompt'));
    
    switch (choice.trim()) {
      case '1':
        await this.executeCommand('init', {fromMenu: true});
        break;
      case '2':
        await this.executeCommand('analyze', {fromMenu: true});
        break;
      case '3':
        await this.executeCommand('validate', {fromMenu: true});
        break;
      case '4':
        await this.executeCommand('usage', {fromMenu: true});
        break;
      case '5':
        await this.executeCommand('complete', {fromMenu: true});
        break;
      case '6':
        await this.executeCommand('sizing', {fromMenu: true});
        break;
      case '7':
        await this.executeCommand('fix', {fromMenu: true});
        break;
      case '8':
        // Check for PIN protection
        const authRequired = await this.adminAuth.isAuthRequiredForScript('summaryReports');
        if (authRequired) {
          console.log(`\n${t('adminCli.protectedAccess')}`);
        const cliHelper = require('../utils/cli-helper');
        const pin = await cliHelper.promptPin(t('adminCli.enterPin') + ': ');
        const isValid = await this.adminAuth.verifyPin(pin);
          
          if (!isValid) {
            console.log(t('adminCli.invalidPin'));
            await this.prompt(t('menu.pressEnterToContinue'));
            await this.showInteractiveMenu();
            return;
          }
          
          console.log(t('adminCli.accessGranted'));
        }
        
        console.log(t('summary.status.generating'));
        try {
          const summaryTool = require('./i18ntk-summary');
          const summary = new summaryTool();
          await summary.run({ fromMenu: true });
          console.log(t('summary.status.completed'));
          
          // Check if we're in interactive mode before prompting
          if (!this.isNonInteractiveMode()) {
            try {
              await this.prompt('\n' + t('debug.pressEnterToContinue'));
              await this.showInteractiveMenu();
            } catch (error) {
              console.log(t('menu.returning'));
              process.exit(0);
            }
          } else {
            console.log(t('status.exitingCompleted'));
            process.exit(0);
          }
        } catch (error) {
          console.error(t('common.errorGeneratingStatusSummary', { error: error.message }));
          
          // Check if we're in interactive mode before prompting
          if (!this.isNonInteractiveMode()) {
            try {
              await this.prompt('\n' + t('debug.pressEnterToContinue'));
              await this.showInteractiveMenu();
            } catch (error) {
              console.log(t('menu.returning'));
              process.exit(0);
            }
          } else {
            console.log(t('common.errorExiting'));
            process.exit(1);
          }
        }
        break;
      case '9':
        await this.deleteReports();
        break;
      case '10':
        await this.showSettingsMenu();
        break;
      case '11':
        this.showHelp();
        await this.prompt(t('menu.returnToMainMenu'));
        await this.showInteractiveMenu();
        break;
      case '12':
        await this.showLanguageMenu();
        break;
      case '0':
        console.log(t('menu.goodbye'));
        this.safeClose();
        process.exit(0);
      default:
        console.log(t('menu.invalidChoice'));
        await this.showInteractiveMenu();
    }
  }

  // Language Menu
  async showLanguageMenu() {
    console.log(`\n${t('language.title')}`);
    console.log(t('language.separator'));
    console.log(t('language.current', { language: this.ui.getLanguageDisplayName(this.ui.getCurrentLanguage()) }));
    console.log('\n' + t('language.available'));
    
    this.ui.availableLanguages.forEach((lang, index) => {
      const displayName = this.ui.getLanguageDisplayName(lang);
      const current = lang === this.ui.getCurrentLanguage() ? ' ✓' : '';
      console.log(t('language.languageOption', { index: index + 1, displayName, current }));
    });
    
    console.log(`0. ${t('language.backToMainMenu')}`);
    
    const choice = await this.prompt('\n' + t('language.prompt'));
    const choiceNum = parseInt(choice);
    
    if (choiceNum === 0) {
      await this.showInteractiveMenu();
      return;
    } else if (choiceNum >= 1 && choiceNum <= this.ui.availableLanguages.length) {
      const selectedLang = this.ui.availableLanguages[choiceNum - 1];
      await this.ui.changeLanguage(selectedLang);
      console.log(t('language.changed', { language: this.ui.getLanguageDisplayName(selectedLang) }));
      
      // Force reload translations for the entire system
      const { loadTranslations } = require('../utils/i18n-helper');
      loadTranslations(selectedLang);
      
      // Return to main menu with new language
      await this.prompt('\n' + t('language.pressEnterToContinue'));
      await this.showInteractiveMenu();
    } else {
      console.log(t('language.invalid'));
      await this.prompt('\n' + t('language.pressEnterToContinue'));
      await this.showLanguageMenu();
    }
  }

  // Debug Tools Menu
  async showDebugMenu() {
    // Check for PIN protection
    const authRequired = await this.adminAuth.isAuthRequiredForScript('debugMenu');
    if (authRequired) {
      console.log(`\n${t('adminPin.protectedAccess')}`);
      const cliHelper = require('../utils/cli-helper');
      const pin = await cliHelper.promptPin(t('adminPin.enterPin') + ': ');
      const isValid = await this.adminAuth.verifyPin(pin);
      
      if (!isValid) {
        console.log(t('adminPin.invalidPin'));
        await this.prompt(t('menu.pressEnterToContinue'));
        await this.showInteractiveMenu();
        return;
      }
      
      console.log(t('adminPin.accessGranted'));
    }

    console.log(`\n${t('debug.title')}`);
    console.log(t('debug.separator'));
    console.log(t('debug.mainDebuggerSystemDiagnostics'));
    console.log(t('debug.debugLogs'));
    console.log(t('debug.backToMainMenu'));
    
    const choice = await this.prompt('\n' + t('debug.selectOption'));
    
    switch (choice.trim()) {
      case '1':
        await this.runDebugTool('debugger.js', 'Main Debugger');
        break;
      case '2':
        await this.viewDebugLogs();
        break;
      case '0':
        await this.showInteractiveMenu();
        return;
      default:
        console.log(t('debug.invalidChoiceSelectRange'));
        await this.showDebugMenu();
    }
  }

  // Run a debug tool
  async runDebugTool(toolName, displayName) {
  console.log(t('debug.runningDebugTool', { displayName }));
    try {
      const toolPath = path.join(__dirname, '..', 'scripts', 'debug', toolName);
      if (fs.existsSync(toolPath)) {
        console.log(`Debug tool available: ${toolName}`);
        console.log(`To run this tool manually: node "${toolPath}"`);
        console.log(`Working directory: ${path.join(__dirname, '..')}`);
      } else {
      console.log(t('debug.debugToolNotFound', { toolName }));
      }
    } catch (error) {
      console.error(t('debug.errorRunningDebugTool', { displayName, error: error.message }));

    }
    
    await this.prompt('\n' + t('menu.pressEnterToContinue'));
    await this.showDebugMenu();
  }

  // View debug logs
  async viewDebugLogs() {
    console.log(`\n${t('debug.recentDebugLogs')}`);
    console.log('============================================================');
    
    try {
      const logsDir = path.join(__dirname, '..', 'scripts', 'debug', 'logs');
      if (fs.existsSync(logsDir)) {
        const files = fs.readdirSync(logsDir)
          .filter(file => file.endsWith('.log') || file.endsWith('.txt'))
          .sort((a, b) => {
            const statA = fs.statSync(path.join(logsDir, a));
            const statB = fs.statSync(path.join(logsDir, b));
            return statB.mtime - statA.mtime;
          })
          .slice(0, 5);
        
        if (files.length > 0) {
          files.forEach((file, index) => {
            const filePath = path.join(logsDir, file);
            const stats = fs.statSync(filePath);
            console.log(`${index + 1}. ${file} (${stats.mtime.toLocaleString()})`);
          });
          
          const choice = await this.prompt('\n' + t('debug.selectLogPrompt', { count: files.length }));
          const fileIndex = parseInt(choice) - 1;
          
          if (fileIndex >= 0 && fileIndex < files.length) {
            const logContent = fs.readFileSync(path.join(logsDir, files[fileIndex]), 'utf8');
            console.log(`\n${t('debug.contentOf', { filename: files[fileIndex] })}:`);
            console.log('============================================================');
            console.log(logContent.slice(-2000)); // Show last 2000 characters
            console.log('============================================================');
          }
        } else {
          console.log(t('debug.noDebugLogsFound'));
        }
      } else {
        console.log(t('debug.debugLogsDirectoryNotFound'));
      }
    } catch (error) {
      console.error(t('errors.errorReadingDebugLogs', { error: error.message }));
    }
    
    await this.prompt('\n' + t('menu.pressEnterToContinue'));
      await this.showInteractiveMenu();
  }

  // Enhanced delete reports and logs functionality
  async deleteReports() {
    // Check for PIN protection
    const authRequired = await this.adminAuth.isAuthRequiredForScript('deleteReports');
    if (authRequired) {
      console.log(`\n${t('adminPin.protectedAccess')}`);
      const cliHelper = require('../utils/cli-helper');
      const pin = await cliHelper.promptPin(t('adminPin.enterPin') + ': ');
      const isValid = await this.adminAuth.verifyPin(pin);
      
      if (!isValid) {
        console.log(t('adminPin.invalidPin'));
        await this.prompt(t('menu.pressEnterToContinue'));
        await this.showInteractiveMenu();
        return;
      }
      
      console.log(t('adminPin.accessGranted'));
    }

    console.log(`\n${t('operations.deleteReportsTitle')}`);
    console.log('============================================================');
    
    const targetDirs = [
      { path: path.join(process.cwd(), 'i18ntk-reports'), name: 'Reports', type: 'reports' },
      { path: path.join(process.cwd(), 'reports'), name: 'Legacy Reports', type: 'reports' },
      { path: path.join(process.cwd(), 'reports', 'backups'), name: 'Reports Backups', type: 'backups' },
      { path: path.join(process.cwd(), 'scripts', 'debug', 'logs'), name: 'Debug Logs', type: 'logs' },
      { path: path.join(process.cwd(), 'scripts', 'debug', 'reports'), name: 'Debug Reports', type: 'reports' },
      { path: path.join(require('os').homedir(), '.i18ntk', 'backups'), name: 'Settings Backups', type: 'backups' },
      { path: path.join(process.cwd(), 'utils', 'i18ntk-reports'), name: 'Utils Reports', type: 'reports' }
    ].filter(dir => dir.path && typeof dir.path === 'string');
    
    try {
     console.log(t('operations.scanningForFiles'));
      
      let availableDirs = [];
      
      // Check which directories exist and have files
      for (const dir of targetDirs) {
        if (fs.existsSync(dir.path)) {
          const files = this.getAllReportFiles(dir.path);
          if (files.length > 0) {
            availableDirs.push({
              ...dir,
              files: files.map(file => ({ path: file, dir: dir.path })),
              count: files.length
            });
          }
        }
      }
      
      if (availableDirs.length === 0) {
       console.log(t('operations.noFilesFoundToDelete'));
        await this.prompt(t('menu.pressEnterToContinue'));
        await this.showInteractiveMenu();
        return;
      }
      
      // Show available directories
      console.log(t('operations.availableDirectories'));
      availableDirs.forEach((dir, index) => {
        console.log(`  ${index + 1}. ${dir.name} (${dir.count} files)`);
      });
     console.log(`  ${availableDirs.length + 1}. ${t('operations.allDirectories')}`);
     console.log(`  0. ${t('operations.cancelOption')}`);
      
      const dirChoice = await this.prompt(`\nSelect directory to clean (0-${availableDirs.length + 1}): `);
      const dirIndex = parseInt(dirChoice) - 1;
      
      let selectedDirs = [];
      
      if (dirChoice.trim() === '0') {
        console.log(t('operations.cancelled'));
        await this.prompt(t('menu.pressEnterToContinue'));
        await this.showInteractiveMenu();
        return;
      } else if (dirIndex === availableDirs.length) {
        selectedDirs = availableDirs;
      } else if (dirIndex >= 0 && dirIndex < availableDirs.length) {
        selectedDirs = [availableDirs[dirIndex]];
      } else {
       console.log(t('operations.invalidSelection'));
        await this.prompt(t('menu.pressEnterToContinue'));
        await this.showInteractiveMenu();
        return;
      }
      
      // Collect all files from selected directories
      let allFiles = [];
      selectedDirs.forEach(dir => {
        allFiles.push(...dir.files);
      });
      
      console.log(t('operations.foundFilesInSelectedDirectories', { count: allFiles.length }));
      selectedDirs.forEach(dir => {
        console.log(`  📁 ${dir.name}: ${dir.count} files`);
      });
      
      // Show deletion options
      console.log(t('operations.deletionOptions'));
      console.log(`  1. ${t('operations.deleteAllFiles')}`);
      console.log(`  2. ${t('operations.keepLast3Files')}`);
      console.log(`  3. ${t('operations.keepLast5Files')}`);
      console.log(`  0. ${t('operations.cancelReportOption')}`);
      
      const option = await this.prompt('\nSelect option (0-3): ');
      
      let filesToDelete = [];
      
      switch (option.trim()) {
        case '1':
          filesToDelete = allFiles;
          break;
        case '2':
          filesToDelete = this.getFilesToDeleteKeepLast(allFiles, 3);
          break;
        case '3':
          filesToDelete = this.getFilesToDeleteKeepLast(allFiles, 5);
          break;
        case '0':
          console.log(t('operations.cancelled'));
          await this.prompt(t('menu.pressEnterToContinue'));
          await this.showInteractiveMenu();
          return;
        default:
          console.log(t('menu.invalidOption'));
          await this.prompt(t('menu.pressEnterToContinue'));
          await this.showInteractiveMenu();
          return;
      }
      
      if (filesToDelete.length === 0) {
       console.log(t('operations.noFilesToDelete'));
        await this.prompt(t('menu.pressEnterToContinue'));
        await this.showInteractiveMenu();
        return;
      }
      
      console.log(t('operations.filesToDeleteCount', { count: filesToDelete.length }));
      console.log(t('operations.filesToKeepCount', { count: allFiles.length - filesToDelete.length }));
      
     const confirm = await this.prompt(t('operations.confirmDeletion'));
      
      if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
        let deletedCount = 0;
        
        for (const fileInfo of filesToDelete) {
          try {
            fs.unlinkSync(fileInfo.path);
           console.log(t('operations.deletedFile', { filename: path.basename(fileInfo.path) }));
            deletedCount++;
          } catch (error) {
          console.log(t('operations.failedToDeleteFile', { filename: path.basename(fileInfo.path), error: error.message }));
          }
        }
        
        console.log(`\n🎉 Successfully deleted ${deletedCount} files!`);
      } else {
        console.log(t('operations.cancelled'));
      }
      
    } catch (error) {
      console.error(`❌ Error during deletion process: ${error.message}`);
    }
    
    await this.prompt(t('menu.pressEnterToContinue'));
    await this.showInteractiveMenu();
  }
  
  // Helper method to get all report and log files recursively
  getAllReportFiles(dir) {
    if (!dir || typeof dir !== 'string') {
      return [];
    }
    
    let files = [];
    
    try {
      if (!fs.existsSync(dir)) {
        return [];
      }
      
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            files.push(...this.getAllReportFiles(fullPath));
          } else if (
            // Common report file extensions
            item.endsWith('.json') || 
            item.endsWith('.html') || 
            item.endsWith('.txt') || 
            item.endsWith('.log') || 
            item.endsWith('.csv') || 
            item.endsWith('.md') ||
            // Specific report filename patterns
            item.includes('-report.') || 
            item.includes('_report.') || 
            item.includes('report-') || 
            item.includes('report_') ||
            item.includes('analysis-') ||
            item.includes('validation-')
          ) {
            files.push(fullPath);
          }
        } catch (error) {
          // Skip individual files that can't be accessed
          continue;
        }
      }
    } catch (error) {
      // Silent fail for inaccessible directories
      console.log(`⚠️ Could not access directory: ${dir}`);
    }
    
    return files;
  }
  
  // Helper method to determine which files to delete when keeping last N files
  getFilesToDeleteKeepLast(allFiles, keepCount = 3) {
    // Sort files by modification time (newest first)
    const sortedFiles = allFiles.sort((a, b) => {
      try {
        const statA = fs.statSync(a.path || a);
        const statB = fs.statSync(b.path || b);
        return statB.mtime.getTime() - statA.mtime.getTime();
      } catch (error) {
        // If stat fails, sort by filename as fallback
        const pathA = a.path || a;
        const pathB = b.path || b;
        return pathB.localeCompare(pathA);
      }
    });
    
    // Keep the N newest files, delete the rest
    return sortedFiles.slice(keepCount);
  }

  // Settings Menu
  async showSettingsMenu() {
    try {
      // Check for PIN protection
      const authRequired = await this.adminAuth.isAuthRequiredForScript('settingsMenu');
      if (authRequired) {
        console.log(`\n${t('adminPin.protectedAccess')}`);
        const cliHelper = require('../utils/cli-helper');
        const pin = await cliHelper.promptPin(t('adminPin.enterPin') + ': ');
        const isValid = await this.adminAuth.verifyPin(pin);
        
        if (!isValid) {
          console.log(t('adminPin.invalidPin'));
          await this.prompt(t('menu.pressEnterToContinue'));
          await this.showInteractiveMenu();
          return;
        }
        
        console.log(t('adminPin.accessGranted'));
      }

      const SettingsCLI = require('../settings/settings-cli');
      const settingsCLI = new SettingsCLI();
      await settingsCLI.run();
    } catch (error) {
      console.error('❌ Error opening settings:', error.message);
      await this.prompt(t('menu.pressEnterToContinue'));
    }
    await this.showInteractiveMenu();
  }



  prompt(question) {
    const cliHelper = require('../utils/cli-helper');
    // If interactive not available, return empty string to avoid hangs
    if (!process.stdin.isTTY || process.stdin.destroyed) {
      console.log('\n⚠️ Interactive input not available, using default response.');
      return Promise.resolve('');
    }
    return cliHelper.prompt(`${question} `);
  }
  
  // Safe method to check if we're in non-interactive mode
  isNonInteractiveMode() {
    return !process.stdin.isTTY || process.stdin.destroyed || this.isReadlineClosed;
  }
  
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
}

// Run if called directly
if (require.main === module) {
  // Handle version and help immediately before any initialization
  const args = process.argv.slice(2);
  
  if (args.includes('--version') || args.includes('-v')) {
    try {
      const packageJsonPath = path.resolve(__dirname, '../package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const versionInfo = packageJson.versionInfo || {};
      
      console.log(`\n🌍 i18n Toolkit (i18ntk)`);
      console.log(`Version: ${packageJson.version}`);
      console.log(`Release Date: ${versionInfo.releaseDate || 'N/A'}`);
      console.log(`Maintainer: ${versionInfo.maintainer || packageJson.author}`);
      console.log(`Node.js: ${versionInfo.supportedNodeVersions || packageJson.engines?.node || '>=16.0.0'}`);
      console.log(`License: ${packageJson.license}`);
      
      if (versionInfo.majorChanges && versionInfo.majorChanges.length > 0) {
        console.log(`\n✨ What's New in ${packageJson.version}:`);
        versionInfo.majorChanges.forEach(change => {
          console.log(`  • ${change}`);
        });
      }
      
      console.log(`\n📖 Documentation: ${packageJson.homepage}`);
      console.log(`🐛 Report Issues: ${packageJson.bugs?.url}`);
      
    } catch (error) {
      console.log(`\n❌ Version information unavailable`);
      console.log(`Error: ${error.message}`);
    }
    process.exit(0);
  }
  
  const manager = new I18nManager();
  manager.run();
}

module.exports = I18nManager;