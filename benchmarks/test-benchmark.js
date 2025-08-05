#!/usr/bin/env node

/**
 * Quick Test Script for Benchmark Framework
 * Verifies the benchmark setup is working correctly
 */

const fs = require('fs');
const path = require('path');

async function runQuickTest() {
  console.log('🧪 Running benchmark framework test...\n');
  
  try {
    // Test 1: Check if benchmark runner exists
    const runnerPath = path.join(__dirname, 'run-benchmarks.js');
    if (!fs.existsSync(runnerPath)) {
      throw new Error('Benchmark runner not found');
    }
    console.log('✅ Benchmark runner found');
    
    // Test 2: Check if baseline exists
    const baselinePath = path.join(__dirname, 'baseline.json');
    if (!fs.existsSync(baselinePath)) {
      console.log('⚠️  Baseline file not found (will be created on first run)');
    } else {
      console.log('✅ Baseline file found');
    }
    
    // Test 3: Check if required modules exist
    const analyzePath = path.join(__dirname, '..', 'main', 'i18ntk-analyze.js');
    const configPath = path.join(__dirname, '..', 'utils', 'security-config.js');
    
    if (!fs.existsSync(analyzePath)) {
      throw new Error('i18ntk-analyze.js not found');
    }
    console.log('✅ i18ntk-analyze.js found');
    
    if (!fs.existsSync(configPath)) {
      throw new Error('security-config.js not found');
    }
    console.log('✅ security-config.js found');
    
    // Test 4: Test module loading
    try {
      const { analyzeTranslations } = require('../main/i18ntk-analyze.js');
      const { validateConfiguration } = require('../utils/security-config.js');
      console.log('✅ Required functions can be imported');
      
      // Test 5: Create a small test dataset
      const testDataset = {
        en: {
          'test.key.1': 'Hello World',
          'test.key.2': 'Welcome',
          'test.key.3': 'Goodbye'
        },
        es: {
          'test.key.1': 'Hola Mundo',
          'test.key.2': 'Bienvenido'
        },
        de: {
          'test.key.1': 'Hallo Welt',
          'test.key.2': 'Willkommen',
          'test.key.3': 'Auf Wiedersehen'
        }
      };
      
      const tempDir = path.join(__dirname, 'temp-datasets');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const testPath = path.join(tempDir, 'test-dataset.json');
      fs.writeFileSync(testPath, JSON.stringify(testDataset, null, 2));
      
      // Test 6: Test analyzeTranslations function
      console.log('🔄 Testing analyzeTranslations...');
      const result = await analyzeTranslations(testPath);
      console.log(`✅ analyzeTranslations returned: ${result.totalKeys} keys, ${result.languages} languages`);
      
      // Test 7: Test validateConfiguration function
      console.log('🔄 Testing validateConfiguration...');
      const config = {
        languages: ['en', 'es', 'de'],
        sourceDir: './src',
        adminPin: '1234'
      };
      const validation = await validateConfiguration(config);
      console.log(`✅ validateConfiguration returned: ${validation.valid ? 'valid' : 'invalid'}, took ${validation.validationTime}ms`);
      
      // Cleanup
      fs.unlinkSync(testPath);
      
    } catch (error) {
      console.error('❌ Module loading failed:', error.message);
      throw error;
    }
    
    console.log('\n🎉 All tests passed! Benchmark framework is ready to use.');
    console.log('\n📋 Next steps:');
    console.log('  npm run benchmark          # Run full benchmark suite');
    console.log('  npm run benchmark:baseline # Create new baseline');
    console.log('  npm run benchmark:ci       # Run in CI mode');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  runQuickTest();
}