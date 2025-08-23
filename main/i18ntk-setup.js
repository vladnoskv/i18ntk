#!/usr/bin/env node

/**
 * i18ntk-setup.js - Foundational Setup Script
 * 
 * This script runs before all other initialization or operational scripts.
 * It configures the core framework, detects programming language/framework,
 * specifies translation file locations, and establishes essential prerequisites.
 */

const fs = require('fs');
const path = require('path');

const SettingsManager = require('../settings/settings-manager');

class I18nSetupManager {
    constructor() {
        this.config = {
            detectedLanguage: null,
            detectedFramework: null,
            sourceDir: './locales',
            outputDir: './i18ntk-reports',
            frameworkConfig: {},
            prerequisites: {},
            optimization: {
                mode: 'auto',
                cacheEnabled: true,
                batchSize: 1000
            }
        };
        this.supportedLanguages = ['javascript', 'typescript', 'python', 'java', 'go', 'php'];
        this.supportedFrameworks = {
            javascript: ['react', 'vue', 'angular', 'nextjs', 'nuxt', 'svelte'],
            typescript: ['react', 'vue', 'angular', 'nextjs', 'nuxt'],
            python: ['django', 'flask', 'fastapi'],
            java: ['spring', 'spring-boot', 'quarkus'],
            go: ['gin', 'echo', 'fiber'],
            php: ['laravel', 'symfony', 'wordpress']
        };
    }

    async setup() {
        console.log('🔧 i18n Toolkit - Foundational Setup');
        console.log('=====================================');
        
        try {
            await this.detectEnvironment();
            await this.configureFramework();
            await this.validatePrerequisites();
            await this.optimizeForLanguage();
            await this.generateSetupReport();
            
            console.log('✅ Setup completed successfully!');
            return this.config;
        } catch (error) {
            console.error('❌ Setup failed:', error.message);
            process.exit(1);
        }
    }

    async detectEnvironment() {
        console.log('📍 Detecting environment...');
        
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        const pyprojectPath = path.join(process.cwd(), 'pyproject.toml');
        const requirementsPath = path.join(process.cwd(), 'requirements.txt');
        const goModPath = path.join(process.cwd(), 'go.mod');
        const pomPath = path.join(process.cwd(), 'pom.xml');
        const composerPath = path.join(process.cwd(), 'composer.json');

        if (fs.existsSync(packageJsonPath)) {
            this.config.detectedLanguage = 'javascript';
            await this.detectNodeFramework(packageJsonPath);
        } else if (fs.existsSync(pyprojectPath) || fs.existsSync(requirementsPath)) {
            this.config.detectedLanguage = 'python';
            await this.detectPythonFramework();
        } else if (fs.existsSync(goModPath)) {
            this.config.detectedLanguage = 'go';
            this.config.detectedFramework = 'generic';
        } else if (fs.existsSync(pomPath)) {
            this.config.detectedLanguage = 'java';
            await this.detectJavaFramework(pomPath);
        } else if (fs.existsSync(composerPath)) {
            this.config.detectedLanguage = 'php';
            await this.detectPhpFramework(composerPath);
        } else {
            this.config.detectedLanguage = 'generic';
            this.config.detectedFramework = 'generic';
        }

        console.log(`   Language: ${this.config.detectedLanguage}`);
        console.log(`   Framework: ${this.config.detectedFramework}`);
    }

    async detectNodeFramework(packageJsonPath) {
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

            if (deps.react || deps['react-dom']) this.config.detectedFramework = 'react';
            else if (deps.vue || deps['vue-router']) this.config.detectedFramework = 'vue';
            else if (deps['@angular/core']) this.config.detectedFramework = 'angular';
            else if (deps.next) this.config.detectedFramework = 'nextjs';
            else if (deps.nuxt) this.config.detectedFramework = 'nuxt';
            else if (deps.svelte) this.config.detectedFramework = 'svelte';
            else this.config.detectedFramework = 'generic';
        } catch (error) {
            this.config.detectedFramework = 'generic';
        }
    }

    async detectPythonFramework() {
        try {
            const requirementsPath = path.join(process.cwd(), 'requirements.txt');
            if (fs.existsSync(requirementsPath)) {
                const requirements = fs.readFileSync(requirementsPath, 'utf8');
                if (requirements.includes('django')) this.config.detectedFramework = 'django';
                else if (requirements.includes('flask')) this.config.detectedFramework = 'flask';
                else if (requirements.includes('fastapi')) this.config.detectedFramework = 'fastapi';
                else this.config.detectedFramework = 'generic';
            } else {
                this.config.detectedFramework = 'generic';
            }
        } catch (error) {
            this.config.detectedFramework = 'generic';
        }
    }

    async detectJavaFramework(pomPath) {
        try {
            const pomContent = fs.readFileSync(pomPath, 'utf8');
            if (pomContent.includes('spring-boot')) this.config.detectedFramework = 'spring-boot';
            else if (pomContent.includes('spring')) this.config.detectedFramework = 'spring';
            else if (pomContent.includes('quarkus')) this.config.detectedFramework = 'quarkus';
            else this.config.detectedFramework = 'generic';
        } catch (error) {
            this.config.detectedFramework = 'generic';
        }
    }

    async detectPhpFramework(composerPath) {
        try {
            const composer = JSON.parse(fs.readFileSync(composerPath, 'utf8'));
            const deps = composer.require || {};
            
            if (deps['laravel/framework']) this.config.detectedFramework = 'laravel';
            else if (deps['symfony/framework-bundle']) this.config.detectedFramework = 'symfony';
            else if (deps['wordpress']) this.config.detectedFramework = 'wordpress';
            else this.config.detectedFramework = 'generic';
        } catch (error) {
            this.config.detectedFramework = 'generic';
        }
    }

    async configureFramework() {
        console.log('⚙️  Configuring framework...');
        
        const frameworkConfigs = {
            javascript: {
                sourcePatterns: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
                i18nLibraries: ['i18next', 'react-i18next', 'vue-i18n', '@angular/localize'],
                defaultLocalePath: './src/locales',
                extractPatterns: [
                    /t\(['"`]([^'"`]+)['"`]/g,
                    /i18n\.t\(['"`]([^'"`]+)['"`]/g,
                    /\$t\(['"`]([^'"`]+)['"`]/g
                ]
            },
            python: {
                sourcePatterns: ['**/*.py'],
                i18nLibraries: ['django', 'flask-babel', 'babel'],
                defaultLocalePath: './locale',
                extractPatterns: [
                    /_\(['"`]([^'"`]+)['"`]/g,
                    /gettext\(['"`]([^'"`]+)['"`]/g
                ]
            },
            go: {
                sourcePatterns: ['**/*.go'],
                i18nLibraries: ['go-i18n', 'nicksnyder/go-i18n'],
                defaultLocalePath: './locales',
                extractPatterns: [
                    /Localize\([^)]*MessageID:\s*['"`]([^'"`]+)['"`]/g
                ]
            },
            java: {
                sourcePatterns: ['**/*.java'],
                i18nLibraries: ['spring-boot-starter-web', 'spring-context'],
                defaultLocalePath: './src/main/resources/messages',
                extractPatterns: [
                    /getMessage\(['"`]([^'"`]+)['"`]/g,
                    /@Value\(['"`]([^'"`]+)['"`]/g
                ]
            },
            php: {
                sourcePatterns: ['**/*.php'],
                i18nLibraries: ['gettext', 'symfony/translation'],
                defaultLocalePath: './resources/lang',
                extractPatterns: [
                    /_\(['"`]([^'"`]+)['"`]/g,
                    /trans\(['"`]([^'"`]+)['"`]/g
                ]
            }
        };

        this.config.frameworkConfig = frameworkConfigs[this.config.detectedLanguage] || frameworkConfigs.javascript;
        
        // Auto-detect source directory
        const possiblePaths = [
            this.config.frameworkConfig.defaultLocalePath,
            './locales',
            './i18n',
            './translations',
            './src/i18n',
            './app/i18n'
        ];

        for (const dirPath of possiblePaths) {
            if (fs.existsSync(dirPath)) {
                this.config.sourceDir = dirPath;
                break;
            }
        }

        console.log(`   Source directory: ${this.config.sourceDir}`);
    }

    async validatePrerequisites() {
        console.log('🔍 Validating prerequisites...');
        
        this.config.prerequisites = {
            nodeVersion: process.version,
            nodeVersionValid: parseInt(process.version.slice(1).split('.')[0]) >= 16,
            hasPackageJson: fs.existsSync('package.json'),
            hasLocales: fs.existsSync(this.config.sourceDir),
            hasGit: this.checkCommand('git'),
            hasNpm: this.checkCommand('npm'),
            hasPython: this.checkCommand('python3') || this.checkCommand('python'),
            hasJava: this.checkCommand('java'),
            hasGo: this.checkCommand('go'),
            hasPhp: this.checkCommand('php')
        };

        // Check for i18n libraries
        if (this.config.detectedLanguage === 'javascript') {
            const packageJsonPath = path.join(process.cwd(), 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                
                this.config.prerequisites.hasI18nLibrary = Object.keys(deps).some(dep => 
                    this.config.frameworkConfig.i18nLibraries.some(lib => dep.includes(lib))
                );
            }
        }

        Object.entries(this.config.prerequisites).forEach(([key, value]) => {
            if (typeof value === 'boolean') {
                console.log(`   ${key}: ${value ? '✅' : '❌'}`);
            } else {
                console.log(`   ${key}: ${value}`);
            }
        });
    }

    checkCommand(command) {
        // Secure command checking without child_process
        const extensions = process.platform === 'win32' ? ['.exe', '.cmd', '.bat'] : [''];
        const pathEnv = process.env.PATH || process.env.Path || '';
        const pathDirs = pathEnv.split(process.platform === 'win32' ? ';' : ':');
        
        for (const dir of pathDirs) {
            for (const ext of extensions) {
                const fullPath = path.join(dir, command + ext);
                try {
                    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                        return true;
                    }
                } catch {
                    // Ignore errors accessing files
                }
            }
        }
        return false;
    }

    async optimizeForLanguage() {
        console.log('🚀 Optimizing for language...');
        
        const optimizationStrategies = {
            javascript: {
                mode: 'extreme',
                cacheEnabled: true,
                batchSize: 1000,
                parallelProcessing: true,
                treeShaking: true
            },
            python: {
                mode: 'ultra',
                cacheEnabled: true,
                batchSize: 500,
                asyncProcessing: true,
                lazyLoading: true
            },
            go: {
                mode: 'extreme',
                cacheEnabled: true,
                batchSize: 2000,
                concurrentProcessing: true,
                memoryOptimization: true
            },
            java: {
                mode: 'ultra',
                cacheEnabled: true,
                batchSize: 800,
                jvmOptimization: true,
                connectionPooling: true
            },
            php: {
                mode: 'optimized',
                cacheEnabled: true,
                batchSize: 300,
                opcacheEnabled: true,
                memoryLimit: '256M'
            }
        };

        this.config.optimization = {
            ...this.config.optimization,
            ...optimizationStrategies[this.config.detectedLanguage]
        };

        // Update configuration using SettingsManager
        const SettingsManager = require('../settings/settings-manager');
        const settingsManager = new SettingsManager();
        
        settingsManager.updateSettings({
            'sourceDir': this.config.sourceDir,
            'outputDir': this.config.outputDir,
            'detectedLanguage': this.config.detectedLanguage,
            'detectedFramework': this.config.detectedFramework,
            'optimization': this.config.optimization,
            'prerequisites': this.config.prerequisites,
            'security.adminPinEnabled': false,
            'security.sessionTimeout': 1800000,
            'security.maxFailedAttempts': 3,
            'setup.completed': true,
            'setup.completedAt': new Date().toISOString(),
            'setup.version': require('../package.json').version,
            'setup.setupId': `setup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        
        console.log(`   Configuration updated in settings/i18ntk-config.json`);
    }

    async generateSetupReport() {
        console.log('📊 Generating setup report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            setup: {
                language: this.config.detectedLanguage,
                framework: this.config.detectedFramework,
                sourceDirectory: this.config.sourceDir,
                optimizationMode: this.config.optimization.mode,
                prerequisitesMet: Object.values(this.config.prerequisites).filter(v => v === true).length,
                totalPrerequisites: Object.values(this.config.prerequisites).filter(v => typeof v === 'boolean').length
            },
            recommendations: this.generateRecommendations(),
            nextSteps: [
                'Run i18ntk-init to initialize your project',
                'Run i18ntk-analyze to scan for translations',
                'Run i18ntk-validate to validate your setup'
            ]
        };

        // Save report using SettingsManager
        const settingsManager = new SettingsManager();
        settingsManager.updateSetting('setupReport', report);
        
        // Also save a local copy for user reference
        const reportPath = path.join(process.cwd(), 'i18ntk-setup-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`   Setup report saved: ${reportPath}`);
    }

    generateRecommendations() {
        const recommendations = [];

        if (!this.config.prerequisites.hasLocales) {
            recommendations.push({
                type: 'warning',
                message: 'No locale directory found. Run i18ntk-init to create one.',
                action: 'i18ntk-init'
            });
        }

        if (this.config.detectedLanguage === 'javascript' && !this.config.prerequisites.hasI18nLibrary) {
            recommendations.push({
                type: 'info',
                message: 'Consider installing an i18n library for better integration',
                action: 'npm install i18next'
            });
        }

        if (!this.config.prerequisites.nodeVersionValid) {
            recommendations.push({
                type: 'error',
                message: 'Node.js version 16+ required',
                action: 'Upgrade Node.js'
            });
        }

        return recommendations;
    }
}

// CLI interface
if (require.main === module) {
    const setupManager = new I18nSetupManager();
    setupManager.setup().catch(console.error);
}

// Export both the class and a run function for direct usage
module.exports = I18nSetupManager;
module.exports.run = async function() {
    const setupManager = new I18nSetupManager();
    return await setupManager.setup();
};