/**
 * Unified Configuration Helper
 * Provides consistent directory configuration across all i18n toolkit scripts
 * Configuration is managed through settings files only
 */

const fs = require('fs');
const path = require('path');
const configManager = require('./config-manager');
const SecurityUtils = require('./security');
const {t, loadTranslations} = require('./i18n-helper');

const readline = require('readline');
const { spawnSync } = require('child_process');

/**
 * Get unified configuration for any script
 * @param {string} scriptName - Name of the script (e.g., 'complete', 'analyze', 'validate')
 * @param {object} cliArgs - Command line arguments parsed from the script
 * @returns {object} Unified configuration object
 */
function getUnifiedConfig(scriptName, cliArgs = {}) {
  try {
    let cfg = configManager.getConfig();
    const projectRoot = path.resolve(cfg.projectRoot || '.');

    const updates = {};
    if (cliArgs.sourceDir) {
      const abs = path.resolve(projectRoot, cliArgs.sourceDir);
      updates.sourceDir = configManager.toRelative(abs);
    }
    if (cliArgs.i18nDir) {
      const abs = path.resolve(projectRoot, cliArgs.i18nDir);
      updates.i18nDir = configManager.toRelative(abs);
    }
    if (cliArgs.outputDir) {
      const abs = path.resolve(projectRoot, cliArgs.outputDir);
      updates.outputDir = configManager.toRelative(abs);
    }
    if (Object.keys(updates).length > 0) {
      configManager.updateConfig(updates);
      cfg = configManager.getConfig();
    }

    // Resolve all paths to absolute
    cfg = configManager.resolvePaths(cfg);

    // Script-specific override for sourceDir
    if (cfg.scriptDirectories?.[scriptName]) {
      cfg.sourceDir = path.resolve(cfg.projectRoot, cfg.scriptDirectories[scriptName]);
    }

    // Auto-fix i18nDir if missing but sourceDir exists
    if (!fs.existsSync(cfg.i18nDir) && fs.existsSync(cfg.sourceDir)) {
      configManager.updateConfig({ i18nDir: configManager.toRelative(cfg.sourceDir) });
      cfg.i18nDir = cfg.sourceDir;
    }

    const displayPaths = {
      projectRoot: '.',
      sourceDir: configManager.toRelative(cfg.sourceDir),
      i18nDir: configManager.toRelative(cfg.i18nDir),
      outputDir: configManager.toRelative(cfg.outputDir),
    };

    const config = {
      ...cfg,
      sourceLanguage: cliArgs.sourceLanguage || cfg.sourceLanguage || 'en',
      uiLanguage: cliArgs.uiLanguage || cfg.uiLanguage || 'en',
      notTranslatedMarker: cfg.notTranslatedMarker || 'NOT_TRANSLATED',
      supportedExtensions: cfg.supportedExtensions || cfg.processing?.supportedExtensions || ['.json', '.js', '.ts'],
      excludeFiles: cfg.excludeFiles || cfg.processing?.excludeFiles || ['.DS_Store', 'Thumbs.db'],
      excludeDirs: cfg.excludeDirs || cfg.processing?.excludeDirs || ['node_modules', '.next', '.git', 'dist', 'build'],
      strictMode: cliArgs.strictMode || cfg.strictMode || false,
      backupDir: path.resolve(cfg.projectRoot, path.join('.i18ntk', 'backups')),
      tempDir: path.resolve(cfg.projectRoot, path.join('.i18ntk', 'temp')),
      cacheDir: path.resolve(cfg.projectRoot, path.join('.i18ntk', '.cache')),
      configDir: path.resolve(cfg.projectRoot, '.i18ntk'),
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
  
  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
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
        case 'source-language':
          parsed.sourceLanguage = sanitizedValue;
          break;
        case 'ui-language':
          parsed.uiLanguage = sanitizedValue;
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
        default:
          // Handle language shorthand flags like --de, --fr
          if (['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'].includes(sanitizedKey)) {
            parsed.uiLanguage = sanitizedKey;
          }
          break;
      }
    }
  });
  
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
    'strict': 'Enable strict validation mode',
    'no-prompt': 'Skip interactive prompts',
    'help': 'Show this help message'
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
  
  console.log(`\nExamples:`);
  console.log(`  node ${scriptName}.js --source-dir=./locales`);
  console.log(`  node ${scriptName}.js --source-dir=./app --i18n-dir=./locales`);
  console.log(`  node ${scriptName}.js --output-dir=./i18ntk-reports`);
  console.log(`  npx i18ntk ${scriptName.replace('i18ntk-', '')} --help`);
  
  console.log('\nConfiguration:');
  console.log(`  Settings are loaded from ${configManager.CONFIG_PATH}`);
  console.log('  Use --source-dir, --i18n-dir, and --output-dir to override');
}

/**
 * Ensure directory exists, create if necessary
 * @param {string} dirPath - Directory path
 */
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Validate that source directory exists
 * @param {string} sourceDir - Source directory path
 * @param {string} scriptName - Script name for error messages
 */
function validateSourceDir(sourceDir, scriptName) {
  if (!fs.existsSync(sourceDir)) {
    // Ensure translations loaded for error message
    try { loadTranslations(); } catch (e) {}
    const message = t('config.dirInvalidError', { dir: sourceDir }) ||
      `Source directory not found: ${sourceDir}`;
    throw new Error(message);
  }
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
    const sourceDir = cfg.sourceDir;
    const sourceLanguage = cfg.sourceLanguage || 'en';
    const langDir = path.join(sourceDir, sourceLanguage);

    const initialized = fs.existsSync(langDir) &&
      fs.readdirSync(langDir).some(f => f.endsWith('.json'));
    if (initialized) return true;

    const nonInteractive = !process.stdin.isTTY;
    const initScript = path.join(__dirname, '..', 'main', 'i18ntk-init.js');

    if (nonInteractive) {
      console.warn(`Missing source language files in ${langDir}. Running initialization...`);
      const result = spawnSync(process.execPath, [initScript, '--yes', `--source-dir=${sourceDir}`, `--source-language=${sourceLanguage}`], { stdio: 'inherit', windowsHide: true });
      return result.status === 0;
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise(res => rl.question(`Source language files not found in ${langDir}. Run initialization now? (y/N) `, res));
    rl.close();
    if (answer.trim().toLowerCase().startsWith('y')) {
      const result = spawnSync(process.execPath, [initScript, `--source-dir=${sourceDir}`, `--source-language=${sourceLanguage}`], { stdio: 'inherit', windowsHide: true });
      return result.status === 0;
    }
    return false;
  } catch (err) {
    console.error(`Initialization check failed: ${err.message}`);
    return false;
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