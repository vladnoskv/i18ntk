#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Test language detection across different project types
 */
class LanguageDetectionTester {
  constructor() {
    this.testProjects = [
      'test-projects/vue-project',
      'test-projects/react-project',
      'test-projects/python-project',
      'test-projects/java-project',
      'test-projects/php-project',
      'test-projects/go-project'
    ];
  }

  /**
   * Detect language based on project files (mimics i18ntk-setup.js logic)
   */
  async detectLanguage(projectRoot) {
    try {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const pyprojectPath = path.join(projectRoot, 'pyproject.toml');
      const requirementsPath = path.join(projectRoot, 'requirements.txt');
      const goModPath = path.join(projectRoot, 'go.mod');
      const pomPath = path.join(projectRoot, 'pom.xml');
      const composerPath = path.join(projectRoot, 'composer.json');

      if (fs.existsSync(packageJsonPath)) {
        return 'javascript';
      } else if (fs.existsSync(pyprojectPath) || fs.existsSync(requirementsPath)) {
        return 'python';
      } else if (fs.existsSync(goModPath)) {
        return 'go';
      } else if (fs.existsSync(pomPath)) {
        return 'java';
      } else if (fs.existsSync(composerPath)) {
        return 'php';
      } else {
        return 'generic';
      }
    } catch (error) {
      console.error(`Error detecting language for ${projectRoot}:`, error.message);
      return 'generic';
    }
  }

  /**
   * Run language detection tests
   */
  async runTests() {
    console.log('🧪 Testing language detection across different project types:\n');

    const results = [];
    for (const projectPath of this.testProjects) {
      const fullPath = path.resolve(projectPath);
      
      if (!fs.existsSync(fullPath)) {
        console.log(`❌ Project not found: ${projectPath}`);
        continue;
      }

      const detectedLanguage = await this.detectLanguage(fullPath);
      
      // Check for expected language based on project type
      const expectedLanguage = this.getExpectedLanguage(projectPath);
      const status = detectedLanguage === expectedLanguage ? '✓' : '✗';
      
      console.log(`${status} ${projectPath}:`);
      console.log(`   Detected: ${detectedLanguage}`);
      console.log(`   Expected: ${expectedLanguage}`);
      console.log(`   Status: ${detectedLanguage === expectedLanguage ? 'PASS' : 'FAIL'}`);
      console.log();

      results.push({
        project: projectPath,
        detected: detectedLanguage,
        expected: expectedLanguage,
        passed: detectedLanguage === expectedLanguage
      });
    }

    // Summary
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    console.log(`📊 Summary: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 All language detection tests passed!');
    } else {
      console.log('⚠️  Some tests failed. Check the details above.');
    }

    return results;
  }

  /**
   * Get expected language based on project type
   */
  getExpectedLanguage(projectPath) {
    if (projectPath.includes('vue') || projectPath.includes('react')) {
      return 'javascript';
    } else if (projectPath.includes('python')) {
      return 'python';
    } else if (projectPath.includes('java')) {
      return 'java';
    } else if (projectPath.includes('php')) {
      return 'php';
    } else if (projectPath.includes('go')) {
      return 'go';
    }
    return 'generic';
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new LanguageDetectionTester();
  tester.runTests().catch(console.error);
}

module.exports = { LanguageDetectionTester };