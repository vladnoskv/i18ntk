#!/usr/bin/env node

/**
 * Exact Test Script - Emulates npm-test.md
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Running exact test from npm-test.md');
console.log('='.repeat(50));

// Clean up any existing test directory
if (fs.existsSync('test-i18ntk7')) {
    console.log('Cleaning up existing test-i18ntk7 directory...');
    fs.rmSync('test-i18ntk7', { recursive: true, force: true });
}

// Step 1: Create package
try {
    console.log('$ npm pack');
    const tarball = execSync('npm pack', { encoding: 'utf8' }).trim();
    console.log(`Created: ${tarball}`);
    
    // Step 2: Create and enter test directory
    console.log('$ mkdir test-i18ntk7');
    fs.mkdirSync('test-i18ntk7');
    
    console.log('$ cd test-i18ntk7');
    process.chdir('test-i18ntk7');
    
    // Step 3: Initialize npm project
    console.log('$ npm init -y');
    execSync('npm init -y', { stdio: 'inherit' });
    
    // Step 4: Install the tarball
    console.log(`$ npm i ../${tarball}`);
    execSync(`npm i ../${tarball}`, { stdio: 'inherit' });
    
    // Step 5: Test the help command
    console.log('$ npx i18ntk --help');
    execSync('npx i18ntk --help', { stdio: 'inherit' });
    
    // Step 6: Test package resolution
    console.log('$ node -e "console.log(require.resolve(\'i18ntk/ui-locales/en.json\'))"');
    const localePath = execSync('node -e "console.log(require.resolve(\'i18ntk/ui-locales/en.json\'))"', { encoding: 'utf8' });
    console.log(`Locale path: ${localePath.trim()}`);
    
    console.log('\n✅ Test completed successfully!');
    console.log('📁 Test directory: test-i18ntk7');
    
} catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
}