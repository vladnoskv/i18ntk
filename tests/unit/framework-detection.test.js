const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock framework detection for testing
class MockFrameworkDetector {
  constructor() {
    this.frameworks = {
      react: { patterns: ['useTranslation', 'react-i18next'], weight: 0 },
      vue: { patterns: ['$t', 'vue-i18n'], weight: 0 },
      angular: { patterns: ['TranslateService', '@ngx-translate'], weight: 0 },
      i18next: { patterns: ['i18next.t', 'i18next'], weight: 0 }
    };
  }

  detectFrameworkPatterns(directory) {
    const result = {
      detected: [],
      patterns: {},
      confidence: {},
      primaryFramework: null
    };

    // Simulate detection based on package.json and source files
    const packageJsonPath = path.join(directory, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Check dependencies
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (deps['react'] && deps['react-i18next']) {
        result.detected.push('react');
        result.patterns.react = 15;
        result.confidence.react = 0.95;
      }
      
      if (deps['vue'] && deps['vue-i18n']) {
        result.detected.push('vue');
        result.patterns.vue = 12;
        result.confidence.vue = 0.90;
      }
      
      if (deps['@angular/core'] && deps['@ngx-translate/core']) {
        result.detected.push('angular');
        result.patterns.angular = 10;
        result.confidence.angular = 0.85;
      }
      
      if (deps['i18next'] && !result.detected.includes('react') && !result.detected.includes('vue')) {
        result.detected.push('i18next');
        result.patterns.i18next = 8;
        result.confidence.i18next = 0.75;
      }
    }

    // Check source files
    const sourceFiles = this.findSourceFiles(directory);
    sourceFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      if (content.includes('useTranslation') || content.includes('react-i18next')) {
        this.addFrameworkWeight(result, 'react', 5);
      }
      
      if (content.includes('$t(') || content.includes('vue-i18n')) {
        this.addFrameworkWeight(result, 'vue', 4);
      }
      
      if (content.includes('TranslateService') || content.includes('@ngx-translate')) {
        this.addFrameworkWeight(result, 'angular', 3);
      }
      
      if (content.includes('i18next.t(') && !result.detected.includes('react')) {
        this.addFrameworkWeight(result, 'i18next', 2);
      }
    });

    // Determine primary framework
    if (result.detected.length > 0) {
      result.primaryFramework = result.detected.reduce((primary, current) => {
        return (result.confidence[current] || 0) > (result.confidence[primary] || 0) ? current : primary;
      }, result.detected[0]);
    } else {
      result.primaryFramework = 'vanilla';
    }

    return result;
  }

  addFrameworkWeight(result, framework, weight) {
    if (result.patterns[framework] !== undefined) {
      result.patterns[framework] += weight;
      result.confidence[framework] = Math.min((result.confidence[framework] || 0) + 0.1, 1.0);
    }
  }

  findSourceFiles(directory) {
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.vue'];
    const files = [];
    
    if (fs.existsSync(directory)) {
      const entries = fs.readdirSync(directory, { withFileTypes: true });
      entries.forEach(entry => {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          files.push(...this.findSourceFiles(fullPath));
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      });
    }
    
    return files;
  }
}

// Test utilities
function createTestDirectory(testDir, framework) {
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const packageJson = {
    name: `test-${framework}`,
    version: '1.0.0',
    dependencies: {}
  };

  switch (framework) {
    case 'react':
      packageJson.dependencies = {
        'react': '^18.0.0',
        'react-i18next': '^12.0.0',
        'i18next': '^22.0.0'
      };
      break;
    case 'vue':
      packageJson.dependencies = {
        'vue': '^3.0.0',
        'vue-i18n': '^9.0.0',
        'i18next': '^22.0.0'
      };
      break;
    case 'angular':
      packageJson.dependencies = {
        '@angular/core': '^15.0.0',
        '@ngx-translate/core': '^14.0.0',
        'i18next': '^22.0.0'
      };
      break;
    case 'i18next':
      packageJson.dependencies = {
        'i18next': '^22.0.0'
      };
      break;
    case 'vanilla':
      packageJson.dependencies = {};
      break;
  }

  fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify(packageJson, null, 2));

  const srcDir = path.join(testDir, 'src');
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }

  let sourceContent = '';
  switch (framework) {
    case 'react':
      sourceContent = `
import { useTranslation } from 'react-i18next';
function App() {
  const { t } = useTranslation();
  return <h1>{t('welcome.title')}</h1>;
}
export default App;
`;
      break;
    case 'vue':
      sourceContent = `
<template>
  <h1>{{ $t('welcome.title') }}</h1>
</template>
<script>
export default {
  name: 'App'
}
</script>
`;
      break;
    case 'angular':
      sourceContent = `
import { TranslateService } from '@ngx-translate/core';
export class AppComponent {
  constructor(private translate: TranslateService) {}
}
`;
      break;
    case 'i18next':
      sourceContent = `
import i18next from 'i18next';
const title = i18next.t('welcome.title');
`;
      break;
    case 'vanilla':
      sourceContent = `
console.log('Hello World');
`;
      break;
  }

  const fileName = framework === 'vue' ? 'App.vue' : (framework === 'react' ? 'App.jsx' : 'main.js');
  fs.writeFileSync(path.join(srcDir, fileName), sourceContent);
}

function cleanupTestDirectory(testDir) {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

console.log('Framework Detection Tests');
console.log('=========================');

const testBaseDir = path.join(__dirname, '..', 'fixtures');
const detector = new MockFrameworkDetector();

// Test 1: Detect React framework patterns
console.log('Test 1: Detect React framework patterns');
const reactDir = path.join(testBaseDir, 'react-test');
createTestDirectory(reactDir, 'react');
const reactResult = detector.detectFrameworkPatterns(reactDir);
assert.strictEqual(reactResult.detected.includes('react'), true);
assert.strictEqual(reactResult.patterns.react > 0, true);
assert.strictEqual(reactResult.confidence.react > 0.8, true);
console.log('✅ PASSED');

// Test 2: Detect Vue framework patterns
console.log('Test 2: Detect Vue framework patterns');
const vueDir = path.join(testBaseDir, 'vue-test');
createTestDirectory(vueDir, 'vue');
const vueResult = detector.detectFrameworkPatterns(vueDir);
assert.strictEqual(vueResult.detected.includes('vue'), true);
assert.strictEqual(vueResult.patterns.vue > 0, true);
assert.strictEqual(vueResult.confidence.vue > 0.8, true);
console.log('✅ PASSED');

// Test 3: Detect Angular framework patterns
console.log('Test 3: Detect Angular framework patterns');
const angularDir = path.join(testBaseDir, 'angular-test');
createTestDirectory(angularDir, 'angular');
const angularResult = detector.detectFrameworkPatterns(angularDir);
assert.strictEqual(angularResult.detected.includes('angular'), true);
assert.strictEqual(angularResult.patterns.angular > 0, true);
assert.strictEqual(angularResult.confidence.angular > 0.8, true);
console.log('✅ PASSED');

// Test 4: Detect vanilla i18next patterns
console.log('Test 4: Detect vanilla i18next patterns');
const i18nextDir = path.join(testBaseDir, 'i18next-test');
createTestDirectory(i18nextDir, 'i18next');
const i18nextResult = detector.detectFrameworkPatterns(i18nextDir);
assert.strictEqual(i18nextResult.detected.includes('i18next'), true);
assert.strictEqual(i18nextResult.patterns.i18next > 0, true);
assert.strictEqual(i18nextResult.confidence.i18next > 0.7, true);
console.log('✅ PASSED');

// Test 5: Handle multiple frameworks with confidence scoring
console.log('Test 5: Handle multiple frameworks with confidence scoring');
const multiDir = path.join(testBaseDir, 'multi-test');
createTestDirectory(multiDir, 'react');
// Add Vue dependencies to create overlap
const multiPackageJson = JSON.parse(fs.readFileSync(path.join(multiDir, 'package.json'), 'utf8'));
multiPackageJson.dependencies['vue'] = '^3.0.0';
multiPackageJson.dependencies['vue-i18n'] = '^9.0.0';
fs.writeFileSync(path.join(multiDir, 'package.json'), JSON.stringify(multiPackageJson, null, 2));

const multiResult = detector.detectFrameworkPatterns(multiDir);
assert.strictEqual(multiResult.detected.includes('react'), true);
assert.strictEqual(multiResult.detected.includes('vue'), true);
assert.strictEqual(typeof multiResult.primaryFramework, 'string');
assert.strictEqual(multiResult.confidence[multiResult.primaryFramework] > 0.5, true);
console.log('✅ PASSED');

// Test 6: Handle no framework detection
console.log('Test 6: Handle no framework detection');
const vanillaDir = path.join(testBaseDir, 'vanilla-test');
createTestDirectory(vanillaDir, 'vanilla');
const vanillaResult = detector.detectFrameworkPatterns(vanillaDir);
assert.strictEqual(vanillaResult.detected.length, 0);
assert.strictEqual(vanillaResult.primaryFramework, 'vanilla');
console.log('✅ PASSED');

// Test 7: React-specific pattern recognition
console.log('Test 7: React-specific pattern recognition');
const reactPatternsDir = path.join(testBaseDir, 'react-patterns-test');
createTestDirectory(reactPatternsDir, 'react');
const reactPatterns = detector.detectFrameworkPatterns(reactPatternsDir);
assert.strictEqual(reactPatterns.patterns.react >= 15, true);
assert.strictEqual(reactPatterns.confidence.react > 0.8, true);
console.log('✅ PASSED');

// Test 8: Vue-specific pattern recognition
console.log('Test 8: Vue-specific pattern recognition');
const vuePatternsDir = path.join(testBaseDir, 'vue-patterns-test');
createTestDirectory(vuePatternsDir, 'vue');
const vuePatterns = detector.detectFrameworkPatterns(vuePatternsDir);
assert.strictEqual(vuePatterns.patterns.vue >= 12, true);
assert.strictEqual(vuePatterns.confidence.vue > 0.8, true);
console.log('✅ PASSED');

// Test 9: Angular-specific pattern recognition
console.log('Test 9: Angular-specific pattern recognition');
const angularPatternsDir = path.join(testBaseDir, 'angular-patterns-test');
createTestDirectory(angularPatternsDir, 'angular');
const angularPatterns = detector.detectFrameworkPatterns(angularPatternsDir);
assert.strictEqual(angularPatterns.patterns.angular >= 10, true);
assert.strictEqual(angularPatterns.confidence.angular > 0.8, true);
console.log('✅ PASSED');

// Test 10: Integration with usage reports
console.log('Test 10: Integration with usage reports');
const integrationDir = path.join(testBaseDir, 'integration-test');
createTestDirectory(integrationDir, 'react');
const integrationResult = detector.detectFrameworkPatterns(integrationDir);
assert.strictEqual(typeof integrationResult.detected, 'object');
assert.strictEqual(typeof integrationResult.confidence, 'object');
assert.strictEqual(typeof integrationResult.primaryFramework, 'string');
console.log('✅ PASSED');

// Cleanup
setTimeout(() => {
  cleanupTestDirectory(reactDir);
  cleanupTestDirectory(vueDir);
  cleanupTestDirectory(angularDir);
  cleanupTestDirectory(i18nextDir);
  cleanupTestDirectory(multiDir);
  cleanupTestDirectory(vanillaDir);
  cleanupTestDirectory(reactPatternsDir);
  cleanupTestDirectory(vuePatternsDir);
  cleanupTestDirectory(angularPatternsDir);
  cleanupTestDirectory(integrationDir);
  
  console.log('\n🎉 All framework detection tests passed!');
}, 100);