const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Simple test runner for framework detection
function runTests() {
  const testDir = path.join(__dirname, 'temp-framework-tests');
  const i18ntkPath = path.join(__dirname, '../../main/i18ntk-manage.js');
  let passed = 0;
  let total = 0;

  function cleanup() {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }

  function setup() {
    cleanup();
    fs.mkdirSync(testDir, { recursive: true });
  }

  function test(name, fn) {
    total++;
    try {
      console.log(`Testing: ${name}`);
      fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
    }
  }

  try {
    // Test 1: Basic framework detection
    test('Basic project structure validation', () => {
      setup();
      
      const packageJson = {
        name: 'test-project',
        version: '1.0.0'
      };
      fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify(packageJson));
      
      fs.mkdirSync(path.join(testDir, 'locales'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'locales/en.json'), JSON.stringify({ key: 'value' }));

      const result = execSync(`node "${i18ntkPath}" analyze --source-dir="${testDir}/locales"`, {
        cwd: testDir,
        encoding: 'utf8'
      });

      if (!result.includes('analysis') && !result.includes('complete')) {
        throw new Error('Framework detection failed');
      }
    });

    // Test 2: i18next project detection
    test('i18next project structure', () => {
      setup();
      
      const packageJson = {
        dependencies: { 'i18next': '^21.0.0' }
      };
      fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify(packageJson));
      
      fs.mkdirSync(path.join(testDir, 'locales'), { recursive: true });
      fs.mkdirSync(path.join(testDir, 'locales/en'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'locales/en/translation.json'), JSON.stringify({ key: 'value' }));

      const result = execSync(`node "${i18ntkPath}" analyze --source-dir="${testDir}/locales"`, {
        cwd: testDir,
        encoding: 'utf8'
      });

      if (!result.includes('analysis') && !result.includes('complete')) {
        throw new Error('i18next detection failed');
      }
    });

    // Test 3: Custom pattern detection
    test('Custom pattern recognition', () => {
      setup();
      
      const packageJson = {
        name: 'custom-i18n-project',
        version: '1.0.0'
      };
      fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify(packageJson));
      
      fs.mkdirSync(path.join(testDir, 'translations'), { recursive: true });
      fs.writeFileSync(path.join(testDir, 'translations/en.json'), JSON.stringify({ key: 'value' }));

      const result = execSync(`node "${i18ntkPath}" analyze --source-dir="${testDir}/translations"`, {
        cwd: testDir,
        encoding: 'utf8'
      });

      if (!result.includes('analysis') && !result.includes('complete')) {
        throw new Error('Custom pattern detection failed');
      }
    });

    console.log(`\nFramework Detection Tests: ${passed}/${total} passed`);
    return passed === total;

  } catch (error) {
    console.error('Test execution error:', error.message);
    return false;
  } finally {
    cleanup();
  }
}

// Run tests if called directly
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

module.exports = { runTests };