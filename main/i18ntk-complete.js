#!/usr/bin/env node
/**
 * I18N TRANSLATION COMPLETION SCRIPT
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
const { execSync } = require('child_process');
const SecurityUtils = require('../utils/security');
const settingsManager = require('../settings/settings-manager');

// Get configuration from settings manager securely
async function getConfig() {
  try {
    const settings = await settingsManager.getSettings();
    const config = {
      sourceDir: settings.directories?.sourceDir || './locales',
      sourceLanguage: settings.directories?.sourceLanguage || 'en',
      notTranslatedMarker: settings.directories?.notTranslatedMarker || 'NOT_TRANSLATED',
      excludeFiles: settings.processing?.excludeFiles || ['.DS_Store', 'Thumbs.db']
    };
    
    // Basic validation for required fields
    if (!config.sourceDir || !config.sourceLanguage) {
      throw new Error('Configuration validation failed: missing required fields');
    }
    
    SecurityUtils.logSecurityEvent('Configuration loaded successfully', 'info');
    return config;
  } catch (error) {
    SecurityUtils.logSecurityEvent('Configuration loading failed', 'error', { error: error.message });
    throw error;
  }
}

// Common missing keys that should be added to all projects
const COMMON_MISSING_KEYS = {
  // Offline/Network
  'offlineTitle': 'You are offline',
  'offlineMessage': 'Please check your internet connection',
  'tryReconnect': 'Try to reconnect',
  
  // Common UI
  'common': 'Common',
  'logout': 'Logout',
  'login': 'Login',
  'amount': 'Amount',
  
  // Pagination
  'pagination.showing': 'Showing',
  'pagination.of': 'of',
  'pagination.items': 'items',
  'pagination.rowsPerPage': 'Rows per page',
  
  // Report Generator
  'reportGenerator:reportTypes.prospects': 'Prospects Report',
  'reportGenerator:reportTypes.activities': 'Activities Report',
  'reportGenerator:reportTypes.goals': 'Goals Report',
  'reportGenerator:reportTypes.team': 'Team Report',
  'reportGenerator:reportTypes.hotLeads': 'Hot Leads Report',
  
  'reportGenerator:timePeriods.allTime': 'All Time',
  'reportGenerator:timePeriods.last7days': 'Last 7 Days',
  'reportGenerator:timePeriods.last30days': 'Last 30 Days',
  'reportGenerator:timePeriods.thisYear': 'This Year',
  
  'reportGenerator:layouts.summary': 'Summary Layout',
  'reportGenerator:layouts.detailed': 'Detailed Layout',
  'reportGenerator:layouts.visual_charts': 'Visual Charts Layout',
  
  // Common time periods
  'common:timePeriods.customRange': 'Custom Range',
  
  // Auth
  'auth:supabaseNotConfigured': 'Supabase is not configured',
  
  // Common values
  'common:unknownUser': 'Unknown User',
  'common:notSet': 'Not Set',
  
  // Validation
  'validationStep.invalidEmailFormat': 'Invalid email format',
  
  // Admin
  'announcement_id': 'Announcement ID',
  'last_sign_in_at': 'Last Sign In'
};

class I18nCompletionTool {
  constructor(config = {}) {
    this.config = config;
    this.sourceDir = null;
    this.sourceLanguageDir = null;
    
    // Initialize UI i18n for console messages
    const UIi18n = require('./ui-i18n');
    this.ui = new UIi18n();
    this.t = this.ui.t.bind(this.ui);
  }
  
  async initialize() {
    const baseConfig = await getConfig();
    this.config = { ...baseConfig, ...this.config };
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
        if (key === 'source-dir') {
          parsed.sourceDir = value;
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
    
    return fs.readdirSync(this.sourceDir)
      .filter(item => {
        const itemPath = path.join(this.sourceDir, item);
        return fs.statSync(itemPath).isDirectory();
      });
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
    const parts = keyPath.split('.');
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
    const keys = keyPath.split('.');
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
    const keys = keyPath.split('.');
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
          console.warn(this.t("completeTranslations.warning_could_not_parse_filepa", { filePath })); ;
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
    // Use English as base value from COMMON_MISSING_KEYS or generate from key
    const baseValue = COMMON_MISSING_KEYS[keyPath] || this.generateValueFromKey(keyPath);
    
    // For source language, use the base value (never use namespace prefix)
    if (language === this.config.sourceLanguage) {
      return baseValue;
    }
    
    // For other languages, use the not translated marker
    return 'NOT_TRANSLATED';
  }

  // Generate a readable value from a key path
  generateValueFromKey(keyPath) {
    // Extract the last part of the key (after dots and colons)
    const keyName = keyPath.split('.').pop().split(':').pop();
    
    // Convert camelCase to readable text
    const readable = keyName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
    
    // Never return the namespace prefix as the value
    return readable || keyName;
  }

  // Get missing keys from usage analysis
  getMissingKeysFromUsage() {
    const usageReportPath = path.join(process.cwd(), 'scripts', 'i18n', 'reports', 'usage-analysis.txt');
    
    // Delete old report to ensure fresh data
    if (fs.existsSync(usageReportPath)) {
      console.log(this.t("operations.complete.deletingOldReport"));
      fs.unlinkSync(usageReportPath);
    }
    
    // Generate fresh usage analysis report
    console.log(this.t("operations.complete.generatingFreshAnalysis"));
    const { execSync } = require('child_process');
    try {
      execSync('node main/i18ntk-usage.js --output-report', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
    } catch (error) {
      console.log(this.t("operations.complete.couldNotGenerate"));
      return Object.keys(COMMON_MISSING_KEYS);
    }
    
    if (!fs.existsSync(usageReportPath)) {
      console.log(this.t("operations.complete.reportNotFound"));
      return Object.keys(COMMON_MISSING_KEYS);
    }
    
    try {
      const reportContent = fs.readFileSync(usageReportPath, 'utf8');
      const missingKeys = [];
      
      // Extract missing keys from the report
      const lines = reportContent.split('\n');
      let inMissingSection = false;
      
      for (const line of lines) {
        if (line.includes('MISSING TRANSLATION KEYS')) {
          inMissingSection = true;
          continue;
        }
        
        if (inMissingSection) {
          // Stop when we reach another section
          if (line.includes('DYNAMIC KEYS') || line.includes('USED KEYS') || line.includes('UNUSED KEYS')) {
            break;
          }
          
          // Extract key from lines like "⚠️  offlineTitle"
          const match = line.match(/^⚠️\s+(.+)$/);
          if (match) {
            const key = match[1].trim();
            // Skip lines that are file paths or other metadata
            if (!key.includes('Used in:') && !key.includes('📄') && key.length > 0 && !missingKeys.includes(key)) {
              missingKeys.push(key);
            }
          }
        }
      }
      
      console.log(this.t("operations.complete.foundMissingKeys", { count: missingKeys.length }));
      return missingKeys.length > 0 ? missingKeys : Object.keys(COMMON_MISSING_KEYS);
    } catch (error) {
      console.log(this.t("operations.complete.couldNotParse"));
      return Object.keys(COMMON_MISSING_KEYS);
    }
  }

  // Run the completion process
  async run() {
    SecurityUtils.logSecurityEvent('I18n completion tool started', 'info', { 
      version: '1.3.7',
      nodeVersion: process.version,
      platform: process.platform
    });
    
    await this.initialize();
    
    const args = this.parseArgs();
    
    if (args.sourceDir) {
      this.config.sourceDir = args.sourceDir;
      this.sourceDir = path.resolve(this.config.sourceDir);
      this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
    }
    
    console.log(this.t("operations.complete.title"));
    console.log(this.t("operations.complete.separator"));
    console.log(this.t("operations.complete.sourceDir", { sourceDir: this.sourceDir }));
    console.log(this.t("operations.complete.sourceLanguage", { sourceLanguage: this.config.sourceLanguage }));
    
    if (args.dryRun) {
      console.log(this.t("operations.complete.dryRunMode"));
    }
    
    try {
      // Get available languages
      const languages = this.getAvailableLanguages();
      console.log(this.t("operations.complete.languages", { languages: languages.join(', ') }));
      
      // Get missing keys from usage analysis or use common keys
      const missingKeys = this.getMissingKeysFromUsage();
      console.log(this.t("operations.complete.addingMissingKeys"));
      
      let totalChanges = 0;
      
      // Process each language
      for (const language of languages) {
        console.log(this.t("operations.complete.processing", { language }));
        
        const changes = this.addMissingKeysToLanguage(language, missingKeys, args.dryRun);
        
        if (changes.length > 0) {
          console.log(this.t("operations.complete.addedKeys", { count: changes.length }));
          totalChanges += changes.length;
          
          // Show sample of changes
          const sampleChanges = changes.slice(0, 3);
          sampleChanges.forEach(change => {
            console.log(this.t("operations.complete.changeDetails", { file: change.file, key: change.key }));
          });
          
          if (changes.length > 3) {
            console.log(this.t("complete.andMore", { count: changes.length - 3 }));
          }
        } else {
          console.log(this.t("operations.complete.noChangesNeeded", { language }));
        }
      }
      
      console.log('\n');
      console.log(this.t("operations.complete.summaryTitle"));
      console.log(this.t("operations.complete.separator"));
      console.log(this.t("operations.complete.totalChanges", { totalChanges }));
      console.log(this.t("operations.complete.languagesProcessed", { languagesProcessed: languages.length }));
      console.log(this.t("operations.complete.missingKeysAdded", { missingKeysAdded: missingKeys.length }));
      
      if (!args.dryRun) {
        console.log('\n' + this.t("operations.complete.nextStepsTitle"));
        console.log(this.t("operations.complete.separator"));
        console.log(this.t("operations.complete.nextStep1"));
        console.log('   node i18ntk-usage.js --output-report');
        console.log(this.t("complete.nextStep2"));
        console.log('   node i18ntk-validate.js');
        console.log(this.t("complete.nextStep3"));
        console.log('   node i18ntk-analyze.js');
        console.log('\n' + this.t("operations.complete.allKeysAvailable"));
      } else {
        console.log('\n' + this.t("operations.complete.runWithoutDryRun"));
      }
      
      // Only prompt when run from the menu (i.e., when a callback or menu context is present)
      if (typeof this.prompt === "function" && args.fromMenu) {
        console.log(this.ui.t('operations.completed'));
        await this.prompt(this.ui.t('hardcodedTexts.pressEnterToContinue'));
      }
      
    } catch (error) {
      console.error('Error during completion:', error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const tool = new I18nCompletionTool();
  tool.run().catch(error => {
    console.error('Fatal error:', error.message);
    SecurityUtils.logSecurityEvent('I18n completion tool failed', 'error', { error: error.message });
    process.exit(1);
  });
}

module.exports = I18nCompletionTool;