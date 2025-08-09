#!/usr/bin/env node

/**
 * Test Runner for i18n Management Toolkit v1.6.0
 * Runs all test suites and provides comprehensive reporting
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TestRunner {
    constructor() {
        this.testSuites = [
            { name: 'Admin PIN Tests', script: 'dev/tests/test-admin-pin.js' },
            { name: 'Admin PIN Edge Case Tests', script: 'dev/tests/test-admin-pin-edge.js' },
            { name: 'Comprehensive Tests', script: 'dev/tests/test-comprehensive.js' },
            { name: 'System Tests', script: 'dev/tests/test-complete-system.js' },
            { name: 'Console i18n Tests', script: 'dev/tests/test-console-i18n.js' },
            { name: 'Translation Validation', script: 'scripts/validate-all-translations.js' }
        ];
        this.results = [];
        this.startTime = new Date();
    }

    async runAllTests() {
        console.log('🚀 i18n Management Toolkit v1.6.0 Test Runner');
        console.log('='.repeat(80));
        console.log(`Started: ${this.startTime.toLocaleString()}`);
        console.log();

        let passed = 0;
        let failed = 0;

        for (const suite of this.testSuites) {
            console.log(`📋 Running: ${suite.name}`);
            console.log('-'.repeat(50));
            
            try {
                const result = await this.runTestSuite(suite);
                this.results.push(result);
                
                if (result.success) {
                    passed++;
                    console.log(`✅ ${suite.name}: PASSED (${result.duration}ms)`);
                } else {
                    failed++;
                    console.log(`❌ ${suite.name}: FAILED (${result.duration}ms)`);
                    console.log(`   Error: ${result.error}`);
                }
                
                console.log();
                
            } catch (error) {
                failed++;
                this.results.push({
                    name: suite.name,
                    success: false,
                    duration: 0,
                    error: error.message
                });
                console.log(`❌ ${suite.name}: FAILED`);
                console.log(`   Error: ${error.message}`);
                console.log();
            }
        }

        this.generateFinalReport(passed, failed);
    }

    async runTestSuite(suite) {
        const start = Date.now();
        
        try {
            const output = execSync(`node ${suite.script}`, {
                stdio: 'pipe',
                timeout: 60000, // 1 minute timeout per test
                cwd: path.join(__dirname, '..')
            });
            
            const end = Date.now();
            const outputStr = output.toString();
            
            // Parse output to determine success
            const success = !outputStr.includes('FAILED') && !outputStr.includes('NEEDS FIXES');
            
            return {
                name: suite.name,
                success,
                duration: end - start,
                output: outputStr,
                error: null
            };
            
        } catch (error) {
            const end = Date.now();
            return {
                name: suite.name,
                success: false,
                duration: end - start,
                output: error.stdout?.toString() || '',
                error: error.message
            };
        }
    }

    generateFinalReport(passed, failed) {
        const endTime = new Date();
        const duration = endTime - this.startTime;

        console.log('📊 Final Test Summary');
        console.log('='.repeat(80));
        console.log(`Total Tests: ${this.testSuites.length}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`⏱️  Total Duration: ${duration}ms`);
        console.log(`📅 Completed: ${endTime.toLocaleString()}`);
        
        if (failed > 0) {
            console.log('\n🔍 Failed Tests:');
            this.results.filter(r => !r.success).forEach(result => {
                console.log(`  - ${result.name}: ${result.error}`);
            });
        }

        // Generate detailed report
        const report = {
            version: '1.6.0',
            timestamp: endTime.toISOString(),
            totalTests: this.testSuites.length,
            passed,
            failed,
            duration,
            results: this.results,
            status: failed === 0 ? 'READY' : 'NEEDS FIXES'
        };

        const reportPath = path.join(__dirname, '..', 'dev', 'tests', 'test-report-final.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
        
        // Exit with appropriate code
        process.exit(failed === 0 ? 0 : 1);
    }

    // Quick test option for development
    async runQuickTests() {
        console.log('⚡ Running Quick Tests (Admin PIN)...');
        
        const quickSuites = [
            { name: 'Admin PIN Tests', script: 'dev/tests/test-admin-pin.js' },
            
        ];

        let passed = 0;
        let failed = 0;

        for (const suite of quickSuites) {
            console.log(`📋 Running: ${suite.name}`);
            
            try {
                const output = execSync(`node ${suite.script}`, {
                    stdio: 'inherit',
                    timeout: 30000,
                    cwd: path.join(__dirname, '..')
                });
                
                passed++;
                console.log(`✅ ${suite.name}: PASSED`);
                
            } catch (error) {
                failed++;
                console.log(`❌ ${suite.name}: FAILED`);
            }
            
            console.log();
        }

        console.log(`Quick Tests: ${passed}/${quickSuites.length} passed`);
        return failed === 0;
    }
}

// CLI handling
const args = process.argv.slice(2);
const runner = new TestRunner();

if (args.includes('--quick')) {
    runner.runQuickTests();
} else if (args.includes('--admin-pin')) {
    console.log('🔐 Running Admin PIN Tests Only...');
    try {
        execSync('node dev/tests/test-admin-pin.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    } catch (error) {
        process.exit(1);
    }
} else if (args.includes('--comprehensive')) {
    console.log('🧪 Running Comprehensive Tests Only...');
    try {
        execSync('node dev/tests/test-comprehensive.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    } catch (error) {
        process.exit(1);
    }
} else {
    runner.runAllTests();
}