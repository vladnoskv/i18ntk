#!/usr/bin/env node
/**
 * I18NTK TRANSLATION COMPLETION SCRIPT
 * 
 * This script automatically adds missing translation keys to achieve 100% coverage.
 * It reads the usage analysis and adds all missing keys with proper markers.
 * 
 * Usage:
 *   node i18ntk-complete.js
 *   node i18ntk-complete.js --auto-translate
 *   node i18ntk-complete.js --source-dir=./src/i18n/locales
 */

const fs = require('fs');
const path = require('path');
const SecurityUtils = require('../utils/security');
const { getUnifiedConfig, parseCommonArgs, displayHelp } = require('../utils/config-helper');
const { loadTranslations, t } = require('../utils/i18n-helper');
const { getGlobalReadline, closeGlobalReadline } = require('../utils/cli');
const SetupEnforcer = require('../utils/setup-enforcer');

// Ensure setup is complete before running
SetupEnforcer.checkSetupComplete();

loadTranslations(process.env.I18NTK_LANG);



class I18nCompletionTool {
  constructor(config = {}) {
    this.config = config;
    this.sourceDir = null;
    this.sourceLanguageDir = null;
    this.rl = null;
    
    // Initialize UI i18n for console messages
    const UIi18n = require('./i18ntk-ui');
    // Using shared t() helper from i18n-helper instead of UIi18n for translations
    // Using shared t() helper from i18n-helper
  }
  
  async initialize() {
    try {
      const args = this.parseArgs();
      if (args.help) {
        displayHelp('i18ntk-complete', {
          'auto-translate': 'Enable automatic translation suggestions',
          'dry-run': 'Preview changes without applying them'
        });
        process.exit(0);
      }
      
      const baseConfig = await getUnifiedConfig('complete', args);
      this.config = { ...baseConfig, ...(this.config || {}) };
      this.sourceDir = this.config.sourceDir;
      this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
      
      // Validate source directory exists
      const { validateSourceDir } = require('../utils/config-helper');
      validateSourceDir(this.sourceDir, 'i18ntk-complete');
      
      SecurityUtils.logSecurityEvent(t('complete.configLoadedSuccessfully'), 'info');
    } catch (error) {
      SecurityUtils.logSecurityEvent(t('complete.configLoadingFailed'), 'error', { error: error.message });
      throw error;
    }
  }

  // Initialize readline interface
  initReadline() {
    return getGlobalReadline();
  }

  // Prompt for user input
  async prompt(question) {
    const rl = getGlobalReadline();
    return new Promise(resolve => rl.question(question, resolve));
  }

  // Close readline interface
  closeReadline() {
    closeGlobalReadline();
  }

  // Parse command line arguments
  parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};
    
    args.forEach(arg => {
      if (arg.startsWith('--')) {
        const [key, value] = arg.substring(2).split('=');
        if (key === 'source-dir') {
          parsed.sourceDir = value;
        } else if (key === 'source-language') {
          parsed.sourceLanguage = value;
        } else if (key === 'auto-translate') {
          parsed.autoTranslate = true;
        } else if (key === 'dry-run') {
          parsed.dryRun = true;
        } else if (key === 'no-prompt') {
          parsed.noPrompt = true;
        }
      }
    });
    
    return parsed;
  }

  // Get all available languages
  getAvailableLanguages() {
    if (!fs.existsSync(this.sourceDir)) {
      throw new Error(`Source directory not found: ${this.sourceDir}`);
    }
    
    // Check for monolith JSON files (en.json, es.json, etc.)
    const files = fs.readdirSync(this.sourceDir);
    const languages = files
      .filter(file => file.endsWith('.json'))
      .map(file => path.basename(file, '.json'));
    
    // Also check for directory-based structure for backward compatibility
    const directories = fs.readdirSync(this.sourceDir)
      .filter(item => {
        const itemPath = path.join(this.sourceDir, item);
        return fs.statSync(itemPath).isDirectory();
      });
    
    return [...new Set([...languages, ...directories])];
  }

  // Get all JSON files from a language directory
  getLanguageFiles(language) {
    const languageDir = path.join(this.sourceDir, language);
    
    if (!fs.existsSync(languageDir)) {
      return [];
    }
    
    return fs.readdirSync(languageDir)
      .filter(file => {
        return file.endsWith('.json') && 
               !this.config.excludeFiles.includes(file);
      });
  }

  // Parse key path and determine which file it belongs to
  parseKeyPath(keyPath) {
    // Handle namespace:key format (e.g., "reportGenerator:reportTypes.prospects")
    if (keyPath.includes(':')) {
      const [namespace, key] = keyPath.split(':', 2);
      return {
        file: `${namespace}.json`,
        key: key
      };
    }
    
    // Handle dot notation (e.g., "pagination.showing")
    const keyPathStr = String(keyPath || '');
    const parts = keyPathStr.split('.');
    if (parts.length > 1) {
      return {
        file: `${parts[0]}.json`,
        key: parts.slice(1).join('.')
      };
    }
    
    // Default to common.json for simple keys
    return {
      file: 'common.json',
      key: keyPath
    };
  }

  // Check if nested key exists in object
  hasNestedKey(obj, keyPath) {
    const keyPathStr = String(keyPath || '');
    const keys = keyPathStr.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (!current || typeof current !== 'object' || !(key in current)) {
        return false;
      }
      current = current[key];
    }
    
    return true;
  }

  // Set nested value in object
  setNestedValue(obj, keyPath, value) {
    const keyPathStr = String(keyPath || '');
    const keys = keyPathStr.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  // Add missing keys to a language
  addMissingKeysToLanguage(language, missingKeys, dryRun = false) {
    const languageDir = path.join(this.sourceDir, language);
    const changes = [];
    
    // Group keys by file
    const keysByFile = {};
    
    missingKeys.forEach(keyPath => {
      const { file, key } = this.parseKeyPath(keyPath);
      if (!keysByFile[file]) {
        keysByFile[file] = [];
      }
      keysByFile[file].push({ keyPath, key });
    });
    
    // Process each file
    for (const [fileName, keys] of Object.entries(keysByFile)) {
      const filePath = path.join(languageDir, fileName);
      let fileContent = {};
      
      // Load existing file or create new
      if (fs.existsSync(filePath)) {
        try {
          fileContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
          console.warn(t("completeTranslations.warning_could_not_parse_filepa", { filePath })); ;
          fileContent = {};
        }
      } else {
        // Create directory if it doesn't exist
        if (!fs.existsSync(languageDir)) {
          if (!dryRun) {
            fs.mkdirSync(languageDir, { recursive: true });
          }
        }
      }
      
      // Add missing keys
      let fileChanged = false;
      keys.forEach(({ keyPath, key }) => {
        // Check if key already exists
        if (!this.hasNestedKey(fileContent, key)) {
          const value = this.generateTranslationValue(keyPath, language);
          
          this.setNestedValue(fileContent, key, value);
          fileChanged = true;
          
          changes.push({
            file: fileName,
            key: keyPath,
            value,
            action: 'added'
          });
        }
      });
      
      // Save file
      if (fileChanged && !dryRun) {
        fs.writeFileSync(filePath, JSON.stringify(fileContent, null, 2), 'utf8');
      }
    }
    
    return changes;
  }

  // Generate appropriate translation value based on key and language
  generateTranslationValue(keyPath, language) {
    // Generate value from key path for source language
    const baseValue = this.generateValueFromKey(keyPath);
    
    // For source language, use the generated value
    if (language === this.config.sourceLanguage) {
      return baseValue;
    }
    
    // For other languages, use the not translated marker
    return this.config.notTranslatedMarker || 'NOT_TRANSLATED';
  }

  // Generate a readable value from a key path
  generateValueFromKey(keyPath) {
    // Extract the last part of the key (after dots and colons)
    const keyPathStr = String(keyPath || '');
    const keyName = keyPathStr.split('.').pop().split(':').pop();
    
    // Convert camelCase to readable text
    const readable = keyName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
    
    // Never return the namespace prefix as the value
    return readable || keyName;
  }

  // Get all keys from a nested object with full paths
  getAllKeys(obj, prefix = '') {
    const keys = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys.push(...this.getAllKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    
    return keys;
  }

  // Get missing keys by comparing source language with target languages
  getMissingKeysFromComparison() {
    const sourceFiles = this.getLanguageFiles(this.config.sourceLanguage);
    const missingKeys = [];
    
    if (!fs.existsSync(this.sourceLanguageDir)) {
      console.log(t("complete.sourceLanguageNotFound", { sourceLanguage: this.config.sourceLanguage }));
      return [];
    }
    
    // Process each file in source language
    for (const fileName of sourceFiles) {
      const sourceFilePath = path.join(this.sourceLanguageDir, fileName);
      
      try {
        const sourceContent = JSON.parse(fs.readFileSync(sourceFilePath, 'utf8'));
        const sourceKeys = this.getAllKeys(sourceContent);
        
        // Check all other languages
        const languages = this.getAvailableLanguages();
        for (const language of languages) {
          if (language === this.config.sourceLanguage) continue;
          
          const targetFilePath = path.join(this.sourceDir, language, fileName);
          let targetKeys = [];
          
          if (fs.existsSync(targetFilePath)) {
            try {
              const targetContent = JSON.parse(fs.readFileSync(targetFilePath, 'utf8'));
              targetKeys = this.getAllKeys(targetContent);
            } catch (error) {
              console.warn(t("complete.couldNotParseTarget", { file: targetFilePath }));
            }
          }
          
          // Find keys missing in target language
          const missingInTarget = sourceKeys.filter(key => !targetKeys.includes(key));
          missingKeys.push(...missingInTarget);
        }
      } catch (error) {
        console.warn(t("complete.couldNotParseSource", { file: sourceFilePath }));
      }
    }
    
    // Remove duplicates
    const uniqueMissingKeys = [...new Set(missingKeys)];
    console.log(t("complete.foundMissingKeys", { count: uniqueMissingKeys.length }));
    return uniqueMissingKeys;
  }

  // Generate completion report
  async generateReport(changes, languages) {
    const projectRoot = this.config.projectRoot || process.cwd();
    const reportsDir = path.join(projectRoot, 'i18ntk-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportsDir, `completion-report-${timestamp}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      sourceLanguage: this.config.sourceLanguage,
      sourceDir: this.sourceDir,
      languagesProcessed: languages.length,
      totalChanges: changes.reduce((sum, lang) => sum + lang.changes.length, 0),
      languages: changes.map(lang => ({
        language: lang.language,
        changes: lang.changes.length,
        files: lang.changes.reduce((acc, change) => {
          if (!acc[change.file]) acc[change.file] = [];
          acc[change.file].push({
            key: change.key,
            value: change.value,
            action: change.action
          });
          return acc;
        }, {})
      }))
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(t("complete.reportGenerated", { path: reportPath }));
    return reportPath;
  }

  // Run the completion process
  async run(options = {}) {
    const { fromMenu = false } = options;
    
    SecurityUtils.logSecurityEvent('I18n completion tool started', 'info', { 
      version: this.config.version,
      nodeVersion: process.version,
      platform: process.platform
    });
    
    const args = this.parseArgs();
    
    // Skip admin authentication when called from menu
    if (!fromMenu) {
      // Check admin authentication for sensitive operations (only when called directly and not in no-prompt mode)
      const AdminAuth = require('../utils/admin-auth');
      const adminAuth = new AdminAuth();
      await adminAuth.initialize();
      
      const isCalledDirectly = require.main === module;
      const isRequired = await adminAuth.isAuthRequired();
      if (isRequired && isCalledDirectly && !args.noPrompt) {
        console.log('\n' + t('adminCli.authRequiredForOperation', { operation: 'complete translations' }));
        
        const cliHelper = require('../utils/cli-helper');
        const pin = await cliHelper.promptPin(t('adminCli.enterPin'));
        const isValid = await this.adminAuth.verifyPin(pin);
        
        if (!isValid) {
          console.log(t('adminCli.invalidPin'));
          if (!fromMenu) process.exit(1);
          return { success: false, error: 'Authentication failed' };
        }
        
        console.log(t('adminCli.authenticationSuccess'));
      }
    }
    
    // Initialize configuration properly when called from menu
    if (fromMenu && !this.sourceDir) {
      const baseConfig = await getUnifiedConfig('complete', args);
      this.config = { ...baseConfig, ...(this.config || {}) };
      
      const uiLanguage = (this.config && this.config.uiLanguage) || 'en';
      loadTranslations(uiLanguage, path.resolve(__dirname, '..', 'ui-locales'));this.sourceDir = this.config.sourceDir;
      this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
    } else {
      await this.initialize();
      
      if (args.sourceDir) {
        this.config.sourceDir = args.sourceDir;
        this.sourceDir = path.resolve(this.config.sourceDir);
      }
      
      if (args.sourceLanguage) {
        this.config.sourceLanguage = args.sourceLanguage;
      }
      
      this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
    }
    
    console.log(t("complete.title"));
    console.log(t("complete.separator"));
    console.log(t("complete.sourceDir", { sourceDir: this.sourceDir }));
    console.log(t("complete.sourceLanguage", { sourceLanguage: this.config.sourceLanguage }));
    
    if (args.dryRun) {
      console.log(t("complete.dryRunMode"));
    }
    
    try {
      // Get available languages
      const languages = this.getAvailableLanguages();
      console.log(t("complete.languages", { languages: languages.join(', ') }));
      
      // Get missing keys by comparing source language with others
      const missingKeys = this.getMissingKeysFromComparison();
      console.log(t("complete.addingMissingKeys"));
      
      let totalChanges = 0;
      
      // Process all languages except source language
      const targetLanguages = languages.filter(lang => lang !== this.config.sourceLanguage);
      const allChanges = [];
      for (const language of targetLanguages) {
        console.log(t("complete.processing", { language }));
        
        const changes = this.addMissingKeysToLanguage(language, missingKeys, args.dryRun);
        
        if (changes.length > 0) {
          console.log(t("complete.addedKeys", { count: changes.length }));
          totalChanges += changes.length;
          allChanges.push({ language, changes });
          
          // Show sample of changes
          const sampleChanges = changes.slice(0, 3);
          sampleChanges.forEach(change => {
            console.log(t("usage.complete.changeDetails", { file: change.file, key: change.key }));
          });
          
          if (changes.length > 3) {
            console.log(t("usage.complete.andMore", { count: changes.length - 3 }));
          }
        } else {
          console.log(t("usage.complete.noChangesNeeded", { language }));
        }
      }
      
      console.log('\n');
      console.log(t("complete.summaryTitle"));
      console.log(t("complete.separator"));
      console.log(t("complete.totalChanges", { totalChanges }));
      console.log(t("complete.languagesProcessed", { languagesProcessed: languages.length }));
      console.log(t("complete.missingKeysAdded", { missingKeysAdded: missingKeys.length }));
      
      if (!args.dryRun && allChanges.length > 0) {
        const rl = this.rl || this.initReadline();
        const answer = await this.prompt('\n' + t('complete.generateReportPrompt') + ' (Y/N): ');
        
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          await this.generateReport(allChanges, languages);
        }
      }
      
      if (!args.dryRun) {
        console.log('\n' + t("complete.nextStepsTitle"));
        console.log(t("complete.separator"));
        console.log(t("complete.nextStep1"));
        console.log('   node i18ntk-usage.js --output-report');
        console.log(t("complete.nextStep2"));
        console.log('   node i18ntk-validate.js');
        console.log(t("complete.nextStep3"));
        console.log('   node i18ntk-analyze.js');
        console.log('\n' + t("complete.allKeysAvailable"));
      } else {
        console.log('\n' + t("complete.runWithoutDryRun"));
      }
      
      // Only prompt when run from the menu (i.e., when a callback or menu context is present)
      if (typeof this.prompt === "function" && args.fromMenu) {
        console.log(t('common.completed'));
        await this.prompt(t('pressEnterToContinue'));
      }
      
    } catch (error) {
      console.error(t('complete.errorDuringCompletion', { error: error.message }));
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const tool = new I18nCompletionTool();
  tool.run().then(() => {
    const { closeGlobalReadline } = require('../utils/cli');
    closeGlobalReadline();
    process.exit(0);
  }).catch(error => {
    const UIi18n = require('./i18ntk-ui');
    console.error(t('complete.errorDuringCompletion', { error: error.message }));
    SecurityUtils.logSecurityEvent('I18n completion tool failed', 'error', { error: error.message });
    const { closeGlobalReadline } = require('../utils/cli');
    closeGlobalReadline();
    process.exit(1);
  });
}

module.exports = I18nCompletionTool;