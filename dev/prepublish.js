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
    }

    log(message) {
        console.log(`[Prepublish] ${message}`);
    }

    async clean() {
        this.log('Starting cleanup for npm publish...');
        
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
        
        this.log('Cleanup completed successfully!');
    }

    async cleanDirectory(dirPath) {
        if (!fs.existsSync(dirPath)) {
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
            
            if (fs.existsSync(dir)) {
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
            if (fs.existsSync(searchPath)) {
                fs.unlinkSync(searchPath);
                this.log(`Deleted ${path.relative(this.projectRoot, searchPath)}`);
            }
        }
    }

    async resetSecuritySettings() {
        const configPath = path.join(this.projectRoot, 'settings', '.i18n-admin-config.json');
        
        if (fs.existsSync(configPath)) {
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
            
            fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
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