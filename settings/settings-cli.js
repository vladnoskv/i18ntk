/**
 * Settings CLI Interface
 * Interactive terminal-based settings management for i18n toolkit
 * No external dependencies - uses Node.js built-in readline
 */

const cliHelper = require('../utils/cli-helper');
const fs = require('fs');
const path = require('path');
const settingsManager = require('./settings-manager');
const UIi18n = require('../main/i18ntk-ui');
const configManager = require('../utils/config-manager');
const { loadTranslations } = require('../utils/i18n-helper');
loadTranslations(process.env.I18NTK_LANG || 'en');

const AdminAuth = require('../utils/admin-auth');
const uiI18n = new UIi18n();

// ANSI color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m'
};

function isAdminPinEnabled() {
    const cfg = configManager.getConfig();
    return cfg.security?.adminPinEnabled || false;
}

class SettingsCLI {
    constructor() {
        this.rl = null; // Use cliHelper instead
        this.settings = null;
        this.schema = null;
        this.modified = false;
        this.adminAuth = new AdminAuth();
        this.adminAuthenticated = false;
    }

    /**
     * Translation helper function
     */
    t(key, params = {}) {
        return t(key, params);
    }

    /**
     * Initialize the CLI interface
     */
    async init() {
        try {
            this.settings = configManager.getConfig();
            this.schema = settingsManager.getSettingsSchema();
            return true;
        } catch (error) {
            this.error(this.t('settings.initFailed', { error: error.message }));
            return false;
        }
    }

    /**
     * Start the interactive settings interface
     */
    async start() {
        if (!(await this.init())) {
            process.exit(1);
        }

        this.clearScreen();
        this.showHeader();
        await this.showMainMenu();
    }

    /**
     * Run the settings interface (alias for start)
     */
    async run() {
        await this.start();
    }

    /**
     * Clear the terminal screen
     */
    clearScreen() {
        process.stdout.write('\x1b[2J\x1b[0f');
    }

    /**
     * Show the main header
     */
    showHeader() {
        // Refresh language from settings to ensure consistency
        if (typeof uiI18n.refreshLanguageFromSettings === 'function') {
            uiI18n.refreshLanguageFromSettings();
        }
        
        const title = t('operations.settings.title') || 'Settings Management';
        const separator = t('operations.settings.separator') || '============================================================';
        
        console.log(`${colors.cyan}${colors.bright}`);
        console.log(`${title}`);
        console.log(separator);
        console.log(colors.reset);
        
        if (this.modified) {
            console.log(`${colors.yellow}${this.t('settings.mainMenu.unsavedChangesWarning')}${colors.reset}\n`);
        }
    }

    /**
     * Show the main menu
     */
    async showMainMenu() {
        // Check if admin PIN is configured for display purposes
        await this.adminAuth.initialize();
        const config = await this.adminAuth.loadConfig();
        const pinSet = config && !!config.pinHash;
        const protectionEnabled = isAdminPinEnabled();
        const pinStatus = pinSet ? 
            `${colors.green}✅${colors.reset}` : 
            `${colors.red}❌${colors.reset}`;

        const options = [
            { key: '1', label: this.t('settings.mainMenu.uiSettings'), description: this.t('settings.mainMenu.uiSettingsDesc') },
            { key: '2', label: this.t('settings.mainMenu.directorySettings'), description: this.t('settings.mainMenu.directorySettingsDesc') },
            { key: '3', label: this.t('settings.mainMenu.scriptDirectorySettings'), description: this.t('settings.mainMenu.scriptDirectorySettingsDesc') },
            { key: '4', label: this.t('settings.mainMenu.processingSettings'), description: this.t('settings.mainMenu.processingSettingsDesc') },
            { key: '5', label: this.t('settings.mainMenu.backupSettings'), description: this.t('settings.mainMenu.backupSettingsDesc') },
            { key: '6', label: this.t('settings.mainMenu.securitySettings'), description: `${this.t('settings.mainMenu.securitySettingsDesc')} ${pinStatus}` },
            { key: '7', label: this.t('settings.mainMenu.advancedSettings'), description: this.t('settings.mainMenu.advancedSettingsDesc') },
            { key: '8', label: this.t('settings.mainMenu.viewAllSettings'), description: this.t('settings.mainMenu.viewAllSettingsDesc') },
            { key: '9', label: this.t('settings.mainMenu.importExport'), description: this.t('settings.mainMenu.importExportDesc') },
            { key: '0', label: this.t('settings.mainMenu.reportBug'), description: this.t('settings.mainMenu.reportBugDesc') },
            { key: 'x', label: 'Reset Script Directory Overrides', description: 'Clear script directory overrides and use defaults' },
            { key: 'r', label: this.t('settings.mainMenu.resetToDefaults'), description: this.t('settings.mainMenu.resetToDefaultsDesc') },
            { key: 'u', label: this.t('settings.mainMenu.updatePackage'), description: this.t('settings.mainMenu.updatePackageDesc') },
            { key: 's', label: this.t('settings.mainMenu.saveChanges'), description: this.t('settings.mainMenu.saveChangesDesc') },
            { key: 'h', label: this.t('settings.mainMenu.help'), description: this.t('settings.mainMenu.helpDesc') },
            { key: 'q', label: this.t('settings.mainMenu.quit'), description: this.t('settings.mainMenu.quitDesc') }
        ];

        console.log(`${colors.bright}${this.t('settings.mainMenu.title')}${colors.reset}\n`);
        
        options.forEach(option => {
            const keyColor = option.key.match(/[0-9]/) ? colors.cyan : colors.yellow;
            console.log(`  ${keyColor}${option.key}${colors.reset}) ${colors.bright}${option.label}${colors.reset}`);
            console.log(`     ${colors.dim}${option.description}${colors.reset}`);
        });

        console.log();
        const choice = await this.prompt(this.t('settings.mainMenu.selectOption'));
        await this.handleMainMenuChoice(choice.toLowerCase());
    }

    /**
     * Handle main menu choice
     */
    async handleMainMenuChoice(choice) {
        switch (choice) {
            case '1':
                await this.showUISettings();
                break;
            case '2':
                await this.showDirectorySettings();
                break;
            case '3':
                await this.showScriptDirectorySettings();
                break;
            case '4':
                await this.showProcessingSettings();
                break;
            case '5':
                await this.showBackupSettings();
                break;
            case '6':
                await this.showSecuritySettings();
                break;
            case '7':
                await this.showAdvancedSettings();
                break;
            case '8':
                await this.showAllSettings();
                break;
            case '9':
                await this.showImportExport();
                break;
            case '0':
                await this.reportBug();
                break;
            case 'x':
                await this.resetScriptDirectories();
                break;
            case 'r':
                await this.resetToDefaults();
                break;
            case 'u':
                await this.updatePackage();
                break;
            case 's':
                await this.saveSettings();
                break;
            case 'h':
                await this.showHelp();
                break;
            case 'q':
                await this.quit();
                return;
            default:
                this.error('Invalid option. Please try again.');
                await this.pause();
                break;
        }
        
        this.clearScreen();
        this.showHeader();
        await this.showMainMenu();
    }

    /**
     * Show UI settings menu
     */
    async showUISettings() {
        // Refresh language from settings to ensure consistency
        if (typeof uiI18n.refreshLanguageFromSettings === 'function') {
            uiI18n.refreshLanguageFromSettings();
        }
        
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}${this.t('settings.categories.uiSettings')}${colors.reset}\n`);

        const uiSettings = {
            'language': this.t('settings.fields.language.label'),
            'theme': this.t('settings.fields.theme.label'),
            'dateFormat': this.t('settings.fields.dateFormat.label'),
            'notifications.enabled': this.t('settings.fields.notifications.enabled.label'),
            'removeUiLanguages': this.t('settings.fields.removeUiLanguages.label')
        };

        await this.showSettingsCategory(uiSettings);
    }

    /**
     * Show directory settings menu
     */
    async showDirectorySettings() {
        // Refresh language from settings to ensure consistency
        if (typeof uiI18n.refreshLanguageFromSettings === 'function') {
            uiI18n.refreshLanguageFromSettings();
        }
        
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}${this.t('settings.categories.directorySettings')}${colors.reset}\n`);
        console.log(`📁 ${colors.cyan}${this.t('settings.currentDirectory')}: ${process.cwd()}${colors.reset}`);
        console.log(`💡 ${colors.dim}${this.t('settings.relativePathHint')}${colors.reset}\n`);

        const dirSettings = {
            'projectRoot': this.t('settings.fields.projectRoot.label'),
            'sourceDir': this.t('settings.fields.sourceDir.label'),
            'i18nDir': this.t('settings.fields.i18nDir.label'),
            'outputDir': this.t('settings.fields.outputDir.label')
        };

        await this.showSettingsCategory(dirSettings);
    }

    /**
     * Show script-specific directory settings menu
     */
    async showScriptDirectorySettings() {
        // Refresh language from settings to ensure consistency
        if (typeof uiI18n.refreshLanguageFromSettings === 'function') {
            uiI18n.refreshLanguageFromSettings();
        }
        
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}${this.t('settings.categories.scriptDirectorySettings')}${colors.reset}\n`);
        console.log(`📁 ${colors.cyan}${this.t('settings.currentDirectory')}: ${process.cwd()}${colors.reset}`);
        console.log(`💡 ${colors.dim}${this.t('settings.relativePathHint')}${colors.reset}\n`);

        const scriptDirSettings = {
            'scriptDirectories.analyze': this.t('settings.fields.scriptDirectories.analyzeLabel'),
            'scriptDirectories.complete': this.t('settings.fields.scriptDirectories.completeLabel'),
            'scriptDirectories.init': this.t('settings.fields.scriptDirectories.initLabel'),
            'scriptDirectories.manage': this.t('settings.fields.scriptDirectories.manageLabel'),
            'scriptDirectories.sizing': this.t('settings.fields.scriptDirectories.sizingLabel'),
            'scriptDirectories.summary': this.t('settings.fields.scriptDirectories.summaryLabel'),
            'scriptDirectories.usage': this.t('settings.fields.scriptDirectories.usageLabel'),
            'scriptDirectories.validate': this.t('settings.fields.scriptDirectories.validateLabel')
        };

        await this.showSettingsCategory(scriptDirSettings);
    }

    /**
     * Show processing settings menu
     */
    async showProcessingSettings() {
        // Refresh language from settings to ensure consistency
        if (typeof uiI18n.refreshLanguageFromSettings === 'function') {
            uiI18n.refreshLanguageFromSettings();
        }
        
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}${this.t('settings.categories.processingSettings')}${colors.reset}\n`);

        const processSettings = {
            'advanced.batchSize': this.t('settings.fields.batchSize.label'),
            'advanced.maxConcurrentFiles': this.t('settings.fields.maxConcurrentFiles.label'),
            'advanced.sizingThreshold': this.t('settings.fields.sizingThreshold.label')
        };

        await this.showSettingsCategory(processSettings);
    }

    /**
     * Show advanced settings menu
     */
    async showSecuritySettings() {
        // Refresh language from settings to ensure consistency
        if (typeof uiI18n.refreshLanguageFromSettings === 'function') {
            uiI18n.refreshLanguageFromSettings();
        }
        
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}${this.t('settings.security.title')}${colors.reset}\n`);

        const config = await this.adminAuth.loadConfig();
        const pinSet = config && !!config.pinHash;
        const protectionEnabled = isAdminPinEnabled();
        const pinStatus = pinSet ? 
            `${colors.green}${this.t('settings.security.pinConfigured')}${colors.reset}` : 
            `${colors.red}${this.t('settings.security.pinNotConfigured')}${colors.reset}`;

        console.log(`${this.t('settings.security.currentPin')}: ${pinStatus}`);
        console.log(`Protection Status: ${protectionEnabled ? `${colors.green}enabled${colors.reset}` : `${colors.red}disabled${colors.reset}`}\n`);

        const securitySettings = {
            'security.adminPinEnabled': this.t('settings.fields.adminPinEnabled.label'),
            '_setupPin': 'Configure Admin PIN',
            'security.sessionTimeout': 'Session Timeout (minutes)',
            'security.maxFailedAttempts': 'Max Failed Attempts',
            'security.lockoutDuration': 'Lockout Duration (minutes)',
            'security.pinProtection.enabled': 'PIN Protection Master Switch',
            '_configurePinProtection': 'Configure PIN Protected Scripts'
        };

        await this.showSettingsCategory(securitySettings);
    }

    async showAdvancedSettings() {
        // Refresh language from settings to ensure consistency
        if (typeof uiI18n.refreshLanguageFromSettings === 'function') {
            uiI18n.refreshLanguageFromSettings();
        }
        
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}${this.t('settings.categories.advancedSettings')}${colors.reset}\n`);

        const advancedSettings = {
            'advanced.strictMode': this.t('settings.fields.strictMode.label'),
            'advanced.enableAuditLog': this.t('settings.fields.enableAuditLog.label'),
            'advanced.backupBeforeChanges': this.t('settings.fields.backupBeforeChanges.label')
        };

        await this.showSettingsCategory(advancedSettings);
    }

    /**
     * Show backup settings menu
     */
    async showBackupSettings() {
        // Refresh language from settings to ensure consistency
        if (typeof uiI18n.refreshLanguageFromSettings === 'function') {
            uiI18n.refreshLanguageFromSettings();
        }
        
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}${this.t('settings.backup.title')}${colors.reset}\n`);

        console.log(`${this.t('settings.backup.description')}\n`);


        const backupSettings = {
            'backup.enabled': this.t('settings.backup.enabled'),
            'backup.enabled.help': this.t('settings.backup.enabledHelp'),
            'backup.singleFileMode': this.t('settings.backup.singleFileMode'),
            'backup.singleFileMode.help': this.t('settings.backup.singleFileModeHelp'),
            'backup.singleBackupFile': this.t('settings.backup.singleBackupFile'),
            'backup.singleBackupFile.help': this.t('settings.backup.singleBackupFileHelp'),
            'backup.retentionDays': this.t('settings.backup.retentionDays'),
            'backup.retentionDays.help': this.t('settings.backup.retentionDaysHelp'),
            'backup.maxBackups': this.t('settings.backup.maxBackups'),
            'backup.maxBackups.help': this.t('settings.backup.maxBackupsHelp'),
            'backup.confirm': this.t('settings.backup.confirm'),
            'backup.confirm.help': this.t('settings.backup.confirmHelp')
        };

        await this.showSettingsCategory(backupSettings);
    }

    /**
     * Show settings category with edit options
     */
    async showSettingsCategory(categorySettings) {
        // Refresh language from settings to ensure consistency
        if (typeof uiI18n.refreshLanguageFromSettings === 'function') {
            uiI18n.refreshLanguageFromSettings();
        }
        
        const keys = Object.keys(categorySettings);
        
        // Display current values
        for (let index = 0; index < keys.length; index++) {
            const key = keys[index];
            let value = this.getNestedValue(this.settings, key);
            let displayValue = this.formatValue(value, key);
            
            // Special display for admin PIN protection and PIN setup
            if (key === 'security.adminPinEnabled') {
                const config = await this.adminAuth.loadConfig();
                const pinSet = config && !!config.pinHash;
                const pinStatus = pinSet ? `${colors.green}PIN configured${colors.reset}` : `${colors.red}PIN not configured${colors.reset}`;
                displayValue = `${displayValue} - ${pinStatus}`;
            } else if (key === '_setupPin') {
                const config = await this.adminAuth.loadConfig();
                const pinSet = config && !!config.pinHash;
                displayValue = pinSet ? `${colors.green}PIN configured${colors.reset}` : `${colors.red}PIN not configured${colors.reset}`;
            }
            
            console.log(`  ${colors.cyan}${index + 1}${colors.reset}) ${categorySettings[key]}`);
            console.log(`     ${colors.dim}${this.t('settings.current')}: ${colors.reset}${displayValue}`);
        }

        console.log(`\n  ${colors.yellow}b${colors.reset}) ${this.t('settings.back')}`);
        
        // Add reset option for script directories
        const isScriptDirectory = Object.keys(categorySettings).some(key => key.startsWith('scriptDirectories.'));
        if (isScriptDirectory) {
            console.log(`  ${colors.red}r${colors.reset}) ${this.t('settings.resetScriptDirectories')}`);
        }
        console.log();

        const prompt = isScriptDirectory 
            ? 'Select setting to edit (or b for back, r for reset): '
            : 'Select setting to edit (or b for back): ';
        const choice = await this.prompt(prompt);
        
        if (choice.toLowerCase() === 'b') {
            return;
        }

        if (choice.toLowerCase() === 'r' && isScriptDirectory) {
            await this.resetScriptDirectories();
            await this.showSettingsCategory(categorySettings);
            return;
        }

        const index = parseInt(choice) - 1;
        if (index >= 0 && index < keys.length) {
            const key = keys[index];
            await this.editSetting(key, categorySettings[key]);
            await this.showSettingsCategory(categorySettings);
        } else {
            this.error(this.t('common.invalidOption'));
            await this.pause();
            await this.showSettingsCategory(categorySettings);
        }
    }

    /**
     * Check if setting requires admin authentication
     */
    requiresAdminAuth(key) {
        const adminProtectedSettings = [
            'security.adminPinEnabled',
            'security.sessionTimeout',
            'security.maxFailedAttempts',
            'security.lockoutDuration',
            'security.pinProtection.enabled',
            'advanced.strictMode',
            'debug.enabled',
            'debug.verboseLogging',
            'advanced.backupBeforeChanges'
        ];
        return adminProtectedSettings.includes(key);
    }

    /**
     * Get helper text for a setting
     */
    getHelperText(key) {
        // Handle backup settings with proper dot notation
        if (key.startsWith('backup.')) {
            // Check if key already has .help suffix
            if (key.endsWith('.help')) {
                return this.t(`settings.fields.${key}`) || this.t('settings.noHelp');
            }
            return this.t(`settings.fields.${key}.help`) || this.t('settings.noHelp');
        }
        const helperKey = key.replace(/\./g, '_');
        return this.t(`settings.fields.${helperKey}.help`) || this.t('settings.noHelp');
    }

    /**
     * Get valid options for a setting
     */
    getValidOptions(key, schema) {
        if (schema && schema.enum) {
            return schema.enum;
        }
        
        const validOptions = {
            'theme': ['light', 'dark', 'auto'],
            'dateFormat': ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM-DD-YYYY'],
            'notifications.enabled': ['true', 'false'],
            'advanced.strictMode': ['true', 'false'],
            'debug.enabled': ['true', 'false'],
            'debug.verboseLogging': ['true', 'false'],
            'security.adminPinEnabled': ['true', 'false'],
            'security.pinProtection.enabled': ['true', 'false'],
            'advanced.backupBeforeChanges': ['true', 'false'],
            'backup.enabled': ['true', 'false'],
            'backup.singleFileMode': ['true', 'false']
        };
        if (key === 'language') {
            return settingsManager.getAvailableLanguages().map(l => l.code);
        }
        return validOptions[key] || null;
    }

    /**
     * Validate input value
     */
    validateInput(value, key, schema) {
        const validOptions = this.getValidOptions(key, schema);
        
        if (validOptions) {
            if (!validOptions.includes(value.toLowerCase())) {
                 if (key === 'language') {
                    return { valid: false, message: 'Language not installed. Reinstall package to use.' };
                }
                return { valid: false, message: `Invalid option. Valid options: ${validOptions.join(', ')}` };
            }
        }
        
        // Numeric validations with proper ranges
        const validations = {
            'batchSize': { min: 1, max: 10000, type: 'int' },
            'concurrentFiles': { min: 1, max: 100, type: 'int' },
            'sizingThreshold': { min: 1, max: 20000, type: 'int', unit: 'KB' },
            'autoSave': { min: 0, max: 60, type: 'int', unit: 'minutes' },
            'sessionTimeout': { min: 0, max: 60, type: 'int', unit: 'minutes' },
            'maxFailedAttempts': { min: 1, max: 10, type: 'int' },
            'lockoutDuration': { min: 1, max: 60, type: 'int', unit: 'minutes' },
            'backupRetention': { min: 1, max: 30, type: 'int', unit: 'days' },
            'logRetention': { min: 1, max: 90, type: 'int', unit: 'days' },
            'retentionDays': { min: 1, max: 365, type: 'int', unit: 'days' },
            'maxBackups': { min: 1, max: 1000, type: 'int' }
        };
        
        for (const [field, rules] of Object.entries(validations)) {
            if (key.includes(field)) {
                const num = parseInt(value);
                if (isNaN(num) || num < rules.min || num > rules.max) {
                    const unit = rules.unit ? ` ${rules.unit}` : '';
                    return { 
                        valid: false, 
                        message: `${field} must be between ${rules.min} and ${rules.max}${unit}.` 
                    };
                }
            }
        }
        
        // String validations
        if (key.includes('path') || key.includes('directory')) {
            if (value.includes('..') || value.includes('\\') || value.includes('//')) {
                return { valid: false, message: 'Invalid path format. Use forward slashes and avoid relative paths.' };
            }
        }
        
        return { valid: true };
    }

    /**
     * Edit a specific setting
     */
    async editSetting(key, label) {
        // Special handling for PIN setup
        if (key === '_setupPin') {
            await this.handlePinSetup();
            return;
        }

        // Special handling for PIN protection configuration
        if (key === '_configurePinProtection') {
            await this.configurePinProtection();
            return;
        }
               if (key === 'removeUiLanguages') {
            if (this.rl && this.rl.pause) this.rl.pause();
            const LocaleOptimizer = require('../scripts/locale-optimizer.js');
            const optimizer = new LocaleOptimizer();
            await optimizer.interactiveSelect();
            if (typeof this.rl.resume === 'function') this.rl.resume();
            if (typeof uiI18n.refreshAvailableLanguages === 'function') {
                uiI18n.refreshAvailableLanguages();
            }
            return;
        }
        
        // Check if admin authentication is required
        if (this.requiresAdminAuth(key) && !this.adminAuthenticated) {
            // Check if admin PIN is actually enabled and configured
            const adminPinEnabled = isAdminPinEnabled();
            const config = await this.adminAuth.loadConfig();
            const pinConfigured = adminPinEnabled && config && config.enabled === true && !!config.pinHash;
            
            if (pinConfigured) {
                console.log(`\n${this.t('settings.admin.authRequired', { label: label })}`);
                const pin = await this.promptPin(this.t('adminCli.enterPin'));
                if (!pin) {
                    console.log(this.t('settings.admin.accessDenied'));
                    await this.pause();
                    return;
                }
                const authenticated = await this.adminAuth.verifyPin(pin);
                if (!authenticated) {
                    console.log(this.t('settings.admin.accessDenied'));
                    await this.pause();
                    return;
                }
                this.adminAuthenticated = true;
            } else {
                // PIN not enabled or not configured, allow access
                this.adminAuthenticated = true;
            }
        }
        
        const currentValue = this.getNestedValue(this.settings, key);
        const schema = this.getSettingSchema(key);
        
        console.log(`\n${colors.bright}${this.t('settings.editing')}: ${label}${colors.reset}`);
        
        // Show helper text
        const helperText = this.getHelperText(key);
        console.log(`${colors.dim}${helperText}${colors.reset}\n`);
        
        // Show current value with special handling for admin PIN
        if (key === 'security.adminPinEnabled') {
            const config = await this.adminAuth.loadConfig();
            const pinSet = config && config.enabled === true && !!config.pinHash;
            const pinDisplay = pinSet ? '****' : '(not set)';
            console.log(`${this.t('settings.current')}: ${this.formatValue(currentValue, key)} (${this.t('settings.pin')}: ${pinDisplay})`);
        } else {
            console.log(`${this.t('settings.current')}: ${this.formatValue(currentValue, key)}`);
        }
        
        // Show valid options
        const validOptions = this.getValidOptions(key, schema);
        if (validOptions) {
            console.log(`\n${colors.cyan}${this.t('settings.validOptions')}:${colors.reset}`);
            validOptions.forEach((option, index) => {
                const marker = option.toLowerCase() === String(currentValue).toLowerCase() ? ` ← ${this.t('settings.current')}` : '';
                console.log(`  ${index + 1}) ${option}${colors.dim}${marker}${colors.reset}`);
            });
        }
        
        console.log();
        const newValue = await this.prompt(this.t('settings.enterNewValue'));
        
        if (newValue.trim() === '') {
            return;
        }
        
        // Handle "default" keyword for script directory settings
        if (newValue.trim().toLowerCase() === 'default') {
            if (key.startsWith('scriptDirectories.')) {
                this.setNestedValue(this.settings, key, null);
                this.modified = true;
                this.success(`${label} reset to system default.`);
                await this.pause();
                return;
            } else {
                this.error('"default" keyword is only supported for script directory settings.');
                await this.pause();
                return;
            }
        }
        
        // Validate input
        const validation = this.validateInput(newValue.trim(), key, schema);
        if (!validation.valid) {
            this.error(validation.message);
            await this.pause();
            return;
        }
        
        // Convert the value
        const convertedValue = this.convertValue(newValue.trim(), schema, key);
        if (convertedValue === null) {
            this.error(this.t('settings.invalidValueFormat'));
            await this.pause();
            return;
        }
        
        // Special handling for admin PIN protection toggle
        if (key === 'security.adminPinEnabled') {
            const config = await this.adminAuth.loadConfig();
            const pinSet = config && config.pinHash;
            
            if (convertedValue === true) {
                // Enable protection
                if (!pinSet) {
                    // No PIN exists, need to set one up
                    console.log('\n🔐 Admin PIN Protection Setup');
                    console.log('You must set a PIN to enable protection.\n');
                    const pin = await this.promptPin('Enter new admin PIN (4-6 digits): ');
                    if (pin) {
                        const confirmPin = await this.promptPin('Confirm PIN: ');
                        if (pin === confirmPin) {
                            const success = await this.adminAuth.setupPin(pin);
                            if (success) {
                                this.setNestedValue(this.settings, key, true);
                                this.modified = true;
                                try {
                                    await this.saveSettings();
                                    this.success('Admin PIN protection enabled successfully!');
                                } catch (error) {
                                    this.error(`Failed to save settings: ${error.message}`);
                                }
                            } else {
                                this.error('Failed to set admin PIN.');
                                return;
                            }
                        } else {
                            this.error('PINs do not match.');
                            return;
                        }
                    } else {
                        this.warning('PIN setup cancelled. Protection not enabled.');
                        return;
                    }
                } else {
                    // PIN already exists, just enable protection
                    const success = await this.adminAuth.enablePinProtection();
                    if (success) {
                        this.setNestedValue(this.settings, key, true);
                        this.modified = true;
                        try {
                            await this.saveSettings();
                            this.success('Admin PIN protection enabled!');
                        } catch (error) {
                            this.error(`Failed to save settings: ${error.message}`);
                        }
                    } else {
                        this.error('Failed to enable PIN protection.');
                        return;
                    }
                }
            } else {
                // Disable protection and remove PIN
                console.log('\n⚠️  This will disable admin PIN protection and remove the configured PIN.');

                if (pinSet) {
                    // PIN exists, need to verify before disabling
                    const pin = await this.promptPin('Enter current PIN to confirm: ');
                    if (pin && await this.adminAuth.verifyPin(pin)) {
                        const success = await this.adminAuth.disableAuth();
                        if (success) {
                            this.setNestedValue(this.settings, key, false);
                            this.modified = true;
                            this.adminAuthenticated = false;
                            try {
                                await this.saveSettings();
                                this.success('Admin PIN protection disabled and PIN removed!');
                            } catch (error) {
                                this.error(`Failed to save settings: ${error.message}`);
                            }
                        } else {
                            this.error('Failed to disable PIN protection.');
                            return;
                        }
                    } else if (pin) {
                        this.error('Invalid PIN. Protection not disabled.');
                        return;
                    } else {
                        this.warning('Operation cancelled. Protection remains enabled.');
                        return;
                    }
                } else {
                    // No PIN set, just disable protection
                    await this.adminAuth.disableAuth();
                    this.setNestedValue(this.settings, key, false);
                    this.modified = true;
                    this.adminAuthenticated = false;
                    try {
                        await this.saveSettings();
                        this.success('Admin PIN protection disabled!');
                    } catch (error) {
                        this.error(`Failed to save settings: ${error.message}`);
                    }
                }
            }
            return;
        }
        
        // Update the setting for all other cases
        let finalValue = convertedValue;
        if (typeof finalValue === 'string') {
            const lowerKey = key.toLowerCase();
            if (lowerKey.includes('dir') || lowerKey.includes('path') || lowerKey.includes('root')) {
                finalValue = finalValue.replace(/^([/\\])/, './');
                finalValue = configManager.toRelative(path.resolve(finalValue));
            }
        }
        this.setNestedValue(this.settings, key, finalValue);
        this.modified = true;
        
        // Save settings immediately after each change
        try {
            await this.saveSettings();
        } catch (error) {
            this.error(`Failed to save settings: ${error.message}`);
        }
        
        // Special handling for language changes
        if (key === 'language') {
            // Refresh UI language immediately
            if (typeof uiI18n.refreshLanguageFromSettings === 'function') {
                uiI18n.refreshLanguageFromSettings();
            }
            
            // Refresh i18n-helper translations
            const { refreshLanguageFromSettings } = require('../utils/i18n-helper');
            refreshLanguageFromSettings();
            
            // Force reload settings to ensure consistency
            this.settings = configManager.getConfig();
        }
    }

    /**
     * Prompt for PIN input with masking
     */
    async promptPin(prompt) {
        const input = await cliHelper.prompt(prompt, true);
        const pin = input.trim();
        if (/^\d{4,6}$/.test(pin)) {
            return pin;
        } else {
            console.log('❌ PIN must be 4-6 digits.');
            return null;
        }
    }

    /**
     * Handle PIN setup/change
     */
    async handlePinSetup() {
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}${this.t('settings.admin.pinSetupTitle')}${colors.reset}\n`);
        
        const config = await this.adminAuth.loadConfig();
        const pinSet = config && config.enabled === true && !!config.pinHash;
        
        if (pinSet) {
            console.log(this.t('settings.admin.pinConfigured'));
    console.log('\n' + this.t('settings.admin.options'));
            console.log('  ' + this.t('settings.admin.changePin'));
    console.log('  ' + this.t('settings.admin.removePin'));
    console.log('  ' + this.t('settings.admin.cancel'));
            console.log();
            
            const choice = await this.prompt(this.t('settings.admin.selectOption'));
            
            switch (choice) {
                case '1':
                    console.log(this.t('settings.admin.verifyCurrentPin'));
                    const currentPin = await this.promptPin('Enter current PIN: ');
                    if (currentPin && await this.adminAuth.verifyPin(currentPin)) {
                        const newPin = await this.promptPin('Enter new PIN: ');
                        if (newPin) {
                            const confirmPin = await this.promptPin('Confirm new PIN: ');
                            if (newPin === confirmPin) {
                                const success = await this.adminAuth.setupPin(newPin);
                                if (success) {
                                    this.success('Admin PIN updated successfully!');
                                    // Save settings immediately
                                    try {
                                        await this.saveSettings();
                                    } catch (error) {
                                        this.error(`Failed to save settings: ${error.message}`);
                                    }
                                } else {
                                    this.error('Failed to update admin PIN.');
                                }
                            } else {
                                this.error('PINs do not match.');
                            }
                        }
                    } else {
                        this.error('Invalid current PIN.');
                    }
                    break;
                case '2':
                    console.log(this.t('settings.admin.verifyToRemove'));
                    const removePin = await this.promptPin('Enter PIN to confirm removal: ');
                    if (removePin && await this.adminAuth.verifyPin(removePin)) {
                        const success = await this.adminAuth.disableAuth();
                        if (success) {
                            this.success('Admin PIN protection removed.');
                            // Save settings immediately
                            try {
                                await this.saveSettings();
                            } catch (error) {
                                this.error(`Failed to save settings: ${error.message}`);
                            }
                        } else {
                            this.error('Failed to remove PIN protection.');
                        }
                    } else {
                        this.error('Invalid PIN.');
                    }
                    break;
                case '3':
                    console.log(this.t('settings.admin.operationCancelled'));
                    break;
                default:
                    this.error(this.t('common.invalidOption'));
            }
        } else {
            console.log(this.t('settings.admin.noPinConfigured'));
    console.log('\n' + this.t('settings.admin.pinBenefits'));
    console.log('  ' + this.t('settings.admin.benefitSecurity'));
    console.log('  ' + this.t('settings.admin.benefitAdvanced'));
    console.log('  ' + this.t('settings.admin.benefitDebug'));
    console.log('  ' + this.t('settings.admin.benefitReset'));
            console.log();
            
            const response = await this.prompt(this.t('settings.admin.setupPinPrompt'));
            
            if (response.toLowerCase() === 'y' || response.toLowerCase() === 'yes') {
                const pin = await this.promptPin('Enter new admin PIN (4-6 digits): ');
                if (pin) {
                    const confirmPin = await this.promptPin('Confirm PIN: ');
                    if (pin === confirmPin) {
                        const success = await this.adminAuth.setupPin(pin);
                        if (success) {
                            this.success('Admin PIN configured successfully!');
                            // Enable admin PIN protection in settings
                            this.setNestedValue(this.settings, 'security.adminPinEnabled', true);
                            this.modified = true;
                            // Save settings immediately
                            try {
                                await this.saveSettings();
                            } catch (error) {
                                this.error(`Failed to save settings: ${error.message}`);
                            }
                        } else {
                            this.error('Failed to configure admin PIN.');
                        }
                    } else {
                        this.error('PINs do not match.');
                    }
                }
            } else {
                console.log(this.t('settings.admin.setupCancelled'));
            }
        }
        
        await this.pause();
    }

    /**
     * Configure PIN protection for individual scripts
     */
    async configurePinProtection() {
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}Configure PIN Protection${colors.reset}\n`);
        
        // Check if admin PIN is configured
        const adminPinConfigured = await this.adminAuth.isPinConfigured();
        if (!adminPinConfigured) {
            console.log(`${colors.red}Admin PIN is not configured.${colors.reset}`);
            console.log(`${colors.yellow}Please configure an Admin PIN first in Security Settings.${colors.reset}\n`);
            
            const proceed = await this.prompt('Press Enter to continue...');
            return;
        }
        
        // Check if PIN protection is enabled globally
        if (!isAdminPinEnabled()) {
            console.log(`${colors.red}PIN Protection is currently disabled.${colors.reset}`);
            console.log(`${colors.yellow}Please enable PIN Protection in Security Settings.${colors.reset}\n`);
            
            const proceed = await this.prompt('Press Enter to continue...');
            return;
        }
        
        const pinProtection = this.getNestedValue(this.settings, 'security.pinProtection') || {};
        const protectedScripts = pinProtection.protectedScripts || {};
        
        console.log(`${colors.dim}Select which scripts require PIN protection:${colors.reset}\n`);
        
        const scriptOptions = [
            { key: '1', label: 'Debug Tools Menu', setting: 'debugMenu', current: protectedScripts.debugMenu },
            { key: '2', label: 'Delete Reports', setting: 'deleteReports', current: protectedScripts.deleteReports },
            { key: '3', label: 'Summary Reports', setting: 'summaryReports', current: protectedScripts.summaryReports },
            { key: '4', label: 'Settings Menu', setting: 'settingsMenu', current: protectedScripts.settingsMenu },
            { key: '5', label: 'Init Script', setting: 'init', current: protectedScripts.init },
            { key: '6', label: 'Analyze Script', setting: 'analyze', current: protectedScripts.analyze },
            { key: '7', label: 'Validate Script', setting: 'validate', current: protectedScripts.validate },
            { key: '8', label: 'Complete Script', setting: 'complete', current: protectedScripts.complete },
            { key: '9', label: 'Manage Script', setting: 'manage', current: protectedScripts.manage },
            { key: '10', label: 'Sizing Script', setting: 'sizing', current: protectedScripts.sizing },
            { key: '11', label: 'Usage Script', setting: 'usage', current: protectedScripts.usage }
        ];

        // Display current settings
        scriptOptions.forEach(option => {
            const status = option.current ? `${colors.green}Protected${colors.reset}` : `${colors.red}Not Protected${colors.reset}`;
            console.log(`  ${colors.cyan}${option.key}${colors.reset}) ${option.label}: ${status}`);
        });

        console.log(`\n  ${colors.yellow}r${colors.reset}) Reset to defaults`);
        console.log(`  ${colors.yellow}b${colors.reset}) Back to security settings`);
        console.log();

        const choice = await this.prompt('Select script to toggle protection (or r/b): ');
        
        if (choice.toLowerCase() === 'b') {
            return;
        }

        if (choice.toLowerCase() === 'r') {
            // Reset to defaults
            const defaultConfig = {
                enabled: true,
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
            };
            
            this.setNestedValue(this.settings, 'security.pinProtection', defaultConfig);
            this.modified = true;
            this.success('PIN protection settings reset to defaults.');
            // Save settings immediately
            try {
                await this.saveSettings();
            } catch (error) {
                this.error(`Failed to save settings: ${error.message}`);
            }
            await this.pause();
            await this.configurePinProtection();
            return;
        }

        const index = parseInt(choice) - 1;
        if (index >= 0 && index < scriptOptions.length) {
            const option = scriptOptions[index];
            const newValue = !protectedScripts[option.setting];
            
            this.setNestedValue(this.settings, `security.pinProtection.protectedScripts.${option.setting}`, newValue);
            this.modified = true;
            
            const status = newValue ? 'enabled' : 'disabled';
            this.success(`PIN protection ${status} for ${option.label}.`);
            
            // Save settings immediately
            try {
                await this.saveSettings();
            } catch (error) {
                this.error(`Failed to save settings: ${error.message}`);
            }
            
            await this.pause();
            await this.configurePinProtection();
        } else {
            this.error('Invalid option.');
            await this.pause();
            await this.configurePinProtection();
        }
    }

    /**
     * Show all current settings
     */
    async showAllSettings() {
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}${this.t('settings.viewAll.title')}${colors.reset}\n`);
        
        this.displaySettingsTree(this.settings, '', '');
        
        console.log(`\n${this.t('settings.pressEnter')}...`);
        await this.prompt('');
    }

    /**
     * Display settings in a tree format
     */
    displaySettingsTree(obj, prefix, parentKey = '') {
        Object.keys(obj).forEach(key => {
            const value = obj[key];
            const fullKey = parentKey ? `${parentKey}.${key}` : key;
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                console.log(`${prefix}${colors.bright}${key}:${colors.reset}`);
                this.displaySettingsTree(value, prefix + '  ', fullKey);
            } else {
                console.log(`${prefix}${colors.cyan}${key}:${colors.reset} ${this.formatValue(value, fullKey)}`);
            }
        });
    }

    /**
     * Show import/export options
     */
    async showImportExport() {
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}${this.t('settings.importExport.title')}${colors.reset}\n`);
        
        console.log(`  ${colors.cyan}1${colors.reset}) ${this.t('settings.importExport.export')}`);
        console.log(`  ${colors.cyan}2${colors.reset}) ${this.t('settings.importExport.import')}`);
        console.log(`  ${colors.cyan}3${colors.reset}) ${this.t('settings.importExport.backup')}`);
        console.log(`  ${colors.cyan}4${colors.reset}) ${this.t('settings.importExport.restore')}`);
        console.log(`  ${colors.cyan}5${colors.reset}) ${this.t('settings.importExport.manageBackups')}`);
        console.log(`  ${colors.yellow}b${colors.reset}) ${this.t('settings.back')}\n`);
        
        const choice = await this.prompt(this.t('settings.selectOption'));
        
        switch (choice) {
            case '1':
                await this.exportSettings();
                break;
            case '2':
                await this.importSettings();
                break;
            case '3':
                await this.createBackup();
                break;
            case '4':
                await this.restoreFromBackup();
                break;
            case '5':
                await this.manageBackups();
                break;
            case 'b':
                return;
            default:
                this.error(this.t('common.invalidOption'));
                await this.pause();
                await this.showImportExport();
        }
    }

    /**
     * Export settings to a file
     */
    async exportSettings() {
        // Check admin PIN authentication if enabled
        if (isAdminPinEnabled()) {
            const pin = await this.promptPin('Enter admin PIN to export settings: ');
            if (!pin || !await this.adminAuth.verifyPin(pin)) {
                this.error('Invalid PIN. Export cancelled.');
                await this.pause();
                return;
            }
        }

        console.log('\nExport format options:');
        console.log(`  ${colors.cyan}1${colors.reset}) JSON (formatted)`);
        console.log(`  ${colors.cyan}2${colors.reset}) JSON (minified)`);
        console.log(`  ${colors.cyan}3${colors.reset}) JSON (with metadata)`);
        
        const formatChoice = await this.prompt('Select export format (1-3, default: 1): ') || '1';
        
        const filename = await this.prompt(this.t('settings.importExport.exportFilenamePrompt'));
        const exportFile = filename.trim() || `i18n-settings-${new Date().toISOString().split('T')[0]}.json`;
        
        let exportData;
        switch (formatChoice) {
            case '2':
                exportData = JSON.stringify(this.settings);
                break;
            case '3':
                exportData = JSON.stringify({
                    exportedAt: new Date().toISOString(),
                    version: this.settings.version || '1.6.3 (DEPRECATED - use latest version) ',
                    settings: this.settings
                }, null, 2);
                break;
            default:
                exportData = JSON.stringify(this.settings, null, 2);
        }

        try {
            fs.writeFileSync(exportFile, exportData);
            const stats = fs.statSync(exportFile);
            this.success(`Settings exported to ${exportFile}`);
            console.log(`  Size: ${Math.round(stats.size / 1024)}KB`);
            console.log(`  Format: ${formatChoice === '2' ? 'Minified JSON' : formatChoice === '3' ? 'JSON with metadata' : 'Formatted JSON'}`);
        } catch (error) {
            this.error(`Failed to export settings: ${error.message}`);
        }
        
        await this.pause();
    }

    /**
     * Import settings from a file
     */
    async importSettings() {
        // Check admin PIN authentication if enabled
        if (isAdminPinEnabled()) {
            const pin = await this.promptPin('Enter admin PIN to import settings: ');
            if (!pin || !await this.adminAuth.verifyPin(pin)) {
                this.error('Invalid PIN. Import cancelled.');
                await this.pause();
                return;
            }
        }

        const filename = await this.prompt(this.t('settings.importExport.importFilenamePrompt'));
        
        if (!filename.trim()) {
            return;
        }
        
        try {
            if (!fs.existsSync(filename)) {
                this.error('File not found.');
                await this.pause();
                return;
            }

            const fileContent = fs.readFileSync(filename, 'utf8');
            let importedSettings;
            
            try {
                const parsed = JSON.parse(fileContent);
                
                // Handle different import formats
                if (parsed.settings && parsed.exportedAt) {
                    // Format with metadata
                    importedSettings = parsed.settings;
                    console.log(`  Export date: ${new Date(parsed.exportedAt).toLocaleString()}`);
                    if (parsed.version) {
                        console.log(`  Version: ${parsed.version}`);
                    }
                } else {
                    // Direct settings format
                    importedSettings = parsed;
                }
            } catch (parseError) {
                this.error('Invalid JSON format in file.');
                await this.pause();
                return;
            }
            
            // Validate imported settings
            if (!settingsManager.validateSettings(importedSettings)) {
                this.error('Invalid settings file format.');
                await this.pause();
                return;
            }

            // Show import preview
            console.log('\nImport preview:');
            console.log(`  Languages: ${importedSettings.supportedLanguages?.join(', ') || 'Not specified'}`);
            console.log(`  Source directory: ${importedSettings.sourceDir || 'Not specified'}`);
            console.log(`  Output directory: ${importedSettings.outputDir || 'Not specified'}`);
            console.log(`  Admin PIN enabled: ${importedSettings.security?.adminPinEnabled || false}`);
            
            const confirm = await this.prompt(this.t('settings.importExport.importConfirm'));
            if (confirm.toLowerCase() === 'y') {
                this.settings = importedSettings;
                this.modified = true;
                this.success('Settings imported successfully.');
                // Save settings immediately
                try {
                    await this.saveSettings();
                } catch (error) {
                    this.error(`Failed to save settings: ${error.message}`);
                }
            }
        } catch (error) {
            this.error(`Failed to import settings: ${error.message}`);
        }
        
        await this.pause();
    }

    /**
     * Create a backup of current settings
     */
    async createBackup() {
        // Check admin PIN authentication if enabled
        if (isAdminPinEnabled()) {
            const pin = await this.promptPin('Enter admin PIN to create backup: ');
            if (!pin || !await this.adminAuth.verifyPin(pin)) {
                this.error('Invalid PIN. Backup creation cancelled.');
                await this.pause();
                return;
            }
        }

        try {
            const source = configManager.CONFIG_PATH;
            const backupDir = path.join(path.dirname(source), 'backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            const backupFile = path.join(backupDir, `config-backup-${Date.now()}.json`);
            fs.copyFileSync(source, backupFile);
            this.success(`Backup created: ${backupFile}`);

            const backupFiles = fs.readdirSync(backupDir)
                .filter(file => file.endsWith('.json') && file.includes('-backup-'));
            const totalSize = backupFiles.reduce((total, file) => {
                const filePath = path.join(backupDir, file);
                return total + fs.statSync(filePath).size;
            }, 0);
            console.log(`  Total backups: ${backupFiles.length}`);
            console.log(`  Total size: ${Math.round(totalSize / 1024)}KB`);
        } catch (error) {
            this.error(`Failed to create backup: ${error.message}`);
        }
        
        await this.pause();
    }

    /**
     * Restore settings from a backup file
     */
    async restoreFromBackup() {
        // Check admin PIN authentication if enabled
        if (isAdminPinEnabled()) {
            const pin = await this.promptPin('Enter admin PIN to restore from backup: ');
            if (!pin || !await this.adminAuth.verifyPin(pin)) {
                this.error('Invalid PIN. Restore cancelled.');
                await this.pause();
                return;
            }
        }

        try {
            const backupDir = path.join(path.dirname(configManager.CONFIG_PATH), 'backups');
            
            if (!fs.existsSync(backupDir)) {
                this.error('No backup directory found.');
                await this.pause();
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

            if (backupFiles.length === 0) {
                this.error('No backup files found.');
                await this.pause();
                return;
            }

            console.log('\nAvailable backup files:');
            backupFiles.forEach((file, index) => {
                const date = file.created.toLocaleDateString();
                const time = file.created.toLocaleTimeString();
                console.log(`  ${colors.cyan}${index + 1}${colors.reset}) ${file.name} (${date} ${time})`);
            });
            console.log();

            const choice = await this.prompt('Select backup file number (or press Enter to cancel): ');
            const index = parseInt(choice) - 1;

            if (isNaN(index) || index < 0 || index >= backupFiles.length) {
                this.error('Invalid selection.');
                await this.pause();
                return;
            }

            const selectedBackup = backupFiles[index];
            
            const confirm = await this.prompt(`Restore from ${selectedBackup.name}? This will overwrite current settings. (y/n): `);
            if (confirm.toLowerCase() === 'y') {
                const importedSettings = JSON.parse(fs.readFileSync(selectedBackup.path, 'utf8'));
                
                // Validate imported settings
                if (!settingsManager.validateSettings(importedSettings)) {
                    this.error('Invalid backup file format.');
                    await this.pause();
                    return;
                }

                this.settings = importedSettings;
                this.modified = true;
                this.success(`Settings restored from ${selectedBackup.name}`);
                
                // Save settings immediately
                try {
                    await this.saveSettings();
                } catch (error) {
                    this.error(`Failed to save settings: ${error.message}`);
                }
            }
        } catch (error) {
            this.error(`Failed to restore from backup: ${error.message}`);
        }
        
        await this.pause();
    }

    /**
     * Manage backup files - view, delete, and clean up old backups
     */
    async manageBackups() {
        // Check admin PIN authentication if enabled
        if (isAdminPinEnabled()) {
            const pin = await this.promptPin('Enter admin PIN to manage backups: ');
            if (!pin || !await this.adminAuth.verifyPin(pin)) {
                this.error('Invalid PIN. Backup management cancelled.');
                await this.pause();
                return;
            }
        }

        try {
            const backupDir = path.join(path.dirname(configManager.CONFIG_PATH), 'backups');
            
            if (!fs.existsSync(backupDir)) {
                this.error('No backup directory found.');
                await this.pause();
                return;
            }

            while (true) {
                this.clearScreen();
                this.showHeader();
                console.log(`${colors.bright}Manage Backup Files${colors.reset}\n`);

                const backupFiles = fs.readdirSync(backupDir)
                    .filter(file => file.endsWith('.json') && file.includes('-backup-'))
                    .map(file => {
                        const filePath = path.join(backupDir, file);
                        const stats = fs.statSync(filePath);
                        return {
                            name: file,
                            path: filePath,
                            created: stats.mtime,
                            size: stats.size
                        };
                    })
                    .sort((a, b) => b.created - a.created);

                if (backupFiles.length === 0) {
                    console.log('No backup files found.');
                    await this.pause();
                    return;
                }

                let totalSize = 0;
                console.log('\nBackup files:');
                backupFiles.forEach((file, index) => {
                    const date = file.created.toLocaleDateString();
                    const time = file.created.toLocaleTimeString();
                    const size = Math.round(file.size / 1024);
                    totalSize += file.size;
                    console.log(`  ${colors.cyan}${index + 1}${colors.reset}) ${file.name} (${date} ${time}) - ${size}KB`);
                });

                console.log(`\nTotal: ${backupFiles.length} files, ${Math.round(totalSize / 1024)}KB`);
                console.log(`\n  ${colors.cyan}1${colors.reset}) Delete specific backup`);
                console.log(`  ${colors.cyan}2${colors.reset}) Delete old backups (keep last 10)`);
                console.log(`  ${colors.cyan}3${colors.reset}) Delete all backups`);
                console.log(`  ${colors.yellow}b${colors.reset}) Back to Import/Export menu`);

                const choice = await this.prompt('\nSelect option: ');
                
                switch (choice) {
                    case '1':
                        await this.deleteSpecificBackup(backupFiles);
                        break;
                    case '2':
                        await this.cleanupOldBackups(backupFiles);
                        break;
                    case '3':
                        await this.deleteAllBackups(backupFiles);
                        break;
                    case 'b':
                        return;
                    default:
                        this.error('Invalid option.');
                        await this.pause();
                }
            }
        } catch (error) {
            this.error(`Failed to manage backups: ${error.message}`);
            await this.pause();
        }
    }

    /**
     * Delete a specific backup file
     */
    async deleteSpecificBackup(backupFiles) {
        const choice = await this.prompt('Enter backup number to delete (or press Enter to cancel): ');
        const index = parseInt(choice) - 1;

        if (isNaN(index) || index < 0 || index >= backupFiles.length) {
            this.error('Invalid selection.');
            await this.pause();
            return;
        }

        const selectedBackup = backupFiles[index];
        const confirm = await this.prompt(`Delete ${selectedBackup.name}? (y/n): `);
        
        if (confirm.toLowerCase() === 'y') {
            try {
                fs.unlinkSync(selectedBackup.path);
                this.success(`Deleted ${selectedBackup.name}`);
            } catch (error) {
                this.error(`Failed to delete backup: ${error.message}`);
            }
            await this.pause();
        }
    }

    /**
     * Clean up old backups, keeping only the most recent ones
     */
    async cleanupOldBackups(backupFiles) {
        const keepCount = 10;
        if (backupFiles.length <= keepCount) {
            console.log(`Less than ${keepCount} backups found. No cleanup needed.`);
            await this.pause();
            return;
        }

        const filesToDelete = backupFiles.slice(keepCount);
        console.log(`\nWill delete ${filesToDelete.length} old backup files:`);
        filesToDelete.forEach(file => {
            const date = file.created.toLocaleDateString();
            console.log(`  - ${file.name} (${date})`);
        });

        const confirm = await this.prompt('\nProceed with cleanup? (y/n): ');
        if (confirm.toLowerCase() === 'y') {
            let deletedCount = 0;
            filesToDelete.forEach(file => {
                try {
                    fs.unlinkSync(file.path);
                    deletedCount++;
                } catch (error) {
                    this.error(`Failed to delete ${file.name}: ${error.message}`);
                }
            });
            this.success(`Cleaned up ${deletedCount} old backup files`);
            await this.pause();
        }
    }

    /**
     * Delete all backup files
     */
    async deleteAllBackups(backupFiles) {
        console.log(`\nWARNING: This will delete all ${backupFiles.length} backup files!`);
        const confirm = await this.prompt('Type "DELETE ALL" to confirm: ');
        
        if (confirm === 'DELETE ALL') {
            let deletedCount = 0;
            backupFiles.forEach(file => {
                try {
                    fs.unlinkSync(file.path);
                    deletedCount++;
                } catch (error) {
                    this.error(`Failed to delete ${file.name}: ${error.message}`);
                }
            });
            this.success(`Deleted ${deletedCount} backup files`);
            await this.pause();
        }
    }

    /**
     * Reset settings to defaults
     */
    async resetToDefaults() {
        // Check admin PIN authentication if enabled
        if (isAdminPinEnabled()) {
            const pin = await this.promptPin('Enter admin PIN to reset settings: ');
            if (!pin || !await this.adminAuth.verifyPin(pin)) {
                this.error('Invalid PIN. Reset cancelled.');
                await this.pause();
                return;
            }
        }

        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}${this.t('settings.resetToDefaultsTitle')}${colors.reset}\n`);
        console.log(`${colors.yellow}${this.t('settings.resetWarning1')}${colors.reset}`);
        console.log(`${colors.yellow}${this.t('settings.resetWarning2')}${colors.reset}\n`);
        
        const confirm = await this.prompt(this.t('settings.resetConfirm'));
        
        if (confirm.toLowerCase() === 'y') {
            try {
                await this.adminAuth.disableAuth();
                await configManager.resetToDefaults();
                this.settings = configManager.getConfig();
                this.modified = false;
                this.adminAuthenticated = false;
                this.success(this.t('settings.resetDone'));
            } catch (error) {
                this.error(`Failed to reset settings: ${error.message}`);
            }
        }
        
        await this.pause();
    }

    /**
     * Reset script directories to defaults
     */
    async resetScriptDirectories() {
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}${this.t('settings.resetScriptDirectoriesTitle')}${colors.reset}\n`);
        console.log(`${colors.yellow}${this.t('settings.resetScriptDirectoriesWarning1')}${colors.reset}`);
        console.log(`${colors.yellow}${this.t('settings.resetScriptDirectoriesWarning2')}${colors.reset}\n`);
        
        const confirm = await this.prompt(this.t('settings.resetScriptDirectoriesConfirm'));
        
        if (confirm.toLowerCase() === 'y') {
            try {
                // Reset all script directory settings to null (use system defaults)
                const scriptDirKeys = [
                    'scriptDirectories.analyze',
                    'scriptDirectories.complete',
                    'scriptDirectories.init',
                    'scriptDirectories.manage',
                    'scriptDirectories.sizing',
                    'scriptDirectories.summary',
                    'scriptDirectories.usage',
                    'scriptDirectories.validate'
                ];
                
                scriptDirKeys.forEach(key => {
                    this.setNestedValue(this.settings, key, null);
                });
                
                this.modified = true;
                this.success(this.t('settings.resetScriptDirsDone'));
                // Save settings immediately
                try {
                    await this.saveSettings();
                } catch (error) {
                    this.error(`Failed to save settings: ${error.message}`);
                }
            } catch (error) {
                this.error(`Failed to reset script directories: ${error.message}`);
            }
        }
        
        await this.pause();
    }

    /**
     * Save current settings
     */
    async saveSettings() {
        try {
            await configManager.updateConfig(this.settings);
            await configManager.saveConfig();
            this.modified = false;
            this.success('Settings saved successfully.');
        } catch (error) {
            this.error(`Failed to save settings: ${error.message}`);
        }
        
        await this.pause();
    }

    /**
     * Show help information
     */
    async showHelp() {
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}${this.t('settings.help.title')}${colors.reset}\n`);
        console.log(`${colors.cyan}${this.t('settings.help.navigationTitle')}${colors.reset}`);
        console.log(`${this.t('settings.help.navigation1')}`);
        console.log(`${this.t('settings.help.navigation2')}`);
        console.log(`${this.t('settings.help.navigation3')}`);
        console.log(`${this.t('settings.help.navigation4')}\n`);

        console.log(`${colors.cyan}${this.t('settings.help.categoriesTitle')}${colors.reset}`);
        console.log(`${this.t('settings.help.categoryUI')}`);
        console.log(`${this.t('settings.help.categoryDirectory')}`);
        console.log(`${this.t('settings.help.categoryProcessing')}`);
        console.log(`${this.t('settings.help.categoryAdvanced')}\n`);



        console.log(`${colors.cyan}${this.t('settings.help.cliUsageTitle')}${colors.reset}`);
        console.log(`${this.t('settings.help.cliUsage1')}`);
        console.log(`${this.t('settings.help.cliUsage2')}`);
        console.log(`${this.t('settings.help.cliUsage3')}\n`);
        
        console.log(`${this.t('settings.pressEnter')}\n`);
        await this.prompt('');
    }

    /**
     * Report a bug - opens GitHub issues page
     */
    async reportBug() {
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}${this.t('settings.reportBug.title')}${colors.reset}\n`);
        console.log(this.t('settings.reportBug.description'));
        console.log(`
${colors.dim}${this.t('settings.reportBug.link')}: https://github.com/vladnoskv/i18ntk/issues${colors.reset}
`);

        try {
            const { exec } = require('child_process');
            const url = 'https://github.com/vladnoskv/i18ntk/issues';
            
            // Try to open the URL in the default browser
            let command;
            switch (process.platform) {
                case 'darwin': // macOS
                    command = `open "${url}"`;
                    break;
                case 'win32': // Windows
                    command = `start "" "${url}"`;
                    break;
                default: // Linux and others
                    command = `xdg-open "${url}"`;
                    break;
            }
            
            exec(command, (error) => {
                if (error) {
                    console.log(`${colors.yellow}${this.t('settings.reportBug.browserOpenFailed')}${colors.reset}`);
                    console.log(`${this.t('settings.reportBug.manualVisit', { url: url })}`);
                } else {
                    console.log(`${colors.green}${this.t('settings.reportBug.browserOpened')}${colors.reset}`);
                }
            });
        } catch (error) {
            console.log(`${colors.yellow}${this.t('settings.reportBug.browserOpenFailed')}${colors.reset}`);
            console.log(`${this.t('settings.reportBug.manualVisit', { url: 'https://github.com/vladnoskv/i18ntk/issues' })}`);
        }
        
        await this.pause();
    }

    /**
     * Update the i18n-toolkit package via npm
     */
    async updatePackage() {
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}${this.t('settings.updatePackage.title')}${colors.reset}\n`);
        console.log(this.t('settings.updatePackage.description'));
        console.log(`
${colors.dim}${this.t('settings.updatePackage.command')}: npm update i18ntk -g${colors.reset}
`);

        const confirm = await this.prompt(this.t('settings.updatePackage.prompt'));

        if (confirm.toLowerCase() === 'y') {
            try {
                const { exec } = require('child_process');
                console.log(this.t('settings.updatePackage.updating'));
                exec('npm update i18ntk -g', (error, stdout, stderr) => {
                    if (error) {
                        this.error(`${this.t('settings.updatePackage.error')}: ${error.message}`);
                        console.error(stderr);
                    } else {
                        this.success(this.t('settings.updatePackage.success'));
                        console.log(stdout);
                    }
                    this.pause();
                });
            } catch (error) {
                this.error(`${this.t('settings.updatePackage.error')}: ${error.message}`);
                this.pause();
            }
        } else {
            this.warning(this.t('settings.updatePackage.cancelled'));
            await this.pause();
        }
    }

    /**
     * Quit the application
     */
    async quit() {
        if (this.modified) {
            console.log(`\n${colors.yellow}${this.t('settings.mainMenu.unsavedChangesWarning')}${colors.reset}`);
            const save = await this.prompt(this.t('settings.mainMenu.saveChangesBeforeQuit'));

            if (save.toLowerCase() !== 'n') {
                await this.saveSettings();
            }
        }

        console.log(`\n${colors.green}${this.t('settings.goodbyeMessage')}${colors.reset}`);
        closeGlobalReadline();
        process.exit(0);
    }

    // Utility methods

    /**
     * Prompt user for input
     */
    prompt(question) {
        return cliHelper.prompt(question);
    }

    /**
     * Pause and wait for user input
     */
    async pause() {
        await this.prompt('Press Enter to continue...');
    }

    /**
     * Display success message
     */
    success(message) {
        console.log(`${colors.green}✅ ${message}${colors.reset}`);
    }

    /**
     * Display error message
     */
    error(message) {
        console.log(`${colors.red}❌ ${message}${colors.reset}`);
    }

    /**
     * Display warning message
     */
    warning(message) {
        console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
    }

    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }

    /**
     * Set nested value in object using dot notation
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            return current[key];
        }, obj);
        target[lastKey] = value;
    }

    /**
     * Get schema for a specific setting
     */
    getSettingSchema(path) {
        // This would need to be implemented based on your schema structure
        return this.schema && this.schema.properties ? 
            this.getNestedValue(this.schema.properties, path) : null;
    }

    /**
     * Format value for display
     */
    formatValue(value, key = '') {
        if (value === null || value === undefined) {
            return `${colors.dim}(not set)${colors.reset}`;
        }
        const lowerKey = key.toLowerCase();
        if (typeof value === 'string' && (lowerKey.includes('dir') || lowerKey.includes('path') || lowerKey.includes('root'))) {
            return configManager.toRelative(path.resolve(value));
        }
        if (typeof value === 'boolean') {
            return value ? `${colors.green}enabled${colors.reset}` : `${colors.red}disabled${colors.reset}`;
        }
        if (Array.isArray(value)) {
            return `[${value.join(', ')}]`;
        }
        return String(value);
    }

    /**
     * Convert string input to appropriate type
     */
    convertValue(input, schema, key = '') {
        const raw = String(input).trim();
        const lower = raw.toLowerCase();

        // Fallback coercion when schema is missing
        if (!schema) {
            // Booleans
            if (['true','yes','y','1','on','enabled'].includes(lower)) return true;
            if (['false','no','n','0','off','disabled'].includes(lower)) return false;

            // Numbers for known numeric settings
            const numericKeys = /(sessionTimeout|maxFailedAttempts|lockoutDuration|retentionDays|maxBackups|advanced\.|backup\.)/;
            if (numericKeys.test(key)) {
                const n = Number(raw);
                if (!Number.isNaN(n)) return n;
            }
            return raw;
        }
        
        switch (schema.type) {
            case 'boolean':
                const lower = input.toLowerCase();
                if (['true', 'yes', 'y', '1', 'on', 'enabled'].includes(lower)) {
                    return true;
                }
                if (['false', 'no', 'n', '0', 'off', 'disabled'].includes(lower)) {
                    return false;
                }
                return null;
            
            case 'number':
            case 'integer':
                const num = Number(input);
                return isNaN(num) ? null : num;
            
            case 'array':
                try {
                    return input.split(',').map(s => s.trim());
                } catch {
                    return null;
                }
            
            default:
                return input;
        }
    }

    /**
     * Run method for compatibility with manager
     */
    async run() {
        try {
            console.log(this.t('settings.startingSettings'));
            await this.start();
        } catch (error) {
            console.error('❌ Settings CLI Error:', error.message);
            console.error('Stack trace:', error.stack);
            throw error;
        }
    }
}

// Export the class
module.exports = SettingsCLI;

// If run directly, start the CLI
if (require.main === module) {
    const args = process.argv.slice(2);
    
    // Handle --help flag
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
🌍 i18n Toolkit Settings CLI

Usage: node settings/settings-cli.js [options]

Options:
  --help, -h    Show this help message

Interactive Commands:
  1) UI Settings          - Configure language, theme, and UI preferences
  2) Directory Settings    - Set source and output directories
  3) Script Directories   - Configure script-specific paths
  4) Processing Settings  - Batch size, concurrency, thresholds
  5) Security Settings    - Admin PIN, session management
  6) Advanced Settings   - Strict mode, audit logging, backups
  7) View All Settings   - Display current configuration
  8) Import/Export       - Backup and restore settings
  9) Reset to Defaults   - Restore factory settings
  0) Report Bug          - Generate bug report
  u) Update Package      - Update i18n toolkit
  s) Save Changes        - Save current configuration
  h) Help               - Show available commands
  q) Quit               - Exit settings CLI

Examples:
  node settings/settings-cli.js
  npm run i18ntk:settings

Note: Use arrow keys and Enter to navigate the interactive menu.
`);
        process.exit(0);
    }
    
    const cli = new SettingsCLI();
    cli.start().catch(error => {
        console.error('❌ Failed to start settings CLI:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    });
}