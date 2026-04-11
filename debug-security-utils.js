#!/usr/bin/env node
/**
 * Diagnostic script to identify SecurityUtils undefined issue
 */

console.log('🔍 DEBUG: Starting SecurityUtils diagnostic...');

// Test 1: Check if SecurityUtils can be imported directly
try {
    const SecurityUtils = require('./utils/security');
    console.log('✅ Test 1: SecurityUtils import successful');
    console.log('   Type:', typeof SecurityUtils);
    console.log('   Has safeExistsSync:', typeof SecurityUtils.safeExistsSync);
} catch (error) {
    console.error('❌ Test 1: SecurityUtils import failed:', error.message);
}

// Test 2: Check if SecurityUtils is available in global scope
console.log('🔍 Test 2: Checking global SecurityUtils...');
if (typeof SecurityUtils !== 'undefined') {
    console.log('✅ Global SecurityUtils found:', typeof SecurityUtils);
} else {
    console.log('❌ Global SecurityUtils not found');
}

// Test 3: Check the actual entry point flow
console.log('🔍 Test 3: Testing main/manage/index.js flow...');
try {
    const path = require('path');
    const fs = require('fs');
    
    // Check if main/manage/index.js exists and can be required
    const mainPath = path.join(__dirname, 'main', 'manage', 'index.js');
    console.log('   Main file path:', mainPath);
    console.log('   File exists:', fs.existsSync(mainPath));
    
    // Try to require it
    const mainModule = require(mainPath);
    console.log('✅ Main module loaded successfully');
} catch (error) {
    console.error('❌ Main module load failed:', error.message);
    console.error('   Stack:', error.stack);
}

// Test 4: Check for any global SecurityUtils assignments
console.log('🔍 Test 4: Checking for global assignments...');
const globalProps = Object.keys(global).filter(key => key.toLowerCase().includes('security'));
console.log('   Global security-related properties:', globalProps);

// Test 5: Check process.argv to see exact command being run
console.log('🔍 Test 5: Process arguments...');
console.log('   argv:', process.argv);

console.log('\n🔍 Diagnostic complete.');