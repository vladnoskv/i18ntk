#!/usr/bin/env node

/**
 * Complete Console Translations
 * Adds missing translation keys to all ui-locales language files
 * to ensure 100% translation coverage for the i18n-management-toolkit package.
 */

const fs = require('fs');
const path = require('path');
const ConsoleTranslationsChecker = require('./console-translations');
const UIi18n = require('../../main/i18ntk-ui');

class ConsoleTranslationsCompleter {
    constructor() {
        this.uiLocalesDir = path.join(__dirname, '..', '..', 'ui-locales');
        this.referenceLanguage = 'en';
        this.supportedLanguages = ['de', 'es', 'fr', 'ja', 'ru', 'zh'];
        this.dryRun = process.argv.includes('--dry-run');
        this.results = {
            totalKeysAdded: 0,
            languagesProcessed: 0,
            changes: {}
        };
    }

    /**
     * Load and parse a JSON translation file
     */
    loadTranslationFile(language) {
        const filePath = path.join(this.uiLocalesDir, `${language}.json`);
        
        try {
            if (!fs.existsSync(filePath)) {
                throw new Error(`Translation file not found: ${filePath}`);
            }
            
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            console.log(`❌ Error loading ${language}.json: ${error.message}`);
            return null;
        }
    }

    /**
     * Save translation file with proper formatting
     */
    saveTranslationFile(language, data) {
        const filePath = path.join(this.uiLocalesDir, `${language}.json`);
        
        try {
            const content = JSON.stringify(data, null, 2);
            
            if (this.dryRun) {
                console.log(`   🧪 DRY RUN: Would save ${language}.json`);
                return true;
            }
            
            fs.writeFileSync(filePath, content, 'utf8');
            return true;
        } catch (error) {
            console.log(`❌ Error saving ${language}.json: ${error.message}`);
            return false;
        }
    }

    /**
     * Get nested object value by dot notation path
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    /**
     * Set nested object value by dot notation path
     */
    setNestedValue(obj, path, value) {
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
     * Generate placeholder translation for missing keys
     */
    generatePlaceholderTranslation(key, referenceValue, targetLanguage) {
        // Use consistent placeholder prefix for all languages
        const prefix = '[NOT TRANSLATED]';
        
        // For simple strings, add consistent prefix
        if (typeof referenceValue === 'string') {
            // Keep emojis and special characters, but mark as needing translation
            if (referenceValue.length < 50) {
                return `${prefix} ${referenceValue}`;
            } else {
                // For longer strings, just use the prefix
                return `${prefix} ${referenceValue.substring(0, 30)}...`;
            }
        }
        
        // For arrays, copy structure but mark items
        if (Array.isArray(referenceValue)) {
            return referenceValue.map(item => 
                typeof item === 'string' ? `${prefix} ${item}` : item
            );
        }
        
        // For other types, return as-is
        return referenceValue;
    }

    /**
     * Complete translations for a specific language
     */
    completeLanguage(language, missingKeys, referenceData) {
        console.log(`🔄 Processing ${language.toUpperCase()}...`);
        
        const languageData = this.loadTranslationFile(language);
        if (!languageData) {
            return false;
        }
        
        let keysAdded = 0;
        const changes = [];
        
        for (const key of missingKeys) {
            const referenceValue = this.getNestedValue(referenceData, key);
            if (referenceValue !== undefined) {
                const placeholderValue = this.generatePlaceholderTranslation(key, referenceValue, language);
                this.setNestedValue(languageData, key, placeholderValue);
                keysAdded++;
                changes.push(key);
            }
        }
        
        if (keysAdded > 0) {
            const success = this.saveTranslationFile(language, languageData);
            if (success) {
                console.log(`   ✅ Added ${keysAdded} missing keys`);
                this.results.changes[language] = changes;
                this.results.totalKeysAdded += keysAdded;
                this.results.languagesProcessed++;
                
                // Show sample of added keys
                const sampleKeys = changes.slice(0, 3);
                console.log(`   📝 Sample: ${sampleKeys.join(', ')}`);
                if (changes.length > 3) {
                    console.log(`   📝 ... and ${changes.length - 3} more`);
                }
            } else {
                console.log(`   ❌ Failed to save changes`);
                return false;
            }
        } else {
            console.log(`   ✅ No missing keys found`);
        }
        
        return true;
    }

    /**
     * Run the completion process
     */
    async run() {
        console.log('🔧 CONSOLE TRANSLATIONS COMPLETION');
        console.log('============================================================');
        console.log(`📁 UI Locales directory: ${this.uiLocalesDir}`);
        console.log(`🔤 Reference language: ${this.referenceLanguage}`);
        
        if (this.dryRun) {
            console.log('🧪 DRY RUN MODE - No files will be modified');
        }
        
        console.log('');
        
        // First, run analysis to get missing keys
        console.log('🔍 Analyzing current translation status...');
        const checker = new ConsoleTranslationsChecker();
        const analysisSuccess = await checker.run();
        
        if (!analysisSuccess) {
            console.log('❌ Failed to analyze translations');
            return false;
        }
        
        // Load reference data
        const referenceData = this.loadTranslationFile(this.referenceLanguage);
        if (!referenceData) {
            console.log(`❌ Cannot load reference language: ${this.referenceLanguage}`);
            return false;
        }
        
        console.log('');
        console.log('🔄 COMPLETING MISSING TRANSLATIONS');
        console.log('============================================================');
        
        // Get missing keys from the analysis
        const missingKeysData = checker.results.missingKeys;
        
        // Process each language
        for (const language of this.supportedLanguages) {
            const missingKeys = missingKeysData[language] || [];
            
            if (missingKeys.length === 0) {
                console.log(`✅ ${language.toUpperCase()}: Already complete`);
                continue;
            }
            
            console.log(`📊 ${language.toUpperCase()}: ${missingKeys.length} missing keys`);
            const success = this.completeLanguage(language, missingKeys, referenceData);
            
            if (!success) {
                console.log(`❌ Failed to complete ${language}`);
                return false;
            }
        }
        
        // Generate summary
        this.generateSummary();
        
        // Run final verification
        if (!this.dryRun && this.results.totalKeysAdded > 0) {
            console.log('');
            console.log('🔍 VERIFICATION - Running final analysis...');
            console.log('============================================================');
            
            const finalChecker = new ConsoleTranslationsChecker();
            await finalChecker.run();
        }
        
        return true;
    }

    /**
     * Generate completion summary
     */
    generateSummary() {
        console.log('');
        console.log('📊 COMPLETION SUMMARY');
        console.log('============================================================');
        console.log(`✅ Total keys added: ${this.results.totalKeysAdded}`);
        console.log(`🌐 Languages processed: ${this.results.languagesProcessed}/${this.supportedLanguages.length}`);
        
        if (this.results.totalKeysAdded > 0) {
            console.log('');
            console.log('📋 CHANGES BY LANGUAGE:');
            console.log('------------------------------------------------------------');
            
            for (const [language, changes] of Object.entries(this.results.changes)) {
                console.log(`🔤 ${language.toUpperCase()}: ${changes.length} keys added`);
            }
        }
        
        console.log('');
        console.log('💡 NEXT STEPS:');
        console.log('------------------------------------------------------------');
        
        if (this.dryRun) {
            console.log('🔧 Run without --dry-run to apply changes:');
            console.log('   node complete-console-translations.js');
        } else if (this.results.totalKeysAdded > 0) {
            console.log('🌍 Translation placeholders have been added!');
            console.log('📝 Next steps:');
            console.log('1. Review and translate the placeholder values');
            console.log('2. Replace [DE], [ES], [FR], [JA], [RU], [ZH] prefixes with actual translations');
            console.log('3. Run console-translations.js to verify 100% completion');
        } else {
            console.log('🎉 All translations are already complete!');
        }
    }
}

// Run the completer if called directly
if (require.main === module) {
    const completer = new ConsoleTranslationsCompleter();
    completer.run().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    });
}

module.exports = ConsoleTranslationsCompleter;