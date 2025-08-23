const fs = require('fs');
const path = require('path');

const settingsManager = require('../settings/settings-manager');
const CONFIG_FILE = 'i18ntk-config.json';

/**
 * Validates if the resolved path is within the allowed directory
 * @param {string} filePath - Path to validate
 * @param {string} allowedDir - Base directory that the path must be within
 * @returns {string} Normalized path if valid
 * @throws {Error} If path traversal is detected
 */
function validatePath(filePath, allowedDir) {
  const resolvedPath = path.resolve(filePath);
  const resolvedAllowed = path.resolve(allowedDir);
  
  // Check if the resolved path is within the allowed directory
  if (!resolvedPath.startsWith(resolvedAllowed)) {
    throw new Error(`Path traversal attempt detected: ${filePath}`);
  }
  
  return resolvedPath;
}

/**
 * Gets the configuration file path with security validation
 * @param {string} cwd - Current working directory (defaults to settingsManager.configDir)
 * @returns {string} Validated configuration file path
 */
function getConfigPath(cwd = settingsManager.configDir) {
  const configDir = path.normalize(cwd).replace(/(\.\.(\/|\\|$))+/g, '');
  return validatePath(
    path.join(settingsManager.configDir, configDir, CONFIG_FILE),
    settingsManager.configDir
  );
}

/**
 * Loads and parses the configuration file
 * @param {string} cwd - Current working directory
 * @returns {Object|null} Parsed configuration or null if not found/invalid
 */
function loadConfig(cwd = settingsManager.configDir) {
  try {
    const configPath = getConfigPath(cwd);
    
    // Check if file exists and is accessible
    if (!fs.existsSync(configPath)) {
      return null;
    }
    
    // Read file with explicit encoding
    const raw = fs.readFileSync(configPath, { encoding: 'utf8', flag: 'r' });
    
    // Basic validation of file content
    if (!raw || typeof raw !== 'string') {
      throw new Error('Invalid configuration file content');
    }
    
    const config = JSON.parse(raw);
    
    if (config && typeof config === 'object' && !Array.isArray(config)) {
      return config;
    }
    
    throw new Error('Invalid configuration format');
  } catch (error) {
    console.error(`Error loading config: ${error.message}`);
    return null;
  }
}

/**
 * Saves configuration to file
 * @param {Object} config - Configuration object to save
 * @param {string} cwd - Current working directory
 * @returns {boolean} True if successful, false otherwise
 */
function saveConfig(config, cwd = settingsManager.configDir) {
  try {
    const configPath = getConfigPath(cwd);
    const dir = path.dirname(configPath);
    
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    
    // Write file with secure permissions (read/write for owner only)
    fs.writeFileSync(
      configPath,
      JSON.stringify(config, null, 2),
      { mode: 0o600, encoding: 'utf8' }
    );
    
    return true;
  } catch (error) {
    console.error(`Error saving config: ${error.message}`);
    return false;
  }
}

/**
 * Ensures default values for configuration
 * @param {Object} cfg - Configuration object
 * @returns {Object} Configuration with defaults
 */
function ensureConfigDefaults(cfg = {}) {
  return {
    initialized: cfg.initialized ?? false,
    i18nDir: cfg.i18nDir ?? null,
    sourceDir: cfg.sourceDir ?? null,
    framework: {
      detected: cfg.framework?.detected ?? null,
      preference: cfg.framework?.preference ?? 'none',
      prompt: cfg.framework?.prompt ?? 'always',
      lastPromptedVersion: cfg.framework?.lastPromptedVersion ?? null
    }
  };
}

module.exports = { 
  getConfigPath, 
  loadConfig, 
  saveConfig, 
  ensureConfigDefaults,
  validatePath // Exported for testing
};