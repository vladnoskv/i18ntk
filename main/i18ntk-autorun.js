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
const UIi18n = require('./ui-i18n');
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
            './settings/user-config.json'
        ];

        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                console.log(`❌ Missing required file/directory: ${file}`);
                console.log('🔧 Please run initialization first: node i18ntk-init.js');
                return false;
            }
        }

        console.log('✅ Initialization check passed');
        return true;
    }

    /**
     * Run a single command with proper error handling
     */
    async runCommand(step, quiet = false) {
        const isStandalone = require.main === module;
        const showOutput = isStandalone && !quiet;
        
        if (showOutput) {
            console.log(`\n🔄 Running: ${step.name}`);
            console.log(`   Command: ${step.command}`);
            console.log('-'.repeat(50));
        } else {
            // Show minimal output when called from menu
            console.log(`🔄 ${step.name}...`);
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
                console.log(`✅ ${step.name} completed in ${duration}ms`);
            } else {
                console.log(`✅ ${step.name} completed`);
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
                console.log(`❌ ${step.name} failed:`);
                console.log(`   Error: ${error.message}`);
            } else {
                console.log(`❌ ${step.name} failed: ${error.message}`);
            }
            
            this.results.push({
                step: step.name,
                command: step.command,
                status: 'failed',
                error: error.message,
                required: step.required
            });
            
            if (step.required) {
                console.log(`🛑 Required step failed. Stopping execution.`);
                return false;
            } else {
                console.log(`⚠️  Optional step failed. Continuing...`);
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
        
        if (showOutput) {
            console.log('🚀 Starting Auto-Run Workflow');
            console.log('=' .repeat(60));
        }
        
        // Check initialization
        if (!this.checkInitialization()) {
            process.exit(1);
        }
        
        if (showOutput) {
            console.log(`\n📋 Workflow includes ${this.steps.length} steps:`);
            this.steps.forEach((step, index) => {
                const required = step.required ? '(Required)' : '(Optional)';
                console.log(`   ${index + 1}. ${step.name} ${required}`);
            });
            
            console.log('\n⏱️  Starting execution...');
        }
        
        // Run each step
        for (const step of this.steps) {
            const success = await this.runCommand(step, quiet);
            
            if (!success && step.required) {
                if (showOutput) {
                    console.log('\n🛑 Workflow stopped due to required step failure.');
                } else {
                    console.log('🛑 Workflow stopped due to required step failure.');
                }
                this.generateReport(quiet);
                process.exit(1);
            }
            
            // Small delay between steps
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        if (showOutput) {
            console.log('\n🎉 Workflow completed!');
        }
        
        this.generateReport(quiet);
        
        // Only show success message and prompt when run standalone
        if (isStandalone) {
            console.log(this.ui.t('operations.completed'));
            await this.prompt('Press Enter to continue...');
        }
    }

    /**
     * Run specific steps only
     */
    async runSteps(stepNumbers) {
        console.log('🎯 Running Selected Steps');
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
                console.log(`❌ Invalid step number: ${stepNum}`);
            }
        }
        
        this.generateReport();
        
        // Only show success message and prompt when run standalone or from menu
        // Don't show when run as part of autorun workflow
        if (require.main === module) {
            console.log(this.ui.t('operations.completed'));
            await this.prompt('Press Enter to continue...');
        }
    }

    /**
     * Generate execution report
     */
    generateReport(quiet = false) {
        const isStandalone = require.main === module;
        const showOutput = isStandalone && !quiet;
        
        if (showOutput) {
            console.log('\n📊 EXECUTION REPORT');
            console.log('=' .repeat(60));
        }
        
        const successful = this.results.filter(r => r.status === 'success').length;
        const failed = this.results.filter(r => r.status === 'failed').length;
        const requiredFailed = this.results.filter(r => r.status === 'failed' && r.required).length;
        
        if (showOutput) {
            console.log(`✅ Successful: ${successful}`);
            console.log(`❌ Failed: ${failed}`);
            console.log(`🔴 Required Failed: ${requiredFailed}`);
            
            console.log('\n📋 Step Details:');
            this.results.forEach((result, index) => {
                const status = result.status === 'success' ? '✅' : '❌';
                const required = result.required ? '[REQ]' : '[OPT]';
                const duration = result.duration ? ` (${result.duration}ms)` : '';
                
                console.log(`   ${status} ${required} ${result.step}${duration}`);
                if (result.error) {
                    console.log(`       Error: ${result.error}`);
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
            console.log(`\n💾 Report saved to: ${reportPath}`);
            
            // Overall status
            const overallStatus = requiredFailed === 0 ? '🟢 SUCCESS' : '🔴 FAILED';
            console.log(`\n📊 Overall Status: ${overallStatus}`);
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

        console.log('\n🔧 Custom Settings Configuration\n');
        console.log('Press Enter to use default values or type new values:\n');

        try {
            const currentSettings = this.settingsManager.getSettings();
            const newSettings = { ...currentSettings };

            // Source directory
      const sourceDir = await question(`Source directory [${currentSettings.sourceDir || './locales'}]: `);
      if (sourceDir.trim()) {
        newSettings.sourceDir = sourceDir.trim();
      }

      // Source language
      const sourceLang = await question(`Source language [${currentSettings.sourceLanguage || 'en'}]: `);
      if (sourceLang.trim()) {
        newSettings.sourceLanguage = sourceLang.trim();
      }

      // Target languages
      const defaultLangs = currentSettings.defaultLanguages || ['de', 'es', 'fr', 'ru'];
      const targetLangs = await question(`Target languages (comma-separated) [${defaultLangs.join(', ')}]: `);
      if (targetLangs.trim()) {
        newSettings.defaultLanguages = targetLangs.split(',').map(lang => lang.trim());
      }

      // Translation marker
      const marker = await question(`Translation marker [${currentSettings.processing?.notTranslatedMarker || 'NOT_TRANSLATED'}]: `);
      if (marker.trim()) {
        if (!newSettings.processing) newSettings.processing = {};
        newSettings.processing.notTranslatedMarker = marker.trim();
      }

      // Output directory
      const outputDir = await question(`Output directory [${currentSettings.outputDir || './i18ntk-reports'}]: `);
      if (outputDir.trim()) {
        newSettings.outputDir = outputDir.trim();
      }

            // Save settings
            this.settingsManager.saveSettings(newSettings);
            console.log('\n✅ Settings updated successfully!\n');

        } catch (error) {
            console.error('❌ Error configuring settings:', error.message);
        } finally {
            rl.close();
        }
    }

    /**
     * Show help information
     */
    showHelp() {
        console.log('🤖 I18N Auto-Run Script');
        console.log('=' .repeat(40));
        console.log('\nUsage:');
        console.log('  node auto-run.js                    # Run all steps');
        console.log('  node auto-run.js --config           # Configure settings first');
        console.log('  node auto-run.js --steps 1,2,3      # Run specific steps');
        console.log('  node auto-run.js --help             # Show this help');
        console.log('\nAvailable Steps:');
        this.steps.forEach((step, index) => {
            const required = step.required ? '(Required)' : '(Optional)';
            console.log(`  ${index + 1}. ${step.name} ${required}`);
        });
        console.log('\nExamples:');
        console.log('  node auto-run.js --config           # Configure settings first');
        console.log('  node auto-run.js --steps 1,2        # Run only analyze and validate');
        console.log('  node auto-run.js --steps 6          # Run only summary report');
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
                console.log('\n🚀 Configuration complete! You can now run the auto-runner with:');
                console.log('  node auto-run.js\n');
            }).catch(error => {
                console.error('❌ Configuration failed:', error.message);
                process.exit(1);
            });
            break;
        case 'steps':
            if (args.steps.length === 0) {
                console.log('❌ No valid step numbers provided');
                runner.showHelp();
                process.exit(1);
            }
            runner.runSteps(args.steps).catch(error => {
                console.error('❌ Auto-run failed:', error.message);
                process.exit(1);
            });
            break;
        case 'all':
        default:
            runner.runAll().catch(error => {
                console.error('❌ Auto-run failed:', error.message);
                process.exit(1);
            });
            break;
    }
}

module.exports = AutoRunner;