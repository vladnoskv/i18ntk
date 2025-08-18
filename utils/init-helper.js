const fs = require('fs');
const path = require('path');
const configManager = require('./config-manager');
const { ensureDirectory } = require('./config-helper');

/**
 * Check if the project is properly initialized
 * @param {Object} options - Options for initialization check
 * @returns {Promise<Object>} Object containing initialization status and config
 */
async function checkInitialized(options = {}) {
  const config = configManager.getConfig();
  const currentVersion = require('../package.json').version;
  
  // Use the unified configuration system
  const sourceDir = config.sourceDir || './locales';
  const sourceLanguage = config.sourceLanguage || 'en';
  
  // Check if source language files exist
  const langDir = path.resolve(sourceDir, sourceLanguage);
  const hasLanguageFiles = SecurityUtils.safeExistsSync(langDir) &&
    SecurityUtils.safeReaddirSync(langDir).some(f => f.endsWith('.json'));
  
  // Return initialization status based on file existence
  return {
    initialized: hasLanguageFiles,
    config: {
      sourceDir: sourceDir,
      sourceLanguage: sourceLanguage,
      projectRoot: path.resolve('.'),
      framework: config.framework || { detected: false, prompt: 'always' },
      version: currentVersion,
      timestamp: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    }
  };
}

/**
 * Mark the project as initialized
 * @param {Object} config - Configuration to save
 * @returns {Promise<void>}
 */
async function markAsInitialized(config) {
  // No longer needed as initialization status is determined by file existence
  // The unified configuration system handles all settings
  // This function is now a no-op to maintain backward compatibility
}

module.exports = {
  checkInitialized,
  markAsInitialized
};
