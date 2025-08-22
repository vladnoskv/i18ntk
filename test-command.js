#!/usr/bin/env node
/**
 * Simple test to check if we can load the main components without circular dependencies
 */

const fs = require('fs');
const path = require('path');

console.log('Starting test...');
console.log('Current directory:', process.cwd());

// Test basic fs operations
console.log('Testing basic fs operations...');
const settingsPath = path.join('settings', 'i18ntk-config.json');
if (fs.existsSync(settingsPath)) {
    console.log('Settings file exists');
    try {
        const content = fs.readFileSync(settingsPath, 'utf8');
        const config = JSON.parse(content);
        console.log('Config loaded successfully, keys:', Object.keys(config));
    } catch (e) {
        console.log('Error reading config:', e.message);
    }
} else {
    console.log('Settings file not found at:', settingsPath);
}

// Test loading individual modules
console.log('\nTesting module loading...');

// Test config-manager (which we know works)
try {
    const configManager = require('./utils/config-manager');
    console.log('✓ config-manager loaded successfully');
    const config = configManager.getConfig();
    console.log('Config loaded via config-manager');
} catch (e) {
    console.log('✗ config-manager failed:', e.message);
}

// Test security-utils
try {
    const SecurityUtils = require('./utils/security');
    console.log('✓ SecurityUtils loaded successfully');
} catch (e) {
    console.log('✗ SecurityUtils failed:', e.message);
}

console.log('\nTest completed.');