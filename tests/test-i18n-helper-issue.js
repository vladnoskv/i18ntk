#!/usr/bin/env node

console.log('🔍 DEBUG: Testing i18n-helper SecurityUtils loading issue...');

try {
  console.log('🔍 DEBUG: Step 1: Testing i18n-helper loading...');

  // Load i18n-helper first (like in main/i18ntk-manage.js)
  const { loadTranslations } = require('../utils/i18n-helper');
  loadTranslations();

  console.log('✅ i18n-helper loaded successfully');

  console.log('🔍 DEBUG: Step 2: Testing SecurityUtils after i18n-helper...');

  // Now try to load SecurityUtils
  const SecurityUtils = require('../utils/security');

  console.log('✅ SecurityUtils loaded after i18n-helper');
  console.log('✅ SecurityUtils type:', typeof SecurityUtils);
  console.log('✅ SecurityUtils.safeExistsSync:', typeof SecurityUtils.safeExistsSync);

  // Test if SecurityUtils works
  const testPath = './package.json';
  const result = SecurityUtils.safeExistsSync(testPath);
  console.log('✅ SecurityUtils.safeExistsSync result:', result);

  console.log('🔍 DEBUG: Step 3: Testing detectEnvironmentAndFramework after i18n-helper...');

  async function detectEnvironmentAndFramework() {
    const path = require('path');
    const fs = require('fs');
    const SecurityUtils = require('../utils/security');

    console.log('🔍 DEBUG: In detectEnvironmentAndFramework after i18n-helper...');
    console.log('🔍 DEBUG: SecurityUtils type:', typeof SecurityUtils);

    const packageJsonPath = path.join(process.cwd(), 'package.json');

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

  // Test the function
  detectEnvironmentAndFramework().then(result => {
    console.log('✅ detectEnvironmentAndFramework completed:', result);
  }).catch(error => {
    console.error('❌ detectEnvironmentAndFramework failed:', error.message);
    console.error('Stack trace:', error.stack);
  });

} catch (error) {
  console.error('❌ Error during i18n-helper test:', error.message);
  console.error('Stack trace:', error.stack);
}

console.log('🔍 DEBUG: i18n-helper test completed.');