#!/usr/bin/env node
/**
 * I18N TRANSLATION COMPLETION SCRIPT
 * 
 * This script automatically adds missing translation keys to achieve 100% coverage.
 * It reads the usage analysis and adds all missing keys with proper markers.
 * 
 * Usage:
 *   node scripts/i18n/05-complete-translations.js
 *   node scripts/i18n/05-complete-translations.js --auto-translate
 *   node scripts/i18n/05-complete-translations.js --source-dir=./src/i18n/locales
 */

const fs = require('fs');
const path = require('path');

// Default configuration
const DEFAULT_CONFIG = {
  sourceDir: './locales',
  sourceLanguage: 'en',
  notTranslatedMarker: '__NOT_TRANSLATED__',
  excludeFiles: ['.DS_Store', 'Thumbs.db']
};

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
    this.config = { ...DEFAULT_CONFIG, ...config };
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
          console.warn(`⚠️  Warning: Could not parse ${filePath}, creating new structure`);
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
      console.log('🗑️  Deleting old usage analysis report...');
      fs.unlinkSync(usageReportPath);
    }
    
    // Generate fresh usage analysis report
    console.log('🔄 Generating fresh usage analysis...');
    const { execSync } = require('child_process');
    try {
      execSync('node scripts/i18n/package/04-check-usage.js --output-report', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
    } catch (error) {
      console.log('⚠️  Could not generate usage analysis. Using common missing keys.');
      return Object.keys(COMMON_MISSING_KEYS);
    }
    
    if (!fs.existsSync(usageReportPath)) {
      console.log('⚠️  Usage analysis report not found after generation. Using common missing keys.');
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
      
      console.log(`📊 Found ${missingKeys.length} missing keys from usage analysis`);
      return missingKeys.length > 0 ? missingKeys : Object.keys(COMMON_MISSING_KEYS);
    } catch (error) {
      console.log('⚠️  Could not parse usage analysis. Using common missing keys.');
      return Object.keys(COMMON_MISSING_KEYS);
    }
  }

  // Run the completion process
  async run() {
    const args = this.parseArgs();
    
    if (args.sourceDir) {
      this.config.sourceDir = args.sourceDir;
      this.sourceDir = path.resolve(this.config.sourceDir);
      this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
    }
    
    console.log('🔧 I18N TRANSLATION COMPLETION TOOL');
    console.log('============================================================');
    console.log(`📁 Source directory: ${this.sourceDir}`);
    console.log(`🔤 Source language: ${this.config.sourceLanguage}`);
    
    if (args.dryRun) {
      console.log('🧪 DRY RUN MODE - No files will be modified');
    }
    
    try {
      // Get available languages
      const languages = this.getAvailableLanguages();
      console.log(`🌐 Languages: ${languages.join(', ')}`);
      
      // Get missing keys from usage analysis or use common keys
      const missingKeys = this.getMissingKeysFromUsage();
      console.log(`⚠️  Adding ${missingKeys.length} missing translation keys`);
      
      let totalChanges = 0;
      
      // Process each language
      for (const language of languages) {
        console.log(`\n🔄 Processing ${language}...`);
        
        const changes = this.addMissingKeysToLanguage(language, missingKeys, args.dryRun);
        
        if (changes.length > 0) {
          console.log(`   ✅ Added ${changes.length} keys`);
          totalChanges += changes.length;
          
          // Show sample of changes
          const sampleChanges = changes.slice(0, 3);
          sampleChanges.forEach(change => {
            console.log(`      📝 ${change.file}: ${change.key}`);
          });
          
          if (changes.length > 3) {
            console.log(`      ... and ${changes.length - 3} more`);
          }
        } else {
          console.log(`   ✅ No changes needed`);
        }
      }
      
      console.log('\n============================================================');
      console.log('📊 COMPLETION SUMMARY');
      console.log('============================================================');
      console.log(`✅ Total changes: ${totalChanges}`);
      console.log(`🌐 Languages processed: ${languages.length}`);
      console.log(`📄 Missing keys added: ${missingKeys.length}`);
      
      if (!args.dryRun) {
        console.log('\n📋 NEXT STEPS');
        console.log('============================================================');
        console.log('1. Run usage analysis to verify 100% coverage:');
        console.log('   node scripts/i18n/04-check-usage.js --output-reports');
        console.log('2. Validate all translations:');
        console.log('   node scripts/i18n/03-validate-translations.js');
        console.log('3. Run analysis for overall statistics:');
        console.log('   node scripts/i18n/02-analyze-translations.js');
        console.log('\n🎯 All actually used translation keys are now available!');
      } else {
        console.log('\n💡 Run without --dry-run to apply changes');
      }
      
    } catch (error) {
      console.error('❌ Error during completion:', error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const tool = new I18nCompletionTool();
  tool.run().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = I18nCompletionTool;