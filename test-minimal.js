#!/usr/bin/env node

// Test minimal startup without SetupEnforcer
console.log('Testing minimal startup...');

// Just test basic require
try {
  console.log('Requiring fs...');
  const fs = require('fs');
  console.log('✓ fs loaded');
  
  console.log('Requiring path...');
  const path = require('path');
  console.log('✓ path loaded');
  
  console.log('Requiring security...');
  const SecurityUtils = require('./utils/security');
  console.log('✓ security loaded');
  
  console.log('Requiring config-manager...');
  const configManager = require('./utils/config-manager');
  console.log('✓ config-manager loaded');
  
  console.log('All modules loaded successfully!');
  console.log('Now testing getConfig...');
  
  // Only call getConfig when explicitly needed
  const config = configManager.getConfig();
  console.log('✓ getConfig completed');
  console.log('Config loaded:', Object.keys(config));
  
   console.log('✓ getConfig completed');
   console.log('Config loaded:', Object.keys(config));
   console.log('Test complete.');
 } catch (error) {
   console.error('Error:', error.message);
   console.error('Stack:', error.stack);
   process.exitCode = 1;
}