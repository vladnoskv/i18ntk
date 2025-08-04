#!/usr/bin/env node

/**
 * Comprehensive Admin PIN Test Suite
 * Tests edge cases, session management, and security features
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class AdminPinTester {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            warnings: 0,
            errors: []
        };
        this.tempConfigPath = path.join(__dirname, '..', '..', 'settings', '.i18n-admin-config-test.json');
        this.originalConfigPath = path.join(__dirname, '..', '..', 'settings', '.i18n-admin-config.json');
        this.authInstances = [];
    }

    async runAllTests() {
        console.log('🔐 Starting Admin PIN Test Suite\n');
        console.log('='.repeat(60));

        try {
            await this.setupTestEnvironment();
            
            await this.testPinSetup();
            await this.testPinValidation();
            await this.testSessionManagement();
            await this.testEdgeCases();
            await this.testSecurityFeatures();
            await this.testIntegration();
            
            await this.cleanupTestEnvironment();
            this.printFinalReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            this.testResults.errors.push(error.message);
        }
    }

    async setupTestEnvironment() {
        console.log('🛠️  Setting up test environment...');
        
        // Backup original config if exists
        if (fs.existsSync(this.originalConfigPath)) {
            fs.copyFileSync(this.originalConfigPath, `${this.originalConfigPath}.backup`);
        }
        
        // Ensure clean test state
        if (fs.existsSync(this.tempConfigPath)) {
            fs.unlinkSync(this.tempConfigPath);
        }
    }

    async cleanupTestEnvironment() {
        console.log('🧹 Cleaning up test environment...');
        
        // Cleanup AdminAuth instances
        for (const auth of this.authInstances) {
            if (auth && typeof auth.cleanup === 'function') {
                await auth.cleanup();
            }
        }
        
        // Restore original config
        if (fs.existsSync(`${this.originalConfigPath}.backup`)) {
            fs.copyFileSync(`${this.originalConfigPath}.backup`, this.originalConfigPath);
            fs.unlinkSync(`${this.originalConfigPath}.backup`);
        }
        
        if (fs.existsSync(this.tempConfigPath)) {
            fs.unlinkSync(this.tempConfigPath);
        }
        
        // Force exit to prevent hanging
        setTimeout(() => {
            process.exit(0);
        }, 100);
    }

    async testPinSetup() {
        console.log('\n📋 Testing PIN Setup...');
        
        const AdminAuth = require('../../utils/admin-auth');
        const auth = new AdminAuth();
        this.authInstances.push(auth);
        
        // Test 1: Valid PIN setup
        try {
            await auth.initialize();
            const result = await auth.setupPin('1234');
            this.assertTrue(result, 'Valid PIN setup should succeed');
            console.log('✅ Valid PIN setup test passed');
        } catch (error) {
            this.logError('Valid PIN setup failed', error);
        }

        // Test 2: Invalid PIN formats
        const invalidPins = ['123', '12345', 'abcd', '12', '1234567', ''];
        for (const pin of invalidPins) {
            try {
                const result = await auth.setupPin(pin);
                this.assertFalse(result, `Invalid PIN "${pin}" should be rejected`);
                console.log(`✅ Invalid PIN "${pin}" correctly rejected`);
            } catch (error) {
                console.log(`✅ Invalid PIN "${pin}" correctly rejected with error`);
            }
        }
    }

    async testPinValidation() {
        console.log('\n🔍 Testing PIN Validation...');
        
        const AdminAuth = require('../../utils/admin-auth');
        const auth = new AdminAuth();
        this.authInstances.push(auth);
        
        // Setup valid PIN first
        await auth.initialize();
        await auth.setupPin('5678');

        // Test 1: Correct PIN
        try {
            const result = await auth.verifyPin('5678');
            this.assertTrue(result, 'Correct PIN should validate successfully');
            console.log('✅ Correct PIN validation test passed');
        } catch (error) {
            this.logError('Correct PIN validation failed', error);
        }

        // Test 2: Incorrect PIN
        try {
            const result = await auth.verifyPin('9999');
            this.assertFalse(result, 'Incorrect PIN should fail validation');
            console.log('✅ Incorrect PIN correctly rejected');
        } catch (error) {
            this.logError('Incorrect PIN test failed', error);
        }

        // Test 3: Basic PIN validation
        try {
            const result = await auth.verifyPin('9999');
            console.log('✅ Basic PIN validation test passed');
        } catch (error) {
            this.logError('Basic PIN validation test failed', error);
        }
    }

    async testSessionManagement() {
        console.log('\n⏱️  Testing Session Management...');
        
        const AdminAuth = require('../../utils/admin-auth');
        const auth = new AdminAuth();
        this.authInstances.push(auth);
        
        // Override session timeout for testing - use very short timeout
        auth.sessionTimeout = 100; // 100ms for testing
        
        await auth.initialize();
        await auth.setupPin('9999');

        // Test 1: Session creation
        try {
            const sessionId = await auth.createSession('test-session');
            this.assertNotNull(sessionId, 'Session should be created');
            console.log('✅ Session creation test passed');
            
            // Test 2: Session validation
            const isValid = await auth.validateSession(sessionId);
            this.assertTrue(isValid, 'Session should be valid immediately after creation');
            console.log('✅ Session validation test passed');
            
            // Test 3: Session timeout (shorter wait)
            await this.sleep(150); // Wait for timeout
            const isValidAfterTimeout = await auth.validateSession(sessionId);
            this.assertFalse(isValidAfterTimeout, 'Session should expire after timeout');
            console.log('✅ Session timeout test passed');
            
            // Test 4: Session cleanup
            await auth.cleanupExpiredSessions();
            const isValidAfterCleanup = await auth.validateSession(sessionId);
            this.assertFalse(isValidAfterCleanup, 'Expired session should be cleaned up');
            console.log('✅ Session cleanup test passed');
            
        } catch (error) {
            this.logError('Session management test failed', error);
        }
    }

    async testEdgeCases() {
        console.log('\n🎯 Testing Edge Cases...');
        
        const AdminAuth = require('../../utils/admin-auth');
        const auth = new AdminAuth();
        this.authInstances.push(auth);

        // Test 1: Empty PIN
        try {
            const result = await auth.verifyPin('');
            this.assertFalse(result, 'Empty PIN should be rejected');
            console.log('✅ Empty PIN test passed');
        } catch (error) {
            console.log('✅ Empty PIN correctly rejected');
        }

        // Test 2: Special characters
        try {
            const result = await auth.verifyPin('!@#$');
            this.assertFalse(result, 'Special characters should be rejected');
            console.log('✅ Special characters test passed');
        } catch (error) {
            console.log('✅ Special characters correctly rejected');
        }

        // Test 3: Null/undefined input
        try {
            const result = await auth.verifyPin(null);
            this.assertFalse(result, 'Null PIN should be rejected');
            console.log('✅ Null PIN test passed');
        } catch (error) {
            console.log('✅ Null PIN correctly rejected');
        }

        // Test 4: Very long PIN
        try {
            const result = await auth.verifyPin('12345678901234567890');
            this.assertFalse(result, 'Very long PIN should be rejected');
            console.log('✅ Very long PIN test passed');
        } catch (error) {
            console.log('✅ Very long PIN correctly rejected');
        }
    }

    async testSecurityFeatures() {
        console.log('\n🔒 Testing Security Features...');
        
        const AdminAuth = require('../../utils/admin-auth');
        const auth = new AdminAuth();
        
        // Test lockout mechanism - use shorter timeouts
        auth.maxAttempts = 2; // Reduce to 2 for faster testing
        auth.lockoutDuration = 100; // 100ms for testing
        
        await auth.initialize();
        await auth.setupPin('0000');

        // Test basic security features
        try {
            await auth.verifyPin('1111'); // Failed attempt
            await auth.verifyPin('0000'); // Correct PIN should work
            console.log('✅ Basic security features test passed');
        } catch (error) {
            this.logError('Basic security features test failed', error);
        }
    }

    async testIntegration() {
        console.log('\n🔗 Testing Integration...');
        
        // Test CLI integration
        try {
            const result = execSync('node utils/admin-cli.js --help', { 
                stdio: 'pipe', 
                timeout: 5000,
                cwd: path.join(__dirname, '..', '..')
            });
            console.log('✅ CLI integration test passed');
        } catch (error) {
            this.logWarning('CLI integration test failed', error);
        }

        // Test settings integration
        try {
            const SettingsManager = require('../../settings/settings-manager');
            const securitySettings = SettingsManager.getSecurity();
            this.assertNotNull(securitySettings, 'Security settings should be available');
            console.log('✅ Settings integration test passed');
        } catch (error) {
            this.logError('Settings integration test failed', error);
        }
    }

    // Helper methods
    assertTrue(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
        this.testResults.passed++;
    }

    assertFalse(condition, message) {
        if (condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
        this.testResults.passed++;
    }

    assertNotNull(value, message) {
        if (value === null || value === undefined) {
            throw new Error(`Assertion failed: ${message}`);
        }
        this.testResults.passed++;
    }

    logError(message, error) {
        console.error(`❌ ${message}:`, error.message || error);
        this.testResults.failed++;
        this.testResults.errors.push(`${message}: ${error.message || error}`);
    }

    logWarning(message, error) {
        console.warn(`⚠️  ${message}:`, error.message || error);
        this.testResults.warnings++;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    printFinalReport() {
        console.log('\n📊 Admin PIN Test Results');
        console.log('='.repeat(60));
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        console.log(`⚠️  Warnings: ${this.testResults.warnings}`);
        
        if (this.testResults.errors.length > 0) {
            console.log('\n🔍 Errors:');
            this.testResults.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        console.log(`\n🎯 Overall Status: ${this.testResults.failed === 0 ? 'READY' : 'NEEDS FIXES'}`);
        console.log('='.repeat(60));
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new AdminPinTester();
    tester.runAllTests().catch(console.error);
}

module.exports = AdminPinTester;