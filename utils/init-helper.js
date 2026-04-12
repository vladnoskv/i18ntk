const fs = require('fs');
const path = require('path');
const configManager = require('./config-manager');
const SecurityUtils = require('./security');
const packageJson = require('../package.json');

function ensureDirectory(dirPath) {
  if (!dirPath || typeof dirPath !== 'string') return;
  if (!SecurityUtils.safeExistsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJsonSafe(filePath) {
  try {
    if (!SecurityUtils.safeExistsSync(filePath)) return null;
    const raw = SecurityUtils.safeReadFileSync(filePath, path.dirname(filePath), 'utf8');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function hasSourceLanguageFiles(sourceDir, sourceLanguage) {
  const baseSourceDir = path.resolve(sourceDir);
  const modularLanguageDir = path.join(baseSourceDir, sourceLanguage);
  const singleLanguageFile = path.join(baseSourceDir, `${sourceLanguage}.json`);

  if (SecurityUtils.safeExistsSync(modularLanguageDir)) {
    try {
      if (fs.statSync(modularLanguageDir).isDirectory()) {
        return fs.readdirSync(modularLanguageDir).some(file => file.endsWith('.json'));
      }
    } catch {
      // Continue with single-file fallback.
    }
  }

  return SecurityUtils.safeExistsSync(singleLanguageFile);
}

/**
 * Check if the project is properly initialized
 * @param {Object} options - Options for initialization check
 * @returns {Promise<Object>} Object containing initialization status and config
 */
async function checkInitialized(options = {}) {
  const settings = configManager.getConfig ? configManager.getConfig() : {};
  const currentVersion = packageJson.version;
  const projectConfigPath = configManager.CONFIG_PATH || path.join(process.cwd(), '.i18ntk-config');
  const configDir = path.dirname(projectConfigPath);
  
  // Ensure config directory exists
  ensureDirectory(configDir);
  
  const defaultConfig = {
    sourceDir: settings.sourceDir || './locales',
    sourceLanguage: settings.sourceLanguage || 'en',
    projectRoot: path.resolve('.'),
    framework: settings.framework || { detected: false, prompt: 'always' },
    configDir: configDir
  };

  // Primary source of truth in v2: project-level .i18ntk-config
  const projectConfig = readJsonSafe(projectConfigPath);
  if (projectConfig?.setup?.completed === true) {
    return {
      initialized: true,
      config: {
        ...defaultConfig,
        ...projectConfig,
        framework: projectConfig.framework || defaultConfig.framework
      }
    };
  }

  // Backward compatibility: legacy initialization marker file.
  const initFilePath = path.join(configDir, 'initialization.json');
  const initStatus = readJsonSafe(initFilePath);
  const isLegacyInitialized = Boolean(initStatus?.initialized) && (
    !initStatus.version ||
    initStatus.version.split('.')[0] === currentVersion.split('.')[0]
  );
  if (isLegacyInitialized) {
    return {
      initialized: true,
      config: {
        ...defaultConfig,
        ...initStatus,
        framework: initStatus.framework || defaultConfig.framework
      }
    };
  }

  // Final fallback: detect existing source language files and mark initialized.
  const sourceDir = options.sourceDir || defaultConfig.sourceDir;
  const sourceLanguage = options.sourceLanguage || defaultConfig.sourceLanguage;
  const hasLanguageFiles = hasSourceLanguageFiles(sourceDir, sourceLanguage);

  // If language files exist but no init file, create one
  if (hasLanguageFiles) {
    const initData = {
      initialized: true,
      version: currentVersion,
      timestamp: new Date().toISOString(),
      sourceDir,
      sourceLanguage,
      detectedLanguage: defaultConfig.detectedLanguage,
      detectedFramework: defaultConfig.detectedFramework,
      lastUpdated: new Date().toISOString()
    };
    
    ensureDirectory(path.dirname(initFilePath));
    SecurityUtils.safeWriteFileSync(initFilePath, JSON.stringify(initData, null, 2), path.dirname(initFilePath), 'utf8');
    
    return {
      initialized: true,
      config: { ...defaultConfig, ...initData }
    };
  }

  return {
    initialized: false,
    config: defaultConfig
  };
}

/**
 * Mark the project as initialized
 * @param {Object} config - Configuration to save
 * @returns {Promise<void>}
 */
async function markAsInitialized(config) {
  const settings = configManager.getConfig ? configManager.getConfig() : {};
  const projectConfigPath = configManager.CONFIG_PATH || path.join(process.cwd(), '.i18ntk-config');
  const configDir = path.dirname(projectConfigPath);
  const initFilePath = path.join(configDir, 'initialization.json');
  const currentVersion = packageJson.version;
  const now = new Date().toISOString();
  const sourceDir = config?.sourceDir || settings.sourceDir || './locales';
  const sourceLanguage = config?.sourceLanguage || settings.sourceLanguage || 'en';
  
  const initData = {
    initialized: true,
    version: currentVersion,
    timestamp: now,
    sourceDir,
    sourceLanguage,
    detectedLanguage: config?.detectedLanguage || settings.detectedLanguage,
    detectedFramework: config?.detectedFramework || settings.detectedFramework,
    lastUpdated: now
  };
  
  ensureDirectory(path.dirname(initFilePath));
  SecurityUtils.safeWriteFileSync(initFilePath, JSON.stringify(initData, null, 2), path.dirname(initFilePath), 'utf8');

  const mergedConfig = {
    ...settings,
    ...(config || {}),
    sourceDir,
    sourceLanguage,
    version: currentVersion,
    setup: {
      ...(settings.setup || {}),
      completed: true,
      completedAt: now,
      version: currentVersion,
      setupId: settings.setup?.setupId || `setup_${Date.now()}`
    }
  };
  
  if (configManager.saveConfig) {
    await configManager.saveConfig(mergedConfig);
  } else {
    SecurityUtils.safeWriteFileSync(projectConfigPath, JSON.stringify(mergedConfig, null, 2), path.dirname(projectConfigPath), 'utf8');
  }
}

module.exports = {
  checkInitialized,
  markAsInitialized
};
