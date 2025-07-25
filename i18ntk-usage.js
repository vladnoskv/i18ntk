#!/usr/bin/env node
/**
 * I18N USAGE ANALYSIS TOOLKIT - Version 1.4.0
 * 
 * This script analyzes source code to find unused translation keys,
 * missing translations, and provides comprehensive translation completeness analysis.
 * 
 * NEW in v1.4.0:
 * - Modular folder structure support
 * - Recursive translation file discovery
 * - NOT_TRANSLATED analysis
 * - Enhanced reporting with completeness statistics
 * 
 * Usage:
 *   npm run i18ntk:usage
 *   npm run i18ntk:usage -- --source-dir=./src
 *   npm run i18ntk:usage -- --i18n-dir=./src/i18n/locales
 *   npm run i18ntk:usage -- --output-report
 * 
 * Alternative direct usage:
 *   node i18ntk-usage.js
 */

const fs = require('fs');
const path = require('path');
const { loadTranslations, t } = require('./utils/i18n-helper');
const settingsManager = require('./settings-manager');
const SecurityUtils = require('./utils/security');
const AdminCLI = require('./utils/admin-cli');

// Enhanced configuration with multiple source directory detection
async function getConfig() {
  try {
    const settings = settingsManager.getSettings();
    
    // Multiple possible source directories to check
    const possibleSourceDirs = [
      './src',
      './app', 
      './components',
      './pages',
      './views',
      './client',
      './frontend',
      './' // Current directory as fallback
    ];
    
    // Auto-detect source directory
    let detectedSourceDir = './src'; // Default
    for (const dir of possibleSourceDirs) {
      if (fs.existsSync(dir)) {
        // Check if directory contains code files
        try {
          const files = fs.readdirSync(dir);
          const hasCodeFiles = files.some(file => 
            ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'].includes(path.extname(file))
          );
          if (hasCodeFiles) {
            detectedSourceDir = dir;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }
    }
    
    // Multiple possible i18n directories
    const possibleI18nDirs = [
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
    ];
    
    // Auto-detect i18n directory
    let detectedI18nDir = './locales'; // Default
    for (const dir of possibleI18nDirs) {
      if (fs.existsSync(dir)) {
        // Check if directory contains language subdirectories or JSON files
        try {
          const items = fs.readdirSync(dir);
          const hasLanguageDirs = items.some(item => {
            const itemPath = path.join(dir, item);
            if (fs.statSync(itemPath).isDirectory()) {
              return ['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'].includes(item);
            }
            return item.endsWith('.json');
          });
          if (hasLanguageDirs) {
            detectedI18nDir = dir;
            break;
          }
        } catch (error) {
          // Continue checking
        }
      }
    }
    
    const config = {
      sourceDir: settings.directories?.sourceDir || detectedSourceDir,
      i18nDir: settings.directories?.i18nDir || detectedI18nDir,
      sourceLanguage: settings.directories?.sourceLanguage || settings.sourceLanguage || 'en',
      outputDir: settings.directories?.outputDir || settings.outputDir || './i18n-reports',
      excludeDirs: settings.processing?.excludeDirs || [
        'node_modules', '.git', 'dist', 'build', '.next', '.nuxt', 
        'i18n-reports', 'reports', 'dev', 'utils', 'test', 'tests'
      ],
      includeExtensions: settings.processing?.includeExtensions || ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'],
      translationPatterns: settings.processing?.translationPatterns || [
        /t\(['"`]([^'"`]+)['"`]\)/g,
        /\$t\(['"`]([^'"`]+)['"`]\)/g,
        /i18n\.t\(['"`]([^'"`]+)['"`]\)/g,
        /useTranslation\(\).*t\(['"`]([^'"`]+)['"`]\)/g
      ]
    };
    
    console.log(`🔍 Detected source directory: ${config.sourceDir}`);
    console.log(`🔍 Detected i18n directory: ${config.i18nDir}`);
    
    return config;
  } catch (error) {
    throw new Error(`Configuration error: ${error.message}`);
  }
}

class I18nUsageAnalyzer {
  constructor(config = {}) {
    this.config = config;
    this.sourceDir = null;
    this.i18nDir = null;
    this.sourceLanguageDir = null;
    
    // Initialize class properties
    this.availableKeys = new Set();
    this.usedKeys = new Set();
    this.fileUsage = new Map();
    this.translationFiles = new Map(); // New: Track all translation files
    this.translationStats = new Map(); // New: Track translation completeness
    
    // Initialize UI i18n for console messages
    this.ui = require('./ui-i18n');
    this.t = this.ui.t.bind(this.ui);
  }

  async initialize() {
    try {
      const defaultConfig = await getConfig();
      this.config = { ...defaultConfig, ...this.config };
      
      // Resolve paths
      this.sourceDir = path.resolve(this.config.sourceDir);
      this.i18nDir = path.resolve(this.config.i18nDir);
      this.sourceLanguageDir = path.join(this.i18nDir, this.config.sourceLanguage);
      
      // Verify translation function
      if (typeof this.t !== 'function') {
        throw new Error('Translation function not properly initialized');
      }
      
      await SecurityUtils.logSecurityEvent('analyzer_initialized', { component: 'i18ntk-usage' });
    } catch (error) {
      await SecurityUtils.logSecurityEvent('analyzer_init_failed', { component: 'i18ntk-usage', error: error.message });
      throw error;
    }
  }

  // Parse command line arguments
  async parseArgs() {
    try {
      const args = process.argv.slice(2);
      const parsed = {};
      
      // Convert array to object for processing
      const argsObj = {};
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
          const key = arg.substring(2);
          if (key.includes('=')) {
            const [k, v] = key.split('=', 2);
            argsObj[k] = v;
          } else {
            argsObj[key] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
          }
        }
      }
      
      const validatedArgs = await SecurityUtils.validateCommandArgs(argsObj);
      
      // Process validated arguments
      for (const [key, value] of Object.entries(validatedArgs)) {
        if (key === 'source-dir' && value) {
          const sanitized = await SecurityUtils.sanitizeInput(value);
          const validated = SecurityUtils.validatePath(sanitized, process.cwd());
          if (validated) {
            parsed.sourceDir = validated;
          }
        } else if (key === 'i18n-dir' && value) {
          const sanitized = await SecurityUtils.sanitizeInput(value);
          const validated = SecurityUtils.validatePath(sanitized, process.cwd());
          if (validated) {
            parsed.i18nDir = validated;
          }
        } else if (key === 'output-dir' && value) {
          const sanitized = await SecurityUtils.sanitizeInput(value);
          const validated = SecurityUtils.validatePath(sanitized, process.cwd());
          if (validated) {
            parsed.outputDir = validated;
          }
        } else if (key === 'help') {
          parsed.help = true;
        }
      }
      
      await SecurityUtils.logSecurityEvent('args_parsed', { component: 'i18ntk-usage', args: parsed });
      return parsed;
    } catch (error) {
      await SecurityUtils.logSecurityEvent('args_parse_failed', { component: 'i18ntk-usage', error: error.message });
      throw error;
    }
  }

  // NEW: Recursively discover all translation files in modular structure
  async discoverTranslationFiles(baseDir, language = this.config.sourceLanguage) {
    const translationFiles = [];
    
    const traverse = async (currentDir) => {
      try {
        const absoluteDir = path.resolve(currentDir);
        const validatedPath = SecurityUtils.validatePath(absoluteDir, process.cwd());
        
        if (!validatedPath || !fs.existsSync(validatedPath)) {
          return;
        }
        
        const items = fs.readdirSync(validatedPath);
        
        for (const item of items) {
          const itemPath = path.join(validatedPath, item);
          
          try {
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory()) {
              // Skip excluded directories
              if (!this.config.excludeDirs.includes(item)) {
                await traverse(itemPath);
              }
            } else if (stat.isFile()) {
              // Look for translation files:
              // 1. Direct language files: en.json, de.json, etc.
              // 2. Language directory files: en/common.json, de/auth.json, etc.
              // 3. Nested modular files: components/en.json, features/auth/en.json, etc.
              
              const fileName = path.basename(item, '.json');
              const parentDir = path.basename(path.dirname(itemPath));
              
              if (item.endsWith('.json')) {
                // Case 1: Direct language files (en.json)
                if (fileName === language) {
                  translationFiles.push({
                    filePath: itemPath,
                    namespace: path.relative(baseDir, path.dirname(itemPath)).replace(/[\\/]/g, '.') || 'root',
                    language: language,
                    type: 'direct'
                  });
                }
                // Case 2: Files in language directories (en/common.json)
                else if (parentDir === language) {
                  translationFiles.push({
                    filePath: itemPath,
                    namespace: fileName,
                    language: language,
                    type: 'namespaced'
                  });
                }
              }
            }
          } catch (statError) {
            // Skip files that can't be accessed
            continue;
          }
        }
      } catch (error) {
        await SecurityUtils.logSecurityEvent('translation_discovery_error', { 
          component: 'i18ntk-usage', 
          directory: currentDir, 
          error: error.message 
        });
      }
    };
    
    await traverse(baseDir);
    return translationFiles;
  }

  // Get all files recursively from a directory with enhanced filtering
  async getAllFiles(dir, extensions = this.config.includeExtensions) {
    const files = [];
    
    // Enhanced list of toolkit files to exclude from analysis
    const excludeFiles = [
      'i18ntk-analyze.js', 'i18ntk-autorun.js', 'i18ntk-complete.js',
      'i18ntk-init.js', 'i18ntk-manage.js', 'i18ntk-sizing.js',
      'i18ntk-summary.js', 'i18ntk-usage.js', 'i18ntk-validate.js',
      'console-translations.js', 'console-key-checker.js',
      'complete-console-translations.js', 'detect-language-mismatches.js',
      'export-missing-keys.js', 'maintain-language-purity.js',
      'native-translations.js', 'settings-cli.js', 'settings-manager.js',
      'test-complete-system.js', 'test-console-i18n.js', 'test-features.js',
      'translate-mismatches.js', 'ui-i18n.js', 'update-console-i18n.js',
      'validate-language-purity.js', 'debugger.js', 'admin-auth.js',
      'admin-cli.js', 'i18n-helper.js', 'security.js'
    ];
    
    const traverse = async (currentDir) => {
      try {
        const absoluteDir = path.resolve(currentDir);
        const validatedPath = SecurityUtils.validatePath(absoluteDir, process.cwd());
        
        if (!validatedPath || !fs.existsSync(validatedPath)) {
          return;
        }
        
        const items = fs.readdirSync(validatedPath);
        
        for (const item of items) {
          const itemPath = path.join(validatedPath, item);
          
          try {
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory()) {
              // Skip excluded directories
              if (!this.config.excludeDirs.includes(item)) {
                await traverse(itemPath);
              }
            } else if (stat.isFile()) {
              // Include files with specified extensions, but exclude toolkit files
              const ext = path.extname(item);
              if (extensions.includes(ext) && !excludeFiles.includes(item)) {
                files.push(itemPath);
              }
            }
          } catch (statError) {
            // Skip files that can't be accessed
            continue;
          }
        }
      } catch (error) {
        await SecurityUtils.logSecurityEvent('file_traversal_error', { 
          component: 'i18ntk-usage', 
          directory: currentDir, 
          error: error.message 
        });
      }
    };
    
    await traverse(dir);
    return files;
  }

  async run() {
    try {
      await this.initialize();
      
      const args = await this.parseArgs();
      
      if (args.help) {
        this.showHelp();
        return;
      }
      
      // Override config with command line arguments
      if (args.sourceDir) {
        this.config.sourceDir = args.sourceDir;
        this.sourceDir = path.resolve(args.sourceDir);
      }
      
      if (args.i18nDir) {
        this.config.i18nDir = args.i18nDir;
        this.i18nDir = path.resolve(args.i18nDir);
        this.sourceLanguageDir = path.join(this.i18nDir, this.config.sourceLanguage);
      }
      
      console.log(this.t('checkUsage.source_directory_thissourcedir', { sourceDir: this.sourceDir }));
      console.log(this.t('checkUsage.i18n_directory_thisi18ndir', { i18nDir: this.i18nDir }));
      
      // Load available translation keys first
      await this.loadAvailableKeys();
      
      // Perform usage analysis
      await this.analyzeUsage();
      
      // NEW: Analyze translation completeness
      await this.analyzeTranslationCompleteness();
      
      // Generate and display results
      const unusedKeys = this.findUnusedKeys();
      const missingKeys = this.findMissingKeys();
      const notTranslatedStats = this.getNotTranslatedStats();
      
      console.log(`\n📊 Analysis Results:`);
      console.log(`   🔤 Available keys: ${this.availableKeys.size}`);
      console.log(`   🎯 Used keys: ${this.usedKeys.size}`);
      console.log(`   ❌ Unused keys: ${unusedKeys.length}`);
      console.log(`   ⚠️  Missing keys: ${missingKeys.length}`);
      console.log(`   🔄 NOT_TRANSLATED keys: ${notTranslatedStats.total}`);
      
      // Display translation completeness by language
      console.log(`\n🌍 Translation Completeness:`);
      for (const [language, stats] of this.translationStats) {
        const completeness = ((stats.translated / stats.total) * 100).toFixed(1);
        console.log(`   ${language}: ${completeness}% complete (${stats.translated}/${stats.total})`);
      }
      
      if (args.outputReport) {
        const report = this.generateUsageReport();
        await this.saveReport(report, args.outputDir);
      }
      
      console.log('\n✅ Usage analysis completed successfully');
      
    } catch (error) {
      console.error('❌ Usage analysis failed:', error.message);
      await SecurityUtils.logSecurityEvent('usage_analysis_failed', { 
        component: 'i18ntk-usage', 
        error: error.message 
      });
      throw error;
    }
  }

  // Show help message
  showHelp() {
    console.log(this.t('checkUsage.help_message'));
  }

  // NEW: Enhanced translation key loading with modular support
  async getAllTranslationKeys() {
    const keys = new Set();
    
    try {
      // Discover all translation files in the i18n directory
      const translationFiles = await this.discoverTranslationFiles(this.i18nDir, this.config.sourceLanguage);
      
      console.log(`🔍 Found ${translationFiles.length} translation files`);
      
      for (const fileInfo of translationFiles) {
        try {
          await SecurityUtils.validatePath(fileInfo.filePath);
          const content = await SecurityUtils.safeReadFile(fileInfo.filePath);
          const jsonData = await SecurityUtils.safeParseJSON(content);
          
          // Store file info for later analysis
          this.translationFiles.set(fileInfo.filePath, fileInfo);
          
          const fileKeys = this.extractKeysFromObject(jsonData, '', fileInfo.namespace);
          fileKeys.forEach(key => keys.add(key));
          
          console.log(`   📄 ${fileInfo.namespace}: ${fileKeys.length} keys`);
        } catch (error) {
          console.warn(this.t("checkUsage.failed_to_parse_filename_error", { 
            fileName: path.basename(fileInfo.filePath), 
            errorMessage: error.message 
          }));
          await SecurityUtils.logSecurityEvent('translation_file_parse_error', {
            component: 'i18ntk-usage',
            file: fileInfo.filePath,
            error: error.message
          });
        }
      }
    } catch (error) {
      await SecurityUtils.logSecurityEvent('translation_keys_load_error', {
        component: 'i18ntk-usage',
        error: error.message
      });
    }
    
    return keys;
  }

  // Extract keys recursively from translation object
  extractKeysFromObject(obj, prefix = '', namespace = '') {
    const keys = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        keys.push(...this.extractKeysFromObject(value, fullKey, namespace));
      } else {
        // Add dot notation key (e.g., "pagination.showing")
        keys.push(fullKey);
        
        // If we have a namespace, also add the namespace:key format
        if (namespace && namespace !== 'root') {
          keys.push(`${namespace}:${fullKey}`);
        }
      }
    }
    
    return keys;
  }

  // Extract translation keys from source code with enhanced patterns
  extractKeysFromFile(filePath) {
    try {
      const content = SecurityUtils.safeReadFileSync(filePath);
      if (!content) return [];
      
      const keys = [];
      
      // Ensure patterns are RegExp objects with better error handling
      const patterns = this.config.translationPatterns.map(pattern => {
        try {
          if (typeof pattern === 'string') {
            return new RegExp(pattern, 'g');
          }
          return new RegExp(pattern.source, 'g');
        } catch (patternError) {
          console.warn(`Invalid pattern: ${pattern}`);
          return null;
        }
      }).filter(Boolean);
      
      patterns.forEach(pattern => {
        try {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            if (match && match[1]) {
              keys.push(match[1]);
            }
          }
        } catch (execError) {
          // Skip patterns that fail to execute
        }
      });
      
      return keys;
    } catch (error) {
      console.warn(`Failed to extract keys from ${filePath}: ${error.message}`);
      return [];
    }
  }

  // Analyze usage in source files
  async analyzeUsage() {
    console.log(this.t('checkUsage.analyzing_source_files'));
    
    const sourceFiles = await this.getAllFiles(this.sourceDir);
    console.log(this.t('checkUsage.found_files_in_source', { numFiles: sourceFiles.length }));
    
    let totalKeysFound = 0;
    
    for (const filePath of sourceFiles) {
      const keys = this.extractKeysFromFile(filePath);
      
      if (keys.length > 0) {
        const relativePath = path.relative(this.sourceDir, filePath);
        this.fileUsage.set(relativePath, keys);
        
        keys.forEach(key => {
          this.usedKeys.add(key);
          totalKeysFound++;
        });
      }
    }
    
    console.log(this.t("checkUsage.found_thisusedkeyssize_unique_", { usedKeysSize: this.usedKeys.size }));
    console.log(this.t("checkUsage.total_key_usages_totalkeysfoun", { totalKeysFound }));
  }

  // Load available translation keys
  async loadAvailableKeys() {
    console.log(this.t("checkUsage.loading_available_translation_"));
    
    this.availableKeys = await this.getAllTranslationKeys();
    console.log(this.t("checkUsage.found_thisavailablekeyssize_av", { availableKeysSize: this.availableKeys.size }));
  }

  // NEW: Analyze translation completeness across all languages
  async analyzeTranslationCompleteness() {
    console.log('\n🔍 Analyzing translation completeness...');
    
    // Get all available languages
    const languages = new Set();
    
    // Discover translation files for all languages
    const allLanguageDirs = fs.readdirSync(this.i18nDir)
      .filter(item => {
        const itemPath = path.join(this.i18nDir, item);
        return fs.statSync(itemPath).isDirectory();
      });
    
    for (const lang of allLanguageDirs) {
      if (['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'].includes(lang)) {
        languages.add(lang);
      }
    }
    
    // Also check for direct language files (en.json, de.json, etc.)
    const directFiles = fs.readdirSync(this.i18nDir)
      .filter(file => file.endsWith('.json'))
      .map(file => path.basename(file, '.json'))
      .filter(lang => ['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'].includes(lang));
    
    directFiles.forEach(lang => languages.add(lang));
    
    // Analyze each language
    for (const language of languages) {
      const translationFiles = await this.discoverTranslationFiles(this.i18nDir, language);
      let totalKeys = 0;
      let translatedKeys = 0;
      
      for (const fileInfo of translationFiles) {
        try {
          const content = await SecurityUtils.safeReadFile(fileInfo.filePath);
          const jsonData = await SecurityUtils.safeParseJSON(content);
          
          const stats = this.analyzeFileCompleteness(jsonData);
          totalKeys += stats.total;
          translatedKeys += stats.translated;
        } catch (error) {
          console.warn(`Failed to analyze ${fileInfo.filePath}: ${error.message}`);
        }
      }
      
      this.translationStats.set(language, {
        total: totalKeys,
        translated: translatedKeys,
        notTranslated: totalKeys - translatedKeys
      });
    }
  }

  // NEW: Analyze completeness of a single translation file
  analyzeFileCompleteness(obj) {
    let total = 0;
    let translated = 0;
    
    const traverse = (current) => {
      for (const [key, value] of Object.entries(current)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          traverse(value);
        } else {
          total++;
          if (value !== 'NOT_TRANSLATED' && value !== '(NOT TRANSLATED)' && 
              value !== 'TRANSLATED' && value !== '(TRANSLATED)' &&
              value && value.toString().trim() !== '') {
            translated++;
          }
        }
      }
    };
    
    traverse(obj);
    return { total, translated };
  }

  // NEW: Get statistics about NOT_TRANSLATED values
  getNotTranslatedStats() {
    let total = 0;
    const byLanguage = new Map();
    
    for (const [language, stats] of this.translationStats) {
      const notTranslated = stats.notTranslated;
      total += notTranslated;
      byLanguage.set(language, notTranslated);
    }
    
    return { total, byLanguage };
  }

  // Find unused keys
  findUnusedKeys() {
    const unused = [];
    
    for (const key of this.availableKeys) {
      let isUsed = false;
      
      // Check exact match
      if (this.usedKeys.has(key)) {
        isUsed = true;
      } else {
        // Check if any dynamic key could match this
        for (const usedKey of this.usedKeys) {
          if (usedKey.endsWith('*')) {
            const prefix = usedKey.slice(0, -1);
            if (key.startsWith(prefix)) {
              isUsed = true;
              break;
            }
          }
        }
      }
      
      if (!isUsed) {
        unused.push(key);
      }
    }
    
    return unused;
  }

  // Find missing keys (used but not available)
  findMissingKeys() {
    const missing = [];
    
    for (const key of this.usedKeys) {
      // Skip dynamic keys for missing check
      if (key.endsWith('*')) {
        continue;
      }
      
      if (!this.availableKeys.has(key)) {
        missing.push(key);
      }
    }
    
    return missing;
  }

  // Find files that use specific keys
  findKeyUsage(searchKey) {
    const usage = [];
    
    for (const [filePath, keys] of this.fileUsage) {
      const matchingKeys = keys.filter(key => {
        if (key.endsWith('*')) {
          const prefix = key.slice(0, -1);
          return searchKey.startsWith(prefix);
        }
        return key === searchKey;
      });
      
      if (matchingKeys.length > 0) {
        usage.push({ filePath, keys: matchingKeys });
      }
    }
    
    return usage;
  }

  // Enhanced usage report generation
  generateUsageReport() {
    const unusedKeys = this.findUnusedKeys();
    const missingKeys = this.findMissingKeys();
    const dynamicKeys = Array.from(this.usedKeys).filter(key => key.endsWith('*'));
    const notTranslatedStats = this.getNotTranslatedStats();
    
    const timestamp = new Date().toISOString();
    
    let report = `I18N USAGE ANALYSIS REPORT - Version 1.4.0\n`;
    report += `Generated: ${timestamp}\n`;
    report += `Source directory: ${this.sourceDir}\n`;
    report += `I18n directory: ${this.i18nDir}\n\n`;
    
    // Summary
    report += `SUMMARY\n`;
    report += `${'='.repeat(50)}\n`;
    report += `📄 Source files scanned: ${this.fileUsage.size}\n`;
    report += `📄 Translation files found: ${this.translationFiles.size}\n`;
    report += `🔤 Available translation keys: ${this.availableKeys.size}\n`;
    report += `🎯 Used translation keys: ${this.usedKeys.size - dynamicKeys.length}\n`;
    report += `🔄 Dynamic keys detected: ${dynamicKeys.length}\n`;
    report += `❌ Unused keys: ${unusedKeys.length}\n`;
    report += `⚠️  Missing keys: ${missingKeys.length}\n`;
    report += `🔄 NOT_TRANSLATED keys: ${notTranslatedStats.total}\n\n`;
    
    // Translation completeness
    report += `TRANSLATION COMPLETENESS\n`;
    report += `${'='.repeat(50)}\n`;
    for (const [language, stats] of this.translationStats) {
      const completeness = ((stats.translated / stats.total) * 100).toFixed(1);
      report += `🌍 ${language.toUpperCase()}: ${completeness}% complete (${stats.translated}/${stats.total})\n`;
      if (stats.notTranslated > 0) {
        report += `   🔄 NOT_TRANSLATED: ${stats.notTranslated} keys\n`;
      }
    }
    report += `\n`;
    
    // Translation files discovered
    report += `TRANSLATION FILES DISCOVERED\n`;
    report += `${'='.repeat(50)}\n`;
    for (const [filePath, fileInfo] of this.translationFiles) {
      const relativePath = path.relative(this.i18nDir, filePath);
      report += `📄 ${relativePath} (${fileInfo.namespace}, ${fileInfo.type})\n`;
    }
    report += `\n`;
    
    // Unused keys
    if (unusedKeys.length > 0) {
      report += `UNUSED TRANSLATION KEYS\n`;
      report += `${'='.repeat(50)}\n`;
      report += `These keys exist in translation files but are not used in source code:\n\n`;
      
      unusedKeys.slice(0, 100).forEach(key => {
        report += `❌ ${key}\n`;
      });
      
      if (unusedKeys.length > 100) {
        report += `... and ${unusedKeys.length - 100} more unused keys\n`;
      }
      
      report += `\n`;
    }
    
    // Missing keys
    if (missingKeys.length > 0) {
      report += `MISSING TRANSLATION KEYS\n`;
      report += `${'='.repeat(50)}\n`;
      report += `These keys are used in source code but missing from translation files:\n\n`;
      
      missingKeys.forEach(key => {
        report += `⚠️  ${key}\n`;
        
        // Show where it's used
        const usage = this.findKeyUsage(key);
        usage.slice(0, 3).forEach(({ filePath }) => {
          report += `   📄 Used in: ${filePath}\n`;
        });
        
        if (usage.length > 3) {
          report += `   ... and ${usage.length - 3} more files\n`;
        }
        
        report += `\n`;
      });
    }
    
    // Dynamic keys
    if (dynamicKeys.length > 0) {
      report += `DYNAMIC TRANSLATION KEYS\n`;
      report += `${'='.repeat(50)}\n`;
      report += `These keys use dynamic patterns and need manual verification:\n\n`;
      
      dynamicKeys.forEach(key => {
        report += `🔄 ${key}\n`;
        
        // Show where it's used
        const usage = this.findKeyUsage(key);
        usage.slice(0, 2).forEach(({ filePath }) => {
          report += `   📄 Used in: ${filePath}\n`;
        });
        
        report += `\n`;
      });
    }
    
    // File usage breakdown
    report += `FILE USAGE BREAKDOWN\n`;
    report += `${'='.repeat(50)}\n`;
    
    const sortedFiles = Array.from(this.fileUsage.entries())
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, 20);
    
    sortedFiles.forEach(([filePath, keys]) => {
      report += `📄 ${filePath} (${keys.length} keys)\n`;
    });
    
    if (this.fileUsage.size > 20) {
      report += `... and ${this.fileUsage.size - 20} more files\n`;
    }
    
    return report;
  }

  // Save report to file
  async saveReport(report, outputDir = './i18n-reports/usage') {
    try {
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `usage-analysis-${timestamp}.txt`;
      const filepath = path.join(outputDir, filename);
      
      await SecurityUtils.safeWriteFile(filepath, report);
      console.log(`📄 Report saved to: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error(`❌ Failed to save report: ${error.message}`);
    }
  }

  // Main analysis process
  async analyze() {
    try {
      // Initialize if not already done
      if (!this.sourceDir || !this.t) {
        await this.initialize();
      }
      
      await SecurityUtils.logSecurityEvent('analysis_started', { component: 'i18ntk-usage' });
      
      console.log(this.t('checkUsage.title'));
      console.log(this.t("checkUsage.message"));
      
      // Parse command line arguments
      const args = await this.parseArgs();
      
      // Show help if requested
      if (args.help) {
        this.showHelp();
        return { success: true, help: true };
      }
      
      if (args.sourceDir) {
        this.config.sourceDir = args.sourceDir;
        this.sourceDir = path.resolve(this.config.sourceDir);
      }
      if (args.i18nDir) {
        this.config.i18nDir = args.i18nDir;
        this.i18nDir = path.resolve(this.config.i18nDir);
        this.sourceLanguageDir = path.join(this.i18nDir, this.config.sourceLanguage);
      }
      if (args.outputDir) {
        this.config.outputDir = args.outputDir;
        this.outputDir = path.resolve(this.config.outputDir);
      }
      
      console.log(this.t("checkUsage.source_directory_thissourcedir", { sourceDir: this.sourceDir }));
      console.log(this.t("checkUsage.i18n_directory_thisi18ndir", { i18nDir: this.i18nDir }));
      
      // Validate directories
      await SecurityUtils.validatePath(this.sourceDir);
      await SecurityUtils.validatePath(this.i18nDir);
      
      if (!fs.existsSync(this.sourceDir)) {
        throw new Error(`Source directory not found: ${this.sourceDir}`);
      }
      
      if (!fs.existsSync(this.i18nDir)) {
        throw new Error(`I18n directory not found: ${this.i18nDir}`);
      }
      
      // Load available keys
      await this.loadAvailableKeys();
      
      // Analyze usage
      await this.analyzeUsage();
      
      // NEW: Analyze translation completeness
      await this.analyzeTranslationCompleteness();
      
      // Generate analysis results
      const unusedKeys = this.findUnusedKeys();
      const missingKeys = this.findMissingKeys();
      const dynamicKeys = Array.from(this.usedKeys).filter(key => key.endsWith('*'));
      const notTranslatedStats = this.getNotTranslatedStats();
      
      // Display results
      console.log(this.t("checkUsage.n"));
      console.log(this.t("checkUsage.usage_analysis_results"));
      console.log(this.t("checkUsage.message"));
      
      console.log(this.t("checkUsage.source_files_scanned_thisfileu", { fileUsageSize: this.fileUsage.size }));
      console.log(this.t("checkUsage.available_translation_keys_thi", { availableKeysSize: this.availableKeys.size }));
      console.log(this.t("checkUsage.used_translation_keys_thisused", { usedKeysCount: this.usedKeys.size - dynamicKeys.length }));
      console.log(this.t("checkUsage.dynamic_keys_detected_dynamick", { dynamicKeysLength: dynamicKeys.length }));
      console.log(this.t("checkUsage.unused_keys_unusedkeyslength", { unusedKeysLength: unusedKeys.length }));
      console.log(this.t("checkUsage.missing_keys_missingkeyslength", { missingKeysLength: missingKeys.length }));
      console.log(`🔄 NOT_TRANSLATED keys: ${notTranslatedStats.total}`);
      
      // Display translation completeness
      console.log(`\n🌍 Translation Completeness:`);
      for (const [language, stats] of this.translationStats) {
        const completeness = ((stats.translated / stats.total) * 100).toFixed(1);
        console.log(`   ${language.toUpperCase()}: ${completeness}% complete (${stats.translated}/${stats.total})`);
      }
      
      // Show some examples
      if (unusedKeys.length > 0) {
        console.log(this.t("checkUsage.n_sample_unused_keys"));
        unusedKeys.slice(0, 5).forEach(key => {
          console.log(this.t("checkUsage.key", { key }));
        });
        if (unusedKeys.length > 5) {
          console.log(this.t("checkUsage.and_unusedkeyslength_5_more", { moreCount: unusedKeys.length - 5 }));
        }
      }
      
      if (missingKeys.length > 0) {
        console.log(this.t("checkUsage.n_sample_missing_keys"));
        missingKeys.slice(0, 5).forEach(key => {
          console.log(this.t("checkUsage.key", { key }));
        });
        if (missingKeys.length > 5) {
          console.log(this.t("checkUsage.and_missingkeyslength_5_more", { moreCount: missingKeys.length - 5 }));
        }
      }
      
      // Generate and save report if requested
      if (args.outputReport) {
        console.log(this.t("checkUsage.n_generating_detailed_report"));
        const report = this.generateUsageReport();
        const reportPath = await this.saveReport(report);
        console.log(this.t("checkUsage.report_saved_reportpath", { reportPath }));
      }
      
      // Recommendations
      console.log(this.t("checkUsage.n_recommendations"));
      console.log(this.t("checkUsage.message"));
      
      if (unusedKeys.length > 0) {
        console.log(this.t("checkUsage.consider_removing_unused_trans"));
      }
      
      if (missingKeys.length > 0) {
        console.log(this.t("checkUsage.add_missing_translation_keys_t"));
      }
      
      if (dynamicKeys.length > 0) {
        console.log(this.t("checkUsage.review_dynamic_keys_manually_t"));
      }
      
      if (notTranslatedStats.total > 0) {
        console.log(`🔄 Review ${notTranslatedStats.total} NOT_TRANSLATED keys across all languages`);
      }
      
      if (unusedKeys.length === 0 && missingKeys.length === 0 && notTranslatedStats.total === 0) {
        console.log(this.t("checkUsage.all_translation_keys_are_prope"));
      }
      
      console.log(this.t("checkUsage.n_next_steps"));
      console.log(this.t("checkUsage.1_review_the_analysis_results"));
      if (args.outputReport) {
        console.log(this.t("checkUsage.2_check_the_detailed_report_fo"));
      } else {
        console.log(this.t("checkUsage.2_run_with_outputreport_for_de"));
      }
      console.log(this.t("checkUsage.3_remove_unused_keys_or_add_mi"));
      console.log(this.t("checkUsage.4_rerun_analysis_to_verify_imp"));
      
      await SecurityUtils.logSecurityEvent('analysis_completed', {
        component: 'i18ntk-usage',
        stats: {
          availableKeys: this.availableKeys.size,
          usedKeys: this.usedKeys.size - dynamicKeys.length,
          dynamicKeys: dynamicKeys.length,
          unusedKeys: unusedKeys.length,
          missingKeys: missingKeys.length,
          filesScanned: this.fileUsage.size,
          notTranslatedKeys: notTranslatedStats.total
        }
      });
      
      return {
        success: true,
        stats: {
          availableKeys: this.availableKeys.size,
          usedKeys: this.usedKeys.size - dynamicKeys.length,
          dynamicKeys: dynamicKeys.length,
          unusedKeys: unusedKeys.length,
          missingKeys: missingKeys.length,
          filesScanned: this.fileUsage.size,
          notTranslatedKeys: notTranslatedStats.total,
          translationCompleteness: Object.fromEntries(this.translationStats)
        },
        unusedKeys,
        missingKeys,
        dynamicKeys,
        notTranslatedStats
      };
      
    } catch (error) {
      console.error(this.t("checkUsage.usage_analysis_failed"));
      console.error(error.message);
      
      await SecurityUtils.logSecurityEvent('analysis_failed', {
        component: 'i18ntk-usage',
        error: error.message
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Run if called directly
if (require.main === module) {
  const analyzer = new I18nUsageAnalyzer();
  analyzer.analyze();
}

module.exports = I18nUsageAnalyzer;