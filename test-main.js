#!/usr/bin/env node
/**
 * Test main command loading with minimal dependencies
 */

const fs = require('fs');
const path = require('path');

console.log('Testing main command loading...');

// Test loading the main file without executing it
try {
    // First, let's see what happens when we require the file
    console.log('Attempting to require main/i18ntk-manage.js...');
    
    // Create a simple mock for the problematic dependencies
    const originalRequire = require;
    
    // Test by directly loading the file content and checking for circular dependencies
    const mainFilePath = path.join(__dirname, 'main', 'i18ntk-manage.js');
    const content = fs.readFileSync(mainFilePath, 'utf8');
    
    console.log('Main file loaded, length:', content.length);
    
    // Count SecurityUtils references
    const securityUtilsCount = (content.match(/SecurityUtils\./g) || []).length;
    console.log('SecurityUtils references found:', securityUtilsCount);
    
    // Test loading just the basic structure
    console.log('\nTesting basic module structure...');
    
    // Test if we can load the required modules individually
    const modulesToTest = [
        './utils/config-manager',
        './utils/security',
        './utils/admin-auth',
        './utils/i18n-helper',
        './utils/cli-helper'
    ];
    
    modulesToTest.forEach(modulePath => {
        try {
            const module = require(modulePath);
            console.log(`✓ ${modulePath} loaded successfully`);
        } catch (e) {
            console.log(`✗ ${modulePath} failed:`, e.message);
        }
    });
    
    console.log('\nTest completed successfully.');
    
} catch (e) {
    console.log('Error during test:', e.message);
    console.log('Stack:', e.stack);
}