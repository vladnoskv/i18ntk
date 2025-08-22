#!/usr/bin/env node
/**
 * Simplified main entry point to test basic functionality
 */

const fs = require('fs');
const path = require('path');

// Simple help display
function showHelp() {
    console.log(`
i18ntk - Internationalization Toolkit

Usage:
  node simple-main.js [command]

Commands:
  help     Show this help message
  test     Run basic tests

This is a simplified test version to verify basic functionality.
`);
}

// Main function
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('help') || args.length === 0) {
        showHelp();
        return;
    }
    
    if (args[0] === 'test') {
        console.log('Running basic tests...');
        
        // Test config-manager
        try {
            const configManager = require('./utils/config-manager');
            const config = configManager.getConfig();
            console.log('✓ Config manager working');
            console.log('Config keys:', Object.keys(config));
        } catch (e) {
            console.log('✗ Config manager failed:', e.message);
        }
        
        // Test file system access
        try {
            const settingsPath = path.join('settings', 'i18ntk-config.json');
            if (fs.existsSync(settingsPath)) {
                console.log('✓ Settings file accessible');
            } else {
                console.log('✗ Settings file not found');
            }
        } catch (e) {
            console.log('✗ File system test failed:', e.message);
        }
        
        console.log('Tests completed.');
    }
}

// Execute if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };