#!/usr/bin/env node

// Debug tryReadJson function
console.log('🔍 DEBUG: Starting tryReadJson debug test...');

try {
  console.log('🔍 DEBUG: About to require config-manager...');
  const configManager = require('../utils/config-manager');
  console.log('✅ DEBUG: Config manager loaded successfully');

  console.log('🔍 DEBUG: About to test tryReadJson...');
  const fs = require('fs');
  const path = require('path');

  // Test if the file exists
  const configPath = configManager.PROJECT_CONFIG_PATH;
  console.log('🔍 DEBUG: Config path:', configPath);
  console.log('🔍 DEBUG: File exists:', fs.existsSync(configPath));

  // Test reading the file directly
  if (fs.existsSync(configPath)) {
    console.log('🔍 DEBUG: About to read file...');
    const data = fs.readFileSync(configPath, 'utf8');
    console.log('🔍 DEBUG: File read successfully, length:', data.length);

    console.log('🔍 DEBUG: About to parse JSON...');
    const parsed = JSON.parse(data);
    console.log('✅ DEBUG: JSON parsed successfully');
    console.log('🔍 DEBUG: Parsed keys:', Object.keys(parsed));
  } else {
    console.log('❌ DEBUG: Config file does not exist');
  }

} catch (error) {
  console.error('❌ DEBUG: Error occurred:', error.message);
  console.error('❌ DEBUG: Stack trace:', error.stack);
}

console.log('🔍 DEBUG: tryReadJson debug test completed');