#!/usr/bin/env node

/**
 * i18n Toolkit - Automated Workflow Runner
 * Executes predefined workflow steps for i18n management
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { loadTranslations, t } = require('../utils/i18n-helper');

class AutoRunner {
  constructor() {
    this.CONFIG_FILE = 'i18ntk-config.json';
    this.DEFAULT_CONFIG = {
      "steps": [
        {
          "name": "autorun.stepInitializeProject",
          "script": "i18ntk-init.js",
          "description": "autorun.stepInitializeProject"
        },
        {
          "name": "autorun.stepAnalyzeTranslations",
          "script": "i18ntk-analyze.js",
          "description": "autorun.stepAnalyzeTranslations"
        },
        {
          "name": "autorun.stepValidateTranslations",
          "script": "i18ntk-validate.js",
          "description": "autorun.stepValidateTranslations"
        },
        {
          "name": "autorun.stepCheckUsage", 
          "script": "i18ntk-usage.js",
          "description": "autorun.stepCheckUsage"
        },
        {
          "name": "autorun.stepGenerateSummary",
          "script": "i18ntk-summary.js",
          "description": "autorun.stepGenerateSummary"
        }
      ]
    };
    this.initializeTranslations();
  }

  initializeTranslations() {
    const lang = this.getSystemLanguage();
    loadTranslations(lang);
  }

  loadConfig() {
    if (fs.existsSync(this.CONFIG_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(this.CONFIG_FILE, 'utf8'));
      } catch (error) {
        console.error(this.t('autorun.configReadError', this.getSystemLanguage()).replace('{file}', this.CONFIG_FILE), error.message);
        return this.DEFAULT_CONFIG;
      }
    }
    return this.DEFAULT_CONFIG;
  }

  getSystemLanguage() {
    const envLang = process.env.LANG || process.env.LANGUAGE || process.env.LC_ALL || 'en';
    return envLang.substring(0, 2).toLowerCase();
  }

  t(key, params = {}) {
    return t(key, params);
  }

  displayHelp() {
    const lang = this.getSystemLanguage();
    console.log(`\n${this.t('autorun.autoRunScriptTitle')}`);
    console.log(this.t('autorun.separator'));
    console.log(`\n${this.t('autorun.usageTitle')}:`);
    console.log(`  ${this.t('autorun.runAllSteps')}`);
    console.log(`  ${this.t('autorun.configureSettingsFirst')}`);
    console.log(`  ${this.t('autorun.runSpecificSteps')}`);
    console.log(`  ${this.t('autorun.showHelp')}`);
    console.log(`\n${this.t('autorun.examplesTitle')}:`);
    console.log(`  ${this.t('autorun.configExample')}`);
    console.log(`  ${this.t('autorun.stepsExample1')}`);
    console.log(`  ${this.t('autorun.stepsExample2')}`);
    console.log();
  }

  displayConfig() {
    console.log(`\n${this.t('autorun.customSettingsConfiguration')}`);
    console.log(this.t('autorun.separator'));
    
    const config = this.loadConfig();
    console.log(JSON.stringify(config, null, 2));
    console.log();
  }

  runStep(step, stepNumber, totalSteps) {
    const scriptPath = path.join(__dirname, step.script);
    
    if (!fs.existsSync(scriptPath)) {
      console.error(this.t('autorun.stepFailed', { stepName: this.t(step.description) }));
      console.error(this.t('autorun.errorLabel', { error: this.t('autorun.missingRequiredFile', { file: step.script }) }));
      return false;
    }

    console.log(this.t('autorun.stepRunningWithNumber', { stepName: this.t(step.description), stepNumber, totalSteps }));
    console.log(this.t('autorun.separator'));

    try {
      execSync(`node "${scriptPath}" --no-prompt`, { stdio: 'inherit' });
      const completionMessage = this.t('autorun.stepCompletedWithIcon', { stepName: this.t(step.description) });
      console.log(completionMessage);
      return true;
    } catch (error) {
      console.error(this.t('autorun.stepFailed', { stepName: this.t(step.description) }));
      console.error(this.t('autorun.errorLabel', { error: error.message }));
      return false;
    }
  }

  async runAll(quiet = false) {
    const config = this.loadConfig();

    if (!quiet) {
      console.log(`\n${this.t('autorun.startingAutoRunWorkflow')}`);
      console.log(this.t('autorun.separator'));
      console.log(`${this.t('autorun.workflowIncludesSteps', { count: config.steps.length })}`);
    }

    let successCount = 0;
    for (let i = 0; i < config.steps.length; i++) {
      const step = config.steps[i];
      const stepNumber = i + 1;
      
      if (this.runStep(step, stepNumber, config.steps.length)) {
        successCount++;
      } else {
        if (!quiet) {
          console.error(`\n${this.t('autorun.workflowStopped')}`);
        }
        process.exit(1);
      }
    }

    if (!quiet) {
      console.log(`\n${this.t('autorun.workflowCompleted')}`);
      console.log(`${this.t('autorun.successfulSteps', { count: successCount })}`);
      console.log(`${this.t('autorun.failedSteps', { count: config.steps.length - successCount })}`);
    }
    process.exit(0);
  }
}

// Main execution for command-line usage
function main() {
  const runner = new AutoRunner();
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    runner.displayHelp();
    process.exit(0);
  }

  if (args.includes('--config') || args.includes('-c')) {
    runner.displayConfig();
    process.exit(0);
  }

  runner.runAll();
  process.exit(0);
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = AutoRunner;