const fs = require('fs');
const path = require('path');
const configManager = require('./config-helper');
const { ensureDirectory } = require('./config-helper');

/**
 * Check if the project is properly initialized
 * @param {Object} options - Options for initialization check
 * @returns {Promise<Object>} Object containing initialization status and config
 */
async function checkInitialized(options = {}) {
  const settings = configManager.loadSettings ? configManager.loadSettings() : (configManager.getConfig ? configManager.getConfig() : {});
  const currentVersion = require('../package.json').version;
  const configDir = settings.configDir || './settings';
  
  // Ensure config directory exists
  ensureDirectory(configDir);
  
  const defaultConfig = {
    sourceDir: settings.sourceDir || './locales',
    sourceLanguage: settings.sourceLanguage || 'en',
    projectRoot: path.resolve('.'),
    framework: settings.framework || { detected: false, prompt: 'always' },
    configDir: configDir
  };

  // Check initialization status file with consistent path resolution
  const initFilePath = path.resolve(configDir, 'initialization.json');
  
  // If initialization file exists and is valid, return early
  if (SecurityUtils.safeExistsSync(initFilePath)) {
    try {
      const initStatus = JSON.parse(SecurityUtils.safeReadFileSync(initFilePath, path.dirname(initFilePath), 'utf8'));
      const isInitialized = initStatus.initialized && 
                          initStatus.version && 
                          initStatus.version.split('.')[0] === currentVersion.split('.')[0];
      
      if (isInitialized) {
        // Merge with default config but don't override existing settings
        return {
          initialized: true,
          config: { 
            ...defaultConfig, 
            ...initStatus,
            // Don't override framework settings if they exist
            framework: initStatus.framework || defaultConfig.framework
          }
        };
      }
    } catch (e) {
      console.warn('Warning: Invalid initialization file, will reinitialize...', e.message);
    }
  }

  // Check if source language files exist
  const langDir = path.resolve(defaultConfig.sourceDir, defaultConfig.sourceLanguage);
  const hasLanguageFiles = SecurityUtils.safeExistsSync(langDir) &&
    fs.readdirSync(langDir).some(f => f.endsWith('.json'));

  // If language files exist but no init file, create one
  if (hasLanguageFiles) {
    const initData = {
      initialized: true,
      version: currentVersion,
      timestamp: new Date().toISOString(),
      sourceDir: defaultConfig.sourceDir,
      sourceLanguage: defaultConfig.sourceLanguage,
      detectedLanguage: defaultConfig.detectedLanguage,
      detectedFramework: defaultConfig.detectedFramework,
      lastUpdated: new Date().toISOString()
    };
    
    ensureDirectory(path.dirname(initFilePath));
    SecurityUtils.safeWriteFileSync(initFilePath, JSON.stringify(initData, null, 2));
    
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
  const settings = configManager.loadSettings ? configManager.loadSettings() : (configManager.getConfig ? configManager.getConfig() : {});
  const configDir = settings.configDir || './settings';
  const initFilePath = path.resolve(configDir, 'initialization.json');
  const currentVersion = require('../package.json').version;
  
  const initData = {
    initialized: true,
    version: currentVersion,
    timestamp: new Date().toISOString(),
    sourceDir: config.sourceDir,
    sourceLanguage: config.sourceLanguage,
    detectedLanguage: config.detectedLanguage,
    detectedFramework: config.detectedFramework,
    lastUpdated: new Date().toISOString()
  };
  
  ensureDirectory(path.dirname(initFilePath));
  SecurityUtils.safeWriteFileSync(initFilePath, JSON.stringify(initData, null, 2));
  
  // Update the settings object if it has a save method
  if (configManager.saveSettings) {
    await configManager.saveSettings({ ...settings, ...initData });
  } else if (configManager.saveConfig) {
    await configManager.saveConfig({ ...settings, ...initData });
  }
}

module.exports = {
  checkInitialized,
  markAsInitialized
};
