const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const I18nFixer = require('../main/i18ntk-fixer.js');

async function testEnhancedFixer() {
  // Create temporary directory for test
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-test-'));
  const locales = path.join(tmp, 'locales');
  
  fs.mkdirSync(path.join(locales, 'en'), { recursive: true });
  fs.mkdirSync(path.join(locales, 'fr'), { recursive: true });

  // Create source files
  fs.writeFileSync(path.join(locales, 'en', 'common.json'), JSON.stringify({
    admin: 'Admin',
    prev: 'Previous',
    page: 'Page',
    next: 'Next',
    missing: 'Missing'
  }, null, 2));

  fs.writeFileSync(path.join(locales, 'fr', 'common.json'), JSON.stringify({
    admin: 'Administrateur',
    prev: '__NOT_TRANSLATED__',
    page: '[FR] Old',
    next: '__NOT_TRANSLATED__'
  }, null, 2));

  console.log('Test setup complete. Files:');
  console.log('EN:', fs.readFileSync(path.join(locales, 'en', 'common.json'), 'utf8'));
  console.log('FR:', fs.readFileSync(path.join(locales, 'fr', 'common.json'), 'utf8'));

  // Create fixer instance and configure directly
  const fixer = new I18nFixer();
  
  // Configure the fixer with proper absolute paths
  await fixer.initialize();
  fixer.sourceDir = locales;
  fixer.sourceLanguageDir = path.join(locales, 'en');
  fixer.languages = ['fr'];
  fixer.markers = ['__NOT_TRANSLATED__', '[FR]'];
  fixer.config = {
    ...fixer.config,
    sourceLanguage: 'en',
    noBackup: true,
    languages: ['fr']
  };

  // Test scanning functionality
  console.log('\n🔍 Testing scanning functionality...');
  const issues = fixer.scanForIssues('fr');
  console.log(`Found ${issues.length} issues:`);
  issues.forEach(issue => {
    console.log(`- ${issue.type}: ${issue.path} = "${issue.targetValue}" → "${issue.newValue}"`);
  });

  // Apply fixes directly without calling run() which would re-initialize
  console.log('\n🚀 Applying fixes directly...');
  fixer.languages.forEach(lang => fixer.processLanguage(lang));
  console.log('✅ Fixes applied successfully!');

  console.log('After fix:');
  console.log('FR:', fs.readFileSync(path.join(locales, 'fr', 'common.json'), 'utf8'));

  // Verify the fixes
  const frContent = JSON.parse(fs.readFileSync(path.join(locales, 'fr', 'common.json'), 'utf8'));
  
  assert.strictEqual(frContent.prev, '[FR] Previous', 'prev should be fixed');
  assert.strictEqual(frContent.page, '[FR] Page', 'page should be fixed');
  assert.strictEqual(frContent.next, '[FR] Next', 'next should be fixed');
  
  console.log('✅ All assertions passed!');

  // Test backup functionality
  console.log('\n📁 Testing backup functionality...');
  fixer.config.noBackup = false;
  await fixer.run();
  
  // Clean up
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('🧹 Test completed successfully!');
}

if (require.main === module) {
  testEnhancedFixer().catch(console.error);
}

module.exports = testEnhancedFixer;