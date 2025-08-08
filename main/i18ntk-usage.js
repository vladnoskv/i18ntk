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

const { getUnifiedConfig, parseCommonArgs, displayHelp } = require('../utils/config-helper');

async function getConfig() {
  return getUnifiedConfig('usage');
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
    
    // Use global translation function
    this.t = t;
    
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
    const rl = this.rl || this.initReadline();
    return new Promise((resolve) => {
      rl.question(question, resolve);
    });
  }

  async initialize() {
    try {
      const cliArgs = parseCommonArgs(process.argv.slice(2));
      const defaultConfig = await getUnifiedConfig('usage', cliArgs);
      this.config = { ...defaultConfig, ...(this.config || {}) };
      
      // Load translations for UI
      const uiLanguage = (this.config && this.config.uiLanguage) || 'en';
      loadTranslations(uiLanguage, path.resolve(__dirname, '..', 'ui-locales'));
      this.t = t;
      
      // Resolve paths using projectRoot as base
      const projectRoot = path.resolve(this.config.projectRoot || '.');
      this.sourceDir = this.config.sourceDir;
      this.i18nDir = this.config.i18nDir;
      this.sourceLanguageDir = path.join(this.i18nDir, this.config.sourceLanguage);
      
      // Ensure translation patterns are defined
      this.config = this.config || {};
      this.config.translationPatterns = this.config.translationPatterns || [
        // React i18next patterns
        /t\(['"`]([^'"`]+)['"`]/g,
        /i18n\.t\(['"`]([^'"`]+)['"`]/g,
        /useTranslation\(\)\.t\(['"`]([^'"`]+)['"`]/g,
        // Template literal patterns
        /t\(`([^`]+)`\)/g,
        // JSX patterns
        /i18nKey=['"`]([^'"`]+)['"`]/g,
        // Common patterns
        /\$t\(['"`]([^'"`]+)['"`]/g,
        /getTranslation\(['"`]([^'"`]+)['"`]/g
      ];
      
      // Ensure defaults for other config values
      this.config = this.config || {};
      if (!Array.isArray(this.config.excludeDirs)) {
        this.config.excludeDirs = ['node_modules', '.git'];
      }
      if (!Array.isArray(this.config.includeExtensions) && !Array.isArray(this.config.supportedExtensions)) {
        this.config.includeExtensions = ['.js', '.jsx', '.ts', '.tsx'];
      }
      
      await SecurityUtils.logSecurityEvent(this.t('usage.analyzerInitialized'), { component: 'i18ntk-usage' });
    } catch (error) {
      await SecurityUtils.logSecurityEvent(this.t('usage.analyzerInitFailed'), { component: 'i18ntk-usage', error: error.message });
      throw error;
    }
  }

  // Normalize CLI arguments to handle both camelCase and hyphenated flags
  normalizeArgs(a) {
    return {
      sourceDir: a.sourceDir ?? a['source-dir'],
      i18nDir: a.i18nDir ?? a['i18n-dir'],
      outputReport: a.outputReport ?? a['output-report'],
      outputDir: a.outputDir ?? a['output-dir'],
      uiLanguage: a.uiLanguage ?? a['ui-language'],
      help: a.help || a.h,
      noPrompt: a.noPrompt ?? a['no-prompt'],
      strict: a.strict,
      debug: a.debug
    };
  }

  // Parse command line arguments
  async parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};
    
    for (const arg of args) {
      if (arg.startsWith('--')) {
        const [key, value] = arg.substring(2).split('=');
        if (value !== undefined) {
          parsed[key] = value;
        } else {
          parsed[key] = true;
        }
      } else if (arg.startsWith('-')) {
        const key = arg.substring(1);
        parsed[key] = true;
      }
    }
    
    return this.normalizeArgs(parsed);
  }

  // NEW: Recursively discover all translation files in modular structure
  async discoverTranslationFiles(baseDir, language = (this.config && this.config.sourceLanguage) || 'en') {
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
              // Skip excluded directories with null-safety
              const excludes = Array.isArray(this.config.excludeDirs) ? this.config.excludeDirs : [];
              if (!excludes.includes(item)) {
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
  async getAllFiles(dir, extensions = (this.config && (this.config.includeExtensions || this.config.supportedExtensions)) || ['.js', '.jsx', '.ts', '.tsx']) {
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
    
    // Null-safe extensions handling
        const safeExtensions = Array.isArray(extensions) ? extensions : ['.js', '.jsx', '.ts', '.tsx'];
    const skipRoot = path.resolve(this.i18nDir || '');
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
              const excludes = Array.isArray(this.config.excludeDirs) ? this.config.excludeDirs : [];
              if (!excludes.includes(item)) {
                // hard-skip the locales root to avoid reading JSON
                if (skipRoot && path.resolve(itemPath).startsWith(skipRoot)) continue;
                await traverse(itemPath);
              }
            } else if (stat.isFile()) {
              // Skip JSON files entirely to prevent scanning translation files
              if (itemPath.endsWith('.json')) continue;
              
              // Include files with specified extensions, but exclude toolkit files
              const ext = path.extname(item);
              // Ensure extension has dot prefix
              const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
              const normalizedExtensions = safeExtensions.map(ext => ext.startsWith('.') ? ext : `.${ext}`);
              if (normalizedExtensions.includes(normalizedExt) && !excludeFiles.includes(item)) {
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

  async run(options = {}) {
    const { fromMenu = false } = options;
    
    // Parse command line arguments for strict/debug flags
    const args = await this.parseArgs();
    const cliOptions = {
      strict: process.argv.includes('--strict'),
      debug: process.argv.includes('--debug')
    };
    
    if (cliOptions.debug) {
      console.log('🔍 Debug mode enabled');
    }
    
    try {
      // Ensure config is always initialized
      if (!this.config) {
        this.config = {};
      }
      
      // Initialize configuration properly when called from menu
      if (fromMenu && !this.sourceDir) {
        const baseConfig = await getUnifiedConfig('usage', args);
        this.config = { ...baseConfig, ...(this.config || {}) };
        
        const uiLanguage = (this.config && this.config.uiLanguage) || 'en';
        loadTranslations(uiLanguage, path.resolve(__dirname, '..', 'ui-locales'));
        this.t = t;
        
        // ✅ ensure defaults when skipping initialize()
        if (!Array.isArray(this.config.translationPatterns)) {
          this.config.translationPatterns = [
            /t\(['"`]([^'"`]+)['"`]/g,
            /i18n\.t\(['"`]([^'"`]+)['"`]/g,
            /useTranslation\(\)\.t\(['"`]([^'"`]+)['"`]/g,
            /t\(`([^`]+)`\)/g,
            /i18nKey=['"`]([^'"`]+)['"`]/g,
            /\$t\(['"`]([^'"`]+)['"`]/g,
            /getTranslation\(['"`]([^'"`]+)['"`]/g
          ];
        }
        if (!Array.isArray(this.config.excludeDirs)) {
          this.config.excludeDirs = ['node_modules', '.git'];
        }
        if (!Array.isArray(this.config.includeExtensions) && !Array.isArray(this.config.supportedExtensions)) {
          this.config.includeExtensions = ['.js', '.jsx', '.ts', '.tsx'];
        }

        this.sourceDir = this.config.sourceDir;
        this.i18nDir = this.config.i18nDir;
        this.sourceLanguageDir = path.join(this.i18nDir, this.config.sourceLanguage);
      } else {
        await this.initialize();
      }
      
      // Skip admin authentication when called from menu
      if (!fromMenu) {
        const isCalledDirectly = require.main === module;
        if (isCalledDirectly && !args.noPrompt) {
          // Only check admin authentication when running directly and not in no-prompt mode
          const AdminAuth = require('../utils/admin-auth');
          const adminAuth = new AdminAuth();
          await adminAuth.initialize();
          
          const isRequired = await adminAuth.isAuthRequired();
          if (isRequired) {
            console.log('\n' + this.t('adminCli.authRequiredForOperation', { operation: 'analyze usage' }));
            
            // Create readline interface for PIN input
            const readline = require('readline');
            const rl = readline.createInterface({
              input: process.stdin,
              output: process.stdout
            });
            
            const pin = await new Promise(resolve => {
              rl.question(this.t('adminCli.enterPin'), resolve);
            });
            
            const isValid = await adminAuth.verifyPin(pin);
            rl.close();
            
            if (!isValid) {
              console.log(this.t('adminCli.invalidPin'));
              if (!fromMenu) process.exit(1);
              return { success: false, error: 'Authentication failed' };
            }
            
            console.log(this.t('adminCli.authenticationSuccess'));
          }
        }
      }
      
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
      
      // Ensure sourceDir points to source code, not locales
      if (!args.sourceDir && this.config.sourceDir === this.config.i18nDir) {
        // Default to common source directories if not explicitly provided
        const possibleSourceDirs = ['src', 'lib', 'app', 'source'];
        const projectRoot = this.config.projectRoot || '.';
        
        for (const dir of possibleSourceDirs) {
          const testPath = path.resolve(projectRoot, dir);
          if (fs.existsSync(testPath)) {
            this.config.sourceDir = testPath;
            this.sourceDir = testPath;
            break;
          }
        }
        
        // If no common source directory found, use current directory
        if (this.config.sourceDir === this.config.i18nDir) {
          this.config.sourceDir = projectRoot;
          this.sourceDir = projectRoot;
        }
      }

      // 🚧 prevent scanning locales as source
      if (path.resolve(this.sourceDir) === path.resolve(this.i18nDir)) {
        const fallback = path.resolve(this.config.projectRoot || '.', 'src');
        console.warn(this.t('usage.sourceEqualsI18nWarn') ||
          `⚠️ sourceDir equals i18nDir (${this.sourceDir}). Falling back to ${fallback} for source scanning.`);
        this.sourceDir = fallback;
      }
      
      console.log(this.t('usage.detectedSourceDirectory', { sourceDir: this.sourceDir }));
      console.log(this.t('usage.detectedI18nDirectory', { i18nDir: this.i18nDir }));
      
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
      
      // Sanity check: warn if 0 used keys but available keys exist
      if (this.availableKeys.size > 0 && this.usedKeys.size === 0) {
        console.warn('\n⚠️  ' + (this.t('operations.usage.noUsedKeysHint') || 'Found translations but no usage in source. Check --source-dir and translationPatterns.'));
      }
      
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
    
      if (require.main === module && !args.noPrompt) {
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
    console.log(`
📊 i18ntk usage - Translation key usage analysis

Usage:
  node i18ntk-usage.js [options]
  npm run i18ntk:usage -- [options]

Options:
  --source-dir=<path>    Source code directory to scan (default: ./src)
  --i18n-dir=<path>      Directory containing translation files (default: ./src/i18n/locales)
  --output-report        Generate detailed usage report
  --output-dir=<path>    Directory for output reports (default: ./i18ntk-reports/usage)
  --strict               Show all warnings and errors during analysis
  --debug                Enable debug mode with stack traces
  --no-prompt            Skip interactive prompts (useful for CI/CD)
  --help, -h             Show this help message

Examples:
  node i18ntk-usage.js --source-dir=./src --i18n-dir=./translations --output-report
  npm run i18ntk:usage -- --strict --debug
  node i18ntk-usage.js --no-prompt --output-dir=./reports

Analysis Features:
  • Detects unused translation keys
  • Identifies missing translation keys
  • Shows translation completeness by language
  • Reports NOT_TRANSLATED values
  • Supports modular folder structures
  • Generates detailed reports
`);
  }

  // NEW: Enhanced translation key loading with modular support
  async getAllTranslationKeys() {
    const keys = new Set();
    const isStrict = process.argv.includes('--strict');
    const isDebug = process.argv.includes('--debug');
    
    try {
      // Discover all translation files in the i18n directory
      const translationFiles = await this.discoverTranslationFiles(this.i18nDir, this.config.sourceLanguage);
      
      console.log(this.t('usage.foundTranslationFiles', { count: translationFiles.length }));
      
      for (const fileInfo of translationFiles) {
        try {
          await SecurityUtils.validatePath(fileInfo.filePath);
          
          // Check if file exists and is readable
          if (!fs.existsSync(fileInfo.filePath)) {
            if (isDebug || isStrict) {
              console.warn(`⚠️  File not found: ${path.basename(fileInfo.filePath)}`);
            }
            continue;
          }
          
          const content = await SecurityUtils.safeReadFile(fileInfo.filePath);
          
          // Handle empty files
          if (!content || content.trim() === '') {
            if (isDebug || isStrict) {
              console.warn(`⚠️  Empty file: ${path.basename(fileInfo.filePath)}`);
            }
            continue;
          }
          
          const jsonData = await SecurityUtils.safeParseJSON(content);
          
          // Validate JSON structure before processing
          if (jsonData === null || jsonData === undefined) {
            if (isDebug || isStrict) {
              console.warn(`⚠️  Null/undefined JSON data: ${path.basename(fileInfo.filePath)}`);
            }
            continue;
          }
          
          if (typeof jsonData !== 'object') {
            if (isDebug || isStrict) {
              console.warn(`⚠️  Invalid JSON structure (not an object): ${path.basename(fileInfo.filePath)}`);
            }
            continue;
          }
          
          if (Array.isArray(jsonData)) {
            if (isDebug || isStrict) {
              console.warn(`⚠️  Invalid JSON structure (array instead of object): ${path.basename(fileInfo.filePath)}`);
            }
            continue;
          }
          
          // Store file info for later analysis
          this.translationFiles.set(fileInfo.filePath, fileInfo);
          
          const fileKeys = this.extractKeysFromObject(jsonData, '', fileInfo.namespace);
          fileKeys.forEach(key => keys.add(key));
          
          if (isDebug) {
            console.log(this.t('usage.fileInfo', { namespace: fileInfo.namespace, keys: fileKeys.length }));
          }
        } catch (error) {
          if (isDebug || isStrict) {
            console.warn(`❌ Failed to extract keys from ${path.basename(fileInfo.filePath)}: ${error.message}`);
          }
          if (isDebug) {
            console.error(error.stack);
          }
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
    
    // Validate input object before processing
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return keys; // Return empty array for invalid input
    }
    
    try {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          keys.push(...this.extractKeysFromObject(value, fullKey, namespace));
        } else {
          // Add dot notation key (e.g., "pagination.showing")
          keys.push(fullKey);
        }
      }
    } catch (error) {
      // Handle any unexpected errors during key extraction
      console.warn(`⚠️  Error during key extraction: ${error.message}`);
      return keys;
    }
    
    return keys;
  }

  // Extract translation keys from source code with enhanced patterns
  extractKeysFromFile(filePath) {
    try {
      const content = SecurityUtils.safeReadFileSync(filePath);
      if (!content) return [];
      
      // Skip JSON files entirely to prevent scanning translation files
      if (filePath.endsWith('.json')) return [];
      
      const keys = [];
      
      // Null-safe translation patterns handling
      const rawPatterns = Array.isArray(this.config.translationPatterns) ? this.config.translationPatterns : [];
      if (rawPatterns.length === 0) return []; // nothing to match
      
      // Ensure patterns are RegExp objects with better error handling
      const patterns = rawPatterns.map(pattern => {
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
        throw new Error(this.t('validate.sourceLanguageDirectoryNotFound', { sourceDir: this.sourceDir }) || `Source directory not found: ${this.sourceDir}`);
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
            console.log(this.t('usage.processedFiles', { processedFiles, totalFiles: sourceFiles.length }));
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
      
      const isDebug = process.argv.includes('--debug');
      const isStrict = process.argv.includes('--strict');
      
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
                if (isDebug || isStrict) {
                  console.warn(`⚠️  File not found: ${path.basename(fileInfo.filePath)}`);
                }
                continue;
              }
              
              const content = await SecurityUtils.safeReadFile(fileInfo.filePath);
              
              // Handle empty files
              if (!content || content.trim() === '') {
                if (isDebug || isStrict) {
                  console.warn(`⚠️  Empty file: ${path.basename(fileInfo.filePath)}`);
                }
                continue;
              }
              
              const jsonData = await SecurityUtils.safeParseJSON(content);
              
              // Validate JSON structure before processing
              if (jsonData === null || jsonData === undefined) {
                if (isDebug || isStrict) {
                  console.warn(`⚠️  Null/undefined JSON data: ${path.basename(fileInfo.filePath)}`);
                }
                continue;
              }
              
              if (typeof jsonData !== 'object') {
                if (isDebug || isStrict) {
                  console.warn(`⚠️  Invalid JSON structure (not an object): ${path.basename(fileInfo.filePath)}`);
                }
                continue;
              }
              
              if (Array.isArray(jsonData)) {
                if (isDebug || isStrict) {
                  console.warn(`⚠️  Invalid JSON structure (array instead of object): ${path.basename(fileInfo.filePath)}`);
                }
                continue;
              }
              
              const stats = this.analyzeFileCompleteness(jsonData);
              totalKeys += stats.total;
              translatedKeys += stats.translated;
            } catch (error) {
              if (isDebug || isStrict) {
                console.warn(`❌ Failed to analyze file ${path.basename(fileInfo.filePath)}: ${error.message}`);
              }
              if (isDebug) {
                console.error(error.stack);
              }
              continue;
            }
          }
          
          this.translationStats.set(language, {
            total: totalKeys,
            translated: translatedKeys,
            notTranslated: totalKeys - translatedKeys
          });
        } catch (error) {
          if (isDebug || isStrict) {
            console.warn(t('usage.failedToAnalyzeLanguage', { language, error: error.message }));
          }
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
    
    // Validate input object before processing
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return { total: 0, translated: 0 }; // Return empty stats for invalid input
    }
    
    const traverse = (current) => {
      // Validate current object before processing
      if (typeof current !== 'object' || current === null || Array.isArray(current)) {
        return;
      }
      
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
        throw new Error(this.t('validate.sourceLanguageDirectoryNotFound', { sourceDir: this.sourceDir }) || `Source directory not found: ${this.sourceDir}`);
      }
      
      if (!fs.existsSync(this.i18nDir)) {
        throw new Error(this.t('validate.i18nDirectoryNotFound', { i18nDir: this.i18nDir }) || `I18n directory not found: ${this.i18nDir}`);
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
      
      // Prepare output lines
      const outputLines = [];
      outputLines.push(this.t("usage.checkUsage.n"));
      outputLines.push(this.t("usage.checkUsage.usage_analysis_results"));
      outputLines.push(this.t("usage.checkUsage.message"));
      
      outputLines.push(this.t("usage.checkUsage.source_files_scanned_thisfileu", { fileUsageSize: this.fileUsage.size }));
      outputLines.push(this.t("usage.checkUsage.available_translation_keys_thi", { availableKeysSize: this.availableKeys.size }));
      outputLines.push(this.t("usage.checkUsage.used_translation_keys_thisused", { usedKeysSize: this.usedKeys.size - dynamicKeys.length }));
      outputLines.push(this.t("usage.checkUsage.dynamic_keys_detected_dynamick", { dynamicKeysLength: dynamicKeys.length }));
      outputLines.push(this.t("usage.checkUsage.unused_keys_unusedkeyslength", { unusedKeysLength: unusedKeys.length }));
      outputLines.push(this.t("usage.checkUsage.missing_keys_missingkeyslength", { missingKeysLength: missingKeys.length }));
      outputLines.push(this.t('usage.notTranslatedKeysTotal', { total: notTranslatedStats.total }));

      // Removed redundant hardcoded console output to avoid duplication
// The translation completeness and not translated keys count are already logged below

      
      // Display translation completeness
      outputLines.push(this.t("usage.checkUsage.translation_completeness_title"));
      for (const [language, stats] of this.translationStats) {
        const completeness = ((stats.translated / stats.total) * 100).toFixed(1);
        outputLines.push(this.t("usage.checkUsage.language_completeness_stats", {
          language: language.toUpperCase(),
          completeness,
          translated: stats.translated,
          total: stats.total
        }));
      }
      
      // Show some examples
      if (unusedKeys.length > 0) {
        outputLines.push(this.t("usage.checkUsage.n_sample_unused_keys"));
        unusedKeys.slice(0, 5).forEach(key => {
          outputLines.push(this.t("usage.checkUsage.key", { key }));
        });
        if (unusedKeys.length > 5) {
          outputLines.push(this.t("usage.checkUsage.and_unusedkeyslength_5_more", { count: unusedKeys.length - 5 }));
        }
      }
      
      if (missingKeys.length > 0) {
        outputLines.push(this.t("usage.checkUsage.n_sample_missing_keys"));
        missingKeys.slice(0, 5).forEach(key => {
          outputLines.push(this.t("usage.checkUsage.key", { key }));
        });
        if (missingKeys.length > 5) {
          outputLines.push(this.t("usage.checkUsage.and_missingkeyslength_5_more", { count: missingKeys.length - 5 }));
        }
      }
      
      // Generate and save report if requested
      if (args.outputReport) {
        outputLines.push(this.t("usage.checkUsage.n_generating_detailed_report"));
        const report = this.generateUsageReport();
        const reportPath = await this.saveReport(report);
        outputLines.push(this.t("usage.checkUsage.report_saved_reportpath", { reportPath }));
      }
      
      // Recommendations
      outputLines.push(this.t("usage.checkUsage.n_recommendations"));
      outputLines.push(this.t("usage.checkUsage.message"));
      
      if (unusedKeys.length > 0) {
        outputLines.push(this.t("usage.checkUsage.consider_removing_unused_trans"));
      }
      
      if (missingKeys.length > 0) {
        outputLines.push(this.t("usage.checkUsage.add_missing_translation_keys_t"));
      }
      
      if (dynamicKeys.length > 0) {
        outputLines.push(this.t("usage.checkUsage.review_dynamic_keys_manually_t"));
      }
      
      if (notTranslatedStats.total > 0) {
        outputLines.push(this.t('usage.reviewNotTranslatedKeys', { total: notTranslatedStats.total }));
      }
      
      if (unusedKeys.length === 0 && missingKeys.length === 0 && notTranslatedStats.total === 0) {
        outputLines.push(this.t("usage.checkUsage.all_translation_keys_are_prope"));
      }
      
      outputLines.push(this.t("usage.checkUsage.n_next_steps"));
      outputLines.push(this.t("usage.checkUsage.1_review_the_analysis_results"));
      if (args.outputReport) {
        outputLines.push(this.t("usage.checkUsage.2_check_the_detailed_report_fo"));
      } else {
        outputLines.push(this.t("usage.checkUsage.2_run_with_outputreport_for_de"));
      }
      outputLines.push(this.t("usage.checkUsage.3_remove_unused_keys_or_add_mi"));
      outputLines.push(this.t("usage.checkUsage.4_rerun_analysis_to_verify_imp"));
      
      // Display output with truncation if too long
      const maxLines = 100;
      if (outputLines.length > maxLines) {
        outputLines.slice(0, maxLines - 1).forEach(line => console.log(line));
        const reportFile = args.outputReport ? this.getReportPath() : 'report file';
        console.log(`... see report for more details. (${reportFile})`);
      } else {
        outputLines.forEach(line => console.log(line));
      }
      
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
  async function main() {
    try {
      const cliArgs = parseCommonArgs(process.argv.slice(2));
      const config = await getUnifiedConfig('usage', cliArgs);
      const analyzer = new I18nUsageAnalyzer(config);

      if (cliArgs.help) {
        displayHelp('usage');
        process.exit(0);
      }

      // Load UI translations based on settings or default to English
      const uiLanguage = SecurityUtils.sanitizeInput(config.uiLanguage || 'en');
      loadTranslations(uiLanguage, path.resolve(__dirname, '..', 'ui-locales'));
      await analyzer.initialize();
      await analyzer.run(cliArgs);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
  
  // Check if we're being called from the menu system (stdin has data)
  const hasStdinData = !process.stdin.isTTY;
  
  if (hasStdinData) {
    // When called from menu, consume stdin data and run with defaults
    process.stdin.resume();
    process.stdin.on('data', () => {});
    process.stdin.on('end', () => {
      main();
    });
  } else {
    // Normal direct execution
    main();
  }
}

module.exports = I18nUsageAnalyzer;