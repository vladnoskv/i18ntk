#!/usr/bin/env node

/**
 * i18n Toolkit - Automated Workflow Runner
 * Executes predefined workflow steps for i18n management
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { loadTranslations, t } = require('../utils/i18n-helper');
const { getUnifiedConfig, parseCommonArgs, displayHelp } = require('../utils/config-helper');
const SecurityUtils = require('../utils/security');

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
    this.config = {
      ...getUnifiedConfig('autorun'),
      ...this.DEFAULT_CONFIG
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

  runStep(step, stepNumber, totalSteps, commonArgs = []) {
    const scriptPath = path.join(__dirname, step.script);
    
    if (!fs.existsSync(scriptPath)) {
      console.error(this.t('autorun.stepFailed', { stepName: this.t(step.description) }));
      console.error(this.t('autorun.errorLabel', { error: this.t('autorun.missingRequiredFile', { file: step.script }) }));
      return false;
    }

    console.log(this.t('autorun.stepRunningWithNumber', { stepName: this.t(step.description), stepNumber, totalSteps }));
    console.log(this.t('autorun.separator'));

    try {
      const command = `node "${scriptPath}" --no-prompt ${commonArgs.join(' ')}`.trim();
      execSync(command, { stdio: 'inherit' });
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
    const config = this.config;

    if (!quiet) {
      console.log(`\n${this.t('autorun.startingAutoRunWorkflow')}`);
      console.log(this.t('autorun.separator'));
      console.log(`${this.t('autorun.workflowIncludesSteps', { count: config.steps.length })}`);
    }

    // Build common arguments from unified config
    const commonArgs = [];
    if (config.sourceDir !== './locales') {
      commonArgs.push(`--source-dir="${config.sourceDir}"`);
    }
    if (config.i18nDir !== config.sourceDir) {
      commonArgs.push(`--i18n-dir="${config.i18nDir}"`);
    }
    if (config.outputDir !== './i18ntk-reports') {
      commonArgs.push(`--output-dir="${config.outputDir}"`);
    }
    if (config.uiLanguage !== 'en') {
      commonArgs.push(`--ui-language="${config.uiLanguage}"`);
    }

    let successCount = 0;
    for (let i = 0; i < config.steps.length; i++) {
      const step = config.steps[i];
      const stepNumber = i + 1;
      
      if (this.runStep(step, stepNumber, config.steps.length, commonArgs)) {
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

  // Add run method for menu execution
  async run(options = {}) {
    const { fromMenu = false } = options;
    
    if (fromMenu) {
      // Ensure proper configuration when called from menu
      const config = await getUnifiedConfig('autorun', {});
      this.config = config;
      
      const uiLanguage = SecurityUtils.sanitizeInput(config.uiLanguage || 'en');
      loadTranslations(uiLanguage);
      
      await this.runAll();
    } else {
      await this.runAll();
    }
  }

  // Main execution for command-line usage
  static main() {
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

  // List available automation steps
  listSteps() {
    console.log(`\n${this.t('autorun.availableSteps')}`);
    console.log(this.t('autorun.separator'));
    this.config.steps.forEach((step, index) => {
      console.log(`${index + 1}. ${this.t(step.description)} (${step.script})`);
    });
    console.log();
  }
}

// Execute if called directly
if (require.main === module) {
  async function main() {
    try {
      const args = parseCommonArgs(process.argv.slice(2));
      
      if (args.help) {
        displayHelp('i18ntk-autorun', {
          'list': 'List available automation steps',
          'source-dir': 'Source code directory',
          'i18n-dir': 'Translation files directory',
          'output-dir': 'Output reports directory',
          'ui-language': 'UI language for messages'
        });
        return;
      }
      
      if (args.list) {
        const runner = new AutoRunner();
        runner.listSteps();
        return;
      }
      
      const config = await getUnifiedConfig('autorun', args);
      const runner = new AutoRunner(config);
      await runner.runAll();
      
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
  
  main();
}

module.exports = AutoRunner;