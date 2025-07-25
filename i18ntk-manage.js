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
const uiI18n = require('./ui-i18n');
const SecurityUtils = require('./utils/security');
const AdminCLI = require('./utils/admin-cli');
const settingsManager = require('./settings-manager');
const I18nInitializer = require('./i18ntk-init');
const I18nAnalyzer = require('./i18ntk-analyze');
const I18nValidator = require('./i18ntk-validate');
const I18nUsageAnalyzer = require('./i18ntk-usage');
const I18nSizingAnalyzer = require('./i18ntk-sizing');
const SettingsCLI = require('./settings-cli');
const I18nDebugger = require('./dev/debug/debugger');

// Enhanced default configuration with multiple path detection
const DEFAULT_CONFIG = {
  sourceDir: './locales',
  sourceLanguage: 'en',
  defaultLanguages: ['de', 'es', 'fr', 'ru'],
  outputDir: './i18n-reports',
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
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
      historySize: 0
    });
    // Make readline interface globally available
    global.activeReadlineInterface = this.rl;
    this.isAuthenticated = false;
    this.settingsManager = settingsManager;
    
    // Auto-detect i18n directory on initialization
    this.detectI18nDirectory();
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
            console.log(`🔍 Auto-detected i18n directory: ${possiblePath}`);
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
      console.log('⚠️  No package.json found. This toolkit works independently but is recommended to be used with i18n frameworks.');
      return false;
    }
    
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
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
        console.log('💡 No i18n framework detected. Consider installing one of:');
        console.log('   - react-i18next (for React)');
        console.log('   - vue-i18n (for Vue)');
        console.log('   - i18next (universal)');
        console.log('   - @nuxtjs/i18n (for Nuxt)');
        console.log('   - svelte-i18n (for Svelte)');
        return false;
      }
    } catch (error) {
      console.log('⚠️  Could not read package.json');
      return false;
    }
  }

  // Add this run method after the checkI18nDependencies method
  async run() {
    try {
      console.log('🎛️  I18N Management Toolkit');
      console.log('=' .repeat(40));
      
      // Check dependencies
      await this.checkI18nDependencies();
      
      // Parse command line arguments
      const args = process.argv.slice(2);
      
      if (args.includes('--help') || args.includes('-h')) {
        this.showHelp();
        return;
      }
      
      // Handle direct commands
      const commandArg = args.find(arg => arg.startsWith('--command='));
      if (commandArg) {
        const command = commandArg.split('=')[1];
        await this.executeCommand(command);
        return;
      }
      
      // Interactive mode
      await this.showInteractiveMenu();
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    } finally {
      if (this.rl) {
        this.rl.close();
      }
    }
  }

  showHelp() {
    console.log('\nUsage:');
    console.log('  npm run i18ntk:manage                    # Interactive mode');
    console.log('  npm run i18ntk:manage -- --command=init  # Initialize project');
    console.log('  npm run i18ntk:manage -- --command=analyze # Analyze translations');
    console.log('  npm run i18ntk:manage -- --command=validate # Validate translations');
    console.log('  npm run i18ntk:manage -- --command=usage # Check usage');
    console.log('  npm run i18ntk:manage -- --help          # Show this help');
    console.log('\nAvailable Commands:');
    console.log('  init      - Initialize i18n structure');
    console.log('  analyze   - Analyze translation completeness');
    console.log('  validate  - Validate translation files');
    console.log('  usage     - Check translation key usage');
    console.log('  sizing    - Analyze translation sizing');
    console.log('  complete  - Complete missing translations');
    console.log('  summary   - Generate summary report');
    console.log('  debug     - Run debug analysis');
  }

  async executeCommand(command) {
    console.log(`🔄 Executing command: ${command}`);
    
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
      case 'debug':
        const debuggerTool = new I18nDebugger();
        await debuggerTool.run();
        break;
      default:
        console.log(`❌ Unknown command: ${command}`);
        this.showHelp();
    }
  }

  async showInteractiveMenu() {
    console.log('\n📋 Available Operations:');
    console.log('1. Initialize i18n structure');
    console.log('2. Analyze translations');
    console.log('3. Validate translations');
    console.log('4. Check usage');
    console.log('5. Analyze sizing');
    console.log('6. Complete translations');
    console.log('7. Generate summary');
    console.log('8. Debug analysis');
    console.log('9. Settings');
    console.log('0. Exit');
    
    const choice = await this.prompt('\nSelect an option (0-9): ');
    
    switch (choice.trim()) {
      case '1':
        await this.executeCommand('init');
        break;
      case '2':
        await this.executeCommand('analyze');
        break;
      case '3':
        await this.executeCommand('validate');
        break;
      case '4':
        await this.executeCommand('usage');
        break;
      case '5':
        await this.executeCommand('sizing');
        break;
      case '6':
        const completeTool = require('./i18ntk-complete');
        const tool = new completeTool();
        await tool.run();
        break;
      case '7':
        const summaryTool = require('./i18ntk-summary');
        const summary = new summaryTool();
        await summary.run();
        break;
      case '8':
        await this.executeCommand('debug');
        break;
      case '9':
        const settingsCLI = new SettingsCLI();
        await settingsCLI.run();
        break;
      case '0':
        console.log('👋 Goodbye!');
        return;
      default:
        console.log('❌ Invalid option. Please try again.');
        await this.showInteractiveMenu();
    }
  }

  prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }
}

// Run if called directly
if (require.main === module) {
  const manager = new I18nManager();
  manager.run();
}

module.exports = I18nManager;