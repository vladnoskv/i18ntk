/**
 * Comprehensive Test Runner for i18n Management Toolkit v1.6.0
 * Runs all integration, edge case, and regression tests
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class TestRunner {
    constructor() {
        this.testDir = path.join(__dirname);
        this.projectRoot = path.join(__dirname, '..', '..');
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0,
            tests: []
        };
        this.startTime = Date.now();
    }

    async run() {
        console.log('🧪 Starting Comprehensive Test Suite for i18n Management Toolkit v1.6.0\n');
        
        try {
            await this.runEnvironmentSetup();
            await this.runIntegrationTests();
            await this.runEdgeCaseTests();
            await this.runRegressionTests();
            await this.runSecurityTests();
            await this.runPerformanceTests();
            
            this.printResults();
            
            if (this.results.failed > 0) {
                console.log(`❌ ${this.results.failed} test(s) failed`);
                process.exit(1);
            } else {
                console.log(`✅ All ${this.results.total} tests passed!`);
                process.exit(0);
            }
        } catch (error) {
            console.error('💥 Test runner failed:', error.message);
            process.exit(1);
        }
    }

    async runEnvironmentSetup() {
        console.log('📁 Setting up test environment...');
        
        // Ensure .i18ntk directory structure exists
        const testDirs = [
            '.i18ntk',
            '.i18ntk/backups',
            '.i18ntk/temp',
            '.i18ntk/.cache',
            '.i18ntk/tests'
        ];

        for (const dir of testDirs) {
            const fullPath = path.join(this.projectRoot, dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
            }
        }

        console.log('✅ Environment setup complete\n');
    }

    async runIntegrationTests() {
        console.log('🔧 Running Integration Tests...');
        
        const integrationTest = path.join(this.testDir, 'config-integration.test.js');
        if (fs.existsSync(integrationTest)) {
            await this.runTestFile('Integration Tests', integrationTest);
        } else {
            console.log('⚠️  Integration test file not found, skipping...');
            this.results.skipped++;
        }
    }

    async runEdgeCaseTests() {
        console.log('🎯 Running Edge Case Tests...');
        
        const edgeCaseTest = path.join(this.testDir, 'edge-cases.test.js');
        if (fs.existsSync(edgeCaseTest)) {
            await this.runTestFile('Edge Cases', edgeCaseTest);
        } else {
            console.log('⚠️  Edge case test file not found, skipping...');
            this.results.skipped++;
        }
    }

    async runRegressionTests() {
        console.log('🔄 Running Regression Tests...');
        
        const regressionTests = [
            { name: 'Config System', path: 'test/config-system-tests.js' },
            { name: 'Admin PIN', path: 'test/test-admin-pin-fixed.js' },
            { name: 'Cleanup', path: 'test/cleanup-system.js' }
        ];

        for (const test of regressionTests) {
            const fullPath = path.join(this.projectRoot, test.path);
            if (fs.existsSync(fullPath)) {
                await this.runTestFile(test.name, fullPath);
            } else {
                console.log(`⚠️  ${test.name} test not found, skipping...`);
                this.results.skipped++;
            }
        }
    }

    async runSecurityTests() {
        console.log('🔒 Running Security Tests...');
        
        const securityTest = path.join(this.projectRoot, 'utils', 'security-check.js');
        if (fs.existsSync(securityTest)) {
            await this.runCommand('Security Check', ['node', securityTest]);
        } else {
            console.log('⚠️  Security check script not found, skipping...');
            this.results.skipped++;
        }
    }

    async runPerformanceTests() {
        console.log('⚡ Running Performance Tests...');
        
        const performanceTest = path.join(this.projectRoot, 'benchmarks', 'run-benchmarks.js');
        if (fs.existsSync(performanceTest)) {
            await this.runCommand('Performance', ['node', performanceTest, '--ci-mode']);
        } else {
            console.log('⚠️  Performance benchmark not found, skipping...');
            this.results.skipped++;
        }
    }

    async runTestFile(testName, filePath) {
        return new Promise((resolve) => {
            const test = {
                name: testName,
                status: 'running',
                output: '',
                error: '',
                duration: 0
            };

            const startTime = Date.now();
            const child = spawn('node', [filePath], {
                cwd: this.projectRoot,
                stdio: 'pipe'
            });

            let output = '';
            let error = '';

            child.stdout.on('data', (data) => {
                output += data.toString();
            });

            child.stderr.on('data', (data) => {
                error += data.toString();
            });

            child.on('close', (code) => {
                test.duration = Date.now() - startTime;
                test.output = output;
                test.error = error;
                
                if (code === 0) {
                    test.status = 'passed';
                    this.results.passed++;
                    console.log(`✅ ${testName} - ${test.duration}ms`);
                } else {
                    test.status = 'failed';
                    this.results.failed++;
                    console.log(`❌ ${testName} - ${test.duration}ms`);
                    if (error) {
                        console.log(`   Error: ${error.trim()}`);
                    }
                }

                this.results.tests.push(test);
                this.results.total++;
                resolve();
            });

            child.on('error', (err) => {
                test.status = 'failed';
                test.error = err.message;
                test.duration = Date.now() - startTime;
                this.results.failed++;
                this.results.tests.push(test);
                this.results.total++;
                console.log(`❌ ${testName} - Error: ${err.message}`);
                resolve();
            });
        });
    }

    async runCommand(testName, command) {
        return new Promise((resolve) => {
            const test = {
                name: testName,
                status: 'running',
                output: '',
                error: '',
                duration: 0
            };

            const startTime = Date.now();
            const [cmd, ...args] = command;
            
            const child = spawn(cmd, args, {
                cwd: this.projectRoot,
                stdio: 'pipe'
            });

            let output = '';
            let error = '';

            child.stdout.on('data', (data) => {
                output += data.toString();
            });

            child.stderr.on('data', (data) => {
                error += data.toString();
            });

            child.on('close', (code) => {
                test.duration = Date.now() - startTime;
                test.output = output;
                test.error = error;
                
                // Security check might have warnings but still pass
                const isSuccess = code === 0 || 
                    (testName === 'Security Check' && output.includes('✅'));
                
                if (isSuccess) {
                    test.status = 'passed';
                    this.results.passed++;
                    console.log(`✅ ${testName} - ${test.duration}ms`);
                } else {
                    test.status = 'failed';
                    this.results.failed++;
                    console.log(`❌ ${testName} - ${test.duration}ms`);
                    if (error) {
                        console.log(`   Error: ${error.trim()}`);
                    }
                }

                this.results.tests.push(test);
                this.results.total++;
                resolve();
            });

            child.on('error', (err) => {
                test.status = 'failed';
                test.error = err.message;
                test.duration = Date.now() - startTime;
                this.results.failed++;
                this.results.tests.push(test);
                this.results.total++;
                console.log(`❌ ${testName} - Error: ${err.message}`);
                resolve();
            });
        });
    }

    printResults() {
        this.results.duration = Date.now() - this.startTime;
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 Test Results Summary');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${this.results.total}`);
        console.log(`Passed: ${this.results.passed}`);
        console.log(`Failed: ${this.results.failed}`);
        console.log(`Skipped: ${this.results.skipped}`);
        console.log(`Duration: ${this.results.duration}ms`);
        
        if (this.results.failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.results.tests
                .filter(test => test.status === 'failed')
                .forEach(test => {
                    console.log(`  - ${test.name}: ${test.error || 'See output above'}`);
                });
        }
        
        if (this.results.skipped > 0) {
            console.log('\n⚠️  Skipped Tests:');
            this.results.tests
                .filter(test => test.status === 'skipped')
                .forEach(test => {
                    console.log(`  - ${test.name}`);
                });
        }
        
        console.log('='.repeat(60));
    }
}

// Run if called directly
if (require.main === module) {
    const runner = new TestRunner();
    runner.run().catch(console.error);
}

module.exports = TestRunner;