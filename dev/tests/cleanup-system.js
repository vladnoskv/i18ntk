#!/usr/bin/env node

/**
 * System Cleanup Script
 * Restores system defaults and cleans up test state
 * Should be run after any tests to ensure clean state
 */

const fs = require('fs');
const path = require('path');

class SystemCleanup {
    constructor() {
        this.settingsDir = path.join(__dirname, '..', 'settings');
        this.configFiles = [
            'i18ntk-config.json',
            'i18ntk-config-test.json',
            '.i18n-admin-config.json',
            '.i18n-admin-config-test.json'
        ];
        
        this.systemDefaults = {
            projectRoot: '.',
            sourceDir: './locales',
            i18nDir: './locales',
            outputDir: './i18ntk-reports',
            sourceLanguage: 'en',
            uiLanguage: 'en',
            defaultLanguages: ['de', 'es', 'fr', 'ru'],
            notTranslatedMarker: 'NOT_TRANSLATED',
            excludeFiles: ['.DS_Store', 'Thumbs.db'],
            excludeDirs: ['node_modules', '.git', 'dist', 'build'],
            includeExtensions: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.json'],
            strictMode: false,
            notifications: {
                enabled: true,
                sound: true,
                desktop: true,
                webhook: null
            },
            dateTime: {
                format: 'YYYY-MM-DD HH:mm:ss',
                timezone: 'local'
            },
            processing: {
                notTranslatedMarker: 'NOT_TRANSLATED',
                excludeFiles: ['.DS_Store', 'Thumbs.db'],
                excludeDirs: ['node_modules', '.git', 'dist', 'build'],
                includeExtensions: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.json'],
                strictMode: false,
                defaultLanguages: ['de', 'es', 'fr', 'ru'],
                translationPatterns: {
                    t: ['t("', "t('"],
                    i18n: ['i18n.t("', "i18n.t('"],
                    translate: ['translate("', "translate('"]
                }
            },
            advanced: {
                performance: {
                    maxWorkers: 4,
                    cacheEnabled: true,
                    cacheTTL: 3600000
                },
                security: {
                    pinProtection: {
                        enabled: false,
                        pin: null,
                        attempts: 3,
                        lockoutDuration: 300000
                    }
                },
                debug: {
                    enabled: false,
                    logLevel: 'info',
                    saveLogs: true,
                    logPath: './logs/i18ntk-debug.log'
                }
            }
        };
    }

    async runCleanup() {
        console.log('🧹 Starting system cleanup...\n');
        
        try {
            await this.cleanupConfigFiles();
            await this.restoreSystemDefaults();
            await this.cleanupTestDirectories();
            await this.cleanupAdminConfig();
            await this.verifyCleanup();
            
            console.log('\n✅ System cleanup completed successfully');
            console.log('🎯 System is now in clean default state');
            
        } catch (error) {
            console.error('❌ Cleanup failed:', error.message);
            process.exit(1);
        }
    }

    async cleanupConfigFiles() {
        console.log('📁 Cleaning configuration files...');
        
        for (const file of this.configFiles) {
            const filePath = path.join(this.settingsDir, file);
            const backupPath = `${filePath}.backup`;
            
            // Remove test files
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`   🗑️  Removed: ${file}`);
            }
            
            // Remove backup files
            if (fs.existsSync(backupPath)) {
                fs.unlinkSync(backupPath);
                console.log(`   🗑️  Removed backup: ${file}.backup`);
            }
        }
        
        console.log('   ✅ Configuration files cleaned');
    }

    async restoreSystemDefaults() {
        console.log('\n⚙️  Restoring system defaults...');
        
        const settingsPath = path.join(this.settingsDir, 'i18ntk-config.json');
        
        // Ensure settings directory exists
        if (!fs.existsSync(this.settingsDir)) {
            fs.mkdirSync(this.settingsDir, { recursive: true });
        }
        
        // Write system defaults
        fs.writeFileSync(settingsPath, JSON.stringify(this.systemDefaults, null, 2));
        
        console.log('   ✅ System defaults restored');
    }

    async cleanupTestDirectories() {
        console.log('\n📂 Cleaning test directories...');
        
        const testDirs = [
            './test-locales',
            './test-reports',
            './persistent-locales',
            './updated-locales',
            './updated-reports',
            './custom-locales',
            './custom-reports'
        ];
        
        for (const dir of testDirs) {
            const fullPath = path.join(__dirname, '..', dir);
            if (fs.existsSync(fullPath)) {
                fs.rmSync(fullPath, { recursive: true, force: true });
                console.log(`   🗑️  Removed directory: ${dir}`);
            }
        }
        
        console.log('   ✅ Test directories cleaned');
    }

    async cleanupAdminConfig() {
        console.log('\n🔐 Cleaning admin configuration...');
        
        const adminConfigPath = path.join(this.settingsDir, '.i18n-admin-config.json');
        
        if (fs.existsSync(adminConfigPath)) {
            fs.unlinkSync(adminConfigPath);
            console.log('   🗑️  Removed admin configuration');
        }
        
        // Reset PIN protection in system defaults
        const settingsPath = path.join(this.settingsDir, 'i18ntk-config.json');
        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            settings.advanced = settings.advanced || {};
            settings.advanced.security = settings.advanced.security || {};
            settings.advanced.security.pinProtection = {
                enabled: false,
                pin: null,
                attempts: 3,
                lockoutDuration: 300000
            };
            
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
            console.log('   ✅ Admin PIN protection disabled');
        }
    }

    async verifyCleanup() {
        console.log('\n✅ Verifying cleanup...');
        
        // Verify settings file exists with defaults
        const settingsPath = path.join(this.settingsDir, 'i18ntk-config.json');
        if (!fs.existsSync(settingsPath)) {
            throw new Error('Settings file not found after cleanup');
        }
        
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        
        // Verify key defaults
        const checks = [
            { key: 'sourceDir', expected: './locales' },
            { key: 'i18nDir', expected: './locales' },
            { key: 'outputDir', expected: './i18ntk-reports' },
            { key: 'sourceLanguage', expected: 'en' },
            { key: 'uiLanguage', expected: 'en' }
        ];
        
        for (const check of checks) {
            if (settings[check.key] !== check.expected) {
                throw new Error(`Expected ${check.key} to be "${check.expected}", got "${settings[check.key]}"`);
            }
        }
        
        // Verify PIN protection is disabled
        if (settings.advanced?.security?.pinProtection?.enabled) {
            throw new Error('PIN protection is still enabled');
        }
        
        console.log('   ✅ All verifications passed');
    }
}

// Create package.json script entry
async function updatePackageJson() {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        packageJson.scripts = packageJson.scripts || {};
        packageJson.scripts['test:cleanup'] = 'node test/cleanup-system.js';
        packageJson.scripts['test:config'] = 'node test/config-system-tests.js';
        packageJson.scripts['test:all'] = 'npm run test:config && npm run test:cleanup';
        
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
        console.log('📦 Updated package.json with test scripts');
    }
}

// Run cleanup if called directly
if (require.main === module) {
    const cleanup = new SystemCleanup();
    cleanup.runCleanup();
    
    // Update package.json
    updatePackageJson().catch(console.error);
}

module.exports = SystemCleanup;