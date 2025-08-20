#!/usr/bin/env node

console.log('=== Testing i18ntk startup ===');

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
  console.error('✗ security failed:', e.message);
}

console.log('4. Testing settings-manager...');
try {
  const configManager = require('./settings/settings-manager');
  console.log('✓ settings-manager loaded');
  console.log('Config dir:', configManager.configDir);
} catch (e) {
  console.error('✗ settings-manager failed:', e.message);
}

console.log('5. Testing config-manager...');
try {
  const configManager = require('./utils/config-manager');
  console.log('✓ config-manager loaded');
} catch (e) {
  console.error('✗ config-manager failed:', e.message);
}

console.log('6. Testing init-helper...');
try {
  const { checkInitialized } = require('./utils/init-helper');
  console.log('✓ init-helper loaded');
} catch (e) {
  console.error('✗ init-helper failed:', e.message);
}

console.log('=== All tests completed ===');