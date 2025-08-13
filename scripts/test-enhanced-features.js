/**
 * Enhanced Features Test Runner
 * Version: 1.9.0
 * 
 * Comprehensive test runner for new v1.9.0 features
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

class EnhancedFeaturesTester {
  constructor() {
    this.testResults = {
      placeholderValidation: { passed: 0, failed: 0, errors: [] },
      frameworkDetection: { passed: 0, failed: 0, errors: [] },
      performanceMetrics: { passed: 0, failed: 0, errors: [] },
      integration: { passed: 0, failed: 0, errors: [] }
    };
  }

  async run() {
    console.log('🧪 Running Enhanced Features Tests (v1.9.0)');
    console.log('=' .repeat(50));

    await this.runPlaceholderValidationTests();
    await this.runFrameworkDetectionTests();
    await this.runPerformanceMetricsTests();
    await this.runIntegrationTests();

    this.printResults();
    return this.getOverallResult();
  }

  async runPlaceholderValidationTests() {
    console.log('\n📋 Placeholder Validation Tests');
    console.log('-'.repeat(30));

    try {
      const testFile = path.join(__dirname, '../tests/unit/placeholder-validation.test.js');
      if (fs.existsSync(testFile)) {
        execSync(`node ${testFile}`, { stdio: 'inherit' });
        this.testResults.placeholderValidation.passed++;
        console.log('✅ Placeholder validation tests passed');
      } else {
        console.log('⚠️  Placeholder validation tests not found');
      }
    } catch (error) {
      this.testResults.placeholderValidation.failed++;
      this.testResults.placeholderValidation.errors.push(error.message);
      console.log('❌ Placeholder validation tests failed:', error.message);
    }
  }

  async runFrameworkDetectionTests() {
    console.log('\n🎯 Framework Detection Tests');
    console.log('-'.repeat(30));

    try {
      const testFile = path.join(__dirname, '../tests/unit/framework-detection.test.js');
      if (fs.existsSync(testFile)) {
        execSync(`node ${testFile}`, { stdio: 'inherit' });
        this.testResults.frameworkDetection.passed++;
        console.log('✅ Framework detection tests passed');
      } else {
        console.log('⚠️  Framework detection tests not found');
      }
    } catch (error) {
      this.testResults.frameworkDetection.failed++;
      this.testResults.frameworkDetection.errors.push(error.message);
      console.log('❌ Framework detection tests failed:', error.message);
    }
  }

  async runPerformanceMetricsTests() {
    console.log('\n⚡ Performance Metrics Tests');
    console.log('-'.repeat(30));

    try {
      const testFile = path.join(__dirname, '../tests/unit/performance-metrics.test.js');
      if (fs.existsSync(testFile)) {
        execSync(`node ${testFile}`, { stdio: 'inherit' });
        this.testResults.performanceMetrics.passed++;
        console.log('✅ Performance metrics tests passed');
      } else {
        console.log('⚠️  Performance metrics tests not found');
      }
    } catch (error) {
      this.testResults.performanceMetrics.failed++;
      this.testResults.performanceMetrics.errors.push(error.message);
      console.log('❌ Performance metrics tests failed:', error.message);
    }
  }

  async runIntegrationTests() {
    console.log('\n🔗 Integration Tests');
    console.log('-'.repeat(30));

    try {
      const testFile = path.join(__dirname, '../tests/integration/enhanced-features.test.js');
      if (fs.existsSync(testFile)) {
        execSync(`node ${testFile}`, { stdio: 'inherit' });
        this.testResults.integration.passed++;
        console.log('✅ Integration tests passed');
      } else {
        console.log('⚠️  Integration tests not found');
      }
    } catch (error) {
      this.testResults.integration.failed++;
      this.testResults.integration.errors.push(error.message);
      console.log('❌ Integration tests failed:', error.message);
    }
  }

  printResults() {
    console.log('\n📊 Test Results Summary');
    console.log('='.repeat(50));

    const totalPassed = Object.values(this.testResults).reduce((sum, category) => sum + category.passed, 0);
    const totalFailed = Object.values(this.testResults).reduce((sum, category) => sum + category.failed, 0);

    console.log(`Total Tests Passed: ${totalPassed}`);
    console.log(`Total Tests Failed: ${totalFailed}`);

    Object.entries(this.testResults).forEach(([category, results]) => {
      const status = results.failed > 0 ? '❌' : '✅';
      console.log(`${status} ${category}: ${results.passed} passed, ${results.failed} failed`);
      
      if (results.errors.length > 0) {
        console.log(`   Errors: ${results.errors.join(', ')}`);
      }
    });
  }

  getOverallResult() {
    const totalFailed = Object.values(this.testResults).reduce((sum, category) => sum + category.failed, 0);
    return totalFailed === 0;
  }
}

// CLI execution
if (require.main === module) {
  const tester = new EnhancedFeaturesTester();
  tester.run().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = EnhancedFeaturesTester;