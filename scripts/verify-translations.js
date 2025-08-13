const fs = require('fs');
const path = require('path');

// Load all language files
const localesPath = path.join(__dirname, '../ui-locales');
const files = fs.readdirSync(localesPath).filter(file => file.endsWith('.json') && file !== 'en.json');

// Load English as the base for comparison
const enContent = JSON.parse(fs.readFileSync(path.join(localesPath, 'en.json'), 'utf8'));

// Function to get all keys from an object
function getAllKeys(obj, prefix = '') {
  return Object.entries(obj).reduce((keys, [key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return [...keys, ...getAllKeys(value, fullKey)];
    }
    return [...keys, fullKey];
  }, []);
}

// Get all keys from English file
const enKeys = new Set(getAllKeys(enContent));

// Check each language file
console.log('\n🔍 Verifying translation keys across all language files...\n');

files.forEach(file => {
  const langCode = path.basename(file, '.json');
  const filePath = path.join(localesPath, file);
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const langKeys = new Set(getAllKeys(content));
  
  // Find missing keys
  const missingKeys = [...enKeys].filter(key => !langKeys.has(key));
  
  // Find extra keys (not in English)
  const extraKeys = [...langKeys].filter(key => !enKeys.has(key));
  
  console.log(`🌐 ${file}:`);
  console.log(`   Total keys: ${langKeys.size}/${enKeys.size} (${Math.round((langKeys.size / enKeys.size) * 100)}%)`);
  
  if (missingKeys.length > 0) {
    console.log(`   ❌ Missing ${missingKeys.length} keys:`);
    missingKeys.slice(0, 5).forEach(key => console.log(`      - ${key}`));
    if (missingKeys.length > 5) console.log(`      ...and ${missingKeys.length - 5} more`);
  }
  
  if (extraKeys.length > 0) {
    console.log(`   ⚠️  Found ${extraKeys.length} extra keys (not in English):`);
    extraKeys.slice(0, 3).forEach(key => console.log(`      - ${key}`));
    if (extraKeys.length > 3) console.log(`      ...and ${extraKeys.length - 3} more`);
  }
  
  if (missingKeys.length === 0 && extraKeys.length === 0) {
    console.log('   ✅ All keys match the English version!');
  }
  
  console.log('');
});

console.log('✅ Verification complete!');
