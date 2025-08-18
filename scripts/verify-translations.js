const fs = require('fs');
const path = require('path');
const SecurityUtils = require('../utils/security');

// Load all language files
const localesPath = path.join(__dirname, '../ui-locales');
const files = (SecurityUtils.safeReaddirSync(localesPath) || []).filter(
  file => file.endsWith('.json') && file !== 'en.json'
);

// Load English as the base for comparison
const enPath = path.join(localesPath, 'en.json');
const enRaw = SecurityUtils.safeReadFileSync(enPath, 'utf8');
if (!enRaw) {
  console.error(`Base translations not found or unreadable: ${enPath}`);
  process.exit(1);
}
let enContent;
try {
  enContent = JSON.parse(enRaw);
} catch (e) {
  console.error(`Invalid JSON in ${enPath}: ${e.message}`);
  process.exit(1);
}
if (!enContent || typeof enContent !== 'object' || Array.isArray(enContent)) {
  console.error(`Expected an object at the top level of ${enPath}`);
  process.exit(1);
}

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
  const raw = SecurityUtils.safeReadFileSync(filePath, 'utf8');
  let content = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      content = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
      if (Object.keys(content).length === 0) {
        // optional: log only when top-level is not an object
        // console.warn(`Top-level of ${filePath} is not an object; treating as empty.`);
      }
    } catch (e) {
      console.error(`Invalid JSON in ${filePath}: ${e.message}`);
      // keep content as {}
    }
  }
  const filePath = path.join(localesPath, file);
  content = JSON.parse(SecurityUtils.safeReadFileSync(filePath, 'utf8') || '{}');
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
