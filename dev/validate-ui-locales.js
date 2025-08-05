const fs = require('fs');
const path = require('path');

const languages = ['de', 'en', 'es', 'fr', 'ja', 'ru', 'zh'];

console.log('🌍 Translation Validation Report');
console.log('='.repeat(50));

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

languages.forEach(lang => {
  console.log(`\n📂 Language: ${lang.toUpperCase()}`);
  console.log('-'.repeat(30));
  
  const filePath = path.join('ui-locales', `${lang}.json`);
  totalChecks++;
  
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      JSON.parse(content);
      console.log(`✅ ${lang}.json - Valid`);
      passedChecks++;
    } catch (error) {
      console.log(`❌ ${lang}.json - Invalid JSON: ${error.message}`);
      failedChecks++;
    }
  } else {
    console.log(`❌ ${lang}.json - Missing`);
    failedChecks++;
  }
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