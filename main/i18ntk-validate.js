#!/usr/bin/env node
/**
 * I18N TRANSLATION VALIDATION TOOLKIT
 * 
 * This script validates translation files for completeness, consistency,
 * and structural integrity across all languages.
 * 
 * Usage:
 *   npm run i18ntk:validate
 *   npm run i18ntk:validate -- --strict
 *   npm run i18ntk:validate -- --language=de
 *   npm run i18ntk:validate -- --source-dir=./src/i18n/locales
 * 
 * Alternative direct usage:
 *   node i18ntk-validate.js
 */

const fs = require('fs');
const path = require('path');
const { loadTranslations, t } = require('../utils/i18n-helper');
const settingsManager = require('../settings/settings-manager');
const SecurityUtils = require('../utils/security');
const AdminCLI = require('../utils/admin-cli');

// Get configuration from settings manager
async function getConfig() {
  try {
    SecurityUtils.logSecurityEvent('config_access', 'info', 'Accessing configuration for validation');
    const settings = settingsManager.getSettings();
    const config = {
      sourceDir: settings.directories?.sourceDir || settings.sourceDir || './locales',
      sourceLanguage: settings.directories?.sourceLanguage || settings.sourceLanguage || 'en',
      notTranslatedMarker: settings.processing?.notTranslatedMarker || 'NOT_TRANSLATED',
      excludeFiles: settings.processing?.excludeFiles || ['.DS_Store', 'Thumbs.db'],
      strictMode: settings.processing?.strictMode || false,
      uiLanguage: settings.language || 'en'
    };
    
    // Validate configuration
    SecurityUtils.validateConfig(config);
    SecurityUtils.logSecurityEvent('config_validated', 'info', 'Configuration validated successfully');
    
    return config;
  } catch (error) {
    SecurityUtils.logSecurityEvent('config_error', 'error', `Configuration error: ${error.message}`);
    throw error;
  }
}

class I18nValidator {
  constructor(config = {}) {
    this.config = config;
    this.errors = [];
    this.warnings = [];
    this.t = null;
  }
  
  async initialize() {
    try {
      SecurityUtils.logSecurityEvent('validator_init', 'info', 'Initializing I18n validator');
      
      const defaultConfig = await getConfig();
      this.config = { ...defaultConfig, ...this.config };
      
      // Validate configuration values
      if (!this.config.sourceDir) {
        throw new Error('Source directory not configured');
      }
      
      if (!this.config.sourceLanguage) {
        throw new Error('Source language not configured');
      }
      
      // Validate and resolve paths
      const resolvedSourceDir = path.resolve(this.config.sourceDir);
      this.sourceDir = resolvedSourceDir;
      this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
      
      // Initialize i18n with UI language - FIX: Properly initialize translation function
      const uiLanguage = SecurityUtils.sanitizeInput(this.config.uiLanguage || 'en');
      loadTranslations(uiLanguage);
      this.t = t; // Assign the translation function
      
      // Verify translation function is working
      if (typeof this.t !== 'function') {
        throw new Error('Translation function not properly initialized');
      }
      
      SecurityUtils.logSecurityEvent('validator_initialized', 'info', 'I18n validator initialized successfully');
    } catch (error) {
      SecurityUtils.logSecurityEvent('validator_init_error', 'error', `Validator initialization error: ${error.message}`);
      throw error;
    }
  }

  // Parse command line arguments
  parseArgs() {
    try {
      SecurityUtils.logSecurityEvent('args_parsing', 'info', 'Parsing command line arguments');
      
      const args = process.argv.slice(2);
      const parsed = {};
      
      args.forEach(arg => {
        const sanitizedArg = SecurityUtils.sanitizeInput(arg);
        
        if (sanitizedArg.startsWith('--')) {
          const [key, value] = sanitizedArg.substring(2).split('=');
          const sanitizedKey = SecurityUtils.sanitizeInput(key);
          const sanitizedValue = value ? SecurityUtils.sanitizeInput(value) : true;
          
          if (sanitizedKey === 'language') {
            parsed.language = sanitizedValue;
          } else if (sanitizedKey === 'source-dir') {
            parsed.sourceDir = sanitizedValue;
          } else if (sanitizedKey === 'strict') {
            parsed.strictMode = true;
          } else if (sanitizedKey === 'ui-language') {
            parsed.uiLanguage = sanitizedValue;
          } else if (sanitizedKey === 'help') {
            parsed.help = true;
          } else if (sanitizedKey === 'setup-admin') {
            parsed.setupAdmin = true;
          } else if (sanitizedKey === 'disable-admin') {
            parsed.disableAdmin = true;
          } else if (sanitizedKey === 'admin-status') {
            parsed.adminStatus = true;
          } else if (['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'].includes(sanitizedKey)) {
            // Support shorthand language flags like --de, --fr, etc.
            parsed.uiLanguage = sanitizedKey;
          }
        }
      });
      
      SecurityUtils.logSecurityEvent('args_parsed', 'info', 'Command line arguments parsed successfully');
      return parsed;
    } catch (error) {
      SecurityUtils.logSecurityEvent('args_parse_error', 'error', `Argument parsing error: ${error.message}`);
      throw error;
    }
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
    try {
      SecurityUtils.logSecurityEvent('languages_scan', 'info', 'Scanning available languages');
      
      if (!fs.existsSync(this.sourceDir)) {
        throw new Error(`Source directory not found: ${this.sourceDir}`);
      }
      
      const languages = fs.readdirSync(this.sourceDir)
        .filter(item => {
          const itemPath = path.join(this.sourceDir, item);
          return fs.statSync(itemPath).isDirectory() && item !== this.config.sourceLanguage;
        });
      
      SecurityUtils.logSecurityEvent('languages_found', 'info', `Found ${languages.length} languages`);
      return languages;
    } catch (error) {
      SecurityUtils.logSecurityEvent('languages_scan_error', 'error', `Language scanning error: ${error.message}`);
      throw error;
    }
  }

  // Get all JSON files from a language directory
  getLanguageFiles(language) {
    try {
      const sanitizedLanguage = SecurityUtils.sanitizeInput(language);
      const languageDir = path.join(this.sourceDir, sanitizedLanguage);
      
      if (!fs.existsSync(languageDir)) {
        return [];
      }
      
      const files = fs.readdirSync(languageDir)
        .filter(file => {
          return file.endsWith('.json') && 
                 !this.config.excludeFiles.includes(file);
        });
      
      SecurityUtils.logSecurityEvent('files_scan', 'info', `Found ${files.length} files in ${sanitizedLanguage}`);
      return files;
    } catch (error) {
      SecurityUtils.logSecurityEvent('files_scan_error', 'error', `File scanning error: ${error.message}`);
      throw error;
    }
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
  async validateJsonSyntax(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = SecurityUtils.safeParseJSON(content);
      
      SecurityUtils.logSecurityEvent('json_validated', 'info', `JSON syntax validated: ${filePath}`);
      return { valid: true, data: parsed };
    } catch (error) {
      SecurityUtils.logSecurityEvent('json_validation_error', 'error', `JSON validation error: ${error.message}`);
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
  async validateLanguage(language) {
    try {
      SecurityUtils.logSecurityEvent('language_validation', 'info', `Validating language: ${language}`);
      
      const sanitizedLanguage = SecurityUtils.sanitizeInput(language);
      const languageDir = path.join(this.sourceDir, sanitizedLanguage);
      const sourceFiles = this.getLanguageFiles(this.config.sourceLanguage);
      const targetFiles = this.getLanguageFiles(sanitizedLanguage);
      
      const validation = {
        language: sanitizedLanguage,
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
          `Language directory missing: ${sanitizedLanguage}`,
          { language: sanitizedLanguage, expectedPath: languageDir }
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
      const sourceValidation = await this.validateJsonSyntax(sourceFilePath);
      const targetValidation = await this.validateJsonSyntax(targetFilePath);
      
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
          `Invalid JSON syntax in target file: ${sanitizedLanguage}/${fileName}`,
          { fileName, language: sanitizedLanguage, error: targetValidation.error }
        );
        validation.summary.syntaxErrors.push({ fileName, type: 'target', error: targetValidation.error });
        continue;
      }
      
      // Use parsed data from validation
      const sourceContent = sourceValidation.data;
      const targetContent = targetValidation.data;
      
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
    } catch (error) {
      SecurityUtils.logSecurityEvent('language_validation_error', 'error', {
        language: language,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      this.addError(
        `Language validation failed for ${language}: ${error.message}`,
        { language, error: error.message }
      );
      
      return {
        language: language,
        files: {},
        summary: {
          totalFiles: 0,
          validFiles: 0,
          totalKeys: 0,
          translatedKeys: 0,
          missingFiles: [],
          syntaxErrors: [],
          structuralIssues: [],
          translationIssues: [],
          percentage: 0
        }
      };
    }
  }

  // Check for unused translation keys (basic implementation)
  checkUnusedKeys(language) {
    // Note: For comprehensive unused key detection, use the dedicated
    // usage analysis script: i18ntk-usage.js
    const warnings = [];
    
    // This method provides basic validation only
    // For detailed usage analysis, run: node i18ntk-usage.js
    
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
      SecurityUtils.validatePath(reportPath);
      
      if (fs.existsSync(reportPath)) {
        fs.unlinkSync(reportPath);
        console.log(this.t('validateTranslations.deletedOldReport'));
        
        SecurityUtils.logSecurityEvent('file_deleted', 'info', {
          path: reportPath,
          timestamp: new Date().toISOString()
        });
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
      SecurityUtils.validatePath(this.sourceLanguageDir);
      
      if (!fs.existsSync(this.sourceLanguageDir)) {
        this.addError(
          `Source language directory not found: ${this.sourceLanguageDir}`,
          { sourceLanguage: this.config.sourceLanguage }
        );
        
        SecurityUtils.logSecurityEvent('validation_error', 'error', {
          error: 'Source language directory not found',
          path: this.sourceLanguageDir,
          timestamp: new Date().toISOString()
        });
        
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
        
        const validation = await this.validateLanguage(language);
        results[language] = validation;
        
        // Display summary
        const { summary } = validation;
        console.log(this.t('validateTranslations.filesCount', { count: summary.validFiles }));
        console.log(this.t('validateTranslations.keysCount', { count: summary.totalKeys }));
        console.log(this.t('validateTranslations.missingFilesCount', { count: summary.missingFiles.length }));
        console.log(this.t('validateTranslations.syntaxErrorsCount', { count: summary.syntaxErrors.length }));
        console.log(this.t('validateTranslations.translationPercentage', { percentage: summary.percentage, translated: summary.translatedKeys, total: summary.totalKeys }));
        console.log('');
      }
      
      // Overall summary
      const hasErrors = this.errors.length > 0;
      const hasWarnings = this.warnings.length > 0;
      
      console.log(this.t("validateTranslations.n_validation_summary"));
      console.log(this.t("validateTranslations.total_errors", { count: this.errors.length }));
      console.log(this.t("validateTranslations.total_warnings", { count: this.warnings.length }));
      
      // Show errors
      if (hasErrors) {
        console.log(this.t("validateTranslations.n_errors"));
        this.errors.forEach((error, index) => {
          console.log(`${index + 1}. ${error.message}`);
          if (error.details && Object.keys(error.details).length > 0) {
            console.log(`   Details: ${JSON.stringify(error.details, null, 2)}`);
          }
        });
        console.log('');
      }
      
      // Show warnings
      if (hasWarnings) {
        console.log(this.t("validateTranslations.n_warnings"));
        this.warnings.forEach((warning, index) => {
          console.log(`${index + 1}. ${warning.message}`);
          if (warning.details && Object.keys(warning.details).length > 0) {
            console.log(`   Details: ${JSON.stringify(warning.details, null, 2)}`);
          }
        });
        console.log('');
      }
      
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

  /**
   * Run method for compatibility with manager
   */
  async run() {
    try {
      console.log('🔍 Starting validation process...');
      SecurityUtils.logSecurityEvent('run_started', 'info', 'Starting validation run');

      await this.initialize();
      const result = await this.validate();

      console.log('✅ Validation process completed successfully');
      SecurityUtils.logSecurityEvent('run_completed', 'info', 'Validation run completed successfully');
      return result;
    } catch (error) {
      console.error('❌ Validation Error:', error.message);
      console.error('Stack trace:', error.stack);
      SecurityUtils.logSecurityEvent('run_error', 'error', `Validation run failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = I18nValidator;

if (require.main === module) {
  (async () => {
    try {
      SecurityUtils.logSecurityEvent('script_execution', 'info', {
        script: 'i18ntk-validate.js',
        timestamp: new Date().toISOString()
      });

      const validator = new I18nValidator();
      await validator.initialize();

      const args = validator.parseArgs();

      if (args.help) {
        validator.showHelp();
        process.exit(0);
      }

      if (args.setupAdmin) {
        await AdminCLI.setupAdmin();
        process.exit(0);
      }

      if (args.disableAdmin) {
        await AdminCLI.disableAdmin();
        process.exit(0);
      }

      if (args.adminStatus) {
        await AdminCLI.showStatus();
        process.exit(0);
      }

      if (AdminCLI.requiresAuth('validate')) {
        const authenticated = await AdminCLI.authenticate();
        if (!authenticated) {
          console.log('❌ Authentication failed. Access denied.');
          process.exit(1);
        }
      }

      const result = await validator.validate();

      SecurityUtils.logSecurityEvent('validation_completed', 'info', {
        success: result.success,
        errors: result.errors || 0,
        warnings: result.warnings || 0,
        timestamp: new Date().toISOString()
      });

      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error('❌ Fatal validation error:', error.message);
      console.error('Stack trace:', error.stack);
      SecurityUtils.logSecurityEvent('validation_error', 'error', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      process.exit(1);
    }
  })();
}