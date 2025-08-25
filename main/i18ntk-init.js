#!/usr/bin/env node
/**
 * I18NTK INITIALIZATION SCRIPT
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
const configManager = require('../utils/config-manager');
const SecurityUtils = require('../utils/security');
const AdminAuth = require('../utils/admin-auth');
const { loadTranslations, t } = require('../utils/i18n-helper');
const { detectFramework } = require('../utils/framework-detector');
const { getFormatAdapter } = require('../utils/format-manager');
// Ensure UIi18n is available for this initializer class
const UIi18n = require('./i18ntk-ui');
loadTranslations();
const { getUnifiedConfig, parseCommonArgs, displayHelp } = require('../utils/config-helper');
const { showFrameworkWarningOnce } = require('../utils/cli-helper');
const { createPrompt, isInteractive } = require('../utils/prompt-helper');

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
      // Default structure: modular (folder per language)
      structure: 'modular', // one of: 'single' | 'modular' | 'existing'
      perLanguageStructure: {}, // optional map lang -> 'single' | 'modular'
      noPrompt: false,
      ...config
    };
        this.format = getFormatAdapter(this.config.format);
    this.config.supportedExtensions = [this.format.extension];
    this.detectedFramework = detectFramework(process.cwd());
    if (this.detectedFramework && !this.config.translationPatterns) {
      this.config.translationPatterns = this.detectedFramework.patterns;
    }
    this.sourceDir = this.config.sourceDir || './locales';
    // Source language directory depends on structure
    this.sourceLanguageDir = this.config.structure === 'single'
      ? this.sourceDir
      : path.join(this.sourceDir, this.config.sourceLanguage);
    
    // Ensure defaultLanguages is properly initialized from config
    this.config.defaultLanguages = this.config.defaultLanguages || ['de', 'es', 'fr', 'ru'];
    
    // No longer create readline interface here - use CLI helpers
    this.rl = null;
    this.shouldCloseRL = false;
    this.announcedExistingDir = false;
    this.promptInstance = null;
  }

  // Updated checkI18nDependencies method that uses configuration
  async checkI18nDependencies(noPrompt = false) {
    const packageJsonPath = path.resolve('./package.json');
    
    if (!SecurityUtils.safeExistsSync(packageJsonPath)) {
      console.log(t('errors.noPackageJson'));
      return true; // Allow to continue without framework
    }
    
    try {
      const packageJson = JSON.parse(SecurityUtils.safeReadFileSync(packageJsonPath, path.dirname(packageJsonPath), 'utf8'));
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
        console.log(t('init.detectedI18nFrameworks', { frameworks: installedFrameworks.join(', ') }));
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
        // Framework detection is now handled by maybePromptFramework in i18ntk-manage.js
        // Skip prompting here to avoid double prompts
        return true;
      }
    } catch (error) {
      console.log(t('init.errors.packageJsonRead'));
      return true; // Allow to continue on error
    }
  }

  // Add the missing promptContinueWithoutI18n method
  async promptContinueWithoutI18n(noPrompt = false) {
    if (!isInteractive({ noPrompt: noPrompt || this.config.noPrompt })) {
      return true;
    }
    const answer = await this.prompt('\n' + t('init.continueWithoutI18nPrompt'));
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
  }

  // Add the missing prompt method
  async prompt(question) {
    if (!this.promptInstance) {
      this.promptInstance = createPrompt({ noPrompt: this.config.noPrompt });
    }
    if (!isInteractive({ noPrompt: this.config.noPrompt })) {
      return '';
    }
    return this.promptInstance.question(question);
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
      if (SecurityUtils.safeExistsSync(location)) {
        try {
          const items = fs.readdirSync(location);
          const englishFormats = ['en', 'en-US', 'en-GB', 'english'];
          
          // Check for English directories first
          for (const format of englishFormats) {
            const englishPath = path.join(location, format);
            if (SecurityUtils.safeExistsSync(englishPath) && fs.statSync(englishPath).isDirectory()) {
              const englishFiles = fs.readdirSync(englishPath).filter(file => file.endsWith(this.format.extension));
              if (englishFiles.length > 0) {
                // Found English files, prioritize this
                existingLocations.unshift(location);
                break;
              }
            }
          }
          
          // Also check for any language directories or format files
          const hasLanguageDirs = items.some(item => {
            const itemPath = path.join(location, item);
            if (fs.statSync(itemPath).isDirectory()) {
              return ['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh', 'en-US', 'en-GB'].includes(item);
            }
            return item.endsWith(this.format.extension);
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

      console.log('\n' + t('init.existingDirectoriesFound'));
      console.log(t('common.separator'));

      // List existing locations
      existingLocations.forEach((location, index) => {
        console.log(`  ${index + 1}. ${location}`);
      });

      // Add options for new directory and exit
      console.log(`  ${existingLocations.length + 1}. Create new directory`);
      console.log(`  0. Exit`);

      let answer;
      let selectedIndex;
      
      // Keep asking until we get a valid number
      while (true) {
        answer = await this.prompt('\n' + t('init.selectDirectoryPrompt') + ' (0-' + (existingLocations.length + 1) + '):');
        
        // Check for exit (0)
        if (answer === '0') {
          console.log(t('init.initializationCancelled'));
          process.exit(0);
        }
        
        // Parse the selection
        selectedIndex = parseInt(answer) - 1;
        
        // Validate the selection
        if (!isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex <= existingLocations.length) {
          break;
        }
        
        console.log(t('errors.invalidOption', { option: answer }));
      }

      if (selectedIndex >= 0 && selectedIndex < existingLocations.length) {
        const selectedDir = existingLocations[selectedIndex];
        if (!this.announcedExistingDir) {
          console.log(t('init.usingExistingDirectory', { dir: selectedDir }));
          this.announcedExistingDir = true;
        }

        this.config.sourceDir = selectedDir;
        this.sourceDir = path.resolve(selectedDir);
        this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);

        const rel = configManager.toRelative(selectedDir);
        await configManager.updateConfig({ sourceDir: rel, i18nDir: rel });

        return selectedDir;
      } else if (selectedIndex === existingLocations.length) {
        const newDirName = await this.prompt('\n' + t('init.enterNewDirectoryName') + ': ');
        if (newDirName && newDirName.trim()) {
          const newDirPath = path.resolve(newDirName.trim());

          if (!SecurityUtils.safeExistsSync(newDirPath)) {
            fs.mkdirSync(newDirPath, { recursive: true });
            console.log(t('init.createdNewDirectory', { dir: newDirPath }));
          } else {
            console.log(t('init.directoryAlreadyExists', { dir: newDirPath }));
          }

          const sourceLangDir = path.join(newDirPath, this.config.sourceLanguage);
          if (!SecurityUtils.safeExistsSync(sourceLangDir)) {
            fs.mkdirSync(sourceLangDir, { recursive: true });
            console.log(t('init.createdSourceLanguageDirectory', { dir: sourceLangDir }));
            await this.createSampleTranslationFile(sourceLangDir);
          }

          this.config.sourceDir = newDirPath;
          this.sourceDir = newDirPath;
          this.sourceLanguageDir = sourceLangDir;

          const rel = configManager.toRelative(newDirPath);
          await configManager.updateConfig({ sourceDir: rel, i18nDir: rel });

          return newDirPath;
        } else {
          console.log(t('init.invalidDirectoryName'));
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
      console.log(t('init.usingExistingDirectory', { dir: this.sourceDir }));
      // When using existing, sourceLanguageDir might already be set to English directory
      return;
    }
    
    // Validate paths
    const validatedSourceDir = SecurityUtils.validatePath(this.sourceDir, process.cwd());
    if (!validatedSourceDir) {
      throw new Error(t('validate.invalidSourceDirectory', { sourceDir: this.sourceDir }) || `Invalid source directory: ${this.sourceDir}`);
    }

    // For modular structure, ensure per-language subdirectory exists
    let validatedSourceLanguageDir = this.sourceLanguageDir;
    if (this.config.structure !== 'single') {
      validatedSourceLanguageDir = SecurityUtils.validatePath(this.sourceLanguageDir, process.cwd());
      if (!validatedSourceLanguageDir) {
        throw new Error(t('validate.invalidSourceLanguageDirectory', { sourceDir: this.sourceLanguageDir }) || `Invalid source language directory: ${this.sourceLanguageDir}`);
      }
    }
    
    // Create directories if they do not exist
    if (!SecurityUtils.safeExistsSync(validatedSourceDir)) {
      fs.mkdirSync(validatedSourceDir, { recursive: true });
    }
    if (this.config.structure !== 'single' && !SecurityUtils.safeExistsSync(validatedSourceLanguageDir)) {
      fs.mkdirSync(validatedSourceLanguageDir, { recursive: true });
    }

    // Create sample translation file if none exist
    const englishFiles = (this.config.structure === 'single'
      ? fs.readdirSync(validatedSourceDir)
      : fs.readdirSync(validatedSourceLanguageDir))
      .filter(file => file.endsWith(this.format.extension));

    if (englishFiles.length === 0) {
      await this.createSampleTranslationFile(this.config.structure === 'single' ? validatedSourceDir : validatedSourceLanguageDir);
    } else {
      // Directory exists, check if we need to create a sample file
      const existingFiles = (this.config.structure === 'single' ? fs.readdirSync(validatedSourceDir) : fs.readdirSync(validatedSourceLanguageDir))
        .filter(file => file.endsWith(this.format.extension));
      
      if (existingFiles.length === 0) {
        // No format files exist, create sample file
        await this.createSampleTranslationFile(this.config.structure === 'single' ? validatedSourceDir : validatedSourceLanguageDir);
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
    const commonFilePath = path.join(validatedSourceLanguageDir, `common${this.format.extension}`);
    const i18ntkCommonFilePath = path.join(validatedSourceLanguageDir, `i18ntk-common${this.format.extension}`);
    
    let sampleFilePath;
    if (!SecurityUtils.safeExistsSync(commonFilePath)) {
      sampleFilePath = commonFilePath;
    } else {
      sampleFilePath = i18ntkCommonFilePath;
    }
    
    const validatedSampleFilePath = SecurityUtils.validatePath(sampleFilePath, process.cwd());
    
    if (!validatedSampleFilePath) {
      SecurityUtils.logSecurityEvent('Invalid sample file path', 'error', { path: sampleFilePath });
      throw new Error(t('validate.invalidSampleFilePath') || 'Invalid sample file path');
    }
    
    const success = await SecurityUtils.safeWriteFile(validatedSampleFilePath, this.format.serialize(sampleTranslations), process.cwd());
    
    if (success) {
      console.log(t('init.createdSampleTranslationFile', { file: validatedSampleFilePath }));
      SecurityUtils.logSecurityEvent('Sample translation file created', 'info', { file: validatedSampleFilePath });
    } else {
      SecurityUtils.logSecurityEvent('Failed to create sample translation file', 'error', { file: validatedSampleFilePath });
      throw new Error(t('validate.failedToCreateSampleTranslationFile') || 'Failed to create sample translation file');
    }
  }
  
  // Check if source directory and language exist
  validateSource() {
    if (!SecurityUtils.safeExistsSync(this.sourceDir)) {
      throw new Error(t('validate.sourceLanguageDirectoryNotFound', { sourceDir: this.sourceDir }) || `Source directory not found: ${this.sourceDir}`);
    }
    
    if (!SecurityUtils.safeExistsSync(this.sourceLanguageDir)) {
      throw new Error(t('validate.sourceLanguageDirectoryNotFound', { sourceDir: this.sourceLanguageDir }) || `Source language directory not found: ${this.sourceLanguageDir}`);
    }
    
    return true;
  }

  // Get all JSON files from source language directory (supports single/modular)
  getSourceFiles() {
    try {
      if (this.config.structure === 'single') {
        if (!SecurityUtils.safeExistsSync(this.sourceDir)) {
          throw new Error(t('validate.sourceLanguageDirectoryNotFound', { sourceDir: this.sourceDir }) || `Source directory not found: ${this.sourceDir}`);
        }
        const files = fs.readdirSync(this.sourceDir)
          .filter(file => file.endsWith(this.format.extension) && !this.config.excludeFiles.includes(file));
        if (files.length === 0) {
          throw new Error(t('validate.noJsonFilesFound', { sourceDir: this.sourceDir }) || `No JSON files found in source directory: ${this.sourceDir}`);
        }
        return files;
      }

      if (!SecurityUtils.safeExistsSync(this.sourceLanguageDir)) {
        // Try to find English files in parent directory or subdirectories
        const parentDir = path.dirname(this.sourceLanguageDir);
        if (SecurityUtils.safeExistsSync(parentDir)) {
          const subdirs = fs.readdirSync(parentDir).filter(item => {
            const fullPath = path.join(parentDir, item);
            return fs.statSync(fullPath).isDirectory();
          });
          
          // Look for English files in any subdirectory
          for (const subdir of subdirs) {
            const englishDir = path.join(parentDir, subdir);
            if (SecurityUtils.safeExistsSync(englishDir)) {
              const files = fs.readdirSync(englishDir);
              const formatFiles = files.filter(file =>
                file.endsWith(this.format.extension) &&
                !this.config.excludeFiles.includes(file)
              );
              if (formatFiles.length > 0) {
                // Found English files, use this directory
                this.sourceLanguageDir = englishDir;
                return formatFiles;
              }
            }
          }
        }
        throw new Error(t('validate.noJsonFilesFound', { sourceDir: this.sourceLanguageDir }) || `No JSON files found in source directory: ${this.sourceLanguageDir}`);
      }
      
      const files = fs.readdirSync(this.sourceLanguageDir)
      .filter(file => {
        return file.endsWith(this.format.extension) && 
               !this.config.excludeFiles.includes(file);
      });
      
      if (files.length === 0) {
        throw new Error(t('validate.noJsonFilesFound', { sourceDir: this.sourceLanguageDir }) || `No JSON files found in source directory: ${this.sourceLanguageDir}`);
      }
      
      return files;
    } catch (error) {
      console.warn(t('init.warningCannotReadSourceDir', { dir: this.sourceLanguageDir, error: error.message }));
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

  // Get the structure type for a specific language
  getLanguageStructure(language) {
    // Check for per-language structure first
    if (this.config.perLanguageStructure && this.config.perLanguageStructure[language]) {
      return this.config.perLanguageStructure[language];
    }
    // Fall back to the global structure
    return this.config.structure || 'modular';
  }

  // Create or update a language file securely (supports single/modular)
  async createLanguageFile(sourceFile, targetLanguage, sourceContent) {
    try {
      const sourceFilePath = path.join(this.sourceLanguageDir, sourceFile);
      let targetFilePath;
      if (this.getLanguageStructure(targetLanguage) === 'single') {
        // Single-file per language, write to <lang>.json in sourceDir
        const baseName = `${targetLanguage}${this.format.extension}`;
        targetFilePath = path.join(this.sourceDir, baseName);
      } else {
        // Modular: folder per language mirroring source file
        const targetDir = path.join(this.sourceDir, targetLanguage);
        if (!SecurityUtils.safeExistsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        targetFilePath = path.join(targetDir, sourceFile);
      }

      // Validate source and target paths
      const validatedSourcePath = SecurityUtils.validatePath(sourceFilePath, process.cwd());
      const validatedTargetPath = SecurityUtils.validatePath(targetFilePath, process.cwd());
      const targetDir = path.dirname(validatedTargetPath);
      
      if (!validatedSourcePath || !validatedTargetPath) {
        SecurityUtils.logSecurityEvent('Invalid path detected in createLanguageFile', 'error', { 
          sourcePath: sourceFilePath,
          targetPath: targetFilePath 
        });
        throw new Error(t('validate.invalidFilePathDetected') || 'Invalid file path detected');
      }
      
      // Create target directory if it doesn't exist
      if (!SecurityUtils.safeExistsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      let targetContent;
      
      // If target file exists, preserve existing translations
      if (SecurityUtils.safeExistsSync(validatedTargetPath)) {
        try {
          const existingContent = await SecurityUtils.safeReadFile(validatedTargetPath, process.cwd());
          if (existingContent) {
            targetContent = this.mergeTranslations(sourceContent, this.format.read(existingContent), targetLanguage);
          } else {
            targetContent = this.markWithCountryCode(sourceContent, targetLanguage);
          }
        } catch (error) {
          console.warn(`⚠️  Warning: Could not parse existing file ${validatedTargetPath}, creating new one`);
          SecurityUtils.logSecurityEvent('File parse error', 'warn', { file: validatedTargetPath, error: error.message });
          targetContent = this.markWithCountryCode(sourceContent, targetLanguage);
        }
      } else {
        targetContent = this.markWithCountryCode(sourceContent, targetLanguage);
      }
      
      // Write the file securely
      const success = await SecurityUtils.safeWriteFile(validatedTargetPath, this.format.serialize(targetContent), process.cwd());
      
      if (!success) {
        SecurityUtils.logSecurityEvent('Failed to write language file', 'error', { file: validatedTargetPath });
        throw new Error(t('validate.failedToWriteFile', { filePath: validatedTargetPath }) || `Failed to write file: ${validatedTargetPath}`);
      }
      
      SecurityUtils.logSecurityEvent('Language file created/updated', 'info', { file: validatedTargetPath, language: targetLanguage });
      return validatedTargetPath;
    } catch (error) {
      console.error(t('init.errors.initializationFailed', { error: error.message }));
      return false;
    }
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
    let missing = 0;
    
    const count = (item) => {
      if (typeof item === 'string') {
        total++;
        const isCountryCodeMarker = /^\[([A-Z]{2})\]/.test(item);
        if (isCountryCodeMarker) {
          missing++;
        } else if (item.trim() !== '') {
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
      missing
    };
  }

  // Interactive admin PIN setup
  async promptAdminPinSetup() {
    const { ask, askHidden, flushStdout } = require('../utils/cli');

    console.log('\n' + t('init.adminPinSetupOptional'));
    console.log(t('init.adminPinSeparator'));
    console.log(t('init.adminPinDescription1'));
    console.log(t('init.adminPinDescription2'));
    console.log(t('init.adminPinDescription3'));
    console.log(t('init.adminPinDescription4'));

    await flushStdout();
    const enableProtection = await ask('\n' + t('adminPin.setup_prompt'));

    if (enableProtection.toLowerCase() === 'y' || enableProtection.toLowerCase() === 'yes') {
      try {
        const adminAuth = new AdminAuth();
        await adminAuth.initialize();

        let pin = null;
        do {
          pin = await askHidden(t('init.enterAdminPin'));
          if (!/^\d{4}$/.test(pin)) {
            console.log(t('init.pinMustBe4Digits'));
            pin = null;
            continue;
          }
          const confirm = await askHidden(t('init.confirmAdminPin'));
          if (pin !== confirm) {
            console.log(t('init.pinMismatch'));
            pin = null;
          }
        } while (!pin);

        const saved = await adminAuth.setupPin(pin);
        if (saved) {
          await configManager.updateConfig({
            security: {
              adminPinEnabled: true,
              adminPinPromptOnInit: true,
              pinProtection: { enabled: true }
            }
          });
          console.log(t('init.adminPinSetupSuccess'));
        } else {
          console.error(t('init.errorSettingUpAdminPin', { error: 'Failed to save PIN' }));
        }
      } catch (error) {
        console.error(t('init.errorSettingUpAdminPin', { error: error.message }));
        console.log(t('init.continuingWithoutAdminPin'));
      }
    } else {
      console.log(t('init.skippingAdminPinSetup'));
    }
  }

  // Interactive language selection
  async selectLanguages(skipPrompt = false) {
    if (skipPrompt || !process.stdin.isTTY) {
      return this.config.defaultLanguages;
    }

    const { ask } = require('../utils/cli');

    console.log('\n' + t('init.languageSelectionTitle'));
    console.log(t('common.separator'));
    console.log(t('init.available'));

    Object.entries(LANGUAGE_CONFIG).forEach(([code, config], index) => {
      console.log(`  ${(index + 1).toString().padStart(2)}. ${code} - ${config.name} (${config.nativeName})`);
    });

    console.log('\n' + t('init.defaultLanguages', { languages: this.config.defaultLanguages.join(', ') }));

    const answer = await ask('\n' + t('init.enterLanguageCodes'));

    if (answer.trim() === '') {
      return this.config.defaultLanguages;
    }

    const selectedLanguages = answer.split(',').map(lang => lang.trim().toLowerCase());
    const validLanguages = selectedLanguages.filter(lang => LANGUAGE_CONFIG[lang]);
    const invalidLanguages = selectedLanguages.filter(lang => !LANGUAGE_CONFIG[lang]);

    if (invalidLanguages.length > 0) {
      console.warn(t('init.warningInvalidLanguageCodes', { languages: invalidLanguages.join(', ') }));
    }

    return validLanguages.length > 0 ? validLanguages : this.config.defaultLanguages;
  }

  // Interactive setup configuration (internationalized)
  async promptSetupConfiguration(skipPrompt = false) {
    if (skipPrompt || !process.stdin.isTTY) {
      return { structure: 'modular', duplicateStructure: true };
    }

    const { ask } = require('../utils/cli');

    console.log('\n' + t('init.setup.title'));
    console.log(t('common.separator'));
    // Determine recommended option
    const recommended = ' (recommended)';
    console.log(t('init.setup.question'));
    console.log('   1. ' + t('init.setup.opt_single') + (this.config.structure === 'single' ? recommended : ''));
    console.log('   2. ' + t('init.setup.opt_modular') + (this.config.structure !== 'single' ? recommended : ''));
    console.log('   3. ' + t('init.setup.opt_existing'));

    const structureChoice = await ask('\n' + t('init.setup.choice_prompt'));
    
    let structure = 'modular';
    if (structureChoice === '1') structure = 'single';
    else if (structureChoice === '2') structure = 'modular';
    else structure = 'existing';

    let duplicateStructure = true;
    let perLanguage = [];
    if (structure !== 'existing') {
      const duplicateChoice = await ask('\n' + t('init.setup.apply_all_prompt'));
      duplicateStructure = duplicateChoice.toLowerCase() === 'y' || duplicateChoice.toLowerCase() === 'yes';
      if (!duplicateStructure) {
        // Prompt for languages to include/exclude
        console.log(t('init.setup.per_language_intro'));
        const available = Object.keys(LANGUAGE_CONFIG).join(', ');
        console.log(t('init.setup.available_languages', { languages: available }));
        const includeAns = await ask(t('init.setup.include_prompt'));
        perLanguage = includeAns.split(',').map(l => l.trim().toLowerCase()).filter(Boolean);
      }
    }

    return { structure, duplicateStructure, perLanguage };
  }

  // Enhanced initialization with dependency checking
  async initialize(hasI18n = true, args = {}) {
    console.log(t('init.initializingProject'));
    
    if (!hasI18n) {
      console.log(t('init.warningProceedingWithoutFramework'));
      console.log(t('init.translationFilesCreatedWarning'));
    }
    
    // Get setup configuration
    const setupConfig = await this.promptSetupConfiguration(args.noPrompt);
    
    // Handle directory selection and structure setup
    const selectedDir = await this.detectAndSelectDirectory(args.noPrompt);
    if (selectedDir) {
      this.config.sourceDir = selectedDir;
      this.sourceDir = path.resolve(selectedDir);
      this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
      if (!this.announcedExistingDir) {
        console.log(t('init.usingExistingDirectory', { dir: selectedDir }));
        this.announcedExistingDir = true;
      }
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
      console.log(t('init.noTargetLanguagesSpecified'));
      return;
    }
    
    console.log('\n' + t('init.targetLanguages', { languages: targetLanguages.map(lang => `${lang} (${LANGUAGE_CONFIG[lang]?.name || 'Unknown'})`).join(', ') }));
    
    // Get source files
    const sourceFiles = this.getSourceFiles();
    console.log('\n' + t('init.foundSourceFiles', { count: sourceFiles.length }));
    
    // Process each language
    const results = {};
    
    for (const targetLanguage of targetLanguages) {
      console.log('\n' + t('init.processingLanguage', { language: targetLanguage, name: LANGUAGE_CONFIG[targetLanguage]?.name || 'Unknown' }));
      
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
        
        const sourceContent = this.format.read(sourceContentRaw);
        
        const targetFilePath = await this.createLanguageFile(sourceFile, targetLanguage, sourceContent);
        
        // Get stats for this file
        const targetContentRaw = await SecurityUtils.safeReadFile(targetFilePath, process.cwd());
        if (!targetContentRaw) {
          SecurityUtils.logSecurityEvent('Failed to read target file for stats', 'error', { file: targetFilePath });
          continue;
        }
        
        const targetContent = this.format.read(targetContentRaw);
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
        
        console.log(t('init.fileProcessingResult', { file: sourceFile, translated: stats.translated, total: stats.total, percentage: stats.percentage }));
      }
      
      // Calculate overall percentage
      languageResults.totalStats.percentage = languageResults.totalStats.total > 0 
        ? Math.round((languageResults.totalStats.translated / languageResults.totalStats.total) * 100) 
        : 0;
      
      results[targetLanguage] = languageResults;
      
      console.log(t('init.overallProgress', { translated: languageResults.totalStats.translated, total: languageResults.totalStats.total, percentage: languageResults.totalStats.percentage }));
    }
    
    // Generate and display completion summary
    await this.generateCompletionSummary(results, targetLanguages);
    
    console.log('\n' + t('init.initializationCompletedSuccessfully'));
    console.log('\n' + t('init.nextStepsTitle'));
    console.log(t('init.nextStep1'));
    console.log(t('init.nextStep2'));
    console.log(t('init.nextStep3'));
  }

  // Generate completion summary with proper error handling
  async generateCompletionSummary(results, targetLanguages) {
    try {
      console.log('\n' + '='.repeat(50));
      console.log(t('init.initializationSummaryTitle'));
      console.log(t('common.separator'));

      let totalChanges = 0;
      let languagesProcessed = 0;
      let missingKeysAdded = 0;

      Object.entries(results || {}).forEach(([lang, data]) => {
        if (!data || typeof data !== 'object') return;

        const langName = LANGUAGE_CONFIG[lang]?.name || 'Unknown';
        const stats = data.totalStats || { total: 0, translated: 0, percentage: 0, missing: 0 };

        const statusIcon = stats.percentage === 100 ? '✅' : stats.percentage >= 80 ? '🟡' : '🔴';

        console.log(
          t('init.languageSummary', {
            icon: statusIcon,
            name: langName,
            code: lang,
            percentage: stats.percentage || 0,
          })
        );

        if (data.files && Array.isArray(data.files)) {
          console.log(t('init.languageFiles', { count: data.files.length }));
        }

        console.log(
          t('init.languageKeys', {
            translated: stats.translated || 0,
            total: stats.total || 0,
          })
        );

        console.log(t('init.languageMissing', { count: stats.missing || 0 }));

        totalChanges += (stats.translated || 0) + (stats.missing || 0);
        languagesProcessed += 1;
        missingKeysAdded += stats.missing || 0;
      });

      console.log('\n📊 COMPLETION SUMMARY');
      console.log(t('common.separator'));
      console.log(`📝 Total changes: ${totalChanges}`);
      console.log(`🌍 Languages processed: ${languagesProcessed}`);
      console.log(`➕ Missing keys added: ${missingKeysAdded}`);

      if (process.stdin.isTTY && !this.config?.noPrompt) {
        const { ask } = require('../utils/cli');
        const generateReport = await ask('\n🤖 Would you like a report generated? (Y/N): ');
        if (generateReport.toLowerCase() === 'y' || generateReport.toLowerCase() === 'yes') {
          await this.generateDetailedReport(results, targetLanguages);
        }
      }
    } catch (error) {
      console.error('\n❌ Error during completion:', error.message);
      console.log('📊 COMPLETION SUMMARY (Basic)');
      console.log(t('common.separator'));
      console.log(`🌍 Languages processed: ${Object.keys(results || {}).length}`);
    }
  }

  // Generate detailed report
  async generateDetailedReport(results, targetLanguages) {
    try {
      const outputDir = this.config.outputDir || path.join(process.cwd(), 'i18ntk-reports');
      if (!SecurityUtils.safeExistsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const reportPath = path.join(outputDir, 'init-report.json');
      const report = {
        timestamp: new Date().toISOString(),
        languages: targetLanguages,
        results: results,
        summary: {
          languagesProcessed: targetLanguages.length,
          totalFiles: Object.values(results).reduce((sum, data) => sum + (data.files?.length || 0), 0),
          totalKeys: Object.values(results).reduce((sum, data) => sum + (data.totalStats?.total || 0), 0),
          totalMissing: Object.values(results).reduce((sum, data) => sum + (data.totalStats?.missing || 0), 0)
        }
      };

      await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`✅ Report generated: ${reportPath}`);
    } catch (error) {
      console.error('❌ Failed to generate report:', error.message);
    }
  }

  // Offer interactive locale optimization after initialization
  async offerLocaleOptimization() {
    try {
      console.log('\n' + '='.repeat(60));
      console.log('🎯 **PACKAGE SIZE OPTIMIZATION**');
      console.log('='.repeat(60));
      
      try {
        // Import locale optimizer directly
        const LocaleOptimizer = require('../scripts/locale-optimizer');
        
        // First run dry run to show current state
        console.log('\n🔍 Running locale optimization preview...');
        const optimizer = new LocaleOptimizer();
        await optimizer.run({ dryRun: true });

        console.log('\n💡 You can reduce package size by selecting only the languages you need');
        
        const answer = await this.prompt('\n🤖 Would you like to run interactive optimization now? (y/n): ');
        
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          console.log('\n🚀 Starting interactive locale optimization...');
          await optimizer.run({ interactive: true });
          console.log('\n✅ Package optimization completed!');
        } else {
          console.log('\n💡 You can run locale optimization later with:');
          console.log('   node scripts/locale-optimizer.js --interactive');
        }
      } catch (error) {
        console.log('\n⚠️ Could not offer locale optimization:', error.message);
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

      // On first run, prompt user for preferred UI language
      if (!SecurityUtils.safeExistsSync(configManager.CONFIG_PATH)) {
        const { getGlobalReadline } = require('../utils/cli');
        getGlobalReadline();
        const selectedLang = await this.ui.selectLanguage();
        loadTranslations(selectedLang);
      }
      // Initialize configuration properly when called from menu
      if (fromMenu && !this.sourceDir) {
        const baseConfig = await getUnifiedConfig('init', args);
        this.config = { ...baseConfig, ...this.config };
        
        this.sourceDir = this.config.sourceDir;
        this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
        
        // Load translations for UI messages
      const uiLanguage = this.config.uiLanguage || 'en';
      const { loadTranslations } = require('../utils/i18n-helper');
      loadTranslations(uiLanguage, path.resolve(__dirname, '..', 'resources', 'i18n', 'ui-locales'));
      }
      
      // Setup is now handled centrally by config manager

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
        console.log('\n' + t('adminCli.authRequiredForOperation', { operation: 'initialize i18n project' }));
        const cliHelper = require('../utils/cli-helper');
        const pin = await cliHelper.promptPin(t('adminCli.enterPin'));
        const isValid = await this.adminAuth.verifyPin(pin);
        
        if (!isValid) {
          console.log(t('adminCli.invalidPin'));
          if (!fromMenu) process.exit(1);
          return;
        }
        
        console.log(t('adminCli.authenticationSuccess'));
      }

      // Check i18n dependencies first and exit if user chooses not to continue
      const hasI18n = await this.checkI18nDependencies(args.noPrompt);
      
      if (!hasI18n) {
        console.log(t('init.errors.noFramework'));
        console.log(t('init.suggestions.installFramework'));
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
      console.error(t('init.errors.initializationFailed', { error: error.message }));
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
      loadTranslations(uiLanguage, path.resolve(__dirname, '..', 'resources', 'i18n', 'ui-locales'));
      
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
    const args = parseCommonArgs(process.argv.slice(2));
    const prompt = createPrompt({ noPrompt: args.noPrompt });
    try {
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
      if (args.languages) {
        config.defaultLanguages = args.languages;
      }

      const initializer = new I18nInitializer({ ...config, noPrompt: args.noPrompt });
      initializer.promptInstance = prompt;

      if (args.noPrompt) {
        await initializer.runNonInteractive();
      } else {
        await initializer.run();
      }

    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    } finally {
      if (prompt && typeof prompt.close === 'function') {
        prompt.close();
      }
    }
  }

  main();
}
