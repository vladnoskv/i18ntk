/**
 * Auto-Run Script for I18N Management Toolkit
 * Automatically executes the complete workflow after initialization
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class AutoRunner {
    constructor() {
        this.steps = [
            { name: 'Analyze Translations', command: 'node 02-analyze-translations.js', required: true },
            { name: 'Validate Translations', command: 'node 03-validate-translations.js', required: true },
            { name: 'Check Usage', command: 'node 04-check-usage.js', required: false },
            { name: 'Complete Translations', command: 'node 05-complete-translations.js', required: false },
            { name: 'Analyze Sizing', command: 'node 06-analyze-sizing.js', required: false },
            { name: 'Generate Summary', command: 'node 07-summary-report.js', required: true }
        ];
        this.results = [];
    }

    /**
     * Check if initialization has been completed
     */
    checkInitialization() {
        const requiredFiles = [
            './locales',
            './ui-locales/en.json',
            './user-config.json'
        ];

        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                console.log(`❌ Missing required file/directory: ${file}`);
                console.log('🔧 Please run initialization first: node 01-init-i18n.js');
                return false;
            }
        }

        console.log('✅ Initialization check passed');
        return true;
    }

    /**
     * Run a single command with proper error handling
     */
    async runCommand(step) {
        console.log(`\n🔄 Running: ${step.name}`);
        console.log(`   Command: ${step.command}`);
        console.log('-'.repeat(50));

        try {
            const startTime = Date.now();
            
            // Execute command with real-time output
            const result = execSync(step.command, { 
                stdio: 'inherit',
                timeout: 120000 // 2 minutes timeout
            });
            
            const duration = Date.now() - startTime;
            
            console.log(`✅ ${step.name} completed in ${duration}ms`);
            
            this.results.push({
                step: step.name,
                command: step.command,
                status: 'success',
                duration: duration,
                required: step.required
            });
            
            return true;
            
        } catch (error) {
            console.log(`❌ ${step.name} failed:`);
            console.log(`   Error: ${error.message}`);
            
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
    async runAll() {
        console.log('🚀 Starting Auto-Run Workflow');
        console.log('=' .repeat(60));
        
        // Check initialization
        if (!this.checkInitialization()) {
            process.exit(1);
        }
        
        console.log(`\n📋 Workflow includes ${this.steps.length} steps:`);
        this.steps.forEach((step, index) => {
            const required = step.required ? '(Required)' : '(Optional)';
            console.log(`   ${index + 1}. ${step.name} ${required}`);
        });
        
        console.log('\n⏱️  Starting execution...');
        
        // Run each step
        for (const step of this.steps) {
            const success = await this.runCommand(step);
            
            if (!success && step.required) {
                console.log('\n🛑 Workflow stopped due to required step failure.');
                this.generateReport();
                process.exit(1);
            }
            
            // Small delay between steps
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('\n🎉 Workflow completed!');
        this.generateReport();
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
    }

    /**
     * Generate execution report
     */
    generateReport() {
        console.log('\n📊 EXECUTION REPORT');
        console.log('=' .repeat(60));
        
        const successful = this.results.filter(r => r.status === 'success').length;
        const failed = this.results.filter(r => r.status === 'failed').length;
        const requiredFailed = this.results.filter(r => r.status === 'failed' && r.required).length;
        
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
        
        // Save report to file
        const report = {
            timestamp: new Date().toISOString(),
            summary: { successful, failed, requiredFailed },
            steps: this.results
        };
        
        const reportPath = './auto-run-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n💾 Report saved to: ${reportPath}`);
        
        // Overall status
        const overallStatus = requiredFailed === 0 ? '🟢 SUCCESS' : '🔴 FAILED';
        console.log(`\n📊 Overall Status: ${overallStatus}`);
        console.log('=' .repeat(60));
    }

    /**
     * Show help information
     */
    showHelp() {
        console.log('🤖 I18N Auto-Run Script');
        console.log('=' .repeat(40));
        console.log('\nUsage:');
        console.log('  node auto-run.js                    # Run all steps');
        console.log('  node auto-run.js --steps 1,2,3      # Run specific steps');
        console.log('  node auto-run.js --help             # Show this help');
        console.log('\nAvailable Steps:');
        this.steps.forEach((step, index) => {
            const required = step.required ? '(Required)' : '(Optional)';
            console.log(`  ${index + 1}. ${step.name} ${required}`);
        });
        console.log('\nExamples:');
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