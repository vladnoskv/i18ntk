/**
 * Complete System Test Script
 * Tests all i18n management functionality and checks for missing translations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SystemTester {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            warnings: 0,
            errors: []
        };
        this.missingTranslations = [];
        this.translationConsistency = {};
        
        // Initialize UI i18n for translations
        const UIi18n = require('../main/i18ntk-ui');
        this.ui = new UIi18n();
        this.ui.loadLanguage('en'); // Load English as default
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🧪 Starting Complete System Test\n');
        console.log('=' .repeat(60));
        
        try {
            await this.testUITranslations();
            await this.testSettingsManager();
            await this.testAllScripts();
            await this.checkTranslationConsistency();
            await this.generateReport();
        } catch (error) {
            this.logError('System test failed', error);
        }
        
        this.printFinalReport();
    }

    /**
     * Test UI translations
     */
    async testUITranslations() {
        console.log('\n📝 Testing UI Translations...');
        
        try {
            const UIi18n = require('../main/i18ntk-ui');
            const uiI18n = new UIi18n();
            uiI18n.loadLanguage('de'); // Load German language for testing
            
            // Test critical translation keys
            const criticalKeys = [
                'operations.settings.title',
                'operations.settings.separator',
                'operations.init.title',
                'operations.analyze.title',
                    'operations.validate.title',
                    'operations.usage.title',
                    'menu.title',
                    'common.success',
                    'common.error'
                ];
            
            for (const key of criticalKeys) {
                const translation = uiI18n.t(key);
                if (translation === key) {
                    this.missingTranslations.push(key);
                    this.logWarning(`Missing translation: ${key}`);
                } else {
                    this.logSuccess(`Translation found: ${key}`);
                }
            }
            
        } catch (error) {
            this.logError('UI translations test failed', error);
        }
    }

    /**
     * Test settings manager
     */
    async testSettingsManager() {
        console.log('\n⚙️  Testing Settings Manager...');
        
        try {
            const settingsManager = require('../settings/settings-manager');
            
            // Test settings loading
            const settings = settingsManager.getSettings();
            if (settings) {
                this.logSuccess('Settings loaded successfully');
            } else {
                this.logError('Failed to load settings');
            }
            
            // Test schema loading
            const schema = settingsManager.getSettingsSchema();
            if (schema) {
                this.logSuccess('Settings schema loaded successfully');
            } else {
                this.logWarning('Settings schema not found');
            }
            
        } catch (error) {
            this.logError('Settings manager test failed', error);
        }
    }

    /**
     * Test all main scripts
     */
    async testAllScripts() {
        console.log('\n🔧 Testing Main Scripts...');
        
        const mainDir = path.join(__dirname, '..', 'main');
        const scripts = [
            { name: 'Init', command: `node ${path.join(mainDir, 'i18ntk-init.js')} --help` },
            { name: 'Analyze', command: `node ${path.join(mainDir, 'i18ntk-analyze.js')} --help` },
            { name: 'Validate', command: `node ${path.join(mainDir, 'i18ntk-validate.js')} --help` },
            { name: 'Usage Check', command: `node ${path.join(mainDir, 'i18ntk-usage.js')} --help` },
            { name: 'Complete', command: `node ${path.join(mainDir, 'i18ntk-complete.js')} --help` },
            { name: 'Sizing', command: `node ${path.join(mainDir, 'i18ntk-sizing.js')} --help` },
            { name: 'Summary', command: `node ${path.join(mainDir, 'i18ntk-summary.js')} --help` }
        ];
        
        for (const script of scripts) {
            try {
                execSync(script.command, { stdio: 'pipe', timeout: 10000 });
                this.logSuccess(`${script.name} script working`);
            } catch (error) {
                this.logError(`${script.name} script failed`, error);
            }
        }
    }

    /**
     * Check translation consistency across all locale files
     */
    async checkTranslationConsistency() {
        console.log('\n🌐 Checking Translation Consistency...');
        
        try {
            const baseLocalesDir = './ui-locales';
            const languages = fs.readdirSync(baseLocalesDir).filter(f => fs.statSync(path.join(baseLocalesDir, f)).isDirectory());

            if (languages.length === 0) {
                this.logError('No language directories found in ui-locales');
                return;
            }

            // Load English as reference
            const enDir = path.join(baseLocalesDir, 'en');
            if (!fs.existsSync(enDir)) {
                this.logError('English language directory not found');
                return;
            }

            const enFiles = fs.readdirSync(enDir).filter(f => f.endsWith('.json'));
            let enData = {};
            for (const file of enFiles) {
                const filePath = path.join(enDir, file);
                const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                enData = { ...enData, [file.replace('.json', '')]: content };
            }
            const enKeys = this.getAllKeys(enData);

            this.logSuccess(`Found ${enKeys.length} keys in English translations`);

            // Check other languages
            for (const lang of languages) {
                if (lang === 'en') continue;

                const langDir = path.join(baseLocalesDir, lang);
                const langFiles = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
                let langData = {};
                for (const file of langFiles) {
                    const filePath = path.join(langDir, file);
                    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    langData = { ...langData, [file.replace('.json', '')]: content };
                }
                const langKeys = this.getAllKeys(langData);

                // Compare keys
                const missingInLang = enKeys.filter(key => !langKeys.includes(key));
                const extraInLang = langKeys.filter(key => !enKeys.includes(key));

                if (missingInLang.length > 0) {
                    this.logError(`Missing keys in ${lang} translations: ${missingInLang.join(', ')}`);
                    this.results.failed++;
                    this.translationConsistency[lang] = { status: 'failed', missing: missingInLang, extra: extraInLang };
                }
                if (extraInLang.length > 0) {
                    this.logError(`Extra keys in ${lang} translations: ${extraInLang.join(', ')}`);
                    this.results.failed++;
                    this.translationConsistency[lang] = { status: 'failed', missing: missingInLang, extra: extraInLang };
                }

                if (missingInLang.length === 0 && extraInLang.length === 0) {
                    this.logSuccess(`Translation consistency OK for ${lang}`);
                } else {
                    this.logError(`Translation consistency check failed for ${lang}`);
                }
            }

            if (Object.keys(this.translationConsistency).length === 0 || Object.values(this.translationConsistency).every(status => status.status === 'ok')) {
                this.logSuccess('All translations are consistent');
            } else {
                this.logError('Translation consistency check failed');
                this.results.failed++;
            }

        } catch (error) {
            this.logError(`Translation consistency check failed: ${error.message}`);
            this.results.failed++;
        }
    }

    /**
     * Get all keys from a nested object
     * @param {object} obj
     * @param {string} prefix
     * @returns {string[]}
     */
    getAllKeys(obj, prefix = '') {
        let keys = [];
        for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                keys = keys.concat(this.getAllKeys(obj[key], prefix ? `${prefix}.${key}` : key));
            } else {
                keys.push(prefix ? `${prefix}.${key}` : key);
            }
        }
        return keys;
    }

    /**
     * Log a success message
     * @param {string} message
     */
    logSuccess(message) {
        console.log(`✅ ${message}`);
        this.results.passed++;
    }

    /**
     * Log an error message
     * @param {string} message
     */
    logError(message) {
        console.log(`❌ ${message}`);
        this.results.errors.push(message);
    }

    /**
     * Log a warning message
     * @param {string} message
     */
    logWarning(message) {
        console.log(`⚠️  ${message}`);
        this.results.warnings++;
    }

    /**
     * Run a shell command and return its output
     * @param {string} command
     * @returns {string}
     */
    runCommand(command) {
        try {
            return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
        } catch (error) {
            this.logError(`Command failed: ${command}\n${error.stderr}`);
            throw error;
        }
    }

    /**
     * Run the complete system test
     */
    async runTests() {
        console.log('\n🧪 Starting Complete System Test\n');
        console.log('============================================================\n');

        // Test UI Translations
        console.log('📝 Testing UI Translations...');
        this.testUITranslations();

        // Test Settings Manager
        console.log('\n⚙️  Testing Settings Manager...');
        this.testSettingsManager();

        // Test Main Scripts
        console.log('\n🔧 Testing Main Scripts...');
        this.testAllScripts();

        // Check Translation Consistency
        await this.checkTranslationConsistency();

        // Generate Report
        console.log('\n📊 Generating Report...');
        this.generateReport();

        console.log('\n============================================================');
        console.log('📋 FINAL TEST REPORT');
        console.log('============================================================');
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⚠️  Warnings: ${this.results.warnings}`);

        if (this.results.errors.length > 0) {
            console.log('\n❌ Errors:');
            this.results.errors.forEach(error => console.log(`   - ${error}`));
        }

        if (this.results.failed === 0) {
            console.log('\n📊 Overall Status: 🟢 ALL TESTS PASSED');
        } else {
            console.log('\n📊 Overall Status: 🔴 NEEDS FIXES');
        }
        console.log('============================================================');
    }

    /**
     * Generate comprehensive report
     */
    generateReport() {
        console.log('\n📊 Generating Report...');

        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                passed: this.results.passed,
                failed: this.results.failed,
                warnings: this.results.warnings
            },
            missingTranslations: this.missingTranslations,
            translationConsistency: this.translationConsistency,
            errors: this.results.errors,
            recommendations: this.generateRecommendations()
        };

        // Ensure the reports directory exists
        const reportsDir = path.join(__dirname, '..', 'scripts', 'debug', 'reports');
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        const reportPath = path.join(reportsDir, 'test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        this.logSuccess(`Report saved to ${reportPath}`);
    }

    /**
     * Generate recommendations based on test results
     */
    generateRecommendations() {
        const recommendations = [];

        if (this.missingTranslations.length > 0) {
            recommendations.push('Add missing translation keys');
        }

        if (this.results.failed > 0) {
            recommendations.push('Fix failing scripts');
        }

        if (this.results.warnings > 5) {
            recommendations.push('Review warning messages');
        }

        if (recommendations.length === 0) {
            recommendations.push('System ready for deployment');
        }

        return recommendations;
    }
}


// Run the tests
const tester = new SystemTester();
tester.runTests();

module.exports = SystemTester;