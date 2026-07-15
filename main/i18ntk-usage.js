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
const { resolveUsageSourceDir } = require('../utils/usage-source');
const { analyzeSourceForUsageInsights } = require('../utils/usage-insights');
const { discoverLocales } = require('../utils/locale-discovery');
const { isInteractive } = require('../utils/prompt-helper');

// Ensure setup is complete before running
(async () => {
  try {
    await SetupEnforcer.checkSetupCompleteAsync();
  } catch (error) {
    console.error('Setup check failed:', error.message);
    process.exit(1);
  }
})();

loadTranslations('en', path.resolve(__dirname, '..', 'ui-locales'));

async function getConfig() {
  return await getUnifiedConfig('usage');
}

function toBool(v) {
  return v === true || v === 'true' || v === '1';
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
    this.keyUsageLocations = new Map();
    this.hardcodedTextCandidates = [];
    this.namespaceRecommendations = [];
    this.unresolvedDynamicReferences = [];
    this.translationValueIndex = new Map();
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
    
    // Dead key detection properties
    this.deadKeys = new Map();
    this.cleanupMode = false;
    this.dryRunDelete = false;
    this._sourceCommentsSet = null;
    this._dynamicallyReferencedKeys = new Set();
    this._dynamicPrefixes = new Set();
    this._resolvedDynamicExpansions = new Map();
    this._clientBoundaryIssues = [];
    this._mojibakeIssues = [];
    this._copyFormatters = [];
    this._telemetryLiterals = [];
    this._localWrapperRefs = [];
    
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
      loadTranslations(uiLanguage, path.resolve(__dirname, '..', 'ui-locales'));
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

      // Path display deferred until after CLI arg overrides are applied in run()
      
      // Ensure translation patterns are defined
      this.config = this.config || {};
      this.config.translationPatterns = this.config.translationPatterns || [
        /(?<![\w$.])t\s*\(['"`]([^'"`]+)['"`]/g,
        /(?<![\w$.])tx\s*\(['"`]([^'"`]+)['"`]/g,
        /\.tx\s*\(['"`]([^'"`]+)['"`]/g,
        /(?<=[)\s])\.tx\s*\(['"`]([^'"`]+)['"`]/g,
        /i18n\.t\(['"`]([^'"`]+)['"`]/g,
        /useTranslation\(\)\.t\(['"`]([^'"`]+)['"`]/g,
        /(?<![\w$.])t\s*\(`([^`]+)`\)/g,
        /(?<![\w$.])tx\s*\(`([^`]+)`\)/g,
        /\.tx\s*\(`([^`]+)`\)/g,
        /i18nKey=['"`]([^'"`]+)['"`]/g,
        /\$t\(['"`]([^'"`]+)['"`]/g,
        /(?<![\w$.])getTranslation\s*\(['"`]([^'"`]+)['"`]/g
      ];
            this.extractor = getExtractor(this.config.extractor);

      // Ensure defaults for other config values
      this.config = this.config || {};
      if (!Array.isArray(this.config.excludeDirs)) {
        this.config.excludeDirs = ['node_modules', '.git'];
      }
      if (!Array.isArray(this.config.includeExtensions) && !Array.isArray(this.config.supportedExtensions)) {
        this.config.includeExtensions = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.py', '.pyx', '.pyi'];
      }
      
      await SecurityUtils.logSecurityEvent(t('usage.analyzerInitialized'), 'info', { component: 'i18ntk-usage' });
    } catch (error) {
      await SecurityUtils.logSecurityEvent(t('usage.analyzerInitFailed'), 'error', { component: 'i18ntk-usage', error: error.message });
      throw error;
    }
  }

  // Normalize CLI arguments to handle both camelCase and hyphenated flags
  normalizeArgs(a) {
    return {
      sourceDir: a.sourceDir ?? a['source-dir'] ?? a['code-dir'] ?? a['source-code-dir'],
      i18nDir: a.i18nDir ?? a['i18n-dir'] ?? a['locales-dir'],
      sourceLanguage: a.sourceLanguage ?? a['source-language'] ?? a['source-locale'],
      outputReport: a.outputReport ?? a['output-report'],
      outputDir: a.outputDir ?? a['output-dir'],
      uiLanguage: a.uiLanguage ?? a['ui-language'],
      help: a.help || a.h,
      noPrompt: a.noPrompt ?? a['no-prompt'],
      strict: a.strict,
      debug: a.debug,
      cleanup: a.cleanup ?? a['cleanup'],
      dryRunDelete: a.dryRunDelete ?? a['dry-run-delete'],
      strictUnused: a.strictUnused ?? a['strict-unused'],
      json: a.json,
      prune: a.prune,
      pruneKeep: parseInt(a['prune-keep'] || a.pruneKeep, 10) || 10
    };
  }

  // Parse command line arguments
  async parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith('--')) {
        let [key, value] = arg.substring(2).split('=');
        if (value === undefined && args[i + 1] && !args[i + 1].startsWith('-')) {
          value = args[++i];
        }
        if (key === 'code-dir' || key === 'source-code-dir') key = 'source-dir';
        if (key === 'locales-dir') key = 'i18n-dir';
        if (key === 'source-locale') key = 'source-language';
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
        await SecurityUtils.logSecurityEvent(t('usage.translationDiscoveryError'), 'error', {
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
        await SecurityUtils.logSecurityEvent(t('usage.fileTraversalError'), 'error', {
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
    
    if (toBool(args.cleanup)) {
      this.cleanupMode = true;
    }
    if (toBool(args.dryRunDelete)) {
      this.dryRunDelete = true;
    }

    if (toBool(args.prune)) {
      const outputDir = args.outputDir || this.config.outputDir || './i18ntk-reports/usage';
      this.pruneReports(outputDir, args.pruneKeep || 10);
      return;
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
        loadTranslations(uiLanguage, path.resolve(__dirname, '..', 'ui-locales'));
        if (!Array.isArray(this.config.translationPatterns)) {
          this.config.translationPatterns = [
            /(?<![\w$.])t\s*\(['"`]([^'"`]+)['"`]/g,
            /(?<![\w$.])tx\s*\(['"`]([^'"`]+)['"`]/g,
            /\.tx\s*\(['"`]([^'"`]+)['"`]/g,
            /i18n\.t\(['"`]([^'"`]+)['"`]/g,
            /useTranslation\(\)\.t\(['"`]([^'"`]+)['"`]/g,
            /(?<![\w$.])t\s*\(`([^`]+)`\)/g,
            /(?<![\w$.])tx\s*\(`([^`]+)`\)/g,
            /\.tx\s*\(`([^`]+)`\)/g,
            /i18nKey=['"`]([^'"`]+)['"`]/g,
            /\$t\(['"`]([^'"`]+)['"`]/g,
            /(?<![\w$.])getTranslation\s*\(['"`]([^'"`]+)['"`]/g
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
      if (args.sourceLanguage) {
        this.config.sourceLanguage = args.sourceLanguage;
        this.sourceLanguageDir = path.join(this.i18nDir, this.config.sourceLanguage);
      }
      
      if (this.sourceDir || this.i18nDir) {
        await configManager.updateConfig({
          sourceDir: configManager.toRelative(this.sourceDir || this.config.sourceDir),
          i18nDir: configManager.toRelative(this.i18nDir || this.config.i18nDir)
        });
      }
      
      const usageSource = resolveUsageSourceDir({
        sourceDir: this.sourceDir || this.config.sourceDir,
        i18nDir: this.i18nDir || this.config.i18nDir,
        projectRoot: this.config.projectRoot || process.cwd(),
        explicitSourceDir: Boolean(args.sourceDir),
      });
      if (usageSource.reason) {
        console.warn(t('usage.sourceEqualsI18nWarn', { reason: usageSource.reason }) || `Warning: ${usageSource.reason}`);
      }
      this.sourceDir = usageSource.sourceDir;
      this.config.sourceDir = usageSource.sourceDir;
      if (this.sourceDir) {
        await configManager.updateConfig({
          sourceDir: configManager.toRelative(this.sourceDir)
        });
      }

      // 🚧 prevent scanning locales as source
      if (this.sourceDir && !args.sourceDir && path.resolve(this.sourceDir) === path.resolve(this.i18nDir)) {
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
      
      displayPaths({ sourceDir: this.sourceDir, i18nDir: this.i18nDir, outputDir: this.config.outputDir });
      
      console.log(t('usage.detectedSourceDirectory', { sourceDir: this.sourceDir || t('usage.noSourceDirectoryConfigured') || '(none)' }));
      console.log(t('usage.detectedI18nDirectory', { i18nDir: this.i18nDir }));
      
      // Load available translation keys first
      await this.loadAvailableKeys();
      
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
      
      if (this.cleanupMode) {
        this._buildSourceCommentsSet();
        const deadKeys = this.findDeadKeys();
        console.log('\n' + t('usage.deadKeysDetectionTitle'));
        console.log(t('usage.deadKeysCount', { count: deadKeys.length }));
        
        const highConfidence = deadKeys.filter(dk => dk.confidence >= 0.8).length;
        const mediumConfidence = deadKeys.filter(dk => dk.confidence >= 0.4 && dk.confidence < 0.8).length;
        const lowConfidence = deadKeys.filter(dk => dk.confidence < 0.4).length;
        
        console.log(t('usage.deadKeysConfidenceBreakdown', { high: highConfidence, medium: mediumConfidence, low: lowConfidence }));
        
        if (deadKeys.length > 0) {
          console.log('\n' + t('usage.deadKeysSample'));
          deadKeys.slice(0, 10).forEach(dk => {
            console.log(`  ${dk.key} [${(dk.confidence * 100).toFixed(0)}%] - ${dk.reason}`);
          });
          if (deadKeys.length > 10) {
            console.log(t('usage.deadKeysMore', { count: deadKeys.length - 10 }));
          }
        }
        
        if (this.dryRunDelete) {
          const reportPath = this.saveDeadKeysReport(deadKeys, args.outputDir || this.config.outputDir || './i18ntk-reports/usage');
          console.log(t('usage.deadKeysReportSaved', { path: reportPath }));
        }
      }
      
      if (args.outputReport) {
        const confidenceFilteredUnused = this._computeConfidenceFilteredUnused(unusedKeys);
        const report = this.generateUsageReport(confidenceFilteredUnused);
        if (args.json) {
          await this.saveJsonReport(report, args.outputDir);
        } else {
          await this.saveReport(report, args.outputDir);
        }
      }

      if (args.json && !args.outputReport) {
        const confidenceFilteredUnused = this._computeConfidenceFilteredUnused(unusedKeys);
        const jsonReport = this.generateJsonReport(confidenceFilteredUnused);
        console.log(JSON.stringify(jsonReport, null, 2));
      }

      if (this._mojibakeIssues.length > 0) {
        console.log('\n🔤 Locale Quality - Mojibake Artifacts:');
        this._mojibakeIssues.forEach(issue => {
          console.log(`  ⚠️  ${issue.key} [${issue.locale}]: ${issue.artifact}`);
        });
      }

      if (this._clientBoundaryIssues.length > 0) {
        console.log('\n📦 Client-Boundary Warnings:');
        this._clientBoundaryIssues.forEach(issue => {
          console.log(`  ⚠️  ${issue.filePath}: ${issue.message}`);
        });
      }

      if (this._copyFormatters.length > 0) {
        const suspected = this._copyFormatters.filter(cf => cf.type === 'suspectedCopyFormatter');
        if (suspected.length > 0) {
          console.log('\n🔧 Suspected Copy Formatters:');
          suspected.forEach(cf => {
            console.log(`  ⚠️  ${cf.filePath}:${cf.line} - ${cf.message}`);
          });
        }
      }

      if (toBool(args.strictUnused)) {
        const deadKeys = this.findDeadKeys();
        const strictUnused = deadKeys.filter(dk => dk.confidence >= 0.8);
        const strictCount = strictUnused.length;
        console.log(`\n🔒 Strict-Unused Mode: ${strictCount} high-confidence dead keys (filtered from ${deadKeys.length} total candidates)`);
      }
      
      console.log('\n' + t('usage.analysisCompletedSuccessfully'));
    
      if (require.main === module && isInteractive(args)) {
        await this.prompt('\nPress Enter to continue...');
      }
      this.closeReadline();
      
    } catch (error) {
      console.error(t('usage.analysisFailedError'), error.message);
      this.closeReadline();
      SecurityUtils.logSecurityEvent(t('usage.usageAnalysisFailed'), 'error', {
        component: 'i18ntk-usage', 
        error: error.message 
      });
      throw error;
    }
  }

  // Show help message
  showHelp() {
    console.log(`
📊 i18ntk usage - Translation key usage analysis (v1.10.1)

Usage:
  node i18ntk-usage.js [options]
  npm run i18ntk:usage -- [options]

Options:
  --source-dir=<path>    Source code directory to scan (default: ./src)
  --i18n-dir=<path>      Directory containing translation files (default: ./src/i18n/locales)
  --output-report        Generate detailed usage report
  --output-dir=<path>    Directory for output reports (default: ./i18ntk-reports/usage)
  --strict               Show all warnings and errors during analysis
  --strict-unused        Only report high-confidence (>80%) unused keys
  --json                 Output results as JSON (to console or with --output-report)
  --debug                Enable debug mode with stack traces
  --no-prompt            Skip interactive prompts (useful for CI/CD)
  --validate-placeholders Enable placeholder key validation
  --framework-detect     Enable framework-specific pattern detection
  --performance-mode     Enable performance metrics tracking
  --cleanup              Enable dead key detection for cleanup mode
  --dry-run-delete       Save dead keys report without deleting (requires --cleanup)
  --help, -h             Show this help message

Examples:
  node i18ntk-usage.js --source-dir=./src --i18n-dir=./translations --output-report
  npm run i18ntk:usage -- --strict --debug --validate-placeholders
  node i18ntk-usage.js --no-prompt --performance-mode --output-dir=./reports
  node i18ntk-usage.js --cleanup --dry-run-delete

Analysis Features (v1.10.1):
  • Detects unused translation keys with confidence scoring
  • Identifies missing translation keys
  • Shows translation completeness by language
  • Reports NOT_TRANSLATED values
  • Supports modular folder structures
  • Enhanced placeholder key detection
  • Framework-specific pattern recognition (React, Vue, Angular)
  • Advanced translation completeness scoring
  • Performance metrics and optimization tracking
  • Key complexity analysis
  • Known-key literal matching with source file locations
  • Namespace/file naming recommendations (for example app/shop -> shop.json)
  • Hardcoded user-facing text candidates with suggested translation keys
  • Security-enhanced path validation
  • Detailed reporting with validation errors
  • Dead key detection with confidence scoring
  • Locale JSON import key detection
  • Client-boundary warnings ("use client" files importing locale JSON)
  • Copy formatter detection (local "tx" that doesn't call translation runtime)
  • Mojibake artifact detection in translations
  • Confidence-split unused key reporting (confirmed / likely / possibly used)
  • JSON output format (--json)
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
          await SecurityUtils.logSecurityEvent(t('usage.translationFileParseError'), 'error', {
            component: 'i18ntk-usage',
            file: fileInfo.filePath,
            error: error.message
          });
        }
      }
    } catch (error) {
      await SecurityUtils.logSecurityEvent(t('usage.translationKeysLoadError'), 'error', {
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
          if (typeof value === 'string') {
            const normalizedValue = value.replace(/\s+/g, ' ').trim();
            if (normalizedValue && !this.translationValueIndex.has(normalizedValue)) {
              this.translationValueIndex.set(normalizedValue, fullKey);
            }
          }
        }
      }
    } catch (error) {
      // Handle any unexpected errors during key extraction
      console.warn(`⚠️  Error during key extraction: ${error.message}`);
      return keys;
    }
    
    return keys;
  }

  _getNestedValue(obj, key) {
    if (!obj || typeof obj !== 'object') return undefined;
    const parts = key.split('.');
    let current = obj;
    for (const part of parts) {
      if (current == null || typeof current !== 'object') return undefined;
      current = current[part];
    }
    return typeof current === 'string' ? current : undefined;
  }

  collectPlaceholderKeys(obj, prefix = '', language) {
    const patterns = this.placeholderStyles[language] || [];
    const regexes = patterns.reduce((compiled, pattern) => {
      try {
        compiled.push(new RegExp(pattern));
      } catch (error) {
        SecurityUtils.logSecurityEvent('Invalid placeholder regex pattern skipped', 'warn', {
          component: 'i18ntk-usage',
          language,
          pattern,
          error: error.message
        });
      }
      return compiled;
    }, []);
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
      
      return this.extractKeysFromContent(content, filePath);
      
      // Null-safe translation patterns handling
    } catch (error) {
      console.warn(`${t('usage.failedToExtractKeys')} ${filePath}: ${error.message}`);
      return [];
    }
  }

  extractKeysFromContent(content, filePath = '') {
    if (!content) return [];
    if (filePath && filePath.endsWith('.json')) return [];
    const rawPatterns = Array.isArray(this.config.translationPatterns) ? this.config.translationPatterns : [];
    if (rawPatterns.length === 0) return [];
    return this.extractor.extract(content, rawPatterns);
  }

  recordUsageInsights(relativePath, insights) {
    const keys = [];
    const seen = new Set();

    for (const ref of insights.keyReferences || []) {
      if (!ref.key || seen.has(ref.key)) continue;
      seen.add(ref.key);
      keys.push(ref.key);
      this.usedKeys.add(ref.key);

      if (ref.matchType === 'dynamic-template' || ref.matchType === 'dynamic-variable') {
        this._dynamicallyReferencedKeys.add(ref.key);
        if (!this._resolvedDynamicExpansions.has(ref.key)) {
          this._resolvedDynamicExpansions.set(ref.key, []);
        }
        this._resolvedDynamicExpansions.get(ref.key).push(relativePath);
      }

      if (ref.matchType === 'literal-telemetry') {
        if (!this._telemetryLiterals) this._telemetryLiterals = [];
        this._telemetryLiterals.push({
          filePath: relativePath,
          key: ref.key,
          line: ref.line,
          column: ref.column,
          contextNote: ref.context?.contextNote,
        });
      }

      if (ref.matchType === 'local-wrapper') {
        if (!this._localWrapperRefs) this._localWrapperRefs = [];
        this._localWrapperRefs.push({
          filePath: relativePath,
          key: ref.key,
          line: ref.line,
          wrapperName: ref.wrapperName,
        });
      }

      if (!this.keyUsageLocations.has(ref.key)) {
        this.keyUsageLocations.set(ref.key, []);
      }
      this.keyUsageLocations.get(ref.key).push({
        filePath: relativePath,
        line: ref.line,
        column: ref.column,
        matchType: ref.matchType,
      });
    }

    if (keys.length > 0) {
      this.fileUsage.set(relativePath, keys);
    }

    if (insights.namespaceRecommendation) {
      this.namespaceRecommendations.push({
        filePath: relativePath,
        ...insights.namespaceRecommendation,
      });
    }

    if (Array.isArray(insights.hardcodedTexts) && insights.hardcodedTexts.length > 0) {
      this.hardcodedTextCandidates.push(...insights.hardcodedTexts);
    }

    if (Array.isArray(insights.unresolvedDynamicReferences) && insights.unresolvedDynamicReferences.length > 0) {
      this.unresolvedDynamicReferences.push(...insights.unresolvedDynamicReferences.map(ref => ({
        filePath: relativePath,
        ...ref,
      })));
      for (const ref of insights.unresolvedDynamicReferences) {
        if (ref.prefix) {
          this._dynamicPrefixes.add(ref.prefix);
        }
      }
    }

    if (Array.isArray(insights.clientBoundaryIssues) && insights.clientBoundaryIssues.length > 0) {
      if (!this._clientBoundaryIssues) this._clientBoundaryIssues = [];
      this._clientBoundaryIssues.push(...insights.clientBoundaryIssues);
    }

    if (Array.isArray(insights.copyFormatters) && insights.copyFormatters.length > 0) {
      if (!this._copyFormatters) this._copyFormatters = [];
      this._copyFormatters.push(...insights.copyFormatters.map(cf => ({
        filePath: relativePath,
        ...cf,
      })));
    }

    return keys.length;
  }

  // Analyze usage in source files
  async analyzeUsage() {
    try {
      console.log(t('usage.checkUsage.analyzing_source_files'));
      if (!this.sourceDir) {
        console.warn(t('usage.noSourceFilesFound'));
        return;
      }
      
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
          const content = SecurityUtils.safeReadFileSync(filePath, path.dirname(filePath), 'utf8');
          if (!content) continue;

          const relativePath = path.relative(this.sourceDir, filePath);
          const directKeys = this.extractKeysFromContent(content, filePath);
          const insights = analyzeSourceForUsageInsights({
            content,
            relativePath,
            availableKeys: this.availableKeys,
            directKeys,
            translationValueIndex: this.translationValueIndex,
          });

          this.detectFrameworkPatterns(content, relativePath);
          totalKeysFound += this.recordUsageInsights(relativePath, insights);
          
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
      if (this.keyUsageLocations.size > 0) {
        console.log(`🔎 Indexed ${this.keyUsageLocations.size} keys with source file locations`);
      }
      if (this.namespaceRecommendations.length > 0) {
        console.log(`🧭 Namespace recommendations: ${this.namespaceRecommendations.length}`);
      }
      if (this.hardcodedTextCandidates.length > 0) {
        console.log(`📝 Hardcoded text candidates: ${this.hardcodedTextCandidates.length}`);
      }
      if (this.unresolvedDynamicReferences.length > 0) {
        console.log(`🧩 Unresolved dynamic key expressions: ${this.unresolvedDynamicReferences.length}`);
      }
      
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
          if (['en', 'de', 'es', 'fr', 'it', 'pt', 'nl', 'pl', 'sv', 'uk', 'cs', 'tr', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi', 'th', 'vi', 'he', 'el', 'hu'].includes(lang)) {
            languages.add(lang);
          }
        }
        
        // Also check for direct language files (en.json, de.json, etc.)
        const directFiles = fs.readdirSync(this.i18nDir)
          .filter(file => file.endsWith('.json'))
          .map(file => path.basename(file, '.json'))
          .filter(lang => ['en', 'de', 'es', 'fr', 'it', 'pt', 'nl', 'pl', 'sv', 'uk', 'cs', 'tr', 'ru', 'ja', 'ko', 'zh', 'ar', 'hi', 'th', 'vi', 'he', 'el', 'hu'].includes(lang));
        
        directFiles.forEach(lang => languages.add(lang));
        discoverLocales(this.i18nDir, { excludeDirs: this.config.excludeDirs })
          .forEach(lang => languages.add(lang));
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

              if (language !== this.config.sourceLanguage) {
                const { detectMojibakeInTranslations } = require('../utils/usage-insights');
                const flatKeys = this.extractKeysFromObject(jsonData, '');
                for (const key of flatKeys) {
                  const value = this._getNestedValue(jsonData, key);
                  const issue = detectMojibakeInTranslations(key, value, this.config.sourceLanguage, language);
                  if (issue) {
                    issue.filePath = fileInfo.filePath;
                    this._mojibakeIssues.push(issue);
                  }
                }
              }
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

  findDeadKeys() {
    const unusedKeys = this.findUnusedKeys();
    const deadKeys = [];

    for (const key of unusedKeys) {
      let confidence = 0.9;
      let reason = 'Key not found in any source file';

      if (this._resolvedDynamicExpansions.has(key)) {
        confidence = 0.2;
        reason = `Key resolved through dynamic template expansion (${this._resolvedDynamicExpansions.get(key).join(', ')})`;
      } else if (this._matchesDynamicPrefix(key)) {
        confidence = 0.3;
        reason = 'Key prefix matches unresolved dynamic template pattern';
      } else if (this._keyInSourceComments(key)) {
        confidence = 0.5;
        reason = 'Key referenced in comments/JSDoc';
      } else if (this._parentFileRecentlyModified(key)) {
        confidence = 0.4;
        reason = 'Translation file modified within last 30 days';
      }

      deadKeys.push({ key, confidence, reason });
    }

    deadKeys.sort((a, b) => b.confidence - a.confidence);
    return deadKeys;
  }

  _matchesDynamicPrefix(key) {
    for (const prefix of this._dynamicPrefixes) {
      if (key.startsWith(prefix + '.') || key.startsWith(prefix + '_') || key === prefix) {
        return true;
      }
    }

    for (const resolvedKey of this._dynamicallyReferencedKeys) {
      const parts = resolvedKey.split('.');
      for (let i = 1; i < parts.length; i++) {
        const subPrefix = parts.slice(0, i).join('.');
        if (key.startsWith(subPrefix + '.')) return true;
      }
    }

    return false;
  }

  _buildSourceCommentsSet() {
    if (this._sourceCommentsSet !== null) return;
    this._sourceCommentsSet = new Set();

    const commentPatterns = [
      /\/\/[^\n]*/g,
      /\/\*[\s\S]*?\*\//g
    ];

    try {
      const sourceFiles = Array.from(this.fileUsage.keys());
      for (const filePath of sourceFiles) {
        const fullPath = path.join(this.sourceDir, filePath);
        if (!SecurityUtils.safeExistsSync(fullPath, this.sourceDir)) continue;

        const content = SecurityUtils.safeReadFileSync(fullPath, this.sourceDir, 'utf8');
        if (!content) continue;

        for (const pattern of commentPatterns) {
          const comments = content.match(pattern);
          if (comments) {
            for (const comment of comments) {
              this._sourceCommentsSet.add(comment);
            }
          }
        }
      }
    } catch (e) {
      this._sourceCommentsSet = new Set();
    }
  }

  _keyInSourceComments(key) {
    try {
      if (!this._sourceCommentsSet || this._sourceCommentsSet.size === 0) return false;
      for (const comment of this._sourceCommentsSet) {
        if (comment.includes(key)) return true;
      }
    } catch (e) {
      // Silently fail - comment detection is best-effort
    }

    return false;
  }

  _parentFileRecentlyModified(key) {
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    try {
      for (const [filePath] of this.translationFiles) {
        if (!SecurityUtils.safeExistsSync(filePath, this.i18nDir)) continue;

        const content = SecurityUtils.safeReadFileSync(filePath, this.i18nDir, 'utf8');
        if (!content) continue;

        if (content.includes(key)) {
          const stats = SecurityUtils.safeStatSync(filePath, this.i18nDir);
          if (stats && stats.mtime) {
            const mtimeMs = new Date(stats.mtime).getTime();
            if ((now - mtimeMs) <= thirtyDaysMs) {
              return true;
            }
          }
        }
      }
    } catch (e) {
      // Silently fail - file stat is best-effort
    }

    return false;
  }

  generateDeadKeysReport(deadKeys) {
    const allCleanupReady = deadKeys.length === 0 || deadKeys.every(dk => dk.confidence >= 0.8);

    return {
      deadKeys,
      totalAvailableKeys: this.availableKeys.size,
      totalUsedKeys: this.usedKeys.size,
      deadKeyCount: deadKeys.length,
      cleanupReady: allCleanupReady,
      generatedAt: new Date().toISOString(),
      version: this.version
    };
  }

  saveDeadKeysReport(deadKeys, outputDir) {
    const report = this.generateDeadKeysReport(deadKeys);
    const resolvedDir = path.resolve(outputDir || './i18ntk-reports/usage');

    if (!SecurityUtils.safeExistsSync(resolvedDir, process.cwd())) {
      SecurityUtils.safeMkdirSync(resolvedDir, process.cwd(), { recursive: true });
    }

    const filename = '.dead-keys.json';
    const filepath = path.join(resolvedDir, filename);

    SecurityUtils.safeWriteFileSync(filepath, JSON.stringify(report, null, 2), resolvedDir, 'utf8');
    return filepath;
  }

  // Find files that use specific keys
  findKeyUsage(searchKey) {
    if (this.keyUsageLocations && this.keyUsageLocations.has(searchKey)) {
      return this.keyUsageLocations.get(searchKey).map(location => ({
        filePath: location.filePath,
        keys: [searchKey],
        line: location.line,
        column: location.column,
        matchType: location.matchType,
      }));
    }

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
      const translations = this.translationsByLanguage ? this.translationsByLanguage[language] : null;
      const completeness = stats.total > 0 ? ((stats.translated / stats.total) * 100).toFixed(1) : '0.0';
      const score = translations && this.calculateTranslationScore ? this.calculateTranslationScore(language, translations) : {
        completeness,
        quality: completeness,
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

    const matchCounts = { direct: 0, literal: 0 };
    for (const locations of this.keyUsageLocations.values()) {
      for (const location of locations) {
        matchCounts[location.matchType] = (matchCounts[location.matchType] || 0) + 1;
      }
    }

    report += `🔎 Usage Match Index\n`;
    report += `${'='.repeat(50)}\n`;
    report += `Direct i18n calls: ${matchCounts.direct || 0}\n`;
    report += `Known-key literal matches: ${matchCounts.literal || 0}\n`;
    report += `Resolved dynamic expressions: ${(matchCounts['dynamic-template'] || 0) + (matchCounts['dynamic-variable'] || 0)}\n`;
    report += `Local wrapper references: ${(matchCounts['local-wrapper'] || 0)}\n`;
    report += `Telemetry/event literals (excluded from usage): ${(this._telemetryLiterals?.length || 0)}\n`;
    report += `Unresolved dynamic expressions: ${this.unresolvedDynamicReferences.length}\n`;
    report += `Indexed keys with file locations: ${this.keyUsageLocations.size}\n\n`;

    const indexedKeys = Array.from(this.keyUsageLocations.entries()).slice(0, 100);
    indexedKeys.forEach(([key, locations]) => {
      report += `- ${key}\n`;
      locations.slice(0, 5).forEach(location => {
        const line = location.line ? `:${location.line}` : '';
        report += `  - ${location.filePath}${line} (${location.matchType})\n`;
      });
      if (locations.length > 5) {
        report += `  - ... ${locations.length - 5} more locations\n`;
      }
    });
    if (this.keyUsageLocations.size > 100) {
      report += `... ${this.keyUsageLocations.size - 100} more indexed keys\n`;
    }
    report += `\n`;

    if (this.namespaceRecommendations.length > 0) {
      report += `🧭 Namespace Recommendations\n`;
      report += `${'='.repeat(50)}\n`;
      this.namespaceRecommendations.slice(0, 30).forEach(item => {
        report += `- ${item.filePath}: ${item.message}\n`;
      });
      if (this.namespaceRecommendations.length > 30) {
        report += `... ${this.namespaceRecommendations.length - 30} more recommendations\n`;
      }
      report += `\n`;
    }

    if (this.unresolvedDynamicReferences.length > 0) {
      report += `🧩 Unresolved Dynamic Key Expressions\n`;
      report += `${'='.repeat(50)}\n`;
      report += `These calls could not be resolved to exact keys without executing code. Review them manually or prefer bounded literal maps/arrays for analyzable dynamic keys.\n\n`;
      this.unresolvedDynamicReferences.slice(0, 50).forEach(item => {
        const prefix = item.prefix ? ` prefix: ${item.prefix}` : ' no static prefix';
        report += `- ${item.filePath}:${item.line} ${item.expression} (${prefix})\n`;
      });
      if (this.unresolvedDynamicReferences.length > 50) {
        report += `... ${this.unresolvedDynamicReferences.length - 50} more unresolved expressions\n`;
      }
      report += `\n`;
    }

    if (this._dynamicallyReferencedKeys.size > 0) {
      report += `🧩 Resolved Dynamic Key Expansions\n`;
      report += `${'='.repeat(50)}\n`;
      report += `These keys were resolved through dynamic template expansion. Consider converting to explicit literal maps for better static analysis.\n\n`;
      report += `Recommendation pattern:\n`;
      report += `  const labels = {\n`;
      report += `    active: tx("namespace.status.active"),\n`;
      report += `    closed: tx("namespace.status.closed"),\n`;
      report += `  };\n\n`;
      const sampleKeys = Array.from(this._dynamicallyReferencedKeys).slice(0, 20);
      report += `Resolved keys:` + sampleKeys.map(k => `\n  - ${k}`).join('') + `\n`;
      if (this._dynamicallyReferencedKeys.size > 20) {
        report += `  ... ${this._dynamicallyReferencedKeys.size - 20} more resolved keys\n`;
      }
      report += `\n`;
    }

    if (this.hardcodedTextCandidates.length > 0) {
      report += `📝 Hardcoded Text Candidates\n`;
      report += `${'='.repeat(50)}\n`;
      report += `Inline user-facing text that may be moved into locale files.\n\n`;
      this.hardcodedTextCandidates.slice(0, 50).forEach(item => {
        const existing = item.existingKey ? ` existing key: ${item.existingKey}` : ` suggested key: ${item.suggestedKey}`;
        report += `- ${item.filePath}:${item.line} "${item.text}" (${existing})\n`;
      });
      if (this.hardcodedTextCandidates.length > 50) {
        report += `... ${this.hardcodedTextCandidates.length - 50} more candidates\n`;
      }
      report += `\n`;
    }
    
    // Unused keys with complexity and confidence
    if (unusedKeys.length > 0) {
      const confidenceFiltered = this._computeConfidenceFilteredUnused(unusedKeys);
      const confirmed = confidenceFiltered.filter(u => u.confidence >= 0.8);
      const likely = confidenceFiltered.filter(u => u.confidence >= 0.4 && u.confidence < 0.8);
      const possible = confidenceFiltered.filter(u => u.confidence < 0.4);

      report += `${t('summary.usageReportUnusedTranslationKeys')}\n`;
      report += `${'='.repeat(50)}\n`;
      report += `${t('summary.usageReportUnusedKeysDescription')}\n`;
      report += `Confidence breakdown: ${confirmed.length} confirmed, ${likely.length} likely, ${possible.length} possibly used\n\n`;

      if (confirmed.length > 0) {
        report += `Confirmed Unused (high confidence):\n`;
        confirmed.slice(0, 50).forEach(u => {
          report += `  - ${u.key} [${(u.confidence * 100).toFixed(0)}%]\n`;
        });
        if (confirmed.length > 50) report += `  ... ${confirmed.length - 50} more\n`;
        report += `\n`;
      }

      if (likely.length > 0) {
        report += `Likely Unused (medium confidence):\n`;
        likely.slice(0, 30).forEach(u => {
          report += `  - ${u.key} [${(u.confidence * 100).toFixed(0)}%] ${u.reason}\n`;
        });
        if (likely.length > 30) report += `  ... ${likely.length - 30} more\n`;
        report += `\n`;
      }

      if (possible.length > 0) {
        report += `Possibly Used (low confidence - may be dynamic):\n`;
        possible.slice(0, 20).forEach(u => {
          report += `  - ${u.key} [${(u.confidence * 100).toFixed(0)}%] ${u.reason}\n`;
        });
        if (possible.length > 20) report += `  ... ${possible.length - 20} more\n`;
        report += `\n`;
      }
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

    if (this._mojibakeIssues && this._mojibakeIssues.length > 0) {
      report += `\n🔤 Locale Quality - Mojibake Artifacts\n`;
      report += `${'='.repeat(50)}\n`;
      report += `Replacement-character artifacts detected in translations. These may indicate encoding issues during translation.\n\n`;
      this._mojibakeIssues.forEach(issue => {
        report += `  - ${issue.key} [${issue.locale}]: ${issue.artifact}\n`;
      });
      report += `\n`;
    }

    if (this._clientBoundaryIssues && this._clientBoundaryIssues.length > 0) {
      report += `\n📦 Client-Boundary Warnings\n`;
      report += `${'='.repeat(50)}\n`;
      report += `"use client" files importing locale JSON. This bypasses the shared runtime and increases bundle size.\n\n`;
      this._clientBoundaryIssues.forEach(issue => {
        report += `  - ${issue.filePath}: ${issue.message}\n`;
      });
      report += `\n`;
    }

    if (this._copyFormatters && this._copyFormatters.length > 0) {
      const suspected = this._copyFormatters.filter(cf => cf.type === 'suspectedCopyFormatter');
      if (suspected.length > 0) {
        report += `\n🔧 Suspected Copy Formatters\n`;
        report += `${'='.repeat(50)}\n`;
        report += `Functions named "tx" that do not call known translation runtimes. Rename to "copy" or configure "usage.copyFormatters".\n\n`;
        suspected.forEach(cf => {
          report += `  - ${cf.filePath}:${cf.line}: ${cf.message}\n`;
        });
        report += `\n`;
      }
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

  _computeConfidenceFilteredUnused(allUnused) {
    const deadKeys = this.findDeadKeys();
    const deadKeyMap = new Map();
    for (const dk of deadKeys) {
      deadKeyMap.set(dk.key, dk);
    }
    return allUnused.map(key => ({
      key,
      confidence: (deadKeyMap.get(key) || { confidence: 0.9 }).confidence,
      reason: (deadKeyMap.get(key) || { reason: 'Not found in source' }).reason,
    }));
  }

  generateJsonReport(confidenceFilteredUnused) {
    return {
      version: this.version,
      timestamp: new Date().toISOString(),
      sourceDir: this.sourceDir,
      i18nDir: this.i18nDir,
      summary: {
        availableKeys: this.availableKeys.size,
        usedKeys: this.usedKeys.size,
        unusedKeys: confidenceFilteredUnused.length,
        missingKeys: this.findMissingKeys().length,
        notTranslated: this.getNotTranslatedStats().total,
      },
      unusedKeys: confidenceFilteredUnused,
      missingKeys: this.findMissingKeys(),
      dynamicPrefixes: Array.from(this._dynamicPrefixes),
      unresolvedDynamicReferences: this.unresolvedDynamicReferences,
      namespaceRecommendations: this.namespaceRecommendations,
      hardcodedTextCandidates: this.hardcodedTextCandidates,
      clientBoundaryIssues: this._clientBoundaryIssues || [],
      mojibakeIssues: this._mojibakeIssues || [],
      translationCompleteness: Object.fromEntries(this.translationStats),
    };
  }

  async saveJsonReport(report, outputDir = './i18ntk-reports/usage') {
    try {
      if (!SecurityUtils.safeExistsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `usage-report-${timestamp}.json`;
      const filepath = path.join(outputDir, filename);
      const jsonReport = this.generateJsonReport(
        this._computeConfidenceFilteredUnused(this.findUnusedKeys())
      );
      await SecurityUtils.safeWriteFile(filepath, JSON.stringify(jsonReport, null, 2));
      console.log(t('usage.reportSavedTo', { reportPath: filepath }));
      return filepath;
    } catch (error) {
      console.error(t('usage.failedToSaveReport', { error: error.message }));
    }
  }

  pruneReports(outputDir = './i18ntk-reports/usage', keepCount = 10) {
    try {
      const resolvedDir = path.resolve(outputDir);
      if (!SecurityUtils.safeExistsSync(resolvedDir, process.cwd())) {
        console.log(`Report directory ${outputDir} does not exist.`);
        return 0;
      }
      const items = fs.readdirSync(resolvedDir);
      const reportFiles = items
        .filter(f => /^usage-(analysis|report)-.+\.(txt|json)$/.test(f))
        .map(f => ({ name: f, path: path.join(resolvedDir, f), mtime: fs.statSync(path.join(resolvedDir, f)).mtime }))
        .sort((a, b) => b.mtime - a.mtime);

      if (reportFiles.length <= keepCount) {
        console.log(`${reportFiles.length} report files, ${keepCount} keep limit. Nothing to prune.`);
        return 0;
      }

      const toDelete = reportFiles.slice(keepCount);
      for (const file of toDelete) {
        fs.unlinkSync(file.path);
      }
      console.log(`Pruned ${toDelete.length} stale report files (kept ${keepCount} most recent).`);
      return toDelete.length;
    } catch (error) {
      console.error(`Failed to prune reports: ${error.message}`);
      return 0;
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
      },
      nextjs: {
        patterns: [
          /['"]use server['"]/g,
          /['"]use client['"]/g,
          /export\s+default\s+function\s+\w*Page/g,
          /export\s+async\s+function\s+generate/g,
          /GetStaticProps|GetServerSideProps/g,
          /next\/headers/g,
          /next\/navigation/g,
          /'server only'/g,
          /'client only'/g,
          /getLocale\s*\(/g,
          /setLocale\s*\(/g,
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

    let dominantFramework = 'generic';
    let maxScore = 0;

    Object.keys(frameworkPatterns).forEach(framework => {
      if (frameworkPatterns[framework].score > maxScore) {
        maxScore = frameworkPatterns[framework].score;
        dominantFramework = framework;
      }
    });

    let componentType = null;
    if (dominantFramework === 'nextjs') {
      if (/['"]use server['"]/.test(contentStr)) componentType = 'Server Component';
      else if (/['"]use client['"]/.test(contentStr)) componentType = 'Client Component';
      else if (/(?:page|layout|loading|error|not-found|template)\.[jt]sx?$/.test(filePath)) componentType = 'App Router (default: Server)';
    }

    this.frameworkUsage.set(filePath, {
      framework: dominantFramework,
      score: maxScore,
      patterns: frameworkPatterns[dominantFramework]?.patterns || [],
      componentType,
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
      
      await SecurityUtils.logSecurityEvent('analysis_started', 'info', { component: 'i18ntk-usage' });
      
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
      
      await SecurityUtils.logSecurityEvent('analysis_completed', 'info', {
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
          indexedKeys: this.keyUsageLocations.size,
          namespaceRecommendations: this.namespaceRecommendations.length,
          hardcodedTextCandidates: this.hardcodedTextCandidates.length,
          unresolvedDynamicReferences: this.unresolvedDynamicReferences.length,
          translationCompleteness: Object.fromEntries(this.translationStats)
        },
        unusedKeys,
        missingKeys,
        dynamicKeys,
        notTranslatedStats,
        namespaceRecommendations: this.namespaceRecommendations,
        hardcodedTextCandidates: this.hardcodedTextCandidates,
        unresolvedDynamicReferences: this.unresolvedDynamicReferences
      };
      
    } catch (error) {
      console.error(t("checkUsage.usage_analysis_failed"));
      console.error(error.message);
      
      await SecurityUtils.logSecurityEvent('analysis_failed', 'error', {
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
