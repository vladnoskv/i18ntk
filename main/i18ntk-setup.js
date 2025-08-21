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

const { SettingsManager } = require('../settings/settings-manager');
const { pathConfig } = require('../utils/path-config');
const SecurityUtils = require('../utils/security');
const { getSettingsManager } = require('../utils/config-helper');

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
        this.supportedFrameworks = {
            javascript: ['react', 'vue', 'angular', 'nextjs', 'nuxt', 'svelte'],
            typescript: ['react', 'vue', 'angular', 'nextjs', 'nuxt'],
            python: ['django', 'flask', 'fastapi'],
            java: ['spring', 'spring-boot', 'quarkus'],
            go: ['gin', 'echo', 'fiber'],
            php: ['laravel', 'symfony', 'wordpress']
        }
    }

    async setup() {
        const isQuiet = process.argv.includes('--quiet') || process.env.I18N_QUIET === 'true';
        
        // Check if setup is already done
        const currentSettings = getSettingsManager().loadSettings();
        
        if (currentSettings.setupDone && !process.argv.includes('--force')) {
            if (!isQuiet) {
                console.log('✅ Setup already completed. Use --force to re-run setup.');
                console.log('   Current configuration:');
                console.log(`   Language: ${currentSettings.detectedLanguage || 'auto'}`);
                console.log(`   Framework: ${currentSettings.detectedFramework || 'auto'}`);
                console.log(`   Source: ${currentSettings.sourceDir}`);
                console.log(`   Output: ${currentSettings.outputDir}`);
            }
            return this.config;
        }
        
        if (!isQuiet) {
            console.log('🔧 i18n Toolkit - Foundational Setup');
            console.log('=====================================');
        }
        
        try {
            // Check if user wants manual configuration
            const useManual = process.argv.includes('--manual') || 
                            (process.argv.includes('--language') && process.argv.includes('--framework'));
            
            if (useManual) {
                if (!isQuiet) console.log('🛠️  Using manual configuration...');
                await this.manualConfiguration();
            } else {
                await this.detectEnvironment();
                await this.configureFramework();
            }
            
            await this.validatePrerequisites();
            await this.optimizeForLanguage();
            
            // Mark setup as completed
            getSettingsManager().updateSetting('setupDone', true);
            
            if (!isQuiet) {
                await this.generateSetupReport();
                console.log('✅ Setup completed successfully!');
            }
            
            return this.config;
        } catch (error) {
            console.error('❌ Setup failed:', error.message);
            process.exit(1);
        }
    }

    async promptForManualSetup() {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        return new Promise((resolve) => {
            rl.question('Would you like to manually configure your language and framework? (y/N): ', (answer) => {
                rl.close();
                resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
            });
        });
    }

    async manualConfiguration() {
        const isQuiet = process.argv.includes('--quiet') || process.env.I18N_QUIET === 'true';
        
        if (!isQuiet) {
            console.log('🛠️  Manual Configuration Mode');
            console.log('=============================');
        }

        // Parse CLI arguments first
        const languageArg = process.argv.find(arg => arg.startsWith('--language='));
        const frameworkArg = process.argv.find(arg => arg.startsWith('--framework='));
        const sourceDirArg = process.argv.find(arg => arg.startsWith('--source-dir='));
        const outputDirArg = process.argv.find(arg => arg.startsWith('--output-dir='));

        if (languageArg) {
            this.config.language = languageArg.split('=')[1];
        }
        if (frameworkArg) {
            this.config.framework = frameworkArg.split('=')[1];
        }
        if (sourceDirArg) {
            this.config.sourceDir = sourceDirArg.split('=')[1];
        }
        if (outputDirArg) {
            this.config.outputDir = outputDirArg.split('=')[1];
        }

        // If CLI arguments provided, skip interactive prompts
        if (languageArg && frameworkArg) {
            if (!isQuiet) {
                console.log(`✅ CLI configuration complete:`);
                console.log(`   Language: ${this.config.language}`);
                console.log(`   Framework: ${this.config.framework}`);
                console.log(`   Source directory: ${this.config.sourceDir || './locales'}`);
                console.log(`   Output directory: ${this.config.outputDir || './i18ntk-reports'}`);
            }
            return;
        }

        // Interactive mode
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const prompt = (question) => new Promise((resolve) => {
            rl.question(question, (answer) => resolve(answer.trim()));
        });

        try {
            // Language selection
            if (!this.config.detectedLanguage) {
                console.log('\nAvailable languages:');
                console.log('1. javascript');
                console.log('2. typescript');
                console.log('3. python');
                console.log('4. java');
                console.log('5. go');
                console.log('6. php');
                
                let languageChoice = await prompt('Select language (1-6): ');
                const languageMap = {
                    '1': 'javascript',
                    '2': 'typescript',
                    '3': 'python',
                    '4': 'java',
                    '5': 'go',
                    '6': 'php'
                };
                this.config.detectedLanguage = languageMap[languageChoice] || 'javascript';
            }

            // Framework selection based on language
            if (!this.config.detectedFramework) {
                const frameworks = {
                    javascript: ['generic', 'react', 'vue', 'angular', 'nextjs', 'nuxt', 'svelte'],
                    typescript: ['generic', 'react', 'vue', 'angular', 'nextjs', 'nuxt'],
                    python: ['generic', 'django', 'flask', 'fastapi'],
                    java: ['generic', 'spring', 'spring-boot', 'quarkus'],
                    go: ['generic', 'gin', 'echo', 'fiber'],
                    php: ['generic', 'laravel', 'symfony', 'wordpress']
                };

                console.log(`\nAvailable frameworks for ${this.config.detectedLanguage}:`);
                frameworks[this.config.detectedLanguage].forEach((fw, idx) => {
                    console.log(`${idx + 1}. ${fw}`);
                });
                
                let frameworkChoice = await prompt('Select framework (1-n): ');
                this.config.detectedFramework = frameworks[this.config.detectedLanguage][parseInt(frameworkChoice) - 1] || 'generic';
            }

            // Directory configuration
            if (!this.config.sourceDir) {
                this.config.sourceDir = await prompt(`Source directory (default: ./locales): `) || './locales';
            }
            if (!this.config.outputDir) {
                this.config.outputDir = await prompt(`Output directory (default: ./i18ntk-reports): `) || './i18ntk-reports';
            }

            rl.close();
            
            if (!isQuiet) {
                console.log(`\n✅ Manual configuration complete:`);
                console.log(`   Language: ${this.config.detectedLanguage}`);
                console.log(`   Framework: ${this.config.detectedFramework}`);
                console.log(`   Source directory: ${this.config.sourceDir}`);
                console.log(`   Output directory: ${this.config.outputDir}`);
            }
            
        } catch (error) {
            rl.close();
            throw error;
        }
    }

    async detectEnvironment() {
        console.log('📍 Detecting environment...');
        
        const packageJsonPath = pathConfig.resolveProject('package.json');
        const pyprojectPath = pathConfig.resolveProject('pyproject.toml');
        const requirementsPath = pathConfig.resolveProject('requirements.txt');
        const goModPath = pathConfig.resolveProject('go.mod');
        const pomPath = pathConfig.resolveProject('pom.xml');
        const composerPath = pathConfig.resolveProject('composer.json');

        if (SecurityUtils.safeExistsSync(packageJsonPath)) {
            this.config.detectedLanguage = 'javascript';
            await this.detectNodeFramework(packageJsonPath);
        } else if (SecurityUtils.safeExistsSync(pyprojectPath) || SecurityUtils.safeExistsSync(requirementsPath)) {
            this.config.detectedLanguage = 'python';
            await this.detectPythonFramework();
        } else if (SecurityUtils.safeExistsSync(goModPath)) {
            this.config.detectedLanguage = 'go';
            this.config.detectedFramework = 'generic';
        } else if (SecurityUtils.safeExistsSync(pomPath)) {
            this.config.detectedLanguage = 'java';
            await this.detectJavaFramework(pomPath);
        } else if (SecurityUtils.safeExistsSync(composerPath)) {
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
            const packageJsonContent = SecurityUtils.safeReadFileSync(packageJsonPath, 'utf8', process.cwd());
            if (!packageJsonContent) {
                this.config.detectedFramework = 'generic';
                return;
            }
            
            const packageJson = JSON.parse(packageJsonContent);
            const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

            if (deps && deps.react || deps && deps['react-dom']) this.config.detectedFramework = 'react';
            else if (deps && deps.vue || deps && deps['vue-router']) this.config.detectedFramework = 'vue';
            else if (deps && deps['@angular/core']) this.config.detectedFramework = 'angular';
            else if (deps && deps.next) this.config.detectedFramework = 'nextjs';
            else if (deps && deps.nuxt) this.config.detectedFramework = 'nuxt';
            else if (deps && deps.svelte) this.config.detectedFramework = 'svelte';
            else this.config.detectedFramework = 'generic';
        } catch (error) {
            this.config.detectedFramework = 'generic';
        }
    }

    async detectPythonFramework() {
        try {
            const requirementsPath = pathConfig.resolveProject('requirements.txt');
            if (SecurityUtils.safeExistsSync(requirementsPath)) {
                const requirements = SecurityUtils.safeReadFileSync(requirementsPath, 'utf8', process.cwd());
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
            const pomContent = SecurityUtils.safeReadFileSync(pomPath, 'utf8', process.cwd());
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
            const composerContent = SecurityUtils.safeReadFileSync(composerPath, 'utf8', process.cwd());
            if (!composerContent) {
                this.config.detectedFramework = 'generic';
                return;
            }
            
            const composer = JSON.parse(composerContent);
            const deps = composer && composer.require || {};
            
            if (deps && deps['laravel/framework']) this.config.detectedFramework = 'laravel';
            else if (deps && deps['symfony/framework-bundle']) this.config.detectedFramework = 'symfony';
            else if (deps && deps['wordpress']) this.config.detectedFramework = 'wordpress';
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
            if (SecurityUtils.safeExistsSync(dirPath)) {
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
            hasPackageJson: SecurityUtils.safeExists('package.json'),
            hasLocales: SecurityUtils.safeExists(this.config.sourceDir),
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
            if (SecurityUtils.safeExistsSync(packageJsonPath)) {
                const packageJsonContent = SecurityUtils.safeReadFileSync(packageJsonPath, 'utf8', process.cwd());
                if (packageJsonContent) {
                    try {
                        const packageJson = JSON.parse(packageJsonContent);
                        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                        
                        this.config.prerequisites.hasI18nLibrary = Object.keys(deps || {}).some(dep => 
                            this.config.frameworkConfig.i18nLibraries.some(lib => dep.includes(lib))
                        );
                    } catch (e) {
                        this.config.prerequisites.hasI18nLibrary = false;
                    }
                } else {
                    this.config.prerequisites.hasI18nLibrary = false;
                }
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
        // Restrict command checking to project scope only
        // This prevents access to system directories like C:/WINDOWS/system32
        const extensions = process.platform === 'win32' ? ['.exe', '.cmd', '.bat'] : [''];
        const projectRoot = process.cwd();
        
        // Only check within project directories, not system PATH
        const projectDirs = [
            path.join(projectRoot, 'node_modules', '.bin'),
            path.join(projectRoot, 'bin'),
            path.join(projectRoot, '.bin')
        ].filter(dir => {
            try {
                return SecurityUtils.safeExistsSync(dir);
            } catch {
                return false;
            }
        });
        
        for (const dir of projectDirs) {
            for (const ext of extensions) {
                const fullPath = path.join(dir, command + ext);
                try {
                    if (SecurityUtils.safeExistsSync(fullPath)) {
                        const stats = SecurityUtils.safeStatSync(fullPath);
                        if (stats && stats.isFile()) {
                            return true;
                        }
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

        // Update configuration using SettingsManager - batch all updates to prevent multiple backups
        // Update configuration using SettingsManager - batch all updates to prevent multiple backups
        // Use the getSettingsManager from the outer scope
        
        // Get current package version
        const packageJsonPath = path.join(__dirname, '..', 'package.json');
        let version = '1.10.0'; // fallback
        try {
            const packageJsonContent = SecurityUtils.safeReadFileSync(packageJsonPath, 'utf8');
            const packageJson = JSON.parse(packageJsonContent);
            version = packageJson.version || version;
        } catch (error) {
            // Use fallback version
        }
        
        // Batch all updates into a single save operation
        const currentSettings = getSettingsManager().loadSettings();
        const updatedSettings = {
            ...currentSettings,
            version: version,
            sourceDir: this.config.sourceDir,
            outputDir: this.config.outputDir,
            detectedLanguage: this.config.detectedLanguage,
            detectedFramework: this.config.detectedFramework,
            optimization: this.config.optimization,
            prerequisites: this.config.prerequisites,
            security: {
                ...currentSettings.security,
                adminPinEnabled: false,
                sessionTimeout: 1800000,
                maxFailedAttempts: 3
            }
        };
        
        getSettingsManager().saveSettings(updatedSettings);
        
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
        getSettingsManager().updateSetting('setupReport', report);
        
        // Also save a local copy for user reference
        const reportPath = path.join(process.cwd(), 'i18ntk-setup-report.json');
        SecurityUtils.safeWriteFileSync(reportPath, JSON.stringify(report, null, 2), process.cwd());
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