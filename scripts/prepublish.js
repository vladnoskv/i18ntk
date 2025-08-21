#!/usr/bin/env node

/**
 * Prepublish Script
 * Cleans up development artifacts before npm publish
 * Ensures fresh config and settings for public package
 */

const fs = require('fs');
const path = require('path');
const SecurityUtils = require('../utils/security');

class PrepublishCleaner {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.directories = [
            'scripts/debug/logs',
            'scripts/debug/reports',
            '.i18ntk-settings/backups',
            'i18ntk-reports',
            'reports'
        ];
        this.files = [
            '.i18ntk-settings/.i18ntk-admin-config.json',
            'test-*.json',
            'debug-*.log',
            'npm-debug.log',
            'yarn-error.log'
        ];
        
        // Essential files that must exist for release
        this.essentialFiles = [
            'package.json',
            'main/i18ntk-manage.js',
            'main/i18ntk-init.js',
            'main/i18ntk-analyze.js',
            'main/i18ntk-validate.js',
            'main/i18ntk-usage.js',
            'main/i18ntk-summary.js',
            'main/i18ntk-sizing.js',
            'main/i18ntk-complete.js',
            'main/i18ntk-ui.js',
            'utils/i18n-helper.js',
            'utils/security.js',
            '.i18ntk-settings/settings-manager.js',
            '.i18ntk-settings/settings-cli.js',
            '.i18ntk-settings/i18ntk-config.json'
        ];
        
        // Essential locale files
        this.essentialLocales = [
            'ui-locales/en.json',
            'ui-locales/es.json',
            'ui-locales/fr.json',
            'ui-locales/de.json',
            'ui-locales/ja.json',
            'ui-locales/ru.json',
            'ui-locales/zh.json'
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
        
        // Minify UI locale files to reduce package size
        await this.minifyUILocales();
        
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
            const files = SecurityUtils.safeReaddirSync(dirPath);
            let deletedCount = 0;

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const stat = SecurityUtils.safeStatSync(filePath);

                if (stat.isFile()) {
                    SecurityUtils.safeDeleteSync(filePath);
                    deletedCount++;
                } else if (stat.isDirectory()) {
                    // Recursively clean subdirectories
                    await this.cleanDirectory(filePath);
                    // Remove empty directories
                    try {
                        SecurityUtils.safeRmdirSync(filePath);
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
                const files = SecurityUtils.safeReaddirSync(dir);
                const regex = new RegExp(filenamePattern.replace('*', '.*'));
                
                for (const file of files) {
                    if (regex.test(file)) {
                        const filePath = path.join(dir, file);
                        SecurityUtils.safeDeleteSync(filePath);
                        this.log(`Deleted ${path.relative(this.projectRoot, filePath)}`);
                    }
                }
            }
        } else {
            // Handle exact files
            if (SecurityUtils.safeExistsSync(searchPath)) {
                SecurityUtils.safeDeleteSync(searchPath);
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
            } else if (!SecurityUtils.safeStatSync(filePath).isFile()) {
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
                const content = SecurityUtils.safeReadFileSync(filePath, 'utf8');
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
            const pkg = JSON.parse(SecurityUtils.safeReadFileSync(packagePath, 'utf8'));
            
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
                'i18ntk-usage', 'i18ntk-summary', 'i18ntk-sizing', 'i18ntk-complete'
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
    
    async minifyUILocales() {
        this.log('Minifying UI locale files to reduce package size...');
        
        let totalSizeBefore = 0;
        let totalSizeAfter = 0;
        
        for (const localeFile of this.essentialLocales) {
            const filePath = path.join(this.projectRoot, localeFile);
            if (!SecurityUtils.safeExistsSync(filePath)) continue;
            
            try {
                const content = SecurityUtils.safeReadFileSync(filePath, 'utf8');
                totalSizeBefore += content.length;
                
                // Parse and re-stringify with minimal formatting
                const parsed = JSON.parse(content);
                const minified = JSON.stringify(parsed);
                
                SecurityUtils.safeWriteFileSync(filePath, minified, this.projectRoot);
                totalSizeAfter += minified.length;
                
                this.log(`Minified ${localeFile}: ${content.length} → ${minified.length} bytes`);
            } catch (error) {
                this.log(`Warning: Could not minify ${localeFile}: ${error.message}`);
            }
        }
        
        const saved = totalSizeBefore - totalSizeAfter;
        const percent = ((saved / totalSizeBefore) * 100).toFixed(1);
        
        this.log(`✅ UI locales minified: ${totalSizeBefore} → ${totalSizeAfter} bytes (${saved} bytes saved, ${percent}% reduction)`);
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
            'main/i18ntk-manage.js',
            'main/i18ntk-init.js',
            'main/i18ntk-analyze.js',
            'main/i18ntk-validate.js',
            'main/i18ntk-usage.js',
            'main/i18ntk-summary.js',
            'main/i18ntk-sizing.js',
            'main/i18ntk-complete.js'
        ];
        
        for (const script of scripts) {
            const scriptPath = path.join(this.projectRoot, script);
            if (SecurityUtils.safeExistsSync(scriptPath)) {
                try {
                    SecurityUtils.safeAccessSync(scriptPath, fs.constants.X_OK);
                } catch (e) {
                    this.log(`⚠️ Script not executable: ${script}`);
                }
            }
        }
        
        this.log('✅ Final validation complete');
    }
      
      async resetSecuritySettings() {
        const configPath = path.join(require('../.i18ntk-settings/settings-manager').configDir, '.i18ntk-admin-config.json');
        
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
            
            SecurityUtils.safeWriteFileSync(configPath, JSON.stringify(defaultConfig, null, 2), require('../.i18ntk-settings/settings-manager').configDir);
            this.log('Reset security settings to defaults');
        }
    }

    async checkDirectory(dirPath, requiredFiles = []) {
        if (!SecurityUtils.safeExistsSync(dirPath)) {
            this.log(`❌ Directory ${path.relative(this.projectRoot, dirPath)} does not exist`);
            process.exit(1);
        }

        if (!SecurityUtils.safeStatSync(dirPath).isDirectory()) {
            this.log(`❌ ${path.relative(this.projectRoot, dirPath)} is not a directory`);
            process.exit(1);
        }

        for (const file of requiredFiles) {
            const filePath = path.join(dirPath, file);
            if (!SecurityUtils.safeExistsSync(filePath)) {
                this.log(`❌ Required file ${path.relative(this.projectRoot, filePath)} missing`);
                process.exit(1);
            }
        }
    }

    async checkFileSize(filePath, maxSizeKB = 500) {
        if (!SecurityUtils.safeExistsSync(filePath)) {
            return;
        }
        
        const stats = SecurityUtils.safeStatSync(filePath);
        const sizeKB = stats.size / 1024;
        
        if (sizeKB > maxSizeKB) {
            this.log(`⚠️  ${path.relative(this.projectRoot, filePath)} is ${sizeKB.toFixed(1)}KB (max: ${maxSizeKB}KB)`);
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