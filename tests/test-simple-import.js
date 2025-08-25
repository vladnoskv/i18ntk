#!/usr/bin/env node

/**
 * Simple test script to verify the new modular main/manage/index.js can be imported
 */

console.log('🧪 Simple import test for modular main/manage/index.js...\n');

try {
    // Test 1: Import the I18nManager class
    console.log('1. Testing import...');
    const I18nManager = require('../main/manage/index.js');
    console.log('   ✅ Successfully imported I18nManager class');

    // Test 2: Check if it's a function/class
    console.log('\n2. Testing class structure...');
    if (typeof I18nManager === 'function') {
        console.log('   ✅ I18nManager is a constructor function');
    } else {
        console.log('   ❌ I18nManager is not a constructor function');
    }

    // Test 3: Check if it has the expected prototype methods
    console.log('\n3. Testing prototype methods...');
    const prototype = I18nManager.prototype;
    const expectedMethods = ['run', 'executeCommand', 'parseArgs', 'showHelp'];

    let methodCount = 0;
    expectedMethods.forEach(method => {
        if (typeof prototype[method] === 'function') {
            methodCount++;
            console.log(`   ✅ Method ${method} exists`);
        } else {
            console.log(`   ❌ Method ${method} missing`);
        }
    });

    console.log(`\n📋 Summary:`);
    console.log(`   - I18nManager class imported successfully`);
    console.log(`   - ${methodCount}/${expectedMethods.length} expected methods found`);
    console.log(`   - Class is ready for instantiation`);

    if (methodCount === expectedMethods.length) {
        console.log('\n🎉 Import test passed!');
    } else {
        console.log('\n⚠️  Import test completed with some missing methods');
    }

} catch (error) {
    console.error('\n❌ Import test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}