/**
 * Unified Configuration Helper
 * Provides consistent directory configuration across all i18n toolkit scripts
 * Configuration is managed through settings files only
 */

const fs = require('fs');
const path = require('path');
const settingsManager = require('../settings/settings-manager');
const SecurityUtils = require('./security');

/**
 * Get unified configuration for any script
 * @param {string} scriptName - Name of the script (e.g., 'complete', 'analyze', 'validate')
 * @param {object} cliArgs - Command line arguments parsed from the script
 * @returns {object} Unified configuration object
 */
function getUnifiedConfig(scriptName, cliArgs = {}) {
  try {
    const settings = settingsManager.getAllSettings();
    const projectRoot = path.resolve(
      settings.projectRoot || 
      '.'
    );
    
    // Use .i18ntk directory for configuration storage
    const configDir = path.join(projectRoot, '.i18ntk');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Determine source directory with proper precedence:
  // 1. CLI argument (highest priority)
  // 2. Script-specific override from settings
  // 3. Global source directory from settings
  // 4. Global i18n directory from settings
  // 5. Default fallback
  let sourceDir;
  const directoryUpdates = {};
  
  if (cliArgs.sourceDir) {
    sourceDir = cliArgs.sourceDir;
    directoryUpdates.sourceDir = sourceDir;
  } else if (settings.scriptDirectories?.[scriptName]) {
    sourceDir = settings.scriptDirectories[scriptName];
  } else {
    sourceDir = settings.sourceDir || settings.i18nDir || './locales';
  }
  
  // Ensure sourceDir is resolved relative to projectRoot
  sourceDir = path.resolve(projectRoot, sourceDir);
    
    // Determine i18n directory (can be different from sourceDir)
    let i18nDir;
    if (cliArgs.i18nDir) {
      i18nDir = cliArgs.i18nDir;
      directoryUpdates.i18nDir = i18nDir;
    } else {
      i18nDir = settings.i18nDir || settings.sourceDir || './locales';
    }
    i18nDir = path.resolve(projectRoot, i18nDir);
    
    // Determine output directory
    let outputDir;
    if (cliArgs.outputDir) {
      outputDir = cliArgs.outputDir;
      directoryUpdates.outputDir = outputDir;
    } else {
      outputDir = settings.outputDir || './i18ntk-reports';
    }
    outputDir = path.resolve(projectRoot, outputDir);
    
    // Update global settings if directories were specified via CLI
    if (Object.keys(directoryUpdates).length > 0) {
      settingsManager.updateDirectorySettings(directoryUpdates);
    }
    
    const config = {
      projectRoot,
      sourceDir,
      i18nDir,
      outputDir,
      sourceLanguage: cliArgs.sourceLanguage || settings.sourceLanguage || 'en',
      notTranslatedMarker: settings.notTranslatedMarker || 
                          settings.processing?.notTranslatedMarker || 
                          'NOT_TRANSLATED',
      supportedExtensions: settings.supportedExtensions || 
                          settings.processing?.supportedExtensions || 
                          ['.json', '.js', '.ts'],
      excludeFiles: settings.excludeFiles || 
                   settings.processing?.excludeFiles || 
                   ['.DS_Store', 'Thumbs.db'],
      excludeDirs: settings.excludeDirs || 
                  settings.processing?.excludeDirs || 
                  ['node_modules', '.next', '.git', 'dist', 'build'],
      strictMode: cliArgs.strictMode || 
                   settings.strictMode || 
                   settings.processing?.strictMode || 
                   false,
      uiLanguage: cliArgs.uiLanguage || 
                 settings.language || 
                 settings.uiLanguage || 
                 'en',
      // Environment-specific directories - use .i18ntk subdirectory
      backupDir: path.resolve(projectRoot, path.join('.i18ntk', 'backups')),
      tempDir: path.resolve(projectRoot, path.join('.i18ntk', 'temp')),
      cacheDir: path.resolve(projectRoot, path.join('.i18ntk', '.cache')),
      configDir: configDir,
      // Pass through additional settings
      settings: {
        defaultLanguages: settings.defaultLanguages || ['de', 'es', 'fr', 'ru'],
        processing: {
          maxFileSize: parseInt(settings.processing?.maxFileSize || '5242880', 10),
          maxFiles: parseInt(settings.processing?.maxFiles || '1000', 10),
          timeout: parseInt(settings.processing?.timeout || '300000', 10),
          enableCompression: settings.processing?.enableCompression !== false,
          compressionLevel: parseInt(settings.processing?.compressionLevel || '6', 10),
          ...settings.processing
        },
        security: {
          adminPin: settings.security?.adminPin || '0000',
          encryptionKey: settings.security?.encryptionKey,
          jwtSecret: settings.security?.jwtSecret,
          disableWeakPinWarning: settings.security?.disableWeakPinWarning === true,
          ...settings.security
        },
        advanced: settings.advanced || {}
      },
      // Debug and logging configuration
      debug: {
        enabled: settings.debug?.enabled || false,
        level: settings.debug?.level || 'info',
        logFile: settings.debug?.logFile || path.join(configDir, 'i18ntk.log')
      }
    };
    
    // Validate critical paths
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
  console.log('  Settings are loaded from settings/i18ntk-config.json');
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
    throw new Error(`Source directory not found: ${sourceDir}\n` +
                   `Run "node main/i18ntk-init.js" to initialize project structure, ` +
                   `or check your settings in settings/i18ntk-config.json`);
  }
}

module.exports = {
  getUnifiedConfig,
  parseCommonArgs,
  displayHelp,
  getEnvironmentConfig,
  displayBasicConfig,
  ensureDirectory,
  validateSourceDir
};