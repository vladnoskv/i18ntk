/**
 * Unified Configuration Helper
 * Provides consistent directory configuration across all i18n toolkit scripts
 * Configuration is managed through settings files only
 */

const fs = require('fs');
const path = require('path');
const configManager = require('./config-manager');
const SecurityUtils = require('./security');
const {loadTranslations} = require('./i18n-helper');
const SettingsManager = require('../settings/settings-manager');
const { envManager } = require('./env-manager');
const settingsManager = new SettingsManager();

const { ask } = require('./cli');

/**
 * Normalize path to ensure consistent format
 * @param {string} dirPath - Directory path to normalize
 * @returns {string} Normalized absolute path
 */
function normalizePath(dirPath) {
  if (!dirPath) return path.resolve('./locales');
  return path.resolve(dirPath);
}

/**
 * Get unified configuration for any script
 * @param {string} scriptName - Name of the script (e.g., 'complete', 'analyze', 'validate')
 * @param {object} cliArgs - Command line arguments parsed from the script
 * @returns {object} Unified configuration object
 */
async function getUnifiedConfig(scriptName, cliArgs = {}) {
  try {
    // Setup is now handled automatically by config-manager, no need to check here

    let cfg;
    let projectRoot;
    let settingsDir;

    const toStr = v => (typeof v === 'string' ? v : null);

    const configDirArg = toStr(cliArgs.configDir);
    if (configDirArg) {
      const safeConfigDir = SecurityUtils.validatePath(configDirArg, process.cwd());
      if (!safeConfigDir) {
        throw new Error('Invalid config directory');
      }
      settingsDir = safeConfigDir;
      const configFile = path.join(settingsDir, 'i18ntk-config.json');
      cfg = SecurityUtils.safeExistsSync(configFile) ? JSON.parse(SecurityUtils.safeReadFileSync(configFile, settingsDir, 'utf8')) : {};
      projectRoot = settingsDir;
      cfg.projectRoot = projectRoot;
      cfg.sourceDir = path.resolve(projectRoot, toStr(cfg.sourceDir) || './locales');
      cfg.i18nDir = path.resolve(projectRoot, toStr(cfg.i18nDir) || cfg.sourceDir);
      cfg.outputDir = path.resolve(projectRoot, toStr(cfg.outputDir) || './i18ntk-reports');
    } else {
      cfg = configManager.getConfig();
      // Use current working directory instead of hardcoded path
      const isHardcodedPath = cfg.projectRoot && cfg.projectRoot.includes('i18n-management-toolkit-main');
      projectRoot = isHardcodedPath ? process.cwd() : path.resolve(cfg.projectRoot || '.');
      
      // Update config with dynamic project root
      if (isHardcodedPath) {
        cfg.projectRoot = '.';
      }

      const updates = {};
      const sourceDirArg = toStr(cliArgs.sourceDir);
      if (sourceDirArg) {
        const safe = SecurityUtils.validatePath(sourceDirArg, projectRoot);
        if (!safe) {
          throw new Error('Invalid source directory');
        }
        const abs = safe;
        updates.sourceDir = configManager.toRelative(abs);
      }
      const i18nDirArg = toStr(cliArgs.i18nDir);
      if (i18nDirArg) {
        const safe = SecurityUtils.validatePath(i18nDirArg, projectRoot);
        if (!safe) {
          throw new Error('Invalid i18n directory');
        }
        const abs = safe;
        updates.i18nDir = configManager.toRelative(abs);
      }
      const outputDirArg = toStr(cliArgs.outputDir);
      if (outputDirArg) {
        const safe = SecurityUtils.validatePath(outputDirArg, projectRoot);
        if (!safe) {
          throw new Error('Invalid output directory');
        }
        const abs = safe;
        updates.outputDir = configManager.toRelative(abs);
      }
      if (Object.keys(updates).length > 0) {
        await configManager.updateConfig(updates);
        cfg = configManager.getConfig();
      }

      // Resolve all paths to absolute
      cfg = configManager.resolvePaths(cfg);

      // Script-specific override for sourceDir
      if (cfg.scriptDirectories?.[scriptName]) {
        cfg.sourceDir = path.resolve(cfg.projectRoot, cfg.scriptDirectories[scriptName]);
      }

      // Auto-fix i18nDir if missing but sourceDir exists
      if (!SecurityUtils.safeExistsSync(cfg.i18nDir) && SecurityUtils.safeExistsSync(cfg.sourceDir)) {
        await configManager.updateConfig({ i18nDir: configManager.toRelative(cfg.sourceDir) });
        cfg.i18nDir = cfg.sourceDir;
      }

      settingsDir = settingsManager.configDir;
    }
    const chosenDir = normalizePath(cliArgs.i18nDir || cliArgs.sourceDir || cfg.sourceDir || './locales');
    cfg.sourceDir = chosenDir;
    cfg.i18nDir = chosenDir;

    const displayPaths = {
      projectRoot: '.',
      sourceDir: path.relative(projectRoot, cfg.sourceDir) || '.',
      i18nDir: path.relative(projectRoot, cfg.i18nDir) || '.',
      outputDir: path.relative(projectRoot, cfg.outputDir) || '.',
    };

    const rawMarkers =
      cfg.notTranslatedMarkers ||
      cfg.processing?.notTranslatedMarkers ||
      cfg.notTranslatedMarker ||
      cfg.processing?.notTranslatedMarker ||
      'NOT_TRANSLATED';
    const markerList = Array.isArray(rawMarkers) ? rawMarkers : [rawMarkers];

    const config = {
      ...cfg,
      sourceLanguage: cliArgs.sourceLanguage || cfg.sourceLanguage || 'en',
      uiLanguage: cliArgs.uiLanguage || cfg.uiLanguage || 'en',
      notTranslatedMarker: markerList[0],
      notTranslatedMarkers: markerList,
      supportedExtensions: cfg.supportedExtensions || cfg.processing?.supportedExtensions || ['.json', '.js', '.ts'],
      excludeFiles: cfg.excludeFiles || cfg.processing?.excludeFiles || ['.DS_Store', 'Thumbs.db'],
      excludeDirs: cfg.excludeDirs || cfg.processing?.excludeDirs || ['node_modules', '.next', '.git', 'dist', 'build'],
      strictMode: cliArgs.strictMode || cfg.strictMode || false,
      backupDir: path.join(settingsDir, 'backups'),
      tempDir: path.join(settingsDir, 'temp'),
      cacheDir: path.join(settingsDir, '.cache'),
      configDir: settingsDir,
      settings: {
        defaultLanguages: cfg.defaultLanguages || ['de', 'es', 'fr', 'ru'],
        processing: { ...cfg.processing },
        security: { ...cfg.security },
        advanced: cfg.advanced || {},
      },
      debug: cfg.debug || {},
      displayPaths,
    };

    SecurityUtils.validateConfig(config);
    return config;
  } catch (error) {
    throw new Error(`Configuration error for ${scriptName}: ${error.message}`);
  }
}

/**
 * Get environment-specific configuration
 * @returns {object} Environment configuration
 */
function getEnvironmentConfig() {
  const settings = require('../settings/settings-manager').getAllSettings();
  return {
    nodeEnv: settings.nodeEnv || 'production',
    isProduction: (settings.nodeEnv || 'production') === 'production',
    isDevelopment: (settings.nodeEnv || 'production') !== 'production',
    isTest: (settings.nodeEnv || 'production') === 'test',
    port: parseInt(settings.apiPort || '3000', 10),
    host: settings.apiHost || 'localhost',
    apiEnabled: settings.apiEnabled === true,
    hotReload: settings.hotReload === true,
    mockData: settings.mockData === true,
    testMode: settings.testMode === true
  };
}

/**
 * Display current basic configuration
 */
function displayBasicConfig() {
  const basicConfig = getBasicConfig();
  console.log('\n🔧 Basic Configuration:');
  console.log(`   Node Environment: ${basicConfig.nodeEnv}`);
  console.log(`   API Enabled: ${basicConfig.apiEnabled}`);
  console.log(`   Port: ${basicConfig.port}`);
  console.log(`   Host: ${basicConfig.host}`);
  console.log(`   Hot Reload: ${basicConfig.hotReload}`);
  console.log(`   Test Mode: ${basicConfig.testMode}`);
  console.log(`   Mock Data: ${basicConfig.mockData}`);
}

/**
 * Parse common CLI arguments for all scripts
 * @param {Array} args - process.argv.slice(2)
 * @returns {object} Parsed arguments
 */
function parseCommonArgs(args) {
  const parsed = {};
  const availableLangCodes = settingsManager.getAvailableLanguages().map(l => l.code);
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      let [key, value] = arg.substring(2).split('=');
      if (value === undefined && i + 1 < args.length && !args[i + 1].startsWith('--')) {
        value = args[i + 1];
        i++;
      }
      const sanitizedKey = key?.trim();
      const sanitizedValue = value !== undefined ? value.trim() : true;
      
      switch (sanitizedKey) {
        case 'source-dir':
          parsed.sourceDir = sanitizedValue;
          break;
        case 'i18n-dir':
          parsed.i18nDir = sanitizedValue;
          break;
        case 'output-dir':
          parsed.outputDir = sanitizedValue;
          break;
        case 'config-dir':
          parsed.configDir = sanitizedValue;
          break;
        case 'source-language':
          parsed.sourceLanguage = sanitizedValue;
          break;
        case 'ui-language':
          parsed.uiLanguage = sanitizedValue;
          break;
        case 'log-level':
          parsed.logLevel = sanitizedValue;
          break;
        case 'framework':
          parsed.frameworkPreference = sanitizedValue;
          break;
        case 'silent':
          parsed.silent = sanitizedValue === 'true' || sanitizedValue === true;
          break;
        case 'debug-locales':
          parsed.debugLocales = sanitizedValue === 'true' || sanitizedValue === true;
          break;
        case 'strict':
          parsed.strictMode = true;
          break;
        case 'no-prompt':
          parsed.noPrompt = true;
          break;
        case 'help':
        case 'h':
          parsed.help = true;
          break;
        case 'dry-run':
          parsed.dryRun = true;
          break;
        case 'auto-translate':
          parsed.autoTranslate = true;
          break;
        case 'watch':
          parsed.watch = true;
          break;
        default:
          // Handle language shorthand flags like --de, --fr
          if (availableLangCodes.includes(sanitizedKey)) {
            parsed.uiLanguage = sanitizedKey;
          }
          break;
      }
    }
  }
  
  // Apply environment variable defaults if CLI args not provided
  if (!parsed.logLevel) {
    const envLogLevel = envManager.get('I18NTK_LOG_LEVEL');
    if (envLogLevel && envLogLevel !== 'error') {
      parsed.logLevel = envLogLevel;
    }
  }
  
  if (!parsed.uiLanguage) {
    const envLang = envManager.get('I18NTK_LANG');
    if (envLang && envLang !== 'en') {
      parsed.uiLanguage = envLang;
    }
  }
  
  if (!parsed.outputDir) {
    const envOutDir = envManager.get('I18NTK_OUTDIR');
    if (envOutDir && envOutDir !== './i18ntk-reports') {
      parsed.outputDir = envOutDir;
    }
  }
  
  if (!parsed.sourceDir) {
    const envSourceDir = envManager.get('I18NTK_SOURCE_DIR');
    if (envSourceDir && envSourceDir !== './locales') {
      parsed.sourceDir = envSourceDir;
    }
  }
  
  if (!parsed.i18nDir) {
    const envI18nDir = envManager.get('I18NTK_I18N_DIR');
    if (envI18nDir && envI18nDir !== './locales') {
      parsed.i18nDir = envI18nDir;
    }
  }
  
  if (!parsed.frameworkPreference) {
    const envFramework = envManager.get('I18NTK_FRAMEWORK_PREFERENCE');
    if (envFramework && envFramework !== 'auto') {
      parsed.frameworkPreference = envFramework;
    }
  }
  
  return parsed;
}

/**
 * Display help for script usage
 * @param {string} scriptName - Name of the script
 * @param {object} additionalOptions - Additional script-specific options
 */
function displayHelp(scriptName, additionalOptions = {}) {
  const commonOptions = {
    'source-dir': 'Source directory for translation files',
    'i18n-dir': 'Directory containing i18n files (can differ from source-dir)',
    'output-dir': 'Output directory for reports',
    'source-language': 'Source language code (e.g., en, de)',
    'ui-language': 'UI language for messages',
    'log-level': 'Logging level (error, warn, info, debug, silent)',
    'framework': 'Preferred framework (auto, react, vue, etc.)',
    'silent': 'Run in silent mode (true/false)',
    'debug-locales': 'Enable debug logging for locale loading (true/false)',
    'strict': 'Enable strict validation mode',
    'no-prompt': 'Skip interactive prompts',
    'help': 'Show this help message',
    'watch': 'Watch for changes in source files',
    'dry-run': 'Run validation without modifying files',
    'auto-translate': 'Automatically translate missing keys',
    'json': 'Output results in JSON format',
    'sort-keys': 'Sort JSON keys alphabetically',
    'indent': 'JSON indentation level (default: 2)',
    'newline': 'Newline format: lf|cr|crlf (default: lf)',
    'yes': 'Skip confirmation prompts for mutating operations',
  };
  
  const allOptions = { ...commonOptions, ...additionalOptions };
  
  console.log(`\n${scriptName} - i18n Toolkit Script`);
  console.log('='.repeat(30));
  console.log('\nUsage:');
  console.log(`  node ${scriptName}.js [options]`);
  console.log(`  npx i18ntk ${scriptName.replace('i18ntk-', '')} [options]`);
  
  console.log('\nOptions:');
  Object.entries(allOptions).forEach(([flag, description]) => {
    console.log(`  --${flag.padEnd(15)} ${description}`);
  });
  
  console.log(`\nEnvironment Variables:`);
  console.log(`  I18NTK_LOG_LEVEL     Logging level (error, warn, info, debug, silent)`);
  console.log(`  I18NTK_OUTDIR        Output directory for reports`);
  console.log(`  I18NTK_LANG          UI language (en, de, es, fr, ru, ja, zh)`);
  console.log(`  I18NTK_SILENT        Run in silent mode (true/false)`);
  console.log(`  I18NTK_DEBUG_LOCALES Enable debug logging for locale loading`);
  console.log(`  I18NTK_SOURCE_DIR    Source directory for scanning`);
  console.log(`  I18NTK_I18N_DIR      Directory containing i18n files`);
  console.log(`  I18NTK_PROJECT_ROOT  Project root directory`);
  console.log(`  I18NTK_FRAMEWORK_PREFERENCE Preferred framework (auto, react, vue, etc.)`);
  
  console.log(`\nExamples:`);
  console.log(`  node ${scriptName}.js --source-dir=./locales`);
  console.log(`  node ${scriptName}.js --source-dir=./app --i18n-dir=./locales`);
  console.log(`  node ${scriptName}.js --output-dir=./i18ntk-reports`);
  console.log(`  I18NTK_LOG_LEVEL=debug node ${scriptName}.js --source-dir=./locales`);
  console.log(`  npx i18ntk ${scriptName.replace('i18ntk-', '')} --help`);
  
  console.log('\nConfiguration:');
  console.log(`  Settings are loaded from ${configManager.CONFIG_PATH}`);
  console.log('  Use --source-dir, --i18n-dir, and --output-dir to override');
  console.log('  Environment variables can also be used for configuration');
}

/**
 * Ensure directory exists, create if necessary
 * @param {string} dirPath - Directory path
 */
function ensureDirectory(dirPath) {
  if (!SecurityUtils.safeExistsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Validate that source directory exists
 * @param {string} sourceDir - Source directory path
 * @param {string} scriptName - Script name for error messages
 */
function validateSourceDir(sourceDir, scriptName) {
  ensureDirectory(sourceDir);
}

// Display commonly used directories
function displayPaths(cfg = {}) {
  if (cfg.sourceDir) console.log(`📁 Source directory: ${cfg.sourceDir}`);
  if (cfg.i18nDir) console.log(`🌐 I18n directory: ${cfg.i18nDir}`);
  if (cfg.outputDir) console.log(`📤 Output directory: ${cfg.outputDir}`);
}

// Ensure project has been initialized with source language files
async function ensureInitialized(cfg) {
  try {
    // Check if initialization has been marked as complete
    const configPath = path.join(path.dirname(require.main.filename), '..', 'settings', 'initialization.json');
    let initStatus = { initialized: false, version: null, timestamp: null };
    
    if (SecurityUtils.safeExistsSync(configPath)) {
      try {
        initStatus = JSON.parse(SecurityUtils.safeReadFileSync(configPath, 'utf8'));
        // If initialized and version matches current, skip further checks
        if (initStatus.initialized && initStatus.version === '1.8.3') {
          return true;
        }
      } catch (e) {
        // Invalid initialization file, proceed with normal check
      }
    }

    const sourceDir = cfg.sourceDir;
    const sourceLanguage = cfg.sourceLanguage || 'en';
    const langDir = path.join(sourceDir, sourceLanguage);

    const hasLanguageFiles = SecurityUtils.safeExistsSync(langDir) &&
      fs.readdirSync(langDir).some(f => f.endsWith('.json'));
    
    // If language files exist and we're upgrading, mark as initialized
    if (hasLanguageFiles) {
      const initDir = path.dirname(configPath);
      ensureDirectory(initDir);
      SecurityUtils.safeWriteFileSync(configPath, JSON.stringify({
        initialized: true,
        version: '1.8.3',
        timestamp: new Date().toISOString(),
        sourceDir: sourceDir,
        sourceLanguage: sourceLanguage
      }, null, 2));
      return true;
    }

    const nonInteractive = !process.stdin.isTTY;

    if (nonInteractive) {
      console.warn(`Missing source language files in ${langDir}. Running initialization...`);
      await initializeSourceFiles(sourceDir, sourceLanguage);
      
      // Mark initialization as complete
      const initDir = path.dirname(configPath);
      ensureDirectory(initDir);
      SecurityUtils.safeWriteFileSync(configPath, JSON.stringify({
        initialized: true,
        version: '1.8.3',
        timestamp: new Date().toISOString(),
        sourceDir: sourceDir,
        sourceLanguage: sourceLanguage
      }, null, 2));
      return true;
    }

    const answer = await ask(`Source language files not found in ${langDir}. Run initialization now? (y/N) `);
    const { closeGlobalReadline } = require('./cli');
    closeGlobalReadline();

    if (answer.trim().toLowerCase().startsWith('y')) {
      await initializeSourceFiles(sourceDir, sourceLanguage);
      
      // Mark initialization as complete
      const initDir = path.dirname(configPath);
      ensureDirectory(initDir);
      SecurityUtils.safeWriteFileSync(configPath, JSON.stringify({
        initialized: true,
        version: '1.8.3',
        timestamp: new Date().toISOString(),
        sourceDir: sourceDir,
        sourceLanguage: sourceLanguage
      }, null, 2));
      return true;
    }
    return false;
  } catch (err) {
    console.error(`Initialization check failed: ${err.message}`);
    return false;
  }
}

/**
 * Initialize source language files directly (safe alternative to spawnSync)
 */
async function initializeSourceFiles(sourceDir, sourceLang) {
  const sourceFile = path.join(sourceDir, `${sourceLang}.json`);
  
  // Create default source language file with basic structure
  const defaultContent = {
    app: {
      title: "Application",
      description: "Application description"
    },
    common: {
      yes: "Yes",
      no: "No",
      cancel: "Cancel",
      save: "Save"
    },
    navigation: {
      home: "Home",
      about: "About",
      contact: "Contact"
    }
  };
  
  // Ensure source directory exists
  ensureDirectory(sourceDir);
  
  // Write the default source language file
  SecurityUtils.safeWriteFileSync(sourceFile, JSON.stringify(defaultContent, null, 2));
  
  // Create directories for supported languages
  const supportedLanguages = ['es', 'fr', 'de', 'ja', 'ru', 'zh', 'pt'];
  
  supportedLanguages.forEach(lang => {
    const langFile = path.join(sourceDir, `${lang}.json`);
    if (!SecurityUtils.safeExistsSync(langFile)) {
      // Create empty object structure for each language
      const emptyStructure = {
        app: {},
        common: {},
        navigation: {}
      };
      SecurityUtils.safeWriteFileSync(langFile, JSON.stringify(emptyStructure, null, 2));
    }
  });
  
  // Create i18ntk-config.json if it doesn't exist
  const configFile = 'i18ntk-config.json';
  if (!SecurityUtils.safeExistsSync(configFile)) {
    const defaultConfig = {
      version: "1.8.3",
      sourceDir: sourceDir,
      outputDir: "./i18ntk-reports",
      defaultLanguage: sourceLang,
      supportedLanguages: [sourceLang, 'es', 'fr', 'de', 'ja', 'ru', 'zh', 'pt'],
      security: {
        adminPinEnabled: true,
        sessionTimeout: 1800000,
        maxFailedAttempts: 3
      },
      performance: {
        mode: "extreme",
        cacheEnabled: true,
        batchSize: 1000
      }
    };
    SecurityUtils.safeWriteFileSync(configFile, JSON.stringify(defaultConfig, null, 2));
  }
}


module.exports = {
  getUnifiedConfig,
  parseCommonArgs,
  displayHelp,
  getEnvironmentConfig,
  displayBasicConfig,
  ensureDirectory,
  validateSourceDir,
  displayPaths,
  ensureInitialized,

};