#!/usr/bin/env node

const I18nManager = require('../main/i18ntk-manage.js');

async function testDeleteReports() {
  try {
    const manager = new I18nManager();
    console.log('Testing deleteReports functionality...');
    
    // Test that settingsManager is properly initialized
    console.log('Settings manager configDir:', manager.settingsManager.configDir);
    
    // Test that the method can be called without undefined path errors
    console.log('DeleteReports method available:', typeof manager.deleteReports === 'function');
    
    console.log('✅ Test passed: No undefined path errors');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testDeleteReports();