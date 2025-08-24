#!/usr/bin/env node

// Simple debug test for config manager
console.log('🔍 DEBUG: Starting config manager debug test...');

try {
  console.log('🔍 DEBUG: About to require config-manager...');
  const configManager = require('./utils/config-manager');
  console.log('✅ DEBUG: Config manager loaded successfully');

  console.log('🔍 DEBUG: CONFIG_PATH:', configManager.CONFIG_PATH);
  console.log('🔍 DEBUG: About to call getConfig()...');
  const config = configManager.getConfig();
  console.log('✅ DEBUG: getConfig() completed successfully');
  console.log('🔍 DEBUG: Config keys:', Object.keys(config));

} catch (error) {
  console.error('❌ DEBUG: Error occurred:', error.message);
  console.error('❌ DEBUG: Stack trace:', error.stack);
}

console.log('🔍 DEBUG: Config manager debug test completed');