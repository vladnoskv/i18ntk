#!/usr/bin/env node

/**
 * setup-validator.js - Comprehensive Setup Validation
 * 
 * Validates the foundational setup, identifies potential issues,
 * and provides actionable recommendations for improvement.
 */

const fs = require('fs');
const path = require('path');
const SecurityUtils = require('./security');


class SetupValidator {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            status: 'pending',
            checks: [],
            warnings: [],
            errors: [],
            recommendations: [],
            performance: {},
            security: {},
            compatibility: {}
        };
        this.config = null;
    }

    async validate() {
        console.log('🔍 Validating i18n Toolkit Setup...');
        console.log('====================================');
        
        try {
            await this.loadConfiguration();
            await this.validateFrameworkDetection();
            await this.validateDirectoryStructure();
            await this.validateDependencies();
            await this.validatePerformanceSettings();
            await this.validateSecuritySettings();
            await this.validateCompatibility();
            await this.generateValidationReport();
            
            this.results.status = this.results.errors.length === 0 ? 'passed' : 'failed';
            
            console.log(`\n📊 Validation Complete: ${this.results.status.toUpperCase()}`);
            console.log(`   ✅ Passed: ${this.results.checks.filter(c => c.status === 'passed').length}`);
            console.log(`   ⚠️  Warnings: ${this.results.warnings.length}`);
            console.log(`   ❌ Errors: ${this.results.errors.length}`);
            
            return this.results;
        } catch (error) {
            this.results.errors.push({
                category: 'validation',
                message: `Validation failed: ${error.message}`,
                severity: 'critical',
                fix: 'Check system configuration and permissions'
            });
            return this.results;
        }
    }

    async loadConfiguration() {
        const configPath = path.join(process.cwd(), 'i18ntk-config.json');
        
        if (SecurityUtils.safeExistsSync(configPath)) {
            try {
                this.config = JSON.parse(SecurityUtils.safeReadFileSync(configPath, path.dirname(configPath), 'utf8'));
                this.results.checks.push({
                    category: 'configuration',
                    message: 'Configuration file found and valid',
                    status: 'passed',
                    details: { path: configPath }
                });
            } catch (error) {
                this.results.errors.push({
                    category: 'configuration',
                    message: 'Invalid configuration file',
                    severity: 'high',
                    fix: 'Run setup script to regenerate configuration',
                    details: { error: error.message }
                });
            }
        } else {
            this.results.errors.push({
                category: 'configuration',
                message: 'Configuration file not found',
                severity: 'critical',
                fix: 'Run i18ntk-setup.js to create configuration',
                action: 'node main/i18ntk-setup.js'
            });
        }
    }

    async validateFrameworkDetection() {
        if (!this.config) return;

        const detectedLanguage = this.config.detectedLanguage;
        const detectedFramework = this.config.detectedFramework;

        // Check if detection is valid
        const validLanguages = ['javascript', 'typescript', 'python', 'java', 'go', 'php'];
        const validFrameworks = {
            javascript: ['react', 'vue', 'angular', 'nextjs', 'nuxt', 'svelte', 'generic'],
            typescript: ['react', 'vue', 'angular', 'nextjs', 'nuxt', 'generic'],
            python: ['django', 'flask', 'fastapi', 'generic'],
            java: ['spring', 'spring-boot', 'quarkus', 'generic'],
            go: ['gin', 'echo', 'fiber', 'generic'],
            php: ['laravel', 'symfony', 'wordpress', 'generic']
        };

        if (validLanguages.includes(detectedLanguage)) {
            this.results.checks.push({
                category: 'framework',
                message: `Language detected: ${detectedLanguage}`,
                status: 'passed',
                details: { detected: detectedLanguage }
            });
        } else {
            this.results.warnings.push({
                category: 'framework',
                message: 'Language detection may be inaccurate',
                severity: 'medium',
                fix: 'Manually specify language if needed',
                action: 'node main/i18ntk-setup.js --language [javascript|python|go|java|php]'
            });
        }

        if (detectedFramework && validFrameworks[detectedLanguage]?.includes(detectedFramework)) {
            this.results.checks.push({
                category: 'framework',
                message: `Framework detected: ${detectedFramework}`,
                status: 'passed',
                details: { detected: detectedFramework }
            });
        } else {
            this.results.warnings.push({
                category: 'framework',
                message: 'Framework detection uncertain',
                severity: 'low',
                fix: 'Verify framework detection or specify manually',
                action: 'node main/i18ntk-setup.js --framework [framework-name]'
            });
        }
    }

    async validateDirectoryStructure() {
        if (!this.config) return;

        const sourceDir = this.config.sourceDir;
        const outputDir = this.config.outputDir;

        // Check source directory
        if (SecurityUtils.safeExistsSync(sourceDir)) {
            const stats = fs.statSync(sourceDir);
            if (stats.isDirectory()) {
                const files = fs.readdirSync(sourceDir);
                const localeFiles = files.filter(f => f.endsWith('.json') || f.endsWith('.yml') || f.endsWith('.yaml'));
                
                this.results.checks.push({
                    category: 'directories',
                    message: 'Source directory exists',
                    status: 'passed',
                    details: { path: sourceDir, files: files.length, localeFiles: localeFiles.length }
                });

                if (localeFiles.length === 0) {
                    this.results.warnings.push({
                        category: 'directories',
                        message: 'No locale files found in source directory',
                        severity: 'medium',
                        fix: 'Add locale files or run initialization',
                        action: 'node main/i18ntk-init.js'
                    });
                }
            } else {
                this.results.errors.push({
                    category: 'directories',
                    message: 'Source path is not a directory',
                    severity: 'high',
                    fix: 'Check source directory configuration',
                    details: { path: sourceDir }
                });
            }
        } else {
            this.results.errors.push({
                category: 'directories',
                message: 'Source directory does not exist',
                severity: 'high',
                fix: 'Create source directory or run setup',
                action: 'node main/i18ntk-setup.js'
            });
        }

        // Check output directory
        if (!SecurityUtils.safeExistsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            this.results.checks.push({
                category: 'directories',
                message: 'Output directory created',
                status: 'passed',
                details: { path: outputDir }
            });
        } else {
            this.results.checks.push({
                category: 'directories',
                message: 'Output directory exists',
                status: 'passed',
                details: { path: outputDir }
            });
        }
    }

    async validateDependencies() {
        if (!this.config) return;

        const language = this.config.detectedLanguage;
        const framework = this.config.detectedFramework;

        // Check for language-specific dependencies
        const dependencies = {
            javascript: {
                required: [],
                recommended: ['i18next', 'react-i18next', 'vue-i18n', '@angular/localize'],
                dev: ['@types/i18next']
            },
            python: {
                required: [],
                recommended: ['django', 'flask-babel', 'babel'],
                dev: ['pytest']
            },
            go: {
                required: [],
                recommended: ['github.com/nicksnyder/go-i18n/v2/i18n'],
                dev: []
            },
            java: {
                required: [],
                recommended: ['spring-boot-starter-web', 'spring-context'],
                dev: ['spring-boot-starter-test']
            },
            php: {
                required: [],
                recommended: ['gettext', 'symfony/translation'],
                dev: ['phpunit/phpunit']
            }
        };

        const packageJsonPath = path.join(process.cwd(), 'package.json');
        const requirementsPath = path.join(process.cwd(), 'requirements.txt');
        const goModPath = path.join(process.cwd(), 'go.mod');
        const pomPath = path.join(process.cwd(), 'pom.xml');
        const composerPath = path.join(process.cwd(), 'composer.json');

        let hasDependencies = false;
        let hasRecommended = false;

        switch (language) {
            case 'javascript':
            case 'typescript':
                if (SecurityUtils.safeExistsSync(packageJsonPath)) {
                    try {
                        const packageJson = JSON.parse(SecurityUtils.safeReadFileSync(packageJsonPath, path.dirname(packageJsonPath), 'utf8'));
                        const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                        
                        const recommended = dependencies[language].recommended;
                        const found = recommended.filter(dep => allDeps[dep]);
                        
                        if (found.length > 0) {
                            hasDependencies = true;
                            hasRecommended = true;
                            this.results.checks.push({
                                category: 'dependencies',
                                message: 'i18n dependencies found',
                                status: 'passed',
                                details: { found: found }
                            });
                        } else {
                            this.results.warnings.push({
                                category: 'dependencies',
                                message: 'No i18n dependencies found',
                                severity: 'medium',
                                fix: 'Install recommended dependencies',
                                action: `npm install ${recommended.join(' ')}`
                            });
                        }
                    } catch (error) {
                        this.results.errors.push({
                            category: 'dependencies',
                            message: 'Cannot parse package.json',
                            severity: 'medium',
                            fix: 'Check package.json syntax',
                            details: { error: error.message }
                        });
                    }
                }
                break;

            case 'python':
                if (SecurityUtils.safeExistsSync(requirementsPath)) {
                    const requirements = SecurityUtils.safeReadFileSync(requirementsPath, path.dirname(requirementsPath), 'utf8');
                    const recommended = dependencies[language].recommended;
                    const found = recommended.filter(dep => requirements.includes(dep));
                    
                    if (found.length > 0) {
                        hasDependencies = true;
                        hasRecommended = true;
                        this.results.checks.push({
                            category: 'dependencies',
                            message: 'i18n dependencies found',
                            status: 'passed',
                            details: { found: found }
                        });
                    } else {
                        this.results.warnings.push({
                            category: 'dependencies',
                            message: 'No i18n dependencies found',
                            severity: 'medium',
                            fix: 'Install recommended dependencies',
                            action: `pip install ${recommended.join(' ')}`
                        });
                    }
                }
                break;

            case 'go':
                if (SecurityUtils.safeExistsSync(goModPath)) {
                    const goMod = SecurityUtils.safeReadFileSync(goModPath, path.dirname(goModPath), 'utf8');
                    const recommended = dependencies[language].recommended;
                    const found = recommended.filter(dep => goMod.includes(dep));
                    
                    if (found.length > 0) {
                        hasDependencies = true;
                        hasRecommended = true;
                        this.results.checks.push({
                            category: 'dependencies',
                            message: 'i18n dependencies found',
                            status: 'passed',
                            details: { found: found }
                        });
                    } else {
                        this.results.warnings.push({
                            category: 'dependencies',
                            message: 'No i18n dependencies found',
                            severity: 'medium',
                            fix: 'Install recommended dependencies',
                            action: `go get ${recommended.join(' ')}`
                        });
                    }
                }
                break;

            case 'java':
                if (SecurityUtils.safeExistsSync(pomPath)) {
                    const pom = SecurityUtils.safeReadFileSync(pomPath, path.dirname(pomPath), 'utf8');
                    const recommended = dependencies[language].recommended;
                    const found = recommended.filter(dep => pom.includes(dep));
                    
                    if (found.length > 0) {
                        hasDependencies = true;
                        hasRecommended = true;
                        this.results.checks.push({
                            category: 'dependencies',
                            message: 'i18n dependencies found',
                            status: 'passed',
                            details: { found: found }
                        });
                    } else {
                        this.results.warnings.push({
                            category: 'dependencies',
                            message: 'No i18n dependencies found',
                            severity: 'medium',
                            fix: 'Add recommended dependencies to pom.xml'
                        });
                    }
                }
                break;

            case 'php':
                if (SecurityUtils.safeExistsSync(composerPath)) {
                    try {
                        const composer = JSON.parse(SecurityUtils.safeReadFileSync(composerPath, path.dirname(composerPath), 'utf8'));
                        const allDeps = { ...composer.require, ...composer['require-dev'] };
                        
                        const recommended = dependencies[language].recommended;
                        const found = recommended.filter(dep => allDeps[dep]);
                        
                        if (found.length > 0) {
                            hasDependencies = true;
                            hasRecommended = true;
                            this.results.checks.push({
                                category: 'dependencies',
                                message: 'i18n dependencies found',
                                status: 'passed',
                                details: { found: found }
                            });
                        } else {
                            this.results.warnings.push({
                                category: 'dependencies',
                                message: 'No i18n dependencies found',
                                severity: 'medium',
                                fix: 'Install recommended dependencies',
                                action: `composer require ${recommended.join(' ')}`
                            });
                        }
                    } catch (error) {
                        this.results.errors.push({
                            category: 'dependencies',
                            message: 'Cannot parse composer.json',
                            severity: 'medium',
                            fix: 'Check composer.json syntax',
                            details: { error: error.message }
                        });
                    }
                }
                break;
        }
    }

    estimatePerformance(mode) {
        const performanceMap = {
            extreme: { improvement: 87, time: '38.90ms' },
            ultra: { improvement: 78, time: '336.8ms' },
            optimized: { improvement: 45, time: '847.9ms' }
        };
        return performanceMap[mode] || { improvement: 0, time: 'unknown' };
    }

    async validatePerformanceSettings() {
        if (!this.config) return;

        const optimization = this.config.optimization;
        
        // Validate performance mode
        const validModes = ['extreme', 'ultra', 'optimized'];
        if (validModes.includes(optimization.mode)) {
            this.results.checks.push({
                category: 'performance',
                message: `Performance mode set to: ${optimization.mode}`,
                status: 'passed',
                details: { mode: optimization.mode }
            });
        } else {
            this.results.warnings.push({
                category: 'performance',
                message: 'Invalid performance mode',
                severity: 'low',
                fix: 'Update performance mode',
                action: 'node main/i18ntk-setup.js --optimize'
            });
        }

        // Validate batch size
        const batchSize = optimization.batchSize;
        if (batchSize >= 100 && batchSize <= 10000) {
            this.results.checks.push({
                category: 'performance',
                message: 'Batch size within optimal range',
                status: 'passed',
                details: { batchSize: batchSize }
            });
        } else {
            this.results.warnings.push({
                category: 'performance',
                message: 'Batch size may impact performance',
                severity: 'low',
                fix: 'Adjust batch size',
                details: { current: batchSize, recommended: '100-10000' }
            });
        }

        // Check cache settings
        if (optimization.cacheEnabled) {
            this.results.checks.push({
                category: 'performance',
                message: 'Caching enabled',
                status: 'passed',
                details: { cacheEnabled: true }
            });
        } else {
            this.results.warnings.push({
                category: 'performance',
                message: 'Caching disabled may impact performance',
                severity: 'low',
                fix: 'Enable caching for better performance',
                action: 'node main/i18ntk-setup.js --cache-enabled'
            });
        }

        this.results.performance = {
            mode: optimization.mode,
            batchSize: batchSize,
            cacheEnabled: optimization.cacheEnabled,
            estimatedPerformance: this.estimatePerformance(optimization.mode)
        };
    }

    async validateSecuritySettings() {
        const security = this.config?.security || {};
        
        // Check admin PIN
        if (security.adminPinEnabled) {
            this.results.checks.push({
                category: 'security',
                message: 'Admin PIN protection enabled',
                status: 'passed',
                details: { adminPinEnabled: true }
            });
        } else {
            this.results.warnings.push({
                category: 'security',
                message: 'Admin PIN protection disabled',
                severity: 'medium',
                fix: 'Enable admin PIN for sensitive operations',
                action: 'node main/i18ntk-setup.js --security-enable'
            });
        }

        // Check session timeout
        const timeout = security.sessionTimeout;
        if (timeout >= 300000 && timeout <= 3600000) { // 5 minutes to 1 hour
            this.results.checks.push({
                category: 'security',
                message: 'Session timeout within secure range',
                status: 'passed',
                details: { timeout: timeout }
            });
        } else {
            this.results.warnings.push({
                category: 'security',
                message: 'Session timeout may be insecure',
                severity: 'medium',
                fix: 'Set session timeout between 5-60 minutes',
                action: 'node main/i18ntk-setup.js --session-timeout 1800000'
            });
        }

        // Check for sensitive data in locale files
        const sourceDir = this.config?.sourceDir;
        if (sourceDir && SecurityUtils.safeExistsSync(sourceDir)) {
            const sensitivePatterns = [
                /password/i,
                /secret/i,
                /api[_-]?key/i,
                /token/i,
                /private[_-]?key/i
            ];

            const files = fs.readdirSync(sourceDir);
            let sensitiveFound = false;

            for (const file of files) {
                const filePath = path.join(sourceDir, file);
                if (fs.statSync(filePath).isFile()) {
                    const content = SecurityUtils.safeReadFileSync(filePath, path.dirname(filePath), 'utf8');
                    
                    for (const pattern of sensitivePatterns) {
                        if (pattern.test(content)) {
                            sensitiveFound = true;
                            this.results.warnings.push({
                                category: 'security',
                                message: `Sensitive data detected in ${file}`,
                                severity: 'high',
                                fix: 'Remove sensitive data from locale files',
                                details: { file: file, pattern: pattern.source }
                            });
                        }
                    }
                }
            }

            if (!sensitiveFound) {
                this.results.checks.push({
                    category: 'security',
                    message: 'No sensitive data found in locale files',
                    status: 'passed'
                });
            }
        }

        this.results.security = {
            adminPinEnabled: security.adminPinEnabled,
            sessionTimeout: security.sessionTimeout,
            sensitiveDataFound: sensitiveFound || false
        };
    }

    async validateCompatibility() {
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

        if (majorVersion >= 16) {
            this.results.checks.push({
                category: 'compatibility',
                message: 'Node.js version compatible',
                status: 'passed',
                details: { version: nodeVersion, required: '>=16' }
            });
        } else {
            this.results.errors.push({
                category: 'compatibility',
                message: 'Node.js version incompatible',
                severity: 'critical',
                fix: 'Upgrade Node.js to version 16 or higher',
                details: { current: nodeVersion, required: '>=16' }
            });
        }

        // Check for common compatibility issues
        const checks = [
            { name: 'fs', test: () => require('fs') },
            { name: 'path', test: () => require('path') },
            { name: 'child_process', test: () => require('child_process') }
        ];

        for (const check of checks) {
            try {
                check.test();
                this.results.checks.push({
                    category: 'compatibility',
                    message: `${check.name} module available`,
                    status: 'passed'
                });
            } catch (error) {
                this.results.errors.push({
                    category: 'compatibility',
                    message: `${check.name} module not available`,
                    severity: 'critical',
                    fix: 'Check Node.js installation'
                });
            }
        }

        this.results.compatibility = {
            nodeVersion: nodeVersion,
            compatible: majorVersion >= 16,
            modules: checks.map(c => c.name)
        };
    }

    async generateValidationReport() {
        const reportPath = path.join(process.cwd(), 'i18ntk-validation-report.json');
        
        const report = {
            ...this.results,
            summary: {
                totalChecks: this.results.checks.length,
                totalWarnings: this.results.warnings.length,
                totalErrors: this.results.errors.length,
                status: this.results.status,
                nextSteps: this.generateNextSteps()
            }
        };

        SecurityUtils.safeWriteFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📋 Validation report saved: ${reportPath}`);

        // Print summary
        console.log('\n📊 Validation Summary:');
        console.log('====================');
        
        if (this.results.errors.length > 0) {
            console.log('\n❌ Critical Issues:');
            this.results.errors.forEach(error => {
                console.log(`   - ${error.message}`);
                if (error.action) {
                    console.log(`     Fix: ${error.action}`);
                }
            });
        }

        if (this.results.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            this.results.warnings.forEach(warning => {
                console.log(`   - ${warning.message}`);
                if (warning.action) {
                    console.log(`     Fix: ${warning.action}`);
                }
            });
        }

        console.log('\n✅ Passed Checks:');
        this.results.checks.forEach(check => {
            console.log(`   - ${check.message}`);
        });
    }

    generateNextSteps() {
        const steps = [];

        if (this.results.errors.length > 0) {
            steps.push('Fix critical errors before proceeding');
            steps.push('Run setup script: node main/i18ntk-setup.js');
        }

        if (this.results.warnings.length > 0) {
            steps.push('Review and address warnings');
            steps.push('Run validation: node utils/setup-validator.js');
        }

        if (this.results.status === 'passed') {
            steps.push('Setup is ready! Proceed with initialization');
            steps.push('Run: node main/i18ntk-init.js');
        }

        return steps;
    }
}

// CLI interface
if (require.main === module) {
    const validator = new SetupValidator();
    validator.validate().catch(console.error);
}

module.exports = SetupValidator;