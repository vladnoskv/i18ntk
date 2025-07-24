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
  setupInitialStructure() {
    // Create source directory if it doesn't exist
    if (!fs.existsSync(this.sourceDir)) {
      console.log(`📁 Creating source directory: ${this.sourceDir}`);
      fs.mkdirSync(this.sourceDir, { recursive: true });
    }
    
    // Create source language directory if it doesn't exist
    if (!fs.existsSync(this.sourceLanguageDir)) {
      console.log(`📁 Creating source language directory: ${this.sourceLanguageDir}`);
      fs.mkdirSync(this.sourceLanguageDir, { recursive: true });
      
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
      
      const sampleFilePath = path.join(this.sourceLanguageDir, 'common.json');
      fs.writeFileSync(sampleFilePath, JSON.stringify(sampleTranslations, null, 2), 'utf8');
      console.log(`✅ Created sample translation file: ${sampleFilePath}`);
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

  // Create or update a language file
  createLanguageFile(sourceFile, targetLanguage, sourceContent) {
    const targetDir = path.join(this.sourceDir, targetLanguage);
    const targetFile = path.join(targetDir, sourceFile);
    
    // Create target directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    let targetContent;
    
    // If target file exists, preserve existing translations
    if (fs.existsSync(targetFile)) {
      try {
        const existingContent = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
        targetContent = this.mergeTranslations(sourceContent, existingContent);
      } catch (error) {
        console.warn(`⚠️  Warning: Could not parse existing file ${targetFile}, creating new one`);
        targetContent = this.markAsNotTranslated(sourceContent);
      }
    } else {
      targetContent = this.markAsNotTranslated(sourceContent);
    }
    
    // Write the file
    fs.writeFileSync(targetFile, JSON.stringify(targetContent, null, 2), 'utf8');
    
    return targetFile;
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

  // Interactive language selection
  async selectLanguages() {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
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
          const sourceContent = JSON.parse(fs.readFileSync(sourceFilePath, 'utf8'));
          
          const targetFilePath = this.createLanguageFile(sourceFile, targetLanguage, sourceContent);
          
          // Get stats for this file
          const targetContent = JSON.parse(fs.readFileSync(targetFilePath, 'utf8'));
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