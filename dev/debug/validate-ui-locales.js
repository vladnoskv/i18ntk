#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * UI Locales Validator for v1.6.0
 * Ensures no duplicates, extra keys, and exact structure matching
 */
class UILocalesValidator {
    constructor() {
        this.uiLocalesDir = path.join(__dirname, '..', '..', 'ui-locales');
        this.languages = ['de', 'es', 'fr', 'ja', 'ru', 'zh'];
        this.sourceLanguage = 'en';
        this.validationReport = {
            duplicates: {},
            extraKeys: {},
            missingKeys: {},
            structureErrors: {},
            keyCounts: {},
            lineCounts: {}
        };
    }

    /**
     * Load JSON file safely
     */
    loadJSON(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            console.error(`❌ Error loading ${filePath}: ${error.message}`);
            return null;
        }
    }

    /**
     * Get all keys from nested object with dot notation
     */
    getAllKeys(obj, prefix = '') {
        const keys = [];
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            keys.push(fullKey);
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                keys.push(...this.getAllKeys(value, fullKey));
            }
        }
        return keys;
    }

    /**
     * Count lines in JSON file (approximate)
     */
    countLines(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return content.split('\n').length;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Check for duplicate keys in object
     */
    findDuplicates(obj, prefix = '', duplicates = new Set()) {
        const seen = new Set();
        for (const key of Object.keys(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (seen.has(key)) {
                duplicates.add(fullKey);
            }
            seen.add(key);
            
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                this.findDuplicates(obj[key], fullKey, duplicates);
            }
        }
        return duplicates;
    }

    /**
     * Validate a single language file
     */
    validateLanguage(language) {
        const filePath = path.join(this.uiLocalesDir, `${language}.json`);
        const sourcePath = path.join(this.uiLocalesDir, `${this.sourceLanguage}.json`);
        
        if (!fs.existsSync(filePath)) {
            this.validationReport.structureErrors[language] = [`File not found: ${filePath}`];
            return false;
        }

        const sourceData = this.loadJSON(sourcePath);
        const langData = this.loadJSON(filePath);

        if (!sourceData || !langData) {
            this.validationReport.structureErrors[language] = ['Failed to parse JSON'];
            return false;
        }

        // Get key counts and line counts
        const sourceKeys = this.getAllKeys(sourceData);
        const langKeys = this.getAllKeys(langData);
        
        this.validationReport.keyCounts[language] = langKeys.length;
        this.validationReport.lineCounts[language] = this.countLines(filePath);

        // Check for duplicates
        const duplicates = this.findDuplicates(langData);
        if (duplicates.size > 0) {
            this.validationReport.duplicates[language] = Array.from(duplicates);
        }

        // Check for extra keys (keys in language but not in source)
        const extraKeys = langKeys.filter(key => !sourceKeys.includes(key));
        if (extraKeys.length > 0) {
            this.validationReport.extraKeys[language] = extraKeys;
        }

        // Check for missing keys (keys in source but not in language)
        const missingKeys = sourceKeys.filter(key => !langKeys.includes(key));
        if (missingKeys.length > 0) {
            this.validationReport.missingKeys[language] = missingKeys;
        }

        return true;
    }

    /**
     * Run complete validation
     */
    async validateAll() {
        console.log('🔍 UI Locales Validation for v1.6.0');
        console.log('=====================================');
        console.log();

        // Validate source file
        const sourcePath = path.join(this.uiLocalesDir, `${this.sourceLanguage}.json`);
        const sourceData = this.loadJSON(sourcePath);
        if (sourceData) {
            const sourceKeys = this.getAllKeys(sourceData);
            this.validationReport.keyCounts[this.sourceLanguage] = sourceKeys.length;
            this.validationReport.lineCounts[this.sourceLanguage] = this.countLines(sourcePath);
            console.log(`✅ Source (${this.sourceLanguage}): ${sourceKeys.length} keys, ${this.validationReport.lineCounts[this.sourceLanguage]} lines`);
        }

        // Validate all languages
        let hasErrors = false;
        for (const language of this.languages) {
            console.log(`🔍 Validating ${language}...`);
            const valid = this.validateLanguage(language);
            
            if (valid) {
                console.log(`  ✅ ${language}: ${this.validationReport.keyCounts[language]} keys, ${this.validationReport.lineCounts[language]} lines`);
            } else {
                console.log(`  ❌ ${language}: Validation failed`);
                hasErrors = true;
            }
        }

        console.log();
        console.log('📊 Validation Summary');
        console.log('=====================');

        // Report duplicates
        const dupLanguages = Object.keys(this.validationReport.duplicates);
        if (dupLanguages.length > 0) {
            console.log('❌ Duplicates found:');
            dupLanguages.forEach(lang => {
                console.log(`  ${lang}: ${this.validationReport.duplicates[lang].length} duplicates`);
                this.validationReport.duplicates[lang].forEach(dup => console.log(`    - ${dup}`));
            });
            hasErrors = true;
        }

        // Report extra keys
        const extraLanguages = Object.keys(this.validationReport.extraKeys);
        if (extraLanguages.length > 0) {
            console.log('❌ Extra keys found:');
            extraLanguages.forEach(lang => {
                console.log(`  ${lang}: ${this.validationReport.extraKeys[lang].length} extra keys`);
                this.validationReport.extraKeys[lang].slice(0, 5).forEach(key => console.log(`    - ${key}`));
                if (this.validationReport.extraKeys[lang].length > 5) {
                    console.log(`    ... and ${this.validationReport.extraKeys[lang].length - 5} more`);
                }
            });
            hasErrors = true;
        }

        // Report missing keys
        const missingLanguages = Object.keys(this.validationReport.missingKeys);
        if (missingLanguages.length > 0) {
            console.log('❌ Missing keys found:');
            missingLanguages.forEach(lang => {
                console.log(`  ${lang}: ${this.validationReport.missingKeys[lang].length} missing keys`);
                this.validationReport.missingKeys[lang].slice(0, 5).forEach(key => console.log(`    - ${key}`));
                if (this.validationReport.missingKeys[lang].length > 5) {
                    console.log(`    ... and ${this.validationReport.missingKeys[lang].length - 5} more`);
                }
            });
            hasErrors = true;
        }

        // Report structure errors
        const errorLanguages = Object.keys(this.validationReport.structureErrors);
        if (errorLanguages.length > 0) {
            console.log('❌ Structure errors:');
            errorLanguages.forEach(lang => {
                console.log(`  ${lang}: ${this.validationReport.structureErrors[lang].join(', ')}`);
            });
            hasErrors = true;
        }

        // Key count consistency check
        const counts = Object.values(this.validationReport.keyCounts);
        const uniqueCounts = [...new Set(counts)];
        if (uniqueCounts.length > 1) {
            console.log('❌ Inconsistent key counts:');
            Object.entries(this.validationReport.keyCounts).forEach(([lang, count]) => {
                console.log(`  ${lang}: ${count} keys`);
            });
            hasErrors = true;
        } else if (uniqueCounts.length === 1) {
            console.log(`✅ All languages have ${uniqueCounts[0]} keys`);
        }

        // Line count comparison
        console.log('📋 Line counts:');
        Object.entries(this.validationReport.lineCounts).forEach(([lang, count]) => {
            console.log(`  ${lang}: ${count} lines`);
        });

        if (!hasErrors) {
            console.log('🎉 All validation checks passed! Ready for v1.6.0');
        } else {
            console.log('❌ Validation failed. Please fix issues before shipping v1.6.0');
        }

        return !hasErrors;
    }
}

// Run validation
if (require.main === module) {
    const validator = new UILocalesValidator();
    validator.validateAll().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = UILocalesValidator;