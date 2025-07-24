#!/usr/bin/env node

/**
 * Language Purity Validator
 * 
 * This script validates that each locale file contains only content in its native language.
 * It can be integrated into CI/CD pipelines and development workflows.
 */

const fs = require('fs');
const path = require('path');

class LanguagePurityValidator {
    constructor() {
        this.localesDir = path.join(__dirname, 'ui-locales');
        this.sourceLanguage = 'en';
        this.exitCode = 0;
        
        // Language validation rules
        this.validationRules = {
            de: {
                name: 'German',
                allowedMarkers: [], // No markers should remain
                forbiddenMarkers: ['[TRANSLATE]', '[DE]', '[NOT TRANSLATED]'],
                forbiddenPhrases: [
                    'debug tools', 'settings', 'configuration', 'invalid choice',
                    'please select', 'back to main menu', 'error', 'warning',
                    'success', 'failed', 'loading', 'saving', 'full system debug',
                    'configuration debug', 'translation debug', 'performance debug',
                    'admin pin setup', 'enter admin pin', 'confirm admin pin',
                    'authentication failed', 'access denied', 'security log'
                ],
                requiredCharacteristics: {
                    // German-specific characteristics
                    hasGermanArticles: ['der', 'die', 'das', 'ein', 'eine'],
                    hasGermanConjunctions: ['und', 'oder', 'aber'],
                    hasGermanPrepositions: ['mit', 'von', 'zu', 'für', 'auf', 'in', 'an']
                }
            },
            fr: {
                name: 'French',
                allowedMarkers: [],
                forbiddenMarkers: ['[TRANSLATE]', '[FR]', '[NOT TRANSLATED]'],
                forbiddenPhrases: [
                    'debug tools', 'settings', 'configuration', 'invalid choice',
                    'please select', 'back to main menu', 'error', 'warning',
                    'success', 'failed', 'loading', 'saving', 'full system debug',
                    'configuration debug', 'translation debug', 'performance debug',
                    'admin pin setup', 'enter admin pin', 'confirm admin pin',
                    'authentication failed', 'access denied', 'security log'
                ],
                requiredCharacteristics: {
                    // French-specific characteristics
                    hasFrenchArticles: ['le', 'la', 'les', 'un', 'une', 'des'],
                    hasFrenchConjunctions: ['et', 'ou', 'mais'],
                    hasFrenchPrepositions: ['de', 'du', 'pour', 'sur', 'dans', 'par', 'avec']
                }
            },
            es: {
                name: 'Spanish',
                allowedMarkers: [],
                forbiddenMarkers: ['[TRANSLATE]', '[ES]', '[NOT TRANSLATED]'],
                forbiddenPhrases: [
                    'debug tools', 'settings', 'configuration', 'invalid choice',
                    'please select', 'back to main menu', 'error', 'warning',
                    'success', 'failed', 'loading', 'saving', 'full system debug',
                    'configuration debug', 'translation debug', 'performance debug',
                    'admin pin setup', 'enter admin pin', 'confirm admin pin',
                    'authentication failed', 'access denied', 'security log'
                ],
                requiredCharacteristics: {
                    // Spanish-specific characteristics
                    hasSpanishArticles: ['el', 'la', 'los', 'las', 'un', 'una'],
                    hasSpanishConjunctions: ['y', 'o', 'pero'],
                    hasSpanishPrepositions: ['de', 'del', 'para', 'por', 'en', 'a', 'con']
                }
            },
            ru: {
                name: 'Russian',
                allowedMarkers: [],
                forbiddenMarkers: ['[TRANSLATE]', '[RU]', '[NOT TRANSLATED]'],
                forbiddenPhrases: [
                    'debug tools', 'settings', 'configuration', 'invalid choice',
                    'please select', 'back to main menu', 'error', 'warning',
                    'success', 'failed', 'loading', 'saving', 'full system debug',
                    'configuration debug', 'translation debug', 'performance debug',
                    'admin pin setup', 'enter admin pin', 'confirm admin pin',
                    'authentication failed', 'access denied', 'security log'
                ],
                requiredCharacteristics: {
                    // Russian-specific characteristics (Cyrillic)
                    hasCyrillic: true
                }
            },
            ja: {
                name: 'Japanese',
                allowedMarkers: [],
                forbiddenMarkers: ['[TRANSLATE]', '[JA]', '[NOT TRANSLATED]'],
                forbiddenPhrases: [
                    'debug tools', 'settings', 'configuration', 'invalid choice',
                    'please select', 'back to main menu', 'error', 'warning',
                    'success', 'failed', 'loading', 'saving', 'full system debug',
                    'configuration debug', 'translation debug', 'performance debug',
                    'admin pin setup', 'enter admin pin', 'confirm admin pin',
                    'authentication failed', 'access denied', 'security log'
                ],
                requiredCharacteristics: {
                    // Japanese-specific characteristics
                    hasJapanese: true // Hiragana, Katakana, or Kanji
                }
            },
            zh: {
                name: 'Chinese',
                allowedMarkers: [],
                forbiddenMarkers: ['[TRANSLATE]', '[ZH]', '[NOT TRANSLATED]'],
                forbiddenPhrases: [
                    'debug tools', 'settings', 'configuration', 'invalid choice',
                    'please select', 'back to main menu', 'error', 'warning',
                    'success', 'failed', 'loading', 'saving', 'full system debug',
                    'configuration debug', 'translation debug', 'performance debug',
                    'admin pin setup', 'enter admin pin', 'confirm admin pin',
                    'authentication failed', 'access denied', 'security log'
                ],
                requiredCharacteristics: {
                    // Chinese-specific characteristics
                    hasChinese: true // Chinese characters
                }
            }
        };
    }

    /**
     * Validate all locale files
     */
    async validateAll() {
        console.log('🔍 Language Purity Validator');
        console.log('=============================\n');
        
        const localeFiles = this.getLocaleFiles();
        const results = {
            totalFiles: 0,
            validFiles: 0,
            invalidFiles: 0,
            totalViolations: 0,
            fileResults: {}
        };
        
        for (const file of localeFiles) {
            if (file.language === this.sourceLanguage) {
                continue; // Skip source language
            }
            
            console.log(`📄 Validating ${file.language}.json (${this.validationRules[file.language]?.name || file.language})...`);
            const fileResult = await this.validateFile(file);
            
            results.totalFiles++;
            results.fileResults[file.language] = fileResult;
            results.totalViolations += fileResult.violations.length;
            
            if (fileResult.isValid) {
                results.validFiles++;
                console.log(`   ✅ Valid - No language purity violations`);
            } else {
                results.invalidFiles++;
                console.log(`   ❌ Invalid - ${fileResult.violations.length} violation(s) found`);
                this.exitCode = 1;
            }
        }
        
        this.generateSummary(results);
        return results;
    }

    /**
     * Get all locale files
     */
    getLocaleFiles() {
        return fs.readdirSync(this.localesDir)
            .filter(file => file.endsWith('.json'))
            .map(file => ({
                filename: file,
                language: path.basename(file, '.json'),
                path: path.join(this.localesDir, file)
            }));
    }

    /**
     * Validate a single file
     */
    async validateFile(file) {
        const result = {
            filename: file.filename,
            language: file.language,
            isValid: true,
            violations: [],
            stats: {
                totalKeys: 0,
                validKeys: 0,
                invalidKeys: 0
            }
        };
        
        try {
            const content = fs.readFileSync(file.path, 'utf8');
            const translations = JSON.parse(content);
            const rules = this.validationRules[file.language];
            
            if (!rules) {
                result.violations.push({
                    type: 'no_validation_rules',
                    message: `No validation rules defined for language: ${file.language}`
                });
                result.isValid = false;
                return result;
            }
            
            this.validateObject(translations, '', rules, result);
            
            result.isValid = result.violations.length === 0;
            
        } catch (error) {
            result.violations.push({
                type: 'file_error',
                message: `Error reading file: ${error.message}`
            });
            result.isValid = false;
        }
        
        return result;
    }

    /**
     * Recursively validate object properties
     */
    validateObject(obj, keyPath, rules, result) {
        for (const [key, value] of Object.entries(obj)) {
            const currentPath = keyPath ? `${keyPath}.${key}` : key;
            
            if (typeof value === 'string') {
                result.stats.totalKeys++;
                const violations = this.validateString(value, currentPath, rules);
                
                if (violations.length > 0) {
                    result.violations.push(...violations);
                    result.stats.invalidKeys++;
                } else {
                    result.stats.validKeys++;
                }
            } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                this.validateObject(value, currentPath, rules, result);
            } else if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    if (typeof item === 'string') {
                        result.stats.totalKeys++;
                        const violations = this.validateString(item, `${currentPath}[${index}]`, rules);
                        
                        if (violations.length > 0) {
                            result.violations.push(...violations);
                            result.stats.invalidKeys++;
                        } else {
                            result.stats.validKeys++;
                        }
                    }
                });
            }
        }
    }

    /**
     * Validate a single string
     */
    validateString(text, keyPath, rules) {
        const violations = [];
        const lowerText = text.toLowerCase();
        
        // Check for forbidden markers
        for (const marker of rules.forbiddenMarkers) {
            if (text.includes(marker)) {
                violations.push({
                    type: 'forbidden_marker',
                    key: keyPath,
                    value: text,
                    issue: `Contains forbidden marker: ${marker}`,
                    severity: 'error'
                });
            }
        }
        
        // Check for forbidden phrases
        for (const phrase of rules.forbiddenPhrases) {
            if (lowerText.includes(phrase.toLowerCase())) {
                violations.push({
                    type: 'forbidden_phrase',
                    key: keyPath,
                    value: text,
                    issue: `Contains English phrase: "${phrase}"`,
                    severity: 'error'
                });
            }
        }
        
        // Check for common English words that shouldn't be in foreign languages
        const englishWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        const foundEnglishWords = [];
        
        for (const word of englishWords) {
            const regex = new RegExp(`\\b${word}\\b`, 'i');
            if (regex.test(text)) {
                foundEnglishWords.push(word);
            }
        }
        
        if (foundEnglishWords.length > 0) {
            violations.push({
                type: 'english_words',
                key: keyPath,
                value: text,
                issue: `Contains English words: ${foundEnglishWords.join(', ')}`,
                severity: 'warning'
            });
        }
        
        // Language-specific validation
        if (rules.requiredCharacteristics) {
            const langViolations = this.validateLanguageCharacteristics(text, keyPath, rules.requiredCharacteristics);
            violations.push(...langViolations);
        }
        
        return violations;
    }

    /**
     * Validate language-specific characteristics
     */
    validateLanguageCharacteristics(text, keyPath, characteristics) {
        const violations = [];
        
        // Check for Cyrillic (Russian)
        if (characteristics.hasCyrillic) {
            const hasCyrillicChars = /[а-яё]/i.test(text);
            if (!hasCyrillicChars && text.length > 10) { // Only check longer strings
                violations.push({
                    type: 'missing_cyrillic',
                    key: keyPath,
                    value: text,
                    issue: 'Long text should contain Cyrillic characters for Russian',
                    severity: 'warning'
                });
            }
        }
        
        // Check for Japanese characters
        if (characteristics.hasJapanese) {
            const hasJapaneseChars = /[ひらがなカタカナ一-龯]/u.test(text);
            if (!hasJapaneseChars && text.length > 10) {
                violations.push({
                    type: 'missing_japanese',
                    key: keyPath,
                    value: text,
                    issue: 'Long text should contain Japanese characters',
                    severity: 'warning'
                });
            }
        }
        
        // Check for Chinese characters
        if (characteristics.hasChinese) {
            const hasChineseChars = /[\u4e00-\u9fff]/u.test(text);
            if (!hasChineseChars && text.length > 10) {
                violations.push({
                    type: 'missing_chinese',
                    key: keyPath,
                    value: text,
                    issue: 'Long text should contain Chinese characters',
                    severity: 'warning'
                });
            }
        }
        
        return violations;
    }

    /**
     * Generate validation summary
     */
    generateSummary(results) {
        console.log('\n📊 VALIDATION SUMMARY');
        console.log('======================\n');
        
        console.log(`📋 Overall Results:`);
        console.log(`   Total files validated: ${results.totalFiles}`);
        console.log(`   Valid files: ${results.validFiles}`);
        console.log(`   Invalid files: ${results.invalidFiles}`);
        console.log(`   Total violations: ${results.totalViolations}\n`);
        
        if (results.invalidFiles > 0) {
            console.log('❌ VIOLATIONS BY FILE:\n');
            
            for (const [language, fileResult] of Object.entries(results.fileResults)) {
                if (!fileResult.isValid) {
                    console.log(`📄 ${fileResult.filename}:`);
                    console.log(`   Total keys: ${fileResult.stats.totalKeys}`);
                    console.log(`   Valid keys: ${fileResult.stats.validKeys}`);
                    console.log(`   Invalid keys: ${fileResult.stats.invalidKeys}`);
                    console.log(`   Violations: ${fileResult.violations.length}\n`);
                    
                    // Show first 10 violations
                    const violationsToShow = fileResult.violations.slice(0, 10);
                    violationsToShow.forEach((violation, index) => {
                        const severity = violation.severity === 'error' ? '❌' : '⚠️';
                        console.log(`   ${index + 1}. ${severity} ${violation.key}`);
                        console.log(`      Issue: ${violation.issue}`);
                        if (violation.value.length > 100) {
                            console.log(`      Value: "${violation.value.substring(0, 100)}..."`);
                        } else {
                            console.log(`      Value: "${violation.value}"`);
                        }
                        console.log('');
                    });
                    
                    if (fileResult.violations.length > 10) {
                        console.log(`   ... and ${fileResult.violations.length - 10} more violations\n`);
                    }
                }
            }
        } else {
            console.log('✅ All locale files passed language purity validation!\n');
        }
        
        // Recommendations
        if (results.totalViolations > 0) {
            console.log('💡 RECOMMENDATIONS:\n');
            console.log('1. Translate all entries marked with [TRANSLATE] or [NOT TRANSLATED]');
            console.log('2. Remove language prefixes like [DE], [FR], [ES], etc.');
            console.log('3. Replace English text with proper native language translations');
            console.log('4. Use language-appropriate characters and writing systems');
            console.log('5. Run automated translation tools to fix common issues');
            console.log('6. Integrate this validator into your CI/CD pipeline\n');
        }
        
        // Save detailed report
        this.saveValidationReport(results);
    }

    /**
     * Save validation report
     */
    saveValidationReport(results) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(__dirname, 'i18n-reports', 'language-purity', `language-purity-${timestamp}.json`);
        
        // Ensure directory exists
        const reportDir = path.dirname(reportPath);
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalFiles: results.totalFiles,
                validFiles: results.validFiles,
                invalidFiles: results.invalidFiles,
                totalViolations: results.totalViolations,
                overallValid: results.invalidFiles === 0
            },
            fileResults: results.fileResults,
            recommendations: [
                'Translate all entries marked with [TRANSLATE] or [NOT TRANSLATED]',
                'Remove language prefixes like [DE], [FR], [ES], etc.',
                'Replace English text with proper native language translations',
                'Use language-appropriate characters and writing systems',
                'Run automated translation tools to fix common issues',
                'Integrate this validator into your CI/CD pipeline'
            ]
        };
        
        try {
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            console.log(`📄 Detailed validation report saved to: ${reportPath}\n`);
        } catch (error) {
            console.error(`❌ Error saving validation report: ${error.message}\n`);
        }
    }

    /**
     * Get exit code for CI/CD integration
     */
    getExitCode() {
        return this.exitCode;
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const validator = new LanguagePurityValidator();
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Language Purity Validator

Usage:
  node validate-language-purity.js [options]

Options:
  --ci                 Run in CI mode (exit with error code if validation fails)
  --help, -h           Show this help message

Examples:
  node validate-language-purity.js                    # Validate all locale files
  node validate-language-purity.js --ci               # CI/CD integration mode

Exit Codes:
  0 - All validations passed
  1 - Validation failures found
`);
        process.exit(0);
    }
    
    validator.validateAll().then(() => {
        if (args.includes('--ci')) {
            process.exit(validator.getExitCode());
        }
    }).catch(error => {
        console.error('❌ Validation Error:', error.message);
        process.exit(1);
    });
}

module.exports = LanguagePurityValidator;