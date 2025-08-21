const fs = require('fs');
const SecurityUtils = require('../utils/security');
const path = require('path');
const os = require('os');
const { I18nError } = require('../utils/i18n-helper');

class SettingsManager {
    constructor() {
        // Always use project config as the single source of truth
        this.configDir = process.cwd();
        this.configFile = path.join(this.configDir, 'i18ntk-config.json');
        this.backupDir = path.join(this.configDir, 'backups');
        
        // Package config template for reference
        this.packageConfigFile = path.join(__dirname, 'i18ntk-config.json');
        
        this.defaultConfig = {
            "version": "1.9.1",
            "language": "en",
            "uiLanguage": "en",
            "theme": "dark",
            "projectRoot": process.cwd(),
            "sourceDir": "./locales",
            "i18nDir": "./i18n",
            "outputDir": "./i18ntk-reports",
            "framework": {
                "preference": "auto", // auto | vanilla | react | vue | angular | svelte | i18next | nuxt | next
                "fallback": "vanilla",
                "detect": true,
                "supported": ["react", "vue", "angular", "svelte", "i18next", "nuxt", "next", "vanilla"]
            },
            "scriptDirectories": {
                "main": "./main",
                "utils": "./utils",
                "scripts": "./scripts",
                "settings": "./settings",
                "uiLocales": "./ui-locales"
            },
            "processing": {
                "mode": "extreme",
                "cacheEnabled": true,
                "batchSize": 1000,
                "maxWorkers": 4,
                "timeout": 30000,
                "retryAttempts": 3,
                "parallelProcessing": true,
                "memoryOptimization": true,
                "compression": true
            },
            "reports": {
                "format": "json",
                "includeSource": false,
                "includeStats": true,
                "includeRecommendations": true,
                "includeSecurity": true,
                "includePerformance": true,
                "saveToFile": true,
                "fileName": "i18n-report-[timestamp].json",
                "outputPath": "./i18ntk-reports",
                "compress": true
            },
            "ui": {
                "showProgress": true,
                "showColors": true,
                "showTimestamps": true,
                "showTips": true,
                "showWarnings": true,
                "showErrors": true,
                "interactive": true,
                "confirmActions": true,
                "autoComplete": true,
                "syntaxHighlighting": true
            },
            "behavior": {
                "autoSave": true,
                "autoBackup": true,
                "backupFrequency": "weekly",
                "maxBackups": 10,
                "confirmDestructive": true,
                "validateOnSave": true,
                "formatOnSave": true,
                "lintOnSave": true,
                "autoFix": false,
                "strictMode": false,
                "devMode": false
            },
            "notifications": {
                "enabled": true,
                "desktop": true,
                "sound": false,
                "types": {
                    "success": true,
                    "warning": true,
                    "error": true,
                    "info": true,
                    "debug": false
                },
                "timeout": 5000,
                "maxNotifications": 5
            },
            "dateTime": {
                "timezone": "auto",
                "format": "YYYY-MM-DD HH:mm:ss",
                "locale": "en-US",
                "dateFormat": "YYYY-MM-DD",
                "timeFormat": "HH:mm:ss",
                "use24Hour": true,
                "showTimezone": false
            },
            "advanced": {
                "debugMode": false,
                "verboseLogging": false,
                "performanceTracking": true,
                "memoryProfiling": false,
                "stackTraces": false,
                "experimentalFeatures": false,
                "customExtractors": [],
                "customValidators": [],
                "customFormatters": []
            },
            "backup": {
                "enabled": true,
                "location": "./backups",
                "frequency": "daily",
                "retention": 7,
                "compression": true,
                "encryption": true,
                "autoCleanup": true,
                "maxSize": "100MB",
                "includeReports": true,
                "includeLogs": true
            },
            "security": {
                "enabled": true,
                "adminPinEnabled": false,
                "sessionTimeout": 1800000,
                "maxFailedAttempts": 3,
                "lockoutDuration": 300000,
                "encryption": {
                    "enabled": true,
                    "algorithm": "aes-256-gcm",
                    "keyDerivation": "pbkdf2",
                    "iterations": 100000
                },
                "pinProtection": {
                    "enabled": false,
                    "pin": null,
                    "protectedScripts": {
                        "init": false,
                        "analyze": false,
                        "validate": false,
                        "fix": false,
                        "manage": true,
                        "settings": true,
                        "admin": true
                    }
                },
                "auditLog": true,
                "sanitizeInput": true,
                "validatePaths": true,
                "restrictAccess": false
            },
            "debug": {
                "enabled": false,
                "logLevel": "info",
                "logFile": "./i18ntk-debug.log",
                "maxFileSize": "10MB",
                "maxFiles": 5,
                "includeStackTrace": false,
                "includeMemoryUsage": false,
                "performanceMetrics": false
            },
            "setupDone": false,
            "sizeLimit": null,
            "placeholderStyles": {
                "en": [
                    "\\\\{\\\\{[^}]+\\\\}\\\\}",
                    "%\\\\{[^}]+\\\\}",
                    "%[sdif]",
                    "\\\\$\\\\{[^}]+\\\\}",
                    "\\\\$[a-zA-Z_][a-zA-Z0-9_]*",
                    "__\\\\w+__",
                    "\\\\{\\\\w+\\\\}",
                    "\\\\[\\\\[\\\\w+\\\\]\\\\]",
                    "\\\\{\\\\{t\\\\s+['\"][^'\"]*['\"]\\\\}\\\\}",
                    "t\\\\(['\"][^'\"]*['\"]",
                    "i18n\\\\.t\\\\(['\"][^'\"]*['\"]"
                ],
                "de": [
                    "%\\\\{[^}]+\\\\}",
                    "%[sdif]",
                    "\\\\$\\\\{[^}]+\\\\}",
                    "\\\\$[a-zA-Z_][a-zA-Z0-9_]*",
                    "__\\\\w+__",
                    "\\\\{\\\\w+\\\\}",
                    "\\\\[\\\\[\\\\w+\\\\]\\\\]",
                    "\\\\{\\\\{[^}]+\\\\}\\\\}"
                ],
                "es": [
                    "%\\\\{[^}]+\\\\}",
                    "%[sdif]",
                    "\\\\$\\\\{[^}]+\\\\}",
                    "\\\\$[a-zA-Z_][a-zA-Z0-9_]*",
                    "__\\\\w+__",
                    "\\\\{\\\\w+\\\\}",
                    "\\\\[\\\\[\\\\w+\\\\]\\\\]",
                    "\\\\{\\\\{[^}]+\\\\}\\\\}"
                ],
                "fr": [
                    "%\\\\{[^}]+\\\\}",
                    "%[sdif]",
                    "\\\\$\\\\{[^}]+\\\\}",
                    "\\\\$[a-zA-Z_][a-zA-Z0-9_]*",
                    "__\\\\w+__",
                    "\\\\{\\\\w+\\\\}",
                    "\\\\[\\\\[\\\\w+\\\\]\\\\]",
                    "\\\\{\\\\{[^}]+\\\\}\\\\}",
                    "\\\\{\\\\d+\\\\}"
                ],
                "ru": [
                    "%\\\\{[^}]+\\\\}",
                    "%[sdif]",
                    "\\\\$\\\\{[^}]+\\\\}",
                    "\\\\$[a-zA-Z_][a-zA-Z0-9_]*",
                    "__\\\\w+__",
                    "\\\\{\\\\w+\\\\}",
                    "\\\\[\\\\[\\\\w+\\\\]\\\\]",
                    "\\\\{\\\\{[^}]+\\\\}\\\\}",
                    "\\\\{\\\\d+\\\\}"
                ],
                "zh": [
                    "%\\\\{[^}]+\\\\}",
                    "%[sdif]",
                    "\\\\$\\\\{[^}]+\\\\}",
                    "\\\\$[a-zA-Z_][a-zA-Z0-9_]*",
                    "__\\\\w+__",
                    "\\\\{\\\\w+\\\\}",
                    "\\\\[\\\\[\\\\w+\\\\]\\\\]",
                    "\\\\{\\\\{[^}]+\\\\}\\\\}",
                    "\\\\{\\\\d+\\\\}"
                ],
                "ja": [
                    "%\\\\{[^}]+\\\\}",
                    "%[sdif]",
                    "\\\\$\\\\{[^}]+\\\\}",
                    "\\\\$[a-zA-Z_][a-zA-Z0-9_]*",
                    "__\\\\w+__",
                    "\\\\{\\\\w+\\\\}",
                    "\\\\[\\\\[\\\\w+\\\\]\\\\]",
                    "\\\\{\\\\{[^}]+\\\\}\\\\}",
                    "\\\\{\\\\d+\\\\}"
                ],
                "universal": [
                    "\\\\{\\\\{[^}]+\\\\}\\\\}",
                    "%\\\\{[^}]+\\\\}",
                    "%[sdif]",
                    "\\\\$\\\\{[^}]+\\\\}",
                    "\\\\$[a-zA-Z_][a-zA-Z0-9_]*",
                    "__\\\\w+__",
                    "\\\\{\\\\w+\\\\}",
                    "\\\\[\\\\[\\\\w+\\\\]\\\\]",
                    "\\\\{\\\\d+\\\\}",
                    "\\\\{\\\\d*\\\\}"
                ],
                "frameworks": {
                    "react": [
                        "\\\\{\\\\{[^}]+\\\\}\\\\}",
                        "\\\\$\\\\{[^}]+\\\\}",
                        "t\\\\(['\"][^'\"]*['\"]",
                        "i18n\\\\.t\\\\(['\"][^'\"]*['\"]",
                        "useTranslation\\\\s*\\\\([^)]*\\\\)",
                        "<Trans[^>]*>.*?</Trans>"
                    ],
                    "vue": [
                        "\\\\$t\\\\(['\"][^'\"]*['\"]",
                        "\\\\$tc\\\\(['\"][^'\"]*['\"]",
                        "\\\\{\\\\{\\\\$t\\\\([^)]+\\\\)\\\\}\\\\}",
                        "v-t=['\"][^'\"]*['\"]"
                    ],
                    "angular": [
                        "'[^']*'\\\\s*\\\\|\\\\s*translate",
                        "\\\\{[^}]*'[^']*'\\\\s*\\\\|\\\\s*translate[^}]*\\\\}",
                        "translate\\\\s*:\\s*['\"][^'\"]*['\"]"
                    ],
                    "nextjs": [
                        "t\\\\(['\"][^'\"]*['\"]",
                        "router\\\\.locale",
                        "useTranslation\\\\s*\\\\([^)]*\\\\)",
                        "getStaticProps\\\\s*\\\\([^)]*\\\\)",
                        "getServerSideProps\\\\s*\\\\([^)]*\\\\)"
                    ]
                }
            },
            "framework": {
                "detected": false,
                "preference": "none",
                "prompt": "always",
                "lastPromptedVersion": null
            }
        };
        
        // Defer loading settings until first access
        this._settings = null;
        this._loaded = false;
    }

    /**
     * Load settings from file or return default settings
     * @returns {object} Settings object
     */
    loadSettings() {
        if (this._loaded && this._settings !== null) {
            return this._settings;
        }
        
        try {
            if (SecurityUtils.safeExistsSync(this.configFile)) {
                const content = SecurityUtils.safeReadFileSync(this.configFile, 'utf8');
                const loadedSettings = JSON.parse(content);
                // Merge with defaults to ensure all properties exist
                this._settings = this.mergeWithDefaults(loadedSettings);
                this._loaded = true;
                return this._settings;
            }
        } catch (error) {
            console.error('Error loading settings:', error.message);
        }
        
        // If file doesn't exist, check for package template first
        let baseConfig = { ...this.defaultConfig };
        try {
            if (SecurityUtils.safeExistsSync(this.packageConfigFile)) {
                const packageContent = SecurityUtils.safeReadFileSync(this.packageConfigFile, 'utf8');
                const packageSettings = JSON.parse(packageContent);
                baseConfig = this.mergeWithDefaults(packageSettings);
            }
        } catch (error) {
            // Fall back to defaultConfig if package config is invalid
            console.warn('Could not load package template, using defaults');
        }
        
        // Create project config with base settings
        this._settings = baseConfig;
        this._loaded = true;
        // Save after marking as loaded to prevent re-entry
        this.saveSettings(this._settings);
        return this._settings;        return this._settings;
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
     * @param {object} settings - Settings to save
     */
    async saveSettings(settings = null) {
        if (settings) {
            this._settings = settings;
        }
        
        try {
            if (!await SecurityUtils.safeExistsSecure(this.configDir)) {
                await SecurityUtils.safeMkdirSecure(this.configDir, process.cwd(), { recursive: true });
            }
            
            const content = JSON.stringify(this._settings, null, 4);
            await SecurityUtils.safeWriteFileSecure(this.configFile, content, process.cwd());
            
            // Create backup if enabled
            if (this._settings.backup?.enabled) {
                this.createBackup();
            }
            
            if (process.env.I18N_DEBUG === 'true') {
                console.log('Settings saved successfully');
            }
        } catch (error) {
            console.error('Error saving settings:', error.message);
            console.error('Error stack:', error.stack);
        }
    }

    /**
     * Create backup of current settings
     */
    createBackup() {
        try {
            if (!SecurityUtils.safeExistsSync(this.backupDir)) {
                SecurityUtils.safeMkdirSync(this.backupDir, process.cwd(), { recursive: true });
            }
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(this.backupDir, `config-${timestamp}.json`);
            
            const configContent = SecurityUtils.safeReadFileSync(this.configFile);
            if (configContent) {
                SecurityUtils.safeWriteFileSync(backupFile, configContent, process.cwd());
            }
            
            // Clean old backups
            this.cleanupOldBackups();
        } catch (error) {
            console.error('Error creating backup:', error.message);
        }
    }

    /**
     * Clean old backup files
     */
    cleanupOldBackups() {
        try {
            // Ensure settings are loaded
            const settings = this.loadSettings();
            
            // Validate backup directory path
            if (!this.backupDir || typeof this.backupDir !== 'string') {
                console.warn('Invalid backup directory path, skipping cleanup');
                return;
            }
            
            // Ensure settings.backup exists
            if (!settings.backup) {
                console.warn('Backup settings not found, skipping cleanup');
                return;
            }
            
            const validatedBackupDir = SecurityUtils.sanitizePath(this.backupDir, process.cwd());
        // Ensure the backup directory is within the project root
        const projectRoot = process.cwd();
        const resolvedBackupDir = path.resolve(projectRoot, validatedBackupDir);
        if (!validatedBackupDir || 
            !resolvedBackupDir.startsWith(projectRoot) ||
            !SecurityUtils.safeExistsSync(validatedBackupDir)) {
             return;
        }
            
            const files = SecurityUtils.safeReaddirSync(validatedBackupDir)
                .filter(file => file.startsWith('config-') && file.endsWith('.json'))
                .map(file => {
                    const filePath = path.join(validatedBackupDir, file);
                    const stat = SecurityUtils.safeStatSync(filePath);
                    return {
                        name: file,
                        path: filePath,
                        mtime: stat ? stat.mtime : new Date(0)
                    };
                })
                .filter(file => file.mtime.getTime() > 0);
            
            const retentionDays = settings.backup.retention || 7;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
            
            const filesToDelete = files.filter(file => file.mtime < cutoffDate);
            filesToDelete.forEach(file => {
                SecurityUtils.safeDeleteSync(file.path);
            });
        } catch (error) {
            console.error('Error cleaning backups:', error.message);
        }
    }

    /**
     * Reset settings to defaults
     */
    resetToDefaults() {
        this.settings = { ...this.defaultConfig };
        this.saveSettings();
        console.log('Settings reset to defaults');
    }

    /**
     * Get current settings
     * @returns {object} Current settings
     */
    getSettings() {
        return this.loadSettings();
    }

    /**
     * Get default settings
     * @returns {object} Default settings
     */
    getDefaultSettings() {
        return this.defaultConfig;
    }

    /**
     * Get settings schema structure
     * @returns {object} Simple schema based on default configuration
     */
    getSettingsSchema() {
        return { properties: this.defaultConfig };
    }

    /**
     * Get enhanced settings schema with validation rules
     * @returns {object} Enhanced schema with validation rules and descriptions
     */
    getEnhancedSettingsSchema() {
        return {
            type: 'object',
            properties: {
                version: {
                    type: 'string',
                    description: 'Configuration version',
                    default: '1.9.1',
                    readOnly: true
                },
                language: {
                    type: 'string',
                    description: 'Default language for translations',
                    enum: ['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'],
                    default: 'en'
                },
                uiLanguage: {
                    type: 'string',
                    description: 'UI language for toolkit interface',
                    enum: ['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'],
                    default: 'en'
                },
                theme: {
                    type: 'string',
                    description: 'UI theme preference',
                    enum: ['dark', 'light', 'auto'],
                    default: 'dark'
                },
                projectRoot: {
                    type: 'string',
                    description: 'Root directory of the project',
                    default: process.cwd()
                },
                sourceDir: {
                    type: 'string',
                    description: 'Directory containing translation files',
                    default: './locales'
                },
                i18nDir: {
                    type: 'string',
                    description: 'Directory for i18n configuration files',
                    default: './i18n'
                },
                outputDir: {
                    type: 'string',
                    description: 'Directory for generated reports',
                    default: './i18ntk-reports'
                },
                framework: {
                    type: 'object',
                    description: 'Framework preference and detection settings',
                    properties: {
                        preference: {
                            type: 'string',
                            description: 'Preferred framework to use. auto tries to detect.',
                            enum: ['auto', 'vanilla', 'react', 'vue', 'angular', 'svelte', 'i18next', 'nuxt', 'next'],
                            default: 'auto'
                        },
                        fallback: {
                            type: 'string',
                            description: 'Framework to use when detection finds nothing',
                            enum: ['vanilla', 'react', 'vue', 'angular', 'svelte', 'i18next', 'nuxt', 'next'],
                            default: 'vanilla'
                        },
                        detect: {
                            type: 'boolean',
                            description: 'Enable automatic framework detection',
                            default: true
                        },
                        supported: {
                            type: 'array',
                            description: 'List of supported frameworks for hints/UI',
                            items: { type: 'string' },
                            default: ['react', 'vue', 'angular', 'svelte', 'i18next', 'nuxt', 'next', 'vanilla']
                        }
                    }
                },
                processing: {
                    type: 'object',
                    properties: {
                        mode: {
                            type: 'string',
                            description: 'Processing performance mode',
                            enum: ['ultra-extreme', 'extreme', 'ultra', 'optimized'],
                            default: 'extreme'
                        },
                        cacheEnabled: {
                            type: 'boolean',
                            description: 'Enable caching for better performance',
                            default: true
                        },
                        batchSize: {
                            type: 'number',
                            description: 'Number of items to process in each batch',
                            minimum: 100,
                            maximum: 10000,
                            default: 1000
                        },
                        maxWorkers: {
                            type: 'number',
                            description: 'Maximum number of worker processes',
                            minimum: 1,
                            maximum: 16,
                            default: 4
                        },
                        timeout: {
                            type: 'number',
                            description: 'Timeout for processing operations in milliseconds',
                            minimum: 1000,
                            maximum: 300000,
                            default: 30000
                        },
                        retryAttempts: {
                            type: 'number',
                            description: 'Number of retry attempts for failed operations',
                            minimum: 0,
                            maximum: 10,
                            default: 3
                        },
                        parallelProcessing: {
                            type: 'boolean',
                            description: 'Enable parallel processing for better performance',
                            default: true
                        },
                        memoryOptimization: {
                            type: 'boolean',
                            description: 'Enable memory optimization for large datasets',
                            default: true
                        },
                        compression: {
                            type: 'boolean',
                            description: 'Enable compression for reports and backups',
                            default: true
                        }
                    }
                },
                security: {
                    type: 'object',
                    properties: {
                        enabled: {
                            type: 'boolean',
                            description: 'Enable security features',
                            default: true
                        },
                        adminPinEnabled: {
                            type: 'boolean',
                            description: 'Enable admin PIN protection',
                            default: false
                        },
                        sessionTimeout: {
                            type: 'number',
                            description: 'Session timeout in milliseconds',
                            minimum: 60000,
                            maximum: 3600000,
                            default: 1800000
                        },
                        maxFailedAttempts: {
                            type: 'number',
                            description: 'Maximum failed login attempts',
                            minimum: 1,
                            maximum: 10,
                            default: 3
                        },
                        sanitizeInput: {
                            type: 'boolean',
                            description: 'Enable input sanitization',
                            default: true
                        },
                        validatePaths: {
                            type: 'boolean',
                            description: 'Enable path validation',
                            default: true
                        }
                    }
                },
                backup: {
                    type: 'object',
                    properties: {
                        enabled: {
                            type: 'boolean',
                            description: 'Enable automatic backup creation',
                            default: true
                        },
                        location: {
                            type: 'string',
                            description: 'Backup storage location',
                            default: './backups'
                        },
                        frequency: {
                            type: 'string',
                            enum: ['daily', 'weekly', 'monthly'],
                            description: 'Backup frequency',
                            default: 'daily'
                        },
                        retention: {
                            type: 'number',
                            description: 'Number of days to retain backups',
                            minimum: 1,
                            maximum: 365,
                            default: 7
                        },
                        compression: {
                            type: 'boolean',
                            description: 'Enable backup compression',
                            default: true
                        },
                        encryption: {
                            type: 'boolean',
                            description: 'Enable backup encryption',
                            default: true
                        },
                        autoCleanup: {
                            type: 'boolean',
                            description: 'Enable automatic cleanup of old backups',
                            default: true
                        },
                        maxSize: {
                            type: 'string',
                            description: 'Maximum backup size',
                            default: '100MB'
                        },
                        includeReports: {
                            type: 'boolean',
                            description: 'Include reports in backup',
                            default: true
                        },
                        includeLogs: {
                            type: 'boolean',
                            description: 'Include logs in backup',
                            default: true
                        }
                    }
                }
            }
        };
    }

    /**
     * Update specific setting
     * @param {string} key - Setting key (dot notation supported)
     * @param {*} value - New value
     */
    updateSetting(key, value) {
        const settings = this.loadSettings();
        const keys = key.split('.');
        let current = settings;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        this.saveSettings(settings);
    }

    /**
     * Get specific setting
     * @param {string} key - Setting key (dot notation supported)
     * @param {*} defaultValue - Default value if key doesn't exist
     * @returns {*} Setting value
     */
    getSetting(key, defaultValue = undefined) {
        const settings = this.loadSettings();
        const keys = key.split('.');
        let current = settings;
        
        for (const k of keys) {
            if (current && typeof current === 'object' && k in current) {
                current = current[k];
            } else {
                return defaultValue;
            }
        }
        
        return current;
    }

    /**
     * Get available languages
     * @returns {Array} Array of language objects with code and name
     */
    getAvailableLanguages() {
        return [
            { code: 'en', name: 'English' },
            { code: 'de', name: 'Deutsch' },
            { code: 'es', name: 'Español' },
            { code: 'fr', name: 'Français' },
            { code: 'ru', name: 'Русский' },
            { code: 'ja', name: '日本語' },
            { code: 'zh', name: '中文' }
        ];
    }

    /**
     * Get the full configuration object (alias for loadSettings)
     * @returns {Object} The complete configuration object
     */
    getConfig() {
        return this.loadSettings();
    }

    /**
     * Save the configuration object (alias for saveSettings)
     * @param {Object} config - Configuration object to save
     */
    saveConfig(config) {
        const currentSettings = this.loadSettings();
        this._settings = { ...currentSettings, ...config };
        this.saveSettings(this._settings);
    }
}

// Export the class for direct instantiation
module.exports = SettingsManager;
module.exports.SettingsManager = SettingsManager;