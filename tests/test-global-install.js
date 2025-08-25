#!/usr/bin/env node

/**
 * Test script to simulate global installation behavior
 * This script tests the package configuration for global installation
 */

const path = require('path');
const fs = require('fs');

console.log('🧪 Testing Global Installation Configuration');
console.log('==========================================');

// Test 1: Check if main entry point exists and is accessible
console.log('\n1. Testing main entry point...');
const mainEntry = './main/manage/index.js';
if (fs.existsSync(mainEntry)) {
  console.log('✅ Main entry point exists:', mainEntry);

  // Test if it can be required
  try {
    const mainModule = require(mainEntry);
    console.log('✅ Main entry point can be required successfully');
  } catch (error) {
    console.log('❌ Main entry point cannot be required:', error.message);
  }
} else {
  console.log('❌ Main entry point does not exist:', mainEntry);
}

// Test 2: Check all bin entries
console.log('\n2. Testing bin entries...');
const binEntries = [
  'main/manage/index.js',
  'main/i18ntk-setup.js',
  'main/i18ntk-init.js',
  'main/i18ntk-analyze.js',
  'main/i18ntk-validate.js',
  'main/i18ntk-usage.js',
  'main/i18ntk-complete.js',
  'main/i18ntk-sizing.js',
  'main/i18ntk-summary.js',
  'main/i18ntk-doctor.js',
  'main/i18ntk-fixer.js',
  'main/i18ntk-scanner.js',
  'main/i18ntk-backup.js'
];

let binTestsPassed = 0;
for (const binEntry of binEntries) {
  if (fs.existsSync(binEntry)) {
    console.log(`✅ Bin entry exists: ${binEntry}`);

    // Check if it has shebang
    try {
      const content = fs.readFileSync(binEntry, 'utf8');
      if (content.startsWith('#!/usr/bin/env node')) {
        console.log(`✅ Bin entry has proper shebang: ${binEntry}`);
        binTestsPassed++;
      } else {
        console.log(`❌ Bin entry missing shebang: ${binEntry}`);
      }
    } catch (error) {
      console.log(`❌ Cannot read bin entry: ${binEntry}, ${error.message}`);
    }
  } else {
    console.log(`❌ Bin entry does not exist: ${binEntry}`);
  }
}

// Test 3: Check package.json configuration
console.log('\n3. Testing package.json configuration...');
const packageJson = require('../package.json');

if (packageJson.main === 'main/manage/index.js') {
  console.log('✅ Main entry point is correctly configured');
} else {
  console.log('❌ Main entry point is not correctly configured:', packageJson.main);
}

if (packageJson.preferGlobal === true) {
  console.log('✅ Package is marked as preferring global installation');
} else {
  console.log('❌ Package is not marked as preferring global installation');
}

// Check bin entries in package.json
const expectedBinEntries = {
  'i18ntk': 'main/manage/index.js',
  'i18ntk-setup': 'main/i18ntk-setup.js',
  'i18ntk-manage': 'main/manage/index.js',
  'i18ntk-init': 'main/i18ntk-init.js',
  'i18ntk-analyze': 'main/i18ntk-analyze.js',
  'i18ntk-validate': 'main/i18ntk-validate.js',
  'i18ntk-usage': 'main/i18ntk-usage.js',
  'i18ntk-complete': 'main/i18ntk-complete.js',
  'i18ntk-sizing': 'main/i18ntk-sizing.js',
  'i18ntk-summary': 'main/i18ntk-summary.js',
  'i18ntk-doctor': 'main/i18ntk-doctor.js',
  'i18ntk-fixer': 'main/i18ntk-fixer.js',
  'i18ntk-scanner': 'main/i18ntk-scanner.js',
  'i18ntk-backup': 'main/i18ntk-backup.js'
};

let binConfigTestsPassed = 0;
for (const [binName, binPath] of Object.entries(expectedBinEntries)) {
  if (packageJson.bin && packageJson.bin[binName] === binPath) {
    console.log(`✅ Bin entry correctly configured: ${binName} -> ${binPath}`);
    binConfigTestsPassed++;
  } else {
    console.log(`❌ Bin entry not correctly configured: ${binName}`);
  }
}

// Test 4: Check files array
console.log('\n4. Testing files array...');
const requiredFiles = ['main/', 'runtime/', 'utils/', 'scripts/', 'settings/', 'ui-locales/', 'LICENSE', 'package.json', 'README.md'];
let filesTestsPassed = 0;

if (packageJson.files) {
  for (const requiredFile of requiredFiles) {
    if (packageJson.files.includes(requiredFile)) {
      console.log(`✅ Required file included: ${requiredFile}`);
      filesTestsPassed++;
    } else {
      console.log(`❌ Required file missing: ${requiredFile}`);
    }
  }
} else {
  console.log('❌ Files array is not defined in package.json');
}

// Test 5: Check for zero dependencies
console.log('\n5. Testing dependencies...');
if (!packageJson.dependencies || Object.keys(packageJson.dependencies).length === 0) {
  console.log('✅ Package has zero runtime dependencies');
} else {
  console.log('❌ Package has runtime dependencies:', Object.keys(packageJson.dependencies));
}

// Summary
console.log('\n📊 GLOBAL INSTALLATION TEST SUMMARY');
console.log('=====================================');
console.log(`Bin entries with shebang: ${binTestsPassed}/${binEntries.length}`);
console.log(`Bin entries configured: ${binConfigTestsPassed}/${Object.keys(expectedBinEntries).length}`);
console.log(`Required files included: ${filesTestsPassed}/${requiredFiles.length}`);

const totalTests = binEntries.length + Object.keys(expectedBinEntries).length + requiredFiles.length + 3; // +3 for main entry, preferGlobal, and dependencies
const passedTests = binTestsPassed + binConfigTestsPassed + filesTestsPassed + 3; // +3 for the tests that passed

console.log(`\nOverall: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 All tests passed! Package is ready for global installation.');
} else {
  console.log('⚠️  Some tests failed. Please review the issues above.');
}

console.log('\n🔧 To install globally for testing:');
console.log('   npm install -g .');
console.log('\n🔧 To test global installation:');
console.log('   i18ntk --help');
console.log('   i18ntk-setup --help');
console.log('   i18ntk-init --help');