/**
 * Settings CLI Interface
 * Interactive terminal-based settings management for i18n toolkit
 * No external dependencies - uses Node.js built-in readline
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const settingsManager = require('./settings-manager');
const uiI18n = require('./ui-i18n');

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
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true,
            historySize: 0
        });
        this.settings = null;
        this.schema = null;
        this.modified = false;
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
            this.error(`Failed to initialize settings: ${error.message}`);
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
            console.log(`${colors.yellow}⚠️  You have unsaved changes${colors.reset}\n`);
        }
    }

    /**
     * Show the main menu
     */
    async showMainMenu() {
        const options = [
            { key: '1', label: 'UI Settings', description: 'Language, theme, and interface options' },
            { key: '2', label: 'Directory Settings', description: 'Source and output directory paths' },
            { key: '3', label: 'Processing Settings', description: 'Batch size, concurrency, and performance' },
            { key: '4', label: 'Advanced Settings', description: 'Validation, logging, and expert options' },
            { key: '5', label: 'View All Settings', description: 'Display current configuration' },
            { key: '6', label: 'Import/Export', description: 'Backup and restore settings' },
            { key: '7', label: 'Reset to Defaults', description: 'Restore factory settings' },
            { key: '8', label: 'Report Bug', description: 'Submit an issue report on GitHub' },
            { key: 's', label: 'Save Changes', description: 'Save current settings to file' },
            { key: 'h', label: 'Help', description: 'Show detailed help information' },
            { key: 'q', label: 'Quit', description: 'Exit settings (with save prompt if needed)' }
        ];

        console.log(`${colors.bright}Main Menu:${colors.reset}\n`);
        
        options.forEach(option => {
            const keyColor = option.key.match(/[0-9]/) ? colors.cyan : colors.yellow;
            console.log(`  ${keyColor}${option.key}${colors.reset}) ${colors.bright}${option.label}${colors.reset}`);
            console.log(`     ${colors.dim}${option.description}${colors.reset}`);
        });

        console.log();
        const choice = await this.prompt('Select an option: ');
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
                await this.showProcessingSettings();
                break;
            case '4':
                await this.showAdvancedSettings();
                break;
            case '5':
                await this.showAllSettings();
                break;
            case '6':
                await this.showImportExport();
                break;
            case '7':
                await this.resetToDefaults();
                break;
            case '8':
                await this.reportBug();
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
        console.log(`${colors.bright}UI Settings${colors.reset}\n`);

        const uiSettings = {
            'ui.language': 'Interface Language',
            'ui.theme': 'Color Theme',
            'ui.dateFormat': 'Date Format',
            'ui.notifications': 'Show Notifications'
        };

        await this.showSettingsCategory(uiSettings);
    }

    /**
     * Show directory settings menu
     */
    async showDirectorySettings() {
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}Directory Settings${colors.reset}\n`);

        const dirSettings = {
            'directories.locales': 'Locales Directory',
            'directories.reports': 'Reports Directory',
            'directories.backup': 'Backup Directory'
        };

        await this.showSettingsCategory(dirSettings);
    }

    /**
     * Show processing settings menu
     */
    async showProcessingSettings() {
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}Processing Settings${colors.reset}\n`);

        const processSettings = {
            'processing.batchSize': 'Batch Size',
            'processing.concurrentFiles': 'Concurrent Files',
            'processing.sizingThreshold': 'Sizing Threshold (KB)',
            'processing.autoSave': 'Auto-save Interval (minutes)'
        };

        await this.showSettingsCategory(processSettings);
    }

    /**
     * Show advanced settings menu
     */
    async showAdvancedSettings() {
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}Advanced Settings${colors.reset}\n`);

        const advancedSettings = {
            'validation.strictMode': 'Strict Validation Mode',
            'logging.level': 'Logging Level',
            'logging.auditLog': 'Enable Audit Log',
            'backup.enabled': 'Auto Backup',
            'backup.maxFiles': 'Max Backup Files'
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
            console.log(`     ${colors.dim}Current: ${colors.reset}${displayValue}`);
        });

        console.log(`\n  ${colors.yellow}b${colors.reset}) Back to main menu`);
        console.log();

        const choice = await this.prompt('Select setting to edit (or b for back): ');
        
        if (choice.toLowerCase() === 'b') {
            return;
        }

        const index = parseInt(choice) - 1;
        if (index >= 0 && index < keys.length) {
            const key = keys[index];
            await this.editSetting(key, categorySettings[key]);
            await this.showSettingsCategory(categorySettings);
        } else {
            this.error('Invalid option.');
            await this.pause();
            await this.showSettingsCategory(categorySettings);
        }
    }

    /**
     * Edit a specific setting
     */
    async editSetting(key, label) {
        const currentValue = this.getNestedValue(this.settings, key);
        const schema = this.getSettingSchema(key);
        
        console.log(`\n${colors.bright}Editing: ${label}${colors.reset}`);
        console.log(`Current value: ${this.formatValue(currentValue)}`);
        
        if (schema && schema.description) {
            console.log(`${colors.dim}${schema.description}${colors.reset}`);
        }
        
        if (schema && schema.enum) {
            console.log(`\nValid options:`);
            schema.enum.forEach((option, index) => {
                console.log(`  ${index + 1}) ${option}`);
            });
        }
        
        console.log();
        const newValue = await this.prompt(`Enter new value (or press Enter to keep current): `);
        
        if (newValue.trim() === '') {
            return;
        }
        
        // Validate and convert the input
        const convertedValue = this.convertValue(newValue, schema);
        if (convertedValue === null) {
            this.error('Invalid value format.');
            await this.pause();
            return;
        }
        
        // Update the setting
        this.setNestedValue(this.settings, key, convertedValue);
        this.modified = true;
        
        this.success(`${label} updated successfully.`);
        await this.pause();
    }

    /**
     * Show all current settings
     */
    async showAllSettings() {
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}Current Settings${colors.reset}\n`);
        
        this.displaySettingsTree(this.settings, '');
        
        console.log(`\nPress Enter to continue...`);
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
        console.log(`${colors.bright}Import/Export Settings${colors.reset}\n`);
        
        console.log(`  ${colors.cyan}1${colors.reset}) Export current settings`);
        console.log(`  ${colors.cyan}2${colors.reset}) Import settings from file`);
        console.log(`  ${colors.cyan}3${colors.reset}) Create backup`);
        console.log(`  ${colors.yellow}b${colors.reset}) Back to main menu\n`);
        
        const choice = await this.prompt('Select option: ');
        
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
                this.error('Invalid option.');
                await this.pause();
                await this.showImportExport();
        }
    }

    /**
     * Export settings to a file
     */
    async exportSettings() {
        const filename = await this.prompt('Enter filename (or press Enter for default): ');
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
        const filename = await this.prompt('Enter filename to import: ');
        
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
            
            const confirm = await this.prompt('This will replace all current settings. Continue? (y/N): ');
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
        console.log(`${colors.bright}Reset to Defaults${colors.reset}\n`);
        
        console.log(`${colors.yellow}⚠️  This will reset ALL settings to their default values.${colors.reset}`);
        console.log(`${colors.yellow}⚠️  Any unsaved changes will be lost.${colors.reset}\n`);
        
        const confirm = await this.prompt('Are you sure you want to continue? (y/N): ');
        
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
        console.log(`${colors.bright}Help Information${colors.reset}\n`);
        
        console.log(`${colors.cyan}Navigation:${colors.reset}`);
        console.log(`  • Use number keys to select menu options`);
        console.log(`  • Use 'b' to go back to previous menu`);
        console.log(`  • Use 'q' to quit (with save prompt if needed)`);
        console.log(`  • Use 's' to save changes at any time\n`);
        
        console.log(`${colors.cyan}Settings Categories:${colors.reset}`);
        console.log(`  • UI Settings: Interface language, theme, and display options`);
        console.log(`  • Directory Settings: Paths for locales, reports, and backups`);
        console.log(`  • Processing Settings: Performance and batch processing options`);
        console.log(`  • Advanced Settings: Validation, logging, and expert features\n`);
        
        console.log(`${colors.cyan}Environment Variables:${colors.reset}`);
        console.log(`  • I18N_CONFIG_FILE: Custom config file path`);
        console.log(`  • I18N_LOCALE_DIR: Override locales directory`);
        console.log(`  • I18N_REPORTS_DIR: Override reports directory\n`);
        
        console.log(`${colors.cyan}Command Line Usage:${colors.reset}`);
        console.log(`  • node 00-manage-i18n.js --command=settings`);
        console.log(`  • node settings-cli.js (direct access)`);
        console.log(`  • All scripts support --config flag for custom config files\n`);
        
        console.log(`Press Enter to continue...`);
        await this.prompt('');
    }

    /**
     * Report a bug - opens GitHub issues page
     */
    async reportBug() {
        this.clearScreen();
        this.showHeader();
        console.log(`${colors.bright}Report a Bug${colors.reset}\n`);
        
        console.log(`${colors.cyan}GitHub Issues Page:${colors.reset}`);
        console.log(`https://github.com/vladnoskv/i18n-management-toolkit-main/issues\n`);
        
        console.log(`${colors.yellow}Before reporting a bug, please:${colors.reset}`);
        console.log(`  • Check if the issue already exists`);
        console.log(`  • Include steps to reproduce the problem`);
        console.log(`  • Provide error messages and logs`);
        console.log(`  • Mention your operating system and Node.js version\n`);
        
        console.log(`${colors.cyan}Opening GitHub issues page...${colors.reset}`);
        
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
                    console.log(`${colors.yellow}Could not automatically open browser.${colors.reset}`);
                    console.log(`Please manually visit: ${url}`);
                } else {
                    console.log(`${colors.green}✅ Browser opened successfully!${colors.reset}`);
                }
            });
        } catch (error) {
            console.log(`${colors.yellow}Could not automatically open browser.${colors.reset}`);
            console.log(`Please manually visit: https://github.com/vladnoskv/i18n-management-toolkit-main/issues`);
        }
        
        await this.pause();
    }

    /**
     * Quit the application
     */
    async quit() {
        if (this.modified) {
            console.log(`\n${colors.yellow}⚠️  You have unsaved changes.${colors.reset}`);
            const save = await this.prompt('Save before quitting? (Y/n): ');
            
            if (save.toLowerCase() !== 'n') {
                await this.saveSettings();
            }
        }
        
        console.log(`\n${colors.green}Thank you for using the i18n settings manager!${colors.reset}`);
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
}

// Export the class
module.exports = SettingsCLI;

// If run directly, start the CLI
if (require.main === module) {
    const cli = new SettingsCLI();
    cli.start().catch(error => {
        console.error('❌ Failed to start settings CLI:', error.message);
        process.exit(1);
    });
}