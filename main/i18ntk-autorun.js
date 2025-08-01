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
              translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            } catch (error) {
              console.warn(`Warning: Could not load ${lang} translations`);
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
        console.error(`Error reading ${this.CONFIG_FILE}:`, error.message);
        return this.DEFAULT_CONFIG;
      }
    }
    return this.DEFAULT_CONFIG;
  }

  getSystemLanguage() {
    const envLang = process.env.LANG || process.env.LANGUAGE || process.env.LC_ALL || 'en';
    return envLang.substring(0, 2).toLowerCase();
  }

  translate(key, lang = 'en') {
    const translations = this.loadTranslations();
    
    if (translations[lang] && translations[lang][key]) {
      return translations[lang][key];
    }
    
    // Fallback to English
    if (translations['en'] && translations['en'][key]) {
      return translations['en'][key];
    }
    
    // Return the key as fallback
    return key;
  }

  displayHelp() {
    const lang = this.getSystemLanguage();
    console.log(`\n${this.translate('autoRunScriptTitle', lang)}`);
    console.log('='.repeat(50));
    console.log(`\n${this.translate('usageTitle', lang)}:`);
    console.log(`  ${this.translate('runAllSteps')}`);
    console.log(`  ${this.translate('configureSettingsFirst')}`);
    console.log(`  ${this.translate('runSpecificSteps')}`);
    console.log(`  ${this.translate('showHelp')}`);
    console.log(`\n${this.translate('examplesTitle', lang)}:`);
    console.log(`  ${this.translate('configExample')}`);
    console.log(`  ${this.translate('stepsExample1')}`);
    console.log(`  ${this.translate('stepsExample2')}`);
    console.log();
  }

  displayConfig() {
    const lang = this.getSystemLanguage();
    console.log(`\n${this.translate('customSettingsConfiguration', lang)}`);
    console.log('='.repeat(30));
    
    const config = this.loadConfig();
    console.log(JSON.stringify(config, null, 2));
    console.log();
  }

  runStep(step, stepNumber, totalSteps) {
    const lang = this.getSystemLanguage();
    const scriptPath = path.join(__dirname, step.script);
    
    if (!fs.existsSync(scriptPath)) {
      console.error(`${this.translate('stepFailed', lang)}: ${step.name}`);
      console.error(`${this.translate('errorLabel', lang)}: ${this.translate('missingRequiredFile', lang).replace('{file}', step.script)}`);
      return false;
    }

    console.log(`\n[${stepNumber}/${totalSteps}] ${this.translate('runningStep', lang).replace('{stepName}', step.name)}`);
    console.log(`${this.translate('commandLabel', lang).replace('{command}', step.description)}`);
    console.log('-'.repeat(50));

    try {
      execSync(`node "${scriptPath}"`, { stdio: 'inherit' });
      console.log(`✅ ${this.translate('stepCompleted', lang).replace('{stepName}', step.name)}`);
      return true;
    } catch (error) {
      console.error(`❌ ${this.translate('stepFailed', lang).replace('{stepName}', step.name)}`);
      console.error(`${this.translate('errorLabel', lang)}:`, error.message);
      return false;
    }
  }

  async runAll(quiet = false) {
    const lang = this.getSystemLanguage();
    const config = this.loadConfig();

    if (!quiet) {
      console.log(`\n🚀 ${this.translate('startingAutoRunWorkflow', lang)}...`);
      console.log('='.repeat(50));
      console.log(`${this.translate('workflowIncludesSteps', lang).replace('{count}', config.steps.length)}`);
    }

    let successCount = 0;
    for (let i = 0; i < config.steps.length; i++) {
      const step = config.steps[i];
      const stepNumber = i + 1;
      
      if (this.runStep(step, stepNumber, config.steps.length)) {
        successCount++;
      } else {
        if (!quiet) {
          console.error(`\n❌ ${this.translate('workflowStopped', lang)}`);
        }
        process.exit(1);
      }
    }

    if (!quiet) {
      console.log(`\n✅ ${this.translate('workflowCompleted', lang)}`);
      console.log(`${this.translate('successfulSteps', lang).replace('{count}', successCount)}`);
      console.log(`${this.translate('failedSteps', lang).replace('{count}', config.steps.length - successCount)}`);
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