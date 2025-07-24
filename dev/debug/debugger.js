#!/usr/bin/env node

/**
 * i18nTK Debugger
 * Main debugging script for identifying and fixing issues in the i18n toolkit
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class I18nDebugger {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '../..');
        this.issues = [];
        this.warnings = [];
        this.logFile = path.join(__dirname, 'logs', `debug-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
        
        // Ensure logs directory exists
        const logsDir = path.dirname(this.logFile);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        console.log(logMessage);
        fs.appendFileSync(this.logFile, logMessage + '\n');
    }

    addIssue(issue) {
        this.issues.push(issue);
        this.log(`ISSUE: ${issue}`, 'ERROR');
    }

    addWarning(warning) {
        this.warnings.push(warning);
        this.log(`WARNING: ${warning}`, 'WARN');
    }

    checkFileExists(filePath, description) {
        const fullPath = path.resolve(this.projectRoot, filePath);
        if (!fs.existsSync(fullPath)) {
            this.addIssue(`Missing file: ${filePath} (${description})`);
            return false;
        }
        this.log(`✓ Found: ${filePath}`);
        return true;
    }

    checkOldNamingConventions() {
        this.log('Checking for old naming conventions...');
        const oldFiles = [
            '00-manage-i18n.js',
            '01-init-i18n.js',
            '02-analyze-translations.js',
            '03-validate-translations.js',
            '04-check-usage.js',
            '05-complete-translations.js',
            '06-analyze-sizing.js',
            '07-generate-summary.js'
        ];

        oldFiles.forEach(file => {
            const fullPath = path.resolve(this.projectRoot, file);
            if (fs.existsSync(fullPath)) {
                this.addIssue(`Old naming convention file still exists: ${file}`);
            }
        });

        // Check for references to old files in code
        this.checkForOldReferences();
    }

    checkForOldReferences() {
        this.log('Checking for old file references in code...');
        const filesToCheck = [
            'i18ntk-complete.js',
            'i18ntk-usage.js',
            'i18ntk-validate.js',
            'package.json'
        ];

        const oldReferences = [
            '04-check-usage.js',
            '00-manage-i18n.js',
            '01-init-i18n.js',
            '02-analyze-translations.js',
            '03-validate-translations.js',
            '05-complete-translations.js',
            '06-analyze-sizing.js',
            '07-generate-summary.js'
        ];

        filesToCheck.forEach(file => {
            const fullPath = path.resolve(this.projectRoot, file);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                oldReferences.forEach(oldRef => {
                    if (content.includes(oldRef)) {
                        this.addIssue(`Old reference '${oldRef}' found in ${file}`);
                    }
                });
            }
        });
    }

    checkTranslationKeys() {
        this.log('Checking for missing translation keys...');
        const uiLocalesDir = path.resolve(this.projectRoot, 'ui-locales');
        
        if (!fs.existsSync(uiLocalesDir)) {
            this.addIssue('ui-locales directory not found');
            return;
        }

        const localeFiles = fs.readdirSync(uiLocalesDir).filter(f => f.endsWith('.json'));
        if (localeFiles.length === 0) {
            this.addIssue('No locale files found in ui-locales directory');
            return;
        }

        // Load English as reference
        const enPath = path.join(uiLocalesDir, 'en.json');
        if (!fs.existsSync(enPath)) {
            this.addIssue('English locale file (en.json) not found');
            return;
        }

        const enLocale = JSON.parse(fs.readFileSync(enPath, 'utf8'));
        const requiredKeys = this.extractAllKeys(enLocale);

        localeFiles.forEach(file => {
            const filePath = path.join(uiLocalesDir, file);
            try {
                const locale = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                const existingKeys = this.extractAllKeys(locale);
                
                const missingKeys = requiredKeys.filter(key => !existingKeys.includes(key));
                if (missingKeys.length > 0) {
                    this.addIssue(`Missing translation keys in ${file}: ${missingKeys.join(', ')}`);
                }
            } catch (error) {
                this.addIssue(`Invalid JSON in ${file}: ${error.message}`);
            }
        });
    }

    extractAllKeys(obj, prefix = '') {
        let keys = [];
        for (const key in obj) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                keys = keys.concat(this.extractAllKeys(obj[key], fullKey));
            } else {
                keys.push(fullKey);
            }
        }
        return keys;
    }

    checkConfiguration() {
        this.log('Checking configuration files...');
        
        // Check user-config.json
        const configPath = path.resolve(this.projectRoot, 'user-config.json');
        if (this.checkFileExists('user-config.json', 'Main configuration file')) {
            try {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                
                // Check required sections
                const requiredSections = ['directories', 'processing', 'advanced', 'ui'];
                requiredSections.forEach(section => {
                    if (!config[section]) {
                        this.addWarning(`Missing configuration section: ${section}`);
                    }
                });

                // Check directory paths
                if (config.directories) {
                    const dirs = ['sourceDir', 'outputDir', 'uiLocalesDir'];
                    dirs.forEach(dir => {
                        if (config.directories[dir]) {
                            const dirPath = path.resolve(this.projectRoot, config.directories[dir]);
                            if (!fs.existsSync(dirPath)) {
                                this.addWarning(`Configured directory does not exist: ${config.directories[dir]}`);
                            }
                        }
                    });
                }
            } catch (error) {
                this.addIssue(`Invalid JSON in user-config.json: ${error.message}`);
            }
        }

        // Check package.json
        this.checkFileExists('package.json', 'Package configuration');
    }

    checkCoreFiles() {
        this.log('Checking core i18nTK files...');
        const coreFiles = [
            'i18ntk-manage.js',
            'i18ntk-init.js',
            'i18ntk-analyze.js',
            'i18ntk-validate.js',
            'i18ntk-usage.js',
            'i18ntk-complete.js',
            'i18ntk-sizing.js',
            'i18ntk-summary.js'
        ];

        coreFiles.forEach(file => {
            this.checkFileExists(file, 'Core i18nTK script');
        });
    }

    checkDependencies() {
        this.log('Checking dependencies...');
        try {
            const packageJson = JSON.parse(fs.readFileSync(path.resolve(this.projectRoot, 'package.json'), 'utf8'));
            const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
            
            // Check if node_modules exists
            const nodeModulesPath = path.resolve(this.projectRoot, 'node_modules');
            if (!fs.existsSync(nodeModulesPath)) {
                this.addWarning('node_modules directory not found. Run npm install.');
            }

            this.log(`Found ${Object.keys(dependencies).length} dependencies`);
        } catch (error) {
            this.addIssue(`Could not check dependencies: ${error.message}`);
        }
    }

    generateReport() {
        this.log('\n=== DEBUG REPORT ===');
        this.log(`Total Issues: ${this.issues.length}`);
        this.log(`Total Warnings: ${this.warnings.length}`);
        
        if (this.issues.length > 0) {
            this.log('\nISSUES:');
            this.issues.forEach((issue, index) => {
                this.log(`${index + 1}. ${issue}`);
            });
        }

        if (this.warnings.length > 0) {
            this.log('\nWARNINGS:');
            this.warnings.forEach((warning, index) => {
                this.log(`${index + 1}. ${warning}`);
            });
        }

        if (this.issues.length === 0 && this.warnings.length === 0) {
            this.log('\n✅ No issues found! The i18nTK project appears to be healthy.');
        }

        this.log(`\nDebug log saved to: ${this.logFile}`);
    }

    async run() {
        this.log('Starting i18nTK Debug Analysis...');
        this.log(`Project Root: ${this.projectRoot}`);
        
        this.checkCoreFiles();
        this.checkConfiguration();
        this.checkOldNamingConventions();
        this.checkTranslationKeys();
        this.checkDependencies();
        
        this.generateReport();
        
        return {
            issues: this.issues,
            warnings: this.warnings,
            logFile: this.logFile
        };
    }
}

// Run debugger if called directly
if (require.main === module) {
    const debugTool = new I18nDebugger();
    debugTool.run().then(result => {
        process.exit(result.issues.length > 0 ? 1 : 0);
    }).catch(error => {
        console.error('Debugger failed:', error);
        process.exit(1);
    });
}

module.exports = I18nDebugger;