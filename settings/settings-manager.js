/**
 * Settings Manager
 * Central configuration management for i18n toolkit
 * Handles loading, saving, and managing all settings with backup support
 */

const fs = require('fs');
const path = require('path');

class SettingsManager {
    constructor() {
        const projectRoot = process.cwd();
        this.configDir = path.join(projectRoot, '.i18ntk');
        this.configFile = path.join(this.configDir, 'config.json');
        this.lastBackupTime = 0;
        this.backupDebounceMs = 5000; // 5 seconds debounce
        this.settings = {};
        
        // Ensure config directory exists
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
        
        this.defaultConfig = {
            // Basic settings
            language: 'en',
            uiLanguage: 'en',
            theme: 'light',
            
            // Directory settings - use absolute paths based on package directory
            projectRoot: '.',
            sourceDir: './locales',
            i18nDir: './locales',
            outputDir: './i18ntk-reports',
            uiLocalesDir: path.join(__dirname, '..', 'ui-locales'),
            
            // Script-specific directory overrides
            scriptDirectories: {
                init: null,
                analyze: null,
                validate: null,
                usage: null,
                sizing: null,
                summary: null,
                complete: null,
                manage: null
            },
            
            // Processing settings
            processing: {
                batchSize: 100,
                concurrency: 4,
                maxFileSize: 10 * 1024 * 1024, // 10MB
                timeout: 30000, // 30 seconds
                retryAttempts: 3,
                retryDelay: 1000,
                cacheEnabled: true,
                cacheTTL: 3600000, // 1 hour
                validateOnSave: true,
                autoBackup: true
            },
            
            // Report settings
            reports: {
                format: 'json',
                includeStats: true,
                includeMissingKeys: true,
                includeUnusedKeys: true,
                includeUsageStats: true,
                includeValidationErrors: true,
                outputFormat: 'both', // json, html, both
                generateSummary: true,
                generateDetailed: true,
                saveToFile: true,
                filenameTemplate: 'i18n-report-{timestamp}'
            },
            
            // UI preferences
            ui: {
                showProgress: true,
                showDetailedOutput: false,
                colorOutput: true,
                interactive: true,
                confirmActions: true,
                autoSave: true,
                autoLoad: true
            },
            
            // Behavior settings
            behavior: {
                autoDetectLanguage: true,
                strictMode: false,
                caseSensitive: true,
                ignoreComments: false,
                ignoreWhitespace: true,
                normalizeKeys: true,
                validateOnStartup: false
            },
            
            // Notification settings
            notifications: {
                enabled: true,
                types: {
                    success: true,
                    warning: true,
                    error: true,
                    info: true
                },
                sound: false,
                desktop: false,
                webhook: null
            },
            
            // Date/time formatting
            dateTime: {
                format: 'YYYY-MM-DD HH:mm:ss',
                timezone: 'local',
                locale: 'en-US'
            },
            
            // Advanced settings
            advanced: {
                backupBeforeChanges: true,
                validateSettings: true,
                logLevel: 'info',
                performanceTracking: false,
                memoryLimit: 512, // MB
                enableExperimental: false
            },
            
            // Backup Settings
            backup: {
                enabled: false, // Default: false | Enable/disable automatic backups
                singleFileMode: false, // Default: false | Use single backup file when disabled
                singleBackupFile: 'i18ntk-central-backup.json', // Default: 'i18ntk-central-backup.json' | Single backup filename
                retentionDays: 30, // Default: 30 | Days to keep backup files
                maxBackups: 100 // Default: 100 | Maximum number of backup files to keep
            },
            
            // Security & Admin Settings
            security: {
                adminPinEnabled: false,
                adminPinPromptOnInit: false,
                keepAuthenticatedUntilExit: true,
                sessionTimeout: 30,
                maxFailedAttempts: 3,
                lockoutDuration: 15,
                enablePathValidation: true,
                maxFileSize: 10 * 1024 * 1024, // 10MB
                allowedExtensions: ['.json', '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'],
                notTranslatedMarker: '[NOT TRANSLATED]',
                excludeFiles: ['node_modules', '.git', 'dist', 'build'],
                strictMode: false,
                // PIN Protection Configuration
                pinProtection: {
                    enabled: true, // Master switch for PIN protection
                    protectedScripts: {
                        debugMenu: true,
                        deleteReports: true,
                        summaryReports: true,
                        settingsMenu: true,
                        init: false,
                        analyze: false,
                        validate: false,
                        complete: false,
                        manage: false,
                        sizing: false,
                        usage: false
                    }
                }
            },
            
            // Debug & Development Settings
            debug: {
                enabled: false, // Default: false | Enable debug mode
                showSecurityLogs: false, // Default: false | Show security console logs when debug mode is enabled
                verboseLogging: false, // Default: false | Enable verbose logging for debugging
                logLevel: 'info', // Default: 'info' | Options: 'error', 'warn', 'info', 'debug'
                saveDebugLogs: false, // Default: false | Save debug logs to file
                debugLogPath: './debug.log' // Default: './debug.log' | Path for debug log file
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
                this.settings = this.mergeWithDefaults(loadedSettings);
                return this.settings;
            }
        } catch (error) {
            console.error('Error loading settings:', error.message);
        }
        this.settings = { ...this.defaultConfig };
        return this.settings;
    }

    /**
     * Merge loaded settings with defaults to ensure all properties exist
     * @param {object} loadedSettings - Settings loaded from file
     * @returns {object} Merged settings
     */
    mergeWithDefaults(loadedSettings) {
        const merged = { ...this.defaultConfig, ...loadedSettings };
        
        // Ensure nested objects are properly merged
        if (loadedSettings.notifications) {
            merged.notifications = { 
                ...this.defaultConfig.notifications, 
                ...loadedSettings.notifications,
                types: {
                    ...this.defaultConfig.notifications.types,
                    ...(loadedSettings.notifications.types || {})
                }
            };
        }
        
        if (loadedSettings.processing) {
            merged.processing = { ...this.defaultConfig.processing, ...loadedSettings.processing };
        }
        
        if (loadedSettings.advanced) {
            merged.advanced = { ...this.defaultConfig.advanced, ...loadedSettings.advanced };
        }
        
        if (loadedSettings.scriptDirectories) {
            merged.scriptDirectories = { 
                ...this.defaultConfig.scriptDirectories, 
                ...loadedSettings.scriptDirectories 
            };
        }
        
        if (loadedSettings.security?.pinProtection) {
            merged.security.pinProtection = {
                ...this.defaultConfig.security.pinProtection,
                ...loadedSettings.security.pinProtection,
                protectedScripts: {
                    ...this.defaultConfig.security.pinProtection.protectedScripts,
                    ...(loadedSettings.security.pinProtection.protectedScripts || {})
                }
            };
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
            
            // Check if settings have actually changed before creating backup
            const currentSettingsStr = JSON.stringify(this.settings);
            const newSettingsStr = JSON.stringify(settingsToSave);
            const hasChanges = currentSettingsStr !== newSettingsStr;
            
            // Only create backup if settings have changed and backup is enabled
            if (hasChanges && settingsToSave.advanced?.backupBeforeChanges) {
                this.createBackup();
            }
            
            // Skip saving if no changes
            if (!hasChanges) {
                return true;
            }
            
            fs.writeFileSync(this.configFile, JSON.stringify(settingsToSave, null, 2), 'utf8');
            this.settings = settingsToSave;
            return true;
        } catch (error) {
            console.error('Error saving settings:', error.message);
            return false;
        }
    }

    /**
     * Get current settings
     * @returns {object} Current settings
     */
    getAllSettings() {
        return { ...this.settings };
    }

    /**
     * Update directory settings globally
     * @param {object} directorySettings - Object containing directory settings to update
     * @returns {boolean} Success status
     */
    updateDirectorySettings(directorySettings) {
        try {
            const allowedKeys = ['projectRoot', 'sourceDir', 'i18nDir', 'outputDir', 'uiLocalesDir'];
            const updates = {};
            
            for (const [key, value] of Object.entries(directorySettings)) {
                if (allowedKeys.includes(key) && typeof value === 'string') {
                    updates[key] = value;
                }
            }
            
            if (Object.keys(updates).length > 0) {
                const newSettings = { ...this.settings, ...updates };
                return this.saveSettings(newSettings);
            }
            
            return true;
        } catch (error) {
            console.error('Error updating directory settings:', error.message);
            return false;
        }
    }

    /**
     * Get directory settings for validation
     * @returns {object} Directory settings
     */
    getDirectorySettings() {
        return {
            projectRoot: this.settings.projectRoot,
            sourceDir: this.settings.sourceDir,
            i18nDir: this.settings.i18nDir,
            outputDir: this.settings.outputDir,
            uiLocalesDir: this.settings.uiLocalesDir
        };
    }

    /**
     * Get specific setting value
     * @param {string} keyPath - Dot-separated key path (e.g., 'backup.enabled')
     * @param {*} defaultValue - Default value to return if key not found
     * @returns {*} Setting value
     */
    getSetting(keyPath, defaultValue = null) {
        const keys = keyPath.split('.');
        let value = this.settings;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    }

    /**
     * Set specific setting value
     * @param {string} keyPath - Dot-separated key path
     * @param {*} value - Value to set
     * @returns {boolean} Success status
     */
    setSetting(keyPath, value) {
        try {
            // Create a deep copy of current settings to avoid modifying the original
            const newSettings = JSON.parse(JSON.stringify(this.settings));
            
            const keys = keyPath.split('.');
            const lastKey = keys.pop();
            let target = newSettings;
            
            // Navigate to the parent object
            for (const key of keys) {
                if (!(key in target) || typeof target[key] !== 'object') {
                    target[key] = {};
                }
                target = target[key];
            }
            
            target[lastKey] = value;
            return this.saveSettings(newSettings);
        } catch (error) {
            console.error('Error setting setting:', error.message);
            return false;
        }
    }

    /**
     * Reset settings to defaults
     * @returns {boolean} Success status
     */
    resetToDefaults() {
        try {
            // Deep clone to avoid retaining references to default objects
            this.settings = JSON.parse(JSON.stringify(this.defaultConfig));
            this.saveSettings();
            console.log('Settings reset to defaults');
            return true;
        } catch (error) {
            console.error('Error resetting to defaults:', error.message);
            return false;
        }
    }

    /**
     * Validate settings structure
     * @param {object} settings - Settings to validate
     * @returns {Array} Array of validation errors, empty if valid
     */
    validateSettings(settings) {
        const errors = [];
        
        try {
            // Basic validation - ensure it's an object
            if (!settings || typeof settings !== 'object') {
                errors.push('Settings must be an object');
                return errors;
            }
            
            // Validate required fields
            if (!settings.language) {
                errors.push('Language is required');
            }
            
            if (!settings.sourceDir) {
                errors.push('Source directory is required');
            }
            
            // Validate directory paths exist
            const sourceDir = path.resolve(settings.projectRoot || '.', settings.sourceDir || '');
            if (!fs.existsSync(sourceDir)) {
                errors.push(`Source directory does not exist: ${sourceDir}`);
            }
            
            if (settings.outputDir) {
                const outputDir = path.resolve(settings.projectRoot || '.', settings.outputDir);
                if (!fs.existsSync(outputDir)) {
                    try {
                        fs.mkdirSync(outputDir, { recursive: true });
                    } catch (error) {
                        errors.push(`Cannot create output directory: ${outputDir}`);
                    }
                }
            }
            
            return errors;
        } catch (error) {
            errors.push(`Error validating settings: ${error.message}`);
            return errors;
        }
    }

    /**
     * Create a backup of current settings
     * @returns {boolean} Success status
     */
    createBackup() {
        try {
            // Check if backup system is enabled
            if (!this.settings.backup?.enabled) {
                return true;
            }
            
            // Debounce backup creation to prevent duplicates
            const now = Date.now();
            if (now - this.lastBackupTime < this.backupDebounceMs) {
                return true; // Skip if backup was created recently
            }
            this.lastBackupTime = now;
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = path.join(path.dirname(this.configFile), 'backups');
            
            // Ensure backup directory exists
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            const backupFile = path.join(backupDir, `${path.basename(this.configFile, '.json')}-backup-${timestamp}.json`);
            
            if (fs.existsSync(this.configFile)) {
                fs.copyFileSync(this.configFile, backupFile);
                console.log(`Backup created: ${path.relative(process.cwd(), backupFile)}`);
                
                // Clean up old backups after creating new one
                this.cleanupOldBackups();
            }
            
            return true;
        } catch (error) {
            console.error('Error creating backup:', error.message);
            return false;
        }
    }

    /**
     * Clean up old backup files based on retention settings
     */
    cleanupOldBackups() {
        try {
            const backupDir = path.join(path.dirname(this.configFile), 'backups');
            
            if (!fs.existsSync(backupDir)) {
                return;
            }
            
            const backupFiles = fs.readdirSync(backupDir)
                .filter(file => file.endsWith('.json') && file.includes('-backup-'))
                .map(file => ({
                    name: file,
                    path: path.join(backupDir, file),
                    created: fs.statSync(path.join(backupDir, file)).mtime
                }))
                .sort((a, b) => b.created - a.created);
            
            const maxBackups = this.settings.backup?.maxBackups || 100;
            const retentionDays = this.settings.backup?.retentionDays || 30;
            
            // Filter by retention days
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
            
            const filesToDelete = backupFiles.filter(file => 
                file.created < cutoffDate || backupFiles.indexOf(file) >= maxBackups
            );
            
            if (filesToDelete.length > 0) {
                console.log(`\n⚠️  Found ${backupFiles.length} backup files. Cleaning up old backups...`);
                console.log(`Keeping ${Math.min(maxBackups, backupFiles.length)} most recent backups within ${retentionDays} days.`);
                
                filesToDelete.forEach(file => {
                    try {
                        fs.unlinkSync(file.path);
                        console.log(`Deleted old backup: ${file.name}`);
                    } catch (error) {
                        console.warn(`Could not delete backup ${file.name}: ${error.message}`);
                    }
                });
                
                console.log(`Cleanup completed. ${filesToDelete.length} old backup(s) removed.`);
            }
        } catch (error) {
            console.warn('Error during backup cleanup:', error.message);
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
     * Set security settings
     * @param {Object} securitySettings - Security settings object
     */
    setSecurity(securitySettings) {
        if (typeof securitySettings !== 'object' || securitySettings === null) {
            throw new Error('Security settings must be an object');
        }
        
        this.settings.security = { ...this.settings.security, ...securitySettings };
        this.saveSettings();
    }

    /**
     * Set debug settings
     * @param {Object} debugSettings - Debug settings object
     */
    setDebug(debugSettings) {
        if (typeof debugSettings !== 'object' || debugSettings === null) {
            throw new Error('Debug settings must be an object');
        }
        
        this.settings.debug = { ...this.settings.debug, ...debugSettings };
        this.saveSettings();
    }

    /**
     * Get security settings
     * @returns {Object} Security settings
     */
    getSecurity() {
        return this.settings.security || this.defaultConfig.security;
    }

    /**
     * Get debug settings
     * @returns {Object} Debug settings
     */
    getDebug() {
        return this.settings.debug || this.defaultConfig.debug;
    }

    /**
     * Check if admin PIN is enabled
     * @returns {boolean} True if admin PIN is enabled
     */
    isAdminPinEnabled() {
        return this.getSecurity().adminPinEnabled || false;
    }

    /**
     * Check if debug mode is enabled
     * @returns {boolean} True if debug mode is enabled
     */
    isDebugEnabled() {
        return this.getDebug().enabled || false;
    }

    /**
     * Check if security logs should be shown
     * @returns {boolean} True if security logs should be shown
     */
    shouldShowSecurityLogs() {
        const debug = this.getDebug();
        return debug.enabled && debug.showSecurityLogs;
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
                    projectRoot: {
                        type: 'text',
                        label: 'Project Root',
                        description: 'Root directory of your project (all other paths are relative to this)'
                    },
                    sourceDir: {
                        type: 'text',
                        label: 'Source Directory',
                        description: 'Directory containing translation files (relative to project root)'
                    },
                    i18nDir: {
                        type: 'text',
                        label: 'i18n Directory',
                        description: 'Directory for i18n files (relative to project root)'
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
                        description: 'Directory for generated reports (relative to project root)'
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
                        description: 'Number of files to process in each batch'
                    },
                    'advanced.concurrency': {
                        type: 'number',
                        label: 'Concurrency',
                        min: 1,
                        max: 8,
                        description: 'Number of concurrent processing threads'
                    },
                    'advanced.backupBeforeChanges': {
                        type: 'boolean',
                        label: 'Backup Before Changes',
                        description: 'Create backup before making changes to settings'
                    },
                    'advanced.validateSettings': {
                        type: 'boolean',
                        label: 'Validate Settings',
                        description: 'Validate settings on load and save'
                    }
                }
            }
        };
    }
}

// Create singleton instance
const settingsManager = new SettingsManager();

module.exports = settingsManager;