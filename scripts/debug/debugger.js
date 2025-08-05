#!/usr/bin/env node

/**
 * i18nTK Frontend Debugger
 * Simple debugging tool for frontend developers to check their i18n setup
 */

const fs = require('fs');
const path = require('path');

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

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${message}`);
    }

    async checkTranslationFiles() {
        this.log('Checking translation files...');
        
        // Get configuration to determine translation directory
        const configPath = path.join(this.projectRoot, 'settings', 'i18ntk-config.json');
        let translationsDir = 'locales';
        let languages = [];
        
        if (fs.existsSync(configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                translationsDir = config.translationsPath || 'locales';
                languages = config.languages || [];
            } catch (error) {
                this.issues.push(`Invalid config file: ${error.message}`);
            }
        }
        
        const fullTranslationsDir = path.join(this.projectRoot, translationsDir);
        
        if (fs.existsSync(fullTranslationsDir)) {
            // If languages are specified in config, use those
            if (languages.length > 0) {
                const existingLanguages = languages.filter(lang => 
                    fs.existsSync(path.join(fullTranslationsDir, lang, 'common.json'))
                );
                
                for (const lang of existingLanguages) {
                    const filePath = path.join(fullTranslationsDir, lang, 'common.json');
                    try {
                        const content = fs.readFileSync(filePath, 'utf8');
                        const translations = JSON.parse(content);
                        this.results.translations[lang] = translations;
                    } catch (error) {
                        this.issues.push(`Invalid JSON in ${lang}/common.json: ${error.message}`);
                    }
                }
                
                this.results.fileStatus.translations = {
                    exists: true,
                    directory: translationsDir,
                    languages: existingLanguages,
                    count: existingLanguages.length
                };
            } else {
                // Auto-detect languages from directory structure
                const detectedLanguages = fs.readdirSync(fullTranslationsDir)
                    .filter(f => fs.statSync(path.join(fullTranslationsDir, f)).isDirectory());
                
                for (const lang of detectedLanguages) {
                    const filePath = path.join(fullTranslationsDir, lang, 'common.json');
                    if (fs.existsSync(filePath)) {
                        try {
                            const content = fs.readFileSync(filePath, 'utf8');
                            const translations = JSON.parse(content);
                            this.results.translations[lang] = translations;
                        } catch (error) {
                            this.issues.push(`Invalid JSON in ${lang}/common.json: ${error.message}`);
                        }
                    }
                }
                
                this.results.fileStatus.translations = {
                    exists: true,
                    directory: translationsDir,
                    languages: detectedLanguages,
                    count: detectedLanguages.length
                };
            }
        } else {
            this.results.fileStatus.translations = { exists: false, directory: translationsDir };
            this.warnings.push(`Translations directory '${translationsDir}' not found`);
        }
    }

    async checkMissingKeys() {
        this.log('Checking for missing translation keys...');
        
        const languages = Object.keys(this.results.translations);
        if (languages.length < 2) return;

        // Use first language as reference
        const referenceLang = languages[0];
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
        this.log('Checking configuration...');
        
        const configPath = path.join(this.projectRoot, 'settings', 'i18ntk-config.json');
        const packagePath = path.join(this.projectRoot, 'package.json');
        
        // Check i18ntk-config.json
        if (fs.existsSync(configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                this.results.fileStatus.config = {
                    exists: true,
                    languages: config.languages || [],
                    defaultLanguage: config.defaultLanguage || 'en'
                };
            } catch (error) {
                this.issues.push(`Invalid config file: ${error.message}`);
                this.results.fileStatus.config = { exists: false };
            }
        } else {
            this.results.fileStatus.config = { exists: false };
        }

        // Check package.json for i18n scripts
        if (fs.existsSync(packagePath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
                const scripts = packageJson.scripts || {};
                this.results.fileStatus.package = {
                    hasI18nScripts: Object.keys(scripts).some(key => key.includes('i18n'))
                };
            } catch (error) {
                this.issues.push(`Invalid package.json: ${error.message}`);
            }
        }
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
            translations: this.results.translations,
            missingKeys: this.results.missingKeys,
            fileStatus: this.results.fileStatus,
            issues: this.issues,
            warnings: this.warnings
        };

        return report;
    }

    async run() {
        this.log('🚀 Starting i18n Frontend Debug Analysis...');
        
        try {
            await this.checkTranslationFiles();
            await this.checkMissingKeys();
            await this.checkConfiguration();
            
            const report = this.generateFrontendReport();
            
            // Display summary
            console.log('\n' + '='.repeat(50));
            console.log('📊 i18n Debug Report');
            console.log('='.repeat(50));
            console.log(`Status: ${report.summary.status}`);
            console.log(`Languages: ${report.summary.totalLanguages}`);
            console.log(`Issues: ${report.summary.totalIssues}`);
            console.log(`Warnings: ${report.summary.totalWarnings}`);
            
            if (report.issues.length > 0) {
                console.log('\n❌ Issues to fix:');
                report.issues.forEach(issue => console.log(`  • ${issue}`));
            }
            
            if (report.warnings.length > 0) {
                console.log('\n⚠️  Warnings:');
                report.warnings.forEach(warning => console.log(`  • ${warning}`));
            }
            
            console.log('\n📁 File Status:');
            Object.entries(report.fileStatus).forEach(([type, status]) => {
                const icon = status.exists ? '✅' : '❌';
                if (type === 'translations') {
                    console.log(`  ${icon} ${status.directory || 'translations'}: ${status.exists ? `Found (${status.count} languages)` : 'Missing'}`);
                } else {
                    console.log(`  ${icon} ${type}: ${status.exists ? 'Found' : 'Missing'}`);
                }
            });
            
            console.log('\n🌍 Languages found:');
            Object.keys(report.translations).forEach(lang => {
                const keyCount = Object.keys(this.extractAllKeys(report.translations[lang])).length;
                console.log(`  • ${lang}: ${keyCount} keys`);
            });
            
            return report;
            
        } catch (error) {
            console.error('❌ Debug failed:', error.message);
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