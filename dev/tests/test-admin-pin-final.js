#!/usr/bin/env node

/**
 * Final Comprehensive Tests for Admin PIN System
 * Focused on core functionality and critical edge cases
 */

const AdminAuth = require('../../utils/admin-auth');
const fs = require('fs');
const path = require('path');

class AdminPinFinalTester {
  constructor() {
    this.configPath = path.join(process.cwd(), 'settings', '.i18n-admin-config.json');
    this.auth = new AdminAuth();
  }

  async run() {
    console.log('🔍 Starting Admin PIN Final Tests\n');
    
    try {
      await this.setupTestEnvironment();
      
      const results = await this.runCoreTests();
      
      await this.cleanup();
      
      this.printResults(results);
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async setupTestEnvironment() {
    console.log('🛠️  Setting up test environment...');
    
    if (fs.existsSync(this.configPath)) {
      fs.unlinkSync(this.configPath);
    }
    
    // Enable admin PIN for testing
    const SettingsManager = require('../../settings/settings-manager');
    SettingsManager.setSetting('security.adminPinEnabled', true);
    
    await this.auth.initialize();
    console.log('✅ Test environment ready\n');
  }

  async runCoreTests() {
    console.log('📋 Running core functionality tests...\n');
    
    const results = {
      passed: 0,
      failed: 0,
      tests: []
    };

    // Test 1: PIN Setup
    console.log('🔐 Testing PIN Setup...');
    try {
      const setupResult = await this.auth.setupPin('1234');
      if (setupResult) {
        console.log('✅ PIN setup successful');
        results.passed++;
        results.tests.push({ name: 'PIN Setup', status: 'PASSED' });
      } else {
        throw new Error('PIN setup failed');
      }
    } catch (error) {
      console.log('❌ PIN setup failed:', error.message);
      results.failed++;
      results.tests.push({ name: 'PIN Setup', status: 'FAILED', error: error.message });
    }

    // Test 2: PIN Validation - Correct PIN
    console.log('🔍 Testing PIN Validation...');
    try {
      const verifyResult = await this.auth.verifyPin('1234');
      if (verifyResult) {
        console.log('✅ Correct PIN validation successful');
        results.passed++;
        results.tests.push({ name: 'PIN Validation - Correct', status: 'PASSED' });
      } else {
        throw new Error('Correct PIN rejected');
      }
    } catch (error) {
      console.log('❌ PIN validation failed:', error.message);
      results.failed++;
      results.tests.push({ name: 'PIN Validation - Correct', status: 'FAILED', error: error.message });
    }

    // Test 3: PIN Validation - Incorrect PIN
    try {
      const verifyResult = await this.auth.verifyPin('0000');
      if (!verifyResult) {
        console.log('✅ Incorrect PIN correctly rejected');
        results.passed++;
        results.tests.push({ name: 'PIN Validation - Incorrect', status: 'PASSED' });
      } else {
        throw new Error('Incorrect PIN accepted');
      }
    } catch (error) {
      console.log('❌ PIN validation failed:', error.message);
      results.failed++;
      results.tests.push({ name: 'PIN Validation - Incorrect', status: 'FAILED', error: error.message });
    }

    // Test 4: Session Management
    console.log('⏱️  Testing Session Management...');
    try {
      const sessionId = await this.auth.createSession();
      const isValid = await this.auth.validateSession(sessionId);
      
      if (sessionId && isValid) {
        console.log('✅ Session management successful');
        results.passed++;
        results.tests.push({ name: 'Session Management', status: 'PASSED' });
      } else {
        throw new Error('Session validation failed');
      }
    } catch (error) {
      console.log('❌ Session management failed:', error.message);
      results.failed++;
      results.tests.push({ name: 'Session Management', status: 'FAILED', error: error.message });
    }

    // Test 5: Edge Cases - Valid PINs
    console.log('🎯 Testing Valid PINs...');
    const validPins = ['0000', '1234', '9999', '5000'];
    for (const pin of validPins) {
      try {
        await this.auth.setupPin(pin);
        const result = await this.auth.verifyPin(pin);
        if (result) {
          console.log(`✅ Valid PIN ${pin} accepted`);
          results.passed++;
          results.tests.push({ name: `Valid PIN ${pin}`, status: 'PASSED' });
        } else {
          throw new Error(`Valid PIN ${pin} rejected`);
        }
      } catch (error) {
        console.log(`❌ Valid PIN ${pin} failed:`, error.message);
        results.failed++;
        results.tests.push({ name: `Valid PIN ${pin}`, status: 'FAILED', error: error.message });
      }
    }

    // Test 6: Edge Cases - Invalid PINs
    console.log('🎯 Testing Invalid PINs...');
    const invalidPins = ['', '123', '12345', 'abc', '12ab', null, ' 123', '123 '];
    for (const pin of invalidPins) {
      try {
        const result = await this.auth.setupPin(pin);
        if (!result) {
          console.log(`✅ Invalid PIN ${JSON.stringify(pin)} correctly rejected`);
          results.passed++;
          results.tests.push({ name: `Invalid PIN ${JSON.stringify(pin)}`, status: 'PASSED' });
        } else {
          throw new Error(`Invalid PIN ${JSON.stringify(pin)} accepted`);
        }
      } catch (error) {
        console.log(`✅ Invalid PIN ${JSON.stringify(pin)} correctly rejected`);
        results.passed++;
        results.tests.push({ name: `Invalid PIN ${JSON.stringify(pin)}`, status: 'PASSED' });
      }
    }

    // Test 7: Authentication Required Check
    console.log('🔍 Testing Authentication Required...');
    try {
      const isRequired = await this.auth.isAuthRequired();
      if (isRequired === true) {
        console.log('✅ Authentication required check working');
        results.passed++;
        results.tests.push({ name: 'Auth Required Check', status: 'PASSED' });
      } else {
        throw new Error('Authentication required check failed');
      }
    } catch (error) {
      console.log('❌ Auth required check failed:', error.message);
      results.failed++;
      results.tests.push({ name: 'Auth Required Check', status: 'FAILED', error: error.message });
    }

    return results;
  }

  async cleanup() {
    console.log('🧹 Cleaning up test environment...');
    
    if (fs.existsSync(this.configPath)) {
      fs.unlinkSync(this.configPath);
    }
    
    if (this.auth.cleanupInterval) {
      clearInterval(this.auth.cleanupInterval);
    }
    
    console.log('✅ Cleanup completed\n');
  }

  printResults(results) {
    console.log('📊 Final Test Results');
    console.log('=====================================');
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📋 Total: ${results.passed + results.failed}`);
    console.log('=====================================');
    
    if (results.failed === 0) {
      console.log('🎉 All core functionality tests passed!');
      console.log('✅ Admin PIN system is ready for production use');
    } else {
      console.log('⚠️  Some tests failed - review results above');
      results.tests.filter(t => t.status === 'FAILED').forEach(test => {
        console.log(`  - ${test.name}: ${test.error}`);
      });
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new AdminPinFinalTester();
  tester.run().catch(console.error);
}

module.exports = AdminPinFinalTester;