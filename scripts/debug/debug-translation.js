const fs = require('fs');
const path = require('path');

function getAllKeys(obj, prefix = '') {
    let keys = [];
    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            keys = keys.concat(getAllKeys(obj[key], prefix ? `${prefix}.${key}` : key));
        } else {
            keys.push(prefix ? `${prefix}.${key}` : key);
        }
    }
    return keys;
}

function loadLanguageData(lang) {
    const baseDir = './ui-locales';
    const langDir = path.join(baseDir, lang);
    const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
    
    let langData = {};
    for (const file of files) {
        const filePath = path.join(langDir, file);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        langData = { ...langData, [file.replace('.json', '')]: content };
    }
    return langData;
}

console.log('🔍 Checking translation consistency...\n');

const enData = loadLanguageData('en');
const zhData = loadLanguageData('zh');

const enKeys = getAllKeys(enData);
const zhKeys = getAllKeys(zhData);

console.log(`English keys: ${enKeys.length}`);
console.log(`Chinese keys: ${zhKeys.length}`);

const missingInZh = enKeys.filter(key => !zhKeys.includes(key));
const extraInZh = zhKeys.filter(key => !enKeys.includes(key));

if (missingInZh.length > 0) {
    console.log('\n❌ Missing in Chinese:');
    missingInZh.forEach(key => console.log(`   - ${key}`));
}

if (extraInZh.length > 0) {
    console.log('\n⚠️  Extra in Chinese:');
    extraInZh.forEach(key => console.log(`   - ${key}`));
}

if (missingInZh.length === 0 && extraInZh.length === 0) {
    console.log('✅ All translations are consistent!');
}