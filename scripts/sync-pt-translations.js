#!/usr/bin/env node

/**
 * Synchronization script for Portuguese translations
 * Ensures all Portuguese files match English reference structure
 */

const fs = require('fs');
const path = require('path');

const UI_LOCALES_DIR = path.join(__dirname, '..', 'ui-locales');
const EN_DIR = path.join(UI_LOCALES_DIR, 'en');
const PT_DIR = path.join(UI_LOCALES_DIR, 'pt');

function loadJSON(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`Error loading ${filePath}:`, error.message);
        return {};
    }
}

function saveJSON(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
        console.log(`✅ Saved: ${path.basename(filePath)}`);
    } catch (error) {
        console.error(`Error saving ${filePath}:`, error.message);
    }
}

function syncTranslationFile(enFile, ptFile) {
    const enData = loadJSON(enFile);
    const ptData = loadJSON(ptFile);
    
    // Create synchronized data structure
    const syncedData = {};
    
    // Copy English structure with Portuguese values where available
    for (const [key, enValue] of Object.entries(enData)) {
        if (ptData.hasOwnProperty(key)) {
            // Use existing Portuguese translation
            syncedData[key] = ptData[key];
        } else {
            // Use English as fallback for missing keys
            syncedData[key] = enValue;
            console.log(`📝 Added missing key: ${key}`);
        }
    }
    
    // Remove any extra keys that don't exist in English
    const enKeys = Object.keys(enData);
    const ptKeys = Object.keys(ptData);
    const extraKeys = ptKeys.filter(key => !enKeys.includes(key));
    
    if (extraKeys.length > 0) {
        console.log(`🗑️  Removed extra keys: ${extraKeys.join(', ')}`);
    }
    
    return syncedData;
}

function main() {
    console.log('🔧 Synchronizing Portuguese translations with English reference...\n');
    
    // Ensure Portuguese directory exists
    if (!fs.existsSync(PT_DIR)) {
        fs.mkdirSync(PT_DIR, { recursive: true });
    }
    
    // Get all English files
    const enFiles = fs.readdirSync(EN_DIR).filter(file => file.endsWith('.json'));
    
    let totalMissing = 0;
    let totalExtra = 0;
    
    enFiles.forEach(file => {
        const enFilePath = path.join(EN_DIR, file);
        const ptFilePath = path.join(PT_DIR, file);
        
        console.log(`📁 Processing: ${file}`);
        
        if (!fs.existsSync(ptFilePath)) {
            // Create missing Portuguese file
            const enData = loadJSON(enFilePath);
            saveJSON(ptFilePath, enData);
            console.log(`✅ Created new file: ${file}`);
            totalMissing += Object.keys(enData).length;
        } else {
            // Synchronize existing file
            const enData = loadJSON(enFilePath);
            const ptData = loadJSON(ptFilePath);
            
            const syncedData = syncTranslationFile(enFilePath, ptFilePath);
            saveJSON(ptFilePath, syncedData);
            
            // Count missing and extra keys
            const missingKeys = Object.keys(enData).filter(key => !ptData.hasOwnProperty(key));
            const extraKeys = Object.keys(ptData).filter(key => !enData.hasOwnProperty(key));
            
            totalMissing += missingKeys.length;
            totalExtra += extraKeys.length;
        }
    });
    
    console.log(`\n📊 Synchronization complete!`);
    console.log(`📈 Total missing keys added: ${totalMissing}`);
    console.log(`🗑️  Total extra keys removed: ${totalExtra}`);
    console.log(`✅ Portuguese translations are now synchronized with English reference`);
}

// Run synchronization
main();