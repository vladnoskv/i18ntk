#!/usr/bin/env node
/**
 * I18N TRANSLATION VALIDATION SCRIPT
 * 
 * This script validates translation files for completeness, consistency,
 * and structural integrity across all languages.
 * 
 * Usage:
 *   node scripts/i18n/03-validate-translations.js
 *   node scripts/i18n/03-validate-translations.js --strict
 *   node scripts/i18n/03-validate-translations.js --language=de
 *   node scripts/i18n/03-validate-translations.js --source-dir=./src/i18n/locales
 */

const fs = require('fs');
const path = require('path');
const { loadTranslations, t } = require('./utils/i18n-helper');
const settingsManager = require('./settings-manager');

// Get configuration from settings manager
function getConfig() {
  const settings = settingsManager.getSettings();
  return {
    sourceDir: settings.directories?.sourceDir || './locales',
    sourceLanguage: settings.directories?.sourceLanguage || 'en',
    notTranslatedMarker: settings.processing?.notTranslatedMarker || '__NOT_TRANSLATED__',
    excludeFiles: settings.processing?.excludeFiles || ['.DS_Store', 'Thumbs.db'],
    strictMode: settings.processing?.strictMode || false
  };
}

class I18nValidator {
  constructor(config = {}) {
    this.config = { ...getConfig(), ...config };
    this.sourceDir = path.resolve(this.config.sourceDir);
    this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
    this.errors = [];
    this.warnings = [];
    
    // Initialize i18n with UI language
    const uiLanguage = this.config.uiLanguage || 'en';
    loadTranslations(uiLanguage);
    this.t = t;
  }

  // Parse command line arguments
  parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};
    
    args.forEach(arg => {
      if (arg.startsWith('--')) {
        const [key, value] = arg.substring(2).split('=');
        if (key === 'language') {
          parsed.language = value;
        } else if (key === 'source-dir') {
          parsed.sourceDir = value;
        } else if (key === 'strict') {
          parsed.strictMode = true;
        } else if (key === 'ui-language') {
          parsed.uiLanguage = value;
        } else if (key === 'help') {
          parsed.help = true;
        } else if (['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'].includes(key)) {
          // Support shorthand language flags like --de, --fr, etc.
          parsed.uiLanguage = key;
        }
      }
    });
    
    return parsed;
  }

  // Add error
  addError(message, details = {}) {
    this.errors.push({ message, details, type: 'error' });
  }

  // Add warning
  addWarning(message, details = {}) {
    this.warnings.push({ message, details, type: 'warning' });
  }

  // Get all available languages
  getAvailableLanguages() {
    if (!fs.existsSync(this.sourceDir)) {
      throw new Error(`Source directory not found: ${this.sourceDir}`);
    }
    
    return fs.readdirSync(this.sourceDir)
      .filter(item => {
        const itemPath = path.join(this.sourceDir, item);
        return fs.statSync(itemPath).isDirectory() && item !== this.config.sourceLanguage;
      });
  }

  // Get all JSON files from a language directory
  getLanguageFiles(language) {
    const languageDir = path.join(this.sourceDir, language);
    
    if (!fs.existsSync(languageDir)) {
      return [];
    }
    
    return fs.readdirSync(languageDir)
      .filter(file => {
        return file.endsWith('.json') && 
               !this.config.excludeFiles.includes(file);
      });
  }

  // Get all keys recursively from an object
  getAllKeys(obj, prefix = '') {
    const keys = new Set();
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.add(fullKey);
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nestedKeys = this.getAllKeys(value, fullKey);
        nestedKeys.forEach(k => keys.add(k));
      }
    }
    
    return keys;
  }

  // Get value by key path
  getValueByPath(obj, keyPath) {
    const keys = keyPath.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  // Validate JSON file syntax
  validateJsonSyntax(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      JSON.parse(content);
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error.message,
        line: error.message.match(/line (\d+)/)?.[1] || 'unknown'
      };
    }
  }

  // Validate structural consistency
  validateStructure(sourceObj, targetObj, language, fileName) {
    const sourceKeys = this.getAllKeys(sourceObj);
    const targetKeys = this.getAllKeys(targetObj);
    
    const missingKeys = [...sourceKeys].filter(key => !targetKeys.has(key));
    const extraKeys = [...targetKeys].filter(key => !sourceKeys.has(key));
    
    // Report missing keys as errors
    missingKeys.forEach(key => {
      this.addError(
        `Missing key in ${language}/${fileName}`,
        { key, language, fileName }
      );
    });
    
    // Report extra keys as warnings
    extraKeys.forEach(key => {
      this.addWarning(
        `Extra key in ${language}/${fileName}`,
        { key, language, fileName }
      );
    });
    
    return {
      isConsistent: missingKeys.length === 0 && extraKeys.length === 0,
      missingKeys,
      extraKeys,
      sourceKeyCount: sourceKeys.size,
      targetKeyCount: targetKeys.size
    };
  }

  // Validate translation completeness
  validateTranslations(obj, language, fileName, prefix = '') {
    let totalKeys = 0;
    let translatedKeys = 0;
    let issues = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nested = this.validateTranslations(value, language, fileName, fullKey);
        totalKeys += nested.totalKeys;
        translatedKeys += nested.translatedKeys;
        issues.push(...nested.issues);
      } else if (typeof value === 'string') {
        totalKeys++;
        
        if (value === this.config.notTranslatedMarker) {
          issues.push({
            type: 'not_translated',
            key: fullKey,
            value,
            language,
            fileName
          });
        } else if (value === '') {
          issues.push({
            type: 'empty_value',
            key: fullKey,
            value,
            language,
            fileName
          });
        } else if (value.includes(this.config.notTranslatedMarker)) {
          issues.push({
            type: 'partial_translation',
            key: fullKey,
            value,
            language,
            fileName
          });
        } else {
          translatedKeys++;
        }
      }
    }
    
    return { totalKeys, translatedKeys, issues };
  }

  // Validate a single language
  validateLanguage(language) {
    const languageDir = path.join(this.sourceDir, language);
    const sourceFiles = this.getLanguageFiles(this.config.sourceLanguage);
    const targetFiles = this.getLanguageFiles(language);
    
    const validation = {
      language,
      files: {},
      summary: {
        totalFiles: sourceFiles.length,
        validFiles: 0,
        totalKeys: 0,
        translatedKeys: 0,
        missingFiles: [],
        syntaxErrors: [],
        structuralIssues: [],
        translationIssues: []
      }
    };
    
    // Check for missing language directory
    if (!fs.existsSync(languageDir)) {
      this.addError(
        `Language directory missing: ${language}`,
        { language, expectedPath: languageDir }
      );
      return validation;
    }
    
    // Validate each file
    for (const fileName of sourceFiles) {
      const sourceFilePath = path.join(this.sourceLanguageDir, fileName);
      const targetFilePath = path.join(languageDir, fileName);
      
      // Check if source file exists
      if (!fs.existsSync(sourceFilePath)) {
        this.addWarning(
          `Source file missing: ${this.config.sourceLanguage}/${fileName}`,
          { fileName, language: this.config.sourceLanguage }
        );
        continue;
      }
      
      // Check if target file exists
      if (!fs.existsSync(targetFilePath)) {
        this.addError(
          `Translation file missing: ${language}/${fileName}`,
          { fileName, language, expectedPath: targetFilePath }
        );
        validation.summary.missingFiles.push(fileName);
        continue;
      }
      
      // Validate JSON syntax for both files
      const sourceValidation = this.validateJsonSyntax(sourceFilePath);
      const targetValidation = this.validateJsonSyntax(targetFilePath);
      
      if (!sourceValidation.valid) {
        this.addError(
          `Invalid JSON syntax in source file: ${this.config.sourceLanguage}/${fileName}`,
          { fileName, language: this.config.sourceLanguage, error: sourceValidation.error }
        );
        validation.summary.syntaxErrors.push({ fileName, type: 'source', error: sourceValidation.error });
        continue;
      }
      
      if (!targetValidation.valid) {
        this.addError(
          `Invalid JSON syntax in target file: ${language}/${fileName}`,
          { fileName, language, error: targetValidation.error }
        );
        validation.summary.syntaxErrors.push({ fileName, type: 'target', error: targetValidation.error });
        continue;
      }
      
      // Parse files
      const sourceContent = JSON.parse(fs.readFileSync(sourceFilePath, 'utf8'));
      const targetContent = JSON.parse(fs.readFileSync(targetFilePath, 'utf8'));
      
      // Validate structure
      const structural = this.validateStructure(sourceContent, targetContent, language, fileName);
      
      // Validate translations
      const translations = this.validateTranslations(targetContent, language, fileName);
      
      // Store file validation results
      validation.files[fileName] = {
        status: 'validated',
        structural,
        translations,
        sourceFilePath,
        targetFilePath
      };
      
      // Update summary
      validation.summary.validFiles++;
      validation.summary.totalKeys += translations.totalKeys;
      validation.summary.translatedKeys += translations.translatedKeys;
      
      if (!structural.isConsistent) {
        validation.summary.structuralIssues.push({
          fileName,
          missingKeys: structural.missingKeys.length,
          extraKeys: structural.extraKeys.length
        });
      }
      
      validation.summary.translationIssues.push(...translations.issues);
    }
    
    // Calculate completion percentage
    validation.summary.percentage = validation.summary.totalKeys > 0 
      ? Math.round((validation.summary.translatedKeys / validation.summary.totalKeys) * 100) 
      : 0;
    
    return validation;
  }

  // Check for unused translation keys (basic implementation)
  checkUnusedKeys(language) {
    // Note: For comprehensive unused key detection, use the dedicated
    // usage analysis script: 04-check-usage.js
    const warnings = [];
    
    // This method provides basic validation only
    // For detailed usage analysis, run: node 04-check-usage.js
    
    return warnings;
  }

  // Show help message
  showHelp() {
    console.log(this.t('validateTranslations.help_message'));
  }

  // Main validation process
  async validate() {
    try {
      console.log(this.t('validateTranslations.title'));
      console.log(this.t("validateTranslations.message"));
      
      // Delete old validation report if it exists
      const reportPath = path.join(process.cwd(), 'validation-report.txt');
      if (fs.existsSync(reportPath)) {
        fs.unlinkSync(reportPath);
        console.log(this.t('validateTranslations.deletedOldReport'));
      }
      
      // Parse command line arguments
      const args = this.parseArgs();
      
      // Handle UI language change
      if (args.uiLanguage) {
        loadTranslations(args.uiLanguage);
        this.t = t;
      }
      
      if (args.sourceDir) {
        this.config.sourceDir = args.sourceDir;
        this.sourceDir = path.resolve(this.config.sourceDir);
        this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
      }
      if (args.strictMode) {
        this.config.strictMode = true;
      }
      
      console.log(this.t('validateTranslations.sourceDirectory', { dir: this.sourceDir }));
      console.log(this.t("validateTranslations.source_language_thisconfigsour", { sourceLanguage: this.config.sourceLanguage }));
      console.log(this.t('validateTranslations.strictMode', { mode: this.config.strictMode ? 'ON' : 'OFF' }));
      
      // Validate source language directory exists
      if (!fs.existsSync(this.sourceLanguageDir)) {
        this.addError(
          `Source language directory not found: ${this.sourceLanguageDir}`,
          { sourceLanguage: this.config.sourceLanguage }
        );
        throw new Error('Source language directory not found');
      }
      
      // Get available languages
      const availableLanguages = this.getAvailableLanguages();
      
      if (availableLanguages.length === 0) {
        console.log(this.t('validateTranslations.noTargetLanguages'));
        return { success: true, message: 'No languages to validate' };
      }
      
      // Filter languages if specified
      const targetLanguages = args.language 
        ? [args.language].filter(lang => availableLanguages.includes(lang))
        : availableLanguages;
      
      if (targetLanguages.length === 0) {
        this.addError(
          `Specified language '${args.language}' not found`,
          { requestedLanguage: args.language, availableLanguages }
        );
        throw new Error('Specified language not found');
      }
      
      console.log(this.t('validateTranslations.validatingLanguages', { langs: targetLanguages.join(', ') }));
      
      const results = {};
      
      // Validate each language
      for (const language of targetLanguages) {
        console.log(this.t('validateTranslations.validatingLanguage', { lang: language }));
        
        const validation = this.validateLanguage(language);
        results[language] = validation;
        
        // Display summary
        const { summary } = validation;
        console.log(this.t('validateTranslations.filesCount', { count: summary.validFiles }));
        console.log(this.t('validateTranslations.keysCount', { count: summary.totalKeys }));
        console.log(this.t('validateTranslations.missingFilesCount', { count: summary.missingFiles.length }));
        console.log(this.t('validateTranslations.syntaxErrorsCount', { count: summary.syntaxErrors.length }));
        console.log(this.t('validateTranslations.structuralIssuesCount', { count: summary.structuralIssues.length }));
        console.log(this.t('validateTranslations.translationIssuesCount', { count: summary.translationIssues.length }));
      }
      
      // Overall validation summary
      console.log(this.t("validateTranslations.n"));
      console.log(this.t("validateTranslations.validation_summary"));
      console.log(this.t("validateTranslations.message"));
      
      const hasErrors = this.errors.length > 0;
      const hasWarnings = this.warnings.length > 0;
      
      if (!hasErrors && !hasWarnings) {
        console.log(this.t("validateTranslations.all_validations_passed_transla"));
      } else {
        if (hasErrors) {
          console.log(this.t("validateTranslations.errors_found"));
          this.errors.slice(0, 10).forEach((error, index) => {
            console.log(this.t("validateTranslations.index_1_errormessage", { index: index + 1, message: error.message }));
            if (error.details.key) {
              console.log(this.t("validateTranslations.key_errordetailskey", { key: error.details.key }));
            }
            if (error.details.fileName) {
              console.log(this.t("validateTranslations.file_errordetailsfilename", { fileName: error.details.fileName }));
            }
          });
          
          if (this.errors.length > 10) {
            console.log(this.t("validateTranslations.and_thiserrorslength_10_more_e", { count: this.errors.length - 10 }));
          }
        }
        
        if (hasWarnings && !this.config.strictMode) {
          console.log(this.t("validateTranslations.warnings_found"));
          this.warnings.slice(0, 5).forEach((warning, index) => {
            console.log(this.t("validateTranslations.index_1_warningmessage", { index: index + 1, message: warning.message }));
          });
          
          if (this.warnings.length > 5) {
            console.log(this.t("validateTranslations.and_thiswarningslength_5_more_", { count: this.warnings.length - 5 }));
          }
        }
      }
      
      // Language-specific results
      const sortedResults = Object.entries(results)
        .sort(([,a], [,b]) => b.summary.percentage - a.summary.percentage);
      
      console.log(this.t("validateTranslations.n_language_status"));
      console.log(this.t("validateTranslations.message"));
      
      sortedResults.forEach(([language, validation]) => {
        const { summary } = validation;
        const statusIcon = summary.percentage === 100 ? '✅' : summary.percentage >= 80 ? '🟡' : '🔴';
        const hasIssues = summary.missingFiles.length > 0 || 
                         summary.syntaxErrors.length > 0 || 
                         summary.structuralIssues.length > 0;
        
        console.log(this.t("validateTranslations.language_status", { statusIcon, language, percentage: summary.percentage, issues: hasIssues ? ' (has issues)' : '' }));
      });
      
      // Recommendations
      console.log(this.t("validateTranslations.n_recommendations"));
      console.log(this.t("validateTranslations.message"));
      
      if (hasErrors) {
        console.log(this.t("validateTranslations.fix_errors_first"));
        console.log(this.t("validateTranslations.1_resolve_missing_files_and_sy"));
        console.log(this.t("validateTranslations.2_fix_structural_inconsistenci"));
        console.log(this.t("validateTranslations.3_complete_missing_translation"));
        console.log(this.t("validateTranslations.4_rerun_validation"));
      } else if (hasWarnings) {
        console.log(this.t("validateTranslations.address_warnings"));
        console.log(this.t("validateTranslations.review_warnings"));
        console.log(this.t("validateTranslations.2_consider_running_with_strict"));
      } else {
        console.log(this.t("validateTranslations.all_validations_passed"));
        console.log(this.t("validateTranslations.consider_running_usage_analysi"));
      }
      
      // Exit with appropriate code
      const success = !hasErrors && (!hasWarnings || !this.config.strictMode);
      
      return {
        success,
        errors: this.errors.length,
        warnings: this.warnings.length,
        results
      };
      
    } catch (error) {
      console.error(this.t("validateTranslations.validation_failed", { error: error.message }));
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Run if called directly
if (require.main === module) {
  const validator = new I18nValidator();
  const args = validator.parseArgs();
  
  if (args.help) {
    validator.showHelp();
    process.exit(0);
  } else {
    validator.validate().then(result => {
      process.exit(result.success ? 0 : 1);
    });
  }
}

module.exports = I18nValidator;