#!/usr/bin/env node

/**
 * Integration tests for enhanced doctor tool
 * Tests all new doctor features including:
 * - Path traversal detection
 * - Permission validation
 * - Config drift detection
 * - Missing locale detection
 * - Plural consistency checks
 * - BOM/JSON type validation
 * - Dangling namespace file detection
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const assert = require('assert');

class DoctorIntegrationTests {
  constructor() {
    this.testDir = path.join(__dirname, '..', 'temp', 'doctor-integration');
    this.doctorPath = path.join(__dirname, '..', '..', '..', 'main', 'i18ntk-doctor.js');
  }

  setup() {
    if (fs.existsSync(this.testDir)) {
      fs.rmSync(this.testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(this.testDir, { recursive: true });
  }

  teardown() {
    if (fs.existsSync(this.testDir)) {
      fs.rmSync(this.testDir, { recursive: true, force: true });
    }
  }

  runCommand(cmd, cwd = this.testDir) {
    try {
      const output = execSync(cmd, { 
        cwd, 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      return { success: true, output, exitCode: 0 };
    } catch (error) {
      return { 
        success: false, 
        output: error.stdout || error.stderr, 
        exitCode: error.status || 1 
      };
    }
  }

  async testPathTraversalDetection() {
    console.log('🔍 Testing path traversal detection...');
    
    const config = {
      sourceDir: '../../../etc/passwd',
      i18nDir: './locales',
      sourceLanguage: 'en'
    };
    
    fs.writeFileSync(path.join(this.testDir, 'i18ntk-config.json'), JSON.stringify(config));
    
    const result = this.runCommand(`node "${this.doctorPath}" --config-dir="${this.testDir}"`);
    
    assert.strictEqual(result.exitCode, 3, 'Should exit with security violation');
    assert.match(result.output, /path.*traversal|security.*violation/i, 'Should detect path traversal');
    
    console.log('✅ Path traversal detection test passed');
  }

  async testPermissionValidation() {
    console.log('🔍 Testing permission validation...');
    
    // Create valid structure
    const localesDir = path.join(this.testDir, 'locales');
    fs.mkdirSync(localesDir, { recursive: true });
    fs.mkdirSync(path.join(localesDir, 'en'), { recursive: true });
    
    fs.writeFileSync(path.join(localesDir, 'en', 'common.json'), JSON.stringify({ hello: 'world' }));
    
    const config = {
      sourceDir: './locales',
      sourceLanguage: 'en'
    };
    
    fs.writeFileSync(path.join(this.testDir, 'i18ntk-config.json'), JSON.stringify(config));
    
    const result = this.runCommand(`node "${this.doctorPath}" --config-dir="${this.testDir}"`);
    
    assert.strictEqual(result.exitCode, 0, 'Should pass permission checks');
    assert.match(result.output, /permissions.*ok|all.*checks.*passed/i, 'Should validate permissions');
    
    console.log('✅ Permission validation test passed');
  }

  async testConfigDriftDetection() {
    console.log('🔍 Testing config drift detection...');
    
    const config = {
      version: '1.5.0', // Outdated version
      sourceDir: './locales',
      sourceLanguage: 'en',
      supportedLanguages: ['en', 'es']
    };
    
    fs.writeFileSync(path.join(this.testDir, 'i18ntk-config.json'), JSON.stringify(config));
    
    const result = this.runCommand(`node "${this.doctorPath}" --config-dir="${this.testDir}"`);
    
    assert.match(result.output, /config.*drift|version.*mismatch|outdated/i, 'Should detect config drift');
    
    console.log('✅ Config drift detection test passed');
  }

  async testMissingLocaleDetection() {
    console.log('🔍 Testing missing locale detection...');
    
    const config = {
      sourceDir: './locales',
      sourceLanguage: 'en',
      supportedLanguages: ['en', 'es', 'fr', 'de']
    };
    
    const localesDir = path.join(this.testDir, 'locales');
    fs.mkdirSync(localesDir, { recursive: true });
    fs.mkdirSync(path.join(localesDir, 'en'), { recursive: true });
    fs.mkdirSync(path.join(localesDir, 'es'), { recursive: true });
    // Intentionally skip fr and de
    
    fs.writeFileSync(path.join(localesDir, 'en', 'common.json'), JSON.stringify({ hello: 'world' }));
    fs.writeFileSync(path.join(localesDir, 'es', 'common.json'), JSON.stringify({ hello: 'mundo' }));
    
    fs.writeFileSync(path.join(this.testDir, 'i18ntk-config.json'), JSON.stringify(config));
    
    const result = this.runCommand(`node "${this.doctorPath}" --config-dir="${this.testDir}"`);
    
    assert.match(result.output, /missing.*locale|fr.*de/i, 'Should detect missing locales');
    
    console.log('✅ Missing locale detection test passed');
  }

  async testPluralConsistency() {
    console.log('🔍 Testing plural consistency checks...');
    
    const config = {
      sourceDir: './locales',
      sourceLanguage: 'en'
    };
    
    const localesDir = path.join(this.testDir, 'locales');
    fs.mkdirSync(localesDir, { recursive: true });
    fs.mkdirSync(path.join(localesDir, 'en'), { recursive: true });
    fs.mkdirSync(path.join(localesDir, 'es'), { recursive: true });
    
    // Inconsistent plural forms
    const en = {
      item: 'item',
      item_plural: 'items',
      item_zero: 'no items'
    };
    
    const es = {
      item: 'artículo',
      item_plural: 'artículos'
      // Missing item_zero for Spanish
    };
    
    fs.writeFileSync(path.join(localesDir, 'en', 'common.json'), JSON.stringify(en, null, 2));
    fs.writeFileSync(path.join(localesDir, 'es', 'common.json'), JSON.stringify(es, null, 2));
    
    fs.writeFileSync(path.join(this.testDir, 'i18ntk-config.json'), JSON.stringify(config));
    
    const result = this.runCommand(`node "${this.doctorPath}" --config-dir="${this.testDir}" --strict`);
    
    assert.match(result.output, /plural.*consistency|missing.*plural/i, 'Should detect plural inconsistencies');
    
    console.log('✅ Plural consistency test passed');
  }

  async testBOMDetection() {
    console.log('🔍 Testing BOM detection...');
    
    const config = {
      sourceDir: './locales',
      sourceLanguage: 'en'
    };
    
    const localesDir = path.join(this.testDir, 'locales');
    fs.mkdirSync(localesDir, { recursive: true });
    fs.mkdirSync(path.join(localesDir, 'en'), { recursive: true });
    
    // Create file with BOM
    const bomContent = '\uFEFF{"hello": "world"}';
    fs.writeFileSync(path.join(localesDir, 'en', 'common.json'), bomContent);
    
    fs.writeFileSync(path.join(this.testDir, 'i18ntk-config.json'), JSON.stringify(config));
    
    const result = this.runCommand(`node "${this.doctorPath}" --config-dir="${this.testDir}"`);
    
    assert.match(result.output, /bom|encoding|utf.*8/i, 'Should detect BOM issues');
    
    console.log('✅ BOM detection test passed');
  }

  async testJSONTypeValidation() {
    console.log('🔍 Testing JSON type validation...');
    
    const config = {
      sourceDir: './locales',
      sourceLanguage: 'en'
    };
    
    const localesDir = path.join(this.testDir, 'locales');
    fs.mkdirSync(localesDir, { recursive: true });
    fs.mkdirSync(path.join(localesDir, 'en'), { recursive: true });
    
    // Create invalid JSON (string instead of object)
    fs.writeFileSync(path.join(localesDir, 'en', 'common.json'), '"invalid string"');
    
    fs.writeFileSync(path.join(this.testDir, 'i18ntk-config.json'), JSON.stringify(config));
    
    const result = this.runCommand(`node "${this.doctorPath}" --config-dir="${this.testDir}"`);
    
    assert.match(result.output, /json.*type|invalid.*json/i, 'Should detect JSON type issues');
    
    console.log('✅ JSON type validation test passed');
  }

  async testDanglingNamespaceFiles() {
    console.log('🔍 Testing dangling namespace file detection...');
    
    const config = {
      sourceDir: './locales',
      sourceLanguage: 'en',
      supportedLanguages: ['en', 'es']
    };
    
    const localesDir = path.join(this.testDir, 'locales');
    fs.mkdirSync(localesDir, { recursive: true });
    fs.mkdirSync(path.join(localesDir, 'en'), { recursive: true });
    fs.mkdirSync(path.join(localesDir, 'es'), { recursive: true });
    
    // Create files in en but not in es
    fs.writeFileSync(path.join(localesDir, 'en', 'common.json'), JSON.stringify({ hello: 'world' }));
    fs.writeFileSync(path.join(localesDir, 'en', 'admin.json'), JSON.stringify({ dashboard: 'Dashboard' }));
    fs.writeFileSync(path.join(localesDir, 'es', 'common.json'), JSON.stringify({ hello: 'mundo' }));
    // admin.json missing in es
    
    fs.writeFileSync(path.join(this.testDir, 'i18ntk-config.json'), JSON.stringify(config));
    
    const result = this.runCommand(`node "${this.doctorPath}" --config-dir="${this.testDir}"`);
    
    assert.match(result.output, /dangling.*namespace|missing.*file/i, 'Should detect dangling namespace files');
    
    console.log('✅ Dangling namespace file detection test passed');
  }

  async runAll() {
    console.log('🏥 Doctor Integration Tests\n');
    console.log('='.repeat(50));
    
    this.setup();
    
    try {
      await this.testPathTraversalDetection();
      await this.testPermissionValidation();
      await this.testConfigDriftDetection();
      await this.testMissingLocaleDetection();
      await this.testPluralConsistency();
      await this.testBOMDetection();
      await this.testJSONTypeValidation();
      await this.testDanglingNamespaceFiles();
      
      console.log('\n🎉 All Doctor integration tests passed!');
      
    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      throw error;
    } finally {
      this.teardown();
    }
  }
}

// Run tests
if (require.main === module) {
  const tests = new DoctorIntegrationTests();
  tests.runAll().catch(console.error);
}

module.exports = DoctorIntegrationTests;