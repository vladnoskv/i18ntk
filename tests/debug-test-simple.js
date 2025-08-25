#!/usr/bin/env node

// Simple debug test to isolate the hanging issue
console.log('🔍 DEBUG: Starting simple debug test...');

try {
  console.log('🔍 DEBUG: Loading SecurityUtils...');
  const SecurityUtils = require('../utils/security');
  console.log('✅ DEBUG: SecurityUtils loaded successfully');

  console.log('🔍 DEBUG: Loading SetupEnforcer...');
  const SetupEnforcer = require('../utils/setup-enforcer');
  console.log('✅ DEBUG: SetupEnforcer loaded successfully');

  console.log('🔍 DEBUG: Loading config manager...');
  const configManager = require('../utils/config-manager');
  console.log('✅ DEBUG: Config manager loaded successfully');

  console.log('🔍 DEBUG: Config path:', configManager.CONFIG_PATH);
  console.log('🔍 DEBUG: Config exists:', SecurityUtils.safeExistsSync(configManager.CONFIG_PATH));

  if (SecurityUtils.safeExistsSync(configManager.CONFIG_PATH)) {
    const config = JSON.parse(SecurityUtils.safeReadFileSync(configManager.CONFIG_PATH, 'utf8'));
    console.log('🔍 DEBUG: Config version:', config.version);
    console.log('🔍 DEBUG: Config sourceDir:', config.sourceDir);
    console.log('🔍 DEBUG: Config setup completed:', config.setup?.completed);
    console.log('🔍 DEBUG: Config detectedFramework:', config.detectedFramework);
    console.log('🔍 DEBUG: Config framework.detected:', config.framework?.detected);

    // Check the conditions manually
    const hasVersion = !!config.version;
    const hasSourceDir = !!config.sourceDir;
    const hasSetupCompleted = config.setup && config.setup.completed === true;
    const hasDetectedFramework = !!config.detectedFramework;
    const hasFrameworkDetected = config.framework && config.framework.detected !== false;

    console.log('🔍 DEBUG: hasVersion:', hasVersion);
    console.log('🔍 DEBUG: hasSourceDir:', hasSourceDir);
    console.log('🔍 DEBUG: hasSetupCompleted:', hasSetupCompleted);
    console.log('🔍 DEBUG: hasDetectedFramework:', hasDetectedFramework);
    console.log('🔍 DEBUG: hasFrameworkDetected:', hasFrameworkDetected);

    const fallbackCheck = !config.detectedFramework && !(config.framework && config.framework.detected !== false);
    console.log('🔍 DEBUG: fallbackCheck (should be false for success):', fallbackCheck);

    if (hasSetupCompleted) {
      console.log('✅ DEBUG: Setup is marked as completed');
    } else if (!hasVersion || !hasSourceDir || fallbackCheck) {
      console.log('❌ DEBUG: Setup is incomplete - would trigger handleIncompleteSetup');
    } else {
      console.log('✅ DEBUG: Setup should be considered complete');
    }
  } else {
    console.log('❌ DEBUG: Config file does not exist');
  }

} catch (error) {
  console.error('❌ DEBUG: Error occurred:', error.message);
  console.error('❌ DEBUG: Stack trace:', error.stack);
}

console.log('🔍 DEBUG: Simple debug test completed');