#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

function countKeys(obj, prefix = '') {
    let count = 0;
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            count += countKeys(value, fullKey);
        } else {
            count++;
        }
    }
    return count;
}

function analyzeLanguageFiles(dir = path.join(__dirname, 'ui-locales')) {
    const uiLocalesDir = dir;
    if (!fs.existsSync(uiLocalesDir)) {
        throw new Error(`Directory not found: ${uiLocalesDir}`);
    }
    const files = SecurityUtils.safeReaddirSync(uiLocalesDir)
        .filter(f => f.endsWith('.json'))
        .sort((a, b) => a.localeCompare(b));
    
    console.log('Language Key Count Analysis');
    console.log('==========================');
    
    const results = {};
    
    for (const file of files) {
        const filePath = path.join(uiLocalesDir, file);
        const stat = SecurityUtils.safeStatSync(filePath);
        const content = SecurityUtils.safeReadFileSync(filePath, 'utf8');
        let data;
        try {
            // Strip UTF-8 BOM if present
            data = JSON.parse(content.replace(/^\uFEFF/, ''));
        } catch (err) {
            console.error(`Skipping ${file}: invalid JSON (${err.message})`);
            results[file] = {
                language: file.replace('.json', ''),
                keys: 0,
                fileSize: stat.size,
                error: 'invalid-json'
            };
            continue;
        }
        const keyCount = countKeys(data);
        
        results[file] = {
            language: file.replace('.json', ''),
            keys: keyCount,
            fileSize: stat.size
        };
        
        console.log(`${file}: ${keyCount} keys (${(stat.size / 1024).toFixed(2)} KB)`);
    }
    
    console.log('\nKey Count Comparison:');
    console.log('====================');
    
    const enCount = results['en.json']?.keys || 0;
    console.log(`English (en.json): ${enCount} keys (baseline)`);
    
    for (const [file, info] of Object.entries(results)) {
        if (file !== 'en.json') {
            const diff = info.keys - enCount;
            const status = diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : 'same';
            console.log(`${file}: ${info.keys} keys (${status} vs English)`);
        }
    }
    
    return results;
}

if (require.main === module) {
    const customDir = process.argv[2];
    analyzeLanguageFiles(customDir);
}