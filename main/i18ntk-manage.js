#!/usr/bin/env node
/**
 * I18N MANAGEMENT TOOLKIT - MAIN MANAGER
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
const readline = require('readline');
const UIi18n = require('./i18ntk-ui');
const AdminAuth = require('../utils/admin-auth');
const SecurityUtils = require('../utils/security');
const AdminCLI = require('../utils/admin-cli');
const settingsManager = require('../settings/settings-manager');
const I18nInitializer = require('./i18ntk-init');
const I18nAnalyzer = require('./i18ntk-analyze');
const I18nValidator = require('./i18ntk-validate');
const I18nUsageAnalyzer = require('./i18ntk-usage');
const I18nSizingAnalyzer = require('./i18ntk-sizing');
const SettingsCLI = require('../settings/settings-cli');
const I18nDebugger = require('../dev/debug/debugger');

// Enhanced default configuration with multiple path detection
const DEFAULT_CONFIG = {
  sourceDir: './locales',
  sourceLanguage: 'en',
  defaultLanguages: ['de', 'es', 'fr', 'ru'],
  outputDir: './i18ntk-reports',
  // Multiple possible i18n locations to check
  possibleI18nPaths: [
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
  ]
};

class I18nManager {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.rl = null;
    this.isReadlineClosed = false;
    this.isAuthenticated = false;
    this.settingsManager = settingsManager;
    
    // Initialize UI localization system
    this.ui = new UIi18n();
    
    // Initialize admin authentication
    this.adminAuth = new AdminAuth();
    
    // Auto-detect i18n directory on initialization
    this.detectI18nDirectory();
    
    // Initialize readline interface
    this.initializeReadline();
  }
  
  initializeReadline() {
    if (!this.rl || this.isReadlineClosed) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
        historySize: 0
      });
      this.isReadlineClosed = false;
      
      // Handle readline close events
      this.rl.on('close', () => {
        this.isReadlineClosed = true;
      });
      
      // Make readline interface globally available
      global.activeReadlineInterface = this.rl;
    }
  }

  // Auto-detect i18n directory from common locations
  detectI18nDirectory() {
    for (const possiblePath of this.config.possibleI18nPaths) {
      const resolvedPath = path.resolve(possiblePath);
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
            console.log(this.ui.t('hardcodedTexts.autoDetectedI18nDirectory', { path: possiblePath }));
            break;
          }
        } catch (error) {
          // Continue checking other paths
        }
      }
    }
  }

  // Check if i18n framework is installed
  async checkI18nDependencies() {
    const packageJsonPath = path.resolve('./package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      console.log(this.ui.t('init.warnings.noPackageJson'));
      return await this.promptContinueWithoutI18n();
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
        console.log(`✅ Detected i18n framework(s): ${installedFrameworks.join(', ')}`);
        return true;
      } else {
        console.log(this.ui.t('init.suggestions.noFramework'));
        console.log(this.ui.t('init.frameworks.react'));
        console.log(this.ui.t('init.frameworks.vue'));
        console.log(this.ui.t('init.frameworks.i18next'));
        console.log(this.ui.t('init.frameworks.nuxt'));
        console.log(this.ui.t('init.frameworks.svelte'));
        return await this.promptContinueWithoutI18n();
      }
    } catch (error) {
      console.log(this.ui.t('init.errors.packageJsonRead'));
      return await this.promptContinueWithoutI18n();
    }
  }

  /**
   * Prompt user to continue without i18n framework
   */
  async promptContinueWithoutI18n() {
    const answer = await this.prompt('\n🤔 Continue without i18n framework? (y/N): ');
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
  }

  // Add this run method after the checkI18nDependencies method
  async run() {
    try {
      // Parse command line arguments
      const args = process.argv.slice(2);
      let commandToExecute = null;

      // Define valid direct commands
      const directCommands = [
        'init', 'analyze', 'validate', 'usage', 'sizing', 'complete', 'summary', 'debug', 'workflow'
      ];

      // Handle help immediately without dependency checks
      if (args.includes('--help') || args.includes('-h')) {
        this.showHelp();
        return;
      }

      // Check for --command= argument first
      const commandFlagArg = args.find(arg => arg.startsWith('--command='));
      if (commandFlagArg) {
        commandToExecute = commandFlagArg.split('=')[1];
      } else if (args.length > 0 && directCommands.includes(args[0])) {
        // If no --command=, check if the first argument is a direct command
        commandToExecute = args[0];
      }

      if (commandToExecute) {
        console.log(`🔄 Executing command: ${commandToExecute}`);
        await this.executeCommand(commandToExecute);
        this.safeClose();
        return;
      }

      // If no direct command or an invalid one, proceed to interactive menu
      console.log(this.ui.t('menu.title'));
      console.log('='.repeat(40));

      // Check dependencies and exit if user chooses not to continue
      const shouldContinue = await this.checkI18nDependencies();
      if (!shouldContinue) {
        console.log(this.ui.t('init.errors.noFramework'));
        console.log(this.ui.t('init.suggestions.installFramework'));
        process.exit(0);
      }
      
      // Interactive mode
      await this.showInteractiveMenu();
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    } finally {
      this.safeClose();
    }
  }

  showHelp() {
    console.log(this.ui.t('help.usage'));
    console.log(this.ui.t('help.interactiveMode'));
    console.log(this.ui.t('help.initProject'));
    console.log(this.ui.t('help.analyzeTranslations'));
    console.log(this.ui.t('help.validateTranslations'));
    console.log(this.ui.t('help.checkUsage'));
    console.log(this.ui.t('help.showHelp'));
    console.log(this.ui.t('help.availableCommands'));
    console.log(this.ui.t('help.initCommand'));
    console.log(this.ui.t('help.analyzeCommand'));
    console.log(this.ui.t('help.validateCommand'));
    console.log(this.ui.t('help.usageCommand'));
    console.log(this.ui.t('help.sizingCommand'));
    console.log(this.ui.t('help.completeCommand'));
    console.log(this.ui.t('help.summaryCommand'));
    console.log(this.ui.t('help.debugCommand'));

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
    if (options.fromWorkflow === true || process.env.I18NTK_WORKFLOW_MODE === 'true') {
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
    console.log(this.ui.t('hardcodedTexts.executingCommand', { command }));
    
    // Enhanced context detection
    const executionContext = this.getExecutionContext(options);
    const isDirectCommand = executionContext.type === 'direct';
    const isWorkflowExecution = executionContext.type === 'workflow';
    const isManagerExecution = executionContext.type === 'manager';
    
    // Ensure UI language is refreshed from settings for workflow and direct execution
    if (isWorkflowExecution || isDirectCommand) {
      this.ui.refreshLanguageFromSettings();
    }
    
    // Check admin authentication for sensitive commands
    const sensitiveCommands = ['init', 'validate', 'complete', 'sizing', 'debug'];
    if (sensitiveCommands.includes(command)) {
      const authPassed = await this.checkAdminAuth();
      if (!authPassed) {
        if (!this.isNonInteractiveMode() && !isDirectCommand) {
          await this.prompt(this.ui.t('hardcodedTexts.pressEnterToContinue'));
          await this.showInteractiveMenu();
        }
        return;
      }
    }
    
    try {
        switch (command) {
            case 'init':
                const initializer = new I18nInitializer();
                await initializer.run();
                break;
            case 'analyze':
                const analyzer = new I18nAnalyzer();
                await analyzer.run();
                break;
            case 'validate':
                const validator = new I18nValidator();
                await validator.run();
                break;
            case 'usage':
                const usageAnalyzer = new I18nUsageAnalyzer();
                await usageAnalyzer.run();
                break;
            case 'sizing':
                const sizingAnalyzer = new I18nSizingAnalyzer();
                await sizingAnalyzer.run();
                break;
            case 'complete':
                const completeTool = require('./i18ntk-complete');
                const tool = new completeTool();
                await tool.run();
                break;
            case 'workflow':
                console.log(this.ui.t('workflow.starting'));
                const AutoRunner = require('./i18ntk-autorun');
                const runner = new AutoRunner();
                await runner.runAll(true); // Pass true for quiet mode
                
                // Show workflow completion message and return to menu
                console.log(this.ui.t('workflow.completed'));
                console.log(this.ui.t('workflow.checkReports'));
                
                // Check execution context for proper exit handling
                if (isManagerExecution && !this.isNonInteractiveMode()) {
                    try {
                        await this.prompt('\n📝 Press Enter to return to main menu...');
                        await this.showInteractiveMenu();
                    } catch (error) {
                        // If readline fails, just exit gracefully
                        console.log(this.ui.t('menu.returning'));
                        process.exit(0);
                    }
                } else {
                    // For direct commands or workflow execution, exit gracefully
                    console.log(this.ui.t('workflow.exitingCompleted'));
                    process.exit(0);
                }
                return;
            case 'debug':
                const debuggerTool = new I18nDebugger();
                await debuggerTool.run();
                break;
            case 'help':
                this.showHelp();
                if (isManagerExecution && !this.isNonInteractiveMode()) {
                  await this.prompt(this.ui.t('usage.pressEnterToReturnToMenu'));
                  await this.showInteractiveMenu();
                } else if (isDirectCommand && !this.isNonInteractiveMode()) {
                  await this.prompt(this.ui.t('usage.pressEnterToContinue'));
                  console.log(this.ui.t('workflow.exitingCompleted'));
                  this.safeClose();
                  process.exit(0);
                } else {
                  console.log(this.ui.t('workflow.exitingCompleted'));
                  this.safeClose();
                  process.exit(0);
                }
                return;
                break;
            default:
                console.log(this.ui.t('hardcodedTexts.unknownCommand', { command }));
                this.showHelp();
                // No return here, let the completion logic handle the exit/menu return
                break;
        }
        
        // Handle command completion based on execution context
        console.log(this.ui.t('operations.completed'));
        
        if (isManagerExecution && !this.isNonInteractiveMode()) {
          // Interactive menu execution - return to menu
          await this.prompt(this.ui.t('hardcodedTexts.pressEnterToReturnToMenu'));
          await this.showInteractiveMenu();
        } else if (isDirectCommand && !this.isNonInteractiveMode()) {
          // Direct command execution - show "enter to continue" and exit
          await this.prompt(this.ui.t('hardcodedTexts.pressEnterToContinue'));
          console.log(this.ui.t('workflow.exitingCompleted'));
          this.safeClose();
          process.exit(0);
        } else {
          // Non-interactive mode or workflow execution - exit immediately
          console.log(this.ui.t('workflow.exitingCompleted'));
          this.safeClose();
          process.exit(0);
        }
        
    } catch (error) {
        console.error(this.ui.t('hardcodedTexts.errorExecutingCommand', { error: error.message }));
        
        if (isManagerExecution && !this.isNonInteractiveMode()) {
          // Interactive menu execution - show error and return to menu
          await this.prompt(this.ui.t('hardcodedTexts.pressEnterToContinue'));
          await this.showInteractiveMenu();
        } else if (isDirectCommand && !this.isNonInteractiveMode()) {
          // Direct command execution - show "enter to continue" and exit with error
          await this.prompt(this.ui.t('hardcodedTexts.pressEnterToContinue'));
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

    console.log(this.ui.t('admin.authRequired'));
    const pin = await this.prompt('Enter admin PIN: ');
    const isValid = await this.adminAuth.verifyPin(pin);
    
    if (!isValid) {
      console.log(this.ui.t('admin.invalidPin'));
      return false;
    }
    
    console.log(this.ui.t('admin.authSuccess'));
    return true;
  }

  async showInteractiveMenu() {
    // Check if we're in non-interactive mode (like echo 0 | node script)
    if (this.isNonInteractiveMode()) {
      console.log(`\n${this.ui.t('menu.title')}`);
      console.log(this.ui.t('menu.separator'));
      console.log(`1. ${this.ui.t('menu.options.init')}`);
      console.log(`2. ${this.ui.t('menu.options.analyze')}`);
      console.log(`3. ${this.ui.t('menu.options.validate')}`);
      console.log(`4. ${this.ui.t('menu.options.usage')}`);
      console.log(`5. ${this.ui.t('menu.options.complete')}`);
      console.log(`6. ${this.ui.t('menu.options.sizing')}`);
      console.log(`7. ${this.ui.t('menu.options.workflow')}`);
      console.log(`8. ${this.ui.t('menu.options.status')}`);
      console.log(`9. ${this.ui.t('menu.options.delete')}`);
      console.log(`10. ${this.ui.t('menu.options.language')}`);
      console.log(`11. ${this.ui.t('menu.options.settings')}`);
      console.log(`12. ${this.ui.t('menu.options.help')}`);
      console.log(`13. ${this.ui.t('menu.options.debug')}`);
      console.log(`0. ${this.ui.t('menu.options.exit')}`);
      console.log('\n⚠️ Non-interactive mode detected. Menu displayed for reference only.');
      console.log('💡 Use: node main/i18ntk-manage.js --command=<command> for direct execution.');
      console.log('📖 Use: node main/i18ntk-manage.js --help for available commands.');
      this.safeClose();
      process.exit(0);
      return;
    }
    
    console.log(`\n${this.ui.t('menu.title')}`);
    console.log(this.ui.t('menu.separator'));
    console.log(`1. ${this.ui.t('menu.options.init')}`);
    console.log(`2. ${this.ui.t('menu.options.analyze')}`);
    console.log(`3. ${this.ui.t('menu.options.validate')}`);
    console.log(`4. ${this.ui.t('menu.options.usage')}`);
    console.log(`5. ${this.ui.t('menu.options.complete')}`);
    console.log(`6. ${this.ui.t('menu.options.sizing')}`);
    console.log(`7. ${this.ui.t('menu.options.workflow')}`);
    console.log(`8. ${this.ui.t('menu.options.status')}`);
    console.log(`9. ${this.ui.t('menu.options.delete')}`);
    console.log(`10. ${this.ui.t('menu.options.language')}`);
    console.log(`11. ${this.ui.t('menu.options.settings')}`);
    console.log(`12. ${this.ui.t('menu.options.help')}`);
    console.log(`13. ${this.ui.t('menu.options.debug')}`);
    console.log(`0. ${this.ui.t('menu.options.exit')}`);
    
    const choice = await this.prompt('\n' + this.ui.t('hardcodedTexts.selectOptionPrompt'));
    
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
        await this.executeCommand('workflow', {fromMenu: true});
        break;
      case '8':
        console.log(this.ui.t('status.generating'));
        try {
          const summaryTool = require('./i18ntk-summary');
          const summary = new summaryTool();
          await summary.run();
          console.log(this.ui.t('status.completed'));
          
          // Check if we're in interactive mode before prompting
          if (!this.isNonInteractiveMode()) {
            try {
              await this.prompt('\n' + this.ui.t('hardcodedTexts.pressEnterToContinue'));
              await this.showInteractiveMenu();
            } catch (error) {
              console.log(this.ui.t('menu.returning'));
              process.exit(0);
            }
          } else {
            console.log(this.ui.t('status.exitingCompleted'));
            process.exit(0);
          }
        } catch (error) {
          console.error(this.ui.t('hardcodedTexts.errorGeneratingStatusSummary', { error: error.message }));
          
          // Check if we're in interactive mode before prompting
          if (!this.isNonInteractiveMode()) {
            try {
              await this.prompt('\n' + this.ui.t('hardcodedTexts.pressEnterToContinue'));
              await this.showInteractiveMenu();
            } catch (error) {
              console.log(this.ui.t('menu.returning'));
              process.exit(0);
            }
          } else {
            console.log(this.ui.t('common.errorExiting'));
            process.exit(1);
          }
        }
        break;
      case '9':
        await this.deleteReports();
        break;
      case '10':
        await this.changeLanguage();
        break;
      case '11':
        await this.showSettingsMenu();
        break;
      case '12':
        this.showHelp();
        await this.prompt(this.ui.t('hardcodedTexts.pressEnterToReturnToMenu'));
        await this.showInteractiveMenu();
        break;
      case '13':
        await this.showDebugMenu();
        break;
      case '0':
        console.log(this.ui.t('menu.goodbye'));
        this.safeClose();
        process.exit(0);
      default:
        console.log(this.ui.t('menu.invalidChoice'));
        await this.showInteractiveMenu();
    }
  }

  // Debug Tools Menu
  async showDebugMenu() {
    console.log(`\n${this.ui.t('menu.options.debug')}`);
    console.log(this.ui.t('menu.separator'));
    console.log(`1. ${this.ui.t('hardcodedTexts.mainDebuggerSystemDiagnostics')}`);
    console.log(`2. ${this.ui.t('hardcodedTexts.consoleTranslationsCheck')}`);
    console.log(`3. ${this.ui.t('hardcodedTexts.exportMissingKeys')}`);
    console.log(`4. ${this.ui.t('hardcodedTexts.replaceHardcodedConsole')}`);
    console.log(`5. ${this.ui.t('hardcodedTexts.consoleKeyChecker')}`);
    console.log(`6. ${this.ui.t('hardcodedTexts.debugLogs')}`);
    console.log(`0. ${this.ui.t('hardcodedTexts.backToMainMenu')}`);
    
    const choice = await this.prompt('\n' + this.ui.t('hardcodedTexts.selectDebugToolPrompt'));
    
    switch (choice.trim()) {
      case '1':
        await this.runDebugTool('debugger.js', 'Main Debugger');
        break;
      case '2':
        await this.runDebugTool('console-translations.js', 'Console Translations');
        break;
      case '3':
        await this.runDebugTool('export-missing-keys.js', 'Export Missing Keys');
        break;
      case '4':
        await this.runDebugTool('replace-hardcoded-console.js', 'Replace Hardcoded Console');
        break;
      case '5':
        await this.runDebugTool('console-key-checker.js', 'Console Key Checker');
        break;
      case '6':
        await this.viewDebugLogs();
        break;
      case '0':
        await this.showInteractiveMenu();
        return;
      default:
        console.log(this.ui.t('hardcodedTexts.invalidChoiceSelectRange'));
        await this.showDebugMenu();
    }
  }

  // Run a debug tool
  async runDebugTool(toolName, displayName) {
    console.log(this.ui.t('hardcodedTexts.runningDebugTool', { displayName }));
    try {
      const toolPath = path.join(__dirname, '..', 'dev', 'debug', toolName);
      if (fs.existsSync(toolPath)) {
        const { execSync } = require('child_process');
        const output = execSync(`node "${toolPath}"`, { 
          encoding: 'utf8',
          cwd: path.join(__dirname, '..'),
          timeout: 30000
        });
        console.log(output);
      } else {
        console.log(this.ui.t('hardcodedTexts.debugToolNotFound', { toolName }));
      }
    } catch (error) {
      console.error(this.ui.t('hardcodedTexts.errorRunningDebugTool', { displayName, error: error.message }));
    }
    
    await this.prompt('\n' + this.ui.t('hardcodedTexts.pressEnterToContinue'));
    await this.showDebugMenu();
  }

  // View debug logs
  async viewDebugLogs() {
    console.log(`\n${this.ui.t('hardcodedTexts.recentDebugLogs')}`);
    console.log('============================================================');
    
    try {
      const logsDir = path.join(__dirname, '..', 'dev', 'debug', 'logs');
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
          
          const choice = await this.prompt('\n' + this.ui.t('hardcodedTexts.selectLogPrompt', { count: files.length }));
          const fileIndex = parseInt(choice) - 1;
          
          if (fileIndex >= 0 && fileIndex < files.length) {
            const logContent = fs.readFileSync(path.join(logsDir, files[fileIndex]), 'utf8');
            console.log(`\n📄 Content of ${files[fileIndex]}:`);
            console.log('============================================================');
            console.log(logContent.slice(-2000)); // Show last 2000 characters
            console.log('============================================================');
          }
        } else {
          console.log(this.ui.t('hardcodedTexts.noDebugLogsFound'));
        }
      } else {
        console.log(this.ui.t('hardcodedTexts.debugLogsDirectoryNotFound'));
      }
    } catch (error) {
      console.error(this.ui.t('hardcodedTexts.errorReadingDebugLogs', { error: error.message }));
    }
    
    await this.prompt('\n' + this.ui.t('hardcodedTexts.pressEnterToContinue'));
      await this.showInteractiveMenu();
  }

  // Enhanced delete reports and logs functionality
  async deleteReports() {
    console.log(`\n🗑️ Delete Reports & Logs`);
    console.log('============================================================');
    
    const targetDirs = [
      { path: path.join(process.cwd(), 'i18ntk-reports'), name: 'Reports', type: 'reports' },
      { path: path.join(process.cwd(), 'reports'), name: 'Legacy Reports', type: 'reports' },
      { path: path.join(process.cwd(), 'dev', 'debug', 'logs'), name: 'Debug Logs', type: 'logs' },
      { path: path.join(process.cwd(), 'dev', 'debug', 'reports'), name: 'Debug Reports', type: 'reports' },
      { path: path.join(process.cwd(), 'settings', 'backups'), name: 'Backups', type: 'backups' }
    ];
    
    try {
      console.log('🔍 Scanning for files to delete...');
      
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
        console.log('✅ No files found to delete.');
        await this.prompt(this.ui.t('hardcodedTexts.pressEnterToContinue'));
        await this.showInteractiveMenu();
        return;
      }
      
      // Show available directories
      console.log('\n📁 Available directories:');
      availableDirs.forEach((dir, index) => {
        console.log(`  ${index + 1}. ${dir.name} (${dir.count} files)`);
      });
      console.log(`  ${availableDirs.length + 1}. All directories`);
      console.log('  0. Cancel');
      
      const dirChoice = await this.prompt(`\nSelect directory to clean (0-${availableDirs.length + 1}): `);
      const dirIndex = parseInt(dirChoice) - 1;
      
      let selectedDirs = [];
      
      if (dirChoice.trim() === '0') {
        console.log('❌ Operation cancelled.');
        await this.prompt(this.ui.t('hardcodedTexts.pressEnterToContinue'));
        await this.showInteractiveMenu();
        return;
      } else if (dirIndex === availableDirs.length) {
        selectedDirs = availableDirs;
      } else if (dirIndex >= 0 && dirIndex < availableDirs.length) {
        selectedDirs = [availableDirs[dirIndex]];
      } else {
        console.log('❌ Invalid selection.');
        await this.prompt(this.ui.t('hardcodedTexts.pressEnterToContinue'));
        await this.showInteractiveMenu();
        return;
      }
      
      // Collect all files from selected directories
      let allFiles = [];
      selectedDirs.forEach(dir => {
        allFiles.push(...dir.files);
      });
      
      console.log(`\n📊 Found ${allFiles.length} files in selected directories:`);
      selectedDirs.forEach(dir => {
        console.log(`  📁 ${dir.name}: ${dir.count} files`);
      });
      
      // Show deletion options
      console.log('\n🗑️ Deletion Options:');
      console.log('  1. Delete all files');
      console.log('  2. Keep last 3 files (by date)');
      console.log('  3. Keep last 5 files (by date)');
      console.log('  0. Cancel');
      
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
          console.log('❌ Operation cancelled.');
          await this.prompt(this.ui.t('hardcodedTexts.pressEnterToContinue'));
          await this.showInteractiveMenu();
          return;
        default:
          console.log('❌ Invalid option.');
          await this.prompt(this.ui.t('hardcodedTexts.pressEnterToContinue'));
          await this.showInteractiveMenu();
          return;
      }
      
      if (filesToDelete.length === 0) {
        console.log('✅ No files to delete.');
        await this.prompt(this.ui.t('hardcodedTexts.pressEnterToContinue'));
        await this.showInteractiveMenu();
        return;
      }
      
      console.log(`\n📋 Files to delete: ${filesToDelete.length}`);
      console.log(`📋 Files to keep: ${allFiles.length - filesToDelete.length}`);
      
      const confirm = await this.prompt('\n⚠️ Are you sure you want to delete these files? (y/N): ');
      
      if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
        let deletedCount = 0;
        
        for (const fileInfo of filesToDelete) {
          try {
            fs.unlinkSync(fileInfo.path);
            console.log(`✅ Deleted: ${path.basename(fileInfo.path)}`);
            deletedCount++;
          } catch (error) {
            console.log(`❌ Failed to delete ${path.basename(fileInfo.path)}: ${error.message}`);
          }
        }
        
        console.log(`\n🎉 Successfully deleted ${deletedCount} files!`);
      } else {
        console.log('❌ Operation cancelled.');
      }
      
    } catch (error) {
      console.error(`❌ Error during deletion process: ${error.message}`);
    }
    
    await this.prompt(this.ui.t('hardcodedTexts.pressEnterToContinue'));
    await this.showInteractiveMenu();
  }
  
  // Helper method to get all report and log files recursively
  getAllReportFiles(dir) {
    let files = [];
    
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getAllReportFiles(fullPath));
      } else if (item.endsWith('.json') || item.endsWith('.html') || item.endsWith('.txt') || item.endsWith('.log')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }
  
  // Helper method to determine which files to delete when keeping last N files
  getFilesToDeleteKeepLast(allFiles, keepCount = 3) {
    // Sort files by modification time (newest first)
    const sortedFiles = allFiles.sort((a, b) => {
      const statA = fs.statSync(a.path);
      const statB = fs.statSync(b.path);
      return statB.mtime.getTime() - statA.mtime.getTime();
    });
    
    // Keep the N newest files, delete the rest
    return sortedFiles.slice(keepCount);
  }

  // Settings Menu
  async showSettingsMenu() {
    try {
      const SettingsCLI = require('../settings/settings-cli');
      const settingsCLI = new SettingsCLI();
      await settingsCLI.run();
    } catch (error) {
      console.error('❌ Error opening settings:', error.message);
      await this.prompt(this.ui.t('hardcodedTexts.pressEnterToContinue'));
    }
    await this.showInteractiveMenu();
  }

  // Add language change functionality
  async changeLanguage() {
    console.log(this.ui.t('language.changeTitle'));
    console.log('=' .repeat(50));
    
    const languages = {
      'en': '🇺🇸 English',
      'de': '🇩🇪 Deutsch',
      'es': '🇪🇸 Español', 
      'fr': '🇫🇷 Français',
      'ru': '🇷🇺 Русский',
      'ja': '🇯🇵 日本語',
      'zh': '🇨🇳 中文'
    };
    
    console.log(this.ui.t('language.available'));
    Object.entries(languages).forEach(([code, name], index) => {
      console.log(`  ${index + 1}. ${code} - ${name}`);
    });
    
    const choice = await this.prompt('\nSelect language (1-7): ');
    const languageCodes = Object.keys(languages);
    const selectedIndex = parseInt(choice) - 1;
    
    if (selectedIndex >= 0 && selectedIndex < languageCodes.length) {
      const selectedLang = languageCodes[selectedIndex];
      this.ui.loadLanguage(selectedLang);
      
      // Save to settings
      const settingsManager = require('../settings/settings-manager');
      settingsManager.setLanguage(selectedLang);
      
      console.log(`✅ Language changed to ${languages[selectedLang]}`);
    } else {
      console.log(this.ui.t('language.invalidSelection'));
    }
    
    await this.prompt(this.ui.t('hardcodedTexts.pressEnterToContinue'));
    await this.showInteractiveMenu();
  }

  prompt(question) {
    return new Promise((resolve) => {
      // Check if readline is available and not closed
      if (!this.rl || this.isReadlineClosed) {
        this.initializeReadline();
      }
      
      // Double check if stdin is available
      if (!process.stdin.isTTY || process.stdin.destroyed) {
        console.log('\n⚠️ Interactive input not available, using default response.');
        resolve('');
        return;
      }
      
      try {
        this.rl.question(question, resolve);
      } catch (error) {
        console.log('\n⚠️ Readline error, using default response.');
        resolve('');
      }
    });
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
      
      console.log(`\n🌍 i18ntk - Enterprise i18n Management Toolkit`);
      console.log(`📦 Version: ${packageJson.version}`);
      console.log(`📅 Release Date: ${versionInfo.releaseDate || 'N/A'}`);
      console.log(`👤 Maintainer: ${versionInfo.maintainer || packageJson.author}`);
      console.log(`🔧 Node.js: ${versionInfo.supportedNodeVersions || packageJson.engines?.node || '>=16.0.0'}`);
      console.log(`📄 License: ${packageJson.license}`);
      
      if (versionInfo.majorChanges && versionInfo.majorChanges.length > 0) {
        console.log(`\n✨ What's New in v${packageJson.version}:`);
        versionInfo.majorChanges.forEach(change => {
          console.log(`   ${change}`);
        });
      }
      
      console.log(`\n📚 Documentation: ${packageJson.homepage || 'https://github.com/vladnoskv/i18n-management-toolkit#readme'}`);
      console.log(`🐛 Issues: ${packageJson.bugs?.url || 'https://github.com/vladnoskv/i18n-management-toolkit/issues'}`)
      
    } catch (error) {
      console.log(`\ni18ntk version information unavailable`);
      console.log(`Error: ${error.message}`);
    }
    process.exit(0);
  }
  
  const manager = new I18nManager();
  manager.run();
}

module.exports = I18nManager;