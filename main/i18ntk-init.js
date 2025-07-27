#!/usr/bin/env node
/**
 * I18N INITIALIZATION SCRIPT
 * 
 * This script initializes a new i18n project or adds new languages to an existing one.
 * It uses the English (en) locale as the source of truth and generates translation files
 * for specified languages with proper structure and __NOT_TRANSLATED__ markers.
 * 
 * Usage:
 *   node scripts/i18n/01-init-i18n.js
 *   node scripts/i18n/01-init-i18n.js --languages=de,es,fr,ru
 *   node scripts/i18n/01-init-i18n.js --source-dir=./src/i18n/locales --target-languages=de,es
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const settingsManager = require('../settings/settings-manager');
const SecurityUtils = require('../utils/security');
const AdminAuth = require('../utils/admin-auth');
const UIi18n = require('./ui-i18n');

// Get configuration from settings manager
function getConfig() {
  const settings = settingsManager.getSettings();
  return {
    sourceDir: settings.directories?.sourceDir || './locales',
    sourceLanguage: settings.directories?.sourceLanguage || 'en',
    defaultLanguages: settings.processing?.defaultLanguages || ['de', 'es', 'fr', 'ru'],
    notTranslatedMarker: settings.processing?.notTranslatedMarker || 'NOT_TRANSLATED',
    excludeFiles: settings.processing?.excludeFiles || ['.DS_Store', 'Thumbs.db'],
    uiLanguage: settings.language || 'en'
  };
}

// Language configurations with native names
const LANGUAGE_CONFIG = {
  'de': { name: 'German', nativeName: 'Deutsch' },
  'es': { name: 'Spanish', nativeName: 'Español' },
  'fr': { name: 'French', nativeName: 'Français' },
  'ru': { name: 'Russian', nativeName: 'Русский' },
  'it': { name: 'Italian', nativeName: 'Italiano' },
  'pt': { name: 'Portuguese', nativeName: 'Português' },
  'ja': { name: 'Japanese', nativeName: '日本語' },
  'ko': { name: 'Korean', nativeName: '한국어' },
  'zh': { name: 'Chinese', nativeName: '中文' },
  'ar': { name: 'Arabic', nativeName: 'العربية' },
  'hi': { name: 'Hindi', nativeName: 'हिन्दी' },
  'nl': { name: 'Dutch', nativeName: 'Nederlands' },
  'sv': { name: 'Swedish', nativeName: 'Svenska' },
  'da': { name: 'Danish', nativeName: 'Dansk' },
  'no': { name: 'Norwegian', nativeName: 'Norsk' },
  'fi': { name: 'Finnish', nativeName: 'Suomi' },
  'pl': { name: 'Polish', nativeName: 'Polski' },
  'cs': { name: 'Czech', nativeName: 'Čeština' },
  'hu': { name: 'Hungarian', nativeName: 'Magyar' },
  'tr': { name: 'Turkish', nativeName: 'Türkçe' }
};

class I18nInitializer {
  constructor(config = {}) {
        this.ui = new UIi18n();
    this.config = { ...getConfig(), ...config };
    this.sourceDir = path.resolve(this.config.sourceDir);
    this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
    
    // Use global readline interface to prevent doubling
    if (global.activeReadlineInterface) {
      this.rl = global.activeReadlineInterface;
      this.shouldCloseRL = false;
    } else {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
        historySize: 0
      });
      global.activeReadlineInterface = this.rl;
      this.shouldCloseRL = true;
    }
  }

  // Add the missing checkI18nDependencies method
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
        console.log(this.ui.t('init.detectedI18nFrameworks', { frameworks: installedFrameworks.join(', ') }));
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

  // Add the missing promptContinueWithoutI18n method
  async promptContinueWithoutI18n() {
    const answer = await this.prompt('\n' + this.ui.t('init.continueWithoutI18nPrompt'));
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
  }

  // Add the missing prompt method
  async prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  // Parse command line arguments
  parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};
    
    args.forEach(arg => {
      if (arg.startsWith('--')) {
        const [key, value] = arg.substring(2).split('=');
        if (key === 'languages' || key === 'target-languages') {
          parsed.languages = value ? value.split(',').map(l => l.trim()) : [];
        } else if (key === 'source-dir') {
          parsed.sourceDir = value;
        } else if (key === 'source-language') {
          parsed.sourceLanguage = value;
        }
      }
    });
    
    return parsed;
  }

  // Setup initial directory structure if needed
  async setupInitialStructure() {
    // Validate paths
    const validatedSourceDir = SecurityUtils.validatePath(this.sourceDir, process.cwd());
    const validatedSourceLanguageDir = SecurityUtils.validatePath(this.sourceLanguageDir, process.cwd());
    
    if (!validatedSourceDir || !validatedSourceLanguageDir) {
      SecurityUtils.logSecurityEvent('Invalid directory paths in setupInitialStructure', 'error', { sourceDir: this.sourceDir, sourceLanguageDir: this.sourceLanguageDir });
      throw new Error('Invalid directory paths detected');
    }
    
    // Create source directory if it doesn't exist
    if (!fs.existsSync(validatedSourceDir)) {
      console.log(this.ui.t('init.creatingSourceDirectory', { dir: validatedSourceDir }));
      fs.mkdirSync(validatedSourceDir, { recursive: true });
      SecurityUtils.logSecurityEvent('Source directory created', 'info', { dir: validatedSourceDir });
    }
    
    // Create source language directory if it doesn't exist
    if (!fs.existsSync(validatedSourceLanguageDir)) {
      console.log(this.ui.t('init.creatingSourceLanguageDirectory', { dir: validatedSourceLanguageDir }));
      fs.mkdirSync(validatedSourceLanguageDir, { recursive: true });
      
      // Create a sample common.json file
      const sampleTranslations = {
        "common": {
          "welcome": "Welcome",
          "hello": "Hello",
          "goodbye": "Goodbye",
          "yes": "Yes",
          "no": "No",
          "save": "Save",
          "cancel": "Cancel",
          "delete": "Delete",
          "edit": "Edit",
          "loading": "Loading..."
        },
        "navigation": {
          "home": "Home",
          "about": "About",
          "contact": "Contact",
          "settings": "Settings"
        }
      };
      
      const sampleFilePath = path.join(validatedSourceLanguageDir, 'common.json');
      const validatedSampleFilePath = SecurityUtils.validatePath(sampleFilePath, process.cwd());
      
      if (!validatedSampleFilePath) {
        SecurityUtils.logSecurityEvent('Invalid sample file path', 'error', { path: sampleFilePath });
        throw new Error('Invalid sample file path');
      }
      
      const success = await SecurityUtils.safeWriteFile(validatedSampleFilePath, JSON.stringify(sampleTranslations, null, 2), process.cwd());
      
      if (success) {
        console.log(this.ui.t('init.createdSampleTranslationFile', { file: validatedSampleFilePath }));
        SecurityUtils.logSecurityEvent('Sample translation file created', 'info', { file: validatedSampleFilePath });
      } else {
        SecurityUtils.logSecurityEvent('Failed to create sample translation file', 'error', { file: validatedSampleFilePath });
        throw new Error('Failed to create sample translation file');
      }
    }
  }
  
  // Check if source directory and language exist
  validateSource() {
    if (!fs.existsSync(this.sourceDir)) {
      throw new Error(`Source directory not found: ${this.sourceDir}`);
    }
    
    if (!fs.existsSync(this.sourceLanguageDir)) {
      throw new Error(`Source language directory not found: ${this.sourceLanguageDir}`);
    }
    
    return true;
  }

  // Get all JSON files from source language directory
  getSourceFiles() {
    const files = fs.readdirSync(this.sourceLanguageDir)
      .filter(file => {
        return file.endsWith('.json') && 
               !this.config.excludeFiles.includes(file);
      });
    
    if (files.length === 0) {
      throw new Error(`No JSON files found in source directory: ${this.sourceLanguageDir}`);
    }
    
    return files;
  }

  // Recursively mark all string values as not translated
  markAsNotTranslated(obj) {
    if (typeof obj === 'string') {
      return this.config.notTranslatedMarker;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.markAsNotTranslated(item));
    }
    
    if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.markAsNotTranslated(value);
      }
      return result;
    }
    
    return obj;
  }

  // Create or update a language file securely
  async createLanguageFile(sourceFile, targetLanguage, sourceContent) {
    const targetDir = path.join(this.sourceDir, targetLanguage);
    const targetFile = path.join(targetDir, sourceFile);
    
    // Validate paths
    const validatedTargetDir = SecurityUtils.validatePath(targetDir, this.sourceDir);
    const validatedTargetFile = SecurityUtils.validatePath(targetFile, this.sourceDir);
    
    if (!validatedTargetDir || !validatedTargetFile) {
      SecurityUtils.logSecurityEvent('Invalid path detected in createLanguageFile', 'error', { targetDir, targetFile });
      throw new Error('Invalid file path detected');
    }
    
    // Create target directory if it doesn't exist
    if (!fs.existsSync(validatedTargetDir)) {
      fs.mkdirSync(validatedTargetDir, { recursive: true });
    }
    
    let targetContent;
    
    // If target file exists, preserve existing translations
    if (fs.existsSync(validatedTargetFile)) {
      try {
        const existingContent = await SecurityUtils.safeReadFile(validatedTargetFile, this.sourceDir);
        if (existingContent) {
          targetContent = this.mergeTranslations(sourceContent, JSON.parse(existingContent));
        } else {
          targetContent = this.markAsNotTranslated(sourceContent);
        }
      } catch (error) {
        console.warn(`⚠️  Warning: Could not parse existing file ${validatedTargetFile}, creating new one`);
        SecurityUtils.logSecurityEvent('File parse error', 'warn', { file: validatedTargetFile, error: error.message });
        targetContent = this.markAsNotTranslated(sourceContent);
      }
    } else {
      targetContent = this.markAsNotTranslated(sourceContent);
    }
    
    // Write the file securely
    const success = await SecurityUtils.safeWriteFile(validatedTargetFile, JSON.stringify(targetContent, null, 2), this.sourceDir);
    
    if (!success) {
      SecurityUtils.logSecurityEvent('Failed to write language file', 'error', { file: validatedTargetFile });
      throw new Error(`Failed to write file: ${validatedTargetFile}`);
    }
    
    SecurityUtils.logSecurityEvent('Language file created/updated', 'info', { file: validatedTargetFile, language: targetLanguage });
    return validatedTargetFile;
  }

  // Merge existing translations with new structure
  mergeTranslations(sourceObj, existingObj) {
    if (typeof sourceObj === 'string') {
      // If existing translation exists and is not the marker, keep it
      if (typeof existingObj === 'string' && 
          existingObj !== this.config.notTranslatedMarker && 
          existingObj.trim() !== '') {
        return existingObj;
      }
      return this.config.notTranslatedMarker;
    }
    
    if (Array.isArray(sourceObj)) {
      return sourceObj.map((item, index) => {
        const existingItem = Array.isArray(existingObj) ? existingObj[index] : undefined;
        return this.mergeTranslations(item, existingItem);
      });
    }
    
    if (sourceObj && typeof sourceObj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(sourceObj)) {
        const existingValue = existingObj && typeof existingObj === 'object' ? existingObj[key] : undefined;
        result[key] = this.mergeTranslations(value, existingValue);
      }
      return result;
    }
    
    return sourceObj;
  }

  // Get translation statistics
  getTranslationStats(obj) {
    let total = 0;
    let translated = 0;
    
    const count = (item) => {
      if (typeof item === 'string') {
        total++;
        if (item !== this.config.notTranslatedMarker && item.trim() !== '') {
          translated++;
        }
      } else if (Array.isArray(item)) {
        item.forEach(count);
      } else if (item && typeof item === 'object') {
        Object.values(item).forEach(count);
      }
    };
    
    count(obj);
    
    return {
      total,
      translated,
      percentage: total > 0 ? Math.round((translated / total) * 100) : 0,
      missing: total - translated
    };
  }

  // Interactive admin PIN setup
  async promptAdminPinSetup() {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
      historySize: 0
    });
    
    const question = (query) => new Promise(resolve => rl.question(query, resolve));
    
    console.log('\n' + this.ui.t('init.adminPinSetupOptional'));
    console.log(this.ui.t('init.adminPinSeparator'));
    console.log(this.ui.t('init.adminPinDescription1'));
    console.log(this.ui.t('init.adminPinDescription2'));
    console.log(this.ui.t('init.adminPinDescription3'));
    console.log(this.ui.t('init.adminPinDescription4'));
    
    const setupPin = await question('\n' + this.ui.t('init.adminPinSetupPrompt'));
    
    if (setupPin.toLowerCase() === 'y' || setupPin.toLowerCase() === 'yes') {
      try {
        const adminAuth = new AdminAuth();
        
        // Enable admin PIN in settings
        settingsManager.setSecurity({ adminPinEnabled: true, adminPinPromptOnInit: true });
        
        console.log('\n' + this.ui.t('init.settingUpAdminPin'));
        
        let pin1, pin2;
        do {
          pin1 = await question(this.ui.t('init.enterAdminPin'));
          
          if (!/^\d{4,8}$/.test(pin1)) {
            console.log(this.ui.t('init.pinMustBe4To8Digits'));
            continue;
          }
          
          pin2 = await question(this.ui.t('init.confirmAdminPin'));
          
          if (pin1 !== pin2) {
            console.log(this.ui.t('init.pinsDoNotMatch'));
          }
        } while (pin1 !== pin2 || !/^\d{4,8}$/.test(pin1));
        
        await adminAuth.setupPin(pin1);
        console.log(this.ui.t('init.adminPinSetupSuccess'));
        console.log(this.ui.t('init.adminProtectionEnabled'));
        
      } catch (error) {
        console.error(this.ui.t('init.errorSettingUpAdminPin', { error: error.message }));
        console.log(this.ui.t('init.continuingWithoutAdminPin'));
      }
    } else {
      console.log(this.ui.t('init.skippingAdminPinSetup'));
    }
    
    rl.close();
  }

  // Interactive language selection
  async selectLanguages() {
    // Use the global readline interface if available, otherwise create one
    let rl = this.rl;
    let shouldClose = false;
    
    if (!rl) {
      const readline = require('readline');
      rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
        historySize: 0
      });
      shouldClose = true;
    }
    
    const question = (query) => new Promise(resolve => rl.question(query, resolve));
    
    console.log('\n' + this.ui.t('init.languageSelectionTitle'));
    console.log('=' .repeat(50));
    console.log(this.ui.t('language.available'));
    
    Object.entries(LANGUAGE_CONFIG).forEach(([code, config], index) => {
      console.log(`  ${(index + 1).toString().padStart(2)}. ${code} - ${config.name} (${config.nativeName})`);
    });
    
    console.log('\n' + this.ui.t('init.defaultLanguages', { languages: this.config.defaultLanguages.join(', ') }));
    
    const answer = await question('\n' + this.ui.t('init.enterLanguageCodes'));
    
    // Only close if we created our own readline interface
    if (shouldClose) {
      rl.close();
    }
    
    if (answer.trim() === '') {
      return this.config.defaultLanguages;
    }
    
    const selectedLanguages = answer.split(',').map(lang => lang.trim().toLowerCase());
    const validLanguages = selectedLanguages.filter(lang => LANGUAGE_CONFIG[lang]);
    const invalidLanguages = selectedLanguages.filter(lang => !LANGUAGE_CONFIG[lang]);
    
    if (invalidLanguages.length > 0) {
      console.warn(this.ui.t('init.warningInvalidLanguageCodes', { languages: invalidLanguages.join(', ') }));
    }
    
    return validLanguages.length > 0 ? validLanguages : this.config.defaultLanguages;
  }

  // Main initialization process
  async init() {
    try {
      console.log(this.ui.t('init.initializationTitle'));
      console.log('=' .repeat(50));
      
      // Parse command line arguments
      const args = this.parseArgs();
      if (args.sourceDir) this.config.sourceDir = args.sourceDir;
      if (args.sourceLanguage) this.config.sourceLanguage = args.sourceLanguage;
      
      // Update paths
      this.sourceDir = path.resolve(this.config.sourceDir);
      this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
      
      console.log(this.ui.t('init.sourceDirectoryLabel', { dir: this.sourceDir }));
      console.log(this.ui.t('init.sourceLanguageLabel', { language: this.config.sourceLanguage }));
      
      // Check i18n dependencies first and exit if user chooses not to continue
      const hasI18n = await this.checkI18nDependencies();
      
      if (!hasI18n) {
        console.log(this.ui.t('init.errors.noFramework'));
        console.log(this.ui.t('init.suggestions.installFramework'));
        if (this.shouldCloseRL) {
          this.rl.close();
          global.activeReadlineInterface = null;
        }
        process.exit(0);
      }
      
      // Call the enhanced initialize method with args
      await this.initialize(hasI18n, args);
      
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      throw error;
    } finally {
      if (this.shouldCloseRL && this.rl) {
        this.rl.close();
        global.activeReadlineInterface = null;
      }
    }
  }

  // Enhanced initialization with dependency checking
  async initialize(hasI18n = true, args = {}) {
    console.log(this.ui.t('init.initializingProject'));
    
    if (!hasI18n) {
      console.log(this.ui.t('init.warningProceedingWithoutFramework'));
      console.log(this.ui.t('init.translationFilesCreatedWarning'));
    }
    
    // Continue with existing initialization logic
    await this.setupInitialStructure();
    
    // Validate source
    this.validateSource();
    
    // Prompt for admin PIN setup if not already configured
    const securitySettings = settingsManager.getSecurity();
    
    if (!securitySettings.adminPinEnabled && securitySettings.adminPinPromptOnInit !== false) {
      await this.promptAdminPinSetup();
    }
    
    // Get target languages - use args.languages if provided
    const targetLanguages = args.languages || await this.selectLanguages();
    
    if (targetLanguages.length === 0) {
      console.log(this.ui.t('init.noTargetLanguagesSpecified'));
      return;
    }
    
    console.log('\n' + this.ui.t('init.targetLanguages', { languages: targetLanguages.map(lang => `${lang} (${LANGUAGE_CONFIG[lang]?.name || 'Unknown'})`).join(', ') }));
    
    // Get source files
    const sourceFiles = this.getSourceFiles();
    console.log('\n' + this.ui.t('init.foundSourceFiles', { count: sourceFiles.length, files: sourceFiles.join(', ') }));
    
    // Process each language
    const results = {};
    
    for (const targetLanguage of targetLanguages) {
      console.log('\n' + this.ui.t('init.processingLanguage', { language: targetLanguage, name: LANGUAGE_CONFIG[targetLanguage]?.name || 'Unknown' }));
      
      const languageResults = {
        files: [],
        totalStats: { total: 0, translated: 0, missing: 0 }
      };
      
      for (const sourceFile of sourceFiles) {
        const sourceFilePath = path.join(this.sourceLanguageDir, sourceFile);
        const validatedSourceFilePath = SecurityUtils.validatePath(sourceFilePath, process.cwd());
        
        if (!validatedSourceFilePath) {
          SecurityUtils.logSecurityEvent('Invalid source file path', 'error', { path: sourceFilePath });
          continue;
        }
        
        const sourceContentRaw = await SecurityUtils.safeReadFile(validatedSourceFilePath, process.cwd());
        if (!sourceContentRaw) {
          SecurityUtils.logSecurityEvent('Failed to read source file', 'error', { file: validatedSourceFilePath });
          continue;
        }
        
        const sourceContent = JSON.parse(sourceContentRaw);
        
        const targetFilePath = await this.createLanguageFile(sourceFile, targetLanguage, sourceContent);
        
        // Get stats for this file
        const targetContentRaw = await SecurityUtils.safeReadFile(targetFilePath, process.cwd());
        if (!targetContentRaw) {
          SecurityUtils.logSecurityEvent('Failed to read target file for stats', 'error', { file: targetFilePath });
          continue;
        }
        
        const targetContent = JSON.parse(targetContentRaw);
        const stats = this.getTranslationStats(targetContent);
        
        languageResults.files.push({
          name: sourceFile,
          path: targetFilePath,
          stats
        });
        
        // Add to total stats
        languageResults.totalStats.total += stats.total;
        languageResults.totalStats.translated += stats.translated;
        languageResults.totalStats.missing += stats.missing;
        
        console.log(this.ui.t('init.fileProcessingResult', { file: sourceFile, translated: stats.translated, total: stats.total, percentage: stats.percentage }));
      }
      
      // Calculate overall percentage
      languageResults.totalStats.percentage = languageResults.totalStats.total > 0 
        ? Math.round((languageResults.totalStats.translated / languageResults.totalStats.total) * 100) 
        : 0;
      
      results[targetLanguage] = languageResults;
      
      console.log(this.ui.t('init.overallProgress', { translated: languageResults.totalStats.translated, total: languageResults.totalStats.total, percentage: languageResults.totalStats.percentage }));
    }
    
    // Summary report
    console.log('\n' + '=' .repeat(50));
    console.log(this.ui.t('init.initializationSummaryTitle'));
    console.log('=' .repeat(50));
    
    Object.entries(results).forEach(([lang, data]) => {
      const langName = LANGUAGE_CONFIG[lang]?.name || 'Unknown';
      const statusIcon = data.totalStats.percentage === 100 ? '✅' : data.totalStats.percentage >= 80 ? '🟡' : '🔴';
      
      console.log(this.ui.t('init.languageSummary', { icon: statusIcon, name: langName, code: lang, percentage: data.totalStats.percentage }));
      console.log(this.ui.t('init.languageFiles', { count: data.files.length }));
      console.log(this.ui.t('init.languageKeys', { translated: data.totalStats.translated, total: data.totalStats.total }));
      console.log(this.ui.t('init.languageMissing', { count: data.totalStats.missing }));
    });
    
    console.log('\n' + this.ui.t('init.initializationCompletedSuccessfully'));
    console.log('\n' + this.ui.t('init.nextStepsTitle'));
    console.log(this.ui.t('init.nextStep1'));
    console.log(this.ui.t('init.nextStep2'));
    console.log(this.ui.t('init.nextStep3'));
  }

  // Add run method for compatibility with manager
  async run() {
    return await this.init();
  }
}

module.exports = I18nInitializer;

// Run if called directly
if (require.main === module) {
    const initializer = new I18nInitializer();
    initializer.init().catch(error => {
        console.error('❌ Initialization failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    });
}
