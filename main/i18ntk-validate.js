#!/usr/bin/env node

// Check for uppercase command usage and provide helpful error
const commandLine = process.argv.join(' ');
const isUppercase = /NPX I18NTK|NPM I18NTK/i.test(commandLine);

if (isUppercase) {
  console.error('❌ Invalid command format detected!');
  console.error('');
  console.error('📝 Please use lowercase commands:');
  console.error('   npx i18ntk [command] [options]');
  console.error('   npm run i18ntk:[command]');
  console.error('');
  console.error('💡 Examples:');
  console.error('   npx i18ntk validate');
  console.error('   npx i18ntk init --languages=de,es');
  console.error('   npm run i18ntk:manage');
  console.error('');
  console.error('📖 For more information, run: npx i18ntk --help');
  process.exit(1);
}
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
loadTranslations(process.env.I18NTK_LANG || 'en');
const configManager = require('../utils/config-manager');
const SecurityUtils = require('../utils/security');
const AdminCLI = require('../utils/admin-cli');
const watchLocales = require('../utils/watch-locales');
const { getGlobalReadline, closeGlobalReadline } = require('../utils/cli');

const { getUnifiedConfig, parseCommonArgs, displayHelp, validateSourceDir, displayPaths } = require('../utils/config-helper');
const I18nInitializer = require('./i18ntk-init');

class I18nValidator {
  constructor(config = {}) {
    this.config = config;
    this.errors = [];
    this.warnings = [];
    this.rl = null;
  }
  
  async initialize() {
    try {
      // Initialize i18n with UI language first
      const args = this.parseArgs();
      if (args.help) {
        displayHelp('i18ntk-validate', {
          'setup-admin': 'Configure admin PIN protection',
          'disable-admin': 'Disable admin PIN protection',
          'admin-status': 'Check admin PIN status'
        });
        process.exit(0);
      }
      
      const baseConfig = await getUnifiedConfig('validate', args);
      this.config = { ...baseConfig, ...(this.config || {}) };
      
      const uiLanguage = (this.config && this.config.uiLanguage) || 'en';
      loadTranslations(uiLanguage, path.resolve(__dirname, '..', 'ui-locales'));
      
      SecurityUtils.logSecurityEvent('I18n validator initializing', 'info', 'Initializing I18n validator');
      
      // Use the i18n directory for language files
      this.sourceDir = this.config.i18nDir || this.config.sourceDir;
      this.i18nDir = this.config.i18nDir || this.config.sourceDir;
      this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
      
      try {
        validateSourceDir(this.sourceDir, 'i18ntk-validate');
      } catch (err) {
        console.log(t('init.requiredTitle'));
        console.log(t('init.requiredBody'));
        const answer = await this.prompt(t('init.promptRunNow'));
        if (answer.trim().toLowerCase() === 'y') {
          const initializer = new I18nInitializer(this.config);
          await initializer.run({ fromMenu: true });
        } else {
          console.warn(t('config.dirFallbackWarning', { dir: this.sourceDir, fallback: this.sourceLanguageDir }) ||
            `Warning: Directory ${this.sourceDir} not found. Using ${this.sourceLanguageDir}.`);
          if (!fs.existsSync(this.sourceLanguageDir)) {
            fs.mkdirSync(this.sourceLanguageDir, { recursive: true });
          }
        }
      }

      displayPaths({ sourceDir: this.sourceDir, i18nDir: this.i18nDir, outputDir: this.config.outputDir });
      
      SecurityUtils.logSecurityEvent('I18n validator initialized successfully', 'info', 'I18n validator initialized successfully');
    } catch (error) {
      SecurityUtils.logSecurityEvent('I18n validator initialization error', 'error', `Validator initialization error: ${error.message}`);
      throw error;
    }
  }

  initReadline() {
    return getGlobalReadline();

  }

  prompt(question) {
    return new Promise(resolve => {
      const rl = getGlobalReadline();
      rl.question(question, answer => {
        resolve(answer);
      });
    });
  }

  closeReadline() {
    closeGlobalReadline();
  }

  // Parse command line arguments
  parseArgs() {
    try {
      const baseArgs = parseCommonArgs(process.argv.slice(2));

      // Handle shorthand language flags
      const args = process.argv.slice(2);
      args.forEach(arg => {
        const sanitizedArg = SecurityUtils.sanitizeInput(arg);
        if (sanitizedArg.startsWith('--') && !sanitizedArg.includes('=')) {
          const key = sanitizedArg.substring(2);
          if (['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'].includes(key)) {
            baseArgs.uiLanguage = key;
          }
        }
      });

      return baseArgs;
    } catch (error) {
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
      if (!fs.existsSync(this.sourceDir)) {
        throw new Error(`Source directory not found: ${this.sourceDir}`);
      }
      
      const languages = fs.readdirSync(this.sourceDir)
        .filter(item => {
          const itemPath = path.join(this.sourceDir, item);
          return fs.statSync(itemPath).isDirectory() && item !== this.config.sourceLanguage;
        });
      
      return languages;
    } catch (error) {
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
      
      return files;
    } catch (error) {
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
      
      SecurityUtils.logSecurityEvent(t('validate.jsonValidated'), 'info', `JSON syntax validated: ${filePath}`);
      return { valid: true, data: parsed };
    } catch (error) {
      SecurityUtils.logSecurityEvent(t('validate.jsonValidationError'), 'error', `JSON validation error: ${error.message}`);
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
  validateTranslation(obj, language, fileName, prefix = '') {
    let totalKeys = 0;
    let translatedKeys = 0;
    let issues = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nested = this.validateTranslation(value, language, fileName, fullKey);
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
      SecurityUtils.logSecurityEvent(t('validate.languageValidation'), 'info', `Validating language: ${language}`);
      
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
      const translations = this.validateTranslation(targetContent, language, fileName);
      
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
      SecurityUtils.logSecurityEvent(t('validate.languageValidationError'), 'error', {
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
    console.log(t('validate.help_message'));
  }

  // Main validation process
  async validate() {
    try {
      console.log(t('validate.title'));
      console.log(t('validate.message'));
      
      // Delete old validation report if it exists
      const reportPath = path.join(process.cwd(), 'validation-report.txt');
      SecurityUtils.validatePath(reportPath);
      
      if (fs.existsSync(reportPath)) {
        fs.unlinkSync(reportPath);
        console.log(t('validate.deletedOldReport'));
        
        SecurityUtils.logSecurityEvent(t('validate.fileDeleted'), 'info', {
          path: reportPath,
          timestamp: new Date().toISOString()
        });
      }
      
      // Parse command line arguments
      const args = this.parseArgs();
      
      // Handle UI language change
      if (args.uiLanguage) {
        loadTranslations(args.uiLanguage, path.resolve(__dirname, '..', 'ui-locales'));}
      
      if (args.sourceDir) {
        this.config.sourceDir = args.sourceDir;
        this.sourceDir = path.resolve(this.config.sourceDir);
        this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
      }
      if (args.strictMode) {
        this.config.strictMode = true;
      }
      
      console.log(t('validate.sourceDirectory', { dir: this.sourceDir }));
      console.log(t('validate.sourceLanguage', { sourceLanguage: this.config.sourceLanguage }));
      console.log(t('validate.strictMode', { mode: this.config.strictMode ? 'ON' : 'OFF' }));
      
      // Validate source language directory exists
      SecurityUtils.validatePath(this.sourceLanguageDir);
      
      if (!fs.existsSync(this.sourceLanguageDir)) {
        this.addError(
          `Source language directory not found: ${this.sourceLanguageDir}`,
          { sourceLanguage: this.config.sourceLanguage }
        );
        
        SecurityUtils.logSecurityEvent(t('validate.validationError'), 'error', {
          error: 'Source language directory not found',
          path: this.sourceLanguageDir,
          timestamp: new Date().toISOString()
        });
        
        throw new Error(t('validate.sourceLanguageDirectoryNotFound', { sourceDir: this.sourceLanguageDir }) || 'Source language directory not found');
      }
      
      // Get available languages
      const availableLanguages = this.getAvailableLanguages();
      
      if (availableLanguages.length === 0) {
        console.log(t('validate.noTargetLanguages'));
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
      
      console.log(t('validate.validatingLanguages', { langs: targetLanguages.join(', ') }));
      console.log('');
      
      const results = {};
      
      // Validate each language
      for (const language of targetLanguages) {
        console.log(t('validate.validatingLanguage', { lang: language }));
        
        const validation = await this.validateLanguage(language);
        results[language] = validation;
        
        // Display brief progress indicator
        const { summary } = validation;
        const status = summary.syntaxErrors.length > 0 ? '❌' : 
                      summary.missingFiles.length > 0 ? '⚠️' : '✅';
        console.log(`   ${status} ${language}: ${summary.percentage}% (${summary.translatedKeys}/${summary.totalKeys} keys)`);
      }
      
      console.log('');
      console.log(t('validate.separator'));
      
      // Overall summary
      const hasErrors = this.errors.length > 0;
      const hasWarnings = this.warnings.length > 0;
      
      console.log(t('validate.validationSummary'));
      console.log(t('validate.totalErrors', { count: this.errors.length }));
      console.log(t('validate.totalWarnings', { count: this.warnings.length }));
      
      // Show errors
      if (hasErrors) {
        console.log('');
        console.log(t('validate.separator'));
        console.log(t('validate.errorsSection'));
        console.log('');
        this.errors.forEach((error, index) => {
          console.log(`  ❌ ${error.message}`);
          if (error.details && Object.keys(error.details).length > 0) {
            console.log(`     📄 Details: ${JSON.stringify(error.details, null, 2)}`);
          }
          console.log('');
        });
      }
      
      // Show warnings
      if (hasWarnings) {
        console.log('');
        console.log(t('validate.separator'));
        console.log(t('validate.warningsSection'));
        console.log('');
        this.warnings.forEach((warning, index) => {
          console.log(`  ⚠️  ${warning.message}`);
          if (warning.details && Object.keys(warning.details).length > 0) {
            console.log(`     📄 Details: ${JSON.stringify(warning.details, null, 2)}`);
          }
          console.log('');
        });
      }
      
      // Recommendations
      console.log('');
      console.log(t('validate.separator'));
      console.log(t('validate.recommendationsSection'));
      
      if (hasErrors) {
        console.log('');
        console.log(t('validate.resolveMissingFilesAndSyntaxErrors'));
        console.log(t('validate.fixStructuralInconsistencies'));
        console.log(t('validate.completeMissingTranslations'));
        console.log(t('validate.rerunValidation'));
      } else if (hasWarnings) {
        console.log('');
        console.log(t('validate.addressWarnings'));
        console.log(t('validate.reviewWarnings'));
        console.log(t('validate.considerRunningWithStrict'));
      } else {
        console.log('');
        console.log(t('validate.allValidationsPassed'));
        console.log(t('validate.considerRunningUsageAnalysis'));
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
      console.error(t("validate.validation_failed", { error: error.message }));
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Run method for compatibility with manager
   */
  async run(options = {}) {
    const { fromMenu = false } = options;
    
    const args = this.parseArgs();
    
    // Ensure config is always initialized
    if (!this.config) {
      this.config = {};
    }
    
    // Initialize configuration properly when called from menu
    if (fromMenu && !this.sourceDir) {
      const baseConfig = await getUnifiedConfig('validate', args);
      this.config = { ...baseConfig, ...(this.config || {}) };
      
      const uiLanguage = (this.config && this.config.uiLanguage) || 'en';
      loadTranslations(uiLanguage, path.resolve(__dirname, '..', 'ui-locales'));this.sourceDir = this.config.sourceDir;
        this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
      } else {
        await this.initialize();
      }
      
      // Skip admin authentication when called from menu
      if (!fromMenu) {
        // Check admin authentication for sensitive operations (only when called directly and not in no-prompt mode)
        const AdminAuth = require('../utils/admin-auth');
        const adminAuth = new AdminAuth();
        await adminAuth.initialize();
        
        const isCalledDirectly = require.main === module;
        const isRequired = await adminAuth.isAuthRequired();
        if (isRequired && isCalledDirectly && !args.noPrompt) {
          console.log('\n' + t('adminCli.authRequiredForOperation', { operation: 'validate translations' }));
          
          const pin = await this.prompt(t('adminCli.enterPin'));
          
          const isValid = await adminAuth.verifyPin(pin);
          this.closeReadline();
          
          if (!isValid) {
            console.log(t('adminCli.invalidPin'));
            if (!fromMenu) process.exit(1);
            return { success: false, error: 'Authentication failed' };
          }
          
        console.log(t('adminCli.authenticationSuccess'));
        }
      }
      const execute = async () => {

      console.log(t('validate.startingValidationProcess'));
      SecurityUtils.logSecurityEvent(t('validate.runStarted'), 'info', 'Starting validation run');

      const result = await this.validate();

      console.log(t('validate.validationProcessCompletedSuccessfully'));
      SecurityUtils.logSecurityEvent(t('validate.runCompleted'), 'info', 'Validation run completed successfully');
      return result;
    };

    if (args.watch) {
      await execute();
      let running = false;
      watchLocales(this.sourceDir, async () => {
        if (running) return;
        running = true;
        try {
          await execute();
        } finally {
          running = false;
        }
      });
      console.log('👀 Watching for translation changes. Press Ctrl+C to exit.');
      return { watching: true };
    }

    return await execute();
  } catch (error) {
    console.error(t('validate.validationError', { error: error.message }));
    console.error(t('validate.stackTrace', { stack: error.stack }));
    SecurityUtils.logSecurityEvent(t('validate.runError'), 'error', `Validation run failed: ${error.message}`);
    throw error;
  }
}


module.exports = I18nValidator;

if (require.main === module) {
  (async () => {
    try {
      // Initialize translations for CLI usage
      const config = configManager.getConfig();
      const uiLanguage = config.language || 'en';
      loadTranslations(uiLanguage, path.resolve(__dirname, '..', 'ui-locales'));
      
      SecurityUtils.logSecurityEvent(t('validate.scriptExecution'), 'info', {
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
          console.log(t('validate.authenticationFailed'));
          process.exit(1);
        }
      }

      const result = await validator.run();
      const runArgs = validator.parseArgs();

      if (!runArgs.watch) {
        SecurityUtils.logSecurityEvent(t('validate.validationCompleted'), 'info', {
          success: result.success,
          errors: result.errors || 0,
          warnings: result.warnings || 0,
          timestamp: new Date().toISOString()
        });

        process.exit(result.success ? 0 : 1);
      }
    } catch (error) {
      console.error(t('validate.fatalValidationError', { error: error.message }));
      console.error(t('validate.stackTrace', { stack: error.stack }));
      SecurityUtils.logSecurityEvent(t('validate.validationError'), 'error', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      process.exit(1);
    }
  })();
}