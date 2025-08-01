#!/usr/bin/env node
/**
 * I18N USAGE ANALYSIS TOOLKIT - Version 1.4.3
 * 
 * This script analyzes source code to find unused translation keys,
 * missing translations, and provides comprehensive translation completeness analysis.
 * 
 * NEW in v1.4.3:
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
const readline = require('readline');
const { loadTranslations, t } = require('../utils/i18n-helper');
const settingsManager = require('../settings/settings-manager');
const SecurityUtils = require('../utils/security');
const AdminCLI = require('../utils/admin-cli');

// Enhanced configuration that prioritizes settings over auto-detection
async function getConfig() {
  try {
    const settings = settingsManager.getSettings();
    
    // Only use auto-detection if no settings are configured
    let sourceDir = settings.directories?.sourceDir;
    let i18nDir = settings.directories?.i18nDir;
    
    // Auto-detect only if settings don't specify directories
    if (!sourceDir) {
      const possibleSourceDirs = [
        './main',     // Primary source directory for this project
        './src',
        './app', 
        './components',
        './pages',
        './views',
        './client',
        './frontend',
        './' // Current directory as fallback
      ];
      
      for (const dir of possibleSourceDirs) {
        if (fs.existsSync(dir)) {
          try {
            const files = fs.readdirSync(dir);
            const hasCodeFiles = files.some(file => 
              ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'].includes(path.extname(file))
            );
            if (hasCodeFiles) {
              sourceDir = dir;
              break;
            }
          } catch (error) {
            // Continue checking
          }
        }
      }
      sourceDir = sourceDir || './src'; // Final fallback
    }
    
    if (!i18nDir) {
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
      
      for (const dir of possibleI18nDirs) {
        if (fs.existsSync(dir)) {
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
              i18nDir = dir;
              break;
            }
          } catch (error) {
            // Continue checking
          }
        }
      }
      i18nDir = i18nDir || './locales'; // Final fallback
    }
    
    const config = {
      sourceDir: sourceDir,
      i18nDir: i18nDir,
      sourceLanguage: settings.directories?.sourceLanguage || settings.sourceLanguage || 'en',
      outputDir: settings.directories?.outputDir || settings.outputDir || './i18ntk-reports',
      excludeDirs: settings.processing?.excludeDirs || [
        'node_modules', '.git', 'dist', 'build', '.next', '.nuxt', 
        'i18ntk-reports', 'reports', 'dev', 'utils', 'test', 'tests'
      ],
      includeExtensions: settings.processing?.includeExtensions || ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'],
      translationPatterns: settings.processing?.translationPatterns || [
        /t\(['"`]([^'"`]+)['"`]\)/g,
        /\$t\(['"`]([^'"`]+)['"`]\)/g,
        /i18n\.t\(['"`]([^'"`]+)['"`]\)/g,
        /useTranslation\(\).*t\(['"`]([^'"`]+)['"`]\)/g
      ]
    };
    
   console.log(t('usage.detectedSourceDirectory', { sourceDir: config.sourceDir }));
   console.log(t('usage.detectedI18nDirectory', { i18nDir: config.i18nDir }));
    
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
    const UIi18n = require('./i18ntk-ui');
    this.ui = new UIi18n();
    this.t = this.ui.t.bind(this.ui);
    
    // Initialize readline interface
    this.rl = null;
  }

  // Initialize readline interface
  initReadline() {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }
    return this.rl;
  }
  
  // Close readline interface
  closeReadline() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
  
  // Prompt for user input
  async prompt(question) {
    const rl = this.initReadline();
    return new Promise((resolve) => {
      rl.question(question, resolve);
    });
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
      
      await SecurityUtils.logSecurityEvent(this.t('usage.analyzerInitialized'), { component: 'i18ntk-usage' });
    } catch (error) {
      await SecurityUtils.logSecurityEvent(this.t('usage.analyzerInitFailed'), { component: 'i18ntk-usage', error: error.message });
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
        } else if (key === 'no-prompt') {
          parsed.noPrompt = true;
        }
      }
      
      await SecurityUtils.logSecurityEvent(this.t('usage.argsParsed'), { component: 'i18ntk-usage', args: parsed });
      return parsed;
    } catch (error) {
      await SecurityUtils.logSecurityEvent(this.t('usage.argsParseFailed'), { component: 'i18ntk-usage', error: error.message });
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
        await SecurityUtils.logSecurityEvent(this.t('usage.translationDiscoveryError'), { 
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
      'console-translations.js', 'console-key-checker.js',
      'complete-console-translations.js', 'detect-language-mismatches.js',
      'export-missing-keys.js', 'maintain-language-purity.js',
      'native-translations.js', 'settings-cli.js', 'settings-manager.js',
      'test-complete-system.js', 'test-console-i18n.js', 'test-features.js',
      'translate-mismatches.js', 'i18ntk-ui.js', 'update-console-i18n.js',
      'validate-language-purity.js', 'debugger.js', 'admin-auth.js',
      'admin-cli.js'
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
        await SecurityUtils.logSecurityEvent(this.t('usage.fileTraversalError'), { 
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
      
      console.log(this.t('usage.checkUsage.source_directory_thissourcedir', { sourceDir: this.sourceDir }));
      console.log(this.t('usage.checkUsage.i18n_directory_thisi18ndir', { i18nDir: this.i18nDir }));
      
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
      
      console.log('\n' + this.t('usage.analysisResults'));
      console.log('   ' + this.t('usage.availableKeysCount', { count: this.availableKeys.size }));
      console.log('   ' + this.t('usage.usedKeysCount', { count: this.usedKeys.size }));
      console.log(this.t('usage.unusedKeysCount', { count: unusedKeys.length }));
      console.log(this.t('usage.missingKeysCount', { count: missingKeys.length }));
      console.log(this.t('usage.notTranslatedKeysTotal', { total: notTranslatedStats.total }));
      
      // Display translation completeness by language
      console.log(this.t('usage.translationCompletenessTitle'));
      for (const [language, stats] of this.translationStats) {
        const completeness = ((stats.translated / stats.total) * 100).toFixed(1);
        console.log(this.t('usage.languageCompletenessStats', { language, completeness, translated: stats.translated, total: stats.total }));
      }
      
      if (args.outputReport) {
        const report = this.generateUsageReport();
        await this.saveReport(report, args.outputDir);
      }
      
      console.log('\n' + this.t('usage.analysisCompletedSuccessfully'));
    
      if (require.main === module) {
        await this.prompt('\nPress Enter to continue...');
      }
      this.closeReadline();
      
    } catch (error) {
      console.error(this.t('usage.analysisFailedError'), error.message);
      this.closeReadline();
      await SecurityUtils.logSecurityEvent(this.t('usage.usageAnalysisFailed'), { 
        component: 'i18ntk-usage', 
        error: error.message 
      });
      throw error;
    }
  }

  // Show help message
  showHelp() {
    console.log(this.t('usage.checkUsage.help_message'));
  }

  // NEW: Enhanced translation key loading with modular support
  async getAllTranslationKeys() {
    const keys = new Set();
    
    try {
      // Discover all translation files in the i18n directory
      const translationFiles = await this.discoverTranslationFiles(this.i18nDir, this.config.sourceLanguage);
      
      console.log(this.t('usage.foundTranslationFiles', { count: translationFiles.length }));
      
      for (const fileInfo of translationFiles) {
        try {
          await SecurityUtils.validatePath(fileInfo.filePath);
          const content = await SecurityUtils.safeReadFile(fileInfo.filePath);
          const jsonData = await SecurityUtils.safeParseJSON(content);
          
          // Store file info for later analysis
          this.translationFiles.set(fileInfo.filePath, fileInfo);
          
          const fileKeys = this.extractKeysFromObject(jsonData, '', fileInfo.namespace);
          fileKeys.forEach(key => keys.add(key));
          
         console.log(this.t('usage.fileInfo', { namespace: fileInfo.namespace, keys: fileKeys.length }));
        } catch (error) {
          console.warn(this.t("usage.checkUsage.failed_to_parse_filename_error", { 
            fileName: path.basename(fileInfo.filePath), 
            errorMessage: error.message 
          }));
          await SecurityUtils.logSecurityEvent(this.t('usage.translationFileParseError'), {
            component: 'i18ntk-usage',
            file: fileInfo.filePath,
            error: error.message
          });
        }
      }
    } catch (error) {
      await SecurityUtils.logSecurityEvent(this.t('usage.translationKeysLoadError'), {
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
          console.warn(`${this.t('usage.invalidPattern')} ${pattern}`);
          return null;
        }
      }).filter(Boolean);
      
      patterns.forEach(pattern => {
        try {
          let match;
          let matchCount = 0;
          const maxMatches = 10000; // Safety limit to prevent infinite loops
          
          // Reset regex lastIndex to ensure clean start
          pattern.lastIndex = 0;
          
          while ((match = pattern.exec(content)) !== null && matchCount < maxMatches) {
            if (match && match[1]) {
              keys.push(match[1]);
            }
            matchCount++;
            
            // Additional safety: if lastIndex doesn't advance, break to prevent infinite loop
            if (pattern.lastIndex === 0) {
              break;
            }
          }
          
          if (matchCount >= maxMatches) {
            console.warn(`${this.t('usage.patternMatchLimitReached')} ${filePath}`);
          }
        } catch (execError) {
          // Skip patterns that fail to execute
          console.warn(`${this.t('usage.patternExecutionFailed')} ${filePath}: ${execError.message}`);
        }
      });
      
      return keys;
    } catch (error) {
      console.warn(`${this.t('usage.failedToExtractKeys')} ${filePath}: ${error.message}`);
      return [];
    }
  }

  // Analyze usage in source files
  async analyzeUsage() {
    try {
      console.log(this.t('usage.checkUsage.analyzing_source_files'));
      
      // Check if source directory exists
      if (!fs.existsSync(this.sourceDir)) {
        throw new Error(`Source directory not found: ${this.sourceDir}`);
      }
      
      const sourceFiles = await this.getAllFiles(this.sourceDir);
      console.log(this.t('usage.checkUsage.found_files_in_source', { numFiles: sourceFiles.length }));
      
      // If no files found, exit gracefully
      if (sourceFiles.length === 0) {
        console.warn(this.t('usage.noSourceFilesFound'));
        return;
      }
      
      let totalKeysFound = 0;
      let processedFiles = 0;
      
      for (const filePath of sourceFiles) {
        try {
          const keys = this.extractKeysFromFile(filePath);
          
          if (keys.length > 0) {
            const relativePath = path.relative(this.sourceDir, filePath);
            this.fileUsage.set(relativePath, keys);
            
            keys.forEach(key => {
              this.usedKeys.add(key);
              totalKeysFound++;
            });
          }
          
          processedFiles++;
          
          // Progress indicator for large numbers of files
          if (sourceFiles.length > 10 && processedFiles % Math.ceil(sourceFiles.length / 10) === 0) {
            console.log(t('usage.processedFiles', { processedFiles, totalFiles: sourceFiles.length }));
          }
        } catch (fileError) {
          console.warn(`${this.t('usage.failedToProcessFile')} ${filePath}: ${fileError.message}`);
          continue;
        }
      }
      
      console.log(this.t("usage.checkUsage.found_thisusedkeyssize_unique_", { usedKeysSize: this.usedKeys.size }));
      console.log(this.t("usage.checkUsage.total_key_usages_totalkeysfoun", { totalKeysFound }));
      
    } catch (error) {
     console.error(this.t('usage.failedToAnalyzeUsage', { error: error.message }));
      throw error;
    }
  }

  // Load available translation keys
  async loadAvailableKeys() {
    console.log(this.t("usage.checkUsage.loading_available_translation_"));
    
    this.availableKeys = await this.getAllTranslationKeys();
    console.log(this.t("usage.checkUsage.found_thisavailablekeyssize_av", { availableKeysSize: this.availableKeys.size }));
  }

  // NEW: Analyze translation completeness across all languages
  async analyzeTranslationCompleteness() {
    try {
      console.log('\n' + this.t('usage.analyzingTranslationCompleteness'));
      
      // Check if i18n directory exists
      if (!fs.existsSync(this.i18nDir)) {
        console.warn(this.t('usage.i18nDirectoryNotFound', { i18nDir: this.i18nDir }));
        return;
      }
      
      // Get all available languages
      const languages = new Set();
      
      try {
        // Discover translation files for all languages
        const allLanguageDirs = fs.readdirSync(this.i18nDir)
          .filter(item => {
            try {
              const itemPath = path.join(this.i18nDir, item);
              return fs.existsSync(itemPath) && fs.statSync(itemPath).isDirectory();
            } catch (error) {
              return false;
            }
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
      } catch (error) {
        console.warn(`${this.t('usage.errorReadingI18nDirectory')} ${error.message}`);
        return;
      }
      
      // If no languages found, exit gracefully
      if (languages.size === 0) {
        console.warn(t('usage.noTranslationLanguagesFound'));
        return;
      }
      
      // Analyze each language
      for (const language of languages) {
        try {
          const translationFiles = await this.discoverTranslationFiles(this.i18nDir, language);
          let totalKeys = 0;
          let translatedKeys = 0;
          
          for (const fileInfo of translationFiles) {
            try {
              if (!fs.existsSync(fileInfo.filePath)) {
                continue;
              }
              
              const content = await SecurityUtils.safeReadFile(fileInfo.filePath);
              const jsonData = await SecurityUtils.safeParseJSON(content);
              
              const stats = this.analyzeFileCompleteness(jsonData);
              totalKeys += stats.total;
              translatedKeys += stats.translated;
            } catch (error) {
              console.warn(t('usage.failedToAnalyzeFile', { filePath: fileInfo.filePath, error: error.message }));
              continue;
            }
          }
          
          this.translationStats.set(language, {
            total: totalKeys,
            translated: translatedKeys,
            notTranslated: totalKeys - translatedKeys
          });
        } catch (error) {
          console.warn(t('usage.failedToAnalyzeLanguage', { language, error: error.message }));
          continue;
        }
      }
    } catch (error) {
      console.warn(t('usage.translationCompletenessAnalysisFailed', { error: error.message }));
      // Don't throw error, just continue with the rest of the analysis
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
    
    let report = `${this.t('summary.usageReportTitle')}\n`;
    report += `${this.t('summary.usageReportGenerated', { timestamp })}\n`;
    report += `${this.t('summary.usageReportSourceDir', { sourceDir: this.sourceDir })}\n`;
    report += `${this.t('summary.usageReportI18nDir', { i18nDir: this.i18nDir })}\n\n`;
    
    // Summary
    report += `${this.t('summary.usageReportSummary')}\n`;
    report += `${'='.repeat(50)}\n`;
    report += `${this.t('summary.usageReportSourceFilesScanned', { count: this.fileUsage.size })}\n`;
    report += `${this.t('summary.usageReportTranslationFilesFound', { count: this.translationFiles.size })}\n`;
    report += `${this.t('summary.usageReportAvailableKeys', { count: this.availableKeys.size })}\n`;
    report += `${this.t('summary.usageReportUsedKeys', { count: this.usedKeys.size - dynamicKeys.length })}\n`;
    report += `${this.t('summary.usageReportDynamicKeys', { count: dynamicKeys.length })}\n`;
    report += `${this.t('summary.usageReportUnusedKeys', { count: unusedKeys.length })}\n`;
    report += `${this.t('summary.usageReportMissingKeys', { count: missingKeys.length })}\n`;
    report += `${this.t('summary.usageReportNotTranslatedKeys', { count: notTranslatedStats.total })}\n\n`;
    
    // Translation completeness
    report += `${this.t('summary.usageReportTranslationCompleteness')}\n`;
    report += `${'='.repeat(50)}\n`;
    for (const [language, stats] of this.translationStats) {
      const completeness = ((stats.translated / stats.total) * 100).toFixed(1);
      report += `${this.t('summary.usageReportLanguageCompleteness', { language: language.toUpperCase(), completeness, translated: stats.translated, total: stats.total })}\n`;
      if (stats.notTranslated > 0) {
        report += `${this.t('summary.usageReportNotTranslatedInLanguage', { count: stats.notTranslated })}\n`;
      }
    }
    report += `\n`;
    
    // Translation files discovered
    report += `${this.t('summary.usageReportTranslationFilesDiscovered')}\n`;
    report += `${'='.repeat(50)}\n`;
    for (const [filePath, fileInfo] of this.translationFiles) {
      const relativePath = path.relative(this.i18nDir, filePath);
      report += `${this.t('summary.usageReportFileInfo', { relativePath, namespace: fileInfo.namespace, type: fileInfo.type })}\n`;
    }
    report += `\n`;
    
    // Unused keys
    if (unusedKeys.length > 0) {
      report += `${this.t('summary.usageReportUnusedTranslationKeys')}\n`;
      report += `${'='.repeat(50)}\n`;
      report += `${this.t('summary.usageReportUnusedKeysDescription')}\n\n`;
      
      unusedKeys.slice(0, 100).forEach(key => {
        report += `${this.t('summary.usageReportUnusedKey', { key })}\n`;
      });
      
      if (unusedKeys.length > 100) {
        report += `${this.t('summary.usageReportMoreUnusedKeys', { count: unusedKeys.length - 100 })}\n`;
      }
      
      report += `\n`;
    }
    
    // Missing keys
    if (missingKeys.length > 0) {
      report += `${this.t('summary.usageReportMissingTranslationKeys')}\n`;
      report += `${'='.repeat(50)}\n`;
      report += `${this.t('summary.usageReportMissingKeysDescription')}\n\n`;
      
      missingKeys.forEach(key => {
        report += `${this.t('summary.usageReportMissingKey', { key })}\n`;
        
        // Show where it's used
        const usage = this.findKeyUsage(key);
        usage.slice(0, 3).forEach(({ filePath }) => {
          report += `   ${this.t('summary.usageReportUsedIn', { filePath })}\n`;
        });
        
        if (usage.length > 3) {
          report += `   ${this.t('summary.usageReportMoreFiles', { count: usage.length - 3 })}\n`;
        }
        
        report += `\n`;
      });
    }
    
    // Dynamic keys
    if (dynamicKeys.length > 0) {
      report += `${this.t('summary.usageReportDynamicTranslationKeys')}\n`;
      report += `${'='.repeat(50)}\n`;
      report += `${this.t('summary.usageReportDynamicKeysDescription')}\n\n`;
      
      dynamicKeys.forEach(key => {
        report += `${this.t('summary.usageReportDynamicKey', { key })}\n`;
        
        // Show where it's used
        const usage = this.findKeyUsage(key);
        usage.slice(0, 2).forEach(({ filePath }) => {
          report += `   ${this.t('summary.usageReportUsedIn', { filePath })}\n`;
        });
        
        report += `\n`;
      });
    }
    
    // File usage breakdown
    report += `${this.t('summary.usageReportFileUsageBreakdown')}\n`;
    report += `${'='.repeat(50)}\n`;
    
    const sortedFiles = Array.from(this.fileUsage.entries())
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, 20);
    
    sortedFiles.forEach(([filePath, keys]) => {
      report += `${this.t('summary.usageReportFileUsage', { filePath, count: keys.length })}\n`;
    });
    
    if (this.fileUsage.size > 20) {
      report += `${this.t('summary.usageReportMoreFiles', { count: this.fileUsage.size - 20 })}\n`;
    }
    
    return report;
  }

  // Save report to file
  async saveReport(report, outputDir = './i18ntk-reports/usage') {
    try {
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `usage-analysis-${timestamp}.txt`;
      const filepath = path.join(outputDir, filename);
      
      await SecurityUtils.safeWriteFile(filepath, report);
      console.log(this.t('usage.reportSavedTo', { reportPath: filepath }));
      return filepath;
    } catch (error) {
      console.error(this.t('usage.failedToSaveReport', { error: error.message }));
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
      
      console.log(this.t('usage.checkUsage.title'));
      console.log(this.t("usage.checkUsage.message"));
      
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
      
      console.log(this.t("usage.checkUsage.source_directory_thissourcedir", { sourceDir: this.sourceDir }));
      console.log(this.t("usage.checkUsage.i18n_directory_thisi18ndir", { i18nDir: this.i18nDir }));
      
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
      
      // Display results

      
      // Generate analysis results
      const unusedKeys = this.findUnusedKeys();
      const missingKeys = this.findMissingKeys();
      const dynamicKeys = Array.from(this.usedKeys).filter(key => key.endsWith('*'));
      const notTranslatedStats = this.getNotTranslatedStats();
      
      // Display results
      console.log(this.t("usage.checkUsage.n"));
      console.log(this.t("usage.checkUsage.usage_analysis_results"));
      console.log(this.t("usage.checkUsage.message"));
      
      console.log(this.t("usage.checkUsage.source_files_scanned_thisfileu", { fileUsageSize: this.fileUsage.size }));
      console.log(this.t("usage.checkUsage.available_translation_keys_thi", { availableKeysSize: this.availableKeys.size }));
      console.log(this.t("usage.checkUsage.used_translation_keys_thisused", { usedKeysSize: this.usedKeys.size - dynamicKeys.length }));
      console.log(this.t("usage.checkUsage.dynamic_keys_detected_dynamick", { dynamicKeysLength: dynamicKeys.length }));
      console.log(this.t("usage.checkUsage.unused_keys_unusedkeyslength", { unusedKeysLength: unusedKeys.length }));
      console.log(this.t("usage.checkUsage.missing_keys_missingkeyslength", { missingKeysLength: missingKeys.length }));
      console.log(this.t('usage.notTranslatedKeysTotal', { total: notTranslatedStats.total }));

      // Removed redundant hardcoded console output to avoid duplication
// The translation completeness and not translated keys count are already logged below

      
      // Display translation completeness
      console.log(this.t("usage.checkUsage.translation_completeness_title"));
      for (const [language, stats] of this.translationStats) {
        const completeness = ((stats.translated / stats.total) * 100).toFixed(1);
        console.log(this.t("usage.checkUsage.language_completeness_stats", {
          language: language.toUpperCase(),
          completeness,
          translated: stats.translated,
          total: stats.total
        }));
      }
      
      // Show some examples
      if (unusedKeys.length > 0) {
        console.log(this.t("usage.checkUsage.n_sample_unused_keys"));
        unusedKeys.slice(0, 5).forEach(key => {
          console.log(this.t("usage.checkUsage.key", { key }));
        });
        if (unusedKeys.length > 5) {
          console.log(this.t("usage.checkUsage.and_unusedkeyslength_5_more", { count: unusedKeys.length - 5 }));
        }
      }
      
      if (missingKeys.length > 0) {
        console.log(this.t("usage.checkUsage.n_sample_missing_keys"));
        missingKeys.slice(0, 5).forEach(key => {
          console.log(this.t("usage.checkUsage.key", { key }));
        });
        if (missingKeys.length > 5) {
          console.log(this.t("usage.checkUsage.and_missingkeyslength_5_more", { count: missingKeys.length - 5 }));
        }
      }
      
      // Generate and save report if requested
      if (args.outputReport) {
        console.log(this.t("usage.checkUsage.n_generating_detailed_report"));
        const report = this.generateUsageReport();
        const reportPath = await this.saveReport(report);
        console.log(this.t("usage.checkUsage.report_saved_reportpath", { reportPath }));
      }
      
      // Recommendations
      console.log(this.t("usage.checkUsage.n_recommendations"));
      console.log(this.t("usage.checkUsage.message"));
      
      if (unusedKeys.length > 0) {
        console.log(this.t("usage.checkUsage.consider_removing_unused_trans"));
      }
      
      if (missingKeys.length > 0) {
        console.log(this.t("usage.checkUsage.add_missing_translation_keys_t"));
      }
      
      if (dynamicKeys.length > 0) {
        console.log(this.t("usage.checkUsage.review_dynamic_keys_manually_t"));
      }
      
      if (notTranslatedStats.total > 0) {
        console.log(this.t('usage.reviewNotTranslatedKeys', { total: notTranslatedStats.total }));
      }
      
      if (unusedKeys.length === 0 && missingKeys.length === 0 && notTranslatedStats.total === 0) {
        console.log(this.t("usage.checkUsage.all_translation_keys_are_prope"));
      }
      
      console.log(this.t("usage.checkUsage.n_next_steps"));
      console.log(this.t("usage.checkUsage.1_review_the_analysis_results"));
      if (args.outputReport) {
        console.log(this.t("usage.checkUsage.2_check_the_detailed_report_fo"));
      } else {
        console.log(this.t("usage.checkUsage.2_run_with_outputreport_for_de"));
      }
      console.log(this.t("usage.checkUsage.3_remove_unused_keys_or_add_mi"));
      console.log(this.t("usage.checkUsage.4_rerun_analysis_to_verify_imp"));
      
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
      
      // Close readline interface to prevent hanging
      this.closeReadline();
      
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
      
      // Close readline interface to prevent hanging
      this.closeReadline();
      
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
  
  // Check if we're being called from the menu system (stdin has data)
  // In that case, we should run with default settings without prompting
  const hasStdinData = !process.stdin.isTTY;
  
  if (hasStdinData) {
    // When called from menu, consume stdin data and run with defaults
    process.stdin.resume();
    process.stdin.on('data', () => {});
    process.stdin.on('end', () => {
      // Run analysis with default settings (no prompts)
      analyzer.analyze()
        .then((result) => {
          if (result.success) {
            console.log(analyzer.t('usage.analysisCompletedSuccessfully'));
            process.exit(0);
          } else {
            console.error(analyzer.t('usage.analysisFailed', { error: result.error }));
            process.exit(1);
          }
        })
        .catch((error) => {
          console.error(analyzer.t('usage.analysisFailed', { error: error.message }));
          process.exit(1);
        });
    });
  } else {
    // Normal direct execution
    analyzer.analyze()
      .then((result) => {
        if (result.success) {
          console.log('\n' + analyzer.t('usage.analysisCompletedSuccessfully'));
          process.exit(0);
        } else {
          console.error('\n' + analyzer.t('usage.analysisFailed', { error: result.error }));
          process.exit(1);
        }
      })
      .catch((error) => {
        console.error('\n' + analyzer.t('usage.analysisFailed', { error: error.message }));
        process.exit(1);
      });
  }
}

module.exports = I18nUsageAnalyzer;