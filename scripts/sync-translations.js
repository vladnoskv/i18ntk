#!/usr/bin/env node

/**
 * Translation Sync Script
 * 
 * This script completely replaces all foreign language UI translation files with English content,
 * except for Chinese (zh) which is already fully translated.
 * This shows engineers exactly what needs to be translated without any prefixes.
 * 
 * Usage: node scripts/sync-translations.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const UI_LOCALES_DIR = path.join(__dirname, '..', 'resources', 'i18n', 'ui-locales');
const ENGLISH_DIR = path.join(UI_LOCALES_DIR, 'en');
const TARGET_LANGUAGES = ['de', 'es', 'fr', 'ru', 'ja']; // Exclude Chinese (zh) as it's fully translated

/**
 * Get all JSON files in the English directory
 */
function getEnglishFiles() {
  try {
    const files = fs.readdirSync(ENGLISH_DIR);
    return files.filter(file => file.endsWith('.json'));
  } catch (error) {
    console.error('Error reading English directory:', error.message);
    return [];
  }
}

/**
 * Read and parse JSON file
 */
function readJsonFile(filePath) {
  try {
    const content = SecurityUtils.safeWriteFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading JSON file ${filePath}:`, error.message);
    return {};
  }
}

/**
 * Write JSON file with proper formatting
 */
function writeJsonFile(filePath, data) {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    SecurityUtils.safeWriteFileSync(filePath, jsonString + '\n');
    return true;
  } catch (error) {
    console.error(`Error writing JSON file ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Copy English content directly to target language
 */
function copyEnglishContent(source) {
  return JSON.parse(JSON.stringify(source)); // Deep copy of English content
}

/**
 * Sync translations for a specific language - completely replace with English
 */
function syncLanguage(language) {
  console.log(`🔄 Syncing translations for ${language}...`);
  
  const languageDir = path.join(UI_LOCALES_DIR, language);
  
  // Ensure language directory exists
  if (!SecurityUtils.safeExistsSync(languageDir)) {
    fs.mkdirSync(languageDir, { recursive: true });
  }
  
  const englishFiles = getEnglishFiles();
  let syncedFiles = 0;
  
  for (const file of englishFiles) {
    const englishFilePath = path.join(ENGLISH_DIR, file);
    const targetFilePath = path.join(languageDir, file);
    
    const englishData = readJsonFile(englishFilePath);
    
    // Directly copy English content (no merging, no prefixes)
    const newData = copyEnglishContent(englishData);
    
    // Write updated file (completely replaces existing content)
    if (writeJsonFile(targetFilePath, newData)) {
      syncedFiles++;
      console.log(`  ✅ ${file}: Replaced with English content`);
    }
  }
  
  console.log(`✅ ${language}: Synced ${syncedFiles} files with English content`);
  return { language, syncedFiles };
}

/**
 * Main sync function
 */
function syncAllTranslations() {
  console.log('🌍 Starting translation synchronization...');
  console.log(`📁 Source: ${ENGLISH_DIR}`);
  console.log(`🎯 Target languages: ${TARGET_LANGUAGES.join(', ')}`);
  console.log(`ℹ️  Chinese (zh) skipped - already fully translated`);
  console.log('');
  
  const englishFiles = getEnglishFiles();
  if (englishFiles.length === 0) {
    console.error('❌ No English translation files found!');
    process.exit(1);
  }
  
  console.log(`📋 Found ${englishFiles.length} English files to sync:`);
  englishFiles.forEach(file => console.log(`  📄 ${file}`));
  console.log('');
  
  const results = [];
  for (const language of TARGET_LANGUAGES) {
    const result = syncLanguage(language);
    results.push(result);
  }
  
  console.log('');
  console.log('🎉 Translation synchronization completed!');
  console.log('');
  console.log('📊 Summary:');
  results.forEach(result => {
    console.log(`  ${result.language}: ${result.syncedFiles} files updated`);
  });
  
  console.log('');
  console.log('💡 Next steps:');
  console.log('  1. All non-Chinese locales now contain English content');
  console.log('  2. Engineers can see exactly what text needs translation');
  console.log('  3. Translate each string to the target language');
  console.log('  4. Follow the same practices as the Chinese locale');
}

// Run the sync
if (require.main === module) {
  syncAllTranslations();
}

module.exports = { syncAllTranslations, syncLanguage };