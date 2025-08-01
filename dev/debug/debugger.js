#!/usr/bin/env node

/**
 * i18nTK Debugger
 * Main debugging script for identifying and fixing issues in the i18n toolkit
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const SecurityUtils = require('../../utils/security');

class I18nDebugger {
    constructor(projectRoot = null) {
        // Validate and sanitize project root path
        const defaultRoot = path.resolve(__dirname, '../..');
        const validatedRoot = SecurityUtils.validatePath(projectRoot || defaultRoot, process.cwd());
        if (!validatedRoot) {
            throw new Error('Invalid project root path provided');
        }
        
        this.projectRoot = validatedRoot;
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
        try {
            // Validate path before checking existence
            const validatedPath = SecurityUtils.validatePath(filePath, this.projectRoot);
            if (!validatedPath) {
                this.addIssue(`Invalid file path: ${filePath}`);
                return false;
            }
            
            const fullPath = path.resolve(this.projectRoot, filePath);
            if (!fs.existsSync(fullPath)) {
                this.addIssue(`Missing file: ${filePath} (${description})`);
                return false;
            }
            this.log(`✓ Found: ${filePath}`);
            return true;
        } catch (error) {
            this.addIssue(`Error checking file existence: ${filePath} - ${error.message}`);
            SecurityUtils.logSecurityEvent('File existence check failed', 'warn', { filePath, error: error.message });
            return false;
        }
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

    async checkForOldReferences() {
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

        for (const file of filesToCheck) {
            const fullPath = path.resolve(this.projectRoot, file);
            if (fs.existsSync(fullPath)) {
                try {
                    const content = await SecurityUtils.safeReadFile(fullPath, this.projectRoot);
                    if (content) {
                        oldReferences.forEach(oldRef => {
                            if (content.includes(oldRef)) {
                                this.addIssue(`Old reference '${oldRef}' found in ${file}`);
                            }
                        });
                    }
                } catch (error) {
                    this.addIssue(`Error reading file ${fullPath}: ${error.message}`);
                    SecurityUtils.logSecurityEvent('File read failed during reference check', 'error', { filePath: fullPath, error: error.message });
                }
            }
        }
    }

    async checkTranslationKeys() {
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

        try {
            const enContent = await SecurityUtils.safeReadFile(enPath, this.projectRoot);
            if (!enContent) {
                this.addIssue('Failed to read en.json file');
                return;
            }
            
            const enLocale = SecurityUtils.safeParseJSON(enContent);
            if (!enLocale) {
                this.addIssue('Failed to parse en.json file');
                return;
            }
            
            const requiredKeys = this.extractAllKeys(enLocale);

            for (const file of localeFiles) {
                const filePath = path.join(uiLocalesDir, file);
                try {
                    const content = await SecurityUtils.safeReadFile(filePath, this.projectRoot);
                    if (!content) {
                        this.addIssue(`Failed to read ${file}`);
                        continue;
                    }
                    
                    const locale = SecurityUtils.safeParseJSON(content);
                    if (!locale) {
                        this.addIssue(`Failed to parse ${file}`);
                        continue;
                    }
                    
                    const existingKeys = this.extractAllKeys(locale);
                    
                    const missingKeys = requiredKeys.filter(key => !existingKeys.includes(key));
                    if (missingKeys.length > 0) {
                        this.addIssue(`Missing translation keys in ${file}: ${missingKeys.join(', ')}`);
                    }
                } catch (error) {
                    this.addIssue(`Error processing ${file}: ${error.message}`);
                    SecurityUtils.logSecurityEvent('Translation file processing failed', 'error', { file, error: error.message });
                }
            }
        } catch (error) {
            this.addIssue(`Error processing en.json: ${error.message}`);
            SecurityUtils.logSecurityEvent('English translation file processing failed', 'error', { error: error.message });
        }
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

    async checkUserConfig() {
        this.log('Checking user configuration...');
        
        // Check i18ntk-config.json
        const configPath = path.resolve(this.projectRoot, 'settings', 'i18ntk-config.json');
        if (this.checkFileExists('settings/i18ntk-config.json', 'Main configuration file')) {
            try {
                const content = fs.readFileSync(configPath, 'utf8');
                const config = JSON.parse(content);
                
                this.log('Configuration file found and valid');
                
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
                this.addIssue(`Error processing i18ntk-config.json: ${error.message}`);
                SecurityUtils.logSecurityEvent('User config processing failed', 'error', { error: error.message });
            }
        }
    }

    checkPackageJson() {
        this.log('Checking package configuration...');
        this.checkFileExists('package.json', 'Package configuration');
    }

    checkCoreFiles() {
        this.log('Checking core i18nTK files...');
        const coreFiles = [
            'main/i18ntk-manage.js',
            'main/i18ntk-init.js',
            'main/i18ntk-analyze.js',
            'main/i18ntk-validate.js',
            'main/i18ntk-usage.js',
            'main/i18ntk-complete.js',
            'main/i18ntk-sizing.js',
            'main/i18ntk-summary.js'
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

    async generateReport() {
        const timestamp = new Date().toLocaleString();
        let summary = '';
        
        summary += '\n' + '='.repeat(60) + '\n';
        summary += '           i18nTK DEBUG REPORT\n';
        summary += '='.repeat(60) + '\n';
        summary += `Generated: ${timestamp}\n`;
        summary += `Project Root: ${this.projectRoot}\n`;
        summary += '-'.repeat(60) + '\n';
        summary += `📊 Summary: ${this.issues.length} issue(s), ${this.warnings.length} warning(s)\n`;
        summary += '-'.repeat(60) + '\n';
        
        if (this.issues.length > 0) {
            summary += '\n🚨 CRITICAL ISSUES:\n';
            this.issues.forEach((issue, index) => {
                summary += `   ${index + 1}. ❌ ${issue}\n`;
            });
        }

        if (this.warnings.length > 0) {
            summary += '\n⚠️  WARNINGS:\n';
            this.warnings.forEach((warning, index) => {
                summary += `   ${index + 1}. ⚠️  ${warning}\n`;
            });
        }

        if (this.issues.length === 0 && this.warnings.length === 0) {
            summary += '\n✅ EXCELLENT! No issues found.\n';
            summary += '   The i18nTK project appears to be healthy.\n';
        }

        summary += '\n' + '='.repeat(60) + '\n';
        summary += `📄 Full debug log: ${this.logFile}\n`;
        summary += '='.repeat(60) + '\n';
        
        console.log(summary);
        
        // Save report to file securely
        const reportPath = path.join(path.dirname(this.logFile), 'debug-report.txt');
        const success = await SecurityUtils.safeWriteFile(reportPath, summary, this.projectRoot);
        if (!success) {
            console.warn('Warning: Could not save debug report due to security restrictions');
            SecurityUtils.logSecurityEvent('Debug report save failed', 'warn', { reportPath });
        }
        
        return {
            issues: this.issues,
            warnings: this.warnings,
            summary: summary,
            reportPath: reportPath,
            logFile: this.logFile
        };
    }

    async run() {
        this.log('Starting i18nTK Debug Analysis...');
        this.log(`Project Root: ${this.projectRoot}`);
        
        SecurityUtils.logSecurityEvent('Debug analysis started', 'info', { projectRoot: this.projectRoot });
        
        try {
            this.checkCoreFiles();
            await this.checkUserConfig();
            this.checkPackageJson();
            this.checkOldNamingConventions();
            await this.checkTranslationKeys();
            this.checkDependencies();
            
            SecurityUtils.logSecurityEvent('Debug analysis completed', 'info', { 
                issuesFound: this.issues.length, 
                warningsFound: this.warnings.length 
            });
            
            return await this.generateReport();
        } catch (error) {
            this.addIssue(`Debug analysis failed: ${error.message}`);
            SecurityUtils.logSecurityEvent('Debug analysis failed', 'error', { error: error.message });
            return await this.generateReport();
        }
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