const path = require('path');
const fs = require('fs');
const SecurityUtils = require('./security');
const SettingsManager = require('../settings/settings-manager');
let _settingsManagerSingleton;

function getSettingsManager() {
  if (!_settingsManagerSingleton) {
    _settingsManagerSingleton = new SettingsManager();
  }
  return _settingsManagerSingleton;
}
const CONFIG_FILE = 'i18ntk-config.json';

/**
 * Validates if the resolved path is within the allowed directory
 * @param {string} filePath - Path to validate
 * @param {string} allowedDir - Base directory that the path must be within
 * @returns {string} Normalized path if valid
 * @throws {Error} If path traversal is detected
 */
function validatePath(filePath, allowedDir) {
  let resolvedPath;
  let resolvedAllowed;
  
  try {
    // Use fs.realpathSync.native for proper canonicalization on Windows
    resolvedPath = fs.realpathSync.native(path.resolve(filePath));
    resolvedAllowed = fs.realpathSync.native(path.resolve(allowedDir));
  } catch (error) {
    // Always try to canonicalize allowedDir even if filePath resolution failed
    try {
      resolvedAllowed = fs.realpathSync.native(path.resolve(allowedDir));
    } catch {
      resolvedAllowed = path.resolve(allowedDir);
    }

    if (error && error.code === 'ENOENT') {
      // File may not exist yet: canonicalize its parent dir to resolve any symlinks
      let parent = path.dirname(path.resolve(filePath));
      try {
        parent = fs.realpathSync.native(parent);
      } catch {
        parent = path.resolve(parent);
      }
      resolvedPath = path.join(parent, path.basename(filePath));
    } else {
      // Unexpected error: fall back to lexical resolution for the path only
      resolvedPath = path.resolve(filePath);
    }
  }
  
  // Use path.relative for accurate comparison, handling separators and casing
  const relativePath = path.relative(resolvedAllowed, resolvedPath);
  
  // Check if the path tries to escape the allowed directory
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Path traversal attempt detected: ${filePath}`);
  }
  
  return resolvedPath;
}

function getConfigPath(cwd = getSettingsManager().configDir) {
  const sm = getSettingsManager();
  const baseDir = sm.configDir;
  // Do not mutate cwd; rely on validatePath to enforce boundaries.
  return validatePath(
    path.join(baseDir, cwd, CONFIG_FILE),
    baseDir
  );
}

/**
 * Loads and parses the configuration file
 * @param {string} cwd - Current working directory
 * @returns {Object|null} Parsed configuration or null if not found/invalid
 */
function loadConfig(cwd = getSettingsManager().configDir) {
  try {
    const configPath = getConfigPath(cwd);
    
    // Check if file exists and is accessible
    if (!SecurityUtils.safeExistsSync(configPath)) {
      return null;
    }
    
    // Read file with explicit encoding
    const raw = SecurityUtils.safeReadFileSync(configPath, { encoding: 'utf8', flag: 'r' });
    
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
function saveConfig(config, cwd = getSettingsManager().configDir) {
  try {
    const configPath = getConfigPath(cwd);
    const dir = path.dirname(configPath);
    
    // Ensure directory exists
    if (!SecurityUtils.safeExistsSync(dir)) {
      SecurityUtils.safeMkdirSync(dir, { recursive: true, mode: 0o700 });
    }
    
    // Write file with secure permissions (read/write for owner only)
    SecurityUtils.safeWriteFileSync(
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