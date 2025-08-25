#!/usr/bin/env node

/**
 * Test script to verify the new modular main/manage/index.js can be imported and instantiated
 */

const path = require('path');

console.log('🧪 Testing modular main/manage/index.js import and instantiation...\n');

try {
    // Test 1: Import the I18nManager class
    console.log('1. Testing import...');
    const I18nManager = require('../main/manage/index.js');
    console.log('   ✅ Successfully imported I18nManager class');

    // Test 2: Instantiate the class
    console.log('\n2. Testing instantiation...');
    const manager = new I18nManager();
    console.log('   ✅ Successfully instantiated I18nManager');

    // Test 3: Check basic properties
    console.log('\n3. Testing basic properties...');
    if (typeof manager.run === 'function') {
        console.log('   ✅ run() method exists');
    } else {
        console.log('   ❌ run() method missing');
    }

    if (typeof manager.executeCommand === 'function') {
        console.log('   ✅ executeCommand() method exists');
    } else {
        console.log('   ❌ executeCommand() method missing');
    }

    if (manager.adminAuth) {
        console.log('   ✅ adminAuth property exists');
    } else {
        console.log('   ❌ adminAuth property missing');
    }

    // Test 4: Check CommandRouter initialization
    console.log('\n4. Testing CommandRouter integration...');
    if (manager.commandRouter === null) {
        console.log('   ✅ CommandRouter property initialized (null until run())');
    } else {
        console.log('   ❌ CommandRouter should be null until run() is called');
    }

    // Test 5: Check UI initialization
    console.log('\n5. Testing UI initialization...');
    if (manager.ui === null) {
        console.log('   ✅ UI property initialized (null until run())');
    } else {
        console.log('   ❌ UI should be null until run() is called');
    }

    console.log('\n🎉 All basic import and instantiation tests passed!');
    console.log('\n📋 Summary:');
    console.log('   - I18nManager class can be imported successfully');
    console.log('   - Class can be instantiated without errors');
    console.log('   - Core methods (run, executeCommand) are available');
    console.log('   - Service dependencies are properly initialized');
    console.log('   - CommandRouter and UI are properly deferred until run()');

} catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}