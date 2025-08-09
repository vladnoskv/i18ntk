#!/usr/bin/env node

/**
 * Console Key Checker v1.6.0
 * 
 * This script finds missing translation keys by comparing the source language (en.json)
 * with other language files and adds [NOT TRANSLATED] placeholders for missing keys.
 * Improved to prevent duplicate key additions and handle nested structures properly.
 * 
 * Usage:
 *   node console-key-checker.js [options]
 * 
 * Options:
 *   --dry-run            Show what would be changed without making changes
 *   --backup             Create backup files (default: true)
 *   --languages=<list>   Specific languages to check (default: all)
 *   --verbose            Show detailed progress
 */

const fs = require('fs');
const path = require('path');

class ConsoleKeyChecker {
    constructor() {
        this.uiLocalesDir = path.join(__dirname, '..', '..', 'ui-locales');
        this.sourceLanguage = 'en';
        this.supportedLanguages = ['de', 'es', 'fr', 'ja', 'ru', 'zh'];
        this.dryRun = process.argv.includes('--dry-run');
        this.createBackup = !process.argv.includes('--no-backup');
        this.verbose = process.argv.includes('--verbose');
        this.missingKeys = new Map();
        
        // Parse specific languages if provided
        const langArg = process.argv.find(arg => arg.startsWith('--languages='));
        if (langArg) {
            this.supportedLanguages = langArg.split('=')[1].split(',').map(l => l.trim());
        }
    }
    
    /**
     * Get all keys from an object with dot notation
     */
    getKeysFromObject(obj, prefix = '') {
        const keys = [];
        
        for (const key in obj) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                keys.push(...this.getKeysFromObject(obj[key], fullKey));
            } else {
                keys.push(fullKey);
            }
        }
        
        return keys;
    }
    
    
    /**
     * Get a value from an object using dot notation
     */
    getValueByPath(obj, keyPath) {
        const keys = keyPath.split('.');
        let current = obj;
        
        for (const key of keys) {
            if (current === null || current === undefined || !(key in current)) {
                return undefined;
            }
            current = current[key];
        }
        
        return current;
    }
    
    /**
     * Set a value in an object using dot notation, creating nested structure as needed
     */
    setValueByPath(obj, keyPath, value) {
        const keys = keyPath.split('.');
        let current = obj;
        
        // Navigate to the parent of the target key
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            
            if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
                current[key] = {};
            }
            
            current = current[key];
        }
        
        // Set the final value
        const finalKey = keys[keys.length - 1];
        current[finalKey] = value;
    }
    
    /**
     * Find similar keys in the object (for suggestions)
     */
    findSimilarKeys(obj, targetKey, threshold = 0.6) {
        const allKeys = this.getKeysFromObject(obj);
        const similar = [];
        
        for (const key of allKeys) {
            const similarity = this.calculateSimilarity(targetKey, key);
            if (similarity >= threshold) {
                similar.push({ key, similarity });
            }
        }
        
        return similar.sort((a, b) => b.similarity - a.similarity);
    }
    
    /**
     * Calculate string similarity (simple Levenshtein-based)
     */
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }
    
    /**
     * Calculate Levenshtein distance
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    /**
     * Load source language keys
     */
    loadSourceKeys() {
        const sourceFile = path.join(this.uiLocalesDir, `${this.sourceLanguage}.json`);
        
        if (!fs.existsSync(sourceFile)) {
            throw new Error(`Source language file not found: ${sourceFile}`);
        }
        
        const sourceData = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
        return this.getKeysFromObject(sourceData);
    }
    
    /**
     * Check a single language file for missing keys
     */
    checkLanguageFile(languageCode, sourceKeys) {
        const languageFile = path.join(this.uiLocalesDir, `${languageCode}.json`);
        
        if (!fs.existsSync(languageFile)) {
            console.log(`⚠️ Language file not found: ${languageFile}`);
            return { missingKeys: [], addedKeys: 0 };
        }
        
        console.log(`🔍 Checking ${languageCode.toUpperCase()} for missing keys...`);
        
        // Load current translations
        let currentTranslations;
        try {
            const fileContent = fs.readFileSync(languageFile, 'utf8');
            currentTranslations = JSON.parse(fileContent);
        } catch (error) {
            console.log(`❌ Error parsing ${languageCode}.json: ${error.message}`);
            return { missingKeys: [], addedKeys: 0 };
        }
        
        // Get current keys using proper nested key extraction
        const currentKeys = this.getKeysFromObject(currentTranslations);
        const currentKeysSet = new Set(currentKeys);

        // Find missing keys by checking if each source key exists in current translations
        const missingKeys = sourceKeys.filter(key => !currentKeysSet.has(key));
        
        if (missingKeys.length === 0) {
            console.log(`✅ ${languageCode.toUpperCase()}: No missing keys found`);
            return { missingKeys: [], addedKeys: 0 };
        }
        
        console.log(`📋 ${languageCode.toUpperCase()}: Found ${missingKeys.length} missing keys`);
        
        if (this.verbose) {
            missingKeys.forEach(key => {
                console.log(`  ❌ Missing: ${key}`);
                
                // Suggest similar keys if available
                const similarKeys = this.findSimilarKeys(currentTranslations, key, 0.7);
                if (similarKeys.length > 0) {
                    console.log(`    💡 Similar keys found:`);
                    similarKeys.slice(0, 2).forEach(similar => {
                        console.log(`      - ${similar.key} (${(similar.similarity * 100).toFixed(1)}% match)`);
                    });
                }
            });
        }
        
        // Add missing keys with [NOT TRANSLATED] placeholder
        let addedKeys = 0;
        if (!this.dryRun) {
            // Create backup if enabled
            if (this.createBackup) {
                const backupFile = languageFile.replace('.json', '.backup.json');
                fs.copyFileSync(languageFile, backupFile);
                console.log(`📋 Backup created: ${path.basename(backupFile)}`);
            }
            
            // Add missing keys in their proper nested locations
            missingKeys.forEach(key => {
                // Double-check the key doesn't exist before adding
                if (!currentKeysSet.has(key)) {
                    this.setValueByPath(currentTranslations, key, '[NOT TRANSLATED]');
                    currentKeysSet.add(key);
                    addedKeys++;
                    
                    if (this.verbose) {
                        console.log(`  ✅ Added: ${key} = [NOT TRANSLATED]`);
                    }
                } else if (this.verbose) {
                    console.log(`  ⚠️ Key already exists, skipping: ${key}`);
                }
            });
            
            // Save updated translations with proper formatting
            try {
                fs.writeFileSync(languageFile, JSON.stringify(currentTranslations, null, 2), 'utf8');
                console.log(`💾 ${languageCode.toUpperCase()}: Added ${addedKeys} missing keys`);
            } catch (error) {
                console.log(`❌ Error writing ${languageCode}.json: ${error.message}`);
                return { missingKeys, addedKeys: 0 };
            }
        } else {
            console.log(`🔍 ${languageCode.toUpperCase()}: Would add ${missingKeys.length} missing keys`);
        }
        
        return { missingKeys, addedKeys };
    }
    
    /**
     * Generate a report of missing keys
     */
    generateReport() {
        if (this.missingKeys.size === 0) {
            console.log('\n📊 No missing keys found across all languages.');
            return;
        }
        
        console.log('\n📊 MISSING KEYS REPORT');
        console.log('========================\n');
        
        let totalMissing = 0;
        
        for (const [language, keys] of this.missingKeys) {
            if (keys.length > 0) {
                console.log(`🌍 ${language.toUpperCase()}: ${keys.length} missing keys`);
                totalMissing += keys.length;
                
                if (this.verbose) {
                    keys.forEach(key => {
                        console.log(`  - ${key}`);
                    });
                    console.log('');
                }
            }
        }
        
        console.log(`\n📈 Total missing keys across all languages: ${totalMissing}`);
    }
    
    /**
     * Export missing keys to a JSON report file
     */
    exportMissingKeysReport() {
        const reportsDir = path.join(__dirname, 'reports');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportFile = path.join(reportsDir, `missing-keys-${timestamp}.json`);
        
        const report = {
            timestamp: new Date().toISOString(),
            sourceLanguage: this.sourceLanguage,
            checkedLanguages: this.supportedLanguages,
            summary: {
                totalLanguages: this.supportedLanguages.length,
                languagesWithMissingKeys: Array.from(this.missingKeys.keys()).filter(lang => 
                    this.missingKeys.get(lang).length > 0
                ).length,
                totalMissingKeys: Array.from(this.missingKeys.values()).reduce((sum, keys) => sum + keys.length, 0)
            },
            missingKeysByLanguage: Object.fromEntries(this.missingKeys),
            options: {
                dryRun: this.dryRun,
                createBackup: this.createBackup,
                verbose: this.verbose
            }
        };
        
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');
        console.log(`\n📄 Missing keys report exported: ${path.basename(reportFile)}`);
        
        return reportFile;
    }
    
    /**
     * Main execution function
     */
    async run() {
        console.log('🔍 Console Key Checker v1.6.0');
        console.log('===============================\n');
        
        if (this.dryRun) {
            console.log('⚠️ Running in DRY RUN mode - no files will be modified\n');
        }
        
        try {
            // Load source keys
            console.log(`📖 Loading source keys from ${this.sourceLanguage}.json...`);
            const sourceKeys = this.loadSourceKeys();
            console.log(`📊 Found ${sourceKeys.length} keys in source language\n`);
            
            let totalAdded = 0;
            
            // Check each language file
            for (const languageCode of this.supportedLanguages) {
                const result = this.checkLanguageFile(languageCode, sourceKeys);
                this.missingKeys.set(languageCode, result.missingKeys);
                totalAdded += result.addedKeys;
            }
            
            // Generate and export report
            this.generateReport();
            
            if (!this.dryRun) {
                this.exportMissingKeysReport();
            }
            
            console.log('\n✅ Console key checking complete!');
            
            if (!this.dryRun && totalAdded > 0) {
                console.log(`📊 Total keys added: ${totalAdded}`);
                console.log('💡 Run the native-translations.js script to replace [NOT TRANSLATED] placeholders with proper translations.');
            }
            
            if (this.dryRun) {
                console.log('\n⚠️ DRY RUN MODE - No files were modified');
                console.log('💡 Remove --dry-run flag to apply changes');
            }
            
        } catch (error) {
            console.error('❌ Error during key checking:', error);
            process.exit(1);
        }
    }
}

// Run the script if called directly
if (require.main === module) {
    const checker = new ConsoleKeyChecker();
    checker.run();
}

module.exports = ConsoleKeyChecker;