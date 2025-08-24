#!/usr/bin/env node

/**
 * simple-config-test.js - Simple Configuration Test Suite
 *
 * Basic tests for the .i18ntk-settings configuration system
 * that avoid interactive prompts and hanging functions.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Import the modules to test
const configManager = require('../utils/config-manager');
const SecurityUtils = require('../utils/security');

// Test configuration
const TEST_CONFIG = {
  version: "1.11.0",
  language: "en",
  uiLanguage: "en",
  theme: "dark",
  projectRoot: "./test-project",
  sourceDir: "./test-locales",
  i18nDir: "./test-i18n",
  outputDir: "./test-reports",
  setup: {
    completed: true,
    completedAt: new Date().toISOString(),
    version: "1.11.0",
    setupId: "test-setup-001"
  },
  framework: {
    detected: true,
    preference: "react",
    prompt: "never",
    lastPromptedVersion: "1.11.0"
  }
};

class SimpleConfigTestSuite {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
    this.testProjectRoot = path.join(os.tmpdir(), 'i18ntk-simple-test');
    this.originalCwd = process.cwd();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      test: '🧪'
    }[type] || 'ℹ️';

    console.log(`${emoji} [${timestamp}] ${message}`);
  }

  async runTest(testName, testFunction) {
    this.log(`Running test: ${testName}`, 'test');
    try {
      const result = await testFunction();
      if (result === true || result === undefined) {
        this.testResults.passed++;
        this.testResults.tests.push({ name: testName, status: 'PASSED' });
        this.log(`Test PASSED: ${testName}`, 'success');
        return true;
      } else {
        this.testResults.failed++;
        this.testResults.tests.push({ name: testName, status: 'FAILED', error: result });
        this.log(`Test FAILED: ${testName} - ${result}`, 'error');
        return false;
      }
    } catch (error) {
      this.testResults.failed++;
      this.testResults.tests.push({ name: testName, status: 'ERROR', error: error.message });
      this.log(`Test ERROR: ${testName} - ${error.message}`, 'error');
      return false;
    }
  }

  async setupTestEnvironment() {
    // Create test directory
    if (!fs.existsSync(this.testProjectRoot)) {
      fs.mkdirSync(this.testProjectRoot, { recursive: true });
    }

    // Change to test directory
    process.chdir(this.testProjectRoot);

    // Create a basic .i18ntk-settings file for testing
    const testConfigPath = path.join(this.testProjectRoot, '.i18ntk-settings');
    fs.writeFileSync(testConfigPath, JSON.stringify(TEST_CONFIG, null, 2), 'utf8');

    this.log(`Test environment setup complete at: ${this.testProjectRoot}`);
  }

  async cleanupTestEnvironment() {
    // Change back to original directory
    process.chdir(this.originalCwd);

    // Clean up test directory
    try {
      if (fs.existsSync(this.testProjectRoot)) {
        fs.rmSync(this.testProjectRoot, { recursive: true, force: true });
      }
      this.log(`Test environment cleaned up`);
    } catch (error) {
      this.log(`Warning: Could not fully clean up test environment: ${error.message}`, 'warning');
    }
  }

  // Test 1: Basic Configuration File Existence
  async testConfigFileExists() {
    const configPath = configManager.CONFIG_PATH;

    if (!SecurityUtils.safeExistsSync(configPath)) {
      return "Configuration file should exist";
    }

    return true;
  }

  // Test 2: Configuration File Readability
  async testConfigFileReadable() {
    const configPath = configManager.CONFIG_PATH;

    if (!SecurityUtils.safeExistsSync(configPath)) {
      return "Configuration file should exist for readability test";
    }

    const configData = SecurityUtils.safeReadFileSync(configPath, 'utf8');
    if (!configData) {
      return "Configuration file should be readable";
    }

    // Try to parse as JSON
    try {
      JSON.parse(configData);
    } catch (error) {
      return "Configuration file should contain valid JSON";
    }

    return true;
  }

  // Test 3: Configuration Constants
  async testConfigConstants() {
    if (!configManager.CONFIG_PATH) {
      return "CONFIG_PATH constant should be defined";
    }

    if (!configManager.DEFAULT_CONFIG) {
      return "DEFAULT_CONFIG should be defined";
    }

    if (!configManager.DEFAULT_CONFIG.version) {
      return "DEFAULT_CONFIG should have version";
    }

    return true;
  }

  // Test 4: Security Utils Basic Functionality
  async testSecurityUtils() {
    const testPath = path.join(this.testProjectRoot, 'test-file.txt');
    fs.writeFileSync(testPath, 'test content', 'utf8');

    // Test safeExistsSync
    if (!SecurityUtils.safeExistsSync(testPath)) {
      return "SecurityUtils.safeExistsSync should work";
    }

    // Test safeReadFileSync
    const content = SecurityUtils.safeReadFileSync(testPath, 'utf8');
    if (content !== 'test content') {
      return "SecurityUtils.safeReadFileSync should work";
    }

    // Clean up
    fs.unlinkSync(testPath);

    return true;
  }

  // Test 5: Path Resolution
  async testPathResolution() {
    const testPath = './test-path';
    const resolvedPath = path.resolve(this.testProjectRoot, testPath);

    if (!path.isAbsolute(resolvedPath)) {
      return "Path resolution should produce absolute paths";
    }

    if (!resolvedPath.includes(this.testProjectRoot)) {
      return "Resolved path should contain original directory";
    }

    return true;
  }

  async runAllTests() {
    this.log('Starting Simple Configuration Test Suite', 'test');
    this.log('=' .repeat(50));

    try {
      await this.setupTestEnvironment();

      // Run all tests
      await this.runTest('Configuration File Existence', () => this.testConfigFileExists());
      await this.runTest('Configuration File Readability', () => this.testConfigFileReadable());
      await this.runTest('Configuration Constants', () => this.testConfigConstants());
      await this.runTest('Security Utils Basic Functionality', () => this.testSecurityUtils());
      await this.runTest('Path Resolution', () => this.testPathResolution());

    } finally {
      await this.cleanupTestEnvironment();
    }

    // Print results
    this.log('=' .repeat(50));
    this.log('Test Results Summary:', 'info');
    this.log(`Total Tests: ${this.testResults.passed + this.testResults.failed}`);
    this.log(`Passed: ${this.testResults.passed}`, 'success');
    this.log(`Failed: ${this.testResults.failed}`, this.testResults.failed > 0 ? 'error' : 'success');

    if (this.testResults.failed > 0) {
      this.log('Failed Tests:', 'error');
      this.testResults.tests
        .filter(test => test.status !== 'PASSED')
        .forEach(test => {
          this.log(`  - ${test.name}: ${test.status} ${test.error ? `(${test.error})` : ''}`, 'error');
        });
    }

    return this.testResults.failed === 0;
  }
}

// Export for use in other test files
module.exports = SimpleConfigTestSuite;

// Run tests if this file is executed directly
if (require.main === module) {
  const testSuite = new SimpleConfigTestSuite();
  testSuite.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite failed with error:', error);
      process.exit(1);
    });
}