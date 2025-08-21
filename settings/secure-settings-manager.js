/**
 * Secure Settings Manager for i18nTK
 * Manages encrypted settings with secure path handling
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { pathEncryption } = require('../utils/path-encryption');
const SecurityUtils = require('../utils/security');

class SecureSettingsManager {
  constructor(settingsDir = null) {
    this.settingsDir = settingsDir || path.join(os.homedir(), '.i18ntk', 'settings');
    this.settingsFile = path.join(this.settingsDir, 'initialization.json');
    this.backupFile = path.join(this.settingsDir, 'initialization.json.backup');
    this.encryptedFields = ['sourceDir', 'backupDir', 'configDir'];
  }

  /**
   * Load settings with automatic decryption of sensitive fields
   * @returns {Object} Decrypted settings
   */
  loadSettings() {
    try {
      if (!fs.existsSync(this.settingsFile)) {
        return this.createDefaultSettings();
      }

      const rawData = fs.readFileSync(this.settingsFile, 'utf8');
      const settings = JSON.parse(rawData);

      // Decrypt sensitive fields
      const decryptedSettings = { ...settings };
      
       for (const field of this.encryptedFields) {
         if (settings[field] && pathEncryption.isEncryptedPath(settings[field])) {
           try {
             decryptedSettings[field] = pathEncryption.decryptPath(settings[field]);
           } catch (error) {
             console.warn(`Failed to decrypt ${field}, keeping encrypted:`, error.message);
             // Mark field as unavailable rather than keeping encrypted value
             delete decryptedSettings[field];
             decryptedSettings[`${field}_encrypted`] = true;
           }
         }
       }

       return decryptedSettings;
    } catch (error) {
      console.error('Failed to load settings:', error.message);
      return this.createDefaultSettings();
    }
  }

  /**
   * Save settings with encryption of sensitive fields
   * @param {Object} settings - Settings to save
   * @returns {boolean} Success status
   */
  saveSettings(settings) {
    try {
      // Ensure settings directory exists
      SecurityUtils.safeMkdirSync(this.settingsDir);

      // Create backup of existing settings
      if (fs.existsSync(this.settingsFile)) {
        fs.copyFileSync(this.settingsFile, this.backupFile);
      }

      // Encrypt sensitive fields
      const encryptedSettings = { ...settings };
      
      for (const field of this.encryptedFields) {
        if (settings[field] && !pathEncryption.isEncryptedPath(settings[field])) {
          try {
            encryptedSettings[field] = pathEncryption.encryptPath(settings[field]);
          } catch (error) {
            console.warn(`Failed to encrypt ${field}:`, error.message);
            // Keep original value if encryption fails
          }
        }
      }

      // Write settings with secure permissions
      const settingsData = JSON.stringify(encryptedSettings, null, 2);
      fs.writeFileSync(this.settingsFile, settingsData, { mode: 0o600 });

      // Remove backup if successful
      if (fs.existsSync(this.backupFile)) {
        fs.unlinkSync(this.backupFile);
      }

      return true;
    } catch (error) {
      console.error('Failed to save settings:', error.message);
      
      // Restore backup if available
      if (fs.existsSync(this.backupFile)) {
        try {
          fs.copyFileSync(this.backupFile, this.settingsFile);
          fs.unlinkSync(this.backupFile);
        } catch (restoreError) {
          console.error('Failed to restore backup:', restoreError.message);
        }
      }
      
      return false;
    }
  }

  /**
   * Create default settings
   * @returns {Object} Default settings
   */

  createDefaultSettings() {
    const defaultSettings = {
      initialized: false,
      version: "1.10.1",
      timestamp: new Date().toISOString(),
      sourceLanguage: "en",
      lastPromptedVersion: "1.10.1"
    };

    // Add default sourceDir relative to project root
    defaultSettings.sourceDir = path.join(process.cwd(), 'locales');
    
    return defaultSettings;
  }

  /**
   * Update specific settings
   * @param {Object} updates - Settings to update
   * @returns {boolean} Success status
   */
  updateSettings(updates) {
    // Consider using a lock file or file locking mechanism
    const lockFile = `${this.settingsFile}.lock`;

    // Create lock file
    try {
      fs.writeFileSync(lockFile, process.pid.toString(), { flag: 'wx' });
    } catch (error) {
      if (error.code === 'EEXIST') {
        throw new Error('Settings are being modified by another process');
      }
      throw error;
    }

    try {
      const currentSettings = this.loadSettings();
      const updatedSettings = { ...currentSettings, ...updates };
      updatedSettings.timestamp = new Date().toISOString();

      return this.saveSettings(updatedSettings);
    } finally {
      // Clean up lock file
      try {
        fs.unlinkSync(lockFile);
      } catch (error) {
        console.warn('Failed to remove lock file:', error.message);
      }
    }
  }

  /**
   * Get settings with optional decryption
   * @param {boolean} decrypt - Whether to decrypt sensitive fields
   * @returns {Object} Settings
   */
  getSettings(decrypt = true) {
    if (decrypt) {
      return this.loadSettings();
    } else {
      // Return raw settings without decryption
      try {
        if (!fs.existsSync(this.settingsFile)) {
          return this.createDefaultSettings();
        }
        const rawData = fs.readFileSync(this.settingsFile, 'utf8');
        return JSON.parse(rawData);
      } catch (error) {
        return this.createDefaultSettings();
      }
    }
  }

  /**
   * Validate settings structure
   * @param {Object} settings - Settings to validate
   * @returns {Object} Validation result
   */
  validateSettings(settings) {
    const errors = [];
    const warnings = [];

    // Check required fields
    if (!settings.version) {
      errors.push('Missing version field');
    }

    if (!settings.sourceLanguage) {
      errors.push('Missing sourceLanguage field');
    }

    // Validate paths
      // Validate paths
      if (settings.sourceDir && !pathEncryption.isEncryptedPath(settings.sourceDir)) {
        const validatedPath = SecurityUtils.sanitizePath(settings.sourceDir, this.settingsDir);
        if (!validatedPath) {
          errors.push('Invalid sourceDir path - potential directory traversal detected');
        }
      }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Migrate from old unencrypted settings
   * @returns {boolean} Success status
   */
  migrateFromLegacy() {
    try {
      if (!fs.existsSync(this.settingsFile)) {
        return false;
      }

      const rawData = fs.readFileSync(this.settingsFile, 'utf8');
      const settings = JSON.parse(rawData);

      // Check if migration is needed
      let needsMigration = false;
      for (const field of this.encryptedFields) {
        if (settings[field] && !pathEncryption.isEncryptedPath(settings[field])) {
          needsMigration = true;
          break;
        }
      }

      if (needsMigration) {
        console.log('Migrating settings to encrypted format...');
        return this.saveSettings(settings);
      }

      return true;
    } catch (error) {
      console.error('Migration failed:', error.message);
      return false;
    }
  }

  /**
   * Reset settings to defaults
   * @returns {boolean} Success status
   */
  resetSettings() {
    try {
      if (fs.existsSync(this.settingsFile)) {
        fs.unlinkSync(this.settingsFile);
      }
      if (fs.existsSync(this.backupFile)) {
        fs.unlinkSync(this.backupFile);
      }
      return true;
    } catch (error) {
      console.error('Failed to reset settings:', error.message);
      return false;
    }
  }

  /**
   * Get path information without revealing sensitive data
   * @param {string} field - Settings field name
   * @returns {Object} Path information
   */
  getPathInfo(field) {
    const settings = this.getSettings(false); // Get raw settings
    
    if (!settings[field]) {
      return { exists: false };
    }

    return pathEncryption.getPathInfo(settings[field]);
  }
};

module.exports = {
  SecureSettingsManager,
  get secureSettingsManager() { return getSecureSettingsManager(); },
  getSecureSettingsManager,

} 
module.exports = {
  SecureSettingsManager,
  get secureSettingsManager() { return getSecureSettingsManager(); },
  getSecureSettingsManager,
  getPathInfo: (field) => getSecureSettingsManager().getPathInfo(field),
  resetSettings: () => getSecureSettingsManager().resetSettings()
}