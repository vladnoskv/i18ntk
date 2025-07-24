#!/usr/bin/env node

/**
 * I18n Feature Test Suite
 * 
 * Tests all implemented i18n management features including:
 * - Multi-language UI support
 * - Sizing analysis
 * - Interactive menu system
 * - Report generation
 * - Command-line interface
 * 
 * Usage:
 *   node test-features.js [--quick] [--verbose]
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const settingsManager = require('./settings-manager');

// Get configuration from settings manager
function getConfig() {
  const settings = settingsManager.getSettings();
  return {
    testDataDir: settings.directories?.outputDir ? path.join(settings.directories.outputDir, 'test-data') : './test-data'
  };
}

class I18nFeatureTester {
  constructor(options = {}) {
    const config = getConfig();
    this.quick = options.quick || false;
    this.verbose = options.verbose || false;
    this.testResults = [];
    this.packageDir = __dirname;
    this.testDataDir = path.resolve(config.testDataDir);
  }

  // Log test output
  log(message, level = 'info') {
    const timestamp = new Date().toISOString().substr(11, 8);
    const prefix = {
      'info': '📝',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'test': '🧪'
    }[level] || 'ℹ️';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
    
    if (this.verbose && level === 'error') {
      console.trace();
    }
  }

  // Create test data structure
  async setupTestData() {
    this.log('Setting up test data...', 'test');
    
    // Create test directory structure
    const testLocalesDir = path.join(this.testDataDir, 'locales');
    if (!fs.existsSync(testLocalesDir)) {
      fs.mkdirSync(testLocalesDir, { recursive: true });
    }
    
    // Create sample translation files
    const sampleTranslations = {
      en: {
        "common": {
          "hello": "Hello",
          "goodbye": "Goodbye",
          "welcome": "Welcome to our application"
        },
        "navigation": {
          "home": "Home",
          "about": "About",
          "contact": "Contact Us"
        },
        "messages": {
          "success": "Operation completed successfully",
          "error": "An error occurred",
          "loading": "Loading..."
        }
      },
      de: {
        "common": {
          "hello": "Hallo",
          "goodbye": "Auf Wiedersehen",
          "welcome": "Willkommen in unserer Anwendung"
        },
        "navigation": {
          "home": "Startseite",
          "about": "Über uns",
          "contact": "Kontakt"
        },
        "messages": {
          "success": "Vorgang erfolgreich abgeschlossen",
          "error": "Ein Fehler ist aufgetreten",
          "loading": "Wird geladen..."
        }
      },
      fr: {
        "common": {
          "hello": "Bonjour",
          "goodbye": "Au revoir",
          "welcome": "Bienvenue dans notre application"
        },
        "navigation": {
          "home": "Accueil",
          "about": "À propos",
          "contact": "Nous contacter"
        },
        "messages": {
          "success": "Opération terminée avec succès",
          "error": "Une erreur s'est produite",
          "loading": "Chargement en cours..."
        }
      }
    };
    
    // Write test translation files
    Object.entries(sampleTranslations).forEach(([lang, content]) => {
      const filePath = path.join(testLocalesDir, `${lang}.json`);
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    });
    
    this.log(`Created test data in ${testLocalesDir}`, 'success');
  }

  // Test UI localization files
  async testUILocalization() {
    this.log('Testing UI localization files...', 'test');
    
    const uiLocalesDir = path.join(this.packageDir, 'ui-locales');
    const expectedLanguages = ['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'];
    
    let passed = 0;
    let failed = 0;
    
    for (const lang of expectedLanguages) {
      const filePath = path.join(uiLocalesDir, `${lang}.json`);
      
      try {
        if (!fs.existsSync(filePath)) {
          this.log(`Missing UI locale file: ${lang}.json`, 'error');
          failed++;
          continue;
        }
        
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        // Check for required sections
        const requiredSections = ['menu', 'operations', 'status', 'errors', 'language'];
        const missingSections = requiredSections.filter(section => !content[section]);
        
        if (missingSections.length > 0) {
          this.log(`${lang}.json missing sections: ${missingSections.join(', ')}`, 'error');
          failed++;
        } else {
          this.log(`${lang}.json structure valid`, 'success');
          passed++;
        }
        
      } catch (error) {
        this.log(`Error parsing ${lang}.json: ${error.message}`, 'error');
        failed++;
      }
    }
    
    this.testResults.push({
      test: 'UI Localization Files',
      passed,
      failed,
      total: expectedLanguages.length
    });
  }

  // Test UI i18n module
  async testUIi18nModule() {
    this.log('Testing UI i18n module...', 'test');
    
    try {
      const uiI18n = require('./ui-i18n');
      
      let passed = 0;
      let failed = 0;
      
      // Test loading different languages
      const testLanguages = ['en', 'de', 'fr'];
      
      for (const lang of testLanguages) {
        try {
          await uiI18n.changeLanguage(lang);
          const translated = uiI18n.t('menu.title');
          
          if (translated && translated !== 'menu.title') {
            this.log(`Language ${lang} loaded successfully`, 'success');
            passed++;
          } else {
            this.log(`Language ${lang} translation failed`, 'error');
            failed++;
          }
        } catch (error) {
          this.log(`Error loading language ${lang}: ${error.message}`, 'error');
          failed++;
        }
      }
      
      // Test interpolation
      try {
        const interpolated = uiI18n.t('status.i18nSetup', { status: 'Yes' });
        if (interpolated.includes('Yes')) {
          this.log('String interpolation working', 'success');
          passed++;
        } else {
          this.log('String interpolation failed', 'error');
          failed++;
        }
      } catch (error) {
        this.log(`Interpolation test failed: ${error.message}`, 'error');
        failed++;
      }
      
      this.testResults.push({
        test: 'UI i18n Module',
        passed,
        failed,
        total: testLanguages.length + 1
      });
      
    } catch (error) {
      this.log(`Failed to load UI i18n module: ${error.message}`, 'error');
      this.testResults.push({
        test: 'UI i18n Module',
        passed: 0,
        failed: 1,
        total: 1
      });
    }
  }

  // Test sizing analyzer
  async testSizingAnalyzer() {
    this.log('Testing sizing analyzer...', 'test');
    
    try {
      const I18nSizingAnalyzer = require('./06-analyze-sizing');
      
      const analyzer = new I18nSizingAnalyzer({
        sourceDir: path.join(this.testDataDir, 'locales'),
        outputDir: path.join(this.testDataDir, 'reports'),
        outputReport: true,
        format: 'json'
      });
      
      await analyzer.analyze();
      
      // Check if report was generated
      const reportsDir = path.join(this.testDataDir, 'reports');
      const reportFiles = fs.readdirSync(reportsDir).filter(f => f.startsWith('sizing-analysis-'));
      
      if (reportFiles.length > 0) {
        this.log('Sizing analysis completed and report generated', 'success');
        this.testResults.push({
          test: 'Sizing Analyzer',
          passed: 1,
          failed: 0,
          total: 1
        });
      } else {
        this.log('Sizing analysis completed but no report found', 'warning');
        this.testResults.push({
          test: 'Sizing Analyzer',
          passed: 0,
          failed: 1,
          total: 1
        });
      }
      
    } catch (error) {
      this.log(`Sizing analyzer test failed: ${error.message}`, 'error');
      this.testResults.push({
        test: 'Sizing Analyzer',
        passed: 0,
        failed: 1,
        total: 1
      });
    }
  }

  // Test command line interface
  async testCommandLineInterface() {
    this.log('Testing command line interface...', 'test');
    
    const commands = [
      ['--help'],
      ['--ui-language', 'de'],
      ['status'],
      ['sizing', '--sizing-format', 'json']
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const command of commands) {
      try {
        const result = await this.runCommand('node', ['00-manage-i18n.js', ...command]);
        
        if (result.code === 0) {
          this.log(`Command '${command.join(' ')}' executed successfully`, 'success');
          passed++;
        } else {
          this.log(`Command '${command.join(' ')}' failed with code ${result.code}`, 'error');
          failed++;
        }
      } catch (error) {
        this.log(`Command '${command.join(' ')}' threw error: ${error.message}`, 'error');
        failed++;
      }
    }
    
    this.testResults.push({
      test: 'Command Line Interface',
      passed,
      failed,
      total: commands.length
    });
  }

  // Run external command
  runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: this.packageDir,
        stdio: this.verbose ? 'inherit' : 'pipe',
        ...options
      });
      
      let stdout = '';
      let stderr = '';
      
      if (!this.verbose) {
        child.stdout?.on('data', (data) => {
          stdout += data.toString();
        });
        
        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
      }
      
      child.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });
      
      child.on('error', (error) => {
        reject(error);
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        child.kill();
        reject(new Error('Command timeout'));
      }, 30000);
    });
  }

  // Test file structure
  async testFileStructure() {
    this.log('Testing file structure...', 'test');
    
    const requiredFiles = [
      '00-manage-i18n.js',
      '01-init-i18n.js',
      '02-analyze-translations.js',
      '03-validate-translations.js',
      '04-check-usage.js',
      '06-analyze-sizing.js',
      'ui-i18n.js'
    ];
    
    const requiredDirs = [
      'ui-locales',
      'locales'
    ];
    
    let passed = 0;
    let failed = 0;
    
    // Check files
    for (const file of requiredFiles) {
      const filePath = path.join(this.packageDir, file);
      if (fs.existsSync(filePath)) {
        this.log(`File ${file} exists`, 'success');
        passed++;
      } else {
        this.log(`Missing required file: ${file}`, 'error');
        failed++;
      }
    }
    
    // Check directories
    for (const dir of requiredDirs) {
      const dirPath = path.join(this.packageDir, dir);
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        this.log(`Directory ${dir} exists`, 'success');
        passed++;
      } else {
        this.log(`Missing required directory: ${dir}`, 'error');
        failed++;
      }
    }
    
    this.testResults.push({
      test: 'File Structure',
      passed,
      failed,
      total: requiredFiles.length + requiredDirs.length
    });
  }

  // Clean up test data
  async cleanup() {
    this.log('Cleaning up test data...', 'info');
    
    try {
      if (fs.existsSync(this.testDataDir)) {
        fs.rmSync(this.testDataDir, { recursive: true, force: true });
        this.log('Test data cleaned up', 'success');
      }
    } catch (error) {
      this.log(`Cleanup failed: ${error.message}`, 'warning');
    }
  }

  // Generate test report
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 I18N FEATURE TEST RESULTS');
    console.log('='.repeat(60));
    
    let totalPassed = 0;
    let totalFailed = 0;
    let totalTests = 0;
    
    this.testResults.forEach(result => {
      const status = result.failed === 0 ? '✅' : '❌';
      console.log(`${status} ${result.test}: ${result.passed}/${result.total} passed`);
      
      if (result.failed > 0) {
        console.log(`   ❌ ${result.failed} failed`);
      }
      
      totalPassed += result.passed;
      totalFailed += result.failed;
      totalTests += result.total;
    });
    
    console.log('\n' + '-'.repeat(60));
    console.log(`📊 SUMMARY: ${totalPassed}/${totalTests} tests passed`);
    
    if (totalFailed === 0) {
      console.log('🎉 All tests passed! I18n features are working correctly.');
    } else {
      console.log(`⚠️  ${totalFailed} tests failed. Please review the issues above.`);
    }
    
    console.log('='.repeat(60));
    
    return totalFailed === 0;
  }

  // Run all tests
  async runTests() {
    this.log('Starting I18n feature tests...', 'info');
    
    try {
      await this.setupTestData();
      await this.testFileStructure();
      await this.testUILocalization();
      await this.testUIi18nModule();
      await this.testSizingAnalyzer();
      
      if (!this.quick) {
        await this.testCommandLineInterface();
      }
      
      const success = this.generateReport();
      
      await this.cleanup();
      
      process.exit(success ? 0 : 1);
      
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
      await this.cleanup();
      process.exit(1);
    }
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    quick: args.includes('--quick'),
    verbose: args.includes('--verbose')
  };
  
  if (args.includes('--help')) {
    console.log(`
I18n Feature Test Suite

Usage: node test-features.js [options]

Options:
  --quick     Skip command line interface tests
  --verbose   Show detailed output
  --help      Show this help

This test suite verifies:
- UI localization files
- UI i18n module functionality
- Sizing analyzer
- Command line interface
- File structure integrity
`);
    process.exit(0);
  }
  
  const tester = new I18nFeatureTester(options);
  tester.runTests();
}

module.exports = I18nFeatureTester;