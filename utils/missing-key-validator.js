#!/usr/bin/env node

/**
 * Missing Key Validator
 * Validates presence of all required keys across all supported languages
 */

const fs = require('fs');
const path = require('path');
const SecurityUtils = require('./security-utils');

class MissingKeyValidator {
  constructor(supportedLanguages = ['en', 'es', 'fr', 'de', 'ja', 'ru', 'zh']) {
    this.supportedLanguages = supportedLanguages;
    this.projectRoot = path.resolve(__dirname, '..');
    this.requiredKeys = this.loadRequiredKeys();
  }

  loadRequiredKeys() {
    // Define required keys for the toolkit
    return [
      // Core UI keys
      'welcome',
      'error',
      'success',
      'warning',
      'info',
      'loading',
      'processing',
      'completed',
      'cancel',
      'confirm',
      'save',
      'delete',
      'edit',
      'add',
      'remove',
      'update',
      'create',
      'close',
      'open',
      'search',
      'filter',
      'sort',
      'export',
      'import',
      'backup',
      'restore',
      'settings',
      'configuration',
      'language',
      'locale',
      'translation',
      'key',
      'value',
      'placeholder',
      'validation',
      'format',
      'type',
      'required',
      'optional',
      'default',
      'description',
      'help',
      'documentation',
      'support',
      'contact',
      'about',
      'version',
      'license',
      'copyright',
      'privacy',
      'terms',
      'security',
    ];
  }

  async validateAllKeys() {
    console.log('🔍 Validating missing keys across all languages...');
    
    const missingKeys = {};
    
    for (const language of this.supportedLanguages) {
      const languageMissing = await this.validateLanguageKeys(language);
      if (languageMissing.length > 0) {
        missingKeys[language] = languageMissing;
      }
    }
    
    return missingKeys;
  }

  async validateLanguageKeys(language) {
    const localePath = path.join(this.projectRoot, 'ui-locales', `${language}.json`);
    
    if (!SecurityUtils.safeExistsSync(localePath)) {
      return this.requiredKeys; // All keys missing if file doesn't exist
    }
    
    try {
      const localeData = JSON.parse(SecurityUtils.safeReadFileSync(localePath, 'utf8'));
      const existingKeys = Object.keys(localeData);
      
      return this.requiredKeys.filter(key => !existingKeys.includes(key));
    } catch (error) {
      console.error(`Error reading ${language}.json:`, error.message);
      return this.requiredKeys;
    }
  }

  async generateMissingKeysReport() {
    const missingKeys = await this.validateAllKeys();
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalLanguages: this.supportedLanguages.length,
        totalRequiredKeys: this.requiredKeys.length,
        languagesWithMissingKeys: Object.keys(missingKeys).length,
        totalMissingKeys: Object.values(missingKeys).reduce((sum, keys) => sum + keys.length, 0)
      },
      details: missingKeys
    };

    const reportPath = path.join(__dirname, 'missing-keys-report.json');
    SecurityUtils.safeWriteFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 Missing Keys Report:');
    console.log(`Total Languages: ${report.summary.totalLanguages}`);
    console.log(`Total Required Keys: ${report.summary.totalRequiredKeys}`);
    console.log(`Languages with Missing Keys: ${report.summary.languagesWithMissingKeys}`);
    console.log(`Total Missing Keys: ${report.summary.totalMissingKeys}`);
    
    if (report.summary.totalMissingKeys > 0) {
      console.log('\n❌ Missing keys by language:');
      Object.entries(missingKeys).forEach(([lang, keys]) => {
        console.log(`${lang}: ${keys.length} keys missing`);
      });
    } else {
      console.log('\n✅ All keys present in all languages!');
    }
    
    console.log(`Report saved to: ${reportPath}`);
    
    return report;
  }

  async generateTranslationTemplate() {
    const template = {};
    
    this.requiredKeys.forEach(key => {
      template[key] = key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    });

    const templatePath = path.join(__dirname, 'translation-template.json');
    SecurityUtils.safeWriteFileSync(templatePath, JSON.stringify(template, null, 2));
    
    console.log(`Translation template saved to: ${templatePath}`);
    return template;
  }
}

// CLI execution
if (require.main === module) {
  const validator = new MissingKeyValidator();
  
  if (process.argv.includes('--template')) {
    validator.generateTranslationTemplate();
  } else {
    validator.generateMissingKeysReport();
  }
}

module.exports = MissingKeyValidator;