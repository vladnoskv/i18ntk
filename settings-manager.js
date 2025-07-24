/**
 * Settings Manager Module
 * Handles loading, saving, and managing user configuration settings
 */

const fs = require('fs');
const path = require('path');

class SettingsManager {
    constructor() {
        this.configFile = path.join(__dirname, 'user-config.json');
        this.defaultConfig = {
            language: 'en',
            sizeLimit: null,
            sourceDir: './locales',
            sourceLanguage: 'en',
            defaultLanguages: ['de', 'es', 'fr', 'ru'],
            outputDir: './i18n-reports',
            reportLanguage: 'auto',
            theme: 'light',
            autoSave: true,
            notifications: true,
            advanced: {
                batchSize: 100,
                maxConcurrentFiles: 10,
                enableProgressBars: true,
                enableColorOutput: true,
                strictMode: false,
                enableAuditLog: false,
                backupBeforeChanges: true,
                validateOnSave: true,
                sizingThreshold: 50,
                sizingFormat: 'table'
            }
        };
        this.settings = this.loadSettings();
    }

    /**
     * Load settings from file or return default settings
     * @returns {object} Settings object
     */
    loadSettings() {
        try {
            if (fs.existsSync(this.configFile)) {
                const content = fs.readFileSync(this.configFile, 'utf8');
                const loadedSettings = JSON.parse(content);
                // Merge with defaults to ensure all properties exist
                return this.mergeWithDefaults(loadedSettings);
            }
        } catch (error) {
            console.error('❌ Error loading settings:', error.message);
        }
        return { ...this.defaultConfig };
    }

    /**
     * Merge loaded settings with defaults to ensure all properties exist
     * @param {object} loadedSettings - Settings loaded from file
     * @returns {object} Merged settings
     */
    mergeWithDefaults(loadedSettings) {
        const merged = { ...this.defaultConfig, ...loadedSettings };
        
        // Ensure advanced settings are properly merged
        if (loadedSettings.advanced) {
            merged.advanced = { ...this.defaultConfig.advanced, ...loadedSettings.advanced };
        }
        
        return merged;
    }

    /**
     * Save settings to file
     * @param {object} newSettings - Settings to save
     * @returns {boolean} Success status
     */
    saveSettings(newSettings = null) {
        try {
            const settingsToSave = newSettings || this.settings;
            
            // Validate settings before saving
            if (!this.validateSettings(settingsToSave)) {
                throw new Error('Invalid settings provided');
            }
            
            // Create backup if enabled
            if (settingsToSave.advanced?.backupBeforeChanges) {
                this.createBackup();
            }
            
            fs.writeFileSync(this.configFile, JSON.stringify(settingsToSave, null, 2), 'utf8');
            this.settings = settingsToSave;
            return true;
        } catch (error) {
            console.error('❌ Error saving settings:', error.message);
            return false;
        }
    }

    /**
     * Get current settings
     * @returns {object} Current settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Get a specific setting value
     * @param {string} key - Setting key (supports dot notation)
     * @returns {any} Setting value
     */
    getSetting(key) {
        const keys = key.split('.');
        let value = this.settings;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return undefined;
            }
        }
        
        return value;
    }

    /**
     * Set a specific setting value
     * @param {string} key - Setting key (supports dot notation)
     * @param {any} value - Setting value
     * @returns {boolean} Success status
     */
    setSetting(key, value) {
        try {
            const keys = key.split('.');
            let current = this.settings;
            
            // Navigate to the parent object
            for (let i = 0; i < keys.length - 1; i++) {
                const k = keys[i];
                if (!(k in current) || typeof current[k] !== 'object') {
                    current[k] = {};
                }
                current = current[k];
            }
            
            // Set the value
            current[keys[keys.length - 1]] = value;
            
            // Auto-save if enabled
            if (this.settings.autoSave) {
                return this.saveSettings();
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error setting value:', error.message);
            return false;
        }
    }

    /**
     * Reset settings to defaults
     * @returns {boolean} Success status
     */
    resetToDefaults() {
        this.settings = { ...this.defaultConfig };
        return this.saveSettings();
    }

    /**
     * Validate settings object
     * @param {object} settings - Settings to validate
     * @returns {boolean} Validation result
     */
    validateSettings(settings) {
        try {
            // Check required properties
            const required = ['language', 'sourceDir', 'sourceLanguage', 'defaultLanguages', 'outputDir'];
            for (const prop of required) {
                if (!(prop in settings)) {
                    console.error(`❌ Missing required setting: ${prop}`);
                    return false;
                }
            }
            
            // Validate language codes
            const validLanguages = ['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'];
            if (!validLanguages.includes(settings.language)) {
                console.error(`❌ Invalid language: ${settings.language}`);
                return false;
            }
            
            if (!validLanguages.includes(settings.sourceLanguage)) {
                console.error(`❌ Invalid source language: ${settings.sourceLanguage}`);
                return false;
            }
            
            // Validate arrays
            if (!Array.isArray(settings.defaultLanguages)) {
                console.error('❌ defaultLanguages must be an array');
                return false;
            }
            
            // Validate advanced settings if present
            if (settings.advanced) {
                const advanced = settings.advanced;
                
                if (advanced.batchSize && (typeof advanced.batchSize !== 'number' || advanced.batchSize < 1)) {
                    console.error('❌ Invalid batchSize');
                    return false;
                }
                
                if (advanced.maxConcurrentFiles && (typeof advanced.maxConcurrentFiles !== 'number' || advanced.maxConcurrentFiles < 1)) {
                    console.error('❌ Invalid maxConcurrentFiles');
                    return false;
                }
                
                if (advanced.sizingThreshold && (typeof advanced.sizingThreshold !== 'number' || advanced.sizingThreshold < 0)) {
                    console.error('❌ Invalid sizingThreshold');
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error validating settings:', error.message);
            return false;
        }
    }

    /**
     * Create a backup of current settings
     * @returns {boolean} Success status
     */
    createBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = this.configFile.replace('.json', `-backup-${timestamp}.json`);
            
            if (fs.existsSync(this.configFile)) {
                fs.copyFileSync(this.configFile, backupFile);
                console.log(`📁 Settings backup created: ${path.basename(backupFile)}`);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Error creating backup:', error.message);
            return false;
        }
    }

    /**
     * Get available language options
     * @returns {Array} Array of language objects
     */
    getAvailableLanguages() {
        return [
            { code: 'en', name: 'English', flag: '🇺🇸' },
            { code: 'de', name: 'Deutsch (German)', flag: '🇩🇪' },
            { code: 'es', name: 'Español (Spanish)', flag: '🇪🇸' },
            { code: 'fr', name: 'Français (French)', flag: '🇫🇷' },
            { code: 'ru', name: 'Русский (Russian)', flag: '🇷🇺' },
            { code: 'ja', name: '日本語 (Japanese)', flag: '🇯🇵' },
            { code: 'zh', name: '中文 (Chinese)', flag: '🇨🇳' }
        ];
    }

    /**
     * Get settings schema for UI generation
     * @returns {object} Settings schema
     */
    getSettingsSchema() {
        return {
            basic: {
                title: 'Basic Settings',
                fields: {
                    language: {
                        type: 'select',
                        label: 'UI Language',
                        options: this.getAvailableLanguages(),
                        description: 'Language for the user interface'
                    },
                    sourceDir: {
                        type: 'text',
                        label: 'Source Directory',
                        description: 'Directory containing translation files'
                    },
                    sourceLanguage: {
                        type: 'select',
                        label: 'Source Language',
                        options: this.getAvailableLanguages(),
                        description: 'Primary language for translations'
                    },
                    outputDir: {
                        type: 'text',
                        label: 'Output Directory',
                        description: 'Directory for generated reports'
                    },
                    theme: {
                        type: 'select',
                        label: 'Theme',
                        options: [
                            { code: 'light', name: 'Light' },
                            { code: 'dark', name: 'Dark' }
                        ],
                        description: 'UI theme preference'
                    }
                }
            },
            advanced: {
                title: 'Advanced Settings',
                fields: {
                    'advanced.batchSize': {
                        type: 'number',
                        label: 'Batch Size',
                        min: 1,
                        max: 1000,
                        description: 'Number of items processed per batch'
                    },
                    'advanced.maxConcurrentFiles': {
                        type: 'number',
                        label: 'Max Concurrent Files',
                        min: 1,
                        max: 50,
                        description: 'Maximum files processed simultaneously'
                    },
                    'advanced.sizingThreshold': {
                        type: 'number',
                        label: 'Sizing Threshold (%)',
                        min: 0,
                        max: 200,
                        description: 'Threshold for size variation warnings'
                    },
                    'advanced.strictMode': {
                        type: 'checkbox',
                        label: 'Strict Mode',
                        description: 'Enable strict validation mode'
                    },
                    'advanced.enableAuditLog': {
                        type: 'checkbox',
                        label: 'Enable Audit Log',
                        description: 'Track all translation changes'
                    },
                    'advanced.backupBeforeChanges': {
                        type: 'checkbox',
                        label: 'Backup Before Changes',
                        description: 'Create backups before modifications'
                    }
                }
            }
        };
    }
}

// Export singleton instance
module.exports = new SettingsManager();