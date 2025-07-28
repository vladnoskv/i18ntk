const fs = require('fs');
const path = require('path');

const enDir = path.join(__dirname, '..', 'ui-locales', 'en');
const targetLanguages = ['de', 'fr', 'es', 'ru', 'ja', 'zh', 'pt'];

// Create directories for all languages if they don't exist
targetLanguages.forEach(lang => {
  const langDir = path.join(__dirname, '..', 'ui-locales', lang);
  if (!fs.existsSync(langDir)) {
    fs.mkdirSync(langDir, { recursive: true });
    console.log(`Created directory: ${langDir}`);
  }
});

// Export all English files to other languages
const enFiles = fs.readdirSync(enDir).filter(f => f.endsWith('.json'));
console.log(`Found ${enFiles.length} English translation files:`);
enFiles.forEach(file => {
  console.log(`  - ${file}`);
});

// Create template files for each language
targetLanguages.forEach(lang => {
  enFiles.forEach(file => {
    const sourcePath = path.join(enDir, file);
    const targetPath = path.join(__dirname, '..', 'ui-locales', lang, file);
    
    if (!fs.existsSync(targetPath)) {
      const sourceContent = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
      const templateContent = createTemplateFromEnglish(sourceContent);
      fs.writeFileSync(targetPath, JSON.stringify(templateContent, null, 2));
      console.log(`Created template: ${lang}/${file}`);
    } else {
      console.log(`Skipped existing: ${lang}/${file}`);
    }
  });
});

function createTemplateFromEnglish(obj) {
  if (typeof obj === 'string') {
    return '⚠️ TRANSLATION NEEDED ⚠️';
  } else if (typeof obj === 'object' && obj !== null) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = createTemplateFromEnglish(value);
    }
    return result;
  }
  return obj;
}

console.log('Export completed successfully!');
console.log(`\nSummary:`);
console.log(`- Languages: ${targetLanguages.length}`);
console.log(`- Files per language: ${enFiles.length}`);
console.log(`- Total files created: ${targetLanguages.length * enFiles.length}`);