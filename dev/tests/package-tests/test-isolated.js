#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Generate unique test directory name
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const TEST_DIR = `test-isolated-${timestamp}`;

console.log(`🧪 Creating isolated test environment: ${TEST_DIR}`);

// Create test directory
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR);
}

const originalDir = process.cwd();

try {
  // Create tarball
  console.log('📦 Creating package tarball...');
  const tarballName = execSync('npm pack', { encoding: 'utf8' }).trim();
  console.log(`Created: ${tarballName}`);
  
  // Move to test directory
  process.chdir(TEST_DIR);
  
  console.log('🚀 Setting up test environment...');
  execSync('npm init -y', { stdio: 'inherit' });
  
  // Install the tarball directly (no naming conflicts)
  console.log('📥 Installing package...');
  execSync(`npm install ../${tarballName}`, { stdio: 'inherit' });
  
  console.log('✅ Package installed successfully!');
  console.log('🔍 Running verification tests...');
  
  // Test CLI commands
  console.log('\n📋 Testing CLI commands:');
  execSync('npx i18ntk --help', { stdio: 'inherit' });
  
  console.log('\n🔧 Testing package resolution:');
  execSync('node -e "console.log(require.resolve(\'i18ntk/ui-locales/en.json\'))"', { stdio: 'inherit' });
  
  console.log('\n🌐 Testing language support:');
  execSync('node -e "console.log(Object.keys(require(\'i18ntk/ui-locales\')))"', { stdio: 'inherit' });
  
  console.log('\n🎯 Testing initialization:');
  execSync('npx i18ntk-init --help', { stdio: 'inherit' });
  
  console.log('\n🎉 All tests completed successfully!');
  console.log(`📁 Test directory: ${TEST_DIR}`);
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
} finally {
  // Clean up
  process.chdir(originalDir);
  
  // Remove tarball
  if (fs.existsSync(tarballName)) {
    fs.unlinkSync(tarballName);
  }
}

console.log('\n✨ Isolated test completed - no version conflicts!');