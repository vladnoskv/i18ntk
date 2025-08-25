#!/usr/bin/env node

// Simple debug test to isolate the hanging issue
console.log('🔍 DEBUG: Starting debug test...');

try {
  console.log('🔍 DEBUG: Loading SecurityUtils...');
  const SecurityUtils = require('../utils/security');
  console.log('✅ DEBUG: SecurityUtils loaded successfully');

  console.log('🔍 DEBUG: Loading SetupEnforcer...');
  const SetupEnforcer = require('../utils/setup-enforcer');
  console.log('✅ DEBUG: SetupEnforcer loaded successfully');

  console.log('🔍 DEBUG: Testing setup check...');
  const result = SetupEnforcer.checkSetupComplete();
  console.log('✅ DEBUG: Setup check completed, result:', result);

} catch (error) {
  console.error('❌ DEBUG: Error occurred:', error.message);
  console.error('❌ DEBUG: Stack trace:', error.stack);
}

console.log('🔍 DEBUG: Debug test completed');