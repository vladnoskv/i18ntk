#!/usr/bin/env node

/**
 * Comprehensive tests for new i18ntk 1.8.1 features
 * 
 * Tests cover:
 * - Exit codes standardization
 * - Doctor tool enhancements
 * - Validator improvements
 * - Framework detection
 * - Plugin system
 * - Security enhancements
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

// Test utilities
const TestRunner = {
  tests: [],
  results: { passed: 0, failed: 0, errors: [] },
  
  add(name, testFn) {
    this.tests.push({ name, testFn });
  },
  
  async run() {
    console.log('🧪 Running i18ntk 1.8.1 Feature Tests...\n');
    
    for (const test of this.tests) {
      try {
        await test.testFn();
        console.log(`✅ ${test.name}`);
        this.results.passed++;
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
        this.results.errors.push({ name: test.name, error: error.message });
        this.results.failed++;
      }
    }
    
    console.log(`\n📊 Results: ${this.results.passed} passed, ${this.results.failed} failed`);
    return this.results;
  }
};

// Helper to run CLI commands
function runCommand(cmd, cwd = process.cwd()) {
  try {
    const output = execSync(cmd, { 
      cwd, 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
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

// Helper to create test directories
function createTestDir(name) {
  const testDir = path.join(__dirname, 'temp', name);
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });
  return testDir;
}

// Test 1: Exit Codes Standardization
TestRunner.add('Exit codes are properly defined', () => {
  const exitCodes = require('../../utils/exit-codes');
  assert.strictEqual(exitCodes.SUCCESS, 0, 'SUCCESS should be 0');
  assert.strictEqual(exitCodes.CONFIG_ERROR, 1, 'CONFIG_ERROR should be 1');
  assert.strictEqual(exitCodes.VALIDATION_FAILED, 2, 'VALIDATION_FAILED should be 2');
  assert.strictEqual(exitCodes.SECURITY_VIOLATION, 3, 'SECURITY_VIOLATION should be 3');
});

// Test 2: Doctor Tool Path Traversal Detection
TestRunner.add('Doctor detects path traversal attempts', async () => {
  const testDir = createTestDir('doctor-traversal');
  
  // Create malicious config
  const config = {
    sourceDir: '../../../malicious/path',
    i18nDir: './locales'
  };
  
  fs.writeFileSync(path.join(testDir, 'i18ntk-config.json'), JSON.stringify(config));
  
  const result = runCommand(`node ${path.join(__dirname, '../../main/i18ntk-doctor.js')} --config-dir="${testDir}"`, testDir);
  
  assert.strictEqual(result.exitCode, 3, 'Should exit with SECURITY_VIOLATION');
  assert.match(result.output, /path.*traversal/i, 'Should detect path traversal');
});

// Test 3: Doctor Tool Permission Checks
TestRunner.add('Doctor validates directory permissions', async () => {
  const testDir = createTestDir('doctor-permissions');
  
  // Create valid structure
  fs.mkdirSync(path.join(testDir, 'locales', 'en'), { recursive: true });
  fs.writeFileSync(path.join(testDir, 'locales', 'en', 'common.json'), JSON.stringify({ hello: 'world' }));
  
  const config = {
    sourceDir: './locales',
    sourceLanguage: 'en'
  };
  
  fs.writeFileSync(path.join(testDir, 'i18ntk-config.json'), JSON.stringify(config));
  
  const result = runCommand(`node ${path.join(__dirname, '../../main/i18ntk-doctor.js')} --config-dir="${testDir}"`, testDir);
  
  assert.strictEqual(result.exitCode, 0, 'Should pass permission checks');
});

// Test 4: Validator Placeholder Style Enforcement
TestRunner.add('Validator enforces placeholder style consistency', async () => {
  const testDir = createTestDir('validator-placeholders');
  
  // Create inconsistent placeholder styles
  const en = { greeting: 'Hello {{name}}!' };
  const es = { greeting: 'Hola {name}!' }; // Different placeholder style
  
  fs.mkdirSync(path.join(testDir, 'locales', 'en'), { recursive: true });
  fs.mkdirSync(path.join(testDir, 'locales', 'es'), { recursive: true });
  
  fs.writeFileSync(path.join(testDir, 'locales', 'en', 'common.json'), JSON.stringify(en));
  fs.writeFileSync(path.join(testDir, 'locales', 'es', 'common.json'), JSON.stringify(es));
  
  const config = {
    sourceDir: './locales',
    sourceLanguage: 'en'
  };
  
  fs.writeFileSync(path.join(testDir, 'i18ntk-config.json'), JSON.stringify(config));
  
  const result = runCommand(`node ${path.join(__dirname, '../../main/i18ntk-validate.js')} --config-dir="${testDir}"`, testDir);
  
  assert.strictEqual(result.exitCode, 2, 'Should fail validation due to placeholder inconsistency');
  assert.match(result.output, /placeholder.*style/i, 'Should detect placeholder style issues');
});

// Test 5: Validator Risky Content Detection
TestRunner.add('Validator detects suspicious content', async () => {
  const testDir = createTestDir('validator-risky');
  
  // Create translation with suspicious content
  const en = { 
    welcome: 'Welcome to our site',
    contact: 'Email us at admin@example.com', // Email
    url: 'Visit https://malicious-site.com', // URL
    secret: 'API_KEY=sk-1234567890abcdef' // Secret
  };
  
  fs.mkdirSync(path.join(testDir, 'locales', 'en'), { recursive: true });
  fs.writeFileSync(path.join(testDir, 'locales', 'en', 'common.json'), JSON.stringify(en));
  
  const config = {
    sourceDir: './locales',
    sourceLanguage: 'en'
  };
  
  fs.writeFileSync(path.join(testDir, 'i18ntk-config.json'), JSON.stringify(config));
  
  const result = runCommand(`node ${path.join(__dirname, '../../main/i18ntk-validate.js')} --config-dir="${testDir}" --strict`, testDir);
  
  assert.strictEqual(result.exitCode, 2, 'Should fail validation due to risky content');
  assert.match(result.output, /email|url|secret/i, 'Should detect risky content');
});

// Test 6: Framework Detection - i18next
TestRunner.add('Framework detection identifies i18next projects', async () => {
  const testDir = createTestDir('framework-i18next');
  
  // Create i18next project structure
  fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(testDir, 'src', 'App.jsx'), `
    import { useTranslation } from 'react-i18next';
    const { t } = useTranslation();
    return <div>{t('hello.world')}</div>;
  `);
  
  fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
    dependencies: { 'react-i18next': '^11.0.0' }
  }));
  
  const result = runCommand(`node ${path.join(__dirname, '../../main/i18ntk-usage.js')} --source-dir="${path.join(testDir, 'src')}" --json`, testDir);
  
  assert.strictEqual(result.exitCode, 0, 'Should detect i18next framework');
  const output = JSON.parse(result.output);
  assert.strictEqual(output.framework, 'i18next', 'Should identify i18next framework');
});

// Test 7: Framework Detection - Lingui
TestRunner.add('Framework detection identifies Lingui projects', async () => {
  const testDir = createTestDir('framework-lingui');
  
  // Create Lingui project structure
  fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(testDir, 'src', 'App.jsx'), `
    import { Trans } from '@lingui/macro';
    return <Trans id="hello.world">Hello World</Trans>;
  `);
  
  fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
    dependencies: { '@lingui/macro': '^3.0.0' }
  }));
  
  const result = runCommand(`node ${path.join(__dirname, '../../main/i18ntk-usage.js')} --source-dir="${path.join(testDir, 'src')}" --json`, testDir);
  
  assert.strictEqual(result.exitCode, 0, 'Should detect Lingui framework');
  const output = JSON.parse(result.output);
  assert.strictEqual(output.framework, 'lingui', 'Should identify Lingui framework');
});

// Test 8: Plugin System - Extractor Registration
TestRunner.add('Plugin system allows extractor registration', () => {
  const PluginLoader = require('../../utils/plugin-loader');
  const loader = new PluginLoader();
  
  // Mock plugin
  const mockPlugin = {
    name: 'test-extractor',
    type: 'extractor',
    patterns: [/test\(['"`]([^'"`]+)['"`]/g]
  };
  
  loader.registerPlugin(mockPlugin);
  const plugins = loader.getPlugins('extractor');
  
  assert.strictEqual(plugins.length, 1, 'Should register extractor plugin');
  assert.strictEqual(plugins[0].name, 'test-extractor', 'Should have correct plugin name');
});

// Test 9: Plugin System - Format Manager
TestRunner.add('Plugin system supports format managers', () => {
  const FormatManager = require('../../utils/format-manager');
  const manager = new FormatManager();
  
  // Mock format plugin
  const yamlFormat = {
    name: 'yaml',
    extensions: ['.yml', '.yaml'],
    parse: (content) => ({ parsed: true }),
    stringify: (data) => 'yaml: content'
  };
  
  manager.registerFormat(yamlFormat);
  const format = manager.getFormat('.yml');
  
  assert.strictEqual(format.name, 'yaml', 'Should register YAML format');
});

// Test 10: Doctor Config Drift Detection
TestRunner.add('Doctor detects configuration drift', async () => {
  const testDir = createTestDir('doctor-drift');
  
  // Create config with drift
  const config = {
    version: '1.5.0', // Outdated version
    sourceDir: './locales',
    sourceLanguage: 'en'
  };
  
  fs.writeFileSync(path.join(testDir, 'i18ntk-config.json'), JSON.stringify(config));
  
  const result = runCommand(`node ${path.join(__dirname, '../../main/i18ntk-doctor.js')} --config-dir="${testDir}"`, testDir);
  
  assert.match(result.output, /config.*drift|version.*mismatch/i, 'Should detect configuration drift');
});

// Test 11: Doctor Missing Locales Detection
TestRunner.add('Doctor detects missing locale directories', async () => {
  const testDir = createTestDir('doctor-missing-locales');
  
  // Create config with missing locale
  const config = {
    sourceDir: './locales',
    sourceLanguage: 'en',
    supportedLanguages: ['en', 'es', 'fr']
  };
  
  fs.writeFileSync(path.join(testDir, 'i18ntk-config.json'), JSON.stringify(config));
  fs.mkdirSync(path.join(testDir, 'locales', 'en'), { recursive: true });
  fs.writeFileSync(path.join(testDir, 'locales', 'en', 'common.json'), JSON.stringify({ hello: 'world' }));
  // Intentionally skip 'es' and 'fr' directories
  
  const result = runCommand(`node ${path.join(testDir, '../../main/i18ntk-doctor.js')} --config-dir="${testDir}"`, testDir);
  
  assert.match(result.output, /missing.*locale/i, 'Should detect missing locale directories');
});

// Test 12: Doctor BOM/JSON Type Mismatch Detection
TestRunner.add('Doctor detects BOM and JSON type issues', async () => {
  const testDir = createTestDir('doctor-bom-json');
  
  // Create file with BOM
  const bomContent = '\uFEFF{"hello": "world"}';
  fs.mkdirSync(path.join(testDir, 'locales', 'en'), { recursive: true });
  fs.writeFileSync(path.join(testDir, 'locales', 'en', 'common.json'), bomContent);
  
  const config = {
    sourceDir: './locales',
    sourceLanguage: 'en'
  };
  
  fs.writeFileSync(path.join(testDir, 'i18ntk-config.json'), JSON.stringify(config));
  
  const result = runCommand(`node ${path.join(testDir, '../../main/i18ntk-doctor.js')} --config-dir="${testDir}"`, testDir);
  
  assert.match(result.output, /bom|encoding/i, 'Should detect BOM issues');
});

// Test 13: Usage Analyzer Framework Integration
TestRunner.add('Usage analyzer uses framework detection', async () => {
  const testDir = createTestDir('usage-framework');
  
  // Create i18next project
  fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(testDir, 'src', 'Component.jsx'), `
    import { useTranslation } from 'react-i18next';
    const { t } = useTranslation();
    return <div>{t('user.name')}</div>;
  `);
  
  fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
    dependencies: { 'react-i18next': '^11.0.0' }
  }));
  
  fs.mkdirSync(path.join(testDir, 'locales', 'en'), { recursive: true });
  fs.writeFileSync(path.join(testDir, 'locales', 'en', 'user.json'), JSON.stringify({ name: 'Name' }));
  
  const result = runCommand(`node ${path.join(__dirname, '../../main/i18ntk-usage.js')} --source-dir="${path.join(testDir, 'src')}" --i18n-dir="${path.join(testDir, 'locales')}" --json`, testDir);
  
  assert.strictEqual(result.exitCode, 0, 'Should complete successfully');
  const output = JSON.parse(result.output);
  assert.strictEqual(output.framework, 'i18next', 'Should detect i18next framework');
  assert.strictEqual(output.usedKeys.includes('user.name'), true, 'Should find used keys');
});

// Test 14: Security Logging
TestRunner.add('Security events are properly logged', async () => {
  const testDir = createTestDir('security-logging');
  
  // Create malicious config
  const config = {
    sourceDir: '../../../etc/passwd',
    sourceLanguage: 'en'
  };
  
  fs.writeFileSync(path.join(testDir, 'i18ntk-config.json'), JSON.stringify(config));
  
  const result = runCommand(`node ${path.join(__dirname, '../../main/i18ntk-doctor.js')} --config-dir="${testDir}"`, testDir);
  
  // Check if security log was created
  const securityLogPath = path.join(testDir, 'i18ntk-reports', 'security.log');
  if (fs.existsSync(securityLogPath)) {
    const logContent = fs.readFileSync(securityLogPath, 'utf8');
    assert.match(logContent, /security.*violation/i, 'Should log security violations');
  }
  
  assert.strictEqual(result.exitCode, 3, 'Should exit with security violation');
});

// Run all tests
async function runAllTests() {
  const results = await TestRunner.run();
  
  // Cleanup temp directories
  const tempDir = path.join(__dirname, 'temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  
  console.log('\n🎯 Test Summary:');
  console.log(`Total Tests: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.errors.forEach(error => {
      console.log(`  - ${error.name}: ${error.error}`);
    });
  }
  
  process.exit(results.failed > 0 ? 1 : 0);
}

// Execute tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = TestRunner;