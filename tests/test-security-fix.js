#!/usr/bin/env node

/**
 * Test script to verify SecurityUtils.safeWriteFileSync fix
 */

const SecurityUtils = require('../utils/security');
const path = require('path');

console.log('🔍 Testing SecurityUtils.safeWriteFileSync fix...\n');

// Test 1: Check if method exists
console.log('1. Checking if safeWriteFileSync method exists...');
const methodExists = typeof SecurityUtils.safeWriteFileSync === 'function';
console.log(`   Result: ${methodExists ? '✅ PASS' : '❌ FAIL'}`);

// Test 2: Test the method with a temporary file
console.log('\n2. Testing safeWriteFileSync method...');
const testFile = path.join(__dirname, 'test-security-temp.json');
const testContent = JSON.stringify({ test: 'data', timestamp: new Date().toISOString() }, null, 2);

try {
  const writeResult = SecurityUtils.safeWriteFileSync(testFile, testContent, __dirname, 'utf8');
  console.log(`   Write result: ${writeResult ? '✅ PASS' : '❌ FAIL'}`);

  // Test 3: Verify file was created and can be read
  console.log('\n3. Testing safeReadFileSync method...');
  const readResult = SecurityUtils.safeReadFileSync(testFile, __dirname, 'utf8');
  console.log(`   Read result: ${readResult ? '✅ PASS' : '❌ FAIL'}`);

  if (readResult) {
    const parsed = JSON.parse(readResult);
    console.log(`   Content verification: ${parsed.test === 'data' ? '✅ PASS' : '❌ FAIL'}`);
  }

  // Clean up
  const fs = require('fs');
  if (fs.existsSync(testFile)) {
    fs.unlinkSync(testFile);
    console.log('\n4. Cleanup: ✅ PASS');
  }

} catch (error) {
  console.log(`   Error: ${error.message} - ❌ FAIL`);
}

console.log('\n🎉 SecurityUtils test completed!');