const fs = require('fs');
const path = require('path');

// Configuration
const LOCALES_DIR = path.join(__dirname, '../../ui-locales');
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
 * Get all keys from all locale files to create a master structure
 */
function getAllKeysFromAllFiles() {
    const allKeys = new Set();
    
    // Get all JSON files
    const files = fs.readdirSync(LOCALES_DIR)
        .filter(file => file.endsWith('.json'))
        .sort();
    
    console.log(`📁 Scanning ${files.length} files for all possible keys...`);
    
    for (const file of files) {
        const filePath = path.join(LOCALES_DIR, file);
        const data = loadJson(filePath);
        
        if (data) {
            const keys = extractAllKeys(data);
            keys.forEach(key => allKeys.add(key));
            console.log(`   ${file}: ${keys.length} keys found`);
        }
    }
    
    console.log(`🔍 Total unique keys found: ${allKeys.size}`);
    return Array.from(allKeys).sort();
}

/**
 * Extract all keys from an object recursively
 */
function extractAllKeys(obj, prefix = '') {
    const keys = [];
    
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            keys.push(...extractAllKeys(value, fullKey));
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
 * Create a complete structure with all keys
 */
function createCompleteStructure(allKeys, sourceData = {}) {
    const result = {};
    
    for (const key of allKeys) {
        const existingValue = getValue(sourceData, key);
        
        if (existingValue !== undefined && 
            existingValue !== '' && 
            existingValue !== PLACEHOLDER &&
            typeof existingValue === 'string' &&
            existingValue.trim() !== '') {
            setValue(result, key, existingValue);
        } else {
            setValue(result, key, PLACEHOLDER);
        }
    }
    
    return result;
}

/**
 * Remove empty objects recursively
 */
function removeEmptyObjects(obj) {
    const result = {};
    
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const cleaned = removeEmptyObjects(value);
            if (Object.keys(cleaned).length > 0) {
                result[key] = cleaned;
            }
        } else if (value !== undefined) {
            result[key] = value;
        }
    }
    
    return result;
}

/**
 * Main normalization function
 */
function finalNormalize() {
    console.log('🔄 Starting final normalization of all locale files...');
    
    // Get all possible keys from all files
    const allKeys = getAllKeysFromAllFiles();
    
    if (allKeys.length === 0) {
        console.error('❌ No keys found in any locale files');
        return;
    }
    
    // Get all locale files
    const localeFiles = fs.readdirSync(LOCALES_DIR)
        .filter(file => file.endsWith('.json'))
        .sort();
    
    console.log(`\n🔄 Normalizing ${localeFiles.length} locale files...`);
    
    let processedCount = 0;
    
    // Process each locale file
    for (const file of localeFiles) {
        console.log(`\n📝 Processing ${file}...`);
        
        const filePath = path.join(LOCALES_DIR, file);
        const originalData = loadJson(filePath);
        
        if (!originalData) {
            console.error(`❌ Skipping ${file} due to load error`);
            continue;
        }
        
        // Create complete structure
        const normalizedData = createCompleteStructure(allKeys, originalData);
        
        // Remove any empty objects
        const cleanedData = removeEmptyObjects(normalizedData);
        
        // Count translations
        const totalKeys = allKeys.length;
        const translatedKeys = allKeys.filter(key => {
            const value = getValue(cleanedData, key);
            return value && 
                   typeof value === 'string' && 
                   value !== PLACEHOLDER && 
                   value.trim() !== '';
        }).length;
        
        console.log(`   ✅ Structure normalized: ${translatedKeys}/${totalKeys} keys translated`);
        
        // Save the normalized file
        if (saveJson(filePath, cleanedData)) {
            console.log(`   💾 ${file} normalized successfully`);
            processedCount++;
        } else {
            console.error(`   ❌ Failed to save ${file}`);
        }
    }
    
    console.log(`\n🎉 Final normalization completed! Processed ${processedCount}/${localeFiles.length} files`);
    
    // Show final file sizes
    console.log('\n📊 Final file sizes:');
    for (const file of localeFiles) {
        const filePath = path.join(LOCALES_DIR, file);
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n').length;
            console.log(`   ${file}: ${lines} lines`);
        } catch (error) {
            console.log(`   ${file}: Error reading file`);
        }
    }
    
    console.log(`\n✅ All files now have consistent structure with ${allKeys.length} total keys`);
}

// Run the final normalization
if (require.main === module) {
    finalNormalize();
}

module.exports = { finalNormalize };