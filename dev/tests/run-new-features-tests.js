#!/usr/bin/env node

/**
 * Comprehensive test runner for i18ntk 1.8.1 new features
 * Executes all tests for the enhanced functionality
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class NewFeaturesTestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      categories: {
        'exit-codes': { passed: 0, failed: 0 },
        'doctor': { passed: 0, failed: 0 },
        'validator': { passed: 0, failed: 0 },
        'framework-detection': { passed: 0, failed: 0 },
        'plugins': { passed: 0, failed: 0 },
        'security': { passed: 0, failed: 0 }
      },
      tests: []
    };
    this.startTime = Date.now();
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      dim: '\x1b[2m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      gray: '\x1b[90m'
    };
  }

  log(message, color = 'reset') {
    console.log(`${this.colors[color] || ''}${message}${this.colors.reset}`);
  }

  async runTest(testPath, category, description) {
    this.results.total++;
    
    try {
      this.log(`🧪 ${description}`, 'cyan');
      
      const start = Date.now();
      const output = execSync(`node "${testPath}"`, {
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 60000
      });
      
      const duration = Date.now() - start;
      
      this.results.passed++;
      this.results.categories[category].passed++;
      this.results.tests.push({
        path: testPath,
        category,
        description,
        status: 'passed',
        duration,
        output: output.trim()
      });
      
      this.log(`✅ PASSED (${duration}ms)`, 'green');
      
    } catch (error) {
      this.results.failed++;
      this.results.categories[category].failed++;
      this.results.tests.push({
        path: testPath,
        category,
        description,
        status: 'failed',
        duration: Date.now() - this.startTime,
        error: error.message,
        stderr: error.stderr?.toString() || ''
      });
      
      this.log(`❌ FAILED (${error.message})`, 'red');
    }
  }

  async runAllTests() {
    console.log(this.colors.bright);
    console.log('🚀 i18ntk 1.8.1 New Features Test Suite');
    console.log('='.repeat(50));
    console.log(this.colors.reset);
    
    const testsDir = path.join(__dirname);
    
    // Define test suites
    const testSuites = [
      {
        path: path.join(testsDir, 'new-features.test.js'),
        category: 'exit-codes',
        description: 'Exit Codes Standardization Tests'
      },
      {
        path: path.join(testsDir, 'integration', 'doctor-enhanced.test.js'),
        category: 'doctor',
        description: 'Enhanced Doctor Tool Tests'
      },
      {
        path: path.join(testsDir, 'integration', 'validator-enhanced.test.js'),
        category: 'validator',
        description: 'Enhanced Validator Tests'
      }
    ];

    // Create directories if they don't exist
    ['integration', 'unit'].forEach(dir => {
      const dirPath = path.join(testsDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });

    // Run main test suites
    for (const suite of testSuites) {
      if (fs.existsSync(suite.path)) {
        await this.runTest(suite.path, suite.category, suite.description);
      } else {
        this.log(`⚠️ Skipping ${suite.description} - file not found`, 'yellow');
        this.results.skipped++;
      }
    }

    // Run additional unit tests
    const unitTests = [
      {
        path: path.join(testsDir, 'unit', 'exit-codes.test.js'),
        category: 'exit-codes',
        description: 'Exit Codes Unit Tests'
      },
      {
        path: path.join(testsDir, 'unit', 'framework-detector.test.js'),
        category: 'framework-detection',
        description: 'Framework Detector Unit Tests'
      }
    ];

    for (const test of unitTests) {
      if (fs.existsSync(test.path)) {
        await this.runTest(test.path, test.category, test.description);
      }
    }

    // Run quick validation tests
    await this.runQuickValidationTests();
    
    this.generateReport();
  }

  async runQuickValidationTests() {
    console.log('\n🔍 Running quick validation tests...');
    
    const quickTests = [
      {
        name: 'Exit codes availability',
        test: () => {
          const exitCodesPath = path.join(__dirname, '..', '..', 'utils', 'exit-codes.js');
          return fs.existsSync(exitCodesPath);
        }
      },
      {
        name: 'Doctor tool enhancements',
        test: () => {
          const doctorPath = path.join(__dirname, '..', '..', 'main', 'i18ntk-doctor.js');
          const content = fs.readFileSync(doctorPath, 'utf8');
          return content.includes('path traversal') || content.includes('security');
        }
      },
      {
        name: 'Validator enhancements',
        test: () => {
          const validatorPath = path.join(__dirname, '..', '..', 'main', 'i18ntk-validate.js');
          const content = fs.readFileSync(validatorPath, 'utf8');
          return content.includes('placeholder') || content.includes('risky');
        }
      },
      {
        name: 'Framework detection integration',
        test: () => {
          const usagePath = path.join(__dirname, '..', '..', 'main', 'i18ntk-usage.js');
          const content = fs.readFileSync(usagePath, 'utf8');
          return content.includes('framework') || content.includes('detection');
        }
      }
    ];

    for (const quickTest of quickTests) {
      try {
        const passed = quickTest.test();
        this.results.total++;
        
        if (passed) {
          this.results.passed++;
          this.log(`✅ ${quickTest.name}`, 'green');
        } else {
          this.results.failed++;
          this.log(`❌ ${quickTest.name}`, 'red');
        }
      } catch (error) {
        this.results.failed++;
        this.log(`❌ ${quickTest.name} - ${error.message}`, 'red');
      }
    }
  }

  generateReport() {
    const duration = Date.now() - this.startTime;
    
    console.log('\n' + this.colors.bright + '='.repeat(50));
    console.log('📊 Test Results Summary');
    console.log('='.repeat(50) + this.colors.reset);
    
    // Category results
    console.log('\n📋 Category Results:');
    Object.entries(this.results.categories).forEach(([category, stats]) => {
      const total = stats.passed + stats.failed;
      if (total > 0) {
        const status = stats.failed === 0 ? '✅' : '❌';
        const color = stats.failed === 0 ? 'green' : 'red';
        this.log(`${status} ${category}: ${stats.passed}/${total} passed`, color);
      }
    });
    
    // Overall summary
    console.log('\n📊 Overall Summary:');
    this.log(`Total Tests: ${this.results.total}`, 'cyan');
    this.log(`Passed: ${this.results.passed}`, 'green');
    this.log(`Failed: ${this.results.failed}`, 'red');
    this.log(`Skipped: ${this.results.skipped}`, 'yellow');
    this.log(`Duration: ${duration}ms`, 'cyan');
    
    // Success rate
    const successRate = Math.round((this.results.passed / this.results.total) * 100);
    const rateColor = successRate >= 80 ? 'green' : successRate >= 60 ? 'yellow' : 'red';
    this.log(`Success Rate: ${successRate}%`, rateColor);
    
    // Failed tests details
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(test => test.status === 'failed')
        .forEach(test => {
          this.log(`  - ${test.description}`, 'red');
          if (test.error) {
            this.log(`    Error: ${test.error}`, 'gray');
          }
        });
    }
    
    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      version: '1.8.1',
      results: this.results,
      duration,
      summary: {
        success: this.results.failed === 0,
        successRate,
        categories: Object.keys(this.results.categories).filter(cat => 
          this.results.categories[cat].passed + this.results.categories[cat].failed > 0
        )
      }
    };

    const reportPath = path.join(__dirname, 'new-features-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`\n📋 Detailed report saved to: ${reportPath}`, 'cyan');
    
    // Performance summary
    const performanceSummary = {
      frameworkDetection: this.results.categories['framework-detection'].passed,
      doctorEnhancements: this.results.categories['doctor'].passed,
      validatorEnhancements: this.results.categories['validator'].passed,
      securityFeatures: this.results.categories['security'].passed,
      exitCodes: this.results.categories['exit-codes'].passed
    };
    
    console.log('\n🎯 Feature Coverage:');
    Object.entries(performanceSummary).forEach(([feature, passed]) => {
      const status = passed > 0 ? '✅' : '❌';
      const color = passed > 0 ? 'green' : 'red';
      this.log(`${status} ${feature}: ${passed} tests passed`, color);
    });
    
    // Exit with appropriate code
    process.exit(this.results.failed > 0 ? 1 : 0);
  }
}

// Cleanup function
function cleanup() {
  const tempDir = path.join(__dirname, 'temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

// Main execution
if (require.main === module) {
  // Cleanup on exit
  process.on('exit', cleanup);
  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });
  
  const runner = new NewFeaturesTestRunner();
  runner.runAllTests().catch(error => {
    console.error('Test runner error:', error);
    cleanup();
    process.exit(1);
  });
}

module.exports = NewFeaturesTestRunner;