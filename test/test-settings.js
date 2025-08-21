#!/usr/bin/env node

console.log('=== Testing settings-manager usage ===');

(async () => {
  try {
    console.log('1. Loading settings-manager...');
    const configManager = require('../utils/config-manager');
    console.log('✓ settings-manager loaded');
    console.log('Type:', typeof configManager);
    console.log('Has getConfig:', typeof configManager.getConfig === 'function');

    if (!configManager || typeof configManager.getConfig !== 'function') {
      throw new TypeError('config-manager.getConfig is not a function');
    }

    console.log('2. Testing getConfig...');
    const maybeConfig = configManager.getConfig();
    const config = (maybeConfig && typeof maybeConfig.then === 'function')
      ? await maybeConfig
      : maybeConfig;
    console.log('✓ getConfig succeeded');

    if (config == null || typeof config !== 'object') {
      throw new TypeError('getConfig() did not return an object');
    }
    console.log('Config keys:', Object.keys(config));
  } catch (e) {
    console.error('✗ Error:', e.message);
    console.error('Stack:', e.stack);
    process.exitCode = 1;
  }
})();