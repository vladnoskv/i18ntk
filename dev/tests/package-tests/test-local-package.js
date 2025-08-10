#!/usr/bin/env node

/**
 * Local Test Environment Script for i18ntk
 * Creates a test directory, packages the toolkit, and tests the user experience
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class LocalTestRunner {
  constructor() {
    this.testDir = 'test-i18ntk-local';
    this.tarballName = null;
  }

  log(message) {
    console.log(`[TEST] ${message}`);
  }

  error(message) {
    console.error(`[ERROR] ${message}`);
    process.exit(1);
  }

  runCommand(command, cwd = process.cwd(), allowFailure = false) {
    this.log(`Running: ${command}`);
    try {
      const result = execSync(command, { 
        cwd, 
        stdio: 'inherit',
        shell: true 
      });
      return result;
    } catch (error) {
      if (allowFailure) {
        this.log(`Warning: ${command} failed - ${error.message}`);
        return null;
      } else {
        this.error(`Command failed: ${command}\n${error.message}`);
      }
    }
  }

  async setup() {
    this.log('Setting up local test environment...');

    // Clean up any existing test directory
    if (fs.existsSync(this.testDir)) {
      this.log('Cleaning up existing test directory...');
      fs.rmSync(this.testDir, { recursive: true, force: true });
    }

    // Create test directory
    this.log(`Creating test directory: ${this.testDir}`);
    fs.mkdirSync(this.testDir, { recursive: true });

    // Package the toolkit
    this.log('Creating npm package...');
    this.runCommand('npm pack');

    // Find the created tarball
    const tarballs = fs.readdirSync('.').filter(file => file.endsWith('.tgz'));
    if (tarballs.length === 0) {
      this.error('No tarball found after npm pack');
    }
    this.tarballName = tarballs[0];
    this.log(`Created package: ${this.tarballName}`);

    // Move tarball to test directory
    const tarballPath = path.join(this.testDir, this.tarballName);
    fs.renameSync(this.tarballName, tarballPath);
  }

  async testInstallation() {
    this.log('Testing package installation...');

    // Initialize npm project
    this.runCommand('npm init -y', this.testDir);

    // Install the package
    this.runCommand(`npm i ./${this.tarballName}`, this.testDir);
  }

  async testCommands() {
    this.log('Testing CLI commands...');

    // Test main i18ntk command
    this.runCommand('npx i18ntk --help', this.testDir);

    // Test core bin scripts with --help (allow failures for scripts that don't support it)
    const coreCommands = [
      'i18ntk-init --help',
      'i18ntk-analyze --help',
      'i18ntk-validate --help',
      'i18ntk-usage --help'
    ];

    for (const cmd of coreCommands) {
      this.log(`Testing: ${cmd}`);
      this.runCommand(`npx ${cmd}`, this.testDir, true);
    }

    // Test that all bin scripts are available in node_modules/.bin
    this.log('Testing bin script availability...');
    const binDir = path.join(this.testDir, 'node_modules', '.bin');
    if (fs.existsSync(binDir)) {
      const bins = fs.readdirSync(binDir).filter(f => f.startsWith('i18ntk'));
      bins.forEach(bin => {
        this.log(`✓ Found bin script: ${bin}`);
      });
    }
  }

  async testPackageResolution() {
    this.log('Testing package resolution...');

    // Test require resolution
    const testScript = `
      try {
        const enLocale = require.resolve('i18ntk/ui-locales/en.json');
        console.log('✓ English locale found:', enLocale);
        
        const i18ntk = require('i18ntk');
        console.log('✓ Package can be required');
        
        const packageJson = require('i18ntk/package.json');
        console.log('✓ Package.json accessible:', packageJson.version);
        
      } catch (error) {
        console.error('✗ Package resolution failed:', error.message);
        process.exit(1);
      }
    `;

    const testFile = path.join(this.testDir, 'test-resolution.js');
    fs.writeFileSync(testFile, testScript);
    this.runCommand('node test-resolution.js', this.testDir);
  }

  async testFunctionality() {
    this.log('Testing basic functionality...');

    // Create a simple test project
    const testProject = path.join(this.testDir, 'test-project');
    fs.mkdirSync(testProject, { recursive: true });

    // Create settings directory and copy i18ntk-config.json
    const settingsDir = path.join(testProject, 'settings');
    fs.mkdirSync(settingsDir, { recursive: true });
    
    const configSource = path.join(__dirname, 'settings', 'i18ntk-config.json');
    const configTarget = path.join(settingsDir, 'i18ntk-config.json');
    
    if (fs.existsSync(configSource)) {
      fs.copyFileSync(configSource, configTarget);
      this.log('✓ Copied i18ntk-config.json to settings directory');
    } else {
      // Create default config if source doesn't exist
      const defaultConfig = {
        "language": "en",
        "uiLanguage": "en",
        "theme": "system",
        "projectRoot": ".",
        "sourceDir": "./locales",
        "i18nDir": "./locales",
        "outputDir": "./i18ntk-reports",
        "processing": {
          "batchSize": 2000,
          "concurrency": 32,
          "performanceMode": "ultra-extreme",
          "cacheEnabled": true,
          "minimalLogging": true
        },
        "reports": {
          "format": "json",
          "includeStats": true,
          "saveToFile": true
        },
        "ui": {
          "colorOutput": false,
          "interactive": false,
          "showProgress": false
        },
        "security": {
          "adminPinEnabled": false
        }
      };
      fs.writeFileSync(configTarget, JSON.stringify(defaultConfig, null, 2));
      this.log('✓ Created default i18ntk-config.json');
    }

    // Create sample locales with proper structure
    const localesDir = path.join(testProject, 'locales');
    fs.mkdirSync(localesDir, { recursive: true });

    // Create language-specific directories
    const languages = ['en', 'es'];
    languages.forEach(lang => {
      const langDir = path.join(localesDir, lang);
      fs.mkdirSync(langDir, { recursive: true });
      
      fs.writeFileSync(path.join(langDir, 'common.json'), JSON.stringify({
        greeting: lang === 'en' ? "Hello World" : "Hola Mundo",
        welcome: lang === 'en' ? "Welcome to our application" : "Bienvenido a nuestra aplicación"
      }, null, 2));
    });

    // Test initialization with non-interactive flag
    this.log('Testing i18ntk-init...');
    this.runCommand('npx i18ntk-init --source-dir=./locales --no-prompt', testProject);

    // Test analysis
    this.log('Testing i18ntk-analyze...');
    this.runCommand('npx i18ntk-analyze --source-dir=./locales --no-prompt', testProject);
  }

  async cleanup() {
    this.log('Cleaning up...');
    
    // Don't auto-cleanup - let user inspect results
    this.log(`Test directory preserved at: ${this.testDir}`);
    this.log('You can manually inspect or delete this directory later.');
  }

  async run() {
    try {
      this.log('🚀 Starting i18ntk Local Test Environment');
      this.log('='.repeat(50));

      await this.setup();
      await this.testInstallation();
      await this.testCommands();
      await this.testPackageResolution();
      await this.testFunctionality();
      await this.cleanup();

      this.log('✅ All tests completed successfully!');
      this.log(`📁 Test artifacts available in: ${this.testDir}`);
      
    } catch (error) {
      this.error(`Test failed: ${error.message}`);
    }
  }
}

// Run the test
if (require.main === module) {
  const runner = new LocalTestRunner();
  runner.run();
}

module.exports = LocalTestRunner;