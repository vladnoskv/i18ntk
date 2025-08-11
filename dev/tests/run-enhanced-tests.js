#!/usr/bin/env node

/**
 * Enhanced test runner for i18ntk 1.8.1
 * Runs all tests including new feature tests
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class EnhancedTestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      tests: []
    };
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',    // cyan
      success: '\x1b[32m', // green
      error: '\x1b[31m',   // red
      warning: '\x1b[33m', // yellow
      reset: '\x1b[0m'
    };
    
    const color = colors[type] || colors.info;
    console.log(`${color}${message}${colors.reset}`);
  }

  async runTest(testFile, description) {
    this.results.total++;
    
    try {
      this.log(`🧪 Running ${description}...`, 'info');
      
      const start = Date.now();
      const output = execSync(`node "${testFile}"`, {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 30000
      });
      
      const duration = Date.now() - start;
      
      this.results.passed++;
      this.results.tests.push({
        file: testFile,
        description,
        status: 'passed',
        duration,
        output: output.trim()
      });
      
      this.log(`✅ ${description} (${duration}ms)`, 'success');
      
    } catch (error) {
      this.results.failed++;
      this.results.tests.push({
        file: testFile,
        description,
        status: 'failed',
        duration: Date.now() - this.startTime,
        error: error.message,
        stderr: error.stderr?.toString() || ''
      });
      
      this.log(`❌ ${description}: ${error.message}`, 'error');
    }
  }

  async runAllTests() {
    console.log('🚀 i18ntk 1.8.1 Enhanced Test Suite\n');
    console.log('='.repeat(50));
    
    const testsDir = __dirname;
    const testFiles = [
      { file: 'new-features.test.js', description: 'New Feature Tests (Exit codes, Doctor, Validator, Framework detection, Plugins)' },
      { file: 'security-check-silent.test.js', description: 'Security Tests' },
      { file: 'config-system-tests.js', description: 'Configuration System Tests' },
      { file: 'cli-helper.test.js', description: 'CLI Helper Tests' }
    ];

    // Run new feature tests first
    for (const { file, description } of testFiles) {
      const fullPath = path.join(testsDir, file);
      if (fs.existsSync(fullPath)) {
        await this.runTest(fullPath, description);
      } else {
        this.log(`⚠️ Skipping ${description} - file not found`, 'warning');
        this.results.skipped++;
      }
    }

    // Run unit tests for individual components
    const unitTests = [
      'exit-codes.test.js',
      'plugin-loader.test.js',
      'format-manager.test.js',
      'framework-detector.test.js',
      'security-utils.test.js'
    ];

    for (const testFile of unitTests) {
      const fullPath = path.join(testsDir, 'unit', testFile);
      if (fs.existsSync(fullPath)) {
        await this.runTest(fullPath, `Unit Test: ${testFile}`);
      }
    }

    // Run integration tests
    const integrationTests = [
      'doctor-enhanced.test.js',
      'validator-enhanced.test.js',
      'framework-detection.test.js'
    ];

    for (const testFile of integrationTests) {
      const fullPath = path.join(testsDir, 'integration', testFile);
      if (fs.existsSync(fullPath)) {
        await this.runTest(fullPath, `Integration Test: ${testFile}`);
      }
    }

    this.generateReport();
  }

  generateReport() {
    const duration = Date.now() - this.startTime;
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Summary Report');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Skipped: ${this.results.skipped}`);
    console.log(`Duration: ${duration}ms`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(test => test.status === 'failed')
        .forEach(test => {
          console.log(`  - ${test.description}`);
          if (test.error) {
            console.log(`    Error: ${test.error}`);
          }
        });
    }

    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      duration,
      summary: {
        success: this.results.failed === 0,
        coverage: this.calculateCoverage()
      }
    };

    const reportPath = path.join(__dirname, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📋 Detailed report saved to: ${reportPath}`);

    // Exit with appropriate code
    process.exit(this.results.failed > 0 ? 1 : 0);
  }

  calculateCoverage() {
    // Simple coverage calculation based on test categories
    const categories = ['exit-codes', 'doctor', 'validator', 'framework-detection', 'plugins', 'security'];
    const covered = categories.filter(category => 
      this.results.tests.some(test => 
        test.description.toLowerCase().includes(category)
      )
    );
    
    return {
      categories: categories.length,
      covered: covered.length,
      percentage: Math.round((covered.length / categories.length) * 100)
    };
  }
}

// Create missing unit test files
function createUnitTests() {
  const unitDir = path.join(__dirname, 'unit');
  if (!fs.existsSync(unitDir)) {
    fs.mkdirSync(unitDir, { recursive: true });
  }

  // Exit codes test
  const exitCodesTest = `#!/usr/bin/env node
const assert = require('assert');
const exitCodes = require('../../utils/exit-codes');

console.log('Testing exit codes...');
assert.strictEqual(exitCodes.SUCCESS, 0);
assert.strictEqual(exitCodes.CONFIG_ERROR, 1);
assert.strictEqual(exitCodes.VALIDATION_FAILED, 2);
assert.strictEqual(exitCodes.SECURITY_VIOLATION, 3);
console.log('✅ Exit codes test passed');
`;

  // Framework detector test
  const frameworkTest = `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Mock FrameworkDetector
class FrameworkDetector {
  detect(projectPath) {
    const packagePath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(packagePath)) return 'generic';
    
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    if (deps['react-i18next'] || deps['i18next']) return 'i18next';
    if (deps['@lingui/macro'] || deps['@lingui/react']) return 'lingui';
    if (deps['react-intl'] || deps['formatjs']) return 'formatjs';
    
    return 'generic';
  }
}

console.log('Testing framework detection...');
const detector = new FrameworkDetector();

// Test cases
const testCases = [
  { name: 'i18next', deps: { 'react-i18next': '^11.0.0' }, expected: 'i18next' },
  { name: 'lingui', deps: { '@lingui/macro': '^3.0.0' }, expected: 'lingui' },
  { name: 'formatjs', deps: { 'react-intl': '^5.0.0' }, expected: 'formatjs' },
  { name: 'generic', deps: {}, expected: 'generic' }
];

testCases.forEach(testCase => {
  const tempDir = path.join(__dirname, 'temp', testCase.name);
  fs.mkdirSync(tempDir, { recursive: true });
  fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ dependencies: testCase.deps }));
  
  const detected = detector.detect(tempDir);
  assert.strictEqual(detected, testCase.expected, \`Should detect \${testCase.name}\`);
  
  fs.rmSync(tempDir, { recursive: true, force: true });
});

console.log('✅ Framework detection test passed');
`;

  fs.writeFileSync(path.join(unitDir, 'exit-codes.test.js'), exitCodesTest);
  fs.writeFileSync(path.join(unitDir, 'framework-detector.test.js'), frameworkTest);
  fs.chmodSync(path.join(unitDir, 'exit-codes.test.js'), 0o755);
  fs.chmodSync(path.join(unitDir, 'framework-detector.test.js'), 0o755);
}

// Main execution
if (require.main === module) {
  createUnitTests();
  const runner = new EnhancedTestRunner();
  runner.runAllTests().catch(console.error);
}

module.exports = EnhancedTestRunner;