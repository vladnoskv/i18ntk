#!/usr/bin/env node

/**
 * Simple configuration test
 */

console.log('Testing basic Node.js functionality');

try {
  const configManager = require('./utils/config-manager');
  console.log('Config manager loaded successfully');

  const config = configManager.loadConfig();
  console.log('Config loaded:', !!config);

  if (config) {
    console.log('Config version:', config.version);
    console.log('Config sourceDir:', config.sourceDir);
  }
} catch (error) {
  console.error('Error:', error.message);
}