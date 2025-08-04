#!/usr/bin/env node

/**
 * Console Translations Checker
 * Ensures the i18n-management-toolkit package itself has complete translation support
 * across all native languages in ui-locales directory.
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class ConsoleTranslationsChecker {
    constructor() {
        this.uiLocalesDir = path.join(__dirname, '..', '..', 'ui-locales');
        this.referenceLanguage = 'en';
        this.supportedLanguages = ['de', 'es', 'fr', 'ja', 'ru', 'zh'];
        this.results = {
            totalKeys: 0,
            languages: {},
            missingKeys: {},
            extraKeys: {},
            issues: []
        };
    }

    /**
     * Load and parse a JSON translation file
     */
    loadTranslationFile(language) {
        const filePath = path.join(this.uiLocalesDir, language, 'common.json');
        
        try {
            if (!fs.existsSync(filePath)) {
                throw new Error(`Translation file not found: ${filePath}`);
            }
            
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            this.results.issues.push(`❌ Error loading ${language}/common.json: ${error.message}`);
            return null;
        }
    }

    /**
     * Recursively extract all keys from a nested object
     */
    extractKeys(obj, prefix = '') {
        const keys = [];
        
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                keys.push(...this.extractKeys(value, fullKey));
            } else {
                keys.push(fullKey);
            }
        }
        
        return keys;
    }

    /**
     * Check if a translation value is empty or placeholder
     */
    isEmptyTranslation(value) {
        if (typeof value !== 'string') return false;
        
        const trimmed = value.trim();
        return trimmed === '' || 
               trimmed === 'TODO' || 
               trimmed === '[TODO]' ||
               trimmed.startsWith('[') && trimmed.endsWith(']');
    }

    /**
     * Count empty or incomplete translations in an object
     */
    countEmptyTranslations(obj, prefix = '') {
        let count = 0;
        
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                count += this.countEmptyTranslations(value, fullKey);
            } else if (this.isEmptyTranslation(value)) {
                count++;
            }
        }
        
        return count;
    }

    /**
     * Analyze translation completeness for all languages
     */
    analyzeTranslations() {
        console.log('🌐 CONSOLE TRANSLATIONS ANALYSIS');
        console.log('============================================================');
        console.log(`📁 UI Locales directory: ${this.uiLocalesDir}`);
        console.log(`🔤 Reference language: ${this.referenceLanguage}`);
        console.log('');

        // Load reference language (English)
        const referenceData = this.loadTranslationFile(this.referenceLanguage);
        if (!referenceData) {
            console.log(`❌ Cannot load reference language: ${this.referenceLanguage}`);
            return false;
        }

        const referenceKeys = this.extractKeys(referenceData);
        this.results.totalKeys = referenceKeys.length;
        
        console.log(`📊 Total translation keys in reference: ${referenceKeys.length}`);
        console.log('');

        // Analyze each supported language
        for (const language of this.supportedLanguages) {
            console.log(`🔍 Analyzing ${language}...`);
            
            const languageData = this.loadTranslationFile(language);
            if (!languageData) {
                this.results.languages[language] = {
                    status: 'error',
                    completeness: 0,
                    totalKeys: 0,
                    missingKeys: referenceKeys.length,
                    emptyTranslations: 0
                };
                continue;
            }

            const languageKeys = this.extractKeys(languageData);
            const missingKeys = referenceKeys.filter(key => !languageKeys.includes(key));
            const extraKeys = languageKeys.filter(key => !referenceKeys.includes(key));
            const emptyTranslations = this.countEmptyTranslations(languageData);
            
            const completeness = Math.round(((referenceKeys.length - missingKeys.length - emptyTranslations) / referenceKeys.length) * 100);
            
            this.results.languages[language] = {
                status: missingKeys.length === 0 && emptyTranslations === 0 ? 'complete' : 'incomplete',
                completeness,
                totalKeys: languageKeys.length,
                missingKeys: missingKeys.length,
                emptyTranslations,
                extraKeys: extraKeys.length
            };
            
            if (missingKeys.length > 0) {
                this.results.missingKeys[language] = missingKeys;
            }
            
            if (extraKeys.length > 0) {
                this.results.extraKeys[language] = extraKeys;
            }
            
            // Status icon
            const statusIcon = completeness === 100 ? '✅' : completeness >= 90 ? '⚠️' : '❌';
            console.log(`   ${statusIcon} ${language}: ${completeness}% complete (${languageKeys.length} keys, ${missingKeys.length} missing, ${emptyTranslations} empty)`);
        }
        
        return true;
    }

    /**
     * Generate detailed report
     */
    generateReport() {
        console.log('');
        console.log('📊 TRANSLATION COMPLETENESS SUMMARY');
        console.log('============================================================');
        
        const languageStats = [];
        let totalComplete = 0;
        
        for (const [language, stats] of Object.entries(this.results.languages)) {
            languageStats.push({
                language,
                completeness: stats.completeness,
                status: stats.status
            });
            
            if (stats.completeness === 100) {
                totalComplete++;
            }
        }
        
        // Sort by completeness
        languageStats.sort((a, b) => b.completeness - a.completeness);
        
        console.log(`🌍 Languages analyzed: ${this.supportedLanguages.length}`);
        console.log(`✅ Fully complete: ${totalComplete}/${this.supportedLanguages.length}`);
        console.log(`📊 Average completeness: ${Math.round(languageStats.reduce((sum, lang) => sum + lang.completeness, 0) / languageStats.length)}%`);
        console.log('');
        
        console.log('📋 LANGUAGE STATUS:');
        console.log('------------------------------------------------------------');
        for (const lang of languageStats) {
            const icon = lang.completeness === 100 ? '✅' : lang.completeness >= 90 ? '⚠️' : '❌';
            const status = lang.status === 'complete' ? 'Complete' : 'Incomplete';
            console.log(`${icon} ${lang.language.toUpperCase()}: ${lang.completeness}% - ${status}`);
        }
        
        // Show missing keys for incomplete languages
        const incompleteLanguages = Object.entries(this.results.languages)
            .filter(([, stats]) => stats.completeness < 100)
            .sort(([, a], [, b]) => b.completeness - a.completeness);
            
        if (incompleteLanguages.length > 0) {
            console.log('');
            console.log('⚠️  INCOMPLETE TRANSLATIONS:');
            console.log('------------------------------------------------------------');
            
            for (const [language, stats] of incompleteLanguages) {
                console.log(`\n🔤 ${language.toUpperCase()}:`);
                console.log(`   Missing keys: ${stats.missingKeys}`);
                console.log(`   Empty translations: ${stats.emptyTranslations}`);
                
                if (this.results.missingKeys[language] && this.results.missingKeys[language].length > 0) {
                    const sampleMissing = this.results.missingKeys[language].slice(0, 5);
                    console.log(`   Sample missing: ${sampleMissing.join(', ')}`);
                    if (this.results.missingKeys[language].length > 5) {
                        console.log(`   ... and ${this.results.missingKeys[language].length - 5} more`);
                    }
                }
            }
        }
        
        // Recommendations
        console.log('');
        console.log('💡 RECOMMENDATIONS:');
        console.log('------------------------------------------------------------');
        
        if (totalComplete === this.supportedLanguages.length) {
            console.log('🎉 Excellent! All console translations are complete.');
            console.log('✅ The i18n-management-toolkit package has full translation support.');
        } else {
            console.log('🔧 To achieve 100% translation coverage:');
            console.log('1. Complete missing translations in incomplete languages');
            console.log('2. Fill in empty translation values');
            console.log('3. Re-run this checker to verify improvements');
            console.log('');
            console.log('📝 Priority languages (lowest completeness first):');
            const priorityLangs = incompleteLanguages.slice(0, 3);
            for (const [language, stats] of priorityLangs) {
                console.log(`   • ${language}: ${stats.completeness}% complete`);
            }
        }
    }

    /**
     * Save detailed report to file
     */
    saveReport() {
        const reportDir = path.join(__dirname, 'reports');
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(reportDir, `console-translations-${timestamp}.json`);
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalKeys: this.results.totalKeys,
                languagesAnalyzed: this.supportedLanguages.length,
                fullyComplete: Object.values(this.results.languages).filter(lang => lang.completeness === 100).length,
                averageCompleteness: Math.round(Object.values(this.results.languages).reduce((sum, lang) => sum + lang.completeness, 0) / this.supportedLanguages.length)
            },
            languages: this.results.languages,
            missingKeys: this.results.missingKeys,
            extraKeys: this.results.extraKeys,
            issues: this.results.issues
        };
        
        try {
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            console.log('');
            console.log(`📄 Detailed report saved: ${reportPath}`);
        } catch (error) {
            console.log(`❌ Error saving report: ${error.message}`);
        }
    }

    /**
     * Run the complete analysis
     */
    async run() {
        const startTime = performance.now();
        
        console.log('🚀 Starting Console Translations Analysis...');
        console.log('');
        
        // Check if ui-locales directory exists
        if (!fs.existsSync(this.uiLocalesDir)) {
            console.log(`❌ UI locales directory not found: ${this.uiLocalesDir}`);
            return false;
        }
        
        // Run analysis
        const success = this.analyzeTranslations();
        if (!success) {
            return false;
        }
        
        // Generate and display report
        this.generateReport();
        
        // Save detailed report
        this.saveReport();
        
        const endTime = performance.now();
        console.log('');
        console.log(`⏱️  Analysis completed in ${Math.round(endTime - startTime)}ms`);
        
        return true;
    }
}

// Run the checker if called directly
if (require.main === module) {
    const checker = new ConsoleTranslationsChecker();
    checker.run().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    });
}

module.exports = ConsoleTranslationsChecker;