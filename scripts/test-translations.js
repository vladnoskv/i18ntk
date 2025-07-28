const fs = require('fs');
const path = require('path');

// Load the i18n helper to test the new system
const i18nHelper = require('../utils/i18n-helper');

class TranslationTester {
  constructor() {
    this.missingKeys = [];
    this.loadedTranslations = {};
    this.languages = ['en', 'de', 'fr', 'es', 'ru', 'ja', 'zh', 'pt'];
  }

  async runTests() {
    console.log('🧪 Starting Translation Tests...\n');
    
    // Test 1: Verify all language directories exist
    console.log('📁 Testing language directories...');
    this.testLanguageDirectories();
    
    // Test 2: Test translation loading for each language
    console.log('🌍 Testing translation loading...');
    await this.testTranslationLoading();
    
    // Test 3: Check for missing keys across all languages
    console.log('🔍 Checking for missing translation keys...');
    await this.checkMissingKeys();
    
    // Test 4: Validate JSON syntax
    console.log('✅ Validating JSON syntax...');
    this.validateJsonSyntax();
    
    // Test 5: Test specific scripts that use translations
    console.log('📝 Testing script translations...');
    await this.testScriptTranslations();
    
    this.generateReport();
  }

  testLanguageDirectories() {
    const basePath = path.join(__dirname, '..', 'ui-locales');
    
    this.languages.forEach(lang => {
      const langPath = path.join(basePath, lang);
      if (fs.existsSync(langPath)) {
        const files = fs.readdirSync(langPath).filter(f => f.endsWith('.json'));
        console.log(`  ✓ ${lang}: ${files.length} files`);
      } else {
        console.log(`  ✗ ${lang}: directory missing`);
        this.missingKeys.push(`Directory missing: ${lang}`);
      }
    });
  }

  async testTranslationLoading() {
    for (const lang of this.languages) {
      try {
        // Test loading translations for this language
        const translations = await this.loadTranslationsForLanguage(lang);
        this.loadedTranslations[lang] = translations;
        console.log(`  ✓ ${lang}: loaded successfully`);
      } catch (error) {
        console.log(`  ✗ ${lang}: failed to load - ${error.message}`);
        this.missingKeys.push(`Failed to load: ${lang} - ${error.message}`);
      }
    }
  }

  async loadTranslationsForLanguage(lang) {
    return new Promise((resolve, reject) => {
      const langPath = path.join(__dirname, '..', 'ui-locales', lang);
      
      if (!fs.existsSync(langPath)) {
        reject(new Error(`Language directory not found: ${langPath}`));
        return;
      }
      
      const files = fs.readdirSync(langPath).filter(f => f.endsWith('.json'));
      const translations = {};
      
      files.forEach(file => {
        try {
          const filePath = path.join(langPath, file);
          const content = fs.readFileSync(filePath, 'utf8');
          const parsed = JSON.parse(content);
          const key = file.replace('.json', '');
          translations[key] = parsed;
        } catch (error) {
          reject(new Error(`Error parsing ${file}: ${error.message}`));
        }
      });
      
      resolve(translations);
    });
  }

  async checkMissingKeys() {
    const enTranslations = this.loadedTranslations.en || {};
    const enKeys = this.extractAllKeys(enTranslations);
    
    this.languages.forEach(lang => {
      if (lang === 'en') return;
      
      const langTranslations = this.loadedTranslations[lang] || {};
      const langKeys = this.extractAllKeys(langTranslations);
      
      const missing = enKeys.filter(key => !langKeys.includes(key));
      if (missing.length > 0) {
        console.log(`  ⚠️ ${lang}: missing ${missing.length} keys`);
        missing.forEach(key => {
          this.missingKeys.push(`Missing in ${lang}: ${key}`);
        });
      } else {
        console.log(`  ✓ ${lang}: all keys present`);
      }
    });
  }

  extractAllKeys(obj, prefix = '') {
    const keys = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys.push(...this.extractAllKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    
    return keys;
  }

  validateJsonSyntax() {
    this.languages.forEach(lang => {
      const langPath = path.join(__dirname, '..', 'ui-locales', lang);
      
      if (!fs.existsSync(langPath)) return;
      
      const files = fs.readdirSync(langPath).filter(f => f.endsWith('.json'));
      let validFiles = 0;
      
      files.forEach(file => {
        try {
          const filePath = path.join(langPath, file);
          const content = fs.readFileSync(filePath, 'utf8');
          JSON.parse(content);
          validFiles++;
        } catch (error) {
          console.log(`  ✗ ${lang}/${file}: JSON syntax error - ${error.message}`);
          this.missingKeys.push(`JSON error in ${lang}/${file}: ${error.message}`);
        }
      });
      
      if (validFiles === files.length) {
        console.log(`  ✓ ${lang}: all JSON files valid`);
      }
    });
  }

  async testScriptTranslations() {
    // Test specific scripts that use the new translation system
    const testScripts = [
      '../utils/security.js',
      '../utils/test-console-i18n.js',
      '../utils/validate-language-purity.js',
      '../utils/detect-language-mismatches.js'
    ];
    
    testScripts.forEach(script => {
      try {
        const scriptPath = path.join(__dirname, '..', script);
        if (fs.existsSync(scriptPath)) {
          console.log(`  ✓ ${path.basename(script)}: script exists`);
        } else {
          console.log(`  ✗ ${path.basename(script)}: script not found`);
        }
      } catch (error) {
        console.log(`  ✗ ${path.basename(script)}: error checking - ${error.message}`);
      }
    });
  }

  generateReport() {
    console.log('\n📊 Translation Test Report');
    console.log('='.repeat(50));
    
    if (this.missingKeys.length === 0) {
      console.log('🎉 All tests passed! No missing translation keys found.');
      console.log(`\nLanguages tested: ${this.languages.length}`);
      console.log(`Total translation files: ${this.languages.length * Object.keys(this.loadedTranslations.en || {}).length}`);
    } else {
      console.log(`⚠️ Found ${this.missingKeys.length} issues:`);
      this.missingKeys.forEach(issue => {
        console.log(`  - ${issue}`);
      });
    }
    
    // Create detailed report file
    const reportPath = path.join(__dirname, '..', 'translation-test-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      languages: this.languages,
      issues: this.missingKeys,
      summary: {
        totalLanguages: this.languages.length,
        totalIssues: this.missingKeys.length,
        status: this.missingKeys.length === 0 ? 'PASS' : 'FAIL'
      }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  }
}

// Run the tests
const tester = new TranslationTester();
tester.runTests().catch(console.error);