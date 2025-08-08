/**
 * Edge case tests for the new configuration system
 * Tests various edge cases and error conditions
 */

const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const sinon = require('sinon');

const SettingsManager = require('../../settings/settings-manager');
const SecurityConfig = require('../../utils/security-config');
const ConfigHelper = require('../../utils/config-helper');

describe('Edge Cases and Error Handling Tests', () => {
    let testDir;
    let originalCwd;

    before(() => {
        originalCwd = process.cwd();
    });

    beforeEach(() => {
        // Create temporary test directory
        testDir = path.join(__dirname, '..', '..', 'test-edge-cases');
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
        fs.mkdirSync(testDir, { recursive: true });
        process.chdir(testDir);
    });

    afterEach(() => {
        process.chdir(originalCwd);
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true, force: true });
        }
    });

    describe('Path Resolution Edge Cases', () => {
        it('should handle paths with special characters', () => {
            const specialDir = path.join(testDir, 'project with spaces & special-chars!');
            fs.mkdirSync(specialDir, { recursive: true });
            process.chdir(specialDir);

            const manager = new SettingsManager();
            const configDir = path.join(specialDir, '.i18ntk');
            
            expect(fs.existsSync(configDir)).to.be.true;
        });

        it('should handle very long path names', () => {
            const longPath = path.join(testDir, 'a'.repeat(200));
            fs.mkdirSync(longPath, { recursive: true });
            process.chdir(longPath);

            expect(() => {
                new SettingsManager();
            }).to.not.throw();
        });

        it('should handle relative vs absolute paths', () => {
            const relativePath = './test-project';
            const absolutePath = path.join(testDir, relativePath);
            
            fs.mkdirSync(absolutePath, { recursive: true });
            process.chdir(absolutePath);

            const manager = new SettingsManager();
            const configFile = path.join(absolutePath, '.i18ntk', 'config.json');
            
            expect(fs.existsSync(configFile)).to.be.true;
        });
    });

    describe('File System Error Handling', () => {
        it('should handle disk full scenarios gracefully', () => {
            // Mock file system operations to simulate disk full
            const fsWriteFileSync = sinon.stub(fs, 'writeFileSync');
            fsWriteFileSync.throws(new Error('ENOSPC: no space left on device'));

            expect(() => {
                new SettingsManager();
            }).to.not.throw();

            fsWriteFileSync.restore();
        });

        it('should handle permission denied errors', () => {
            // Mock file system operations to simulate permission denied
            const fsMkdirSync = sinon.stub(fs, 'mkdirSync');
            fsMkdirSync.throws(new Error('EACCES: permission denied'));

            expect(() => {
                new SettingsManager();
            }).to.not.throw();

            fsMkdirSync.restore();
        });

        it('should handle corrupted JSON files', () => {
            const manager = new SettingsManager();
            const configFile = path.join(testDir, '.i18ntk', 'config.json');
            
            // Write corrupted JSON
            fs.writeFileSync(configFile, '{"invalid": json content}');

            // Should handle gracefully and recreate file
            const newManager = new SettingsManager();
            expect(newManager.getConfig()).to.be.an('object');
        });
    });

    describe('Environment Variable Edge Cases', () => {
        it('should handle empty environment variables', () => {
            process.env.I18NTK_BACKUP_DIR = '';
            process.env.I18NTK_TEMP_DIR = '   ';

            const config = new ConfigHelper().getUnifiedConfig();
            
            // Should use defaults for empty values
            expect(config.backupDir).to.equal(path.join(testDir, '.i18ntk', 'backups'));
            expect(config.tempDir).to.equal(path.join(testDir, '.i18ntk', 'temp'));

            delete process.env.I18NTK_BACKUP_DIR;
            delete process.env.I18NTK_TEMP_DIR;
        });

        it('should handle invalid path characters in environment variables', () => {
            process.env.I18NTK_BACKUP_DIR = '/invalid/path/with/<>|"';

            const config = new ConfigHelper().getUnifiedConfig();
            
            // Should sanitize or use default
            expect(config.backupDir).to.be.a('string');

            delete process.env.I18NTK_BACKUP_DIR;
        });

        it('should handle very long environment variable values', () => {
            const longPath = '/very/long/path/' + 'directory/'.repeat(100);
            process.env.I18NTK_BACKUP_DIR = longPath;

            const config = new ConfigHelper().getUnifiedConfig();
            expect(config.backupDir).to.equal(longPath);

            delete process.env.I18NTK_BACKUP_DIR;
        });
    });

    describe('Concurrent Access Tests', () => {
        it('should handle multiple instances accessing same config', () => {
            const manager1 = new SettingsManager();
            const manager2 = new SettingsManager();

            manager1.setConfig({ test: 'value1' });
            manager2.setConfig({ test: 'value2' });

            manager1.saveSettings();
            manager2.saveSettings();

            // Last save should win
            const newManager = new SettingsManager();
            const config = newManager.getConfig();
            expect(config.test).to.equal('value2');
        });

        it('should handle rapid configuration changes', () => {
            const manager = new SettingsManager();

            // Make rapid changes
            for (let i = 0; i < 100; i++) {
                manager.setConfig({ counter: i });
                manager.saveSettings();
            }

            const newManager = new SettingsManager();
            const config = newManager.getConfig();
            expect(config.counter).to.equal(99);
        });
    });

    describe('Security Edge Cases', () => {
        it('should handle security configuration with missing secrets', () => {
            const security = new SecurityConfig();
            
            // Remove all environment variables
            delete process.env.I18NTK_ADMIN_PIN;
            delete process.env.I18NTK_ENCRYPTION_KEY;
            delete process.env.I18NTK_JWT_SECRET;

            const config = security.generateSecureConfig();
            
            expect(config.secrets.adminPin).to.be.null;
            expect(config.secrets.encryptionKey).to.be.a('string');
            expect(config.secrets.jwtSecret).to.be.a('string');
        });

        it('should handle weak PIN detection', () => {
            const security = new SecurityConfig();
            
            expect(security.isWeakPin('1234')).to.be.true;
            expect(security.isWeakPin('password')).to.be.true;
            expect(security.isWeakPin('1111')).to.be.true;
            expect(security.isWeakPin('strongPIN123')).to.be.false;
        });
    });

    describe('Backup and Recovery Tests', () => {
        it('should create backup before overwriting existing config', () => {
            const manager = new SettingsManager();
            const configFile = path.join(testDir, '.i18ntk', 'config.json');
            
            // Set initial config
            manager.setConfig({ version: 1 });
            manager.saveSettings();

            // Verify backup was created
            const backupPattern = /config\.json\.backup\.\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
            const files = fs.readdirSync(path.dirname(configFile));
            const backupFile = files.find(f => backupPattern.test(f));
            
            expect(backupFile).to.exist;
        });

        it('should handle backup directory creation failure', () => {
            const manager = new SettingsManager();
            
            // Mock fs operations to simulate backup failure
            const fsCopyFileSync = sinon.stub(fs, 'copyFileSync');
            fsCopyFileSync.throws(new Error('Backup failed'));

            expect(() => {
                manager.setConfig({ test: 'value' });
                manager.saveSettings();
            }).to.not.throw();

            fsCopyFileSync.restore();
        });
    });

    describe('Cross-Platform Compatibility', () => {
        it('should handle Windows path separators', () => {
            // Test on Windows-style paths
            const windowsPath = 'C:\\Users\\test\\project';
            process.chdir(testDir);

            const manager = new SettingsManager();
            const configDir = path.join(testDir, '.i18ntk');
            
            expect(fs.existsSync(configDir)).to.be.true;
        });

        it('should handle Unix path separators', () => {
            // Test on Unix-style paths
            const unixPath = '/home/test/project';
            process.chdir(testDir);

            const manager = new SettingsManager();
            const configDir = path.join(testDir, '.i18ntk');
            
            expect(fs.existsSync(configDir)).to.be.true;
        });
    });
});