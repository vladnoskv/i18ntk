#!/usr/bin/env node

/**
 * Language Purity Validator
 * 
 * This script validates that each locale file contains only content in its native language.
 * It can be integrated into CI/CD pipelines and development workflows.
 */

const fs = require('fs');
const path = require('path');
const i18n = require('./i18n-helper');

class LanguagePurityValidator {
    constructor() {
        this.localesDir = path.join(__dirname, 'ui-locales');
        this.sourceLanguage = 'en';
        this.exitCode = 0;
        
        // Language validation rules
        this.validationRules = {
            de: {
                name: i18n.t('validateLanguagePurity.language_german'),
                allowedMarkers: [], // No markers should remain
                forbiddenMarkers: ['[TRANSLATE]', '[DE]', '[NOT TRANSLATED]'],
                forbiddenPhrases: [
                    i18n.t('validateLanguagePurity.phrase_debug_tools'), i18n.t('validateLanguagePurity.phrase_settings'), i18n.t('validateLanguagePurity.phrase_configuration'), i18n.t('validateLanguagePurity.phrase_invalid_choice'),
                    i18n.t('validateLanguagePurity.phrase_please_select'), i18n.t('validateLanguagePurity.phrase_back_to_main_menu'), i18n.t('validateLanguagePurity.phrase_error'), i18n.t('validateLanguagePurity.phrase_warning'),
                    i18n.t('validateLanguagePurity.phrase_success'), i18n.t('validateLanguagePurity.phrase_failed'), i18n.t('validateLanguagePurity.phrase_loading'), i18n.t('validateLanguagePurity.phrase_saving'), i18n.t('validateLanguagePurity.phrase_full_system_debug'),
                    i18n.t('validateLanguagePurity.phrase_configuration_debug'), i18n.t('validateLanguagePurity.phrase_translation_debug'), i18n.t('validateLanguagePurity.phrase_performance_debug'),
                    i18n.t('validateLanguagePurity.phrase_admin_pin_setup'), i18n.t('validateLanguagePurity.phrase_enter_admin_pin'), i18n.t('validateLanguagePurity.phrase_confirm_admin_pin'),
                    i18n.t('validateLanguagePurity.phrase_authentication_failed'), i18n.t('validateLanguagePurity.phrase_access_denied'), i18n.t('validateLanguagePurity.phrase_security_log')
                ],
                requiredCharacteristics: {
                    // German-specific characteristics
                    hasGermanArticles: ['der', 'die', 'das', 'ein', 'eine'],
                    hasGermanConjunctions: ['und', 'oder', 'aber'],
                    hasGermanPrepositions: ['mit', 'von', 'zu', 'für', 'auf', 'in', 'an']
                }
            },
            fr: {
                name: i18n.t('validateLanguagePurity.language_french'),
                allowedMarkers: [],
                forbiddenMarkers: ['[TRANSLATE]', '[FR]', '[NOT TRANSLATED]'],
                forbiddenPhrases: [
                    i18n.t('validateLanguagePurity.phrase_debug_tools'), i18n.t('validateLanguagePurity.phrase_settings'), i18n.t('validateLanguagePurity.phrase_configuration'), i18n.t('validateLanguagePurity.phrase_invalid_choice'),
                    i18n.t('validateLanguagePurity.phrase_please_select'), i18n.t('validateLanguagePurity.phrase_back_to_main_menu'), i18n.t('validateLanguagePurity.phrase_error'), i18n.t('validateLanguagePurity.phrase_warning'),
                    i18n.t('validateLanguagePurity.phrase_success'), i18n.t('validateLanguagePurity.phrase_failed'), i18n.t('validateLanguagePurity.phrase_loading'), i18n.t('validateLanguagePurity.phrase_saving'), i18n.t('validateLanguagePurity.phrase_full_system_debug'),
                    i18n.t('validateLanguagePurity.phrase_configuration_debug'), i18n.t('validateLanguagePurity.phrase_translation_debug'), i18n.t('validateLanguagePurity.phrase_performance_debug'),
                    i18n.t('validateLanguagePurity.phrase_admin_pin_setup'), i18n.t('validateLanguagePurity.phrase_enter_admin_pin'), i18n.t('validateLanguagePurity.phrase_confirm_admin_pin'),
                    i18n.t('validateLanguagePurity.phrase_authentication_failed'), i18n.t('validateLanguagePurity.phrase_access_denied'), i18n.t('validateLanguagePurity.phrase_security_log')
                ],
                requiredCharacteristics: {
                    // French-specific characteristics
                    hasFrenchArticles: ['le', 'la', 'les', 'un', 'une', 'des'],
                    hasFrenchConjunctions: ['et', 'ou', 'mais'],
                    hasFrenchPrepositions: ['de', 'du', 'pour', 'sur', 'dans', 'par', 'avec']
                }
            },
            es: {
                name: i18n.t('validateLanguagePurity.language_spanish'),
                allowedMarkers: [],
                forbiddenMarkers: ['[TRANSLATE]', '[ES]', '[NOT TRANSLATED]'],
                forbiddenPhrases: [
                    i18n.t('validateLanguagePurity.phrase_debug_tools'), i18n.t('validateLanguagePurity.phrase_settings'), i18n.t('validateLanguagePurity.phrase_configuration'), i18n.t('validateLanguagePurity.phrase_invalid_choice'),
                    i18n.t('validateLanguagePurity.phrase_please_select'), i18n.t('validateLanguagePurity.phrase_back_to_main_menu'), i18n.t('validateLanguagePurity.phrase_error'), i18n.t('validateLanguagePurity.phrase_warning'),
                    i18n.t('validateLanguagePurity.phrase_success'), i18n.t('validateLanguagePurity.phrase_failed'), i18n.t('validateLanguagePurity.phrase_loading'), i18n.t('validateLanguagePurity.phrase_saving'), i18n.t('validateLanguagePurity.phrase_full_system_debug'),
                    i18n.t('validateLanguagePurity.phrase_configuration_debug'), i18n.t('validateLanguagePurity.phrase_translation_debug'), i18n.t('validateLanguagePurity.phrase_performance_debug'),
                    i18n.t('validateLanguagePurity.phrase_admin_pin_setup'), i18n.t('validateLanguagePurity.phrase_enter_admin_pin'), i18n.t('validateLanguagePurity.phrase_confirm_admin_pin'),
                    i18n.t('validateLanguagePurity.phrase_authentication_failed'), i18n.t('validateLanguagePurity.phrase_access_denied'), i18n.t('validateLanguagePurity.phrase_security_log')
                ],
                requiredCharacteristics: {
                    // Spanish-specific characteristics
                    hasSpanishArticles: ['el', 'la', 'los', 'las', 'un', 'una'],
                    hasSpanishConjunctions: ['y', 'o', 'pero'],
                    hasSpanishPrepositions: ['de', 'del', 'para', 'por', 'en', 'a', 'con']
                }
            },
            ru: {
                name: i18n.t('validateLanguagePurity.language_russian'),
                allowedMarkers: [],
                forbiddenMarkers: ['[TRANSLATE]', '[RU]', '[NOT TRANSLATED]'],
                forbiddenPhrases: [
                    i18n.t('validateLanguagePurity.phrase_debug_tools'), i18n.t('validateLanguagePurity.phrase_settings'), i18n.t('validateLanguagePurity.phrase_configuration'), i18n.t('validateLanguagePurity.phrase_invalid_choice'),
                    i18n.t('validateLanguagePurity.phrase_please_select'), i18n.t('validateLanguagePurity.phrase_back_to_main_menu'), i18n.t('validateLanguagePurity.phrase_error'), i18n.t('validateLanguagePurity.phrase_warning'),
                    i18n.t('validateLanguagePurity.phrase_success'), i18n.t('validateLanguagePurity.phrase_failed'), i18n.t('validateLanguagePurity.phrase_loading'), i18n.t('validateLanguagePurity.phrase_saving'), i18n.t('validateLanguagePurity.phrase_full_system_debug'),
                    i18n.t('validateLanguagePurity.phrase_configuration_debug'), i18n.t('validateLanguagePurity.phrase_translation_debug'), i18n.t('validateLanguagePurity.phrase_performance_debug'),
                    i18n.t('validateLanguagePurity.phrase_admin_pin_setup'), i18n.t('validateLanguagePurity.phrase_enter_admin_pin'), i18n.t('validateLanguagePurity.phrase_confirm_admin_pin'),
                    i18n.t('validateLanguagePurity.phrase_authentication_failed'), i18n.t('validateLanguagePurity.phrase_access_denied'), i18n.t('validateLanguagePurity.phrase_security_log')
                ],
                requiredCharacteristics: {
                    // Russian-specific characteristics (Cyrillic)
                    hasCyrillic: true
                }
            },
            ja: {
                name: i18n.t('validateLanguagePurity.language_japanese'),
                allowedMarkers: [],
                forbiddenMarkers: ['[TRANSLATE]', '[JA]', '[NOT TRANSLATED]'],
                forbiddenPhrases: [
                    i18n.t('validateLanguagePurity.phrase_debug_tools'), i18n.t('validateLanguagePurity.phrase_settings'), i18n.t('validateLanguagePurity.phrase_configuration'), i18n.t('validateLanguagePurity.phrase_invalid_choice'),
                    i18n.t('validateLanguagePurity.phrase_please_select'), i18n.t('validateLanguagePurity.phrase_back_to_main_menu'), i18n.t('validateLanguagePurity.phrase_error'), i18n.t('validateLanguagePurity.phrase_warning'),
                    i18n.t('validateLanguagePurity.phrase_success'), i18n.t('validateLanguagePurity.phrase_failed'), i18n.t('validateLanguagePurity.phrase_loading'), i18n.t('validateLanguagePurity.phrase_saving'), i18n.t('validateLanguagePurity.phrase_full_system_debug'),
                    i18n.t('validateLanguagePurity.phrase_configuration_debug'), i18n.t('validateLanguagePurity.phrase_translation_debug'), i18n.t('validateLanguagePurity.phrase_performance_debug'),
                    i18n.t('validateLanguagePurity.phrase_admin_pin_setup'), i18n.t('validateLanguagePurity.phrase_enter_admin_pin'), i18n.t('validateLanguagePurity.phrase_confirm_admin_pin'),
                    i18n.t('validateLanguagePurity.phrase_authentication_failed'), i18n.t('validateLanguagePurity.phrase_access_denied'), i18n.t('validateLanguagePurity.phrase_security_log')
                ],
                requiredCharacteristics: {
                    // Japanese-specific characteristics
                    hasJapanese: true // Hiragana, Katakana, or Kanji
                }
            },
            zh: {
                name: i18n.t('validateLanguagePurity.language_chinese'),
                allowedMarkers: [],
                forbiddenMarkers: ['[TRANSLATE]', '[ZH]', '[NOT TRANSLATED]'],
                forbiddenPhrases: [
                    i18n.t('validateLanguagePurity.phrase_debug_tools'), i18n.t('validateLanguagePurity.phrase_settings'), i18n.t('validateLanguagePurity.phrase_configuration'), i18n.t('validateLanguagePurity.phrase_invalid_choice'),
                    i18n.t('validateLanguagePurity.phrase_please_select'), i18n.t('validateLanguagePurity.phrase_back_to_main_menu'), i18n.t('validateLanguagePurity.phrase_error'), i18n.t('validateLanguagePurity.phrase_warning'),
                    i18n.t('validateLanguagePurity.phrase_success'), i18n.t('validateLanguagePurity.phrase_failed'), i18n.t('validateLanguagePurity.phrase_loading'), i18n.t('validateLanguagePurity.phrase_saving'), i18n.t('validateLanguagePurity.phrase_full_system_debug'),
                    i18n.t('validateLanguagePurity.phrase_configuration_debug'), i18n.t('validateLanguagePurity.phrase_translation_debug'), i18n.t('validateLanguagePurity.phrase_performance_debug'),
                    i18n.t('validateLanguagePurity.phrase_admin_pin_setup'), i18n.t('validateLanguagePurity.phrase_enter_admin_pin'), i18n.t('validateLanguagePurity.phrase_confirm_admin_pin'),
                    i18n.t('validateLanguagePurity.phrase_authentication_failed'), i18n.t('validateLanguagePurity.phrase_access_denied'), i18n.t('validateLanguagePurity.phrase_security_log')
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
        console.log(i18n.t('validateLanguagePurity.validator_title'));
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
            
            console.log(i18n.t('validateLanguagePurity.validating_file', { language: file.language, name: this.validationRules[file.language]?.name || file.language }));
            const fileResult = await this.validateFile(file);
            
            results.totalFiles++;
            results.fileResults[file.language] = fileResult;
            results.totalViolations += fileResult.violations.length;
            
            if (fileResult.isValid) {
                results.validFiles++;
                console.log(i18n.t('validateLanguagePurity.valid_file_message'));
            } else {
                results.invalidFiles++;
                console.log(i18n.t('validateLanguagePurity.invalid_file_message', { count: fileResult.violations.length }));
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
                    message: i18n.t('validateLanguagePurity.no_validation_rules', { language: file.language })
                });
                result.isValid = false;
                return result;
            }
            
            this.validateObject(translations, '', rules, result);
            
            result.isValid = result.violations.length === 0;
            
        } catch (error) {
            result.violations.push({
                type: 'file_error',
                message: i18n.t('validateLanguagePurity.error_reading_file', { errorMessage: error.message })
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
                    issue: i18n.t('validateLanguagePurity.issue_forbidden_marker', { marker }),
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
                    issue: i18n.t('validateLanguagePurity.issue_english_phrase', { phrase }),
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
                issue: i18n.t('validateLanguagePurity.issue_english_words', { words: foundEnglishWords.join(', ') }),
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
                    issue: i18n.t('validateLanguagePurity.issue_missing_cyrillic'),
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
                    issue: i18n.t('validateLanguagePurity.issue_missing_japanese'),
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
                    issue: i18n.t('validateLanguagePurity.issue_missing_chinese'),
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
        console.log(i18n.t('validateLanguagePurity.summary_title'));
        console.log('======================\n');
        
        console.log(i18n.t('validateLanguagePurity.overall_results_header'));
        console.log(i18n.t('validateLanguagePurity.total_files_validated', { count: results.totalFiles }));
        console.log(i18n.t('validateLanguagePurity.valid_files', { count: results.validFiles }));
        console.log(i18n.t('validateLanguagePurity.invalid_files', { count: results.invalidFiles }));
        console.log(i18n.t('validateLanguagePurity.total_violations', { count: results.totalViolations }));
        
        if (results.invalidFiles > 0) {
            console.log(i18n.t('validateLanguagePurity.violations_by_file_header'));
            
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
        const reportPath = path.join(__dirname, 'i18ntk-reports', 'language-purity', `language-purity-${timestamp}.json`);
        
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