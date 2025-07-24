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
const settingsManager = require('./settings-manager');
const SecurityUtils = require('./utils/security');
const AdminAuth = require('./utils/admin-auth');

// Get configuration from settings manager
function getConfig() {
  const settings = settingsManager.getSettings();
  return {
    sourceDir: settings.directories?.sourceDir || './locales',
    sourceLanguage: settings.directories?.sourceLanguage || 'en',
    defaultLanguages: settings.processing?.defaultLanguages || ['de', 'es', 'fr', 'ru'],
    notTranslatedMarker: settings.processing?.notTranslatedMarker || 'NOT_TRANSLATED',
    excludeFiles: settings.processing?.excludeFiles || ['.DS_Store', 'Thumbs.db']
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
    this.config = { ...getConfig(), ...config };
    this.sourceDir = path.resolve(this.config.sourceDir);
    this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
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
      console.log(`📁 Creating source directory: ${validatedSourceDir}`);
      fs.mkdirSync(validatedSourceDir, { recursive: true });
      SecurityUtils.logSecurityEvent('Source directory created', 'info', { dir: validatedSourceDir });
    }
    
    // Create source language directory if it doesn't exist
    if (!fs.existsSync(validatedSourceLanguageDir)) {
      console.log(`📁 Creating source language directory: ${validatedSourceLanguageDir}`);
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
        console.log(`✅ Created sample translation file: ${validatedSampleFilePath}`);
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
    
    console.log('\n🔐 ADMIN PIN SETUP (OPTIONAL)');
    console.log('=' .repeat(50));
    console.log('Admin PIN protection adds security for sensitive operations like:');
    console.log('• Deleting translation files');
    console.log('• Modifying project configuration');
    console.log('• Running administrative commands');
    
    const setupPin = await question('\nWould you like to set up an admin PIN? (y/N): ');
    
    if (setupPin.toLowerCase() === 'y' || setupPin.toLowerCase() === 'yes') {
      try {
        const adminAuth = new AdminAuth();
        
        // Enable admin PIN in settings
        settingsManager.setSecurity({ adminPinEnabled: true, adminPinPromptOnInit: true });
        
        console.log('\n📝 Setting up admin PIN...');
        
        let pin1, pin2;
        do {
          pin1 = await question('Enter admin PIN (4-8 digits): ');
          
          if (!/^\d{4,8}$/.test(pin1)) {
            console.log('❌ PIN must be 4-8 digits only. Please try again.');
            continue;
          }
          
          pin2 = await question('Confirm admin PIN: ');
          
          if (pin1 !== pin2) {
            console.log('❌ PINs do not match. Please try again.');
          }
        } while (pin1 !== pin2 || !/^\d{4,8}$/.test(pin1));
        
        await adminAuth.setupPin(pin1);
        console.log('✅ Admin PIN has been set up successfully!');
        console.log('🔒 Admin protection is now enabled for sensitive operations.');
        
      } catch (error) {
        console.error('❌ Error setting up admin PIN:', error.message);
        console.log('⚠️  Continuing without admin PIN protection.');
      }
    } else {
      console.log('⏭️  Skipping admin PIN setup. You can set it up later using the settings.');
    }
    
    rl.close();
  }

  // Interactive language selection
  async selectLanguages() {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
      historySize: 0
    });
    
    const question = (query) => new Promise(resolve => rl.question(query, resolve));
    
    console.log('\n🌍 I18N LANGUAGE SELECTION');
    console.log('=' .repeat(50));
    console.log('Available languages:');
    
    Object.entries(LANGUAGE_CONFIG).forEach(([code, config], index) => {
      console.log(`  ${(index + 1).toString().padStart(2)}. ${code} - ${config.name} (${config.nativeName})`);
    });
    
    console.log(`\n📋 Default languages: ${this.config.defaultLanguages.join(', ')}`);
    
    const answer = await question('\nEnter language codes (comma-separated) or press Enter for defaults: ');
    rl.close();
    
    if (answer.trim() === '') {
      return this.config.defaultLanguages;
    }
    
    const selectedLanguages = answer.split(',').map(lang => lang.trim().toLowerCase());
    const validLanguages = selectedLanguages.filter(lang => LANGUAGE_CONFIG[lang]);
    const invalidLanguages = selectedLanguages.filter(lang => !LANGUAGE_CONFIG[lang]);
    
    if (invalidLanguages.length > 0) {
      console.warn(`⚠️  Warning: Invalid language codes ignored: ${invalidLanguages.join(', ')}`);
    }
    
    return validLanguages.length > 0 ? validLanguages : this.config.defaultLanguages;
  }

  // Main initialization process
  async init() {
    try {
      console.log('🚀 I18N INITIALIZATION');
      console.log('=' .repeat(50));
      
      // Parse command line arguments
      const args = this.parseArgs();
      if (args.sourceDir) this.config.sourceDir = args.sourceDir;
      if (args.sourceLanguage) this.config.sourceLanguage = args.sourceLanguage;
      
      // Update paths
      this.sourceDir = path.resolve(this.config.sourceDir);
      this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
      
      console.log(`📁 Source directory: ${this.sourceDir}`);
      console.log(`🔤 Source language: ${this.config.sourceLanguage}`);
      
      // Setup initial structure if needed
      this.setupInitialStructure();
      
      // Validate source
      this.validateSource();
      
      // Prompt for admin PIN setup if not already configured
      const securitySettings = settingsManager.getSecurity();
      
      if (!securitySettings.adminPinEnabled && securitySettings.adminPinPromptOnInit !== false) {
        await this.promptAdminPinSetup();
      }
      
      // Get target languages
      const targetLanguages = args.languages || await this.selectLanguages();
      
      if (targetLanguages.length === 0) {
        console.log('❌ No target languages specified. Exiting.');
        return;
      }
      
      console.log(`\n🎯 Target languages: ${targetLanguages.map(lang => `${lang} (${LANGUAGE_CONFIG[lang]?.name || 'Unknown'})`).join(', ')}`);
      
      // Get source files
      const sourceFiles = this.getSourceFiles();
      console.log(`\n📄 Found ${sourceFiles.length} source files: ${sourceFiles.join(', ')}`);
      
      // Process each language
      const results = {};
      
      for (const targetLanguage of targetLanguages) {
        console.log(`\n🔄 Processing ${targetLanguage} (${LANGUAGE_CONFIG[targetLanguage]?.name || 'Unknown'})...`);
        
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
          
          console.log(`   ✅ ${sourceFile}: ${stats.translated}/${stats.total} (${stats.percentage}%)`);
        }
        
        // Calculate overall percentage
        languageResults.totalStats.percentage = languageResults.totalStats.total > 0 
          ? Math.round((languageResults.totalStats.translated / languageResults.totalStats.total) * 100) 
          : 0;
        
        results[targetLanguage] = languageResults;
        
        console.log(`   📊 Overall: ${languageResults.totalStats.translated}/${languageResults.totalStats.total} (${languageResults.totalStats.percentage}%)`);
      }
      
      // Summary report
      console.log('\n' + '=' .repeat(50));
      console.log('📊 INITIALIZATION SUMMARY');
      console.log('=' .repeat(50));
      
      Object.entries(results).forEach(([lang, data]) => {
        const langName = LANGUAGE_CONFIG[lang]?.name || 'Unknown';
        const statusIcon = data.totalStats.percentage === 100 ? '✅' : data.totalStats.percentage >= 80 ? '🟡' : '🔴';
        
        console.log(`${statusIcon} ${langName} (${lang}): ${data.totalStats.percentage}% complete`);
        console.log(`   📄 Files: ${data.files.length}`);
        console.log(`   🔤 Keys: ${data.totalStats.translated}/${data.totalStats.total}`);
        console.log(`   ⚠️  Missing: ${data.totalStats.missing}`);
      });
      
      console.log('\n🎉 Initialization completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('1. Run: node scripts/i18n/02-analyze-translations.js');
      console.log('2. Translate missing values in language files');
      console.log('3. Run: node scripts/i18n/03-validate-translations.js');
      
    } catch (error) {
      console.error('❌ Error during initialization:', error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const initializer = new I18nInitializer();
  initializer.init();
}

module.exports = I18nInitializer;