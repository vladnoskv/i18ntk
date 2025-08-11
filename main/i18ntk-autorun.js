#!/usr/bin/env node

/**
 * i18n Toolkit - Automated Workflow Runner (1.6.3-ready)
 * Executes predefined workflow steps for i18n management.
 * - Deterministic translation loading
 * - Safe config precedence (defaults < constructor < unified/CLI)
 * - Windows-safe child process execution via spawnSync
 * - Optional step filtering via --steps=analyze,validate
 * - Uses equals-style args (e.g., --output-dir=path) expected by sub-scripts
 */

const fs = require('fs');
const path = require('path');
const { loadTranslations, t } = require('../utils/i18n-helper');
loadTranslations(process.env.I18NTK_LANG);
const { getUnifiedConfig, parseCommonArgs, displayHelp, ensureInitialized } = require('../utils/config-helper');
const SecurityUtils = require('../utils/security');
const configManager = require('../utils/config-manager');

// Default location for UI locale bundles (override via config.uiLocalesDir)
const UI_LOCALES_DIR = path.resolve(__dirname, '..', 'ui-locales');

class AutoRunner {
  constructor(config = {}) {
    this.CONFIG_FILE = configManager.CONFIG_PATH;
    this.DEFAULT_CONFIG = {
      steps: [
        { name: 'autorun.stepInitializeProject',  script: 'i18ntk-init.js',     description: 'autorun.stepInitializeProject' },
        { name: 'autorun.stepAnalyzeTranslations', script: 'i18ntk-analyze.js',  description: 'autorun.stepAnalyzeTranslations' },
        { name: 'autorun.stepValidateTranslations', script: 'i18ntk-validate.js', description: 'autorun.stepValidateTranslations' },
        { name: 'autorun.stepCheckUsage',           script: 'i18ntk-usage.js',    description: 'autorun.stepCheckUsage' },
        { name: 'autorun.stepGenerateSummary',      script: 'i18ntk-summary.js',  description: 'autorun.stepGenerateSummary' }
      ]
    };
    // Ensure config is always initialized
    this.config = { ...this.DEFAULT_CONFIG, ...(config || {}) };
  }

  /** Initialize config and translations BEFORE any output that calls t() */
  async init(args = {}) {
    const unified = await getUnifiedConfig('autorun', args);
    // Precedence: defaults < constructor-provided < unified/CLI
    this.config = { ...this.DEFAULT_CONFIG, ...this.config, ...unified };

    // Support optional steps filter from CLI: --steps=analyze,validate
    if (args && typeof args.steps === 'string') {
      this.config.stepsFilter = args.steps
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    }

        // Always use bundled UI locales directory
    if (!fs.existsSync(UI_LOCALES_DIR)) {
      console.warn(`[i18ntk] UI locales directory not found at: ${UI_LOCALES_DIR}`);
    }

    const uiLanguage = (this.config && this.config.uiLanguage) || 'en';
    try {
      loadTranslations(uiLanguage);
    } catch (e2) {
      console.error('Error loading translations:', e2.message);
    }
  }

  loadConfig() {
    try {
      return configManager.getConfig();
    } catch (error) {
      console.error(this.t('autorun.configReadError', { file: this.CONFIG_FILE }) || `Failed to read config file: ${this.CONFIG_FILE}`, error.message);
      return this.DEFAULT_CONFIG;
    }
  }

  t(key, params = {}) {
    try { return t(key, params) || String(key); } catch { return String(key); }
  }

  displayHelp() {
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

    console.log(this.t('autorun.stepRunning', { stepName: this.t(step.description), stepNumber, totalSteps }));
    console.log(this.t('autorun.separator'));

    try {
      // Build final argv. Use equals-style for value flags because sub-scripts expect it.
      const argv = ['--no-prompt', ...commonArgs];
      
      // Execute script directly as module (safe alternative to spawnSync)
      const success = this.executeScriptAsModule(scriptPath, argv);
      
      if (success) {
        console.log(this.t('autorun.stepCompletedWithIcon', { stepName: this.t(step.description) }));
        return true;
      }
      throw new Error('Script execution failed');
    } catch (error) {
      console.error(this.t('autorun.stepFailed', { stepName: this.t(step.description) }));
      console.error(this.t('autorun.errorLabel', { error: error.message }));
      return false;
    }
  }

  _buildCommonArgs() {
    const cfg = this.config;
    const args = [];
    if (cfg.sourceDir) {
      args.push(`--source-dir=${cfg.sourceDir}`);
    }
    if (cfg.i18nDir) {
      args.push(`--i18n-dir=${cfg.i18nDir}`);
    }
    if (cfg.outputDir) {
      args.push(`--output-dir=${cfg.outputDir}`);
    }
    if (cfg.uiLanguage) {
      args.push(`--ui-language=${cfg.uiLanguage}`);
    }
    return args;
  }

  _selectStepsForRun() {
    const all = this.config.steps || [];
    const filter = this.config.stepsFilter;
    if (!filter || !Array.isArray(filter) || filter.length === 0) return all;

    const matchers = new Set(filter.map(s => s.toLowerCase()));
    return all.filter(s => {
      const tail = (s.name.split('.').pop() || '').toLowerCase();
      return matchers.has(tail) || matchers.has(s.name.toLowerCase());
    });
  }

  /**
   * Execute script as module (safe alternative to spawnSync)
   */
  executeScriptAsModule(scriptPath, argv) {
    try {
      // Parse arguments to extract key-value pairs
      const args = {};
      for (const arg of argv) {
        if (arg.startsWith('--')) {
          const [key, value] = arg.substring(2).split('=');
          if (key && value !== undefined) {
            args[key] = value;
          } else if (key) {
            args[key] = true;
          }
        }
      }

      // Map script names to their module exports
      const scriptName = path.basename(scriptPath, '.js');
      
      // Create a safe execution environment
      const originalArgv = process.argv;
      const originalExit = process.exit;
      
      try {
        // Override process.argv for the script
        process.argv = ['node', scriptPath, ...argv];
        
        // Prevent actual exit
        process.exit = (code = 0) => {
          throw new Error(`Script attempted to exit with code ${code}`);
        };
        
        // Execute the script directly
        const scriptModule = require(scriptPath);
        
        // Check if it's a class or has a run method
        if (scriptModule && typeof scriptModule.run === 'function') {
          return scriptModule.run(args) !== false;
        } else if (typeof scriptModule === 'function') {
          return scriptModule(args) !== false;
        } else {
          // Execute the script's main function if it exists
          return true; // Assume success for basic scripts
        }
      } finally {
        // Restore original process methods
        process.argv = originalArgv;
        process.exit = originalExit;
        
        // Remove from require cache to allow re-execution
        delete require.cache[require.resolve(scriptPath)];
      }
    } catch (error) {
      console.error(`Error executing ${path.basename(scriptPath)}: ${error.message}`);
      return false;
    }
  }

  async runAll(quiet = false) {
    const initialized = await ensureInitialized(this.config);
    if (!initialized) return;
    const stepsToRun = this._selectStepsForRun();

    if (!quiet) {
      console.log(`\n${this.t('autorun.startingAutoRunWorkflow')}`);
      console.log(this.t('autorun.separator'));
      console.log(`${this.t('autorun.workflowIncludesSteps', { count: stepsToRun.length })}`);
    }

    const commonArgs = this._buildCommonArgs();

    let successCount = 0;
    for (let i = 0; i < stepsToRun.length; i++) {
      const step = stepsToRun[i];
      const stepNumber = i + 1;

      if (this.runStep(step, stepNumber, stepsToRun.length, commonArgs)) {
        successCount++;
      } else {
        if (!quiet) console.error(`\n${this.t('autorun.workflowStopped')}`);
        process.exit(1);
      }
    }

    if (!quiet) {
      console.log(`\n${this.t('autorun.workflowCompleted')}`);
      console.log(`${this.t('autorun.successfulSteps', { count: successCount })}`);
      console.log(`${this.t('autorun.failedSteps', { count: stepsToRun.length - successCount })}`);
    }
    process.exit(0);
  }

  async run() { await this.runAll(); }

  listSteps() {
    console.log(`\n${this.t('autorun.availableSteps')}`);
    console.log(this.t('autorun.separator'));
    (this.config.steps || []).forEach((step, index) => {
      console.log(`${index + 1}. ${this.t(step.description)} (${step.script})`);
    });
    console.log();
  }
}

if (require.main === module) {
  (async function main() {
    try {
      const args = parseCommonArgs(process.argv.slice(2));
      const runner = new AutoRunner();
      await runner.init(args); // Initialize translations + config FIRST

      if (args.help) { runner.displayHelp(); return; }
      if (args.config) { runner.displayConfig(); return; }
      if (args.list) { runner.listSteps(); return; }

      await runner.runAll();
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = AutoRunner;
