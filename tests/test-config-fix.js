// Simple test to verify configuration loading without recursion issues
const { loadConfig, getConfig } = require('../utils/config-manager');

console.log('Testing configuration loading...');

try {
  console.log('1. Testing loadConfig()...');
  const config1 = loadConfig();
  console.log('✅ loadConfig() successful');

  console.log('2. Testing getConfig()...');
  const config2 = getConfig();
  console.log('✅ getConfig() successful');

  console.log('3. Testing multiple sequential calls...');
  for (let i = 0; i < 5; i++) {
    const testConfig = loadConfig();
    console.log(`✅ Call ${i + 1} successful`);
  }

  console.log('🎉 All tests passed! Configuration loading is working correctly.');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}