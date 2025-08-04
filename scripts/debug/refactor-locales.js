const fs = require('fs');
const path = require('path');

// Configuration
const LOCALES_DIR = path.join(__dirname, '../../ui-locales');
const REFERENCE_FILE = 'en.json';
const PLACEHOLDER = '[NOT TRANSLATED]';

/**
 * Load and parse JSON file
 */
function loadJson(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`Error loading ${filePath}:`, error.message);
        return null;
    }
}

/**
 * Save JSON file with proper formatting
 */
function saveJson(filePath, data) {
    try {
        const jsonString = JSON.stringify(data, null, 2);
        fs.writeFileSync(filePath, jsonString, 'utf8');
        return true;
    } catch (error) {
        console.error(`Error saving ${filePath}:`, error.message);
        return false;
    }
}

/**
 * Get all translation keys from an object recursively
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
function getValue(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
}

/**
 * Set value in nested object using dot notation
 */
function setValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    
    const target = keys.reduce((current, key) => {
        if (!current[key] || typeof current[key] !== 'object') {
            current[key] = {};
        }
        return current[key];
    }, obj);
    
    target[lastKey] = value;
}

/**
 * Create a properly structured object based on reference structure
 */
function createStructuredObject(referenceObj, sourceObj = {}) {
    const result = {};
    
    function processObject(refObj, srcObj, targetObj) {
        for (const [key, value] of Object.entries(refObj)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                targetObj[key] = {};
                processObject(value, srcObj[key] || {}, targetObj[key]);
            } else {
                // Try to find the value in the source object
                const sourceValue = srcObj[key];
                if (sourceValue !== undefined && sourceValue !== PLACEHOLDER) {
                    targetObj[key] = sourceValue;
                } else {
                    // Try to find it anywhere in the source object using dot notation
                    const allKeys = getAllKeys(srcObj);
                    const matchingKey = allKeys.find(k => k.endsWith(`.${key}`) || k === key);
                    
                    if (matchingKey) {
                        const foundValue = getValue(srcObj, matchingKey);
                        if (foundValue !== undefined && foundValue !== PLACEHOLDER) {
                            targetObj[key] = foundValue;
                        } else {
                            targetObj[key] = PLACEHOLDER;
                        }
                    } else {
                        targetObj[key] = PLACEHOLDER;
                    }
                }
            }
        }
    }
    
    processObject(referenceObj, sourceObj, result);
    return result;
}

/**
 * Extract existing translations from a locale file
 */
function extractTranslations(localeObj) {
    const translations = {};
    
    function extract(obj, prefix = '') {
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                extract(value, fullKey);
            } else if (typeof value === 'string' && value !== PLACEHOLDER && value.trim() !== '') {
                translations[fullKey] = value;
            }
        }
    }
    
    extract(localeObj);
    return translations;
}

/**
 * Apply extracted translations to a structured object
 */
function applyTranslations(structuredObj, translations) {
    for (const [key, value] of Object.entries(translations)) {
        setValue(structuredObj, key, value);
    }
}

/**
 * Main refactoring function
 */
function refactorLocales() {
    console.log('🔄 Starting locale files refactoring...');
    
    // Load reference file (en.json)
    const referencePath = path.join(LOCALES_DIR, REFERENCE_FILE);
    const referenceObj = loadJson(referencePath);
    
    if (!referenceObj) {
        console.error('❌ Could not load reference file:', REFERENCE_FILE);
        return;
    }
    
    console.log('✅ Reference file loaded:', REFERENCE_FILE);
    
    // Get all locale files
    const localeFiles = fs.readdirSync(LOCALES_DIR)
        .filter(file => file.endsWith('.json') && file !== REFERENCE_FILE)
        .sort();
    
    console.log(`📁 Found ${localeFiles.length} locale files to refactor:`, localeFiles.join(', '));
    
    let processedCount = 0;
    
    // Process each locale file
    for (const file of localeFiles) {
        console.log(`\n🔄 Processing ${file}...`);
        
        const filePath = path.join(LOCALES_DIR, file);
        const localeObj = loadJson(filePath);
        
        if (!localeObj) {
            console.error(`❌ Skipping ${file} due to load error`);
            continue;
        }
        
        // Extract existing translations
        const existingTranslations = extractTranslations(localeObj);
        console.log(`   📝 Extracted ${Object.keys(existingTranslations).length} existing translations`);
        
        // Create properly structured object
        const structuredObj = createStructuredObject(referenceObj);
        
        // Apply existing translations
        applyTranslations(structuredObj, existingTranslations);
        
        // Count translations vs placeholders
        const allKeys = getAllKeys(structuredObj);
        const translatedKeys = allKeys.filter(key => {
            const value = getValue(structuredObj, key);
            return value !== PLACEHOLDER && value !== '';
        });
        
        console.log(`   ✅ Structure applied: ${translatedKeys.length}/${allKeys.length} keys translated`);
        
        // Save the refactored file
        if (saveJson(filePath, structuredObj)) {
            console.log(`   💾 ${file} refactored successfully`);
            processedCount++;
        } else {
            console.error(`   ❌ Failed to save ${file}`);
        }
    }
    
    console.log(`\n🎉 Refactoring completed! Processed ${processedCount}/${localeFiles.length} files`);
    
    // Show final file sizes
    console.log('\n📊 Final file sizes:');
    const allFiles = [REFERENCE_FILE, ...localeFiles];
    for (const file of allFiles) {
        const filePath = path.join(LOCALES_DIR, file);
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n').length;
            console.log(`   ${file}: ${lines} lines`);
        } catch (error) {
            console.log(`   ${file}: Error reading file`);
        }
    }
}

// Run the refactoring
if (require.main === module) {
    refactorLocales();
}

module.exports = { refactorLocales };