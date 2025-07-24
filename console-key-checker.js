#!/usr/bin/env node

/**
 * Console Key Checker
 * 
 * This script checks for missing translation keys in console output and inserts
 * [NOT TRANSLATED] placeholders to maintain consistency with the main package setup.
 * 
 * Usage:
 *   node console-key-checker.js [options]
 * 
 * Options:
 *   --dry-run            Show what would be changed without making changes
 *   --backup             Create backup files (default: true)
 *   --languages=<list>   Specific languages to process (default: all)
 *   --verbose            Show detailed progress
 *   --source=<file>      Source language file to compare against (default: en.json)
 */

const fs = require('fs');
const path = require('path');

class ConsoleKeyChecker {
    constructor() {
        this.uiLocalesDir = path.join(__dirname, 'ui-locales');
        this.backupDir = path.join(__dirname, 'backups', 'ui-locales');
        this.supportedLanguages = ['de', 'es', 'fr', 'ja', 'ru', 'zh'];
        this.sourceLanguage = 'en';
        this.dryRun = process.argv.includes('--dry-run');
        this.createBackup = !process.argv.includes('--no-backup');
        this.verbose = process.argv.includes('--verbose');
        this.missingKeys = new Map();
        
        // Parse specific languages if provided
        const langArg = process.argv.find(arg => arg.startsWith('--languages='));
        if (langArg) {
            this.supportedLanguages = langArg.split('=')[1].split(',').map(l => l.trim());
        }
        
        // Parse source language if provided
        const sourceArg = process.argv.find(arg => arg.startsWith('--source='));
        if (sourceArg) {
            this.sourceLanguage = sourceArg.split('=')[1].trim().replace('.json', '');
        }
    }
    
    /**
     * Recursively get all keys from an object with dot notation
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
     * Set a value in an object using dot notation
     */
    setValueByPath(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
    }
    
    /**
     * Get a value from an object using dot notation
     */
    getValueByPath(obj, path) {
        const keys = path.split('.');
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
     * Load source language file to get reference keys
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
        const currentTranslations = JSON.parse(fs.readFileSync(languageFile, 'utf8'));
        const currentKeys = this.getKeysFromObject(currentTranslations);
        
        // Find missing keys
        const missingKeys = sourceKeys.filter(key => !currentKeys.includes(key));
        
        if (missingKeys.length === 0) {
            console.log(`✅ ${languageCode.toUpperCase()}: No missing keys found`);
            return { missingKeys: [], addedKeys: 0 };
        }
        
        console.log(`📋 ${languageCode.toUpperCase()}: Found ${missingKeys.length} missing keys`);
        
        if (this.verbose) {
            missingKeys.forEach(key => {
                console.log(`  ❌ Missing: ${key}`);
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
            
            missingKeys.forEach(key => {
                this.setValueByPath(currentTranslations, key, '[NOT TRANSLATED]');
                addedKeys++;
                
                if (this.verbose) {
                    console.log(`  ✅ Added: ${key} = [NOT TRANSLATED]`);
                }
            });
            
            // Save updated translations
            fs.writeFileSync(languageFile, JSON.stringify(currentTranslations, null, 2), 'utf8');
            console.log(`💾 ${languageCode.toUpperCase()}: Added ${addedKeys} missing keys`);
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
        console.log('🔍 Console Key Checker v1.0');
        console.log('=============================\n');
        
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