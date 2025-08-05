/**
 * Settings Manager Module
 * Handles loading, saving, and managing user configuration settings
 */

const fs = require('fs');
const path = require('path');

class SettingsManager {
    constructor() {
        this.configFile = path.join(__dirname, 'i18ntk-config.json');
        this.defaultConfig = {
            // UI Language Settings
            language: 'en', // Default: 'en' | Options: 'en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'
            
            // File Size Limits
            sizeLimit: null, // Default: null (no limit) | Example: 1048576 (1MB in bytes)
            
            // Directory Configuration
            sourceDir: './locales', // Default: './locales' | Example: './src/i18n/locales'
            sourceLanguage: 'en', // Default: 'en' | Recommended: Use your primary development language
            defaultLanguages: ['de', 'es', 'fr', 'ru'], // Default target languages | Example: ['de', 'es', 'fr', 'ru', 'ja', 'zh']
            outputDir: './i18ntk-reports', // Default: './i18ntk-reports' | Example: './reports/i18n'
            
            // Per-Script Directory Configuration (optional overrides)
            scriptDirectories: {
                analyze: null,      // Custom sourceDir for i18ntk-analyze.js
                init: null,         // Custom sourceDir for i18ntk-init.js
                validate: null,     // Custom sourceDir for i18ntk-validate.js
                complete: null,     // Custom sourceDir for i18ntk-complete.js
                manage: null,       // Custom sourceDir for i18ntk-manage.js
                summary: null,      // Custom sourceDir for i18ntk-summary.js
                usage: null,        // Custom sourceDir for i18ntk-usage.js
                sizing: null        // Custom sourceDir for i18ntk-sizing.js
            },
            
            // Report Settings
            reportLanguage: 'auto', // Default: 'auto' (matches UI language) | Options: 'auto', 'en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'
            
            // UI Preferences
            theme: 'light', // Default: 'light' | Options: 'light', 'dark'
            
            // Behavior Settings
            autoSave: true, // Default: true | Automatically save settings changes

            
            
            // Notification Settings
            notifications: {
                enabled: true, // Default: true | Enable/disable all notifications
                types: {
                    success: true, // Show success notifications (e.g., "Translation completed")
                    warnings: true, // Show warning notifications (e.g., "Missing translations found")
                    errors: true, // Show error notifications (e.g., "File not found")
                    progress: true // Show progress notifications during long operations
                },
                sound: false, // Default: false | Play notification sounds
                desktop: false // Default: false | Show desktop notifications (requires permission)
            },
            
            
            // Date and Time Formatting
            dateFormat: 'DD/MM/YYYY', // Default: 'DD/MM/YYYY' | Options: 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD.MM.YYYY'
            timeFormat: '24h', // Default: '24h' | Options: '24h', '12h'
            timezone: 'auto', // Default: 'auto' (system timezone) | Example: 'UTC', 'Europe/London', 'America/New_York'
            
            // Processing Settings
            processing: {
                notTranslatedMarker: 'NOT_TRANSLATED', // Default marker for untranslated content
                excludeFiles: ['.DS_Store', 'Thumbs.db', '*.tmp',], // Files to ignore during processing
                excludeDirs: ['node_modules', '.next', '.git', 'dist', 'build'], // Directories to ignore
                includeExtensions: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'], // File extensions to scan
                strictMode: false, // Default: false | Enable strict validation (fails on warnings)
                defaultLanguages: ['de', 'es', 'fr', 'ru'], // Languages to create when initializing
                translationPatterns: [ // Patterns to detect translation keys in code
                    /t\(['"`]([^'"`]+)['"`]\)/g, // t('key')
                    /\$t\(['"`]([^'"`]+)['"`]\)/g, // $t('key')
                    /i18n\.t\(['"`]([^'"`]+)['"`]\)/g // i18n.t('key')
                ]
            },
            
            // Advanced Performance Settings
            advanced: {
                batchSize: 100, // Default: 100 | Recommended: 50-200 | Number of items processed per batch
                maxConcurrentFiles: 10, // Default: 10 | Recommended: 5-20 | Maximum files processed simultaneously
                enableProgressBars: true, // Default: true | Show progress bars for long operations
                enableColorOutput: true, // Default: true | Use colored console output
                strictMode: false, // Default: false | Enable strict validation mode
                enableAuditLog: false, // Default: false | Track all translation changes (creates audit.log)
                backupBeforeChanges: true, // Default: true | Create backups before modifications
                validateOnSave: true, // Default: true | Auto-validate translations after saving
                sizingThreshold: 50, // Default: 50% | Threshold for size variation warnings
                sizingFormat: 'table', // Default: 'table' | Options: 'table', 'json', 'csv'
                memoryLimit: '512MB', // Default: '512MB' | Memory limit for large file processing
                timeout: 30000 // Default: 30000ms (30s) | Timeout for individual operations
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
                return this.mergeWithDefaults(loadedSettings);
            }
        } catch (error) {
            console.error('Error loading settings:', error.message);
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
            
            // Create backup if enabled
            if (settingsToSave.advanced?.backupBeforeChanges) {
                this.createBackup();
            }
            
            fs.writeFileSync(this.configFile, JSON.stringify(settingsToSave, null, 2), 'utf8');
            this.settings = settingsToSave;
            return true;
        } catch (error) {
            const { loadTranslations, t } = require('../utils/i18n-helper');
            loadTranslations('en');
            console.error(t('settings.saveError'), error.message);
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
            console.error('Error setting value:', error.message);
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
                    console.error(`Missing required setting: ${prop}`);
                    return false;
                }
            }
            
            // Validate language codes
            const validLanguages = ['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'];
            if (!validLanguages.includes(settings.language)) {
                console.error(`Invalid language: ${settings.language}`);
                return false;
            }
            
            if (!validLanguages.includes(settings.sourceLanguage)) {
                console.error(`Invalid source language: ${settings.sourceLanguage}`);
                return false;
            }
            
            // Validate arrays
            if (!Array.isArray(settings.defaultLanguages)) {
                console.error('Default languages must be an array');
                return false;
            }
            
            // Validate date format
            const validDateFormats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD.MM.YYYY'];
            if (settings.dateFormat && !validDateFormats.includes(settings.dateFormat)) {
                console.error(`Invalid date format: ${settings.dateFormat}. Valid formats: ${validDateFormats.join(', ')}`);
                return false;
            }
            
            // Validate time format
            const validTimeFormats = ['24h', '12h'];
            if (settings.timeFormat && !validTimeFormats.includes(settings.timeFormat)) {
                console.error(`Invalid time format: ${settings.timeFormat}. Valid formats: ${validTimeFormats.join(', ')}`);
                return false;
            }
            
            // Validate notifications settings
            if (settings.notifications && typeof settings.notifications === 'object') {
                if (settings.notifications.types && typeof settings.notifications.types !== 'object') {
                    console.error('Notifications types must be an object');
                    return false;
                }
            }
            
            // Validate processing settings
            if (settings.processing && typeof settings.processing === 'object') {
                const processing = settings.processing;
                
                if (processing.excludeFiles && !Array.isArray(processing.excludeFiles)) {
                    console.error('Exclude files must be an array');
                    return false;
                }
                
                if (processing.excludeDirs && !Array.isArray(processing.excludeDirs)) {
                    console.error('Exclude directories must be an array');
                    return false;
                }
                
                if (processing.includeExtensions && !Array.isArray(processing.includeExtensions)) {
                    console.error('Include extensions must be an array');
                    return false;
                }
            }
            
            // Validate advanced settings if present
            if (settings.advanced) {
                const advanced = settings.advanced;
                
                if (advanced.batchSize && (typeof advanced.batchSize !== 'number' || advanced.batchSize < 1)) {
                    console.error('Invalid batch size: must be a positive number');
                    return false;
                }
                
                if (advanced.maxConcurrentFiles && (typeof advanced.maxConcurrentFiles !== 'number' || advanced.maxConcurrentFiles < 1)) {
                    console.error('Invalid max concurrent files: must be a positive number');
                    return false;
                }
                
                if (advanced.sizingThreshold && (typeof advanced.sizingThreshold !== 'number' || advanced.sizingThreshold < 0)) {
                    console.error('Invalid sizing threshold: must be a non-negative number');
                    return false;
                }
                
                if (advanced.timeout && (typeof advanced.timeout !== 'number' || advanced.timeout < 1000)) {
                    console.error('Invalid timeout: must be at least 1000ms');
                    return false;
                }
                
                const validSizingFormats = ['table', 'json', 'csv'];
                if (advanced.sizingFormat && !validSizingFormats.includes(advanced.sizingFormat)) {
                    console.error(`Invalid sizing format: ${advanced.sizingFormat}. Valid formats: ${validSizingFormats.join(', ')}`);
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error validating settings:', error.message);
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
            const backupDir = path.join(path.dirname(this.configFile), 'backups');
            
            // Ensure backup directory exists
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            const backupFile = path.join(backupDir, `${path.basename(this.configFile, '.json')}-backup-${timestamp}.json`);
            
            if (fs.existsSync(this.configFile)) {
                fs.copyFileSync(this.configFile, backupFile);
                console.log(`Backup created: ${path.relative(process.cwd(), backupFile)}`);
            }
            
            return true;
        } catch (error) {
            console.error('Error creating backup:', error.message);
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

    /**
     * Set UI language
     * @param {string} language - Language code (e.g., 'en', 'de', 'fr')
     */
    setLanguage(language) {
        if (typeof language !== 'string' || language.length === 0) {
            throw new Error('Language must be a non-empty string');
        }
        
        const availableLanguages = this.getAvailableLanguages().map(lang => lang.code);
        if (!availableLanguages.includes(language)) {
            throw new Error(`Language not supported: ${language}. Available languages: ${availableLanguages.join(', ')}`);
        }
        
        this.settings.language = language;
        this.saveSettings();
        
        const { loadTranslations, t } = require('../utils/i18n-helper');
        loadTranslations(language);
        console.log(t('settings.languageSet', { language }));
    }
}

// Export singleton instance
module.exports = new SettingsManager();