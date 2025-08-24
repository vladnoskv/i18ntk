#!/usr/bin/env node

// Minimal debug test
console.log('🔍 DEBUG: Starting minimal debug test...');

try {
  console.log('🔍 DEBUG: About to require config-manager...');
  const configManager = require('./utils/config-manager');
  console.log('✅ DEBUG: Config manager loaded successfully');

  console.log('🔍 DEBUG: CONFIG_PATH:', configManager.CONFIG_PATH);
  console.log('🔍 DEBUG: DEFAULT_CONFIG keys:', Object.keys(configManager.DEFAULT_CONFIG));

  console.log('🔍 DEBUG: About to call loadConfig()...');
  const config = configManager.loadConfig();
  console.log('✅ DEBUG: loadConfig() completed successfully');
  console.log('🔍 DEBUG: Config keys:', Object.keys(config));

} catch (error) {
  console.error('❌ DEBUG: Error occurred:', error.message);
  console.error('❌ DEBUG: Stack trace:', error.stack);
}

console.log('🔍 DEBUG: Minimal debug test completed');