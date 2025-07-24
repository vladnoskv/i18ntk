#!/usr/bin/env node

/**
 * Language Purity Maintenance Tool
 * 
 * This script provides a comprehensive workflow for maintaining language purity
 * across all locale files. It integrates detection, translation, and validation.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class LanguagePurityMaintainer {
    constructor() {
        this.toolsDir = __dirname;
        this.reportsDir = path.join(__dirname, 'i18n-reports');
        this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    }

    /**
     * Run the complete language purity maintenance workflow
     */
    async runCompleteWorkflow() {
        console.log('🚀 Language Purity Maintenance Workflow');
        console.log('==========================================\n');
        
        const results = {
            timestamp: new Date().toISOString(),
            steps: [],
            summary: {
                initialViolations: 0,
                finalViolations: 0,
                improvementPercentage: 0,
                totalFixesApplied: 0
            }
        };
        
        try {
            // Step 1: Initial Assessment
            console.log('📊 STEP 1: Initial Language Purity Assessment');
            console.log('==============================================\n');
            const initialAssessment = await this.runInitialAssessment();
            results.steps.push(initialAssessment);
            results.summary.initialViolations = initialAssessment.totalViolations;
            
            // Step 2: Detect and Fix Language Mismatches
            console.log('\n🔧 STEP 2: Detect and Auto-Fix Language Mismatches');
            console.log('===================================================\n');
            const mismatchFixes = await this.fixLanguageMismatches();
            results.steps.push(mismatchFixes);
            results.summary.totalFixesApplied += mismatchFixes.fixesApplied;
            
            // Step 3: Apply Automatic Translations
            console.log('\n🌐 STEP 3: Apply Automatic Translations');
            console.log('========================================\n');
            const translationFixes = await this.applyAutomaticTranslations();
            results.steps.push(translationFixes);
            results.summary.totalFixesApplied += translationFixes.fixesApplied;
            
            // Step 4: Final Assessment
            console.log('\n✅ STEP 4: Final Language Purity Assessment');
            console.log('============================================\n');
            const finalAssessment = await this.runFinalAssessment();
            results.steps.push(finalAssessment);
            results.summary.finalViolations = finalAssessment.totalViolations;
            
            // Calculate improvement
            if (results.summary.initialViolations > 0) {
                const improvement = results.summary.initialViolations - results.summary.finalViolations;
                results.summary.improvementPercentage = Math.round((improvement / results.summary.initialViolations) * 100);
            }
            
            // Generate final report
            this.generateWorkflowReport(results);
            
        } catch (error) {
            console.error('❌ Workflow Error:', error.message);
            throw error;
        }
        
        return results;
    }

    /**
     * Run initial language purity assessment
     */
    async runInitialAssessment() {
        console.log('Running initial language purity validation...');
        
        try {
            const output = execSync('node validate-language-purity.js', {
                cwd: this.toolsDir,
                encoding: 'utf8',
                stdio: 'pipe'
            });
            
            // Parse the output to extract violation counts
            const violationMatch = output.match(/Total violations: (\d+)/);
            const totalViolations = violationMatch ? parseInt(violationMatch[1]) : 0;
            
            console.log(`✅ Initial assessment complete: ${totalViolations} violations found\n`);
            
            return {
                step: 'initial_assessment',
                success: true,
                totalViolations,
                output: output.substring(0, 1000) // Truncate for report
            };
        } catch (error) {
            console.log(`⚠️  Initial assessment completed with warnings\n`);
            
            // Even if exit code is non-zero, we can still extract useful info
            const output = error.stdout || error.message;
            const violationMatch = output.match(/Total violations: (\d+)/);
            const totalViolations = violationMatch ? parseInt(violationMatch[1]) : 0;
            
            return {
                step: 'initial_assessment',
                success: false,
                totalViolations,
                output: output.substring(0, 1000)
            };
        }
    }

    /**
     * Fix language mismatches (remove prefixes, etc.)
     */
    async fixLanguageMismatches() {
        console.log('Detecting and fixing language mismatches...');
        
        try {
            // First, run detection to see what needs fixing
            const detectionOutput = execSync('node detect-language-mismatches.js', {
                cwd: this.toolsDir,
                encoding: 'utf8'
            });
            
            console.log('Detection complete. Applying auto-fixes...');
            
            // Apply auto-fixes
            const fixOutput = execSync('node detect-language-mismatches.js --auto-fix --apply', {
                cwd: this.toolsDir,
                encoding: 'utf8'
            });
            
            // Extract number of fixes applied
            const fixMatch = fixOutput.match(/(\d+) total fixes applied/);
            const fixesApplied = fixMatch ? parseInt(fixMatch[1]) : 0;
            
            console.log(`✅ Language mismatch fixes complete: ${fixesApplied} fixes applied\n`);
            
            return {
                step: 'language_mismatch_fixes',
                success: true,
                fixesApplied,
                output: fixOutput.substring(0, 1000)
            };
        } catch (error) {
            console.log(`⚠️  Language mismatch fixes completed with warnings\n`);
            
            const output = error.stdout || error.message;
            const fixMatch = output.match(/(\d+) total fixes applied/);
            const fixesApplied = fixMatch ? parseInt(fixMatch[1]) : 0;
            
            return {
                step: 'language_mismatch_fixes',
                success: false,
                fixesApplied,
                output: output.substring(0, 1000)
            };
        }
    }

    /**
     * Apply automatic translations
     */
    async applyAutomaticTranslations() {
        console.log('Applying automatic translations...');
        
        try {
            // First, check what can be translated
            const previewOutput = execSync('node translate-mismatches.js --translate', {
                cwd: this.toolsDir,
                encoding: 'utf8'
            });
            
            console.log('Translation preview complete. Applying translations...');
            
            // Apply translations
            const applyOutput = execSync('node translate-mismatches.js --apply', {
                cwd: this.toolsDir,
                encoding: 'utf8'
            });
            
            // Extract number of translations applied
            const translationMatch = applyOutput.match(/(\d+) translations/);
            const fixesApplied = translationMatch ? parseInt(translationMatch[1]) : 0;
            
            console.log(`✅ Automatic translations complete: ${fixesApplied} translations applied\n`);
            
            return {
                step: 'automatic_translations',
                success: true,
                fixesApplied,
                output: applyOutput.substring(0, 1000)
            };
        } catch (error) {
            console.log(`⚠️  Automatic translations completed with warnings\n`);
            
            const output = error.stdout || error.message;
            const translationMatch = output.match(/(\d+) translations/);
            const fixesApplied = translationMatch ? parseInt(translationMatch[1]) : 0;
            
            return {
                step: 'automatic_translations',
                success: false,
                fixesApplied,
                output: output.substring(0, 1000)
            };
        }
    }

    /**
     * Run final language purity assessment
     */
    async runFinalAssessment() {
        console.log('Running final language purity validation...');
        
        try {
            const output = execSync('node validate-language-purity.js', {
                cwd: this.toolsDir,
                encoding: 'utf8',
                stdio: 'pipe'
            });
            
            const violationMatch = output.match(/Total violations: (\d+)/);
            const totalViolations = violationMatch ? parseInt(violationMatch[1]) : 0;
            
            console.log(`✅ Final assessment complete: ${totalViolations} violations remaining\n`);
            
            return {
                step: 'final_assessment',
                success: true,
                totalViolations,
                output: output.substring(0, 1000)
            };
        } catch (error) {
            console.log(`⚠️  Final assessment completed with warnings\n`);
            
            const output = error.stdout || error.message;
            const violationMatch = output.match(/Total violations: (\d+)/);
            const totalViolations = violationMatch ? parseInt(violationMatch[1]) : 0;
            
            return {
                step: 'final_assessment',
                success: false,
                totalViolations,
                output: output.substring(0, 1000)
            };
        }
    }

    /**
     * Generate comprehensive workflow report
     */
    generateWorkflowReport(results) {
        console.log('📋 WORKFLOW SUMMARY');
        console.log('===================\n');
        
        console.log(`🕐 Workflow completed at: ${results.timestamp}`);
        console.log(`📊 Initial violations: ${results.summary.initialViolations}`);
        console.log(`📉 Final violations: ${results.summary.finalViolations}`);
        console.log(`🔧 Total fixes applied: ${results.summary.totalFixesApplied}`);
        console.log(`📈 Improvement: ${results.summary.improvementPercentage}%\n`);
        
        // Step-by-step results
        console.log('📝 STEP RESULTS:\n');
        results.steps.forEach((step, index) => {
            const status = step.success ? '✅' : '⚠️';
            console.log(`${index + 1}. ${status} ${step.step.replace(/_/g, ' ').toUpperCase()}`);
            
            if (step.totalViolations !== undefined) {
                console.log(`   Violations: ${step.totalViolations}`);
            }
            if (step.fixesApplied !== undefined) {
                console.log(`   Fixes applied: ${step.fixesApplied}`);
            }
            console.log('');
        });
        
        // Recommendations
        console.log('💡 NEXT STEPS:\n');
        
        if (results.summary.finalViolations === 0) {
            console.log('🎉 Congratulations! All locale files now have perfect language purity!');
            console.log('✅ Consider integrating the validator into your CI/CD pipeline');
            console.log('✅ Set up automated checks for new translations\n');
        } else if (results.summary.improvementPercentage >= 80) {
            console.log('🎯 Great progress! Most issues have been resolved.');
            console.log('🔍 Review remaining violations manually');
            console.log('🌐 Consider adding more translation mappings for edge cases');
            console.log('✅ Integrate validator into CI/CD pipeline\n');
        } else if (results.summary.improvementPercentage >= 50) {
            console.log('📈 Good progress made, but more work needed.');
            console.log('🔧 Expand automatic translation mappings');
            console.log('👥 Consider manual review of complex translations');
            console.log('🔄 Run workflow again after adding more mappings\n');
        } else {
            console.log('⚠️  Limited progress. Manual intervention may be needed.');
            console.log('🔍 Review translation mappings and add missing ones');
            console.log('👥 Consider professional translation services');
            console.log('🔧 Check for systematic issues in locale files\n');
        }
        
        // Save detailed report
        this.saveWorkflowReport(results);
    }

    /**
     * Save workflow report to file
     */
    saveWorkflowReport(results) {
        const reportPath = path.join(this.reportsDir, 'workflow', `language-purity-workflow-${this.timestamp}.json`);
        
        // Ensure directory exists
        const reportDir = path.dirname(reportPath);
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        
        try {
            fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
            console.log(`📄 Detailed workflow report saved to: ${reportPath}\n`);
        } catch (error) {
            console.error(`❌ Error saving workflow report: ${error.message}\n`);
        }
    }

    /**
     * Quick validation check
     */
    async quickValidation() {
        console.log('🔍 Quick Language Purity Check');
        console.log('===============================\n');
        
        try {
            const output = execSync('node validate-language-purity.js', {
                cwd: this.toolsDir,
                encoding: 'utf8',
                stdio: 'pipe'
            });
            
            const violationMatch = output.match(/Total violations: (\d+)/);
            const totalViolations = violationMatch ? parseInt(violationMatch[1]) : 0;
            
            if (totalViolations === 0) {
                console.log('✅ All locale files have perfect language purity!\n');
            } else {
                console.log(`⚠️  ${totalViolations} language purity violations found.`);
                console.log('💡 Run the full workflow to fix these issues:\n');
                console.log('   node maintain-language-purity.js --workflow\n');
            }
            
            return totalViolations;
        } catch (error) {
            const output = error.stdout || error.message;
            const violationMatch = output.match(/Total violations: (\d+)/);
            const totalViolations = violationMatch ? parseInt(violationMatch[1]) : 0;
            
            console.log(`⚠️  ${totalViolations} language purity violations found.`);
            console.log('💡 Run the full workflow to fix these issues:\n');
            console.log('   node maintain-language-purity.js --workflow\n');
            
            return totalViolations;
        }
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const maintainer = new LanguagePurityMaintainer();
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Language Purity Maintenance Tool

Usage:
  node maintain-language-purity.js [options]

Options:
  --workflow           Run the complete language purity maintenance workflow
  --quick              Run a quick validation check only
  --help, -h           Show this help message

Examples:
  node maintain-language-purity.js --workflow     # Full maintenance workflow
  node maintain-language-purity.js --quick        # Quick validation check
  node maintain-language-purity.js               # Default: quick check

Workflow Steps:
  1. Initial language purity assessment
  2. Detect and auto-fix language mismatches
  3. Apply automatic translations
  4. Final language purity assessment
  5. Generate comprehensive report
`);
        process.exit(0);
    }
    
    if (args.includes('--workflow')) {
        maintainer.runCompleteWorkflow().then(results => {
            const exitCode = results.summary.finalViolations > 0 ? 1 : 0;
            process.exit(exitCode);
        }).catch(error => {
            console.error('❌ Workflow Error:', error.message);
            process.exit(1);
        });
    } else {
        // Default: quick validation
        maintainer.quickValidation().then(violations => {
            const exitCode = violations > 0 ? 1 : 0;
            process.exit(exitCode);
        }).catch(error => {
            console.error('❌ Validation Error:', error.message);
            process.exit(1);
        });
    }
}

module.exports = LanguagePurityMaintainer;