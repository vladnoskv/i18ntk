const fs = require('fs');
const path = require('path');

const languages = ['de', 'en', 'es', 'fr', 'ja', 'pt', 'ru', 'zh'];
const expectedFiles = [
  'admin-cli.json',
  'analyze.json',
  'autorun.json',
  'common.json',
  'debug.json',
  'errors.json',
  'help.json',
  'init.json',
  'menu.json',
  'sizing.json',
  'status.json',
  'summary.json',
  'ui.json',
  'usage.json'
];

console.log('🌍 Translation Validation Report');
console.log('='.repeat(50));

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

languages.forEach(lang => {
  console.log(`\n📂 Language: ${lang.toUpperCase()}`);
  console.log('-'.repeat(30));
  
  const langDir = path.join('ui-locales', lang);
  
  if (!fs.existsSync(langDir)) {
    console.log(`❌ Directory missing: ${langDir}`);
    failedChecks += expectedFiles.length;
    return;
  }
  
  expectedFiles.forEach(file => {
    totalChecks++;
    const filePath = path.join(langDir, file);
    
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        JSON.parse(content);
        console.log(`✅ ${file}`);
        passedChecks++;
      } catch (error) {
        console.log(`❌ ${file} - Invalid JSON: ${error.message}`);
        failedChecks++;
      }
    } else {
      console.log(`❌ ${file} - Missing`);
      failedChecks++;
    }
  });
});

console.log('\n' + '='.repeat(50));
console.log('📊 FINAL RESULTS');
console.log('='.repeat(50));
console.log(`Total files checked: ${totalChecks}`);
console.log(`✅ Passed: ${passedChecks}`);
console.log(`❌ Failed: ${failedChecks}`);
console.log(`📈 Success rate: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);

if (failedChecks === 0) {
  console.log('\n🎉 All translation files are valid and complete!');
} else {
  console.log('\n⚠️  Some issues found - please review the details above.');
}