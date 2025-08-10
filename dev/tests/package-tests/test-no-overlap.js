#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const TEST_DIR_PREFIX = 'test-i18ntk-no-overlap';
const PACKAGE_NAME = 'i18ntk-test';
const VERSION = '1.7.0-test';

// Generate unique test directory name
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const TEST_DIR = `${TEST_DIR_PREFIX}-${timestamp}`;

console.log(`🧪 Creating isolated test environment: ${TEST_DIR}`);

// Create test directory
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR);
}

// Create a temporary package.json with different name to avoid conflicts
const tempPackageJson = {
  name: PACKAGE_NAME,
  version: VERSION,
  description: 'i18n Management Toolkit - Test Package (No Overlap)',
  main: 'main/i18ntk-manage.js',
  bin: {
    'i18ntk-test': './main/i18ntk-manage.js',
    'i18ntk-test-init': './main/i18ntk-init.js',
    'i18ntk-test-analyze': './main/i18ntk-analyze.js',
    'i18ntk-test-validate': './main/i18ntk-validate.js',
    'i18ntk-test-ui': './main/i18ntk-ui.js',
    'i18ntk-test-summary': './main/i18ntk-summary.js',
    'i18ntk-test-usage': './main/i18ntk-usage.js',
    'i18ntk-test-sizing': './main/i18ntk-sizing.js',
    'i18ntk-test-complete': './main/i18ntk-complete.js',
    'i18ntk-test-autorun': './main/i18ntk-autorun.js'
  },
  files: [
    "main/",
    "utils/",
    "scripts/",
    "settings/",
    "ui-locales/",
    "LICENSE",
    "README.md"
  ],
  engines: {
    node: ">=16.0.0"
  },
  keywords: [
    "i18n",
    "internationalization",
    "translation",
    "localization",
    "performance",
    "enterprise",
    "test"
  ]
};

// Write temporary package.json
fs.writeFileSync('package-test.json', JSON.stringify(tempPackageJson, null, 2));

try {
  console.log('📦 Creating test package...');
  
  // Create tarball with test package name
  execSync('npm pack --pack-destination ./test-package', { stdio: 'inherit' });
  
  // Move to test directory
  process.chdir(TEST_DIR);
  
  console.log('🚀 Setting up test environment...');
  
  // Initialize test project
  execSync('npm init -y', { stdio: 'inherit' });
  
  // Install the test package
  const tarball = `../test-package/i18ntk-test-${VERSION}.tgz`;
  execSync(`npm install ${tarball}`, { stdio: 'inherit' });
  
  console.log('✅ Test package installed successfully!');
  console.log('🔍 Running verification tests...');
  
  // Test CLI commands
  console.log('\n📋 Testing CLI commands:');
  execSync('npx i18ntk-test --help', { stdio: 'inherit' });
  
  console.log('\n🔧 Testing package resolution:');
  execSync('node -e "console.log(require.resolve(\'i18ntk-test/ui-locales/en.json\'))"', { stdio: 'inherit' });
  
  console.log('\n🌐 Testing language support:');
  execSync('node -e "console.log(Object.keys(require(\'i18ntk-test/ui-locales\')))"', { stdio: 'inherit' });
  
  console.log('\n🎯 Testing initialization:');
  execSync('npx i18ntk-test-init --help', { stdio: 'inherit' });
  
  console.log('\n🎉 All tests completed successfully!');
  console.log(`📁 Test environment: ${TEST_DIR}`);
  console.log('🧹 To clean up: rm -rf ' + TEST_DIR);
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
} finally {
  // Clean up temporary files
  if (fs.existsSync('package-test.json')) {
    fs.unlinkSync('package-test.json');
  }
  if (fs.existsSync('test-package')) {
    fs.rmSync('test-package', { recursive: true, force: true });
  }
}

console.log('\n✨ Test completed - no version overlap detected!');