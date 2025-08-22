#!/usr/bin/env node
/**
 * Test the main command entry point
 */

const fs = require('fs');
const path = require('path');

console.log('Testing main command entry point...');

// Create a minimal test environment
process.argv = ['node', 'test-entry.js', '--help'];

// Test by directly executing the main file
try {
    console.log('Setting up environment...');
    
    // Change to the correct directory
    process.chdir(__dirname);
    console.log('Working directory:', process.cwd());
    
    // Execute the main file directly
    console.log('Executing main command...');
    
    // Use child_process to execute the command properly
    const { execSync } = require('child_process');
    
    try {
        const result = execSync('node main/i18ntk-manage.js --help', { 
            encoding: 'utf8', 
            timeout: 10000,
            stdio: 'pipe'
        });
        console.log('Command executed successfully!');
        console.log('Output:', result);
    } catch (execError) {
        console.log('Command failed:', execError.message);
        if (execError.stdout) console.log('stdout:', execError.stdout);
        if (execError.stderr) console.log('stderr:', execError.stderr);
    }
    
} catch (e) {
    console.log('Error during test:', e.message);
    console.log('Stack:', e.stack);
}