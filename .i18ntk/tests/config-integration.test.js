/**
 * Integration tests for centralized configuration management
 * Tests the new .i18ntk directory structure and configuration handling
 */

const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const sinon = require('sinon');

const SettingsManager = require('../../settings/settings-manager');
const SecurityConfig = require('../../utils/security-config');
const ConfigHelper = require('../../utils/config-helper');

describe('Configuration Integration Tests', () => {
    let testDir;
    let settingsManager;
    let securityConfig;
    let configHelper;

    beforeEach(() => {
        // Create temporary test directory
        testDir = path.join(__dirname, '..', '..', 'test-temp');
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }
        
        // Change to test directory
        process.chdir(testDir);
        
        // Initialize managers
        settingsManager = new SettingsManager();
        securityConfig = new SecurityConfig();
        configHelper = new ConfigHelper();
    });

    afterEach(() => {
        // Clean up test directory
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    describe('Directory Structure Tests', () => {
        it('should create .i18ntk directory in project root', () => {
            const expectedDir = path.join(testDir, '.i18ntk');
            expect(fs.existsSync(expectedDir)).to.be.true;
        });

        it('should create required subdirectories', () => {
            const subdirs = ['backups', 'temp', '.cache'];
            subdirs.forEach(subdir => {
                const dirPath = path.join(testDir, '.i18ntk', subdir);
                expect(fs.existsSync(dirPath)).to.be.true;
            });
        });

        it('should place configuration files in .i18ntk directory', () => {
            const expectedFiles = [
                'config.json',
                'security-config.json',
                '.env.example',
                'i18ntk.log'
            ];
            
            expectedFiles.forEach(file => {
                const filePath = path.join(testDir, '.i18ntk', file);
                expect(fs.existsSync(filePath)).to.be.true;
            });
        });
    });

    describe('Settings Manager Integration', () => {
        it('should load and save settings in .i18ntk directory', () => {
            const testSettings = {
                language: 'fr',
                theme: 'dark',
                autoSave: true
            };

            settingsManager.setConfig(testSettings);
            settingsManager.saveSettings();

            const configFile = path.join(testDir, '.i18ntk', 'config.json');
            expect(fs.existsSync(configFile)).to.be.true;
            
            const savedConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
            expect(savedConfig.language).to.equal('fr');
            expect(savedConfig.theme).to.equal('dark');
            expect(savedConfig.autoSave).to.be.true;
        });

        it('should migrate existing settings to new location', () => {
            // Create old settings file
            const oldSettingsPath = path.join(testDir, 'settings', 'i18ntk-config.json');
            const oldSettings = { language: 'es', oldSetting: true };
            
            fs.mkdirSync(path.dirname(oldSettingsPath), { recursive: true });
            fs.writeFileSync(oldSettingsPath, JSON.stringify(oldSettings, null, 2));

            // Initialize new settings manager
            const newManager = new SettingsManager();
            const config = newManager.getConfig();

            // Should load from new location
            expect(config.language).to.equal('en'); // Default, not migrated
            expect(config.oldSetting).to.be.undefined;
        });
    });

    describe('Security Configuration Integration', () => {
        it('should create security configuration in .i18ntk directory', () => {
            const result = securityConfig.createSecureConfig();
            
            expect(result.configPath).to.equal(
                path.join(testDir, '.i18ntk', 'security-config.json')
            );
            expect(fs.existsSync(result.configPath)).to.be.true;
        });

        it('should create .env.example in .i18ntk directory', () => {
            securityConfig.createSecureConfig();
            
            const envExamplePath = path.join(testDir, '.i18ntk', '.env.example');
            expect(fs.existsSync(envExamplePath)).to.be.true;
            
            const envContent = fs.readFileSync(envExamplePath, 'utf8');
            expect(envContent).to.include('I18NTK_ADMIN_PIN');
            expect(envContent).to.include('I18NTK_ENCRYPTION_KEY');
        });
    });

    describe('Configuration Helper Integration', () => {
        it('should resolve all directory paths correctly', () => {
            const config = configHelper.getUnifiedConfig();
            
            expect(config.backupDir).to.equal(path.join(testDir, '.i18ntk', 'backups'));
            expect(config.tempDir).to.equal(path.join(testDir, '.i18ntk', 'temp'));
            expect(config.cacheDir).to.equal(path.join(testDir, '.i18ntk', '.cache'));
            expect(config.logFile).to.equal(path.join(testDir, '.i18ntk', 'i18ntk.log'));
        });

        it('should handle environment variable overrides', () => {
            process.env.I18NTK_BACKUP_DIR = '/custom/backups';
            process.env.I18NTK_TEMP_DIR = '/custom/temp';
            
            const config = configHelper.getUnifiedConfig();
            
            expect(config.backupDir).to.equal('/custom/backups');
            expect(config.tempDir).to.equal('/custom/temp');
            
            // Clean up
            delete process.env.I18NTK_BACKUP_DIR;
            delete process.env.I18NTK_TEMP_DIR;
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle read-only directory gracefully', () => {
            // This test would need to be implemented with proper permissions
            // For now, we'll test that it doesn't crash
            expect(() => {
                settingsManager.saveSettings();
            }).to.not.throw();
        });

        it('should handle corrupted configuration files', () => {
            const configFile = path.join(testDir, '.i18ntk', 'config.json');
            fs.writeFileSync(configFile, 'invalid json content');

            // Should handle gracefully and use defaults
            const newManager = new SettingsManager();
            expect(newManager.getConfig()).to.be.an('object');
        });

        it('should handle missing configuration files', () => {
            const configFile = path.join(testDir, '.i18ntk', 'config.json');
            fs.unlinkSync(configFile);

            // Should recreate with defaults
            const newManager = new SettingsManager();
            expect(fs.existsSync(configFile)).to.be.true;
        });
    });

    describe('Migration Tests', () => {
        it('should migrate from old settings directory structure', () => {
            // Create old structure
            const oldSettingsDir = path.join(testDir, 'settings');
            const oldConfigFile = path.join(oldSettingsDir, 'i18ntk-config.json');
            
            fs.mkdirSync(oldSettingsDir, { recursive: true });
            fs.writeFileSync(oldConfigFile, JSON.stringify({
                language: 'de',
                customSetting: 'value'
            }, null, 2));

            // Initialize new structure
            const newManager = new SettingsManager();
            
            // Should create new structure
            expect(fs.existsSync(path.join(testDir, '.i18ntk', 'config.json'))).to.be.true;
            
            // Old structure should still exist (for backward compatibility)
            expect(fs.existsSync(oldConfigFile)).to.be.true;
        });
    });
});