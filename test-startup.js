#!/usr/bin/env node

console.log('=== Testing i18ntk startup ===');

const verbose = process.env.STARTUP_VERBOSE === '1' || process.argv.includes('--verbose');
let failures = 0;

// Test basic imports
console.log('1. Testing fs...');
const fs = require('fs');
console.log('✓ fs loaded');

console.log('2. Testing path...');
const path = require('path');
console.log('✓ path loaded');

console.log('3. Testing security...');
try {
  const SecurityUtils = require('./utils/security');
  console.log('✓ security loaded');
} catch (e) {
  failures++;
  console.error('✗ security failed:', verbose ? e.stack : e.message);
}

console.log('4. Testing settings-manager...');
try {
  const configManager = require('./settings/settings-manager');
  console.log('✓ settings-manager loaded');
  console.log('Config dir:', configManager.configDir);
} catch (e) {
  failures++;
  console.error('✗ settings-manager failed:', verbose ? e.stack : e.message);
}

console.log('5. Testing config-manager...');
try {
  const configManager = require('./utils/config-manager');
  console.log('✓ config-manager loaded');
} catch (e) {
  failures++;
  console.error('✗ config-manager failed:', verbose ? e.stack : e.message);
}

console.log('6. Testing init-helper...');
try {
  const { checkInitialized } = require('./utils/init-helper');
  console.log('✓ init-helper loaded');
} catch (e) {
  failures++;
  console.error('✗ init-helper failed:', verbose ? e.stack : e.message);
}

if (failures > 0) {
  console.error(`=== All tests completed (failures: ${failures}) ===`);
  process.exitCode = 1;
} else {
  console.log('=== All tests completed (OK) ===');
}