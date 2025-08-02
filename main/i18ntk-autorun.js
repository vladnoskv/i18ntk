#!/usr/bin/env node

/**
 * i18n Toolkit - Automated Workflow Runner
 * Executes predefined workflow steps for i18n management
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class AutoRunner {
  constructor() {
    this.CONFIG_FILE = 'i18ntk-config.json';
    this.DEFAULT_CONFIG = {
      "steps": [
        {
          "name": "initialize",
          "script": "i18ntk-init.js",
          "description": "Initialize i18n project structure"
        },
        {
          "name": "analyze",
          "script": "i18ntk-analyze.js",
          "description": "Analyze translation files"
        },
        {
          "name": "validate",
          "script": "i18ntk-validate.js",
          "description": "Validate translations"
        },
        {
          "name": "usage",
          "script": "i18ntk-usage.js",
          "description": "Check usage statistics"
        },
        {
          "name": "summary",
          "script": "i18ntk-summary.js",
          "description": "Generate summary report"
        }
      ]
    };
  }

  loadTranslations() {
    const translations = {};
    const localesDir = path.join(__dirname, '..', 'ui-locales');
    
    if (fs.existsSync(localesDir)) {
      const languages = ['en', 'de', 'es', 'fr', 'ja', 'pt', 'ru', 'zh'];
      languages.forEach(lang => {
        const filePath = path.join(localesDir, lang, 'autorun.json');
          if (fs.existsSync(filePath)) {
            try {
              translations[lang] = translations[lang] || {};
              translations[lang].autorun = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            } catch (error) {
              console.warn(this.t('translationLoadWarning', lang).replace('{lang}', lang));
            }
          }
      });
    }
    
    return translations;
  }

  loadConfig() {
    if (fs.existsSync(this.CONFIG_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(this.CONFIG_FILE, 'utf8'));
      } catch (error) {
        console.error(this.t('configReadError', this.getSystemLanguage()).replace('{file}', this.CONFIG_FILE), error.message);
        return this.DEFAULT_CONFIG;
      }
    }
    return this.DEFAULT_CONFIG;
  }

  getSystemLanguage() {
    const envLang = process.env.LANG || process.env.LANGUAGE || process.env.LC_ALL || 'en';
    return envLang.substring(0, 2).toLowerCase();
  }

  t(key, lang = 'en') {
    const translations = this.loadTranslations();
    
    if (translations[lang] && translations[lang].autorun && translations[lang].autorun[key]) {
      return translations[lang].autorun[key];
    }
    
    // Fallback to English
    if (translations['en'] && translations['en'].autorun && translations['en'].autorun[key]) {
      return translations['en'].autorun[key];
    }
    
    // Return the key as fallback
    return key;
  }

  displayHelp() {
    const lang = this.getSystemLanguage();
    console.log(`\n${this.t('autoRunScriptTitle', lang)}`);
    console.log(this.t('separator', lang));
    console.log(`\n${this.t('usageTitle', lang)}:`);
    console.log(`  ${this.t('runAllSteps')}`);
    console.log(`  ${this.t('configureSettingsFirst')}`);
    console.log(`  ${this.t('runSpecificSteps')}`);
    console.log(`  ${this.t('showHelp')}`);
    console.log(`\n${this.t('examplesTitle', lang)}:`);
    console.log(`  ${this.t('configExample')}`);
    console.log(`  ${this.t('stepsExample1')}`);
    console.log(`  ${this.t('stepsExample2')}`);
    console.log();
  }

  displayConfig() {
    const lang = this.getSystemLanguage();
    console.log(`\n${this.t('customSettingsConfiguration', lang)}`);
    console.log(this.t('separator', lang));
    
    const config = this.loadConfig();
    console.log(JSON.stringify(config, null, 2));
    console.log();
  }

  runStep(step, stepNumber, totalSteps) {
    const lang = this.getSystemLanguage();
    const scriptPath = path.join(__dirname, step.script);
    
    if (!fs.existsSync(scriptPath)) {
      console.error(`${this.t('stepFailed', lang)}: ${step.name}`);
      console.error(`${this.t('errorLabel', lang)}: ${this.t('missingRequiredFile', lang).replace('{file}', step.script)}`);
      return false;
    }

    console.log(`\n[${stepNumber}/${totalSteps}] ${this.t('runningStep', lang).replace('{stepName}', step.name)}`);
    console.log(`${this.t('commandLabel', lang).replace('{command}', step.description)}`);
    console.log(this.t('separator', lang));

    try {
      execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
      console.log(`✅ ${this.t('stepCompleted', lang).replace('{stepName}', step.name)}`);
      return true;
    } catch (error) {
      console.error(`❌ ${this.t('stepFailed', lang).replace('{stepName}', step.name)}`);
      console.error(`${this.t('errorLabel', lang)}:`, error.message);
      return false;
    }
  }

  async runAll(quiet = false) {
    const lang = this.getSystemLanguage();
    const config = this.loadConfig();

    if (!quiet) {
      console.log(`\n${this.t('startingAutoRunWorkflow', lang)}`);
    console.log(this.t('separator', lang));
      console.log(`${this.t('workflowIncludesSteps', lang).replace('{count}', config.steps.length)}`);
    }

    let successCount = 0;
    for (let i = 0; i < config.steps.length; i++) {
      const step = config.steps[i];
      const stepNumber = i + 1;
      
      if (this.runStep(step, stepNumber, config.steps.length)) {
        successCount++;
      } else {
        if (!quiet) {
          console.error(`\n${this.t('workflowStopped', lang)}`);
        }
        process.exit(1);
      }
    }

    if (!quiet) {
      console.log(`\n${this.t('workflowCompleted', lang)}`);
      console.log(`${this.t('successfulSteps', lang).replace('{count}', successCount)}`);
      console.log(`${this.t('failedSteps', lang).replace('{count}', config.steps.length - successCount)}`);
    }
  }
}

// Main execution for command-line usage
function main() {
  const runner = new AutoRunner();
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    runner.displayHelp();
    return;
  }

  if (args.includes('--config') || args.includes('-c')) {
    runner.displayConfig();
    return;
  }

  runner.runAll();
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = AutoRunner;