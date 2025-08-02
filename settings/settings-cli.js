/**
 * Settings CLI Interface
 * Interactive terminal-based settings management for i18n toolkit
 * No external dependencies - uses Node.js built-in readline
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const settingsManager = require('./settings-manager');
const UIi18n = require('../main/i18ntk-ui');
const AdminPinManager = require('../utils/admin-pin');
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

class SettingsCLI {
    constructor() {
        // Check if there's already an active readline interface
        if (global.activeReadlineInterface) {
            this.rl = global.activeReadlineInterface;
            this.shouldCloseRL = false;
        } else {
            this.rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
                terminal: true,
                historySize: 0
            });
            this.shouldCloseRL = true;
            global.activeReadlineInterface = this.rl;
        }
        this.settings = null;
        this.schema = null;
        this.modified = false;
        this.adminPin = new AdminPinManager();
        this.adminAuthenticated = false;
    }

    /**
     * Translation helper function
     */
    t(key, params = {}) {
        return uiI18n.t(key, params);
    }

    /**
     * Initialize the CLI interface
     */
    async init() {
        try {
            this.settings = settingsManager.getSettings();
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
        const title = uiI18n.t('operations.settings.title') || 'Settings Management';
        const separator = uiI18n.t('operations.settings.separator') || '============================================================';
        
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
        const options = [
            { key: '1', label: this.t('settings.mainMenu.uiSettings'), description: this.t('settings.mainMenu.uiSettingsDesc') },
            { key: '2', label: this.t('settings.mainMenu.directorySettings'), description: this.t('settings.mainMenu.directorySettingsDesc') },
            { key: '3', label: this.t('settings.mainMenu.scriptDirectorySettings'), description: this.t('settings.mainMenu.scriptDirectorySettingsDesc') },
            { key: '4', label: this.t('settings.mainMenu.processingSettings'), description: this.t('settings.mainMenu.processingSettingsDesc') },
            { key: '5', label: this.t('settings.mainMenu.advancedSettings'), description: this.t('settings.mainMenu.advancedSettingsDesc') },
            { key: '6', label: this.t('settings.mainMenu.viewAllSettings'), description: this.t('settings.mainMenu.viewAllSettingsDesc') },
            { key: '7', label: this.t('settings.mainMenu.importExport'), description: this.t('settings.mainMenu.importExportDesc') },
            { key: '8', label: this.t('settings.mainMenu.resetToDefaults'), description: this.t('settings.mainMenu.resetToDefaultsDesc') },
            { key: '9', label: this.t('settings.mainMenu.reportBug'), description: this.t('settings.mainMenu.reportBugDesc') },
            { key: '0', label: this.t('settings.mainMenu.updatePackage'), description: this.t('settings.mainMenu.updatePackageDesc') },
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
                await this.showAdvancedSettings();
                break;
            case '6':
                await this.showAllSettings();
                break;
            case '7':
                await this.showImportExport();
                break;
            case '8':
                await this.resetToDefaults();
                break;
            case '9':
                await this.reportBug();
                break;
            case '0':
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
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}${this.t('settings.categories.uiSettings')}${colors.reset}\n`);

        const uiSettings = {
            'language': this.t('settings.fields.language.label'),
            'theme': this.t('settings.fields.theme.label'),
            'dateFormat': this.t('settings.fields.dateFormat.label'),
            'notifications.enabled': this.t('settings.fields.notifications.enabled.label')
        };

        await this.showSettingsCategory(uiSettings);
    }

    /**
     * Show directory settings menu
     */
    async showDirectorySettings() {
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}${this.t('settings.categories.directorySettings')}${colors.reset}\n`);

        const dirSettings = {
            'sourceDir': this.t('settings.fields.sourceDir.label'),
            'outputDir': this.t('settings.fields.outputDir.label')
        };

        await this.showSettingsCategory(dirSettings);
    }

    /**
     * Show script-specific directory settings menu
     */
    async showScriptDirectorySettings() {
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
    async showAdvancedSettings() {
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
     * Show settings category with edit options
     */
    async showSettingsCategory(categorySettings) {
        const keys = Object.keys(categorySettings);
        
        // Display current values
        keys.forEach((key, index) => {
            const value = this.getNestedValue(this.settings, key);
            const displayValue = this.formatValue(value);
            console.log(`  ${colors.cyan}${index + 1}${colors.reset}) ${categorySettings[key]}`);
            console.log(`     ${colors.dim}${this.t('settings.current')}: ${colors.reset}${displayValue}`);
        });

        console.log(`\n  ${colors.yellow}b${colors.reset}) ${this.t('settings.back')}`);
        
        // Add reset option for script directories
        const isScriptDirectory = Object.keys(categorySettings).some(key => key.startsWith('scriptDirectories.'));
        if (isScriptDirectory) {
            console.log(`  ${colors.red}r${colors.reset}) ${this.t('settings.resetScriptDirectories')}`);
        }
        console.log();

        const choice = await this.prompt(this.t('settings.selectSettingPrompt'));
        
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
            'language': ['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'],
            'theme': ['light', 'dark', 'auto'],
            'dateFormat': ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM-DD-YYYY'],
            'notifications.enabled': ['true', 'false'],
            'advanced.strictMode': ['true', 'false'],
            'debug.enabled': ['true', 'false'],
            'debug.verboseLogging': ['true', 'false'],
            'security.adminPinEnabled': ['true', 'false'],
            'advanced.backupBeforeChanges': ['true', 'false']
        };
        
        return validOptions[key] || null;
    }

    /**
     * Validate input value
     */
    validateInput(value, key, schema) {
        const validOptions = this.getValidOptions(key, schema);
        
        if (validOptions) {
            if (!validOptions.includes(value.toLowerCase())) {
                return { valid: false, message: `Invalid option. Valid options: ${validOptions.join(', ')}` };
            }
        }
        
        // Numeric validations
        if (key.includes('batchSize')) {
            const num = parseInt(value);
            if (isNaN(num) || num < 1 || num > 100) {
                return { valid: false, message: 'Batch size must be between 1 and 100.' };
            }
        }
        
        if (key.includes('concurrentFiles')) {
            const num = parseInt(value);
            if (isNaN(num) || num < 1 || num > 20) {
                return { valid: false, message: 'Concurrent files must be between 1 and 20.' };
            }
        }
        
        if (key.includes('sizingThreshold')) {
            const num = parseInt(value);
            if (isNaN(num) || num < 1 || num > 10000) {
                return { valid: false, message: 'Sizing threshold must be between 1 and 10000 KB.' };
            }
        }
        
        if (key.includes('autoSave') || key.includes('sessionTimeout')) {
            const num = parseInt(value);
            if (isNaN(num) || num < 0 || num > 60) {
                return { valid: false, message: 'Value must be between 0 and 60 minutes.' };
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
        
        // Check if admin authentication is required
        if (this.requiresAdminAuth(key) && !this.adminAuthenticated) {
            console.log(`\n${this.t('settings.admin.authRequired', { label: label })}`);
            const authenticated = await this.adminPin.verifyPin();
            if (!authenticated) {
                console.log(this.t('settings.admin.accessDenied'));
                await this.pause();
                return;
            }
            this.adminAuthenticated = true;
        }
        
        const currentValue = this.getNestedValue(this.settings, key);
        const schema = this.getSettingSchema(key);
        
        console.log(`\n${colors.bright}${this.t('settings.editing')}: ${label}${colors.reset}`);
        
        // Show helper text
        const helperText = this.getHelperText(key);
        console.log(`${colors.dim}${helperText}${colors.reset}\n`);
        
        // Show current value with special handling for admin PIN
        if (key === 'security.adminPinEnabled') {
            const pinDisplay = this.adminPin.getPinDisplay();
            console.log(`${this.t('settings.current')}: ${this.formatValue(currentValue)} (${this.t('settings.pin')}: ${pinDisplay})`);
        } else {
            console.log(`${this.t('settings.current')}: ${this.formatValue(currentValue)}`);
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
        const convertedValue = this.convertValue(newValue.trim(), schema);
        if (convertedValue === null) {
            this.error(this.t('settings.invalidValueFormat'));
            await this.pause();
            return;
        }
        
        // Special handling for admin PIN setup
        if (key === 'security.adminPinEnabled' && convertedValue === true && !this.adminPin.isPinSet()) {
            console.log(this.t('settings.admin.setupPin'));
            const pinSetup = await this.adminPin.setupPin();
            if (!pinSetup) {
                console.log(this.t('settings.admin.setupFailed'));
                await this.pause();
                return;
            }
        }
        
        // Update the setting
        this.setNestedValue(this.settings, key, convertedValue);
        this.modified = true;
        
        // Special handling for language changes
        if (key === 'language') {
            // Refresh UI language immediately
            if (typeof uiI18n.refreshLanguageFromSettings === 'function') {
                uiI18n.refreshLanguageFromSettings();
            }
        }
        
        this.success(this.t('settings.updatedSuccessfully', { setting: label }));
        await this.pause();
    }

    /**
     * Handle PIN setup/change
     */
    async handlePinSetup() {
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}${this.t('settings.admin.pinSetupTitle')}${colors.reset}\n`);
        
        if (this.adminPin.isPinSet()) {
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
                    const verified = await this.adminPin.verifyPin();
                    if (verified) {
                        console.log(this.t('settings.admin.settingNewPin'));
                        const success = await this.adminPin.setupPin();
                        if (success) {
                            this.success('Admin PIN updated successfully!');
                        } else {
                            this.error('Failed to update admin PIN.');
                        }
                    }
                    break;
                case '2':
                    console.log(this.t('settings.admin.verifyToRemove'));
                    const verifiedForRemoval = await this.adminPin.verifyPin();
                    if (verifiedForRemoval) {
                        // Remove PIN file
                        const fs = require('fs');
                        const pinFile = this.adminPin.pinFile;
                        if (fs.existsSync(pinFile)) {
                            fs.unlinkSync(pinFile);
                            this.success('Admin PIN protection removed.');
                        }
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
                const success = await this.adminPin.setupPin();
                if (success) {
                    this.success('Admin PIN configured successfully!');
                    // Enable admin PIN protection in settings
                    this.setNestedValue(this.settings, 'security.adminPinEnabled', true);
                    this.modified = true;
                } else {
                    this.error('Failed to configure admin PIN.');
                }
            } else {
                console.log(this.t('settings.admin.setupCancelled'));
            }
        }
        
        await this.pause();
    }

    /**
     * Show all current settings
     */
    async showAllSettings() {
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}${this.t('settings.viewAll.title')}${colors.reset}\n`);
        
        this.displaySettingsTree(this.settings, '');
        
        console.log(`\n${this.t('settings.pressEnter')}...`);
        await this.prompt('');
    }

    /**
     * Display settings in a tree format
     */
    displaySettingsTree(obj, prefix) {
        Object.keys(obj).forEach(key => {
            const value = obj[key];
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                console.log(`${prefix}${colors.bright}${key}:${colors.reset}`);
                this.displaySettingsTree(value, prefix + '  ');
            } else {
                console.log(`${prefix}${colors.cyan}${key}:${colors.reset} ${this.formatValue(value)}`);
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
        const filename = await this.prompt(this.t('settings.importExport.exportFilenamePrompt'));
        const exportFile = filename.trim() || `i18n-settings-${new Date().toISOString().split('T')[0]}.json`;
        
        try {
            fs.writeFileSync(exportFile, JSON.stringify(this.settings, null, 2));
            this.success(`Settings exported to ${exportFile}`);
        } catch (error) {
            this.error(`Failed to export settings: ${error.message}`);
        }
        
        await this.pause();
    }

    /**
     * Import settings from a file
     */
    async importSettings() {
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
            
            const importedSettings = JSON.parse(fs.readFileSync(filename, 'utf8'));
            
            // Validate imported settings
            if (!settingsManager.validateSettings(importedSettings)) {
                this.error('Invalid settings file format.');
                await this.pause();
                return;
            }
            
            const confirm = await this.prompt(this.t('settings.importExport.importConfirm'));
            if (confirm.toLowerCase() === 'y') {
                this.settings = importedSettings;
                this.modified = true;
                this.success('Settings imported successfully.');
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
        try {
            const backupFile = settingsManager.createBackup();
            this.success(`Backup created: ${backupFile}`);
        } catch (error) {
            this.error(`Failed to create backup: ${error.message}`);
        }
        
        await this.pause();
    }

    /**
     * Reset settings to defaults
     */
    async resetToDefaults() {
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}${this.t('settings.resetToDefaultsTitle')}${colors.reset}\n`);
        console.log(`${colors.yellow}${this.t('settings.resetWarning1')}${colors.reset}`);
        console.log(`${colors.yellow}${this.t('settings.resetWarning2')}${colors.reset}\n`);
        
        const confirm = await this.prompt(this.t('settings.resetConfirm'));
        
        if (confirm.toLowerCase() === 'y') {
            try {
                settingsManager.resetToDefaults();
                this.settings = settingsManager.getSettings();
                this.modified = false;
                this.success('Settings reset to defaults successfully.');
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
                this.success('Script directories reset to system defaults successfully.');
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
            const success = settingsManager.saveSettings(this.settings);
            if (success) {
                this.modified = false;
                this.success('Settings saved successfully.');
            } else {
                this.error('Failed to save settings.');
            }
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

        console.log(`${colors.cyan}${this.t('settings.help.envVarsTitle')}${colors.reset}`);
        console.log(`${this.t('settings.help.envVar1')}`);
        console.log(`${this.t('settings.help.envVar2')}`);
        console.log(`${this.t('settings.help.envVar3')}\n`);

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
${colors.dim}${this.t('settings.reportBug.link')}: https://github.com/vladnoskv/i18n-management-toolkit-main/issues${colors.reset}
`);

        try {
            const { exec } = require('child_process');
            const url = 'https://github.com/vladnoskv/i18n-management-toolkit-main/issues';
            
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
            console.log(`${this.t('settings.reportBug.manualVisit', { url: 'https://github.com/vladnoskv/i18n-management-toolkit-main/issues' })}`);
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
        this.rl.close();
        process.exit(0);
    }

    // Utility methods

    /**
     * Prompt user for input
     */
    prompt(question) {
        return new Promise(resolve => {
            this.rl.question(question, resolve);
        });
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
    formatValue(value) {
        if (value === null || value === undefined) {
            return `${colors.dim}(not set)${colors.reset}`;
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
    convertValue(input, schema) {
        if (!schema) {
            return input;
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
    const cli = new SettingsCLI();
    cli.start().catch(error => {
        console.error('❌ Failed to start settings CLI:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    });
}