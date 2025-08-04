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
const i18n = require('./i18n-helper');

class LanguagePurityMaintainer {
    constructor() {
        this.toolsDir = __dirname;
        this.reportsDir = path.join(__dirname, 'i18ntk-reports');
        this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    }

    /**
     * Run the complete language purity maintenance workflow
     */
    async runCompleteWorkflow() {
        console.log(i18n.t('maintainLanguagePurity.workflow_title'));
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
            console.log(i18n.t('maintainLanguagePurity.step1_title'));
            console.log('==============================================\n');
            const initialAssessment = await this.runInitialAssessment();
            results.steps.push(initialAssessment);
            results.summary.initialViolations = initialAssessment.totalViolations;
            
            // Step 2: Detect and Fix Language Mismatches
            console.log(i18n.t('maintainLanguagePurity.step2_title'));
            console.log('===================================================\n');
            const mismatchFixes = await this.fixLanguageMismatches();
            results.steps.push(mismatchFixes);
            results.summary.totalFixesApplied += mismatchFixes.fixesApplied;
            
            // Step 3: Apply Automatic Translations
            console.log(i18n.t('maintainLanguagePurity.step3_title'));
            console.log('========================================\n');
            const translationFixes = await this.applyAutomaticTranslations();
            results.steps.push(translationFixes);
            results.summary.totalFixesApplied += translationFixes.fixesApplied;
            
            // Step 4: Final Assessment
            console.log(i18n.t('maintainLanguagePurity.step4_title'));
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
            console.error(i18n.t('maintainLanguagePurity.workflow_error', { errorMessage: error.message }));
            throw error;
        }
        
        return results;
    }

    /**
     * Run initial language purity assessment
     */
    async runInitialAssessment() {
        console.log(i18n.t('maintainLanguagePurity.running_initial_validation'));
        
        try {
            const output = execSync('node validate-language-purity.js', {
                cwd: this.toolsDir,
                encoding: 'utf8',
                stdio: 'pipe'
            });
            
            // Parse the output to extract violation counts
            const violationMatch = output.match(/Total violations: (\d+)/);
            const totalViolations = violationMatch ? parseInt(violationMatch[1]) : 0;
            
            console.log(i18n.t('maintainLanguagePurity.initial_assessment_complete', { count: totalViolations }));
            
            return {
                step: 'initial_assessment',
                success: true,
                totalViolations,
                output: output.substring(0, 1000) // Truncate for report
            };
        } catch (error) {
            console.log(i18n.t('maintainLanguagePurity.initial_assessment_warnings'));
            
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
        console.log(i18n.t('maintainLanguagePurity.detecting_fixing_mismatches'));
        
        try {
            // First, run detection to see what needs fixing
            const detectionOutput = execSync('node detect-language-mismatches.js', {
                cwd: this.toolsDir,
                encoding: 'utf8'
            });
            
            console.log(i18n.t('maintainLanguagePurity.detection_complete_applying_fixes'));
            
            // Apply auto-fixes
            const fixOutput = execSync('node detect-language-mismatches.js --auto-fix --apply', {
                cwd: this.toolsDir,
                encoding: 'utf8'
            });
            
            // Extract number of fixes applied
            const fixMatch = fixOutput.match(/(\d+) total fixes applied/);
            const fixesApplied = fixMatch ? parseInt(fixMatch[1]) : 0;
            
            console.log(i18n.t('maintainLanguagePurity.mismatch_fixes_complete', { count: fixesApplied }));
            
            return {
                step: 'language_mismatch_fixes',
                success: true,
                fixesApplied,
                output: fixOutput.substring(0, 1000)
            };
        } catch (error) {
            console.log(i18n.t('maintainLanguagePurity.mismatch_fixes_warnings'));
            
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
        console.log(i18n.t('maintainLanguagePurity.applying_automatic_translations'));
        
        try {
            // First, check what can be translated
            const previewOutput = execSync('node translate-mismatches.js --translate', {
                cwd: this.toolsDir,
                encoding: 'utf8'
            });
            
            console.log(i18n.t('maintainLanguagePurity.translation_preview_complete'));
            
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
        console.log(this.t('workflow.summary.title'));
        console.log(this.t('workflow.summary.separator'));
        
        console.log(this.t('workflow.summary.completedAt', { timestamp: results.timestamp }));
        console.log(this.t('workflow.summary.initialViolations', { count: results.summary.initialViolations }));
        console.log(this.t('workflow.summary.finalViolations', { count: results.summary.finalViolations }));
        console.log(this.t('workflow.summary.totalFixes', { count: results.summary.totalFixesApplied }));
        console.log(this.t('workflow.summary.improvement', { percentage: results.summary.improvementPercentage }));
        
        // Step-by-step results
        console.log(this.t('workflow.summary.stepResults'));
        results.steps.forEach((step, index) => {
            const status = step.success ? this.t('workflow.summary.success') : this.t('workflow.summary.warning');
            console.log(this.t('workflow.summary.stepDetail', { 
                number: index + 1, 
                status, 
                stepName: step.step.replace(/_/g, ' ').toUpperCase() 
            }));
            
            if (step.totalViolations !== undefined) {
                console.log(this.t('workflow.summary.violations', { count: step.totalViolations }));
            }
            if (step.fixesApplied !== undefined) {
                console.log(this.t('workflow.summary.fixesApplied', { count: step.fixesApplied }));
            }
            console.log('');
        });
        
        // Recommendations
        console.log(this.t('workflow.summary.nextSteps'));
        
        if (results.summary.finalViolations === 0) {
            console.log(this.t('workflow.summary.congratulations'));
            console.log(this.t('workflow.summary.cicdIntegration'));
            console.log(this.t('workflow.summary.automatedChecks'));
        } else if (results.summary.improvementPercentage >= 80) {
            console.log(this.t('workflow.summary.greatProgress'));
            console.log(this.t('workflow.summary.manualReview'));
            console.log(this.t('workflow.summary.addMappings'));
            console.log(this.t('workflow.summary.cicdIntegration'));
        } else if (results.summary.improvementPercentage >= 50) {
            console.log(this.t('workflow.summary.goodProgress'));
            console.log(this.t('workflow.summary.expandMappings'));
            console.log(this.t('workflow.summary.professionalReview'));
            console.log(this.t('workflow.summary.runAgain'));
        } else {
            console.log(this.t('workflow.summary.limitedProgress'));
            console.log(this.t('workflow.summary.reviewMappings'));
            console.log(this.t('workflow.summary.professionalServices'));
            console.log(this.t('workflow.summary.checkIssues'));
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