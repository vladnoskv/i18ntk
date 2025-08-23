#!/usr/bin/env node

/**
 * i18ntk Deprecation Verification Script
 *
 * This script verifies that versions have been properly deprecated
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Read package.json to get deprecation list
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

console.log('🔍 i18ntk Deprecation Verification');
console.log('=====================================');
console.log(`📦 Package: ${packageJson.name}`);
console.log(`🎯 Current Version: ${packageJson.version}`);
console.log('=====================================\n');

// Get deprecation info for all versions
async function getDeprecationInfo() {
  try {
    const output = await new Promise((resolve, reject) => {
      https.get('https://registry.npmjs.org/i18ntk', (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve(data);
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
    const packageInfo = JSON.parse(output);

    if (packageInfo.versions) {
      const deprecatedVersions = [];
      const activeVersions = [];

      // Check each version for deprecation
      for (const version of Object.keys(packageInfo.versions)) {
        const versionInfo = packageInfo.versions[version];
        if (versionInfo.deprecated) {
          deprecatedVersions.push({
            version,
            reason: versionInfo.deprecated
          });
        } else {
          activeVersions.push(version);
        }
      }

      return { deprecatedVersions, activeVersions };
    }
  } catch (error) {
    console.error('❌ Failed to get deprecation info:', error.message);
    return null;
  }
}

// Main verification process
async function verifyDeprecations() {
  console.log('📊 Checking deprecation status...\n');

  const deprecationInfo = await getDeprecationInfo();

  if (!deprecationInfo) {
    console.log('❌ Could not retrieve deprecation information');
    return;
  }

  const { deprecatedVersions, activeVersions } = deprecationInfo;
  const currentVersion = packageJson.version;
  const deprecationList = packageJson.versionInfo.deprecations;

  console.log(`📈 Total Published Versions: ${deprecatedVersions.length + activeVersions.length}`);
  console.log(`✅ Deprecated Versions: ${deprecatedVersions.length}`);
  console.log(`🔄 Active Versions: ${activeVersions.length}`);
  console.log(`🎯 Current Version: ${currentVersion}`);
  console.log(`📋 Expected Deprecations: ${deprecationList.length}`);
  console.log('');

  // Check if current version is active
  const currentVersionActive = activeVersions.includes(currentVersion);
  if (currentVersionActive) {
    console.log(`✅ Current version ${currentVersion} is active (correct)`);
  } else {
    console.log(`❌ Current version ${currentVersion} is not active (problem)`);
  }

  // Check deprecated versions
  console.log('\n📋 Deprecated Versions:');
  if (deprecatedVersions.length > 0) {
    deprecatedVersions.forEach(({ version, reason }) => {
      console.log(`  ❌ ${version}: ${reason}`);
    });
  } else {
    console.log('  (None)');
  }

  // Check active versions (should only be current version)
  console.log('\n🔄 Active Versions:');
  if (activeVersions.length > 0) {
    activeVersions.forEach(version => {
      if (version === currentVersion) {
        console.log(`  ✅ ${version} (current version - correct)`);
      } else {
        console.log(`  ⚠️  ${version} (should be deprecated)`);
      }
    });
  } else {
    console.log('  (None)');
  }

  // Summary
  console.log('\n=====================================');
  console.log('🎯 Verification Summary');
  console.log('=====================================');

  const expectedDeprecated = deprecationList.length;
  const actualDeprecated = deprecatedVersions.length;
  const successRate = expectedDeprecated > 0 ? (actualDeprecated / expectedDeprecated * 100).toFixed(1) : 0;

  console.log(`📊 Expected deprecated: ${expectedDeprecated}`);
  console.log(`📊 Actually deprecated: ${actualDeprecated}`);
  console.log(`📊 Success rate: ${successRate}%`);

  if (activeVersions.length === 1 && activeVersions[0] === currentVersion) {
    console.log('✅ Status: All previous versions deprecated, current version active');
  } else {
    console.log('⚠️  Status: Some versions may still need deprecation');
  }

  console.log('=====================================');
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  i18ntk Deprecation Verification Script

  Usage:
    node scripts/verify-deprecations.js [options]

  Description:
    This script verifies that i18ntk versions have been properly deprecated.

  Examples:
    node scripts/verify-deprecations.js
`);
  process.exit(0);
}

// Run verification
verifyDeprecations();
