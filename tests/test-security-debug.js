#!/usr/bin/env node

console.log('🔍 DEBUG: Starting SecurityUtils debug test...');

// Test 1: Direct import
try {
  console.log('🔍 DEBUG: Testing direct SecurityUtils import...');
  const SecurityUtils = require('../utils/security');
  console.log('✅ SecurityUtils imported successfully:', typeof SecurityUtils);

  // Test 2: Check if class is properly exported
  console.log('🔍 DEBUG: Testing SecurityUtils class methods...');
  console.log('✅ SecurityUtils.safeExistsSync:', typeof SecurityUtils.safeExistsSync);
  console.log('✅ SecurityUtils.safeReadFileSync:', typeof SecurityUtils.safeReadFileSync);

  // Test 3: Try to use SecurityUtils in a function similar to detectEnvironmentAndFramework
  console.log('🔍 DEBUG: Testing SecurityUtils usage in function context...');
  function testSecurityUtilsUsage() {
    const SecurityUtils = require('../utils/security');
    console.log('✅ SecurityUtils in function:', typeof SecurityUtils);

    const testPath = './package.json';
    const result = SecurityUtils.safeExistsSync(testPath);
    console.log('✅ SecurityUtils.safeExistsSync result:', result);
    return result;
  }

  testSecurityUtilsUsage();

} catch (error) {
  console.error('❌ Error during SecurityUtils testing:', error.message);
  console.error('Stack trace:', error.stack);
}

// Test 4: Simulate the exact require pattern from i18ntk-manage.js
try {
  console.log('🔍 DEBUG: Testing exact require pattern from i18ntk-manage.js...');
  const path = require('path');
  const SecurityUtils = require('../utils/security');

  console.log('✅ Pattern test - SecurityUtils:', typeof SecurityUtils);

  // Test the detectEnvironmentAndFramework pattern
  console.log('🔍 DEBUG: Testing detectEnvironmentAndFramework pattern...');
  async function detectEnvironmentAndFramework() {
    const fs = require('fs');
    const SecurityUtils = require('../utils/security');

    console.log('✅ In detectEnvironmentAndFramework - SecurityUtils:', typeof SecurityUtils);

    const packageJsonPath = path.join(process.cwd(), 'package.json');
    console.log('🔍 DEBUG: Testing package.json path:', packageJsonPath);

    if (SecurityUtils.safeExistsSync(packageJsonPath)) {
      console.log('✅ SecurityUtils.safeExistsSync works in function');
      try {
        const packageJson = JSON.parse(SecurityUtils.safeReadFileSync(packageJsonPath, path.dirname(packageJsonPath), 'utf8'));
        console.log('✅ SecurityUtils.safeReadFileSync works in function');
        return { detectedLanguage: 'javascript', detectedFramework: 'test' };
      } catch (error) {
        console.error('❌ Error in JSON parsing:', error.message);
        return { detectedLanguage: 'generic', detectedFramework: 'generic' };
      }
    }

    return { detectedLanguage: 'generic', detectedFramework: 'generic' };
  }

  detectEnvironmentAndFramework().then(result => {
    console.log('✅ detectEnvironmentAndFramework completed:', result);
  }).catch(error => {
    console.error('❌ detectEnvironmentAndFramework failed:', error.message);
  });

} catch (error) {
  console.error('❌ Error in pattern test:', error.message);
  console.error('Stack trace:', error.stack);
}

console.log('🔍 DEBUG: SecurityUtils debug test completed.');