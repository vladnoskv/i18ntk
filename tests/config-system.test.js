#!/usr/bin/env node

/**
 * config-system.test.js - Comprehensive Test Suite for .i18ntk-settings Configuration System
 *
 * This test suite validates the complete .i18ntk-settings configuration system including:
 * - Configuration loading and validation
 * - Configuration saving and migration
 * - Error handling for invalid configurations
 * - Security mechanisms for configuration access
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Import the modules to test
const configManager = require('../utils/config-manager');
const SetupEnforcer = require('../utils/setup-enforcer');
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
  },
  processing: {
    mode: "balanced",
    cacheEnabled: true,
    batchSize: 500,
    maxWorkers: 2,
    timeout: 15000,
    retryAttempts: 2,
    parallelProcessing: true,
    memoryOptimization: true,
    compression: false
  }
};

class ConfigSystemTestSuite {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
    this.testProjectRoot = path.join(os.tmpdir(), 'i18ntk-test-config');
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

  // Test 1: Configuration Loading and Validation
  async testConfigLoading() {
    const config = configManager.loadConfig();

    if (!config) {
      return "Configuration should be loaded";
    }

    if (!config.version) {
      return "Configuration should have version";
    }

    if (!config.sourceDir) {
      return "Configuration should have sourceDir";
    }

    if (!config.setup || !config.setup.completed) {
      return "Configuration should have completed setup";
    }

    return true;
  }

  // Test 2: Configuration Saving
  async testConfigSaving() {
    const testConfig = { ...TEST_CONFIG, testProperty: "test-value" };
    await configManager.saveConfig(testConfig);

    const loadedConfig = configManager.loadConfig();

    if (!loadedConfig.testProperty || loadedConfig.testProperty !== "test-value") {
      return "Configuration should be saved and reloaded correctly";
    }

    return true;
  }

  // Test 3: Configuration Path Resolution
  async testConfigPathResolution() {
    const config = configManager.getConfig();

    if (!config.projectRoot) {
      return "Configuration should resolve project root";
    }

    if (!config.sourceDir) {
      return "Configuration should resolve source directory";
    }

    // Check if paths are properly resolved
    if (!path.isAbsolute(config.projectRoot)) {
      return "Project root should be absolute path";
    }

    return true;
  }

  // Test 4: Setup Enforcement
  async testSetupEnforcement() {
    // Test with valid config
    const isSetupComplete = SetupEnforcer.checkSetupComplete();

    if (isSetupComplete !== true) {
      return "Setup should be detected as complete with valid config";
    }

    return true;
  }

  // Test 5: Invalid Configuration Handling
  async testInvalidConfigHandling() {
    const invalidConfigPath = path.join(this.testProjectRoot, '.i18ntk-settings');
    const invalidConfig = { invalid: "config", noVersion: true };

    // Write invalid config
    fs.writeFileSync(invalidConfigPath, JSON.stringify(invalidConfig, null, 2), 'utf8');

    // Try to load config - should handle gracefully
    const config = configManager.loadConfig();

    // Should fall back to defaults
    if (!config.version) {
      return "Invalid config should fall back to defaults";
    }

    return true;
  }

  // Test 6: Security Validation
  async testSecurityValidation() {
    const configPath = configManager.CONFIG_PATH;

    // Test if config path is within allowed boundaries
    const resolvedPath = path.resolve(configPath);
    const userProjectRoot = process.cwd();

    if (!resolvedPath.startsWith(userProjectRoot)) {
      return "Config path should be within user project root";
    }

    // Test SecurityUtils file operations
    if (!SecurityUtils.safeExistsSync(configPath)) {
      return "SecurityUtils should be able to check config file existence";
    }

    const configData = SecurityUtils.safeReadFileSync(configPath, path.dirname(configPath), 'utf8');
    if (!configData) {
      return "SecurityUtils should be able to read config file";
    }

    return true;
  }

  // Test 7: Configuration Migration
  async testConfigMigration() {
    // Create a legacy config file
    const legacyConfigPath = path.join(os.homedir(), '.i18ntk', 'i18ntk-config.json');

    // Ensure legacy directory exists
    const legacyDir = path.dirname(legacyConfigPath);
    if (!fs.existsSync(legacyDir)) {
      fs.mkdirSync(legacyDir, { recursive: true });
    }

    const legacyConfig = {
      version: "1.10.0",
      sourceDir: "./legacy-locales",
      framework: { detected: false }
    };

    fs.writeFileSync(legacyConfigPath, JSON.stringify(legacyConfig, null, 2), 'utf8');

    // Test migration
    const migratedConfig = await configManager.migrateLegacyIfNeeded(configManager.DEFAULT_CONFIG);

    if (migratedConfig && migratedConfig.version === "1.10.0") {
      return true;
    }

    // Clean up legacy file
    try {
      fs.unlinkSync(legacyConfigPath);
    } catch (e) {
      // Ignore cleanup errors
    }

    return "Configuration migration should work";
  }

  // Test 8: Environment Variable Overrides
  async testEnvOverrides() {
    // Set environment variables
    process.env.I18NTK_SOURCE_DIR = "./env-test-locales";
    process.env.I18NTK_FRAMEWORK_DETECT = "false";

    const config = configManager.loadConfig();

    // Check if environment variables were applied
    if (config.sourceDir !== "./env-test-locales") {
      // Clean up
      delete process.env.I18NTK_SOURCE_DIR;
      delete process.env.I18NTK_FRAMEWORK_DETECT;
      return "Environment variable overrides should be applied";
    }

    // Clean up
    delete process.env.I18NTK_SOURCE_DIR;
    delete process.env.I18NTK_FRAMEWORK_DETECT;

    return true;
  }

  // Test 9: Configuration Validation
  async testConfigValidation() {
    const validConfig = { ...TEST_CONFIG };
    const invalidConfigs = [
      { ...TEST_CONFIG, version: null }, // Missing version
      { ...TEST_CONFIG, sourceDir: "" }, // Empty sourceDir
      { ...TEST_CONFIG, setup: null }, // Missing setup
    ];

    // Test valid config
    const validResult = configManager.getConfig();
    if (!validResult || !validResult.version) {
      return "Valid configuration should load successfully";
    }

    // Test invalid configs (should fall back to defaults)
    for (const invalidConfig of invalidConfigs) {
      // Write invalid config temporarily
      const configPath = path.join(this.testProjectRoot, '.i18ntk-settings');
      fs.writeFileSync(configPath, JSON.stringify(invalidConfig, null, 2), 'utf8');

      const result = configManager.loadConfig();
      if (!result || !result.version) {
        return "Invalid configurations should fall back to defaults";
      }
    }

    return true;
  }

  // Test 10: Performance and Memory
  async testPerformance() {
    const startTime = Date.now();

    // Load config multiple times
    for (let i = 0; i < 100; i++) {
      configManager.loadConfig();
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete within reasonable time (less than 5 seconds)
    if (duration > 5000) {
      return `Configuration loading too slow: ${duration}ms`;
    }

    return true;
  }

  async runAllTests() {
    this.log('Starting Comprehensive Configuration System Test Suite', 'test');
    this.log('=' .repeat(60));

    try {
      await this.setupTestEnvironment();

      // Run all tests
      await this.runTest('Configuration Loading and Validation', () => this.testConfigLoading());
      await this.runTest('Configuration Saving', () => this.testConfigSaving());
      await this.runTest('Configuration Path Resolution', () => this.testConfigPathResolution());
      await this.runTest('Setup Enforcement', () => this.testSetupEnforcement());
      await this.runTest('Invalid Configuration Handling', () => this.testInvalidConfigHandling());
      await this.runTest('Security Validation', () => this.testSecurityValidation());
      await this.runTest('Configuration Migration', () => this.testConfigMigration());
      await this.runTest('Environment Variable Overrides', () => this.testEnvOverrides());
      await this.runTest('Configuration Validation', () => this.testConfigValidation());
      await this.runTest('Performance and Memory', () => this.testPerformance());

    } finally {
      await this.cleanupTestEnvironment();
    }

    // Print results
    this.log('=' .repeat(60));
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
module.exports = ConfigSystemTestSuite;

// Run tests if this file is executed directly
if (require.main === module) {
  const testSuite = new ConfigSystemTestSuite();
  testSuite.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite failed with error:', error);
      process.exit(1);
    });
}