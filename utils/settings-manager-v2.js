/**
 * Settings Manager V2
 * Enhanced settings management with configurable settings directory
 */

const fs = require('fs');
const path = require('path');

class SettingsManagerV2 {
  /**
   * Get custom settings path from configuration
   */
  static getCustomSettingsPath(projectPath = process.cwd()) {
    // Check for custom settings path configuration
    const configPath = path.join(projectPath, '.i18ntkrc');
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.settingsPath) {
          return path.resolve(projectPath, config.settingsPath);
        }
      } catch (error) {
        console.warn('Invalid .i18ntkrc configuration file:', error.message);
      }
    }
    
    // Check environment variable
    if (process.env.I18NTK_SETTINGS_PATH) {
      return path.resolve(projectPath, process.env.I18NTK_SETTINGS_PATH);
    }
    
    return null;
  }

  /**
   * Get the configured settings directory path
   */
  static getSettingsDir(projectPath = process.cwd()) {
    const customPath = this.getCustomSettingsPath(projectPath);
    if (customPath) {
      return customPath;
    }
    return path.join(projectPath, '.i18ntk-settings');
  }

  /**
   * Ensure the settings directory exists
   */
  static ensureSettingsDir(projectPath = process.cwd()) {
    const settingsDir = this.getSettingsDir(projectPath);
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }
    return settingsDir;
  }

  /**
   * Get the full path for a settings file
   */
  static getSettingsFilePath(filename, projectPath = process.cwd()) {
    return path.join(this.getSettingsDir(projectPath), filename);
  }

  /**
   * Check if settings directory exists
   */
  static hasSettingsDir(projectPath = process.cwd()) {
    return fs.existsSync(this.getSettingsDir(projectPath));
  }

  /**
   * Migrate settings from old location to new location
   */
  static migrateSettings(projectPath = process.cwd()) {
    const oldSettingsDir = path.join(projectPath, 'settings');
    const newSettingsDir = this.getSettingsDir(projectPath);
    
    if (!fs.existsSync(oldSettingsDir)) {
      return; // No legacy settings to migrate
    }
    
    if (!fs.existsSync(newSettingsDir)) {
      fs.mkdirSync(newSettingsDir, { recursive: true });
    }
    
    // Copy all files from old settings directory
    const files = fs.readdirSync(oldSettingsDir);
    files.forEach(file => {
      const oldPath = path.join(oldSettingsDir, file);
      const newPath = path.join(newSettingsDir, file);
      
      if (fs.statSync(oldPath).isFile()) {
        fs.copyFileSync(oldPath, newPath);
      }
    });
    
    console.log(`✅ Migrated settings to ${newSettingsDir}`);
  }

  /**
   * Create a sample .i18ntkrc configuration file
   */
  static createConfigFile(projectPath = process.cwd(), settingsPath = null) {
    const configPath = path.join(projectPath, '.i18ntkrc');
    const config = {
      settingsPath: settingsPath || '.i18ntk-settings'
    };
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`✅ Created configuration file: ${configPath}`);
  }
}

module.exports = SettingsManagerV2;