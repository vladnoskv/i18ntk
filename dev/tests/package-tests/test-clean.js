#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 Starting isolated package test (no version conflicts)...');

// Generate unique test directory
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const TEST_DIR = `test-clean-${timestamp}`;

console.log(`📁 Creating test directory: ${TEST_DIR}`);
fs.mkdirSync(TEST_DIR);

const originalDir = process.cwd();
// Hoist tarball variable so it's accessible in finally
let tarball;

try {
  // Create package tarball
  console.log('📦 Creating package...');
  tarball = execSync('npm pack', { encoding: 'utf8' }).trim();
  console.log(`✅ Created: ${tarball}`);
  
  // Move to test directory
  process.chdir(TEST_DIR);
  
  // Setup test project
  console.log('🚀 Setting up test environment...');
  execSync('npm init -y', { stdio: 'inherit' });
  
  // Install package (isolated - no conflicts)
  console.log('📥 Installing package...');
  execSync(`npm install ../${tarball}`, { stdio: 'inherit' });
  
  // Test basic functionality
  console.log('✅ Package installed successfully!');
  console.log('🔍 Testing CLI...');
  
  const helpOutput = execSync('npx i18ntk --help', { encoding: 'utf8' });
  console.log('✅ CLI working correctly');
  
  console.log('✨ Test completed successfully!');
  console.log(`📁 Test directory: ${TEST_DIR}`);
  console.log('🧹 To clean up: rm -rf ' + TEST_DIR);
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
} finally {
  // Cleanup
  process.chdir(originalDir);
  if (tarball && fs.existsSync(tarball)) {
    fs.unlinkSync(tarball);
  }
}

console.log('\n🎯 Isolated test completed - no version overlap!');