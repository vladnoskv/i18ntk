#!/usr/bin/env node

console.log('🔍 DEBUG: Testing specific SecurityUtils error scenario...');

// Test the exact scenario from i18ntk-manage.js
try {
  console.log('🔍 DEBUG: Simulating i18ntk-manage.js startup...');

  // Import all the same modules in the same order as i18ntk-manage.js
  const path = require('path');
  const UIi18n = require('../main/i18ntk-ui');
  const AdminAuth = require('../utils/admin-auth');
  const SecurityUtils = require('../utils/security');

  console.log('✅ All imports successful');
  console.log('✅ SecurityUtils type:', typeof SecurityUtils);
  console.log('✅ SecurityUtils.safeExistsSync:', typeof SecurityUtils.safeExistsSync);

  // Now test the detectEnvironmentAndFramework function
  console.log('🔍 DEBUG: Testing detectEnvironmentAndFramework function...');

  async function detectEnvironmentAndFramework() {
    console.log('🔍 DEBUG: Inside detectEnvironmentAndFramework...');
    console.log('🔍 DEBUG: SecurityUtils type at function start:', typeof SecurityUtils);

    const fs = require('fs');
    const SecurityUtils_local = require('../utils/security');

    console.log('🔍 DEBUG: Local SecurityUtils type:', typeof SecurityUtils_local);
    console.log('🔍 DEBUG: Global SecurityUtils type:', typeof SecurityUtils);

    const packageJsonPath = path.join(process.cwd(), 'package.json');
    console.log('🔍 DEBUG: Testing package.json path:', packageJsonPath);

    if (SecurityUtils_local.safeExistsSync(packageJsonPath)) {
      console.log('✅ SecurityUtils_local.safeExistsSync works');
      try {
        const packageJson = JSON.parse(SecurityUtils_local.safeReadFileSync(packageJsonPath, path.dirname(packageJsonPath), 'utf8'));
        console.log('✅ SecurityUtils_local.safeReadFileSync works');
        return { detectedLanguage: 'javascript', detectedFramework: 'test' };
      } catch (error) {
        console.error('❌ Error in JSON parsing:', error.message);
        return { detectedLanguage: 'generic', detectedFramework: 'generic' };
      }
    }

    return { detectedLanguage: 'generic', detectedFramework: 'generic' };
  }

  // Call the function
  detectEnvironmentAndFramework().then(result => {
    console.log('✅ detectEnvironmentAndFramework completed:', result);
  }).catch(error => {
    console.error('❌ detectEnvironmentAndFramework failed:', error.message);
    console.error('Stack trace:', error.stack);
  });

} catch (error) {
  console.error('❌ Error during testing:', error.message);
  console.error('Stack trace:', error.stack);
}

console.log('🔍 DEBUG: Test completed.');