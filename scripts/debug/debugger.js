#!/usr/bin/env node

/**
 * i18nTK Frontend Package Debugger
 * Optimized debugging tool for frontend users to validate their i18n package setup
 */

const fs = require('fs');
const path = require('path');
const configManager = require('../../utils/config-manager');

class FrontendI18nDebugger {
    constructor(projectRoot = null) {
        this.projectRoot = projectRoot || process.cwd();
        this.issues = [];
        this.warnings = [];
        this.results = {
            translations: {},
            missingKeys: {},
            fileStatus: {},
            summary: {}
        };
    }

    log(message) {
        console.log(message);
    }

    async checkTranslationFiles() {
        this.log('📁 Checking your translation files...');
        
        // Use package.json to detect i18n setup
        const packagePath = path.join(this.projectRoot, 'package.json');
        let translationsDir = 'locales';
        let languages = [];

        if (fs.existsSync(packagePath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
                
                // Check for i18nTK configuration
                if (packageJson.i18n) {
                    translationsDir = packageJson.i18n.sourceDir || translationsDir;
                    languages = packageJson.i18n.languages || [];
                }
                
                // Check for scripts that might indicate translation directory
                const scripts = packageJson.scripts || {};
                for (const [scriptName, scriptCommand] of Object.entries(scripts)) {
                    if (scriptCommand.includes('locales')) {
                        const match = scriptCommand.match(/--source-dir[=\s]([^\s]+)/);
                        if (match) {
                            translationsDir = match[1];
                            break;
                        }
                    }
                }
            } catch (error) {
                this.issues.push(`Could not read package.json: ${error.message}`);
            }
        }

        const fullTranslationsDir = path.join(this.projectRoot, translationsDir);
        
        if (fs.existsSync(fullTranslationsDir)) {
            // Auto-detect languages from directory structure
            const detectedLanguages = fs.readdirSync(fullTranslationsDir)
                .filter(f => fs.statSync(path.join(fullTranslationsDir, f)).isDirectory());
            
            let foundLanguages = 0;
            for (const lang of detectedLanguages) {
                const filePath = path.join(fullTranslationsDir, lang, 'common.json');
                if (fs.existsSync(filePath)) {
                    try {
                        const content = fs.readFileSync(filePath, 'utf8');
                        const translations = JSON.parse(content);
                        this.results.translations[lang] = translations;
                        foundLanguages++;
                    } catch (error) {
                        this.issues.push(`Invalid JSON in ${lang}/common.json: ${error.message}`);
                    }
                }
            }
            
            this.results.fileStatus.translations = {
                exists: true,
                directory: translationsDir,
                languages: Object.keys(this.results.translations),
                count: foundLanguages
            };
        } else {
            this.results.fileStatus.translations = { exists: false, directory: translationsDir };
            this.warnings.push(`Translations directory '${translationsDir}' not found`);
        }
    }

    async checkMissingKeys() {
        this.log('🔍 Checking for missing translation keys...');
        
        const languages = Object.keys(this.results.translations);
        if (languages.length < 2) return;

        // Use English as reference if available, otherwise first language
        const referenceLang = languages.includes('en') ? 'en' : languages[0];
        const referenceKeys = this.extractAllKeys(this.results.translations[referenceLang]);
        
        for (const lang of languages) {
            if (lang === referenceLang) continue;
            
            const langKeys = this.extractAllKeys(this.results.translations[lang]);
            const missing = referenceKeys.filter(key => !langKeys.includes(key));
            
            if (missing.length > 0) {
                this.results.missingKeys[lang] = missing;
                this.warnings.push(`${lang} is missing ${missing.length} keys`);
            }
        }
    }

    extractAllKeys(obj, prefix = '') {
        let keys = [];
        for (const key in obj) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                keys = keys.concat(this.extractAllKeys(obj[key], fullKey));
            } else {
                keys.push(fullKey);
            }
        }
        return keys;
    }

    async checkConfiguration() {
        this.log('⚙️  Checking package configuration...');

        const packagePath = path.join(this.projectRoot, 'package.json');
        const hasConfig = fs.existsSync(path.join(this.projectRoot, 'i18ntk-config.json'));

        if (fs.existsSync(packagePath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
                const scripts = packageJson.scripts || {};
                
                this.results.fileStatus.package = {
                    exists: true,
                    hasI18nScripts: Object.keys(scripts).some(key => 
                        key.includes('i18n') || scripts[key].includes('i18ntk')
                    ),
                    scripts: Object.entries(scripts).filter(([name, cmd]) => 
                        name.includes('i18n') || cmd.includes('i18ntk')
                    )
                };
            } catch (error) {
                this.issues.push(`Invalid package.json: ${error.message}`);
            }
        } else {
            this.issues.push('package.json not found');
        }

        this.results.fileStatus.config = { exists: hasConfig };
    }

    generateFrontendReport() {
        const report = {
            timestamp: new Date().toLocaleString(),
            projectRoot: this.projectRoot,
            summary: {
                totalLanguages: Object.keys(this.results.translations).length,
                totalIssues: this.issues.length,
                totalWarnings: this.warnings.length,
                status: this.issues.length === 0 ? '✅ Ready for production' : '❌ Needs attention'
            },
            languages: Object.keys(this.results.translations),
            missingKeys: this.results.missingKeys,
            fileStatus: this.results.fileStatus,
            issues: this.issues,
            warnings: this.warnings
        };

        return report;
    }

    async run() {
        this.log('🔍 i18n Package Health Check');
        this.log('─────────────────────────────────');
        
        try {
            await this.checkTranslationFiles();
            await this.checkMissingKeys();
            await this.checkConfiguration();
            
            const report = this.generateFrontendReport();
            
            // Simple, user-friendly output
            console.log('\n📊 Package Status');
            console.log('─────────────────');
            console.log(`${report.summary.status}`);
            console.log(`Languages: ${report.summary.totalLanguages}`);
            
            if (report.issues.length > 0) {
                console.log('\n❌ Problems Found:');
                report.issues.forEach(issue => console.log(`  • ${issue}`));
            }
            
            if (report.warnings.length > 0) {
                console.log('\n⚠️  Suggestions:');
                report.warnings.forEach(warning => console.log(`  • ${warning}`));
            }
            
            if (report.fileStatus.translations.exists) {
                console.log(`\n📁 Translations: ${report.fileStatus.translations.directory}/`);
                console.log(`Languages: ${report.languages.join(', ')}`);
            } else {
                console.log(`\n📁 Translations: Directory not found`);
            }
            
            if (report.fileStatus.package?.hasI18nScripts) {
                console.log('\n🚀 Available Commands:');
                report.fileStatus.package.scripts.forEach(([name, cmd]) => {
                    console.log(`  • npm run ${name}`);
                });
            }
            
            if (Object.keys(report.missingKeys).length > 0) {
                console.log('\n📝 Missing Keys:');
                Object.entries(report.missingKeys).forEach(([lang, keys]) => {
                    console.log(`  • ${lang}: ${keys.length} keys missing`);
                });
            }
            
            return report;
            
        } catch (error) {
            console.error('❌ Package check failed:', error.message);
            console.log('\n💡 Try running: npm install i18ntk');
            return { error: error.message };
        }
    }
}

// Run debugger if called directly
if (require.main === module) {
    const debugTool = new FrontendI18nDebugger();
    debugTool.run().catch(error => {
        console.error('Debugger failed:', error);
        process.exit(1);
    });
}

module.exports = FrontendI18nDebugger;