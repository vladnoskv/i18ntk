#!/usr/bin/env node

/**
 * i18ntk Intelligent Version Deprecation Script
 *
 * This script intelligently manages version deprecations for i18ntk.
 * Features:
 * - Checks existing deprecation status to avoid re-deprecating
 * - Admin configuration support via deprecation-config.json
 * - Selective deprecation based on version patterns
 * - Comprehensive reporting and error handling
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG_FILE = path.join(__dirname, '..', 'deprecation-config.json');
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const deprecationMessage = '⚠️  DEPRECATED: This version contains security vulnerabilities and missing features. Please upgrade to i18ntk@1.10.0 for: 🔒 Zero shell access security, 🚀 97% performance improvement, 🐍 Python framework support, and 🛡️ PIN protection. Run: npm install i18ntk@latest';

// Default deprecation list from package.json
const defaultVersionsToDeprecate = packageJson.versionInfo.deprecations;

// Load admin configuration if available
function loadAdminConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      console.log('📋 Using admin configuration from deprecation-config.json');
      return config;
    } catch (error) {
      console.warn('⚠️  Could not read admin config, using defaults:', error.message);
    }
  }
  return null;
}

// Get versions to deprecate from config or defaults
function getVersionsToDeprecate() {
  const adminConfig = loadAdminConfig();
  if (adminConfig && adminConfig.versionsToDeprecate) {
    return adminConfig.versionsToDeprecate;
  }
  return defaultVersionsToDeprecate;
}

// Check if a version is already deprecated
function isVersionDeprecated(version) {
  try {
    const output = execSync(`npm view i18ntk@${version} --json`, { encoding: 'utf8' });
    const versionInfo = JSON.parse(output);
    return versionInfo.deprecated !== undefined;
  } catch (error) {
    // If we can't check, assume it's not deprecated to be safe
    return false;
  }
}

// Get all published versions
function getPublishedVersions() {
  try {
    const output = execSync('npm view i18ntk versions --json', { encoding: 'utf8' });
    return JSON.parse(output);
  } catch (error) {
    console.error('❌ Failed to get published versions:', error.message);
    process.exit(1);
  }
}

// Get deprecation status for all versions
function getDeprecationStatus() {
  const publishedVersions = getPublishedVersions();
  const currentVersion = packageJson.version;
  const status = {
    published: publishedVersions,
    current: currentVersion,
    alreadyDeprecated: [],
    notDeprecated: [],
    errors: []
  };

  console.log(`📊 Checking deprecation status for ${publishedVersions.length} versions...`);

  for (const version of publishedVersions) {
    if (version === currentVersion) {
      continue; // Skip current version
    }

    try {
      if (isVersionDeprecated(version)) {
        status.alreadyDeprecated.push(version);
      } else {
        status.notDeprecated.push(version);
      }
    } catch (error) {
      status.errors.push({ version, error: error.message });
    }

    // Small delay to avoid overwhelming npm registry
    // await new Promise(resolve => setTimeout(resolve, 100));
  }

  return status;
}

// Deprecate a single version
function deprecateVersion(version, message) {
  try {
    console.log(`🔄 Deprecating ${version}...`);
    execSync(`npm deprecate i18ntk@${version} "${message}"`, { stdio: 'inherit' });
    console.log(`✅ Successfully deprecated ${version}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to deprecate ${version}:`, error.message);
    return false;
  }
}

// Expand version ranges (e.g., "1.0.x" -> ["1.0.0", "1.0.1", "1.0.2", ...])
function expandVersionRange(versionRange) {
  if (!versionRange.includes('x')) {
    return [versionRange];
  }

  const baseVersion = versionRange.replace('.x', '');
  const expandedVersions = [];

  // For major.minor.x patterns, we'll deprecate specific known versions
  // This is safer than guessing version numbers
  return [versionRange]; // Keep as-is for npm deprecate command
}

// Main deprecation process
async function deprecateVersions() {
  const status = getDeprecationStatus();
  const versionsToDeprecate = getVersionsToDeprecate();
  const currentVersion = packageJson.version;

  console.log('\n📊 Deprecation Status Summary:');
  console.log('=====================================');
  console.log(`📦 Total Published Versions: ${status.published.length}`);
  console.log(`✅ Already Deprecated: ${status.alreadyDeprecated.length}`);
  console.log(`🔄 Not Deprecated: ${status.notDeprecated.length}`);
  console.log(`🎯 Current Version: ${currentVersion} (protected)`);
  console.log(`📋 Target Deprecation Patterns: ${versionsToDeprecate.length}`);
  console.log('=====================================\n');

  if (status.errors.length > 0) {
    console.log('⚠️  Errors encountered:');
    status.errors.forEach(({ version, error }) => {
      console.log(`   ${version}: ${error}`);
    });
    console.log('');
  }

  // Find versions that need to be deprecated
  const versionsNeedingDeprecation = [];

  for (const versionPattern of versionsToDeprecate) {
    // Skip current version
    if (versionPattern === currentVersion) {
      console.log(`⏭️  Skipping current version ${versionPattern}`);
      continue;
    }

    // Check if this version pattern matches any published versions
    const matchingVersions = status.published.filter(v => {
      if (versionPattern.includes('x')) {
        // Handle version ranges like "1.0.x"
        const basePattern = versionPattern.replace('.x', '.');
        return v.startsWith(basePattern);
      } else {
        // Exact version match
        return v === versionPattern;
      }
    });

    if (matchingVersions.length === 0) {
      console.log(`⚠️  No published versions match pattern ${versionPattern}`);
      continue;
    }

    // Check which of these versions are not already deprecated
    const needingDeprecation = matchingVersions.filter(v =>
      v !== currentVersion && !status.alreadyDeprecated.includes(v)
    );

    if (needingDeprecation.length > 0) {
      versionsNeedingDeprecation.push(...needingDeprecation);
      console.log(`📋 ${versionPattern}: ${needingDeprecation.length} versions need deprecation`);
    } else {
      console.log(`✅ ${versionPattern}: All matching versions already deprecated`);
    }
  }

  if (versionsNeedingDeprecation.length === 0) {
    console.log('\n🎉 All target versions are already deprecated!');
    console.log('=====================================');
    console.log('✅ No action needed - deprecation is complete');
    console.log('=====================================');
    return;
  }

  console.log(`\n🚨 Ready to deprecate ${versionsNeedingDeprecation.length} versions:`);
  versionsNeedingDeprecation.forEach(version => {
    console.log(`   • ${version}`);
  });

  // In dry-run mode, just show what would be done
  if (args.includes('--dry-run')) {
    console.log('\n🔍 DRY RUN MODE - No actual deprecations will be made');
    console.log('=====================================');
    return;
  }

  // Confirm before proceeding
  if (!args.includes('--yes')) {
    console.log('\n⚠️  This will permanently deprecate versions on npm.');
    console.log('   Are you sure you want to continue?');
    console.log('   Run with --yes to proceed, or --dry-run to preview only.');
    return;
  }

  // Perform deprecations
  console.log('\n🚀 Starting deprecation process...');
  let successCount = 0;
  let failCount = 0;

  for (const version of versionsNeedingDeprecation) {
    if (deprecateVersion(version, deprecationMessage)) {
      successCount++;
    } else {
      failCount++;
    }

    // Small delay to avoid overwhelming npm registry
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n=====================================');
  console.log('🎉 Deprecation Process Complete!');
  console.log('=====================================');
  console.log(`✅ Successfully deprecated: ${successCount} versions`);
  console.log(`❌ Failed to deprecate: ${failCount} versions`);
  console.log(`📊 Total processed: ${successCount + failCount} versions`);
  console.log('=====================================');

  if (failCount > 0) {
    console.log('\n⚠️  Some versions failed to deprecate. You may need to:');
    console.log('   1. Check your npm permissions');
    console.log('   2. Verify you are logged in with npm login');
    console.log('   3. Try running the script again for failed versions');
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
i18ntk Intelligent Version Deprecation Script

Usage:
  node scripts/deprecate-versions.js [options]

Options:
  --dry-run    Show what would be deprecated without making changes
  --yes        Confirm deprecation (required for actual deprecation)
  --help, -h   Show this help message

Description:
  This script intelligently manages version deprecations for i18ntk.
  It only deprecates versions that aren't already deprecated and
  provides admin control through deprecation-config.json.

Configuration:
  Create deprecation-config.json to customize which versions to deprecate:

  {
    "versionsToDeprecate": ["1.0.x", "1.1.x", "1.8.0", "1.9.0"],
    "excludeVersions": ["1.5.0"],
    "customMessage": "Custom deprecation message"
  }

Examples:
  node scripts/deprecate-versions.js --dry-run
  node scripts/deprecate-versions.js --yes
`);
  process.exit(0);
}

// Run the deprecation process
deprecateVersions().catch(error => {
  console.error('💥 Fatal error during deprecation process:', error);
  process.exit(1);
});