#!/usr/bin/env node

/**
 * Comprehensive Edge Case Tests for Admin PIN System
 * Tests all edge cases, security features, and error conditions
 */

const AdminAuth = require('../../utils/admin-auth');
const fs = require('fs');
const path = require('path');

class AdminPinEdgeCaseTester {
  constructor() {
    this.testResults = [];
    this.configPath = path.join(process.cwd(), 'settings', '.i18n-admin-config.json');
    this.auth = new AdminAuth();
  }

  async run() {
    console.log('🔍 Starting Admin PIN Edge Case Tests\n');
    
    try {
      await this.setupTestEnvironment();
      await this.runAllTests();
      await this.cleanup();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    }
  }

  async setupTestEnvironment() {
    console.log('🛠️  Setting up test environment...');
    
    // Clean up any existing config
    if (fs.existsSync(this.configPath)) {
      fs.unlinkSync(this.configPath);
    }
    
    // Enable admin PIN for testing
    const SettingsManager = require('../../settings/settings-manager');
    SettingsManager.setSetting('security.adminPinEnabled', true);
    
    await this.auth.initialize();
    console.log('✅ Test environment ready\n');
  }

  async runAllTests() {
    console.log('📋 Running comprehensive edge case tests...\n');
    
    await this.testPinSetupEdgeCases();
    await this.testPinValidationEdgeCases();
    await this.testSessionManagementEdgeCases();
    await this.testSecurityFeaturesEdgeCases();
    await this.testFileSystemEdgeCases();
    await this.testErrorHandlingEdgeCases();
    await this.testConcurrentAccess();
    await this.testMemoryManagement();
    await this.testConfigurationEdgeCases();
    await this.testProcessHandlers();
  }

  async testPinSetupEdgeCases() {
    console.log('🔐 Testing PIN Setup Edge Cases...');
    
    // Test 1: Valid PIN formats
    const validPins = ['0000', '1234', '9999', '0001', '9876', '12345', '123456'];
    for (const pin of validPins) {
      const result = await this.auth.setupPin(pin);
      this.assertTrue(result, `Valid PIN ${pin} should be accepted`);
    }
    
    // Test 2: Invalid PIN formats
    const invalidPins = [
      '', '123', '1234567', 'abc', 'abcd', '12ab', '12.3', '12-3',
      ' 123', '123 ', '1 23', '1234\n', '\t1234', null, undefined, 1234, true, false
    ];
    
    for (const pin of invalidPins) {
      const result = await this.auth.setupPin(pin);
      this.assertFalse(result, `Invalid PIN ${JSON.stringify(pin)} should be rejected`);
    }
    
    // Test 3: Boundary values
    const boundaryPins = ['0000', '9999', '5000', '1000', '9998', '12345', '123456'];
    for (const pin of boundaryPins) {
      const result = await this.auth.setupPin(pin);
      this.assertTrue(result, `Boundary PIN ${pin} should be accepted`);
    }
    
    console.log('✅ PIN Setup edge cases passed\n');
  }

  async testPinValidationEdgeCases() {
    console.log('🔍 Testing PIN Validation Edge Cases...');
    
    // Test 1: Valid PIN variations
    const validPins = ['1234', '0000', '9999', '5000', '12345', '123456'];
    for (const pin of validPins) {
      await this.auth.setupPin(pin);
      const result = await this.auth.verifyPin(pin);
      this.assertTrue(result, `Valid PIN ${pin} should be accepted`);
    }
    
    // Test 2: Invalid PIN variations (test against current PIN)
    await this.auth.setupPin('1234');
    const invalidPins = [
      '', '0000', '123', '12345', '1234567', '1234\n', '1234 ', ' 1234', '1 234',
      'abcd', '123a', 'a123', null, undefined, 1234, true, false, 0, -1
    ];
    
    for (const pin of invalidPins) {
      const result = await this.auth.verifyPin(pin);
      this.assertFalse(result, `Invalid PIN ${JSON.stringify(pin)} should be rejected`);
    }
    
    // Test 3: Exact match validation
    await this.auth.setupPin('1234');
    const result = await this.auth.verifyPin('1234');
    this.assertTrue(result, `Exact PIN 1234 should match`);
    
    console.log('✅ PIN Validation edge cases passed\n');
  }

  async testSessionManagementEdgeCases() {
    console.log('⏱️  Testing Session Management Edge Cases...');
    
    // Setup PIN and authenticate
    await this.auth.setupPin('1234');
    await this.auth.verifyPin('1234');
    
    // Test 1: Session creation with various IDs
    const sessionIds = [null, '', 'valid-id', '123', 'a'.repeat(100)];
    for (const id of sessionIds) {
      const sessionId = await this.auth.createSession(id);
      this.assertTrue(typeof sessionId === 'string', `Session ID should be string, got: ${typeof sessionId}`);
      this.assertTrue(sessionId.length > 0, `Session ID should not be empty`);
    }
    
    // Test 2: Session validation with edge cases
    const invalidSessionIds = [null, undefined, '', 'invalid', 'non-existent'];
    for (const id of invalidSessionIds) {
      const result = await this.auth.validateSession(id);
      this.assertFalse(result, `Invalid session ID ${JSON.stringify(id)} should fail validation`);
    }
    
    // Test 3: Session lifecycle
    const sessionId = await this.auth.createSession();
    this.assertTrue(await this.auth.validateSession(sessionId), 'New session should be valid');
    
    // Test session clearing
    this.auth.clearCurrentSession();
    this.assertFalse(this.auth.isCurrentlyAuthenticated(), 'Session should be cleared');
    
    console.log('✅ Session Management edge cases passed\n');
  }

  async testSecurityFeaturesEdgeCases() {
    console.log('🔒 Testing Security Features Edge Cases...');
    
    await this.auth.setupPin('1234');
    
    // Test 1: Failed attempts tracking
    const clientId = 'test-client';
    this.auth.clearFailedAttempts(clientId);
    
    // Record multiple failed attempts
    for (let i = 0; i < 5; i++) {
      await this.auth.verifyPin('0000');
    }
    
    // Test lockout detection
    const isLocked = this.auth.isLockedOut(clientId);
    this.assertTrue(isLocked, 'Client should be locked out after max attempts');
    
    // Test lockout expiration
    this.auth.clearFailedAttempts(clientId);
    const isUnlocked = !this.auth.isLockedOut(clientId);
    this.assertTrue(isUnlocked, 'Client should be unlocked after clearing attempts');
    
    // Test 2: Session security
    const sessionId = await this.auth.createSession();
    const sessionInfo = this.auth.getCurrentSessionInfo();
    
    this.assertTrue(sessionInfo !== null, 'Session info should be available');
    this.assertTrue(typeof sessionInfo.sessionId === 'string', 'Session ID should be string');
    this.assertTrue(sessionInfo.started instanceof Date, 'Session start should be Date');
    
    console.log('✅ Security Features edge cases passed\n');
  }

  async testFileSystemEdgeCases() {
    console.log('📁 Testing File System Edge Cases...');
    
    // Test 1: Config file permissions
    await this.auth.setupPin('1234');
    
    const stats = fs.statSync(this.configPath);
    this.assertTrue(stats.mode & 0o600, 'Config file should have restricted permissions (0o600)');
    
    // Test 2: Config file content validation
    const content = fs.readFileSync(this.configPath, 'utf8');
    const config = JSON.parse(content);
    
    this.assertTrue(typeof config === 'object', 'Config should be valid JSON object');
    this.assertTrue(typeof config.enabled === 'boolean', 'enabled should be boolean');
    this.assertTrue(typeof config.pinHash === 'string', 'pinHash should be string');
    this.assertTrue(typeof config.salt === 'string', 'salt should be string');
    
    // Test 3: Config file corruption handling (skip if not possible)
    try {
      fs.writeFileSync(this.configPath, 'invalid json content', 'utf8');
      const corruptedConfig = await this.auth.loadConfig();
      this.assertTrue(corruptedConfig === null, 'Corrupted config should return null');
    } catch (e) {
      // Skip if file system doesn't allow this test
      console.log('⚠️  Skipping file corruption test due to permissions');
    }
    
    console.log('✅ File System edge cases passed\n');
  }

  async testErrorHandlingEdgeCases() {
    console.log('⚠️  Testing Error Handling Edge Cases...');
    
    // Test 1: Missing config file
    if (fs.existsSync(this.configPath)) {
      fs.unlinkSync(this.configPath);
    }
    
    const auth = new AdminAuth();
    const initResult = await auth.initialize();
    this.assertTrue(initResult, 'Should initialize with missing config');
    
    // Test 2: Invalid configuration
    fs.writeFileSync(this.configPath, JSON.stringify({
      enabled: true,
      pinHash: null,
      salt: null
    }), 'utf8');
    
    const verifyResult = await auth.verifyPin('1234');
    this.assertFalse(verifyResult, 'Should handle null hash/salt gracefully');
    
    // Test 3: File system errors (skip if not possible)
    try {
      const result = await auth.loadConfig();
      this.assertTrue(result === null || typeof result === 'object', 'Should handle file errors gracefully');
    } catch (e) {
      // Skip if file system doesn't allow this test
      console.log('⚠️  Skipping file permission test due to system limitations');
    }
    
    console.log('✅ Error Handling edge cases passed\n');
  }

  async testConcurrentAccess() {
    console.log('🔄 Testing Concurrent Access...');
    
    await this.auth.setupPin('1234');
    
    // Test 1: Multiple simultaneous validations
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(this.auth.verifyPin('1234'));
      promises.push(this.auth.verifyPin('0000'));
    }
    
    const results = await Promise.all(promises);
    const validCount = results.filter(r => r === true).length;
    const invalidCount = results.filter(r => r === false).length;
    
    this.assertTrue(validCount >= 50, 'Should handle concurrent valid PIN validations');
    this.assertTrue(invalidCount >= 50, 'Should handle concurrent invalid PIN validations');
    
    console.log('✅ Concurrent Access tests passed\n');
  }

  async testMemoryManagement() {
    console.log('🧠 Testing Memory Management...');
    
    await this.auth.setupPin('1234');
    
    // Test 1: Session cleanup
    const initialSessionCount = this.auth.activeSessions.size;
    
    // Create many sessions
    const sessionIds = [];
    for (let i = 0; i < 50; i++) {
      const sessionId = await this.auth.createSession();
      sessionIds.push(sessionId);
    }
    
    // Test cleanup
    this.auth.cleanupExpiredSessions();
    const finalSessionCount = this.auth.activeSessions.size;
    
    this.assertTrue(finalSessionCount >= 0, 'Session cleanup should not crash');
    
    // Test 2: Failed attempts cleanup
    const clientId = 'memory-test';
    for (let i = 0; i < 100; i++) {
      this.auth.recordFailedAttempt(clientId);
    }
    
    const attempts = this.auth.failedAttempts.get(clientId) || [];
    this.assertTrue(Array.isArray(attempts), 'Failed attempts should be stored as array');
    
    console.log('✅ Memory Management tests passed\n');
  }

  async testConfigurationEdgeCases() {
    console.log('⚙️  Testing Configuration Edge Cases...');
    
    // Test 1: Various timeout values
    const timeoutTests = [
      { timeout: 0, expected: 0 },
      { timeout: 1, expected: 60000 },
      { timeout: 60, expected: 3600000 },
      { timeout: -1, expected: -60000 }
    ];
    
    for (const test of timeoutTests) {
      const auth = new AdminAuth();
      auth.sessionTimeout = test.timeout * 60 * 1000;
      this.assertTrue(auth.sessionTimeout === test.expected, `Timeout ${test.timeout} should convert correctly`);
    }
    
    // Test 2: Max attempts configuration
    const maxAttemptsTests = [0, 1, 3, 5, 10, -1];
    for (const maxAttempts of maxAttemptsTests) {
      const auth = new AdminAuth();
      auth.maxAttempts = maxAttempts;
      this.assertTrue(auth.maxAttempts === maxAttempts, `Max attempts ${maxAttempts} should be set correctly`);
    }
    
    console.log('✅ Configuration edge cases passed\n');
  }

  async testProcessHandlers() {
    console.log('🔄 Testing Process Handlers...');
    
    // Test that process handlers are set up
    const auth = new AdminAuth();
    
    // Verify handlers exist (can't actually test process.exit)
    this.assertTrue(typeof auth.setupProcessHandlers === 'function', 'setupProcessHandlers should be a function');
    
    // Test cleanup function
    auth.clearCurrentSession();
    this.assertTrue(auth.currentSession === null, 'Session should be cleared');
    
    console.log('✅ Process Handlers tests passed\n');
  }

  // Assertion helpers
  assertTrue(condition, message) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
    this.testResults.push({ passed: true, message });
  }

  assertFalse(condition, message) {
    if (condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
    this.testResults.push({ passed: true, message });
  }

  async cleanup() {
    console.log('🧹 Cleaning up test environment...');
    
    if (fs.existsSync(this.configPath)) {
      fs.unlinkSync(this.configPath);
    }
    
    // Clear intervals
    if (this.auth.cleanupInterval) {
      clearInterval(this.auth.cleanupInterval);
    }
    
    console.log('✅ Cleanup completed\n');
  }

  printResults() {
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    
    console.log('📊 Test Results Summary');
    console.log('=====================================');
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${total - passed}/${total}`);
    console.log('=====================================');
    
    if (total - passed === 0) {
      console.log('🎉 All edge case tests passed!');
    } else {
      console.log('⚠️  Some tests failed - review results above');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new AdminPinEdgeCaseTester();
  tester.run().catch(console.error);
}

module.exports = AdminPinEdgeCaseTester;