#!/usr/bin/env node
/**
 * I18NTK USAGE ANALYSIS TOOLKIT - Version 1.8.3
 * 
 * This script analyzes source code to find unused translation keys,
 * missing translations, and provides comprehensive translation completeness analysis.
 * 
 * NEW in v1.8.3:
 * - Enhanced placeholder key detection with validation
 * - Framework-specific pattern recognition
 * - Advanced translation completeness scoring
 * - Security-enhanced path validation
 * - Performance-optimized analysis
 * - Detailed framework usage reports
 * 
 * Features from v1.8.3:
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
const { loadTranslations, t } = require('../utils/i18n-helper');
const { getGlobalReadline, closeGlobalReadline, askHidden } = require('../utils/cli');
const { detectFramework } = require('../utils/framework-detector');
const { getExtractor } = require('../utils/extractor-manager');
const configManager = require('../utils/config-manager');
const SecurityUtils = require('../utils/security');
const AdminCLI = require('../utils/admin-cli');
const SettingsManager = require('../settings/settings-manager');
const settingsManager = new SettingsManager();
const { getUnifiedConfig, parseCommonArgs, displayHelp, validateSourceDir, displayPaths } = require('../utils/config-helper');
const I18nInitializer = require('./i18ntk-init');
const JsonOutput = require('../utils/json-output');
const SetupEnforcer = require('../utils/setup-enforcer');

// Ensure setup is complete before running
(async () => {
  try {
    await SetupEnforcer.checkSetupCompleteAsync();
  } catch (error) {
    console.error('Setup check failed:', error.message);
    process.exit(1);
  }
})();

loadTranslations( 'en', path.resolve(__dirname, '..', 'resources', 'i18n', 'ui-locales'));

async function getConfig() {
  return await getUnifiedConfig('usage');
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
    this.translationFiles = new Map(); // Track all translation files
    this.translationStats = new Map(); // Track translation completeness
    this.extractor = getExtractor(config.extractor);
    this.placeholderKeys = new Set();
    this.placeholderStyles = settingsManager.getDefaultSettings().placeholderStyles || {};
    
    // NEW: Enhanced analysis properties
    this.frameworkUsage = new Map(); // Track framework usage per file
    this.keyComplexity = new Map(); // Track key complexity analysis
    this.startTime = Date.now(); // Track performance metrics
    this.version = '1.10.1'; // Version tracking
    
    // Use global translation function
    this.rl = null;
  }

  // Initialize readline interface
  initReadline() {
    if (!this.rl) {
      return getGlobalReadline();
    }

  }
  
  // Close readline interface
  closeReadline() {
    const { closeGlobalReadline } = require('../utils/cli');
    closeGlobalReadline();
  }
  
  // Prompt for user input
  async prompt(question) {
    const rl = getGlobalReadline();
    return new Promise(resolve => {
      rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  async initialize() {
    try {
      const cliArgs = parseCommonArgs(process.argv.slice(2));
      const defaultConfig = await getUnifiedConfig('usage', cliArgs);
      this.config = { ...defaultConfig, ...(this.config || {}) };
      
      // Load translations for UI
      const uiLanguage = (this.config && this.config.uiLanguage) || 'en';
      loadTranslations(uiLanguage, path.resolve(__dirname, '..', 'resources', 'i18n', 'ui-locales'));
      const projectRoot = path.resolve(this.config.projectRoot || '.');
            const detected = detectFramework(projectRoot);
      if (detected) {
        this.config.translationPatterns = detected.patterns;
        if (!this.config.includeExtensions) {
          this.config.includeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.pyx', '.pyi'];
        }
        if (!this.config.excludeDirs) {
          this.config.excludeDirs = [];
        }
      }
      this.sourceDir = this.config.sourceDir;
      this.i18nDir = this.config.i18nDir;
      this.sourceLanguageDir = path.join(this.i18nDir, this.config.sourceLanguage);

      if (!SecurityUtils.safeExistsSync(this.i18nDir, process.cwd())) {
        console.warn(t('usage.i18nDirectoryNotFound', { i18nDir: this.i18nDir }));
        this.i18nDir = this.sourceDir;
        this.config.i18nDir = this.i18nDir;
        await configManager.updateConfig({ i18nDir: configManager.toRelative(this.sourceDir) });
        this.sourceLanguageDir = path.join(this.i18nDir, this.config.sourceLanguage);
      }

      displayPaths({ sourceDir: this.sourceDir, i18nDir: this.i18nDir, outputDir: this.config.outputDir });
      
      
      // Ensure translation patterns are defined
      this.config = this.config || {};
      this.config.translationPatterns = this.config.translationPatterns || [
        /t\(['"`]([^'"`]+)['"`]/g,
        /i18n\.t\(['"`]([^'"`]+)['"`]/g,
        /useTranslation\(\)\.t\(['"`]([^'"`]+)['"`]/g,
        /t\(`([^`]+)`\)/g,
        /i18nKey=['"`]([^'"`]+)['"`]/g,
        /\$t\(['"`]([^'"`]+)['"`]/g,
        /getTranslation\(['"`]([^'"`]+)['"`]/g
      ];
            this.extractor = getExtractor(this.config.extractor);

      // Ensure defaults for other config values
      this.config = this.config || {};
      if (!Array.isArray(this.config.excludeDirs)) {
        this.config.excludeDirs = ['node_modules', '.git'];
      }
      if (!Array.isArray(this.config.includeExtensions) && !Array.isArray(this.config.supportedExtensions)) {
        this.config.includeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.pyx', '.pyi'];
      }
      
      await SecurityUtils.logSecurityEvent(t('usage.analyzerInitialized'), { component: 'i18ntk-usage' });
    } catch (error) {
      await SecurityUtils.logSecurityEvent(t('usage.analyzerInitFailed'), { component: 'i18ntk-usage', error: error.message });
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
        
        if (!validatedPath || !SecurityUtils.safeExistsSync(validatedPath)) {
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
        await SecurityUtils.logSecurityEvent(t('usage.translationDiscoveryError'), { 
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
  async getAllFiles(dir, extensions = (this.config && (this.config.includeExtensions || this.config.supportedExtensions)) || ['.js', '.jsx', '.ts', '.tsx', '.py', '.pyx', '.pyi']) {
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
        const safeExtensions = Array.isArray(extensions) ? extensions : ['.js', '.jsx', '.ts', '.tsx', '.py', '.pyx', '.pyi'];
    const skipRoot = path.resolve(this.i18nDir || '');
    const traverse = async (currentDir) => {
      try {
        const absoluteDir = path.resolve(currentDir);
        const validatedPath = SecurityUtils.validatePath(absoluteDir, process.cwd());
        
        if (!validatedPath || !SecurityUtils.safeExistsSync(validatedPath)) {
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
        await SecurityUtils.logSecurityEvent(t('usage.fileTraversalError'), { 
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
      
      // Ensure configuration is loaded - no need for .i18ntk directory check
      if (!this.config) {
        this.config = {};
      }
      
      // Initialize configuration properly when called from menu
      if (fromMenu && !this.sourceDir) {
        const baseConfig = await getUnifiedConfig('usage', args);
        this.config = { ...baseConfig, ...(this.config || {}) };
        
        const uiLanguage = (this.config && this.config.uiLanguage) || 'en';
        loadTranslations(uiLanguage, path.resolve(__dirname, '..', 'resources', 'i18n', 'ui-locales'));
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
          this.config.includeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.pyx', '.pyi'];
        }

        this.sourceDir = this.config.sourceDir;
        this.i18nDir = this.config.i18nDir;
        this.sourceLanguageDir = path.join(this.i18nDir, this.config.sourceLanguage);
        if (fromMenu && (!this.config.sourceDir || this.config.sourceDir === this.config.i18nDir)) {
          console.log('⚠️  Go to Settings → Directory Settings or run with --source-dir');
        }
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
            console.log('\n' + t('adminCli.authRequiredForOperation', { operation: 'analyze usage' }));
            
            const pin = await askHidden(t('adminCli.enterPin'));

            const isValid = await adminAuth.verifyPin(pin);
            
            if (!isValid) {
              console.log(t('adminCli.invalidPin'));
              if (!fromMenu) process.exit(1);
              return { success: false, error: 'Authentication failed' };
            }
            
            console.log(t('adminCli.authenticationSuccess'));
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
      
      if (this.sourceDir || this.i18nDir) {
        await configManager.updateConfig({
          sourceDir: configManager.toRelative(this.sourceDir || this.config.sourceDir),
          i18nDir: configManager.toRelative(this.i18nDir || this.config.i18nDir)
        });
      }
      
      // Ensure sourceDir points to source code, not locales
      if (!args.sourceDir && this.config.sourceDir === this.config.i18nDir) {
        // Default to common source directories if not explicitly provided
        const possibleSourceDirs = ['src', 'lib', 'app', 'source'];
        const projectRoot = this.config.projectRoot || '.';
        
        for (const dir of possibleSourceDirs) {
          const testPath = path.resolve(projectRoot, dir);
          if (SecurityUtils.safeExistsSync(testPath)) {
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
        console.warn(t('usage.sourceEqualsI18nWarn') ||
          `⚠️ sourceDir equals i18nDir (${this.sourceDir}). Falling back to ${fallback} for source scanning.`);
        if (SecurityUtils.safeExistsSync(fallback)) {
          this.sourceDir = fallback;
        } else {
          console.warn(`⚠️ Fallback directory ${fallback} does not exist. Using project root for source scanning.`);
          this.sourceDir = path.resolve(this.config.projectRoot || '.');
        }
        this.config.sourceDir = this.sourceDir;
        await configManager.updateConfig({
          sourceDir: configManager.toRelative(this.sourceDir)
        });
      }
      
      console.log(t('usage.detectedSourceDirectory', { sourceDir: this.sourceDir }));
      console.log(t('usage.detectedI18nDirectory', { i18nDir: this.i18nDir }));
      
      // Load available translation keys first
      await this.loadAvailableKeys();
      
      // NEW: Detect framework patterns before analysis
      await this.detectFrameworkPatterns();
      
      // Perform usage analysis with enhanced features
      await this.analyzeUsage();
      
      // NEW: Validate placeholder keys
      await this.validatePlaceholderKeys();
      
      // Analyze translation completeness with enhanced scoring
      await this.analyzeTranslationCompleteness();
      
      // Calculate key complexity analysis
      await this.analyzeKeyComplexity();
      
      // Generate and display results
      const unusedKeys = this.findUnusedKeys();
      const missingKeys = this.findMissingKeys();
      const notTranslatedStats = this.getNotTranslatedStats();
      
      // Calculate performance metrics
      const duration = Date.now() - this.startTime;
      
      console.log('\n' + t('usage.analysisResults'));
      console.log('   ' + t('usage.availableKeysCount', { count: this.availableKeys.size }));
      console.log('   ' + t('usage.usedKeysCount', { count: this.usedKeys.size }));
      console.log(t('usage.unusedKeysCount', { count: unusedKeys.length }));
      console.log(t('usage.missingKeysCount', { count: missingKeys.length }));
      console.log(t('usage.notTranslatedKeysTotal', { total: notTranslatedStats.total }));
      
      // NEW: Display performance metrics
      console.log(`\n📊 Performance: ${duration}ms (${this.availableKeys.size} keys processed)`);
      
      // NEW: Display framework usage
      if (this.frameworkUsage.size > 0) {
        console.log('\n🛠️  Framework Detection:');
        const frameworkCounts = new Map();
        
        // Aggregate framework counts
        for (const [filePath, frameworkInfo] of this.frameworkUsage) {
          const frameworkName = frameworkInfo.framework || 'generic';
          frameworkCounts.set(frameworkName, (frameworkCounts.get(frameworkName) || 0) + 1);
        }
        
        if (frameworkCounts.size > 0) {
          for (const [framework, count] of frameworkCounts) {
            console.log(`   ${framework}: ${count} files`);
          }
        } else {
          console.log('   No Framework: 0 files');
        }
      } else {
        console.log('\n🛠️  Framework Detection:');
        console.log('   No Framework: 0 files');
      }
      
      // NEW: Display key complexity analysis
      const complexityValues = Array.from(this.keyComplexity.values()).map(c => c.segments || 0);
      const avgComplexity = complexityValues.length > 0 ? 
        complexityValues.reduce((a, b) => a + b, 0) / complexityValues.length : 0;
      console.log(`\n🔍 Key Complexity: ${avgComplexity.toFixed(2)} avg depth`);
      
      // Sanity check: warn if 0 used keys but available keys exist
      if (this.availableKeys.size > 0 && this.usedKeys.size === 0) {
        console.warn('\n⚠️  ' + (t('operations.usage.noUsedKeysHint') || 'Found translations but no usage in source. Check --source-dir and translationPatterns.'));
      }
      
      // Display translation completeness by language with enhanced scoring
      console.log(t('common.languageCompletenessTitle'));
      for (const [language, stats] of this.translationStats) {
        const completeness = ((stats.translated / stats.total) * 100).toFixed(1);
        const score = this.calculateTranslationScore(language, stats);
        console.log(t('summary.usageReportLanguageCompleteness', { 
          language: language.toUpperCase(), 
          completeness, 
          translated: stats.translated, 
          total: stats.total
        }));
      }
      
      if (args.outputReport) {
        const report = this.generateUsageReport();
        await this.saveReport(report, args.outputDir);
      }
      
      console.log('\n' + t('usage.analysisCompletedSuccessfully'));
    
      if (require.main === module && !args.noPrompt) {
        await this.prompt('\nPress Enter to continue...');
      }
      this.closeReadline();
      
    } catch (error) {
      console.error(t('usage.analysisFailedError'), error.message);
      this.closeReadline();
      SecurityUtils.logSecurityEvent(t('usage.usageAnalysisFailed'), { 
        component: 'i18ntk-usage', 
        error: error.message 
      });
      throw error;
    }
  }

  // Show help message
  showHelp() {
    console.log(`
📊 i18ntk usage - Translation key usage analysis (v1.8.3)

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
  --validate-placeholders Enable placeholder key validation
  --framework-detect     Enable framework-specific pattern detection
  --performance-mode     Enable performance metrics tracking
  --help, -h             Show this help message

Examples:
  node i18ntk-usage.js --source-dir=./src --i18n-dir=./translations --output-report
  npm run i18ntk:usage -- --strict --debug --validate-placeholders
  node i18ntk-usage.js --no-prompt --performance-mode --output-dir=./reports

Analysis Features (v1.8.3):
  • Detects unused translation keys
  • Identifies missing translation keys
  • Shows translation completeness by language
  • Reports NOT_TRANSLATED values
  • Supports modular folder structures
  • Enhanced placeholder key detection
  • Framework-specific pattern recognition (React, Vue, Angular)
  • Advanced translation completeness scoring
  • Performance metrics and optimization tracking
  • Key complexity analysis
  • Security-enhanced path validation
  • Detailed reporting with validation errors
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
      
      console.log(t('usage.foundTranslationFiles', { count: translationFiles.length }));
      
      for (const fileInfo of translationFiles) {
        try {
          await SecurityUtils.validatePath(fileInfo.filePath);
          
          // Check if file exists and is readable
          if (!SecurityUtils.safeExistsSync(fileInfo.filePath)) {
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
          this.collectPlaceholderKeys(jsonData, '', fileInfo.language);
          
          if (isDebug) {
            console.log(t('usage.fileInfo', { namespace: fileInfo.namespace, keys: fileKeys.length }));
          }
        } catch (error) {
          if (isDebug || isStrict) {
            console.warn(`❌ Failed to extract keys from ${path.basename(fileInfo.filePath)}: ${error.message}`);
          }
          if (isDebug) {
            console.error(error.stack);
          }
          await SecurityUtils.logSecurityEvent(t('usage.translationFileParseError'), {
            component: 'i18ntk-usage',
            file: fileInfo.filePath,
            error: error.message
          });
        }
      }
    } catch (error) {
      await SecurityUtils.logSecurityEvent(t('usage.translationKeysLoadError'), {
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

  collectPlaceholderKeys(obj, prefix = '', language) {
    const patterns = this.placeholderStyles[language] || [];
    const regexes = patterns.map(p => new RegExp(p));
    if (typeof obj !== 'object' || obj === null) return;

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        this.collectPlaceholderKeys(value, fullKey, language);
      } else if (typeof value === 'string' && regexes.some(r => r.test(value))) {
        this.placeholderKeys.add(fullKey);
      }
    }
  }

  // Extract translation keys from source code with enhanced patterns
  extractKeysFromFile(filePath) {
    try {
      const content = SecurityUtils.safeReadFileSync(filePath, path.dirname(filePath), 'utf8');
      if (!content) return [];
      
      // Skip JSON files entirely to prevent scanning translation files
      if (filePath.endsWith('.json')) return [];
      const rawPatterns = Array.isArray(this.config.translationPatterns) ? this.config.translationPatterns : [];
      if (rawPatterns.length === 0) return [];

      return this.extractor.extract(content, rawPatterns);
      
      // Null-safe translation patterns handling
    } catch (error) {
      console.warn(`${t('usage.failedToExtractKeys')} ${filePath}: ${error.message}`);
      return [];
    }
  }

  // Analyze usage in source files
  async analyzeUsage() {
    try {
      console.log(t('usage.checkUsage.analyzing_source_files'));
      
      // Check if source directory exists
      if (!SecurityUtils.safeExistsSync(this.sourceDir)) {
        throw new Error(this.t('usage.sourceDirectoryDoesNotExist', { dir: this.sourceDir }) || `Source directory not found: ${this.sourceDir}`);
      }
      
      const sourceFiles = await this.getAllFiles(this.sourceDir);
      console.log(t('usage.checkUsage.found_files_in_source', { numFiles: sourceFiles.length }));
      
      // If no files found, exit gracefully
      if (sourceFiles.length === 0) {
        console.warn(t('usage.noSourceFilesFound'));
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
          console.warn(`${t('usage.failedToProcessFile')} ${filePath}: ${fileError.message}`);
          continue;
        }
      }
      
      console.log(t("usage.checkUsage.found_thisusedkeyssize_unique_", { usedKeysSize: this.usedKeys.size }));
      console.log(t("usage.checkUsage.total_key_usages_totalkeysfoun", { totalKeysFound }));
      
    } catch (error) {
     console.error(t('usage.failedToAnalyzeUsage', { error: error.message }));
      throw error;
    }
  }

  // Load available translation keys
  async loadAvailableKeys() {
    console.log(t("usage.checkUsage.loading_available_translation_"));

    this.availableKeys = await this.getAllTranslationKeys();
    console.log(t("usage.checkUsage.found_thisavailablekeyssize_av", { availableKeysSize: this.availableKeys.size }));
    if (this.placeholderKeys.size > 0) {
      console.log('Placeholder translation keys detected: ' + Array.from(this.placeholderKeys).join(', '));
    }
  }

  // NEW: Analyze translation completeness across all languages
  async analyzeTranslationCompleteness() {
    try {
      console.log('\n📊 Analyzing translation completeness...');
      
      const isDebug = process.argv.includes('--debug');
      const isStrict = process.argv.includes('--strict');
      
      // Check if i18n directory exists
      if (!SecurityUtils.safeExistsSync(this.i18nDir, process.cwd())) {
        console.warn(t('usage.i18nDirectoryNotFound', { i18nDir: this.i18nDir }));
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
              return SecurityUtils.safeExistsSync(itemPath) && fs.statSync(itemPath).isDirectory();
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
        console.warn(`${t('usage.errorReadingI18nDirectory')} ${error.message}`);
        return;
      }
      
      // If no languages found, exit gracefully
      if (languages.size === 0) {
        console.warn(t('usage.checkUsage.noTranslationLanguagesFound'));
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
              if (!SecurityUtils.safeExistsSync(fileInfo.filePath)) {
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
    
    let report = `${t('summary.usageReportTitle')}\n`;
    report += `${t('summary.usageReportGenerated', { timestamp })}\n`;
    report += `${t('summary.usageReportSourceDir', { sourceDir: this.sourceDir })}\n`;
    report += `${t('summary.usageReportI18nDir', { i18nDir: this.i18nDir })}\n`;
    report += `Version: ${this.version}\n\n`;
    
    // Performance metrics
    const analysisTime = Date.now() - this.startTime;
    report += `⚡ Performance Metrics:\n`;
    report += `  Analysis completed in: ${analysisTime}ms\n`;
    report += `  Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n\n`;
    
    // Summary
    report += `${t('summary.usageReportSummary')}\n`;
    report += `${'='.repeat(50)}\n`;
    report += `${t('summary.usageReportSourceFilesScanned', { count: this.fileUsage.size })}\n`;
    report += `${t('summary.usageReportTranslationFilesFound', { count: this.translationFiles.size })}\n`;
    report += `${t('summary.usageReportAvailableKeys', { count: this.availableKeys.size })}\n`;
    report += `${t('summary.usageReportUsedKeys', { count: this.usedKeys.size - dynamicKeys.length })}\n`;
    report += `${t('summary.usageReportDynamicKeys', { count: dynamicKeys.length })}\n`;
    report += `${t('summary.usageReportUnusedKeys', { count: unusedKeys.length })}\n`;
    report += `${t('summary.usageReportMissingKeys', { count: missingKeys.length })}\n`;
    report += `${t('summary.usageReportNotTranslatedKeys', { count: notTranslatedStats.total })}\n\n`;
    
    // Framework usage analysis
    if (this.frameworkUsage && this.frameworkUsage.size > 0) {
      report += `🏗️ Framework Usage Analysis:\n`;
      const frameworkCounts = {};
      this.frameworkUsage.forEach((data, filePath) => {
        const framework = data.framework;
        if (!frameworkCounts[framework]) frameworkCounts[framework] = 0;
        frameworkCounts[framework]++;
      });
      
      Object.entries(frameworkCounts).forEach(([framework, count]) => {
        report += `  ${framework}: ${count} files\n`;
      });
      report += `\n`;
    }
    
    // Translation completeness with advanced scoring
    report += `${t('summary.usageReportTranslationCompleteness')}\n`;
    report += `${'='.repeat(50)}\n`;
    for (const [language, stats] of this.translationStats) {
      const translations = this.translationsByLanguage[language] || {};
      const score = this.calculateTranslationScore ? this.calculateTranslationScore(language, translations) : {
        completeness: ((stats.translated / stats.total) * 100).toFixed(1),
        quality: ((stats.translated / stats.total) * 100).toFixed(1),
        placeholderAccuracy: 100
      };
      
      report += `${t('summary.usageReportLanguageCompleteness', { language: language.toUpperCase(), completeness: score.completeness, translated: stats.translated, total: stats.total })}\n`;
      report += `  Quality: ${score.quality}%\n`;
      report += `  Placeholder Accuracy: ${score.placeholderAccuracy}%\n`;
      
      if (stats.notTranslated > 0) {
        report += `${t('summary.usageReportNotTranslatedInLanguage', { count: stats.notTranslated })}\n`;
      }
      report += `\n`;
    }
    
    // Translation files discovered
    report += `${t('summary.usageReportTranslationFilesDiscovered')}\n`;
    report += `${'='.repeat(50)}\n`;
    for (const [filePath, fileInfo] of this.translationFiles) {
      const relativePath = path.relative(this.i18nDir, filePath);
      report += `${t('summary.usageReportFileInfo', { relativePath, namespace: fileInfo.namespace, type: fileInfo.type })}\n`;
    }
    report += `\n`;
    
    // Key complexity analysis
    if (this.keyComplexity && this.keyComplexity.size > 0) {
      report += `🔍 Key Complexity Analysis:\n`;
      const complexityStats = { simple: 0, moderate: 0, complex: 0 };
      this.keyComplexity.forEach((data, key) => {
        complexityStats[data.level]++;
      });
      
      report += `  Simple keys: ${complexityStats.simple}\n`;
      report += `  Moderate keys: ${complexityStats.moderate}\n`;
      report += `  Complex keys: ${complexityStats.complex}\n\n`;
    }
    
    // Unused keys with complexity
    if (unusedKeys.length > 0) {
      report += `${t('summary.usageReportUnusedTranslationKeys')}\n`;
      report += `${'='.repeat(50)}\n`;
      report += `${t('summary.usageReportUnusedKeysDescription')}\n\n`;
      
      unusedKeys.slice(0, 100).forEach(key => {
        const complexity = this.keyComplexity && this.keyComplexity.get(key);
        const complexityLevel = complexity ? ` (${complexity.level})` : '';
        report += `${t('summary.usageReportUnusedKey', { key: key + complexityLevel })}\n`;
      });
      
      if (unusedKeys.length > 100) {
        report += `${t('summary.usageReportMoreUnusedKeys', { count: unusedKeys.length - 100 })}\n`;
      }
      
      report += `\n`;
    }
    
    // Missing keys with location and framework
    if (missingKeys.length > 0) {
      report += `${t('summary.usageReportMissingTranslationKeys')}\n`;
      report += `${'='.repeat(50)}\n`;
      report += `${t('summary.usageReportMissingKeysDescription')}\n\n`;
      
      missingKeys.forEach(key => {
        report += `${t('summary.usageReportMissingKey', { key })}\n`;
        
        // Show where it's used
        const usage = this.findKeyUsage(key);
        usage.slice(0, 3).forEach(({ filePath }) => {
          const framework = this.frameworkUsage && this.frameworkUsage.get(filePath);
          const frameworkInfo = framework ? ` [${framework.framework}]` : '';
          report += `   ${t('summary.usageReportUsedIn', { filePath: filePath + frameworkInfo })}\n`;
        });
        
        if (usage.length > 3) {
          report += `   ${t('summary.usageReportMoreFiles', { count: usage.length - 3 })}\n`;
        }
        
        report += `\n`;
      });
    }
    
    // Dynamic keys
    if (dynamicKeys.length > 0) {
      report += `${t('summary.usageReportDynamicTranslationKeys')}\n`;
      report += `${'='.repeat(50)}\n`;
      report += `${t('summary.usageReportDynamicKeysDescription')}\n\n`;
      
      dynamicKeys.forEach(key => {
        const complexity = this.keyComplexity && this.keyComplexity.get(key);
        const complexityLevel = complexity ? ` (${complexity.level})` : '';
        report += `${t('summary.usageReportDynamicKey', { key: key + complexityLevel })}\n`;
        
        // Show where it's used
        const usage = this.findKeyUsage(key);
        usage.slice(0, 2).forEach(({ filePath }) => {
          const framework = this.frameworkUsage && this.frameworkUsage.get(filePath);
          const frameworkInfo = framework ? ` [${framework.framework}]` : '';
          report += `   ${t('summary.usageReportUsedIn', { filePath: filePath + frameworkInfo })}\n`;
        });
        
        report += `\n`;
      });
    }
    
    // Placeholder validation results
    const placeholderValidations = [];
    Object.entries(this.translationsByLanguage || {}).forEach(([lang, translations]) => {
      Object.entries(translations).forEach(([key, value]) => {
        if (this.validatePlaceholderKeys) {
          const validation = this.validatePlaceholderKeys(key, value);
          if (validation.hasPlaceholders) {
            placeholderValidations.push({ lang, key, validation });
          }
        }
      });
    });
    
    if (placeholderValidations.length > 0) {
      report += `🔧 Placeholder Validation Results:\n`;
      placeholderValidations.forEach(({ lang, key, validation }) => {
        const status = validation.isValid ? '✅' : '❌';
        report += `  ${status} ${lang}.${key}: ${validation.placeholders.join(', ')}\n`;
        if (!validation.isValid) {
          validation.errors.forEach(error => {
            report += `    - ${error}\n`;
          });
        }
      });
      report += `\n`;
    }
    
    // File usage breakdown with framework info
    report += `${t('summary.usageReportFileUsageBreakdown')}\n`;
    report += `${'='.repeat(50)}\n`;
    
    const sortedFiles = Array.from(this.fileUsage.entries())
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, 20);
    
    sortedFiles.forEach(([filePath, keys]) => {
      const framework = this.frameworkUsage && this.frameworkUsage.get(filePath);
      const frameworkInfo = framework ? ` [${framework.framework}]` : '';
      report += `${t('summary.usageReportFileUsage', { filePath: filePath + frameworkInfo, count: keys.length })}\n`;
    });
    
    if (this.fileUsage.size > 20) {
      report += `${t('summary.usageReportMoreFiles', { count: this.fileUsage.size - 20 })}\n`;
    }
    
    return report;
  }

  // Save report to file
  async saveReport(report, outputDir = './i18ntk-reports/usage') {
    try {
      // Ensure output directory exists
      if (!SecurityUtils.safeExistsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `usage-analysis-${timestamp}.txt`;
      const filepath = path.join(outputDir, filename);
      
      await SecurityUtils.safeWriteFile(filepath, report);
      console.log(t('usage.reportSavedTo', { reportPath: filepath }));
      return filepath;
    } catch (error) {
      console.error(t('usage.failedToSaveReport', { error: error.message }));
    }
  }

  // NEW: Enhanced placeholder key detection with validation
  validatePlaceholderKeys(key, value) {
    if (typeof value !== 'string') {
      return {
        key,
        hasPlaceholders: false,
        placeholders: [],
        isValid: true,
        errors: []
      };
    }
    
    const placeholderRegex = /\{\{[^}]+\}\}|\{[^}]+\}|\$\{[^}]+\}/g;
    const placeholders = (typeof value === 'string' ? value : String(value || '')).match(placeholderRegex) || [];
    
    const validation = {
      key,
      hasPlaceholders: placeholders.length > 0,
      placeholders,
      isValid: true,
      errors: []
    };
    
    // Check for common placeholder issues
    placeholders.forEach(placeholder => {
      if (typeof placeholder === 'string') {
        if (placeholder.includes('undefined') || placeholder.includes('null')) {
          validation.isValid = false;
          validation.errors.push(`Invalid placeholder: ${placeholder}`);
        }
        
        // Check for matching opening/closing brackets
        const placeholderStr = String(placeholder || '');
        const openCount = (placeholderStr.match(/\{/g) || []).length;
        const closeCount = (placeholderStr.match(/\}/g) || []).length;
        if (openCount !== closeCount) {
          validation.isValid = false;
          validation.errors.push(`Mismatched brackets in: ${placeholder}`);
        }
      }
    });
    
    return validation;
  }

  // NEW: Framework-specific pattern recognition
  detectFrameworkPatterns(content, filePath) {
    const frameworkPatterns = {
      react: {
        patterns: [
          /useTranslation\(\)/g,
          /Trans\s+component/g,
          /i18nKey\s*=/g,
          /withTranslation\(/g
        ],
        score: 0
      },
      vue: {
        patterns: [
          /\$t\(/g,
          /this\.\$t\(/g,
          /v-t\s*=/g,
          /\$i18n/g
        ],
        score: 0
      },
      angular: {
        patterns: [
          /translate\s*\|/g,
          /ngx-translate/g,
          /TranslateService/g,
          /\.instant\(/g
        ],
        score: 0
      }
    };
    
    const contentStr = String(content || '');
    Object.keys(frameworkPatterns).forEach(framework => {
      const config = frameworkPatterns[framework];
      config.patterns.forEach(pattern => {
        const matches = contentStr.match(pattern);
        if (matches) {
          config.score += matches.length;
        }
      });
    });
    
    // Find dominant framework
    let dominantFramework = 'generic';
    let maxScore = 0;
    
    Object.keys(frameworkPatterns).forEach(framework => {
      if (frameworkPatterns[framework].score > maxScore) {
        maxScore = frameworkPatterns[framework].score;
        dominantFramework = framework;
      }
    });
    
    this.frameworkUsage.set(filePath, {
      framework: dominantFramework,
      score: maxScore,
      patterns: frameworkPatterns[dominantFramework]?.patterns || []
    });
    
    return dominantFramework;
  }

  // NEW: Advanced translation completeness scoring
  calculateTranslationScore(language, translations) {
    const score = {
      completeness: 0,
      quality: 0,
      consistency: 0,
      placeholderAccuracy: 0
    };
    
    const totalKeys = Object.keys(translations).length;
    const translatedKeys = Object.keys(translations).filter(key => 
      translations[key] && 
      translations[key] !== 'NOT_TRANSLATED' && 
      translations[key] !== key
    ).length;
    
    score.completeness = totalKeys > 0 ? (translatedKeys / totalKeys) * 100 : 0;
    
    // Quality scoring based on placeholder accuracy
    const placeholderScores = Object.entries(translations).map(([key, value]) => {
      const validation = this.validatePlaceholderKeys(key, value);
      return validation.isValid ? 1 : 0;
    });
    
    score.placeholderAccuracy = placeholderScores.length > 0 
      ? (placeholderScores.reduce((sum, score) => sum + score, 0) / placeholderScores.length) * 100 
      : 0;
    
    score.quality = (score.completeness + score.placeholderAccuracy) / 2;
    
    return score;
  }

  // NEW: Key complexity analysis
  analyzeKeyComplexity(key) {
    // Ensure key is a string
    const keyStr = String(key || '');
    
    const complexity = {
      level: 'simple',
      segments: keyStr.split('.').length,
      length: keyStr.length,
      hasPlaceholders: false,
      patterns: []
    };
    
    if (complexity.segments > 3) complexity.level = 'complex';
    else if (complexity.segments > 1) complexity.level = 'moderate';
    
    if (keyStr.includes('{{') || keyStr.includes('${')) {
      complexity.hasPlaceholders = true;
      complexity.level = 'complex';
    }
    
    this.keyComplexity.set(keyStr, complexity);
    return complexity;
  }

  // Main analysis process
  async analyze() {
    try {
      // Initialize if not already done
      if (!this.sourceDir || !this.t) {
        await this.initialize();
      }
      
      await SecurityUtils.logSecurityEvent('analysis_started', { component: 'i18ntk-usage' });
      
      console.log(t('usage.checkUsage.title'));
      console.log(t("usage.checkUsage.message"));
      
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
      
      console.log(t("usage.checkUsage.source_directory_thissourcedir", { sourceDir: this.sourceDir }));
      console.log(t("usage.checkUsage.i18n_directory_thisi18ndir", { i18nDir: this.i18nDir }));
      
      // Validate directories
      await SecurityUtils.validatePath(this.sourceDir);
      await SecurityUtils.validatePath(this.i18nDir);
      
      if (!SecurityUtils.safeExistsSync(this.sourceDir)) {
        throw new Error(this.t('usage.sourceDirectoryDoesNotExist', { dir: this.sourceDir }) || `Source directory not found: ${this.sourceDir}`);

      }
      
      if (!SecurityUtils.safeExistsSync(this.i18nDir, process.cwd())) {
        throw new Error(this.t('usage.i18nDirectoryDoesNotExist', { dir: this.i18nDir }) || `I18n directory not found: ${this.i18nDir}`);
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
      outputLines.push(t("usage.checkUsage.n"));
      outputLines.push(t("usage.checkUsage.usage_analysis_results"));
      outputLines.push(t("usage.checkUsage.message"));
      
      outputLines.push(t("usage.checkUsage.source_files_scanned_thisfileu", { fileUsageSize: this.fileUsage.size }));
      outputLines.push(t("usage.checkUsage.available_translation_keys_thi", { availableKeysSize: this.availableKeys.size }));
      outputLines.push(t("usage.checkUsage.used_translation_keys_thisused", { usedKeysSize: this.usedKeys.size - dynamicKeys.length }));
      outputLines.push(t("usage.checkUsage.dynamic_keys_detected_dynamick", { dynamicKeysLength: dynamicKeys.length }));
      outputLines.push(t("usage.checkUsage.unused_keys_unusedkeyslength", { unusedKeysLength: unusedKeys.length }));
      outputLines.push(t("usage.checkUsage.missing_keys_missingkeyslength", { missingKeysLength: missingKeys.length }));
      outputLines.push(t('usage.notTranslatedKeysTotal', { total: notTranslatedStats.total }));

      // Removed redundant hardcoded console output to avoid duplication
// The translation completeness and not translated keys count are already logged below

      
      // Display translation completeness
      outputLines.push(t('common.languageCompletenessTitle'));
      for (const [language, stats] of this.translationStats) {
        const completeness = stats.total > 0 ? ((stats.translated / stats.total) * 100).toFixed(1) : '100.0';
        outputLines.push(t('summary.usageReportLanguageCompleteness', { 
          language: language.toUpperCase(), 
          completeness, 
          translated: stats.translated, 
          total: stats.total 
        }));
      }
      
      // Show some examples
      if (unusedKeys.length > 0) {
        outputLines.push(t("usage.checkUsage.n_sample_unused_keys"));
        unusedKeys.slice(0, 5).forEach(key => {
          outputLines.push(t("usage.checkUsage.key", { key }));
        });
        if (unusedKeys.length > 5) {
          outputLines.push(t("usage.checkUsage.and_unusedkeyslength_5_more", { count: unusedKeys.length - 5 }));
        }
      }
      
      if (missingKeys.length > 0) {
        outputLines.push(t("usage.checkUsage.n_sample_missing_keys"));
        missingKeys.slice(0, 5).forEach(key => {
          outputLines.push(t("usage.checkUsage.key", { key }));
        });
        if (missingKeys.length > 5) {
          outputLines.push(t("usage.checkUsage.and_missingkeyslength_5_more", { count: missingKeys.length - 5 }));
        }
      }
      
      // Generate and save report if requested
      if (args.outputReport) {
        outputLines.push(t("usage.checkUsage.n_generating_detailed_report"));
        const report = this.generateUsageReport();
        const reportPath = await this.saveReport(report);
        outputLines.push(t("usage.checkUsage.report_saved_reportpath", { reportPath }));
      }
      
      // Recommendations
      outputLines.push(t("usage.checkUsage.n_recommendations"));
      outputLines.push(t("usage.checkUsage.message"));
      
      if (unusedKeys.length > 0) {
        outputLines.push(t("usage.checkUsage.consider_removing_unused_trans"));
      }
      
      if (missingKeys.length > 0) {
        outputLines.push(t("usage.checkUsage.add_missing_translation_keys_t"));
      }
      
      if (dynamicKeys.length > 0) {
        outputLines.push(t("usage.checkUsage.review_dynamic_keys_manually_t"));
      }
      
      if (notTranslatedStats.total > 0) {
        outputLines.push(t('usage.reviewNotTranslatedKeys', { total: notTranslatedStats.total }));
      }
      
      if (unusedKeys.length === 0 && missingKeys.length === 0 && notTranslatedStats.total === 0) {
        outputLines.push(t("usage.checkUsage.all_translation_keys_are_prope"));
      }
      
      outputLines.push(t("usage.checkUsage.n_next_steps"));
      outputLines.push(t("usage.checkUsage.1_review_the_analysis_results"));
      if (args.outputReport) {
        outputLines.push(t("usage.checkUsage.2_check_the_detailed_report_fo"));
      } else {
        outputLines.push(t("usage.checkUsage.2_run_with_outputreport_for_de"));
      }
      outputLines.push(t("usage.checkUsage.3_remove_unused_keys_or_add_mi"));
      outputLines.push(t("usage.checkUsage.4_rerun_analysis_to_verify_imp"));
      
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
      
      // Return instead of force exit to allow proper cleanup
      return;
      
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
      console.error(t("checkUsage.usage_analysis_failed"));
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

      if (cliArgs.help) {
        displayHelp('usage');
        process.exit(0);
      }

      // Let run() handle full initialization to avoid duplicate setup output
      const analyzer = new I18nUsageAnalyzer();
      await analyzer.run();
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