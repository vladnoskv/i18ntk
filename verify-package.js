#!/usr/bin/env node
/**
 * Verify Package Script
 * 
 * This script verifies the package structure and configuration before publishing to npm.
 * It checks for required files, correct version numbers, and proper configuration.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '.');
const packageJsonPath = path.join(rootDir, 'package.json');
const changelogPath = path.join(rootDir, 'CHANGELOG.md');
const readmePath = path.join(rootDir, 'README.md');
const npmignorePath = path.join(rootDir, '.npmignore');

// Check if required files exist
const requiredFiles = [
  { path: packageJsonPath, name: 'package.json' },
  { path: changelogPath, name: 'CHANGELOG.md' },
  { path: readmePath, name: 'README.md' },
  { path: npmignorePath, name: '.npmignore' },
];

console.log('🔍 Verifying package structure...');

// Check required files
let missingFiles = false;
requiredFiles.forEach(file => {
  if (!fs.existsSync(file.path)) {
    console.error(`❌ Missing required file: ${file.name}`);
    missingFiles = true;
  } else {
    console.log(`✅ Found required file: ${file.name}`);
  }
});

if (missingFiles) {
  console.error('❌ Some required files are missing. Please create them before publishing.');
  process.exit(1);
}

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

// Read CHANGELOG.md
const changelog = fs.readFileSync(changelogPath, 'utf8');

// Read README.md
const readme = fs.readFileSync(readmePath, 'utf8');

// Check version consistency
console.log('🔍 Checking version consistency...');

// Check if version in package.json matches version in CHANGELOG.md
if (!changelog.includes(`[${version}]`) && !changelog.includes(`**Current Version:** ${version}`)) {
  console.error(`❌ Version mismatch: package.json (${version}) does not match CHANGELOG.md`);
  process.exit(1);
} else {
  console.log(`✅ Version in CHANGELOG.md matches package.json: ${version}`);
}

// Check if version in package.json matches version in README.md
if (!readme.includes(`**Version:** ${version}`)) {
  console.error(`❌ Version mismatch: package.json (${version}) does not match README.md`);
  process.exit(1);
} else {
  console.log(`✅ Version in README.md matches package.json: ${version}`);
}

// Check if version in package.json matches version in versionInfo
if (packageJson.versionInfo && packageJson.versionInfo.version !== version) {
  console.error(`❌ Version mismatch: package.json (${version}) does not match versionInfo.version (${packageJson.versionInfo.version})`);
  process.exit(1);
} else {
  console.log(`✅ Version in versionInfo matches package.json: ${version}`);
}

// Check npm configuration
console.log('🔍 Checking npm configuration...');

// Check if bin field is properly configured
if (!packageJson.bin || Object.keys(packageJson.bin).length === 0) {
  console.error('❌ Missing or empty bin field in package.json');
  process.exit(1);
} else {
  console.log(`✅ Found bin configuration with ${Object.keys(packageJson.bin).length} commands`);
}

// Check if main field is properly configured
if (!packageJson.main) {
  console.error('❌ Missing main field in package.json');
  process.exit(1);
} else {
  console.log(`✅ Found main field: ${packageJson.main}`);
}

// Check if files field is properly configured
if (!packageJson.files || packageJson.files.length === 0) {
  console.error('❌ Missing or empty files field in package.json');
  process.exit(1);
} else {
  console.log(`✅ Found files configuration with ${packageJson.files.length} entries`);
}

// Check if scripts field is properly configured
if (!packageJson.scripts || Object.keys(packageJson.scripts).length === 0) {
  console.error('❌ Missing or empty scripts field in package.json');
  process.exit(1);
} else {
  console.log(`✅ Found scripts configuration with ${Object.keys(packageJson.scripts).length} entries`);
}

// Check if keywords field is properly configured
if (!packageJson.keywords || packageJson.keywords.length === 0) {
  console.error('❌ Missing or empty keywords field in package.json');
  process.exit(1);
} else {
  console.log(`✅ Found keywords configuration with ${packageJson.keywords.length} entries`);
}

// Check if author field is properly configured
if (!packageJson.author) {
  console.error('❌ Missing author field in package.json');
  process.exit(1);
} else {
  console.log(`✅ Found author configuration`);
}

// Check if license field is properly configured
if (!packageJson.license) {
  console.error('❌ Missing license field in package.json');
  process.exit(1);
} else {
  console.log(`✅ Found license configuration: ${packageJson.license}`);
}

// Check if repository field is properly configured
if (!packageJson.repository) {
  console.error('❌ Missing repository field in package.json');
  process.exit(1);
} else {
  console.log(`✅ Found repository configuration`);
}

// Check if engines field is properly configured
if (!packageJson.engines || !packageJson.engines.node) {
  console.error('❌ Missing engines.node field in package.json');
  process.exit(1);
} else {
  console.log(`✅ Found engines configuration: node ${packageJson.engines.node}`);
}

// Check if publishConfig field is properly configured
if (!packageJson.publishConfig || !packageJson.publishConfig.access) {
  console.error('❌ Missing publishConfig.access field in package.json');
  process.exit(1);
} else {
  console.log(`✅ Found publishConfig configuration: access ${packageJson.publishConfig.access}`);
}

console.log('\n✅ Package verification completed successfully!');
console.log(`\n📦 Ready to publish version ${version} to npm!`);
console.log('\nRun the following command to publish:');
console.log('\n  npm publish\n');