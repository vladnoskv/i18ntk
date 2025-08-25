#!/usr/bin/env node

console.log('🔍 DEBUG: Testing SecurityUtils shadowing issue...');

// Simulate the exact pattern from i18ntk-manage.js
try {
  console.log('🔍 DEBUG: Step 1: Top-level SecurityUtils import...');
  const path = require('path');
  const UIi18n = require('../main/i18ntk-ui');
  const AdminAuth = require('../utils/admin-auth');
  const SecurityUtils = require('../utils/security'); // Line 24 equivalent

  console.log('✅ Top-level SecurityUtils type:', typeof SecurityUtils);
  console.log('✅ Top-level SecurityUtils.safeExistsSync:', typeof SecurityUtils.safeExistsSync);

  // Store reference to the top-level SecurityUtils
  const topLevelSecurityUtils = SecurityUtils;

  console.log('🔍 DEBUG: Step 2: Testing detectEnvironmentAndFramework with shadowing...');

  async function detectEnvironmentAndFramework() {
    console.log('🔍 DEBUG: Inside detectEnvironmentAndFramework...');

    // This is the potential shadowing issue - Line 235 equivalent
    const SecurityUtils = require('../utils/security');

    console.log('🔍 DEBUG: After shadowing require...');
    console.log('🔍 DEBUG: Local SecurityUtils type:', typeof SecurityUtils);
    console.log('🔍 DEBUG: Local SecurityUtils.safeExistsSync:', typeof SecurityUtils.safeExistsSync);

    // Test if the local SecurityUtils works
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    console.log('🔍 DEBUG: Testing package.json path:', packageJsonPath);

    if (SecurityUtils.safeExistsSync(packageJsonPath)) {
      console.log('✅ Local SecurityUtils.safeExistsSync works');
      try {
        const packageJson = JSON.parse(SecurityUtils.safeReadFileSync(packageJsonPath, path.dirname(packageJsonPath), 'utf8'));
        console.log('✅ Local SecurityUtils.safeReadFileSync works');
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

    // Now test if the top-level SecurityUtils is still accessible
    console.log('🔍 DEBUG: Step 3: Testing top-level SecurityUtils after function call...');
    console.log('🔍 DEBUG: Top-level SecurityUtils still accessible:', typeof topLevelSecurityUtils);
    console.log('🔍 DEBUG: Top-level SecurityUtils.safeExistsSync still works:', typeof topLevelSecurityUtils.safeExistsSync);

  }).catch(error => {
    console.error('❌ detectEnvironmentAndFramework failed:', error.message);
    console.error('Stack trace:', error.stack);
  });

} catch (error) {
  console.error('❌ Error during shadowing test:', error.message);
  console.error('Stack trace:', error.stack);
}

console.log('🔍 DEBUG: Shadowing test completed.');