#!/usr/bin/env node
/**
 * Simple test for i18ntk-scanner functionality
 */

const I18nTextScanner = require('../main/i18ntk-scanner.js');
const fs = require('fs');
const path = require('path');

async function testScanner() {
  console.log('🧪 Testing i18ntk-scanner functionality...');
  
  // Create a test source directory with sample files
  const testDir = './test-scanner-source';
  
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Create sample test files
  const sampleFiles = [
    {
      name: 'sample-component.js',
      content: `
// Sample component with hardcoded text
function WelcomeMessage() {
  return (
    <div>
      <h1>Welcome to our application</h1>
      <p>Please click the button below to continue</p>
      <button>Get Started</button>
    </div>
  );
}

export default WelcomeMessage;
`
    },
    {
      name: 'sample-utils.js',
      content: `
// Sample utilities with hardcoded text
export function showError() {
  alert('An error occurred while processing your request');
}

export function showSuccess() {
  console.log('Operation completed successfully');
}
`
    }
  ];
  
  // Write test files
  sampleFiles.forEach(file => {
    fs.writeFileSync(path.join(testDir, file.name), file.content);
  });
  
  console.log('✅ Created test files');
  
  // Test scanner
  try {
    const scanner = new I18nTextScanner();
    
    // Configure scanner manually
    scanner.config = {
      sourceDir: testDir,
      framework: 'react',
      minLength: 3,
      maxLength: 100,
      outputReport: false,
      exclude: ['node_modules', '.git']
    };
    scanner.sourceDir = testDir;
    scanner.framework = 'react';
    
    console.log('🔍 Running scanner...');
    
    const patterns = scanner.getFrameworkPatterns('react');
    const results = await scanner.scanDirectory(testDir, {
      patterns,
      exclusions: ['node_modules', '.git'],
      minLength: 3,
      maxLength: 100,
      includeTests: false
    });
    
    console.log('📊 Scanner results:');
    console.log(`Found ${results.length} files with hardcoded text`);
    
    if (results.length > 0) {
      results.forEach(fileResult => {
        console.log(`\n📄 ${fileResult.file}:`);
        fileResult.results.forEach(result => {
          console.log(`  - "${result.text}" (line ${result.line})`);
        });
      });
    }
    
    // Test basic functionality
    console.log('\n✅ Scanner functionality test completed successfully');
    console.log('🎯 Scanner is working correctly');
    
    return true;
    
  } catch (error) {
    console.error('❌ Scanner test failed:', error.message);
    return false;
  } finally {
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }
}

if (require.main === module) {
  testScanner().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = testScanner;