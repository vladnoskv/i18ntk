#!/usr/bin/env node

/**
 * Fix Missing Translation Keys - v1.6.1
 * 
 * This script identifies and adds missing translation keys to all non-English
 * language files to achieve 100% translation key coverage.
 * 
 * Usage: node scripts/fix-missing-translation-keys.js
 */

const fs = require('fs');
const path = require('path');

const UI_LOCALES_DIR = path.join(__dirname, '..', 'ui-locales');
const ENGLISH_FILE = path.join(UI_LOCALES_DIR, 'en.json');

// Language configurations with their names
const LANGUAGES = {
  'de': 'German',
  'es': 'Spanish', 
  'fr': 'French',
  'ja': 'Japanese',
  'ru': 'Russian',
  'zh': 'Chinese'
};

/**
 * Recursively get all keys from an object with dot notation
 */
function getAllKeys(obj, prefix = '') {
  const keys = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * Get value from nested object using dot notation
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Set value in nested object using dot notation
 */
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  
  let current = obj;
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[lastKey] = value;
}

/**
 * Load and parse JSON file
 */
function loadJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error loading ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Save JSON file with proper formatting
 */
function saveJsonFile(filePath, data) {
  try {
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`❌ Error saving ${filePath}: ${error.message}`);
    return false;
  }
}

/**
 * Generate placeholder translation for missing keys
 */
function generatePlaceholderTranslation(englishValue, language) {
  // For simple strings, add a language prefix to indicate it needs translation
  if (typeof englishValue === 'string') {
    // Don't translate emoji-only strings or very short technical strings
    if (/^[\u{1F300}-\u{1F9FF}\s]*$/u.test(englishValue) || englishValue.length <= 3) {
      return englishValue;
    }
    
    // Add language indicator for strings that need translation
    return `[${language.toUpperCase()}] ${englishValue}`;
  }
  
  return englishValue;
}

/**
 * Main function to fix missing translation keys
 */
async function fixMissingTranslationKeys() {
  console.log('🔧 I18N Translation Key Fixer - v1.6.1');
  console.log('========================================\n');
  
  // Load English reference file
  console.log('📖 Loading English reference file...');
  const englishData = loadJsonFile(ENGLISH_FILE);
  if (!englishData) {
    console.error('❌ Failed to load English reference file');
    process.exit(1);
  }
  
  const englishKeys = getAllKeys(englishData);
  console.log(`✅ Found ${englishKeys.length} keys in English file\n`);
  
  let totalKeysAdded = 0;
  const results = {};
  
  // Process each language
  for (const [langCode, langName] of Object.entries(LANGUAGES)) {
    console.log(`🔄 Processing ${langName} (${langCode})...`);
    
    const langFile = path.join(UI_LOCALES_DIR, `${langCode}.json`);
    const langData = loadJsonFile(langFile);
    
    if (!langData) {
      console.log(`⚠️  Skipping ${langName} - file not found or invalid`);
      continue;
    }
    
    const langKeys = getAllKeys(langData);
    const missingKeys = englishKeys.filter(key => !langKeys.includes(key));
    
    console.log(`   📊 Current keys: ${langKeys.length}`);
    console.log(`   ⚠️  Missing keys: ${missingKeys.length}`);
    
    if (missingKeys.length === 0) {
      console.log(`   ✅ No missing keys found\n`);
      results[langCode] = { added: 0, total: langKeys.length };
      continue;
    }
    
    // Add missing keys
    let addedCount = 0;
    for (const missingKey of missingKeys) {
      const englishValue = getNestedValue(englishData, missingKey);
      const translatedValue = generatePlaceholderTranslation(englishValue, langCode);
      
      setNestedValue(langData, missingKey, translatedValue);
      addedCount++;
    }
    
    // Save updated file
    if (saveJsonFile(langFile, langData)) {
      console.log(`   ✅ Added ${addedCount} keys to ${langName}`);
      console.log(`   💾 Updated ${langFile}\n`);
      
      totalKeysAdded += addedCount;
      results[langCode] = { added: addedCount, total: langKeys.length + addedCount };
    } else {
      console.log(`   ❌ Failed to save ${langName} file\n`);
    }
  }
  
  // Summary report
  console.log('📊 SUMMARY REPORT');
  console.log('==================');
  console.log(`📖 English reference keys: ${englishKeys.length}`);
  console.log(`➕ Total keys added: ${totalKeysAdded}`);
  console.log(`🌐 Languages processed: ${Object.keys(results).length}\n`);
  
  console.log('📋 Language Details:');
  for (const [langCode, result] of Object.entries(results)) {
    const langName = LANGUAGES[langCode];
    const percentage = ((result.total / englishKeys.length) * 100).toFixed(1);
    console.log(`   ${langName} (${langCode}): ${result.total}/${englishKeys.length} keys (${percentage}%) - Added: ${result.added}`);
  }
  
  console.log('\n🎉 Translation key fixing completed!');
  console.log('\n📋 Next Steps:');
  console.log('1. Review the added placeholder translations');
  console.log('2. Replace [LANG] prefixed strings with proper translations');
  console.log('3. Run npm test to verify translation consistency');
  console.log('4. Update version to 1.6.1 when translations are complete');
}

// Run the script
if (require.main === module) {
  fixMissingTranslationKeys().catch(error => {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = { fixMissingTranslationKeys };