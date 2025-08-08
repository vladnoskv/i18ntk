#!/usr/bin/env node

/**
 * Master Test Runner
 * Runs all tests in sequence with proper cleanup between each test
 * Ensures no test state leaks between runs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class MasterTestRunner {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            warnings: 0,
            errors: []
        };
        
        this.testScripts = [
            'config-system-tests.js',
            'test-admin-pin-fixed.js'
        ];
        
        this.cleanupScript = 'cleanup-system.js';
    }

    async runAllTests() {
        console.log('🚀 Starting Master Test Suite\n');
        console.log('='.repeat(80));
        console.log('This will run all tests with proper cleanup between each test');
        console.log('='.repeat(80));

        try {
            await this.runPreCleanup();
            
            for (const testScript of this.testScripts) {
                await this.runTestWithCleanup(testScript);
            }
            
            await this.runFinalCleanup();
            this.printFinalReport();
            
        } catch (error) {
            console.error('❌ Master test suite failed:', error.message);
            this.testResults.errors.push(error.message);
            await this.runFinalCleanup();
        }
    }

    async runPreCleanup() {
        console.log('\n🧹 Running pre-test cleanup...');
        
        try {
            execSync(`node ${this.cleanupScript}`, {
                cwd: __dirname,
                stdio: 'inherit'
            });
            console.log('✅ Pre-test cleanup completed');
        } catch (error) {
            console.warn('⚠️  Pre-test cleanup failed, continuing anyway...');
        }
    }

    async runTestWithCleanup(testScript) {
        console.log(`\n🧪 Running test: ${testScript}`);
        console.log('-'.repeat(60));
        
        try {
            // Run the test
            const result = execSync(`node ${testScript}`, {
                cwd: __dirname,
                stdio: 'inherit',
                timeout: 30000 // 30 second timeout per test
            });
            
            console.log(`✅ ${testScript} completed successfully`);
            this.testResults.passed++;
            
        } catch (error) {
            console.error(`❌ ${testScript} failed:`, error.message);
            this.testResults.failed++;
            this.testResults.errors.push(`${testScript}: ${error.message}`);
        }
        
        // Always run cleanup after each test
        await this.runPostTestCleanup();
    }

    async runPostTestCleanup() {
        console.log('\n🧹 Running post-test cleanup...');
        
        try {
            execSync(`node ${this.cleanupScript}`, {
                cwd: __dirname,
                stdio: 'inherit'
            });
            console.log('✅ Post-test cleanup completed');
        } catch (error) {
            console.warn('⚠️  Post-test cleanup failed, continuing...');
        }
    }

    async runFinalCleanup() {
        console.log('\n🧹 Running final cleanup...');
        
        try {
            execSync(`node ${this.cleanupScript}`, {
                cwd: __dirname,
                stdio: 'inherit'
            });
            console.log('✅ Final cleanup completed');
        } catch (error) {
            console.warn('⚠️  Final cleanup failed, but tests completed');
        }
    }

    printFinalReport() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 MASTER TEST SUITE FINAL REPORT');
        console.log('='.repeat(80));
        console.log(`✅ Tests Passed: ${this.testResults.passed}`);
        console.log(`❌ Tests Failed: ${this.testResults.failed}`);
        console.log(`⚠️  Warnings: ${this.testResults.warnings}`);
        
        if (this.testResults.errors.length > 0) {
            console.log('\n🚨 All Errors:');
            this.testResults.errors.forEach(error => console.log(`  - ${error}`));
        }
        
        console.log('\n📋 Test Summary:');
        this.testScripts.forEach(script => {
            const status = this.testResults.errors.some(e => e.includes(script)) ? '❌' : '✅';
            console.log(`  ${status} ${script}`);
        });
        
        const success = this.testResults.failed === 0;
        console.log(`\n${success ? '🎉 All tests completed successfully!' : '❌ Some tests failed'}`);
        console.log('🎯 System is now in clean default state');
        
        process.exit(success ? 0 : 1);
    }
}

// Create a simple test runner for individual tests
class QuickTestRunner {
    constructor() {
        this.testTypes = {
            'config': 'config-system-tests.js',
            'admin': 'test-admin-pin-fixed.js',
            'cleanup': 'cleanup-system.js',
            'all': 'run-all-tests.js'
        };
    }

    async runTest(type) {
        if (!this.testTypes[type]) {
            console.error('❌ Invalid test type. Available types:');
            Object.keys(this.testTypes).forEach(t => console.log(`  - ${t}`));
            process.exit(1);
        }

        const testScript = this.testTypes[type];
        console.log(`🧪 Running ${type} test...`);
        
        try {
            execSync(`node ${testScript}`, {
                cwd: __dirname,
                stdio: 'inherit'
            });
        } catch (error) {
            console.error(`❌ ${type} test failed:`, error.message);
            process.exit(1);
        }
    }

    showUsage() {
        console.log('Usage: node run-all-tests.js [test-type]');
        console.log('\nAvailable test types:');
        Object.keys(this.testTypes).forEach(type => {
            console.log(`  ${type.padEnd(10)} - ${this.testTypes[type]}`);
        });
        console.log('\nExamples:');
        console.log('  node run-all-tests.js config');
        console.log('  node run-all-tests.js admin');
        console.log('  node run-all-tests.js all');
    }
}

// Handle command line arguments
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        // Run master test suite
        const runner = new MasterTestRunner();
        runner.runAllTests();
    } else {
        // Run specific test
        const quickRunner = new QuickTestRunner();
        const testType = args[0];
        
        if (testType === 'help' || testType === '--help' || testType === '-h') {
            quickRunner.showUsage();
        } else {
            quickRunner.runTest(testType);
        }
    }
}

module.exports = { MasterTestRunner, QuickTestRunner };