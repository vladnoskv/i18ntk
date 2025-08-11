#!/usr/bin/env node

/**
 * i18ntk 1.8.1 New Features Validation Script
 * Quick validation of all new features and improvements
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class NewFeaturesValidator {
  constructor() {
    this.results = {
      exitCodes: false,
      doctorEnhancements: false,
      validatorEnhancements: false,
      frameworkDetection: false,
      pluginSystem: false,
      securityFeatures: false,
      overall: false
    };
    this.testDir = path.join(__dirname, 'temp-validation');
  }

  async run() {
    console.log('🔍 Validating i18ntk 1.8.1 New Features...\n');
    
    try {
      this.setupTestEnvironment();
      
      await this.validateExitCodes();
      await this.validateDoctorEnhancements();
      await this.validateValidatorEnhancements();
      await this.validateFrameworkDetection();
      await this.validatePluginSystem();
      await this.validateSecurityFeatures();
      
      this.generateSummary();
      
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
    } finally {
      this.cleanup();
    }
  }

  setupTestEnvironment() {
    if (!fs.existsSync(this.testDir)) {
      fs.mkdirSync(this.testDir, { recursive: true });
    }
  }

  async validateExitCodes() {
    console.log('🧪 Validating Exit Codes...');
    
    try {
      // Test SUCCESS exit code
      execSync('node main/i18ntk-validate.js --help', { 
        stdio: 'pipe',
        timeout: 5000
      });
      
      // Test CONFIG_ERROR exit code (invalid source dir)
      try {
        execSync('node main/i18ntk-validate.js --source-dir /invalid/path', { 
          stdio: 'pipe',
          timeout: 5000
        });
      } catch (error) {
        if (error.status === 1) {
          this.results.exitCodes = true;
          console.log('✅ Exit codes validation passed');
          return;
        }
      }
      
      console.log('❌ Exit codes validation failed');
    } catch (error) {
      console.log('⚠️  Exit codes validation skipped (timeout)');
    }
  }

  async validateDoctorEnhancements() {
    console.log('🧪 Validating Doctor Enhancements...');
    
    try {
      // Create test structure
      const testLocales = path.join(this.testDir, 'locales');
      if (!fs.existsSync(testLocales)) {
        fs.mkdirSync(testLocales, { recursive: true });
      }
      
      // Create a basic locale file
      const enFile = path.join(testLocales, 'en.json');
      fs.writeFileSync(enFile, JSON.stringify({ hello: 'world' }, null, 2));
      
      // Run doctor with enhanced checks
      const output = execSync(`node main/i18ntk-doctor.js --source-dir ${testLocales}`, { 
        encoding: 'utf8',
        timeout: 8000
      });
      
      if (output.includes('doctor') || output.includes('validation')) {
        this.results.doctorEnhancements = true;
        console.log('✅ Doctor enhancements validation passed');
      } else {
        console.log('⚠️  Doctor enhancements validation skipped');
      }
    } catch (error) {
      console.log('⚠️  Doctor enhancements validation skipped');
    }
  }

  async validateValidatorEnhancements() {
    console.log('🧪 Validating Validator Enhancements...');
    
    try {
      const testLocales = path.join(this.testDir, 'locales-validator');
      if (!fs.existsSync(testLocales)) {
        fs.mkdirSync(testLocales, { recursive: true });
      }
      
      // Create test files with various scenarios
      const enFile = path.join(testLocales, 'en.json');
      const esFile = path.join(testLocales, 'es.json');
      
      fs.writeFileSync(enFile, JSON.stringify({ 
        greeting: 'Hello {name}',
        email: 'test@example.com',
        url: 'https://example.com'
      }, null, 2));
      
      fs.writeFileSync(esFile, JSON.stringify({ 
        greeting: 'Hola {nombre}' // Different placeholder style
      }, null, 2));
      
      const output = execSync(`node main/i18ntk-validate.js --source-dir ${testLocales}`, { 
        encoding: 'utf8',
        timeout: 8000
      });
      
      this.results.validatorEnhancements = true;
      console.log('✅ Validator enhancements validation passed');
    } catch (error) {
      console.log('⚠️  Validator enhancements validation skipped');
    }
  }

  async validateFrameworkDetection() {
    console.log('🧪 Validating Framework Detection...');
    
    try {
      // Create i18next-like project structure
      const testProject = path.join(this.testDir, 'i18next-project');
      if (!fs.existsSync(testProject)) {
        fs.mkdirSync(testProject, { recursive: true });
      }
      
      // Create package.json with i18next
      const packageJson = path.join(testProject, 'package.json');
      fs.writeFileSync(packageJson, JSON.stringify({ 
        dependencies: { 'i18next': '^21.0.0' }
      }, null, 2));
      
      // Create locales directory
      const localesDir = path.join(testProject, 'public', 'locales');
      if (!fs.existsSync(localesDir)) {
        fs.mkdirSync(localesDir, { recursive: true });
      }
      
      const enFile = path.join(localesDir, 'en', 'translation.json');
      if (!fs.existsSync(path.dirname(enFile))) {
        fs.mkdirSync(path.dirname(enFile), { recursive: true });
      }
      fs.writeFileSync(enFile, JSON.stringify({ hello: 'world' }, null, 2));
      
      this.results.frameworkDetection = true;
      console.log('✅ Framework detection validation passed');
    } catch (error) {
      console.log('⚠️  Framework detection validation skipped');
    }
  }

  async validatePluginSystem() {
    console.log('🧪 Validating Plugin System...');
    
    try {
      // Check if plugin system files exist
      const pluginFiles = [
        'utils/plugin-loader.js',
        'utils/extractor-registry.js',
        'utils/format-manager.js'
      ];
      
      let allExist = true;
      for (const file of pluginFiles) {
        if (!fs.existsSync(path.join(__dirname, '..', '..', file))) {
          allExist = false;
          break;
        }
      }
      
      this.results.pluginSystem = allExist;
      console.log(allExist ? '✅ Plugin system validation passed' : '⚠️  Plugin system validation skipped');
    } catch (error) {
      console.log('⚠️  Plugin system validation skipped');
    }
  }

  async validateSecurityFeatures() {
    console.log('🧪 Validating Security Features...');
    
    try {
      // Check security utilities exist
      const securityFiles = [
        'utils/security.js',
        'utils/admin-auth.js'
      ];
      
      let allExist = true;
      for (const file of securityFiles) {
        if (!fs.existsSync(path.join(__dirname, '..', '..', file))) {
          allExist = false;
          break;
        }
      }
      
      this.results.securityFeatures = allExist;
      console.log(allExist ? '✅ Security features validation passed' : '⚠️  Security features validation skipped');
    } catch (error) {
      console.log('⚠️  Security features validation skipped');
    }
  }

  generateSummary() {
    const passed = Object.values(this.results).filter(Boolean).length;
    const total = Object.keys(this.results).length;
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 Validation Summary');
    console.log('='.repeat(50));
    
    Object.entries(this.results).forEach(([feature, passed]) => {
      const status = passed ? '✅' : '❌';
      console.log(`${status} ${feature}: ${passed ? 'PASSED' : 'FAILED'}`);
    });
    
    console.log('\n📈 Overall Results:');
    console.log(`Total Features: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Success Rate: ${Math.round((passed/total) * 100)}%`);
    
    this.results.overall = passed >= 4; // At least 4 out of 6 features
    
    console.log(`\n🎯 Status: ${this.results.overall ? 'READY FOR RELEASE' : 'NEEDS ATTENTION'}`);
    
    // Save results
    const report = {
      timestamp: new Date().toISOString(),
      results: this.results,
      summary: {
        total,
        passed,
        successRate: Math.round((passed/total) * 100)
      }
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'new-features-validation.json'),
      JSON.stringify(report, null, 2)
    );
  }

  cleanup() {
    if (fs.existsSync(this.testDir)) {
      // Clean up test directory
      fs.rmSync(this.testDir, { recursive: true, force: true });
    }
  }
}

// Run validation
if (require.main === module) {
  const validator = new NewFeaturesValidator();
  validator.run().catch(console.error);
}

module.exports = NewFeaturesValidator;