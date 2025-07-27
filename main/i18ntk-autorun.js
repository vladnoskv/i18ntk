/**
 * Auto-Run Script for I18N Management Toolkit
 * Automatically executes the complete workflow after initialization
 * 
 * Usage:
 *   npm run i18ntk:autorun
 *   node i18ntk-autorun.js
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const UIi18n = require('./i18ntk-ui');
const settingsManager = require('../settings/settings-manager'); // This is already an instance

class AutoRunner {
    constructor() {
        this.ui = new UIi18n();
        this.steps = [
            { name: 'Analyze Translations', command: 'node main/i18ntk-analyze.js --no-prompt', required: true },
            { name: 'Validate Translations', command: 'node main/i18ntk-validate.js --no-prompt', required: true },
            { name: 'Check Usage', command: 'node main/i18ntk-usage.js --no-prompt', required: false },
            { name: 'Complete Translations', command: 'node main/i18ntk-complete.js --no-prompt', required: false },
            { name: 'Analyze Sizing', command: 'node main/i18ntk-sizing.js --no-prompt', required: false },
            { name: 'Generate Summary', command: 'node main/i18ntk-summary.js --no-prompt', required: true }
        ];
        this.results = [];
        // FIX: settingsManager is already an instance, not a constructor
        this.settingsManager = settingsManager;
        this.rl = null;
    }

    /**
     * Initialize readline interface
     */
    initReadline() {
        if (!this.rl && require.main === module) {
            this.rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
        }
    }

    /**
     * Close readline interface
     */
    closeReadline() {
        if (this.rl) {
            this.rl.close();
            this.rl = null;
        }
    }

    /**
     * Prompt for user input
     */
    async prompt(message) {
        // Only use readline when run as main module
        if (require.main === module) {
            this.initReadline();
            return new Promise((resolve) => {
                this.rl.question(message, (answer) => {
                    this.closeReadline();
                    resolve(answer);
                });
            });
        }
        // When called from menu, just return empty string
        return '';
    }

    /**
     * Check if initialization has been completed
     */
    checkInitialization() {
        const requiredFiles = [
            './locales',
            './ui-locales/en.json',
            './settings/i18ntk-config.json'
        ];

        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                console.log(this.ui.t('hardcodedTexts.missingRequiredFile', { file }));
                console.log(this.ui.t('hardcodedTexts.runInitializationFirst'));
                return false;
            }
        }

        console.log(this.ui.t('hardcodedTexts.initializationCheckPassed'));
        return true;
    }

    /**
     * Run a single command with proper error handling
     */
    async runCommand(step, quiet = false) {
        const isStandalone = require.main === module;
        const showOutput = isStandalone && !quiet;
        
        if (showOutput) {
            console.log(`\n${this.ui.t('hardcodedTexts.runningStep', { stepName: step.name })}`);
            console.log(`${this.ui.t('hardcodedTexts.commandLabel', { command: step.command })}`);
            console.log('-'.repeat(50));
        } else {
            // Show minimal output when called from menu
            console.log(this.ui.t('hardcodedTexts.stepRunning', { stepName: step.name }));
        }

        try {
            const startTime = Date.now();
            
            // Execute command with real-time output
            const result = execSync(step.command, { 
                stdio: 'inherit',
                timeout: 120000 // 2 minutes timeout
            });
            
            const duration = Date.now() - startTime;
            
            if (showOutput) {
                console.log(this.ui.t('hardcodedTexts.stepCompletedWithTime', { stepName: step.name, duration }));
            } else {
                console.log(this.ui.t('hardcodedTexts.stepCompleted', { stepName: step.name }));
            }
            
            this.results.push({
                step: step.name,
                command: step.command,
                status: 'success',
                duration: duration,
                required: step.required
            });
            
            return true;
            
        } catch (error) {
            if (showOutput) {
                console.log(this.ui.t('hardcodedTexts.stepFailed', { stepName: step.name }));
                console.log(this.ui.t('hardcodedTexts.errorLabel', { error: error.message }));
            } else {
                console.log(this.ui.t('hardcodedTexts.stepFailedWithError', { stepName: step.name, error: error.message }));
            }
            
            this.results.push({
                step: step.name,
                command: step.command,
                status: 'failed',
                error: error.message,
                required: step.required
            });
            
            if (step.required) {
                console.log(this.ui.t('hardcodedTexts.requiredStepFailed'));
                return false;
            } else {
                console.log(this.ui.t('hardcodedTexts.optionalStepFailed'));
                return true;
            }
        }
    }

    /**
     * Run all steps in sequence
     */
    async runAll(quiet = false) {
        // Only show detailed output when run directly, not from menu
        const isStandalone = require.main === module;
        const showOutput = isStandalone && !quiet;
        
        // Set workflow mode environment variable
        process.env.I18NTK_WORKFLOW_MODE = 'true';
        
        if (showOutput) {
            console.log(this.ui.t('hardcodedTexts.startingAutoRunWorkflow'));
            console.log('=' .repeat(60));
        }
        
        // Check initialization
        if (!this.checkInitialization()) {
            process.exit(1);
        }
        
        if (showOutput) {
            console.log(`\n${this.ui.t('hardcodedTexts.workflowIncludesSteps', { count: this.steps.length })}`);
            this.steps.forEach((step, index) => {
                const required = step.required ? this.ui.t('hardcodedTexts.stepRequired') : this.ui.t('hardcodedTexts.stepOptional');
                console.log(`   ${index + 1}. ${step.name} ${required}`);
            });
            
            console.log(`\n${this.ui.t('hardcodedTexts.startingExecution')}`);
        }
        
        // Run each step
        for (const step of this.steps) {
            const success = await this.runCommand(step, quiet);
            
            if (!success && step.required) {
                if (showOutput) {
                    console.log(`\n${this.ui.t('hardcodedTexts.workflowStopped')}`);
                } else {
                    console.log(this.ui.t('hardcodedTexts.workflowStopped'));
                }
                this.generateReport(quiet);
                process.exit(1);
            }
            
            // Small delay between steps
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        if (showOutput) {
            console.log(`\n${this.ui.t('hardcodedTexts.workflowCompleted')}`);
        }
        
        this.generateReport(quiet);
        
        // Only show success message and prompt when run standalone
        if (isStandalone) {
            console.log(this.ui.t('operations.completed'));
            await this.prompt(this.ui.t('hardcodedTexts.pressEnterToContinue'));
        }
    }

    /**
     * Run specific steps only
     */
    async runSteps(stepNumbers) {
        // Set workflow mode environment variable
        process.env.I18NTK_WORKFLOW_MODE = 'true';
        
        console.log(this.ui.t('hardcodedTexts.runningSelectedSteps'));
        console.log('=' .repeat(60));
        
        if (!this.checkInitialization()) {
            process.exit(1);
        }
        
        for (const stepNum of stepNumbers) {
            const stepIndex = stepNum - 1;
            if (stepIndex >= 0 && stepIndex < this.steps.length) {
                const step = this.steps[stepIndex];
                await this.runCommand(step);
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                console.log(this.ui.t('hardcodedTexts.invalidStepNumber', { stepNum }));
            }
        }
        
        this.generateReport();
        
        // Only show success message and prompt when run standalone or from menu
        // Don't show when run as part of autorun workflow
        if (require.main === module) {
            console.log(this.ui.t('operations.completed'));
            await this.prompt(this.ui.t('hardcodedTexts.pressEnterToContinue'));
        }
    }

    /**
     * Generate execution report
     */
    generateReport(quiet = false) {
        const isStandalone = require.main === module;
        const showOutput = isStandalone && !quiet;
        
        if (showOutput) {
            console.log(`\n${this.ui.t('hardcodedTexts.executionReport')}`);
            console.log('=' .repeat(60));
        }
        
        const successful = this.results.filter(r => r.status === 'success').length;
        const failed = this.results.filter(r => r.status === 'failed').length;
        const requiredFailed = this.results.filter(r => r.status === 'failed' && r.required).length;
        
        if (showOutput) {
            console.log(this.ui.t('hardcodedTexts.successfulSteps', { count: successful }));
            console.log(this.ui.t('hardcodedTexts.failedSteps', { count: failed }));
            console.log(this.ui.t('hardcodedTexts.requiredFailedSteps', { count: requiredFailed }));
            
            console.log(`\n${this.ui.t('hardcodedTexts.stepDetails')}`);
            this.results.forEach((result, index) => {
                const status = result.status === 'success' ? '✅' : '❌';
                const required = result.required ? '[REQ]' : '[OPT]';
                const duration = result.duration ? ` (${result.duration}ms)` : '';
                
                console.log(`   ${status} ${required} ${result.step}${duration}`);
                if (result.error) {
                    console.log(this.ui.t('hardcodedTexts.errorDetails', { error: result.error }));
                }
            });
        }
        
        // Save report to file
        const report = {
            timestamp: new Date().toISOString(),
            summary: { successful, failed, requiredFailed },
            steps: this.results
        };
        
        const reportPath = './i18ntk-reports/auto-run-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        if (showOutput) {
            console.log(`\n${this.ui.t('hardcodedTexts.reportSavedTo', { path: reportPath })}`);
            
            // Overall status
            const overallStatus = requiredFailed === 0 ? this.ui.t('hardcodedTexts.overallStatusSuccess') : this.ui.t('hardcodedTexts.overallStatusFailed');
            console.log(`\n${this.ui.t('hardcodedTexts.overallStatus', { status: overallStatus })}`);
            console.log('=' .repeat(60));
        }
    }

    /**
     * Prompt for custom settings configuration
     */
    async promptForSettings() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true,
            historySize: 0
        });

        const question = (prompt) => new Promise((resolve) => {
            rl.question(prompt, resolve);
        });

        console.log(`\n${this.ui.t('hardcodedTexts.customSettingsConfiguration')}\n`);
        console.log(`${this.ui.t('hardcodedTexts.pressEnterForDefaults')}\n`);

        try {
            const currentSettings = this.settingsManager.getSettings();
            const newSettings = { ...currentSettings };

            // Source directory
      const sourceDir = await question(this.ui.t('hardcodedTexts.sourceDirPrompt', { default: currentSettings.sourceDir || './locales' }));
      if (sourceDir.trim()) {
        newSettings.sourceDir = sourceDir.trim();
      }

      // Source language
      const sourceLang = await question(this.ui.t('hardcodedTexts.sourceLangPrompt', { default: currentSettings.sourceLanguage || 'en' }));
      if (sourceLang.trim()) {
        newSettings.sourceLanguage = sourceLang.trim();
      }

      // Target languages
      const defaultLangs = currentSettings.defaultLanguages || ['de', 'es', 'fr', 'ru'];
      const targetLangs = await question(this.ui.t('hardcodedTexts.targetLangsPrompt', { default: defaultLangs.join(', ') }));
      if (targetLangs.trim()) {
        newSettings.defaultLanguages = targetLangs.split(',').map(lang => lang.trim());
      }

      // Translation marker
      const marker = await question(this.ui.t('hardcodedTexts.translationMarkerPrompt', { default: currentSettings.processing?.notTranslatedMarker || 'NOT_TRANSLATED' }));
      if (marker.trim()) {
        if (!newSettings.processing) newSettings.processing = {};
        newSettings.processing.notTranslatedMarker = marker.trim();
      }

      // Output directory
      const outputDir = await question(this.ui.t('hardcodedTexts.outputDirPrompt', { default: currentSettings.outputDir || './i18ntk-reports' }));
      if (outputDir.trim()) {
        newSettings.outputDir = outputDir.trim();
      }

            // Save settings
            this.settingsManager.saveSettings(newSettings);
            console.log(`\n${this.ui.t('hardcodedTexts.settingsUpdatedSuccessfully')}\n`);

        } catch (error) {
            console.error(this.ui.t('hardcodedTexts.errorConfiguringSettings'), error.message);
        } finally {
            rl.close();
        }
    }

    /**
     * Show help information
     */
    showHelp() {
        console.log(this.ui.t('hardcodedTexts.autoRunScriptTitle'));
        console.log('=' .repeat(40));
        console.log(`\n${this.ui.t('hardcodedTexts.usageTitle')}`);
        console.log(`  ${this.ui.t('hardcodedTexts.runAllSteps')}`);
        console.log(`  ${this.ui.t('hardcodedTexts.configureSettingsFirst')}`);
        console.log(`  ${this.ui.t('hardcodedTexts.runSpecificSteps')}`);
        console.log(`  ${this.ui.t('hardcodedTexts.showHelp')}`);
        console.log(`\n${this.ui.t('hardcodedTexts.availableSteps')}`);
        this.steps.forEach((step, index) => {
            const required = step.required ? this.ui.t('hardcodedTexts.stepRequired') : this.ui.t('hardcodedTexts.stepOptional');
            console.log(`  ${index + 1}. ${step.name} ${required}`);
        });
        console.log(`\n${this.ui.t('hardcodedTexts.examplesTitle')}`);
        console.log(`  ${this.ui.t('hardcodedTexts.configExample')}`);
        console.log(`  ${this.ui.t('hardcodedTexts.stepsExample1')}`);
        console.log(`  ${this.ui.t('hardcodedTexts.stepsExample2')}`);
    }
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        return { action: 'help' };
    }
    
    if (args.includes('--config') || args.includes('-c')) {
        return { action: 'config' };
    }
    
    const stepsIndex = args.indexOf('--steps');
    if (stepsIndex !== -1 && args[stepsIndex + 1]) {
        const stepNumbers = args[stepsIndex + 1]
            .split(',')
            .map(s => parseInt(s.trim()))
            .filter(n => !isNaN(n));
        return { action: 'steps', steps: stepNumbers };
    }
    
    return { action: 'all' };
}

// Main execution
if (require.main === module) {
    const runner = new AutoRunner();
    const args = parseArgs();
    
    switch (args.action) {
        case 'help':
            runner.showHelp();
            break;
        case 'config':
            runner.promptForSettings().then(() => {
                console.log(`\n${runner.ui.t('hardcodedTexts.configurationComplete')}`);
                console.log(`${runner.ui.t('hardcodedTexts.runAutoRunCommand')}\n`);
            }).catch(error => {
                console.error(runner.ui.t('hardcodedTexts.configurationFailed'), error.message);
                process.exit(1);
            });
            break;
        case 'steps':
            if (args.steps.length === 0) {
                console.log(runner.ui.t('hardcodedTexts.noValidStepNumbers'));
                runner.showHelp();
                process.exit(1);
            }
            runner.runSteps(args.steps).catch(error => {
                console.error(runner.ui.t('hardcodedTexts.autoRunFailed'), error.message);
                process.exit(1);
            });
            break;
        case 'all':
        default:
            runner.runAll().catch(error => {
                console.error(runner.ui.t('hardcodedTexts.autoRunFailed'), error.message);
                process.exit(1);
            });
            break;
    }
}

module.exports = AutoRunner;