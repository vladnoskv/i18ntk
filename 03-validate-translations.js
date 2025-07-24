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

// Default configuration
const DEFAULT_CONFIG = {
  sourceDir: './locales',
  sourceLanguage: 'en',
  notTranslatedMarker: '__NOT_TRANSLATED__',
  excludeFiles: ['.DS_Store', 'Thumbs.db'],
  strictMode: false
};

class I18nValidator {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sourceDir = path.resolve(this.config.sourceDir);
    this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
    this.errors = [];
    this.warnings = [];
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

  // Main validation process
  async validate() {
    try {
      console.log('✅ I18N TRANSLATION VALIDATION');
      console.log('=' .repeat(60));
      
      // Delete old validation report if it exists
      const reportPath = path.join(process.cwd(), 'validation-report.txt');
      if (fs.existsSync(reportPath)) {
        fs.unlinkSync(reportPath);
        console.log('🗑️  Deleted old validation report');
      }
      
      // Parse command line arguments
      const args = this.parseArgs();
      if (args.sourceDir) {
        this.config.sourceDir = args.sourceDir;
        this.sourceDir = path.resolve(this.config.sourceDir);
        this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
      }
      if (args.strictMode) {
        this.config.strictMode = true;
      }
      
      console.log(`📁 Source directory: ${this.sourceDir}`);
      console.log(`🔤 Source language: ${this.config.sourceLanguage}`);
      console.log(`🔍 Strict mode: ${this.config.strictMode ? 'ON' : 'OFF'}`);
      
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
        console.log('⚠️  No target languages found.');
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
      
      console.log(`🎯 Validating languages: ${targetLanguages.join(', ')}`);
      
      const results = {};
      
      // Validate each language
      for (const language of targetLanguages) {
        console.log(`\n🔄 Validating ${language}...`);
        
        const validation = this.validateLanguage(language);
        results[language] = validation;
        
        // Display summary
        const { summary } = validation;
        console.log(`   📄 Files: ${summary.validFiles}/${summary.totalFiles}`);
        console.log(`   🔤 Keys: ${summary.translatedKeys}/${summary.totalKeys} (${summary.percentage}%)`);
        console.log(`   ❌ Missing files: ${summary.missingFiles.length}`);
        console.log(`   🔧 Syntax errors: ${summary.syntaxErrors.length}`);
        console.log(`   🏗️  Structural issues: ${summary.structuralIssues.length}`);
        console.log(`   ⚠️  Translation issues: ${summary.translationIssues.length}`);
      }
      
      // Overall validation summary
      console.log('\n' + '=' .repeat(60));
      console.log('📊 VALIDATION SUMMARY');
      console.log('=' .repeat(60));
      
      const hasErrors = this.errors.length > 0;
      const hasWarnings = this.warnings.length > 0;
      
      if (!hasErrors && !hasWarnings) {
        console.log('🎉 All validations passed! Translations are complete and consistent.');
      } else {
        if (hasErrors) {
          console.log(`❌ ${this.errors.length} error(s) found:`);
          this.errors.slice(0, 10).forEach((error, index) => {
            console.log(`   ${index + 1}. ${error.message}`);
            if (error.details.key) {
              console.log(`      Key: ${error.details.key}`);
            }
            if (error.details.fileName) {
              console.log(`      File: ${error.details.fileName}`);
            }
          });
          
          if (this.errors.length > 10) {
            console.log(`   ... and ${this.errors.length - 10} more errors`);
          }
        }
        
        if (hasWarnings && !this.config.strictMode) {
          console.log(`\n⚠️  ${this.warnings.length} warning(s) found:`);
          this.warnings.slice(0, 5).forEach((warning, index) => {
            console.log(`   ${index + 1}. ${warning.message}`);
          });
          
          if (this.warnings.length > 5) {
            console.log(`   ... and ${this.warnings.length - 5} more warnings`);
          }
        }
      }
      
      // Language-specific results
      const sortedResults = Object.entries(results)
        .sort(([,a], [,b]) => b.summary.percentage - a.summary.percentage);
      
      console.log('\n📋 LANGUAGE STATUS');
      console.log('=' .repeat(60));
      
      sortedResults.forEach(([language, validation]) => {
        const { summary } = validation;
        const statusIcon = summary.percentage === 100 ? '✅' : summary.percentage >= 80 ? '🟡' : '🔴';
        const hasIssues = summary.missingFiles.length > 0 || 
                         summary.syntaxErrors.length > 0 || 
                         summary.structuralIssues.length > 0;
        
        console.log(`${statusIcon} ${language.toUpperCase()}: ${summary.percentage}% complete${hasIssues ? ' (has issues)' : ''}`);
      });
      
      // Recommendations
      console.log('\n📋 RECOMMENDATIONS');
      console.log('=' .repeat(60));
      
      if (hasErrors) {
        console.log('🔧 Fix errors first:');
        console.log('1. Resolve missing files and syntax errors');
        console.log('2. Fix structural inconsistencies');
        console.log('3. Complete missing translations');
        console.log('4. Re-run validation');
      } else if (hasWarnings) {
        console.log('⚠️  Address warnings:');
        console.log('1. Review extra keys (may be unused)');
        console.log('2. Consider running with --strict for stricter validation');
      } else {
        console.log('🎉 All validations passed!');
        console.log('💡 Consider running usage analysis to find unused keys');
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
      console.error('❌ Validation failed:', error.message);
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
  validator.validate().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = I18nValidator;