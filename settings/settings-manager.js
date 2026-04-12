const fs = require('fs');
const path = require('path');
const os = require('os');
const { I18nError } = require('../utils/i18n-helper');
const SecurityUtils = require('../utils/security');

class SettingsManager {
    constructor() {
    // Use centralized .i18ntk-settings file as single source of truth
    this.configDir = path.resolve(__dirname, '..');
    const projectRoot = path.resolve(process.cwd());
    this.configFile = SecurityUtils.safeJoin(projectRoot, '.i18ntk-settings') || path.join(projectRoot, '.i18ntk-settings');
    this.backupDir = SecurityUtils.safeJoin(projectRoot, 'i18ntk-backups') || path.join(projectRoot, 'i18ntk-backups');
        this.saveTimeout = null;
        
        this.defaultConfig = {
            "version": "2.3.6",
            "language": "en",
            "uiLanguage": "en",
            "theme": "dark",
            "projectRoot": process.cwd(),
            "sourceDir": "./locales",
            "i18nDir": "./i18n",
            "outputDir": "./i18ntk-reports",
            "setup": {
                "completed": false,
                "completedAt": null,
                "version": null,
                "setupId": null
            },
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
                "autoBackup": false,
                "backupFrequency": "weekly",
                "maxBackups": 1,
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
                "enabled": false,
                "location": "./i18ntk-backups",
                "frequency": "daily",
                "retention": 7,
                "maxBackups": 1,
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
                    "t\\\\(['\"][^'\"]*['\"]\\\\)",
                    "i18n\\\\.t\\\\(['\"][^'\"]*['\"]\\\\)"
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
            },
            "setup": {
                "completed": false,
                "completedAt": null,
                "version": null,
                "setupId": null
            }
        };
        
        this.settings = this.loadSettings();
    }

    resolveSafePath(targetPath, basePath = process.cwd()) {
        return SecurityUtils.validatePath(path.resolve(targetPath), basePath);
    }

    safeDeleteFile(targetPath, basePath = process.cwd()) {
        const validated = this.resolveSafePath(targetPath, basePath);
        if (!validated) return false;
        if (!SecurityUtils.safeExistsSync(validated, basePath)) return false;
        fs.unlinkSync(validated);
        return true;
    }

    /**
     * Load settings from file or return default settings
     * @returns {object} Settings object
     */
    loadSettings() {
        try {
            if (SecurityUtils.safeExistsSync(this.configFile)) {
                const content = SecurityUtils.safeReadFileSync(this.configFile, process.cwd(), 'utf8');
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
        
        if (loadedSettings.setup) {
            merged.setup = { 
                ...this.defaultConfig.setup, 
                ...loadedSettings.setup 
            };
        }
        
        return merged;
    }

    /**
     * Save settings to file
     * @param {object} settings - Settings to save
     */
    saveSettings(settings = null) {
        if (settings) {
            this.settings = settings;
        }
        
        // Clear any pending save
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        // Debounce saves to prevent rapid successive saves
        this.saveTimeout = setTimeout(() => {
            this._saveImmediately();
        }, 100); // 100ms debounce
    }

    /**
     * Save settings immediately without debounce
     * @param {object} settings - Settings to save
     */
    saveSettingsImmediately(settings = null) {
        if (settings) {
            this.settings = settings;
        }
        
        // Clear any pending save
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        
        this._saveImmediately();
    }

    /**
     * Internal method to save settings without debounce
     * @private
     */
    _saveImmediately() {
        try {
            const configDir = path.dirname(this.configFile);
            const validatedConfigDir = this.resolveSafePath(configDir, process.cwd());
            if (!validatedConfigDir) {
                throw new Error('Invalid configuration directory');
            }

            if (!SecurityUtils.safeExistsSync(validatedConfigDir, process.cwd())) {
                SecurityUtils.safeMkdirSync(validatedConfigDir, process.cwd(), { recursive: true });
            }
            
            const content = JSON.stringify(this.settings, null, 4);
            SecurityUtils.safeWriteFileSync(this.configFile, content, validatedConfigDir, 'utf8');
            
            // Create backup if enabled
            if (this.settings.backup?.enabled) {
                this.createBackup();
            }
            
            console.log('Settings saved successfully');
        } catch (error) {
            console.error('Error saving settings:', error.message);
        }
        
        this.saveTimeout = null;
    }

    /**
     * Create backup of current settings
     */
    createBackup() {
        try {
            const configuredBackupLocation = this.settings?.backup?.location || './i18ntk-backups';
            const resolvedBackupDir = path.resolve(process.cwd(), configuredBackupLocation);
            const validatedBackupDir = SecurityUtils.validatePath(resolvedBackupDir, process.cwd());
            if (!validatedBackupDir) {
                console.error('Error creating backup: Invalid backup directory');
                return;
            }

            if (!SecurityUtils.safeExistsSync(validatedBackupDir, process.cwd())) {
                SecurityUtils.safeMkdirSync(validatedBackupDir, process.cwd(), { recursive: true });
            }
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(validatedBackupDir, `config-${timestamp}.json`);
            const validatedConfigFile = this.resolveSafePath(this.configFile, process.cwd());
            const validatedBackupFile = this.resolveSafePath(backupFile, process.cwd());
            if (!validatedConfigFile || !validatedBackupFile) {
                console.error('Error creating backup: Invalid source or destination path');
                return;
            }
            
            fs.copyFileSync(validatedConfigFile, validatedBackupFile);
            
            // Clean old backups
            this.cleanupOldBackups(validatedBackupDir);
        } catch (error) {
            console.error('Error creating backup:', error.message);
        }
    }

    /**
     * Clean old backup files
     */
    cleanupOldBackups(backupDirectory = null) {
        try {
            const activeBackupDir = this.resolveSafePath(backupDirectory || this.backupDir, process.cwd());
            if (!activeBackupDir) {
                return;
            }
            if (!SecurityUtils.safeExistsSync(activeBackupDir, process.cwd())) {
                return;
            }

            const files = (SecurityUtils.safeReaddirSync(activeBackupDir, process.cwd()) || [])
                .filter(file => file.startsWith('config-') && file.endsWith('.json'))
                .map(file => ({
                    name: file,
                    path: path.join(activeBackupDir, file),
                    mtime: (SecurityUtils.safeStatSync(path.join(activeBackupDir, file), process.cwd()) || { mtime: new Date(0) }).mtime
                }))
                .sort((a, b) => b.mtime - a.mtime);
            
            const configuredKeep = parseInt(this.settings?.backup?.maxBackups, 10);
            const maxBackups = Number.isInteger(configuredKeep)
                ? Math.min(Math.max(configuredKeep, 1), 3)
                : 1;
            if (files.length > maxBackups) {
                files.slice(maxBackups).forEach(file => {
                    this.safeDeleteFile(file.path, process.cwd());
                });
            }
        } catch (error) {
            console.error('Error cleaning backups:', error.message);
        }
    }

    /**
     * Reset settings to defaults
     */
    resetToDefaults() {
        this.settings = { ...this.defaultConfig };
        // Ensure setup section is also reset
        this.settings.setup = {
            "completed": false,
            "completedAt": null,
            "version": null,
            "setupId": null
        };
        // Set projectRoot to "/" for fresh install state
        this.settings.projectRoot = "/";
        this.saveSettings();
        console.log('Settings reset to defaults');
    }

    /**
     * Complete reset - removes all configuration files and resets to fresh install state
     */
    async completeReset() {
        
        try {
            console.log('🧹 Performing complete reset...');
            
            // 1. Reset to defaults with projectRoot set to "/" for fresh install
            this.settings = { ...this.defaultConfig };
            this.settings.projectRoot = "/"; // Set to root for fresh install
            
            // 2. Remove actual configuration files used by the system
            const packageDir = path.resolve(__dirname, '..');
            const projectRoot = path.resolve(process.cwd());
            const settingsDir = SecurityUtils.safeJoin(packageDir, 'settings');
            
            // Main configuration file
            const mainConfigPath = path.join(settingsDir, 'i18ntk-config.json');
            if (this.safeDeleteFile(mainConfigPath, packageDir)) {
                console.log('✅ Main configuration file removed');
            }
            
            // Project configuration file
            const projectConfigPath = path.join(settingsDir, 'project-config.json');
            if (this.safeDeleteFile(projectConfigPath, packageDir)) {
                console.log('✅ Project configuration removed');
            }
            
            // Setup tracking file
            const setupFile = path.join(settingsDir, 'setup.json');
            if (this.safeDeleteFile(setupFile, packageDir)) {
                console.log('✅ Setup tracking cleared');
            }
            
            // 3. Clear all backup files from backups directory
            const backupsDir = path.join(packageDir, 'backups');
            if (SecurityUtils.safeExistsSync(backupsDir, packageDir)) {
                const backupFiles = SecurityUtils.safeReaddirSync(backupsDir, packageDir) || [];
                for (const file of backupFiles) {
                    if (file.endsWith('.json') || file.endsWith('.bak')) {
                        this.safeDeleteFile(path.join(backupsDir, file), packageDir);
                    }
                }
                console.log('✅ All backup files cleared');
            }
            
            // 4. Clear admin PIN configuration (package/project scope only)
            const adminConfigPaths = [
                path.join(packageDir, '.i18n-admin-config.json'),
                path.join(settingsDir, '.i18n-admin-config.json'),
                path.join(settingsDir, 'admin-config.json'),
                SecurityUtils.safeJoin(projectRoot, '.i18n-admin-config.json') || path.join(projectRoot, '.i18n-admin-config.json')
            ];
            
            for (const adminConfigPath of adminConfigPaths) {
                if (this.safeDeleteFile(adminConfigPath, projectRoot)) {
                    console.log('✅ Admin PIN configuration cleared');
                }
            }
            
            // 5. Clear initialization tracking
            const initFiles = [
                path.join(settingsDir, 'initialization.json'),
                path.join(settingsDir, 'init.json')
            ];
            
            for (const initFile of initFiles) {
                if (this.safeDeleteFile(initFile, packageDir)) {
                    console.log('✅ Initialization tracking cleared');
                }
            }
            
            // 6. Clear any cached data
            const cacheDirs = [
                path.join(packageDir, '.cache'),
                path.join(settingsDir, '.cache')
            ];
            
            for (const cacheDir of cacheDirs) {
                if (SecurityUtils.safeExistsSync(cacheDir, packageDir)) {
                    const cacheFiles = SecurityUtils.safeReaddirSync(cacheDir, packageDir) || [];
                    for (const file of cacheFiles) {
                        this.safeDeleteFile(path.join(cacheDir, file), packageDir);
                    }
                    console.log('✅ Cache cleared');
                }
            }
            
            // 7. Clear temporary files across directories
            const tempFiles = [
                path.join(settingsDir, '.temp-config.json'),
                path.join(settingsDir, '.last-config.json'),
                path.join(settingsDir, '.lock'),
                path.join(settingsDir, 'i18ntk-config.json.tmp'),
                path.join(settingsDir, 'settings.lock'),
                path.join(packageDir, '.env-config.json'),
                path.join(packageDir, '.temp-config.json'),
                path.join(packageDir, 'config.tmp'),
                path.join(packageDir, '.lock')
            ];
            
            for (const tempFile of tempFiles) {
                this.safeDeleteFile(tempFile, packageDir);
            }
            console.log('✅ Temporary files cleared');
            
            // 8. Clear any additional user data files
            const additionalFiles = [
                path.join(settingsDir, 'user-preferences.json'),
                path.join(settingsDir, 'custom-config.json'),
                path.join(settingsDir, 'local-config.json'),
                path.join(packageDir, 'user-preferences.json'),
                path.join(packageDir, 'custom-config.json'),
                path.join(packageDir, 'local-config.json')
            ];
            
            for (const file of additionalFiles) {
                if (this.safeDeleteFile(file, packageDir)) {
                    console.log(`✅ Removed ${path.basename(file)}`);
                }
            }
            
            // 9. Reset all script directory overrides to defaults
            this.settings.scriptDirectories = {
                "main": "./main",
                "utils": "./utils",
                "scripts": "./scripts",
                "settings": "./settings",
                "uiLocales": "./ui-locales"
            };
            
            // 10. Reset setup section to ensure clean state
            this.settings.setup = {
                "completed": false,
                "completedAt": null,
                "version": null,
                "setupId": null
            };
            
            // 11. Save fresh configuration to the correct location
            this.saveSettings();
            console.log('✅ Fresh configuration saved');
            
            return this.settings;
            
        } catch (error) {
            throw new Error(`Complete reset failed: ${error.message}`);
        }
    }

    /**
     * Get current settings
     * @returns {object} Current settings
     */
    getSettings() {
        return this.settings;
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
                    default: '1.10.1',
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
                }
            }
        };
    }

    /**
     * Update specific setting
     * @param {string} key - Setting key (dot notation supported)
     * @param {*} value - New value
     * @param {boolean} immediateSave - Whether to save immediately (default: true)
     */
    updateSetting(key, value, immediateSave = true) {
        const keys = key.split('.');
        let current = this.settings;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        if (immediateSave) {
            this.saveSettings();
        }
    }

    /**
     * Update multiple settings at once
     * @param {Object} settings - Object with key-value pairs to update
     */
    updateSettings(settings) {
        for (const [key, value] of Object.entries(settings)) {
            const keys = key.split('.');
            let current = this.settings;
            
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]]) {
                    current[keys[i]] = {};
                }
                current = current[keys[i]];
            }
            
            current[keys[keys.length - 1]] = value;
        }
        
        // Save once after all updates (use immediate save for batch operations)
        this.saveSettingsImmediately();
    }

    /**
     * Get specific setting
     * @param {string} key - Setting key (dot notation supported)
     * @param {*} defaultValue - Default value if key doesn't exist
     * @returns {*} Setting value
     */
    getSetting(key, defaultValue = undefined) {
        const keys = key.split('.');
        let current = this.settings;
        
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
}

module.exports = SettingsManager;

