#!/usr/bin/env node

/**
 * Prepublish Script
 * Cleans up development artifacts before npm publish
 * Ensures fresh config and settings for public package
 */

const fs = require('fs');
const path = require('path');

class PrepublishCleaner {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.directories = [
            'scripts/debug/logs',
            'scripts/debug/reports',
            'settings/backups',
            'i18ntk-reports',
            'reports'
        ];
        this.files = [
            'settings/.i18n-admin-config.json',
            'test-*.json',
            'debug-*.log',
            'npm-debug.log',
            'yarn-error.log'
        ];
        
        // Essential files that must exist for release
        this.essentialFiles = [
            'package.json',
            'main/manage/index.js',
            'main/i18ntk-init.js',
            'main/i18ntk-analyze.js',
            'main/i18ntk-validate.js',
            'main/i18ntk-usage.js',
            'main/i18ntk-summary.js',
            'main/i18ntk-sizing.js',
            'main/i18ntk-complete.js',
            'main/i18ntk-ui.js',
            'main/i18ntk-autorun.js',
            'utils/i18n-helper.js',
            'utils/security.js',
            'settings/settings-manager.js',
            'settings/settings-cli.js',
            'settings/i18ntk-config.json'
        ];
        
        // Essential locale files
        this.essentialLocales = [
            'resources/i18n/ui-locales/en.json',
            'resources/i18n/ui-locales/es.json',
            'resources/i18n/ui-locales/fr.json',
            'resources/i18n/ui-locales/de.json',
            'resources/i18n/ui-locales/ja.json',
            'resources/i18n/ui-locales/ru.json',
            'resources/i18n/ui-locales/zh.json'
        ];
    }

    log(message) {
        console.log(`[Prepublish] ${message}`);
    }

    async clean() {
        this.log('Starting comprehensive pre-publish validation...');
        
        // Validate essential files exist
        await this.validateEssentialFiles();
        
        // Validate locale files
        await this.validateLocaleFiles();
        
        // Validate package.json
        await this.validatePackageJson();
        
        // Clean directories
        for (const dir of this.directories) {
            await this.cleanDirectory(path.join(this.projectRoot, dir));
        }
        
        // Clean files
        for (const file of this.files) {
            await this.cleanFile(file);
        }
        
        // Reset security settings
        await this.resetSecuritySettings();
        
        // Final validation
        await this.finalValidation();
        
        this.log('Pre-publish validation completed successfully!');
    }

    async cleanDirectory(dirPath) {
        if (!SecurityUtils.safeExistsSync(dirPath)) {
            return;
        }

        try {
            const files = fs.readdirSync(dirPath);
            let deletedCount = 0;

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stat = fs.statSync(filePath);

                if (stat.isFile()) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                } else if (stat.isDirectory()) {
                    // Recursively clean subdirectories
                    await this.cleanDirectory(filePath);
                    // Remove empty directories
                    try {
                        fs.rmdirSync(filePath);
                    } catch (e) {
                        // Directory not empty, skip
                    }
                }
            }

            if (deletedCount > 0) {
                this.log(`Cleaned ${deletedCount} files from ${path.relative(this.projectRoot, dirPath)}`);
            }
        } catch (error) {
            this.log(`Warning: Could not clean ${dirPath}: ${error.message}`);
        }
    }

    async cleanFile(pattern) {
        const searchPath = path.join(this.projectRoot, pattern);
        
        if (pattern.includes('*')) {
            // Handle glob patterns
            const dir = path.dirname(searchPath);
            const filenamePattern = path.basename(searchPath);
            
            if (SecurityUtils.safeExistsSync(dir)) {
                const files = fs.readdirSync(dir);
                const regex = new RegExp(filenamePattern.replace('*', '.*'));
                
                for (const file of files) {
                    if (regex.test(file)) {
                        const filePath = path.join(dir, file);
                        fs.unlinkSync(filePath);
                        this.log(`Deleted ${path.relative(this.projectRoot, filePath)}`);
                    }
                }
            }
        } else {
            // Handle exact files
            if (SecurityUtils.safeExistsSync(searchPath)) {
                fs.unlinkSync(searchPath);
                this.log(`Deleted ${path.relative(this.projectRoot, searchPath)}`);
            }
        }
    }

    async validateEssentialFiles() {
        this.log('Validating essential files...');
        
        let missingFiles = [];
        for (const file of this.essentialFiles) {
            const filePath = path.join(this.projectRoot, file);
            if (!SecurityUtils.safeExistsSync(filePath)) {
                missingFiles.push(file);
            } else if (!fs.statSync(filePath).isFile()) {
                this.log(`❌ ${file} is not a file`);
                process.exit(1);
            }
        }
        
        if (missingFiles.length > 0) {
            this.log(`❌ Missing essential files: ${missingFiles.join(', ')}`);
            process.exit(1);
        }
        
        this.log('✅ All essential files present');
    }
    
    async validateLocaleFiles() {
        this.log('Validating locale files...');
        
        let invalidFiles = [];
        for (const localeFile of this.essentialLocales) {
            const filePath = path.join(this.projectRoot, localeFile);
            if (!SecurityUtils.safeExistsSync(filePath)) {
                invalidFiles.push(localeFile);
                continue;
            }
            
            try {
                const content = SecurityUtils.safeReadFileSync(filePath, path.dirname(filePath), 'utf8');
                const parsed = JSON.parse(content);
                
                // Validate structure
                if (typeof parsed !== 'object' || parsed === null) {
                    invalidFiles.push(`${localeFile}: Invalid structure`);
                }
                
                // Check for required keys
                if (!parsed.settings || !parsed.settings.title) {
                    invalidFiles.push(`${localeFile}: Missing required keys`);
                }
                
            } catch (e) {
                invalidFiles.push(`${localeFile}: ${e.message}`);
            }
        }
        
        if (invalidFiles.length > 0) {
            this.log(`❌ Invalid locale files: ${invalidFiles.join(', ')}`);
            process.exit(1);
        }
        
        this.log('✅ All locale files valid');
    }
    
    async validatePackageJson() {
        this.log('Validating package.json...');
        
        const packagePath = path.join(this.projectRoot, 'package.json');
        try {
            const pkg = JSON.parse(SecurityUtils.safeReadFileSync(packagePath, path.dirname(packagePath), 'utf8'));
            
            // Validate required fields
            const requiredFields = ['name', 'version', 'description', 'main', 'bin', 'files'];
            for (const field of requiredFields) {
                if (!pkg[field]) {
                    this.log(`❌ package.json missing required field: ${field}`);
                    process.exit(1);
                }
            }
            
            // Validate version format
            if (!/^\d+\.\d+\.\d+/.test(pkg.version)) {
                this.log('❌ Invalid version format');
                process.exit(1);
            }
            
            // Validate bin entries
            const requiredBinEntries = [
                'i18ntk', 'i18ntk-init', 'i18ntk-analyze', 'i18ntk-validate',
                'i18ntk-usage', 'i18ntk-summary', 'i18ntk-sizing', 'i18ntk-complete',
                'i18ntk-ui', 'i18ntk-autorun'
            ];
            
            for (const bin of requiredBinEntries) {
                if (!pkg.bin || !pkg.bin[bin]) {
                    this.log(`❌ Missing bin entry: ${bin}`);
                    process.exit(1);
                }
                
                const binPath = path.join(this.projectRoot, pkg.bin[bin]);
                if (!SecurityUtils.safeExistsSync(binPath)) {
                    this.log(`❌ Missing bin script: ${pkg.bin[bin]}`);
                    process.exit(1);
                }
            }
            
            this.log('✅ package.json validated');
        } catch (e) {
            this.log(`❌ Invalid package.json: ${e.message}`);
            process.exit(1);
        }
    }
    
    async finalValidation() {
        this.log('Running final validation checks...');
        
        // Check for development artifacts
        const devArtifacts = [
            'dev/debug',
            'benchmarks',
            '.github',
            'test-usage-fix.html',
            '.i18ntk'
        ];
        
        for (const artifact of devArtifacts) {
            const artifactPath = path.join(this.projectRoot, artifact);
            if (SecurityUtils.safeExistsSync(artifactPath)) {
                this.log(`⚠️ Development artifact found: ${artifact}`);
            }
        }
        
        // Validate file permissions for executable scripts
        const scripts = [
            'main/manage/index.js',
            'main/i18ntk-init.js',
            'main/i18ntk-analyze.js',
            'main/i18ntk-validate.js',
            'main/i18ntk-usage.js',
            'main/i18ntk-summary.js',
            'main/i18ntk-sizing.js',
            'main/i18ntk-complete.js',
            'main/i18ntk-ui.js',
            'main/i18ntk-autorun.js'
        ];
        
        for (const script of scripts) {
            const scriptPath = path.join(this.projectRoot, script);
            if (SecurityUtils.safeExistsSync(scriptPath)) {
                try {
                    fs.accessSync(scriptPath, fs.constants.X_OK);
                } catch (e) {
                    this.log(`⚠️ Script not executable: ${script}`);
                }
            }
        }
        
        this.log('✅ Final validation complete');
    }
    
    async resetSecuritySettings() {
        const configPath = path.join(require('../settings/settings-manager').configDir, '.i18n-admin-config.json');
        
        if (SecurityUtils.safeExistsSync(configPath)) {
            const defaultConfig = {
                enabled: false,
                pinHash: null,
                sessionTimeout: 30,
                maxFailedAttempts: 3,
                lockoutDuration: 15,
                lastActivity: null,
                failedAttempts: 0,
                lockedUntil: null
            };
            
            SecurityUtils.safeWriteFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
            this.log('Reset security settings to defaults');
        }
    }
}

// Run if called directly
if (require.main === module) {
    const cleaner = new PrepublishCleaner();
    cleaner.clean().catch(error => {
        console.error('Error during cleanup:', error);
        process.exit(1);
    });
}

module.exports = PrepublishCleaner;