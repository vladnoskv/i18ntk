#!/usr/bin/env node

/**
 * Integration tests for enhanced validator
 * Tests new features including:
 * - Per-language placeholder style enforcement
 * - Risky content detection (URLs, emails, secrets)
 * - Placeholder parity validation
 * - Enhanced validation reporting
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const assert = require('assert');

class ValidatorIntegrationTests {
  constructor() {
    this.testDir = path.join(__dirname, '..', 'temp', 'validator-integration');
    this.validatorPath = path.join(__dirname, '..', '..', '..', 'main', 'i18ntk-validate.js');
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

  async testPlaceholderStyleEnforcement() {
    console.log('🔍 Testing placeholder style enforcement...');
    
    const config = {
      sourceDir: './locales',
      sourceLanguage: 'en'
    };
    
    const localesDir = path.join(this.testDir, 'locales');
    fs.mkdirSync(localesDir, { recursive: true });
    fs.mkdirSync(path.join(localesDir, 'en'), { recursive: true });
    fs.mkdirSync(path.join(localesDir, 'es'), { recursive: true });
    
    // Inconsistent placeholder styles
    const en = {
      greeting: 'Hello {{name}}!',
      welcome: 'Welcome {{user}} to {{site}}'
    };
    
    const es = {
      greeting: 'Hola {name}!', // Different style
      welcome: 'Bienvenido {user} a {site}'
    };
    
    fs.writeFileSync(path.join(localesDir, 'en', 'common.json'), JSON.stringify(en, null, 2));
    fs.writeFileSync(path.join(localesDir, 'es', 'common.json'), JSON.stringify(es, null, 2));
    
    fs.writeFileSync(path.join(this.testDir, 'i18ntk-config.json'), JSON.stringify(config));
    
    const result = this.runCommand(`node "${this.validatorPath}" --config-dir="${this.testDir}" --strict`);
    
    assert.strictEqual(result.exitCode, 2, 'Should fail validation due to placeholder style inconsistency');
    assert.match(result.output, /placeholder.*style|inconsistent.*placeholder/i, 'Should detect placeholder style issues');
    
    console.log('✅ Placeholder style enforcement test passed');
  }

  async testPlaceholderParity() {
    console.log('🔍 Testing placeholder parity validation...');
    
    const config = {
      sourceDir: './locales',
      sourceLanguage: 'en'
    };
    
    const localesDir = path.join(this.testDir, 'locales');
    fs.mkdirSync(localesDir, { recursive: true });
    fs.mkdirSync(path.join(localesDir, 'en'), { recursive: true });
    fs.mkdirSync(path.join(localesDir, 'es'), { recursive: true });
    
    // Missing placeholders in target language
    const en = {
      welcome: 'Hello {{name}}, you have {{count}} new messages'
    };
    
    const es = {
      welcome: 'Hola, tienes mensajes nuevos' // Missing {{name}} and {{count}}
    };
    
    fs.writeFileSync(path.join(localesDir, 'en', 'common.json'), JSON.stringify(en, null, 2));
    fs.writeFileSync(path.join(localesDir, 'es', 'common.json'), JSON.stringify(es, null, 2));
    
    fs.writeFileSync(path.join(this.testDir, 'i18ntk-config.json'), JSON.stringify(config));
    
    const result = this.runCommand(`node "${this.validatorPath}" --config-dir="${this.testDir}" --strict`);
    
    assert.strictEqual(result.exitCode, 2, 'Should fail validation due to missing placeholders');
    assert.match(result.output, /placeholder.*parity|missing.*placeholder/i, 'Should detect placeholder parity issues');
    
    console.log('✅ Placeholder parity test passed');
  }

  async testEmailDetection() {
    console.log('🔍 Testing email detection...');
    
    const config = {
      sourceDir: './locales',
      sourceLanguage: 'en'
    };
    
    const localesDir = path.join(this.testDir, 'locales');
    fs.mkdirSync(localesDir, { recursive: true });
    fs.mkdirSync(path.join(localesDir, 'en'), { recursive: true });
    
    // Translation with email
    const en = {
      contact: 'Contact us at support@example.com for help',
      welcome: 'Welcome to our platform'
    };
    
    fs.writeFileSync(path.join(localesDir, 'en', 'common.json'), JSON.stringify(en, null, 2));
    fs.writeFileSync(path.join(this.testDir, 'i18ntk-config.json'), JSON.stringify(config));
    
    const result = this.runCommand(`node "${this.validatorPath}" --config-dir="${this.testDir}" --strict`);
    
    assert.strictEqual(result.exitCode, 2, 'Should fail validation due to email detection');
    assert.match(result.output, /email|suspicious.*content/i, 'Should detect email in translations');
    
    console.log('✅ Email detection test passed');
  }

  async testURLDetection() {
    console.log('🔍 Testing URL detection...');
    
    const config = {
      sourceDir: './locales',
      sourceLanguage: 'en'
    };
    
    const localesDir = path.join(this.testDir, 'locales');
    fs.mkdirSync(localesDir, { recursive: true });
    fs.mkdirSync(path.join(localesDir, 'en'), { recursive: true });
    
    // Translation with URL
    const en = {
      help: 'Visit https://malicious-site.com for more information',
      guide: 'Check our documentation'
    };
    
    fs.writeFileSync(path.join(localesDir, 'en', 'common.json'), JSON.stringify(en, null, 2));
    fs.writeFileSync(path.join(this.testDir, 'i18ntk-config.json'), JSON.stringify(config));
    
    const result = this.runCommand(`node "${this.validatorPath}" --config-dir="${this.testDir}" --strict`);
    
    assert.strictEqual(result.exitCode, 2, 'Should fail validation due to URL detection');
    assert.match(result.output, /url|suspicious.*content/i, 'Should detect URL in translations');
    
    console.log('✅ URL detection test passed');
  }

  async testSecretDetection() {
    console.log('🔍 Testing secret detection...');
    
    const config = {
      sourceDir: './locales',
      sourceLanguage: 'en'
    };
    
    const localesDir = path.join(this.testDir, 'locales');
    fs.mkdirSync(localesDir, { recursive: true });
    fs.mkdirSync(path.join(localesDir, 'en'), { recursive: true });
    
    // Translation with secrets
    const en = {
      api: 'Your API key is: sk-1234567890abcdef',
      token: 'Access token: ghp_1234567890abcdef',
      password: 'Password: MySecret123!'
    };
    
    fs.writeFileSync(path.join(localesDir, 'en', 'common.json'), JSON.stringify(en, null, 2));
    fs.writeFileSync(path.join(this.testDir, 'i18ntk-config.json'), JSON.stringify(config));
    
    const result = this.runCommand(`node "${this.validatorPath}" --config-dir="${this.testDir}" --strict`);
    
    assert.strictEqual(result.exitCode, 2, 'Should fail validation due to secret detection');
    assert.match(result.output, /secret|api.*key|token|password/i, 'Should detect secrets in translations');
    
    console.log('✅ Secret detection test passed');
  }

  async testEnhancedReporting() {
    console.log('🔍 Testing enhanced validation reporting...');
    
    const config = {
      sourceDir: './locales',
      sourceLanguage: 'en'
    };
    
    const localesDir = path.join(this.testDir, 'locales');
    fs.mkdirSync(localesDir, { recursive: true });
    fs.mkdirSync(path.join(localesDir, 'en'), { recursive: true });
    fs.mkdirSync(path.join(localesDir, 'es'), { recursive: true });
    
    // Multiple issues
    const en = {
      welcome: 'Hello {{name}}!',
      contact: 'Email: admin@example.com'
    };
    
    const es = {
      welcome: 'Hola!', // Missing {{name}}
      contact: 'Correo: admin@example.com' // Email detected
    };
    
    fs.writeFileSync(path.join(localesDir, 'en', 'common.json'), JSON.stringify(en, null, 2));
    fs.writeFileSync(path.join(localesDir, 'es', 'common.json'), JSON.stringify(es, null, 2));
    
    fs.writeFileSync(path.join(this.testDir, 'i18ntk-config.json'), JSON.stringify(config));
    
    const result = this.runCommand(`node "${this.validatorPath}" --config-dir="${this.testDir}" --json --strict`);
    
    assert.strictEqual(result.exitCode, 2, 'Should fail validation');
    
    const report = JSON.parse(result.output);
    assert.strictEqual(typeof report, 'object', 'Should produce JSON report');
    assert.strictEqual(Array.isArray(report.errors), true, 'Should include errors array');
    assert.strictEqual(Array.isArray(report.warnings), true, 'Should include warnings array');
    assert.strictEqual(typeof report.summary, 'object', 'Should include summary');
    
    console.log('✅ Enhanced reporting test passed');
  }

  async testPerLanguageStyleEnforcement() {
    console.log('🔍 Testing per-language style enforcement...');
    
    const config = {
      sourceDir: './locales',
      sourceLanguage: 'en',
      supportedLanguages: ['en', 'es', 'fr'],
      languageStyles: {
        en: { placeholder: '{{}}' },
        es: { placeholder: '{{}}' },
        fr: { placeholder: '{{}}' }
      }
    };
    
    const localesDir = path.join(this.testDir, 'locales');
    fs.mkdirSync(localesDir, { recursive: true });
    
    ['en', 'es', 'fr'].forEach(lang => {
      fs.mkdirSync(path.join(localesDir, lang), { recursive: true });
    });
    
    // Different styles per language
    const en = { greeting: 'Hello {{name}}!' };
    const es = { greeting: 'Hola {nombre}!' }; // Wrong style for Spanish
    const fr = { greeting: 'Bonjour {{nom}}!' };
    
    fs.writeFileSync(path.join(localesDir, 'en', 'common.json'), JSON.stringify(en, null, 2));
    fs.writeFileSync(path.join(localesDir, 'es', 'common.json'), JSON.stringify(es, null, 2));
    fs.writeFileSync(path.join(localesDir, 'fr', 'common.json'), JSON.stringify(fr, null, 2));
    
    fs.writeFileSync(path.join(this.testDir, 'i18ntk-config.json'), JSON.stringify(config));
    
    const result = this.runCommand(`node "${this.validatorPath}" --config-dir="${this.testDir}" --strict`);
    
    assert.strictEqual(result.exitCode, 2, 'Should fail validation due to style inconsistency');
    assert.match(result.output, /spanish.*placeholder|style.*violation/i, 'Should detect per-language style issues');
    
    console.log('✅ Per-language style enforcement test passed');
  }

  async runAll() {
    console.log('🔍 Validator Integration Tests\n');
    console.log('='.repeat(50));
    
    this.setup();
    
    try {
      await this.testPlaceholderStyleEnforcement();
      await this.testPlaceholderParity();
      await this.testEmailDetection();
      await this.testURLDetection();
      await this.testSecretDetection();
      await this.testEnhancedReporting();
      await this.testPerLanguageStyleEnforcement();
      
      console.log('\n🎉 All Validator integration tests passed!');
      
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
  const tests = new ValidatorIntegrationTests();
  tests.runAll().catch(console.error);
}

module.exports = ValidatorIntegrationTests;