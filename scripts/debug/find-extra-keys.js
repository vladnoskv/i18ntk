const fs = require('fs');
const path = require('path');

// Function to get all keys from nested object
function getAllKeys(obj, prefix = '') {
    let keys = [];
    
    for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            if (Array.isArray(obj[key])) {
                keys.push(fullKey);
                obj[key].forEach((item, index) => {
                    if (typeof item === 'object' && item !== null) {
                        keys = keys.concat(getAllKeys(item, `${fullKey}[${index}]`));
                    }
                });
            } else {
                keys = keys.concat(getAllKeys(obj[key], fullKey));
            }
        } else {
            keys.push(fullKey);
        }
    }
    
    return keys;
}

// Main function to find extra keys
function findExtraKeys() {
    const localesDir = './ui-locales';
    const enPath = path.join(localesDir, 'en.json');
    
    // Load English reference
    const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const enKeys = getAllKeys(enData);
    
    console.log(`📋 English reference has ${enKeys.length} keys`);
    
    // Check other files
    const files = ['es.json', 'fr.json', 'ja.json', 'ru.json', 'zh.json'];
    
    files.forEach(file => {
        const filePath = path.join(localesDir, file);
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            const keys = getAllKeys(data);
            
            const extraKeys = keys.filter(key => !enKeys.includes(key));
            
            console.log(`\n🔍 ${file}:`);
            console.log(`   Total keys: ${keys.length}`);
            console.log(`   Extra keys: ${extraKeys.length}`);
            
            if (extraKeys.length > 0) {
                console.log(`   Extra keys list:`);
                extraKeys.forEach(key => {
                    console.log(`     - ${key}`);
                });
            }
        } catch (error) {
            console.log(`❌ Error reading ${file}: ${error.message}`);
        }
    });
}

findExtraKeys();