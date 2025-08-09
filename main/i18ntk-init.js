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
const configManager = require('../utils/config-manager');
const SecurityUtils = require('../utils/security');
const AdminAuth = require('../utils/admin-auth');
const UIi18n = require('./i18ntk-ui');
const { loadTranslations, t } = require('../utils/i18n-helper');
loadTranslations(process.env.I18NTK_LANG || 'en');
const { getUnifiedConfig, parseCommonArgs, displayHelp } = require('../utils/config-helper');

// Language configurations with native names
const LANGUAGE_CONFIG = {
  'de': { name: 'German', nativeName: 'Deutsch' },
  'es': { name: 'Spanish', nativeName: 'Español' },
  'fr': { name: 'French', nativeName: 'Français' },
  'ru': { name: 'Russian', nativeName: 'Русский' },
  'it': { name: 'Italian', nativeName: 'Italiano' },
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
    this.config = {
      sourceLanguage: 'en',
      excludeFiles: ['.DS_Store', 'Thumbs.db'],
      supportedExtensions: ['.json'],
      notTranslatedMarker: '[NOT_TRANSLATED]',
      ...config
    };
    this.sourceDir = this.config.sourceDir || './locales';
    this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
    
    // Ensure defaultLanguages is properly initialized from config
    this.config.defaultLanguages = this.config.defaultLanguages || ['de', 'es', 'fr', 'ru'];
    
    // No longer create readline interface here - use CLI helpers
    this.rl = null;
    this.shouldCloseRL = false;
  }

  // Add the missing checkI18nDependencies method
  async checkI18nDependencies(noPrompt = false) {
    const packageJsonPath = path.resolve('./package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      console.log(this.ui.t('init.noPackageJson'));
      return await this.promptContinueWithoutI18n(noPrompt);
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
        return await this.promptContinueWithoutI18n(noPrompt);
      }
    } catch (error) {
      console.log(this.ui.t('init.errors.packageJsonRead'));
      return await this.promptContinueWithoutI18n(noPrompt);
    }
  }

  // Add the missing promptContinueWithoutI18n method
  async promptContinueWithoutI18n(noPrompt = false) {
    if (noPrompt || !process.stdin.isTTY) {
      return true;
    }
    const answer = await this.prompt('\n' + this.ui.t('init.continueWithoutI18nPrompt'));
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
  }

  // Add the missing prompt method
  async prompt(question) {
    const { ask } = require('../utils/cli');
    return await ask(question);
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
        } else if (key === 'no-prompt') {
          parsed.noPrompt = true;
        } else if (key === 'yes') {
          parsed.yes = true;
        }
      }
    });

    if (!process.stdin.isTTY) {
      parsed.yes = true;
    }
    if (parsed.yes) {
      parsed.noPrompt = true;
    }

    return parsed;
  }

  // Detect existing translation directories and allow user selection
  async detectAndSelectDirectory(skipPrompt = false) {
    const possibleLocations = [
      './locales',
      './src/locales',
      './src/i18n/locales',
      './app/locales',
      './public/locales',
      './translations',
      './lang',
      './i18n/locales',
      './assets/locales',
      './client/locales',
      './frontend/locales'
    ];

    const existingLocations = [];
    
    // Check for existing translation directories
    for (const location of possibleLocations) {
      if (fs.existsSync(location)) {
        try {
          const items = fs.readdirSync(location);
          const englishFormats = ['en', 'en-US', 'en-GB', 'english'];
          
          // Check for English directories first
          for (const format of englishFormats) {
            const englishPath = path.join(location, format);
            if (fs.existsSync(englishPath) && fs.statSync(englishPath).isDirectory()) {
              const englishFiles = fs.readdirSync(englishPath).filter(file => file.endsWith('.json'));
              if (englishFiles.length > 0) {
                // Found English files, prioritize this
                existingLocations.unshift(location);
                break;
              }
            }
          }
          
          // Also check for any language directories or JSON files
          const hasLanguageDirs = items.some(item => {
            const itemPath = path.join(location, item);
            if (fs.statSync(itemPath).isDirectory()) {
              return ['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh', 'en-US', 'en-GB'].includes(item);
            }
            return item.endsWith('.json');
          });
          
          if (hasLanguageDirs && !existingLocations.includes(location)) {
            existingLocations.push(location);
          }
        } catch (error) {
          // Continue checking other locations
        }
      }
    }

    if (existingLocations.length > 0) {
      if (skipPrompt || !process.stdin.isTTY) {
        const selectedDir = existingLocations[0];
        this.config.sourceDir = selectedDir;
        this.sourceDir = path.resolve(selectedDir);
        this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
        const rel = configManager.toRelative(selectedDir);
        await configManager.updateConfig({ sourceDir: rel, i18nDir: rel });
        return selectedDir;
      }

      console.log('\n' + this.ui.t('init.existingDirectoriesFound'));
      console.log(this.ui.t('common.separator'));

      existingLocations.forEach((location, index) => {
        console.log(`  ${index + 1}. ${location}`);
      });

      console.log(`  ${existingLocations.length + 1}. Create new directory`);

      const answer = await this.prompt('\n' + this.ui.t('init.selectDirectoryPrompt') + ' (Enter number):');
      const selectedIndex = parseInt(answer) - 1;

      if (selectedIndex >= 0 && selectedIndex < existingLocations.length) {
        const selectedDir = existingLocations[selectedIndex];
        console.log(this.ui.t('init.usingExistingDirectory', { dir: selectedDir }));

        this.config.sourceDir = selectedDir;
        this.sourceDir = path.resolve(selectedDir);
        this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);

        const rel = configManager.toRelative(selectedDir);
        await configManager.updateConfig({ sourceDir: rel, i18nDir: rel });

        return selectedDir;
      } else if (selectedIndex === existingLocations.length) {
        const newDirName = await this.prompt('\n' + this.ui.t('init.enterNewDirectoryName') + ': ');
        if (newDirName && newDirName.trim()) {
          const newDirPath = path.resolve(newDirName.trim());

          if (!fs.existsSync(newDirPath)) {
            fs.mkdirSync(newDirPath, { recursive: true });
            console.log(this.ui.t('init.createdNewDirectory', { dir: newDirPath }));
          } else {
            console.log(this.ui.t('init.directoryAlreadyExists', { dir: newDirPath }));
          }

          const sourceLangDir = path.join(newDirPath, this.config.sourceLanguage);
          if (!fs.existsSync(sourceLangDir)) {
            fs.mkdirSync(sourceLangDir, { recursive: true });
            console.log(this.ui.t('init.createdSourceLanguageDirectory', { dir: sourceLangDir }));
            await this.createSampleTranslationFile(sourceLangDir);
          }

          this.config.sourceDir = newDirPath;
          this.sourceDir = newDirPath;
          this.sourceLanguageDir = sourceLangDir;

          const rel = configManager.toRelative(newDirPath);
          await configManager.updateConfig({ sourceDir: rel, i18nDir: rel });

          return newDirPath;
        } else {
          console.log(this.ui.t('init.invalidDirectoryName'));
          return null;
        }
      }
    }

    if (skipPrompt || !process.stdin.isTTY) {
      return null;
    }

    return null;
  }

  // Setup initial directory structure if needed
  async setupInitialStructure(skipPrompt = false) {
    // First, detect if there are existing translation directories with English files
    const usedExisting = await this.detectAndSelectDirectory(skipPrompt);
    
    if (usedExisting) {
      console.log(this.ui.t('init.usingExistingStructure', { dir: this.sourceDir }));
      // When using existing, sourceLanguageDir might already be set to English directory
      return;
    }
    
    // Validate paths
    const validatedSourceDir = SecurityUtils.validatePath(this.sourceDir, process.cwd());
    const validatedSourceLanguageDir = SecurityUtils.validatePath(this.sourceLanguageDir, process.cwd());
    
    if (!validatedSourceDir || !validatedSourceLanguageDir) {
      SecurityUtils.logSecurityEvent('Invalid directory paths in setupInitialStructure', 'error', { sourceDir: this.sourceDir, sourceLanguageDir: this.sourceLanguageDir });
      throw new Error(this.ui.t('validate.invalidDirectoryPaths') || 'Invalid directory paths detected');
    }
    
    // Create source directory only if it doesn't exist and no existing was detected
    if (!fs.existsSync(validatedSourceDir)) {
      console.log(this.ui.t('init.creatingSourceDirectory', { dir: validatedSourceDir }));
      fs.mkdirSync(validatedSourceDir, { recursive: true });
      SecurityUtils.logSecurityEvent('Source directory created', 'info', { dir: validatedSourceDir });
    }
    
    // Create source language directory only if it doesn't exist
    if (!fs.existsSync(validatedSourceLanguageDir)) {
      console.log(this.ui.t('init.creatingSourceLanguageDirectory', { dir: validatedSourceLanguageDir }));
      fs.mkdirSync(validatedSourceLanguageDir, { recursive: true });
      
      // Create a sample translation file only if no files exist
      await this.createSampleTranslationFile(validatedSourceLanguageDir);
    } else {
      // Directory exists, check if we need to create a sample file
      const existingFiles = fs.readdirSync(validatedSourceLanguageDir)
        .filter(file => file.endsWith('.json'));
      
      if (existingFiles.length === 0) {
        // No JSON files exist, create sample file
        await this.createSampleTranslationFile(validatedSourceLanguageDir);
      }
    }

    const rel = configManager.toRelative(this.sourceDir);
    await configManager.updateConfig({ sourceDir: rel, i18nDir: rel });
  }
  
  // Create sample translation file with smart naming
  async createSampleTranslationFile(validatedSourceLanguageDir) {
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
    
    // Determine filename: use common.json if it doesn't exist, otherwise i18ntk-common.json
    const commonFilePath = path.join(validatedSourceLanguageDir, 'common.json');
    const i18ntkCommonFilePath = path.join(validatedSourceLanguageDir, 'i18ntk-common.json');
    
    let sampleFilePath;
    if (!fs.existsSync(commonFilePath)) {
      sampleFilePath = commonFilePath;
    } else {
      sampleFilePath = i18ntkCommonFilePath;
    }
    
    const validatedSampleFilePath = SecurityUtils.validatePath(sampleFilePath, process.cwd());
    
    if (!validatedSampleFilePath) {
      SecurityUtils.logSecurityEvent('Invalid sample file path', 'error', { path: sampleFilePath });
      throw new Error(this.ui.t('validate.invalidSampleFilePath') || 'Invalid sample file path');
    }
    
    const success = await SecurityUtils.safeWriteFile(validatedSampleFilePath, JSON.stringify(sampleTranslations, null, 2), process.cwd());
    
    if (success) {
      console.log(this.ui.t('init.createdSampleTranslationFile', { file: validatedSampleFilePath }));
      SecurityUtils.logSecurityEvent('Sample translation file created', 'info', { file: validatedSampleFilePath });
    } else {
      SecurityUtils.logSecurityEvent('Failed to create sample translation file', 'error', { file: validatedSampleFilePath });
      throw new Error(this.ui.t('validate.failedToCreateSampleTranslationFile') || 'Failed to create sample translation file');
    }
  }
  
  // Check if source directory and language exist
  validateSource() {
    if (!fs.existsSync(this.sourceDir)) {
      throw new Error(this.ui.t('validate.sourceLanguageDirectoryNotFound', { sourceDir: this.sourceDir }) || `Source directory not found: ${this.sourceDir}`);
    }
    
    if (!fs.existsSync(this.sourceLanguageDir)) {
      throw new Error(this.ui.t('validate.sourceLanguageDirectoryNotFound', { sourceDir: this.sourceLanguageDir }) || `Source language directory not found: ${this.sourceLanguageDir}`);
    }
    
    return true;
  }

  // Get all JSON files from source language directory
  getSourceFiles() {
    try {
      if (!fs.existsSync(this.sourceLanguageDir)) {
        // Try to find English files in parent directory or subdirectories
        const parentDir = path.dirname(this.sourceLanguageDir);
        if (fs.existsSync(parentDir)) {
          const subdirs = fs.readdirSync(parentDir).filter(item => {
            const fullPath = path.join(parentDir, item);
            return fs.statSync(fullPath).isDirectory();
          });
          
          // Look for English files in any subdirectory
          for (const subdir of subdirs) {
            const englishDir = path.join(parentDir, subdir);
            if (fs.existsSync(englishDir)) {
              const files = fs.readdirSync(englishDir);
              const jsonFiles = files.filter(file => 
                file.endsWith('.json') && 
                !this.config.excludeFiles.includes(file)
              );
              if (jsonFiles.length > 0) {
                // Found English files, use this directory
                this.sourceLanguageDir = englishDir;
                return jsonFiles;
              }
            }
          }
        }
        throw new Error(this.ui.t('validate.noJsonFilesFound', { sourceDir: this.sourceLanguageDir }) || `No JSON files found in source directory: ${this.sourceLanguageDir}`);
      }
      
      const files = fs.readdirSync(this.sourceLanguageDir)
        .filter(file => {
          return file.endsWith('.json') && 
                 !this.config.excludeFiles.includes(file);
        });
      
      if (files.length === 0) {
        throw new Error(this.ui.t('validate.noJsonFilesFound', { sourceDir: this.sourceLanguageDir }) || `No JSON files found in source directory: ${this.sourceLanguageDir}`);
      }
      
      return files;
    } catch (error) {
      console.warn(this.ui.t('init.warningCannotReadSourceDir', { dir: this.sourceLanguageDir, error: error.message }));
      throw error;
    }
  }

  // Recursively mark all string values with country code markers
  markWithCountryCode(obj, countryCode) {
    if (typeof obj === 'string') {
      return `[${countryCode.toUpperCase()}] ${obj}`;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.markWithCountryCode(item, countryCode));
    }
    
    if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.markWithCountryCode(value, countryCode);
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
      throw new Error(this.ui.t('validate.invalidFilePathDetected') || 'Invalid file path detected');
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
          targetContent = this.mergeTranslations(sourceContent, JSON.parse(existingContent), targetLanguage);
        } else {
          targetContent = this.markWithCountryCode(sourceContent, targetLanguage);
        }
      } catch (error) {
        console.warn(`⚠️  Warning: Could not parse existing file ${validatedTargetFile}, creating new one`);
        SecurityUtils.logSecurityEvent('File parse error', 'warn', { file: validatedTargetFile, error: error.message });
        targetContent = this.markWithCountryCode(sourceContent, targetLanguage);
      }
    } else {
      targetContent = this.markWithCountryCode(sourceContent, targetLanguage);
    }
    
    // Write the file securely
    const success = await SecurityUtils.safeWriteFile(validatedTargetFile, JSON.stringify(targetContent, null, 2), this.sourceDir);
    
    if (!success) {
      SecurityUtils.logSecurityEvent('Failed to write language file', 'error', { file: validatedTargetFile });
      throw new Error(this.ui.t('validate.failedToWriteFile', { filePath: validatedTargetFile }) || `Failed to write file: ${validatedTargetFile}`);
    }
    
    SecurityUtils.logSecurityEvent('Language file created/updated', 'info', { file: validatedTargetFile, language: targetLanguage });
    return validatedTargetFile;
  }

  // Merge existing translations with new structure using country code markers
  mergeTranslations(sourceObj, existingObj, countryCode) {
    if (typeof sourceObj === 'string') {
      // If existing translation exists and doesn't contain country code marker, keep it
      if (typeof existingObj === 'string' && 
          !existingObj.startsWith(`[${countryCode.toUpperCase()}]`) && 
          existingObj.trim() !== '') {
        return existingObj;
      }
      return this.markWithCountryCode(sourceObj, countryCode);
    }
    
    if (Array.isArray(sourceObj)) {
      return sourceObj.map((item, index) => {
        const existingItem = Array.isArray(existingObj) ? existingObj[index] : undefined;
        return this.mergeTranslations(item, existingItem, countryCode);
      });
    }
    
    if (sourceObj && typeof sourceObj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(sourceObj)) {
        const existingValue = existingObj && typeof existingObj === 'object' ? existingObj[key] : undefined;
        result[key] = this.mergeTranslations(value, existingValue, countryCode);
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
    const { ask, askHidden, flushStdout } = require('../utils/cli');

    console.log('\n' + this.ui.t('init.adminPinSetupOptional'));
    console.log(this.ui.t('init.adminPinSeparator'));
    console.log(this.ui.t('init.adminPinDescription1'));
    console.log(this.ui.t('init.adminPinDescription2'));
    console.log(this.ui.t('init.adminPinDescription3'));
    console.log(this.ui.t('init.adminPinDescription4'));

    await flushStdout();
    const enableProtection = await ask('\n' + this.ui.t('adminPin.setup_prompt'));

    if (enableProtection.toLowerCase() === 'y' || enableProtection.toLowerCase() === 'yes') {
      try {
        const adminAuth = new AdminAuth();
        await adminAuth.initialize();

        await configManager.updateConfig({
          security: {
            adminPinEnabled: true,
            adminPinPromptOnInit: true,
            pinProtection: { enabled: true }
          }
        });

        let pin = null;
        do {
          pin = await askHidden(this.ui.t('init.enterAdminPin'));
          if (!/^\d{4}$/.test(pin)) {
            console.log(this.ui.t('init.pinMustBe4Digits'));
            pin = null;
            continue;
          }
          const confirm = await askHidden(this.ui.t('init.confirmAdminPin'));
          if (pin !== confirm) {
            console.log(this.ui.t('init.pinsDoNotMatch'));
            pin = null;
          }
        } while (!pin);

        const saved = await SecurityUtils.saveEncryptedPin(pin);
        if (saved) {
          console.log(this.ui.t('init.adminPinSetupSuccess'));
        } else {
          console.error(this.ui.t('init.errorSettingUpAdminPin', { error: 'Failed to save PIN' }));
        }
      } catch (error) {
        console.error(this.ui.t('init.errorSettingUpAdminPin', { error: error.message }));
        console.log(this.ui.t('init.continuingWithoutAdminPin'));
      }
    } else {
      console.log(this.ui.t('init.skippingAdminPinSetup'));
    }
  }

  // Interactive language selection
  async selectLanguages(skipPrompt = false) {
    if (skipPrompt || !process.stdin.isTTY) {
      return this.config.defaultLanguages;
    }

    const { ask } = require('../utils/cli');

    console.log('\n' + this.ui.t('init.languageSelectionTitle'));
    console.log(this.ui.t('common.separator'));
    console.log(this.ui.t('language.available'));

    Object.entries(LANGUAGE_CONFIG).forEach(([code, config], index) => {
      console.log(`  ${(index + 1).toString().padStart(2)}. ${code} - ${config.name} (${config.nativeName})`);
    });

    console.log('\n' + this.ui.t('init.defaultLanguages', { languages: this.config.defaultLanguages.join(', ') }));

    const answer = await ask('\n' + this.ui.t('init.enterLanguageCodes'));

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
      console.log(this.ui.t('common.separator'));
      
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
      const hasI18n = await this.checkI18nDependencies(args.noPrompt);
      
      if (!hasI18n) {
        console.log(this.t('init.errors.noFramework'));
        console.log(this.t('init.suggestions.installFramework'));
        process.exit(0);
      }
      
      // Call the enhanced initialize method with args
      await this.initialize(hasI18n, args);
      
      // Offer interactive locale optimization after successful initialization
      if (!args.noPrompt) {
        await this.offerLocaleOptimization();
      }
      
    } catch (error) {
      console.error(this.ui.t('init.errors.initializationFailed', { error: error.message }));
      throw error;
    } finally {
      // No explicit readline cleanup needed; CLI helpers manage a shared interface
    }
  }

  // Enhanced initialization with dependency checking
  async initialize(hasI18n = true, args = {}) {
    console.log(this.ui.t('init.initializingProject'));
    
    if (!hasI18n) {
      console.log(this.ui.t('init.warningProceedingWithoutFramework'));
      console.log(this.ui.t('init.translationFilesCreatedWarning'));
    }
    
      // Handle directory selection and structure setup
    const selectedDir = await this.detectAndSelectDirectory(args.noPrompt);
    if (selectedDir) {
      this.config.sourceDir = selectedDir;
      this.sourceDir = path.resolve(selectedDir);
      this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
      console.log(this.ui.t('init.usingExistingDirectory', { dir: selectedDir }));
    } else {
      await this.setupInitialStructure(args.noPrompt);
    }
    
    // Validate source
    this.validateSource();
    
    // Prompt for admin PIN setup if not already configured
    const securitySettings = configManager.getConfig().security || {};
    
    if (!securitySettings.adminPinEnabled && securitySettings.adminPinPromptOnInit !== false && !args.noPrompt) {
      const { flushStdout } = require('../utils/cli');
      await flushStdout();
      await this.promptAdminPinSetup();
    }

    // Get target languages - use args.languages if provided
    let targetLanguages = args.languages || await this.selectLanguages(args.noPrompt);
    
    // Ensure targetLanguages is always an array
    targetLanguages = Array.isArray(targetLanguages) ? targetLanguages : [];
    
    if (targetLanguages.length === 0) {
      console.log(this.ui.t('init.noTargetLanguagesSpecified'));
      return;
    }
    
    console.log('\n' + this.ui.t('init.targetLanguages', { languages: targetLanguages.map(lang => `${lang} (${LANGUAGE_CONFIG[lang]?.name || 'Unknown'})`).join(', ') }));
    
    // Get source files
    const sourceFiles = this.getSourceFiles();
    console.log('\n' + this.ui.t('init.foundSourceFiles', { count: sourceFiles.length }));
    
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
    console.log(this.ui.t('common.separator'));
    
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

  // Offer interactive locale optimization after initialization
  async offerLocaleOptimization() {
    try {
      console.log('\n' + '='.repeat(60));
      console.log('🎯 **PACKAGE SIZE OPTIMIZATION**');
      console.log('='.repeat(60));
      
      // First run dry run to show current state
      console.log('\n🔍 Running locale optimization preview...');
      const { spawn } = require('child_process');
      const path = require('path');
      
      const dryRun = spawn('node', [path.join(__dirname, '..', 'scripts', 'locale-optimizer.js'), '--dry-run'], {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      await new Promise(resolve => {
        dryRun.on('close', resolve);
      });

      console.log('\n💡 You can reduce package size by selecting only the languages you need');
      
      const answer = await this.prompt('\n🤖 Would you like to run interactive optimization now? (y/n): ');
      
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        console.log('\n🚀 Starting interactive locale optimization...');
        
        const optimizer = spawn('node', [path.join(__dirname, '..', 'scripts', 'locale-optimizer.js'), '--interactive'], {
          stdio: 'inherit',
          cwd: process.cwd()
        });

        await new Promise(resolve => {
          optimizer.on('close', resolve);
        });
        
        console.log('\n✅ Package optimization completed!');
      } else {
        console.log('\n💡 You can run locale optimization later with:');
        console.log('   node scripts/locale-optimizer.js --interactive');
      }
    } catch (error) {
      console.log('\n⚠️ Could not offer locale optimization:', error.message);
    }
  }

  // Run the initialization process with admin authentication
  async run(options = {}) {
    const fromMenu = options.fromMenu || false;
    
    try {
      // Parse command line arguments
      const args = this.parseArgs();
      
      // Initialize configuration properly when called from menu
      if (fromMenu && !this.sourceDir) {
        const baseConfig = await getUnifiedConfig('init', args);
        this.config = { ...baseConfig, ...this.config };
        
        this.sourceDir = this.config.sourceDir;
        this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
        
        // Load translations for UI messages
      const uiLanguage = this.config.uiLanguage || 'en';
      const { loadTranslations } = require('../utils/i18n-helper');
      loadTranslations(uiLanguage, path.resolve(__dirname, '..', 'ui-locales'));
      }

      // Override config with command line arguments
      if (args.languages) {
        this.config.defaultLanguages = args.languages;
      }
      if (args.sourceDir) {
        this.config.sourceDir = args.sourceDir;
        this.sourceDir = path.resolve(this.config.sourceDir);
        this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
      }
      if (args.sourceLanguage) {
        this.config.sourceLanguage = args.sourceLanguage;
        this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
      }

      // Check admin authentication for sensitive operations (only when called directly and not in no-prompt mode)
      const AdminAuth = require('../utils/admin-auth');
      const adminAuth = new AdminAuth();
      await adminAuth.initialize();
      
      const isCalledDirectly = require.main === module;
      const isRequired = await adminAuth.isAuthRequired();
      if (isRequired && isCalledDirectly && !args.noPrompt && !fromMenu) {
        console.log('\n' + this.ui.t('adminCli.authRequiredForOperation', { operation: 'initialize i18n project' }));
        const pin = await this.prompt(this.ui.t('adminCli.enterPin'));
        const isValid = await adminAuth.verifyPin(pin);
        
        if (!isValid) {
          console.log(this.ui.t('adminCli.invalidPin'));
          if (!fromMenu) process.exit(1);
          return;
        }
        
        console.log(this.ui.t('adminCli.authenticationSuccess'));
      }

      // Check i18n dependencies first and exit if user chooses not to continue
      const hasI18n = await this.checkI18nDependencies(args.noPrompt);
      
      if (!hasI18n) {
        console.log(this.ui.t('init.errors.noFramework'));
        console.log(this.ui.t('init.suggestions.installFramework'));
        if (this.shouldCloseRL) {
          this.rl.close();
          global.activeReadlineInterface = null;
        }
        if (!fromMenu) process.exit(0);
        return;
      }
      
      // Call the enhanced initialize method with args
      await this.initialize(hasI18n, args);
      
    } catch (error) {
      console.error(this.ui.t('init.errors.initializationFailed', { error: error.message }));
      if (!fromMenu && require.main === module) {
        process.exit(1);
      }
    } finally {
      // No explicit readline cleanup needed; CLI helpers manage a shared interface
    }
  }

  // Run non-interactive mode for workflow automation
  async runNonInteractive() {
    try {
      const args = { noPrompt: true, ...this.parseArgs() };
      
      // Initialize configuration
      const baseConfig = await getUnifiedConfig('init', args);
      this.config = { ...baseConfig, ...this.config };
      
      this.sourceDir = this.config.sourceDir;
      this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
      
      // Load translations for UI messages
      const uiLanguage = this.config.uiLanguage || 'en';
      const { loadTranslations } = require('../utils/i18n-helper');
      loadTranslations(uiLanguage, path.resolve(__dirname, '..', 'ui-locales'));
      
      // Skip i18n framework check in non-interactive mode
      console.log('Running initialization in non-interactive mode...');
      
      // Call the enhanced initialize method
      await this.initialize(true, args);
      
    } catch (error) {
      console.error('Error in non-interactive mode:', error.message);
      throw error;
    } finally {
      // No explicit readline cleanup needed; CLI helpers manage a shared interface
    }
  }
}

module.exports = I18nInitializer;

// Run if called directly
if (require.main === module) {
  async function main() {
    try {
      const args = parseCommonArgs(process.argv.slice(2));
      
      if (args.help) {
        displayHelp('i18ntk-init', {
          'languages': 'Comma-separated list of target languages',
          'source-dir': 'Directory for translation files',
          'source-language': 'Source language code',
          'no-prompt': 'Run without interactive prompts'
        });
        return;
      }
      
      // Handle legacy language flags
      if (args.languages && typeof args.languages === 'string') {
        args.languages = args.languages.split(',').map(l => l.trim());
      }
      if (args['target-languages'] && typeof args['target-languages'] === 'string') {
        args.languages = args['target-languages'].split(',').map(l => l.trim());
      }
      
      const config = await getUnifiedConfig('init', args);
      
      // Override with CLI arguments
      if (args.languages) {
        config.defaultLanguages = args.languages;
      }
      
      const initializer = new I18nInitializer(config);
      
      if (args.noPrompt) {
        await initializer.runNonInteractive();
      } else {
        await initializer.run();
      }
      
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
  
  main();
}
