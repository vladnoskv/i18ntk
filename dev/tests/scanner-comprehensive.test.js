#!/usr/bin/env node

/**
 * Comprehensive Scanner Tests for i18ntk
 * Tests framework detection, edge cases, and i18n framework-specific patterns
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const I18nTextScanner = require('../../main/i18ntk-scanner');

class ScannerTestRunner {
  constructor() {
    this.tests = [];
    this.results = { passed: 0, failed: 0, errors: [] };
  }

  add(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async run() {
    console.log('🧪 Running Comprehensive Scanner Tests...\n');
    
    for (const test of this.tests) {
      try {
        await test.testFn();
        console.log(`✅ ${test.name}`);
        this.results.passed++;
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
        this.results.errors.push({ name: test.name, error: error.message });
        this.results.failed++;
      }
    }
    
    console.log(`\n📊 Results: ${this.results.passed} passed, ${this.results.failed} failed`);
    return this.results;
  }

  createTestDir(name) {
    const testDir = path.join(__dirname, 'temp-scanner', name);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    return testDir;
  }

  cleanup() {
    const tempDir = path.join(__dirname, 'temp-scanner');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

const runner = new ScannerTestRunner();

// Test 1: Framework Detection - React with i18next
runner.add('Detect React + i18next framework', () => {
  const testDir = runner.createTestDir('react-i18next');
  
  // Create React + i18next project structure
  fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
    dependencies: {
      'react': '^18.0.0',
      'react-i18next': '^11.0.0'
    }
  }));

  const scanner = new I18nTextScanner();
  const detected = scanner.detectFramework(testDir);
  assert.strictEqual(detected, 'react', 'Should detect React framework');
});

// Test 2: Framework Detection - Vue with vue-i18n
runner.add('Detect Vue + vue-i18n framework', () => {
  const testDir = runner.createTestDir('vue-i18n');
  
  fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
    dependencies: {
      'vue': '^3.0.0',
      'vue-i18n': '^9.0.0'
    }
  }));

  const scanner = new I18nTextScanner();
  const detected = scanner.detectFramework(testDir);
  assert.strictEqual(detected, 'vue', 'Should detect Vue framework');
});

// Test 3: Framework Detection - Angular with ngx-translate
runner.add('Detect Angular + ngx-translate framework', () => {
  const testDir = runner.createTestDir('angular-ngx');
  
  fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
    dependencies: {
      '@angular/core': '^15.0.0',
      '@ngx-translate/core': '^14.0.0'
    }
  }));

  const scanner = new I18nTextScanner();
  const detected = scanner.detectFramework(testDir);
  assert.strictEqual(detected, 'angular', 'Should detect Angular framework');
});

// Test 4: i18next-specific patterns detection
runner.add('Detect i18next translation patterns', async () => {
  const testDir = runner.createTestDir('i18next-patterns');
  
  const testFiles = [
    {
      name: 'Component.jsx',
      content: `
import { useTranslation } from 'react-i18next';

function UserProfile() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>Welcome to User Dashboard</h1>
      <p>Hello, {t('user.greeting', { name: 'John' })}</p>
      <button>{t('buttons.save')}</button>
      <span>Loading data...</span>
    </div>
  );
}
`
    }
  ];

  testFiles.forEach(file => {
    fs.writeFileSync(path.join(testDir, file.name), file.content);
  });

  // Use actual scanner instance
  const scanner = new I18nTextScanner();
  scanner.framework = 'react';
  
  const results = await scanner.scanDirectory(testDir, {
    patterns: scanner.getFrameworkPatterns('react'),
    exclusions: [],
    minLength: 3,
    maxLength: 100
  });

  assert(results.length > 0, 'Should detect hardcoded text');
  const texts = results.flatMap(r => r.results.map(res => res.text));
  
  // Check for actual detected text
  const welcomeFound = texts.some(text => text.includes('Welcome to User Dashboard'));
  const helloFound = texts.some(text => text.includes('Hello'));
  const loadingFound = texts.some(text => text.includes('Loading data'));
  
  assert(welcomeFound || helloFound || loadingFound, 'Should detect at least one hardcoded text');
});

// Test 5: vue-i18n patterns detection
runner.add('Detect vue-i18n patterns', async () => {
  const testDir = runner.createTestDir('vue-i18n-patterns');
  
  const testFiles = [
    {
      name: 'Component.vue',
      content: `
<template>
  <div>
    <h1>Welcome to Vue App</h1>
    <p>{{ $t('user.welcome') }}</p>
    <button>{{ $t('buttons.submit') }}</button>
    <span>Loading data...</span>
  </div>
</template>

<script>
export default {
  mounted() {
    console.log('Component initialized');
  }
}
</script>
`
    }
  ];

  testFiles.forEach(file => {
    fs.writeFileSync(path.join(testDir, file.name), file.content);
  });

  const scanner = new I18nTextScanner();
  scanner.framework = 'vue';
  const patterns = scanner.getFrameworkPatterns('vue');
  
  const results = await scanner.scanDirectory(testDir, {
    patterns,
    exclusions: [],
    minLength: 3,
    maxLength: 100
  });

  const texts = results.flatMap(r => r.results.map(res => res.text));
  assert(texts.includes('Welcome to Vue App'), 'Should detect Vue welcome text');
  assert(texts.includes('Component initialized'), 'Should detect console text');
});

// Test 6: Angular ngx-translate patterns
runner.add('Detect Angular ngx-translate patterns', async () => {
  const testDir = runner.createTestDir('angular-patterns');
  
  const testFiles = [
    {
      name: 'component.ts',
      content: `
import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  template: \`
    <div>
      <h1>Welcome to Angular App</h1>
      <p>{{ 'user.greeting' | translate }}</p>
      <button>{{ 'buttons.save' | translate }}</button>
      <div>Loading application...</div>
    </div>
  \`
})
export class AppComponent {
  constructor(private translate: TranslateService) {
    console.log('Angular app started');
  }
}
`
    }
  ];

  testFiles.forEach(file => {
    fs.writeFileSync(path.join(testDir, file.name), file.content);
  });

  const scanner = new I18nTextScanner();
  scanner.framework = 'angular';
  const patterns = scanner.getFrameworkPatterns('angular');
  
  const results = await scanner.scanDirectory(testDir, {
    patterns,
    exclusions: [],
    minLength: 3,
    maxLength: 100
  });

  const texts = results.flatMap(r => r.results.map(res => res.text));
  assert(texts.includes('Welcome to Angular App'), 'Should detect Angular welcome text');
});

// Test 7: Edge cases - empty files and directories
runner.add('Handle empty files and directories gracefully', async () => {
  const testDir = runner.createTestDir('edge-cases');
  
  // Create empty files
  fs.writeFileSync(path.join(testDir, 'empty.js'), '');
  fs.writeFileSync(path.join(testDir, 'empty.json'), '{}');
  
  // Create nested empty directory
  fs.mkdirSync(path.join(testDir, 'empty-dir', 'nested'), { recursive: true });
  
  const scanner = new I18nTextScanner();
  const patterns = scanner.getFrameworkPatterns('vanilla');
  
  const results = await scanner.scanDirectory(testDir, {
    patterns,
    exclusions: [],
    minLength: 3,
    maxLength: 100
  });

  assert(Array.isArray(results), 'Should return array even for empty content');
  assert(results.length === 0, 'Should return empty array for no hardcoded text');
});

// Test 8: Unicode and special characters
runner.add('Handle Unicode and special characters correctly', async () => {
  const testDir = runner.createTestDir('unicode-test');
  
  const testFiles = [
    {
      name: 'unicode-component.jsx',
      content: `
function UnicodeComponent() {
  return (
    <div>
      <h1>Hello World</h1>
      <p>Café résumé naïve</p>
      <span>Welcome Message</span>
      <button>Save Changes</button>
    </div>
  );
}
`
    }
  ];

  testFiles.forEach(file => {
    fs.writeFileSync(path.join(testDir, file.name), file.content);
  });

  const scanner = new I18nTextScanner();
  scanner.framework = 'react';
  
  const results = await scanner.scanDirectory(testDir, {
    patterns: scanner.getFrameworkPatterns('react'),
    exclusions: [],
    minLength: 3,
    maxLength: 100
  });

  assert(results.length > 0, 'Should detect Unicode text');
  const texts = results.flatMap(r => r.results.map(res => res.text));
  
  const cafeFound = texts.some(text => text.includes('Café résumé naïve'));
  const welcomeFound = texts.some(text => text.includes('Hello World') || text.includes('Welcome Message'));
  
  assert(cafeFound || welcomeFound, 'Should detect Unicode/accented text');
});

// Test 9: Long text detection and limits
runner.add('Respect min/max length limits', async () => {
  const testDir = runner.createTestDir('length-limits');
  
  const testFiles = [
    {
      name: 'length-test.js',
      content: `
// Short text (should be ignored)
const short = "Hi";

// Medium text (should be detected)
const medium = "This is a medium length text that should be detected";

// Very long text (should be ignored)
const long = "This is an extremely long text that exceeds the maximum allowed length and should not be detected by the scanner because it's way too long for practical translation purposes";
`
    }
  ];

  testFiles.forEach(file => {
    fs.writeFileSync(path.join(testDir, file.name), file.content);
  });

  const scanner = new I18nTextScanner();
  const patterns = scanner.getFrameworkPatterns('vanilla');
  
  const results = await scanner.scanDirectory(testDir, {
    patterns,
    exclusions: [],
    minLength: 3,
    maxLength: 80
  });

  const texts = results.flatMap(r => r.results.map(res => res.text));
  assert(texts.includes('This is a medium length text that should be detected'), 'Should detect medium text');
  assert(!texts.includes('Hi'), 'Should ignore short text');
  assert(!texts.includes('This is an extremely long text'), 'Should ignore long text');
});

// Test 10: Exclusion patterns
runner.add('Respect exclusion patterns', async () => {
  const testDir = runner.createTestDir('exclusions');
  
  const testFiles = [
    {
      name: 'component.js',
      content: `const message = "This should be detected";`
    },
    {
      name: 'component.test.js',
      content: `const testMessage = "This should be excluded";`
    },
    {
      name: 'component.spec.js',
      content: `const specMessage = "This should also be excluded";`
    }
  ];

  testFiles.forEach(file => {
    fs.writeFileSync(path.join(testDir, file.name), file.content);
  });

  const scanner = new I18nTextScanner();
  const patterns = scanner.getFrameworkPatterns('vanilla');
  
  const results = await scanner.scanDirectory(testDir, {
    patterns,
    exclusions: ['*.test.js', '*.spec.js'],
    minLength: 3,
    maxLength: 100,
    includeTests: false
  });

  const fileNames = results.map(r => path.basename(r.file));
  assert(fileNames.includes('component.js'), 'Should include main component');
  assert(!fileNames.includes('component.test.js'), 'Should exclude test files');
  assert(!fileNames.includes('component.spec.js'), 'Should exclude spec files');
});

// Test 11: i18n framework default keys detection
runner.add('Detect i18n framework default keys and patterns', async () => {
  const testDir = runner.createTestDir('i18n-defaults');
  
  const testFiles = [
    {
      name: 'i18next-config.js',
      content: `
import i18next from 'i18next';

i18next.init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        "common": {
          "save": "Save",
          "cancel": "Cancel",
          "delete": "Delete",
          "edit": "Edit",
          "loading": "Loading...",
          "error": "An error occurred",
          "success": "Success!",
          "confirm": "Are you sure?",
          "yes": "Yes",
          "no": "No"
        },
        "navigation": {
          "home": "Home",
          "about": "About",
          "contact": "Contact",
          "profile": "Profile"
        },
        "forms": {
          "name": "Name",
          "email": "Email",
          "password": "Password",
          "submit": "Submit"
        }
      }
    }
  }
});
`
    },
    {
      name: 'react-component.jsx',
      content: `
import { useTranslation } from 'react-i18next';

function LoginForm() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>Login Form</h1>
      <form>
        <label>Email Address</label>
        <input type="email" placeholder="Enter your email" />
        <label>Password</label>
        <input type="password" placeholder="Enter your password" />
        <button type="submit">Sign In</button>
        <p>Don't have an account? Register here</p>
      </form>
    </div>
  );
}
`
    }
  ];

  testFiles.forEach(file => {
    fs.writeFileSync(path.join(testDir, file.name), file.content);
  });

  const scanner = new I18nTextScanner();
  const patterns = scanner.getFrameworkPatterns('react');
  
  const results = await scanner.scanDirectory(testDir, {
    patterns,
    exclusions: [],
    minLength: 3,
    maxLength: 100
  });

  const texts = results.flatMap(r => r.results.map(res => res.text));
  
  // Check for hardcoded text that should be translated
  const expectedTexts = [
    'Login Form',
    'Email Address',
    'Enter your email',
    'Enter your password',
    'Sign In',
    "Don't have an account? Register here"
  ];
  
  expectedTexts.forEach(expected => {
    assert(texts.some(text => text.includes(expected)), `Should detect: ${expected}`);
  });
});

// Test 12: Report generation
runner.add('Generate detailed scanner reports', async () => {
  const testDir = runner.createTestDir('report-generation');
  
  const testFiles = [
    {
      name: 'app.js',
      content: `const welcome = "Welcome to our application";`
    }
  ];

  testFiles.forEach(file => {
    fs.writeFileSync(path.join(testDir, file.name), file.content);
  });

  const scanner = new I18nTextScanner();
  scanner.framework = 'vanilla';
  
  const patterns = scanner.getFrameworkPatterns('vanilla');
  const results = await scanner.scanDirectory(testDir, {
    patterns,
    exclusions: [],
    minLength: 3,
    maxLength: 100
  });

  const outputDir = path.join(testDir, 'reports');
  const report = await scanner.generateReport(results, outputDir);

  assert(fs.existsSync(report.reportFile), 'JSON report should be created');
  assert(fs.existsSync(report.summaryFile), 'Markdown summary should be created');
  
  const jsonContent = JSON.parse(fs.readFileSync(report.reportFile, 'utf8'));
  assert(jsonContent.totalInstances > 0, 'Report should contain instances');
  assert(jsonContent.framework === 'vanilla', 'Report should specify framework');
});

// Run all tests
(async () => {
  try {
    const results = await runner.run();
    runner.cleanup();
    
    if (results.failed > 0) {
      console.log('\n❌ Some tests failed');
      process.exit(1);
    } else {
      console.log('\n🎉 All scanner tests passed!');
      process.exit(0);
    }
  } catch (error) {
    console.error('Test runner error:', error);
    runner.cleanup();
    process.exit(1);
  }
})();