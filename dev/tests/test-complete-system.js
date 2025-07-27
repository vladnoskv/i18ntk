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
            const UIi18n = require('../../main/i18ntk-ui');
            const uiI18n = new UIi18n();
            
            // Test critical translation keys
            const criticalKeys = [
                'operations.settings.title',
                'operations.settings.separator',
                'operations.init.title',
                'operations.analyze.title',
                'operations.validate.title',
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
            const settingsManager = require('../../settings/settings-manager');
            
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
        
        const scripts = [
            { name: 'Init', command: 'node main/i18ntk-init.js --help' },
            { name: 'Analyze', command: 'node main/i18ntk-analyze.js --help' },
            { name: 'Validate', command: 'node main/i18ntk-validate.js --help' },
            { name: 'Usage Check', command: 'node main/i18ntk-usage.js --help' },
            { name: 'Complete', command: 'node main/i18ntk-complete.js --help' },
            { name: 'Sizing', command: 'node main/i18ntk-sizing.js --help' },
            { name: 'Summary', command: 'node main/i18ntk-summary.js --help' }
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
            const localesDir = './ui-locales';
            const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
            
            if (files.length === 0) {
                this.logError('No translation files found');
                return;
            }
            
            // Load English as reference
            const enPath = path.join(localesDir, 'en.json');
            if (!fs.existsSync(enPath)) {
                this.logError('English translation file not found');
                return;
            }
            
            const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
            const enKeys = this.getAllKeys(enData);
            
            this.logSuccess(`Found ${enKeys.length} keys in English translations`);
            
            // Check other languages
            for (const file of files) {
                if (file === 'en.json') continue;
                
                const filePath = path.join(localesDir, file);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                const keys = this.getAllKeys(data);
                
                const missing = enKeys.filter(key => !keys.includes(key));
                const extra = keys.filter(key => !enKeys.includes(key));
                
                if (missing.length > 0) {
                    this.logWarning(`${file}: ${missing.length} missing keys`);
                    missing.forEach(key => {
                        this.missingTranslations.push(`${file}:${key}`);
                    });
                }
                
                if (extra.length > 0) {
                    this.logWarning(`${file}: ${extra.length} extra keys`);
                }
                
                if (missing.length === 0 && extra.length === 0) {
                    this.logSuccess(`${file}: All keys consistent`);
                }
            }
            
        } catch (error) {
            this.logError('Translation consistency check failed', error);
        }
    }

    /**
     * Generate comprehensive report
     */
    async generateReport() {
        console.log('\n📊 Generating Report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                passed: this.results.passed,
                failed: this.results.failed,
                warnings: this.results.warnings
            },
            missingTranslations: this.missingTranslations,
            errors: this.results.errors,
            recommendations: this.generateRecommendations()
        };
        
        const reportPath = './test-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        this.logSuccess(`Report saved to ${reportPath}`);
    }

    /**
     * Generate recommendations based on test results
     */
    generateRecommendations() {
        const recommendations = [];
        
        if (this.missingTranslations.length > 0) {
            recommendations.push('Add missing translation keys to maintain consistency');
        }
        
        if (this.results.failed > 0) {
            recommendations.push('Fix failing scripts before deployment');
        }
        
        if (this.results.warnings > 5) {
            recommendations.push('Review and address warning messages');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('System is ready for deployment');
        }
        
        return recommendations;
    }

    /**
     * Get all keys from nested object
     */
    getAllKeys(obj, prefix = '') {
        let keys = [];
        
        for (const key in obj) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                keys = keys.concat(this.getAllKeys(obj[key], fullKey));
            } else {
                keys.push(fullKey);
            }
        }
        
        return keys;
    }

    /**
     * Print final report
     */
    printFinalReport() {
        console.log('\n' + '=' .repeat(60));
        console.log('📋 FINAL TEST REPORT');
        console.log('=' .repeat(60));
        
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⚠️  Warnings: ${this.results.warnings}`);
        
        if (this.missingTranslations.length > 0) {
            console.log(`\n🔍 Missing Translations (${this.missingTranslations.length}):`);
            this.missingTranslations.slice(0, 10).forEach(key => {
                console.log(`   - ${key}`);
            });
            if (this.missingTranslations.length > 10) {
                console.log(`   ... and ${this.missingTranslations.length - 10} more`);
            }
        }
        
        if (this.results.errors.length > 0) {
            console.log(`\n❌ Errors:`);
            this.results.errors.forEach(error => {
                console.log(`   - ${error}`);
            });
        }
        
        const status = this.results.failed === 0 ? '🟢 READY' : '🔴 NEEDS FIXES';
        console.log(`\n📊 Overall Status: ${status}`);
        console.log('=' .repeat(60));
    }

    // Logging methods
    logSuccess(message) {
        console.log(`✅ ${message}`);
        this.results.passed++;
    }

    logError(message, error = null) {
        console.log(`❌ ${message}`);
        if (error) {
            console.log(`   ${error.message}`);
        }
        this.results.failed++;
        this.results.errors.push(message);
    }

    logWarning(message) {
        console.log(`⚠️  ${message}`);
        this.results.warnings++;
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new SystemTester();
    tester.runAllTests().catch(error => {
        console.error('❌ Test runner failed:', error.message);
        process.exit(1);
    });
}

module.exports = SystemTester;