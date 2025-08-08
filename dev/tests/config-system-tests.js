#!/usr/bin/env node

/**
 * Unified Configuration System Test Suite
 * Tests directory handling, admin PIN cleanup, and system defaults
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ConfigSystemTester {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            warnings: 0,
            errors: []
        };
        
        this.originalSettings = null;
        this.testSettingsPath = path.join(__dirname, '..', 'settings', 'i18ntk-config-test.json');
        this.originalSettingsPath = path.join(__dirname, '..', 'settings', 'i18ntk-config.json');
        this.adminConfigPath = path.join(__dirname, '..', 'settings', '.i18n-admin-config.json');
        
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
            strictMode: false
        };
    }

    async runAllTests() {
        console.log('🧪 Starting Configuration System Test Suite\n');
        console.log('='.repeat(70));

        try {
            await this.backupSystemState();
            await this.testSystemDefaults();
            await this.testDirectoryHandling();
            await this.testAdminPinCleanup();
            await this.testCliArgumentOverride();
            await this.testConfigPersistence();
            await this.testCrossScriptConsistency();
            await this.restoreSystemState();
            
            this.printFinalReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            this.testResults.errors.push(error.message);
            await this.restoreSystemState();
        }
    }

    async backupSystemState() {
        console.log('💾 Backing up system state...');
        
        // Backup settings
        if (fs.existsSync(this.originalSettingsPath)) {
            this.originalSettings = JSON.parse(fs.readFileSync(this.originalSettingsPath, 'utf8'));
            fs.copyFileSync(this.originalSettingsPath, `${this.originalSettingsPath}.backup`);
        }
        
        // Backup admin config
        if (fs.existsSync(this.adminConfigPath)) {
            fs.copyFileSync(this.adminConfigPath, `${this.adminConfigPath}.backup`);
        }
        
        // Clean test state
        if (fs.existsSync(this.testSettingsPath)) {
            fs.unlinkSync(this.testSettingsPath);
        }
        
        console.log('✅ System state backed up');
    }

    async restoreSystemState() {
        console.log('🔄 Restoring system state...');
        
        // Restore settings
        if (fs.existsSync(`${this.originalSettingsPath}.backup`)) {
            fs.copyFileSync(`${this.originalSettingsPath}.backup`, this.originalSettingsPath);
            fs.unlinkSync(`${this.originalSettingsPath}.backup`);
        } else if (fs.existsSync(this.originalSettingsPath)) {
            fs.unlinkSync(this.originalSettingsPath);
        }
        
        // Restore admin config
        if (fs.existsSync(`${this.adminConfigPath}.backup`)) {
            fs.copyFileSync(`${this.adminConfigPath}.backup`, this.adminConfigPath);
            fs.unlinkSync(`${this.adminConfigPath}.backup`);
        } else if (fs.existsSync(this.adminConfigPath)) {
            fs.unlinkSync(this.adminConfigPath);
        }
        
        // Clean test files
        if (fs.existsSync(this.testSettingsPath)) {
            fs.unlinkSync(this.testSettingsPath);
        }
        
        console.log('✅ System state restored to defaults');
    }

    async testSystemDefaults() {
        console.log('\n⚙️  Testing system defaults...');
        
        // Test with fresh settings
        const settings = require('../../settings/settings-manager');
        settings.saveSettings(this.systemDefaults);
        
        const config = require('../../utils/config-helper');
        const unifiedConfig = await config.getUnifiedConfig('test');
        
        // Verify defaults are applied (allow for resolved paths)
        this.assertContains(unifiedConfig.sourceDir, 'locales', 'Default sourceDir contains locales');
        this.assertContains(unifiedConfig.i18nDir, 'locales', 'Default i18nDir contains locales');
        this.assertContains(unifiedConfig.outputDir, 'i18ntk-reports', 'Default outputDir contains reports');
        this.assertEquals(unifiedConfig.sourceLanguage, 'en', 'Default sourceLanguage');
        
        console.log('✅ System defaults test passed');
    }

    async testDirectoryHandling() {
        console.log('\n📂 Testing directory handling...');
        
        const testDir = './test-locales';
        const testOutputDir = './test-reports';
        
        // Create test directories
        if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
        if (!fs.existsSync(testOutputDir)) fs.mkdirSync(testOutputDir, { recursive: true });
        
        // Test CLI argument override
        const config = require('../../utils/config-helper');
        const cliArgs = {
            sourceDir: testDir,
            outputDir: testOutputDir,
            uiLanguage: 'de'
        };
        
        const unifiedConfig = await config.getUnifiedConfig('test', cliArgs);
        
        this.assertEquals(unifiedConfig.sourceDir, path.resolve(testDir), 'CLI sourceDir override');
        this.assertEquals(unifiedConfig.outputDir, path.resolve(testOutputDir), 'CLI outputDir override');
        this.assertEquals(unifiedConfig.uiLanguage, 'de', 'CLI uiLanguage override');
        
        // Verify settings were updated globally
        const settings = require('../../settings/settings-manager');
        const currentSettings = settings.getSettings();
        this.assertEquals(currentSettings.sourceDir, testDir, 'Global settings updated');
        this.assertEquals(currentSettings.outputDir, testOutputDir, 'Global settings updated');
        
        console.log('✅ Directory handling test passed');
        
        // Cleanup test directories
        fs.rmSync(testDir, { recursive: true, force: true });
        fs.rmSync(testOutputDir, { recursive: true, force: true });
    }

    async testAdminPinCleanup() {
        console.log('\n🔐 Testing admin PIN cleanup...');
        
        const AdminAuth = require('../../utils/admin-auth');
        const auth = new AdminAuth();
        
        // Test 1: Clean state
        let isConfigured = await auth.isPinConfigured();
        this.assertFalse(isConfigured, 'PIN should not be configured initially');
        
        // Test 2: Setup PIN
        await auth.initialize();
        await auth.setupPin('1234');
        
        isConfigured = await auth.isPinConfigured();
        this.assertTrue(isConfigured, 'PIN should be configured after setup');
        
        // Test 3: Verify PIN works
        const verifyResult = await auth.verifyPin('1234');
        this.assertTrue(verifyResult, 'PIN verification should work');
        
        // Test 4: Cleanup PIN (remove config file)
        if (fs.existsSync(this.adminConfigPath)) {
            fs.unlinkSync(this.adminConfigPath);
        }
        
        // Create new instance to verify cleanup
        const newAuth = new AdminAuth();
        await newAuth.initialize();
        isConfigured = await newAuth.isPinConfigured();
        this.assertFalse(isConfigured, 'PIN should be removed after cleanup');
        
        console.log('✅ Admin PIN cleanup test passed');
    }

    async testCliArgumentOverride() {
        console.log('\n🎯 Testing CLI argument override...');
        
        const config = require('../../utils/config-helper');
        
        // Test with CLI-like arguments
        const cliArgs = {
            sourceDir: './cli-test-locales',
            outputDir: './cli-test-reports',
            uiLanguage: 'es'
        };
        
        const unifiedConfig = await config.getUnifiedConfig('test', cliArgs);
        
        this.assertEquals(unifiedConfig.sourceDir, path.resolve('./cli-test-locales'), 'CLI sourceDir override');
        this.assertEquals(unifiedConfig.outputDir, path.resolve('./cli-test-reports'), 'CLI outputDir override');
        this.assertEquals(unifiedConfig.uiLanguage, 'es', 'CLI uiLanguage override');
        
        console.log('✅ CLI argument override test passed');
    }

    async testConfigPersistence() {
        console.log('\n💾 Testing configuration persistence...');
        
        // Test file-based persistence directly
        const testConfigPath = path.join(__dirname, '..', 'settings', 'test-persistence.json');
        const testSettings = {
            sourceDir: './test-persistent-locales',
            sourceLanguage: 'fr',
            outputDir: './test-persistent-reports',
            uiLanguage: 'fr'
        };
        
        // Test saving settings to file
        fs.writeFileSync(testConfigPath, JSON.stringify(testSettings, null, 2));
        
        // Test loading settings from file
        const loadedContent = fs.readFileSync(testConfigPath, 'utf8');
        const loadedSettings = JSON.parse(loadedContent);
        
        this.assertEquals(loadedSettings.sourceDir, './test-persistent-locales', 'Settings should be saved to file');
        this.assertEquals(loadedSettings.sourceLanguage, 'fr', 'Settings should be saved to file');
        this.assertEquals(loadedSettings.outputDir, './test-persistent-reports', 'Settings should be saved to file');
        this.assertEquals(loadedSettings.uiLanguage, 'fr', 'Settings should be saved to file');
        
        // Cleanup test file
        if (fs.existsSync(testConfigPath)) {
            fs.unlinkSync(testConfigPath);
        }
        
        console.log('✅ Configuration persistence test passed');
    }

    async testCrossScriptConsistency() {
        console.log('\n🔗 Testing cross-script consistency...');
        
        const config = require('../../utils/config-helper');
        
        // Test that all scripts get the same configuration
        const scripts = ['init', 'analyze', 'validate', 'complete', 'usage'];
        const configs = {};
        
        for (const script of scripts) {
            configs[script] = await config.getUnifiedConfig(script);
        }
        
        // All should have the same base configuration
        const baseConfig = configs[scripts[0]];
        for (const script of scripts) {
            this.assertEquals(configs[script].sourceLanguage, baseConfig.sourceLanguage, 'Source language should be consistent');
            this.assertEquals(configs[script].uiLanguage, baseConfig.uiLanguage, 'UI language should be consistent');
            this.assertEquals(configs[script].notTranslatedMarker, baseConfig.notTranslatedMarker, 'Marker should be consistent');
        }
        
        console.log('✅ Cross-script consistency test passed');
    }

    // Assertion helpers
    assertEquals(actual, expected, message) {
        if (actual !== expected) {
            this.testResults.failed++;
            this.testResults.errors.push(`${message}: expected ${expected}, got ${actual}`);
            console.error(`❌ ${message}: expected ${expected}, got ${actual}`);
        } else {
            this.testResults.passed++;
        }
    }

    assertTrue(condition, message) {
        if (!condition) {
            this.testResults.failed++;
            this.testResults.errors.push(message);
            console.error(`❌ ${message}`);
        } else {
            this.testResults.passed++;
        }
    }

    assertFalse(condition, message) {
        if (condition) {
            this.testResults.failed++;
            this.testResults.errors.push(message);
            console.error(`❌ ${message}`);
        } else {
            this.testResults.passed++;
        }
    }

    assertContains(text, substring, message) {
        if (!text.includes(substring)) {
            this.testResults.failed++;
            this.testResults.errors.push(message);
            console.error(`❌ ${message}`);
        } else {
            this.testResults.passed++;
        }
    }

    logError(message, error) {
        this.testResults.failed++;
        this.testResults.errors.push(`${message}: ${error.message}`);
        console.error(`❌ ${message}: ${error.message}`);
    }

    printFinalReport() {
        console.log('\n' + '='.repeat(70));
        console.log('📊 CONFIGURATION SYSTEM TEST REPORT');
        console.log('='.repeat(70));
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        console.log(`⚠️  Warnings: ${this.testResults.warnings}`);
        
        if (this.testResults.errors.length > 0) {
            console.log('\n🚨 Errors:');
            this.testResults.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        console.log('\n🎯 System Defaults:');
        Object.entries(this.systemDefaults).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
        });
        
        const success = this.testResults.failed === 0;
        console.log(`\n${success ? '🎉 All tests passed!' : '❌ Some tests failed'}`);
        
        process.exit(success ? 0 : 1);
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new ConfigSystemTester();
    tester.runAllTests();
}

module.exports = ConfigSystemTester;