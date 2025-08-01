#!/usr/bin/env node

/**
 * Export Missing Translation Keys Script
 * 
 * This script identifies and exports missing translation keys across all language files
 * for tracking, debugging, and translation management purposes.
 * 
 * Features:
 * - Identifies missing keys by comparing against English reference
 * - Exports missing keys in multiple formats (JSON, CSV, TXT)
 * - Generates detailed reports for translators
 * - Tracks translation progress over time
 * - Provides language-specific missing key lists
 * 
 * Usage:
 *   node export-missing-keys.js [options]
 * 
 * Options:
 *   --format=json,csv,txt    Export formats (default: json)
 *   --output-dir=<path>      Output directory (default: ./reports/missing-keys/)
 *   --languages=<list>       Specific languages to check (default: all)
 *   --include-empty          Include empty translations in export
 *   --verbose                Show detailed progress
 */

const fs = require('fs');
const path = require('path');

class MissingKeysExporter {
    constructor() {
        this.uiLocalesDir = path.join(__dirname, '..', '..', 'ui-locales');
        this.outputDir = path.join(__dirname, 'reports', 'missing-keys');
        this.referenceLanguage = 'en';
        this.supportedLanguages = ['de', 'es', 'fr', 'ja', 'ru', 'zh'];
        this.exportFormats = ['json'];
        this.includeEmpty = false;
        this.verbose = false;
    }

    /**
     * Parse command line arguments
     */
    parseArgs() {
        const args = process.argv.slice(2);
        
        for (const arg of args) {
            if (arg.startsWith('--format=')) {
                this.exportFormats = arg.split('=')[1].split(',');
            } else if (arg.startsWith('--output-dir=')) {
                this.outputDir = arg.split('=')[1];
            } else if (arg.startsWith('--languages=')) {
                this.supportedLanguages = arg.split('=')[1].split(',');
            } else if (arg === '--include-empty') {
                this.includeEmpty = true;
            } else if (arg === '--verbose') {
                this.verbose = true;
            } else if (arg === '--help') {
                this.showHelp();
                process.exit(0);
            }
        }
    }

    /**
     * Show help information
     */
    showHelp() {
        console.log(`
🔍 MISSING KEYS EXPORTER
${'='.repeat(50)}`);
        console.log('Export missing translation keys for analysis and tracking\n');
        console.log('USAGE:');
        console.log('  node export-missing-keys.js [options]\n');
        console.log('OPTIONS:');
        console.log('  --format=json,csv,txt    Export formats (default: json)');
        console.log('  --output-dir=<path>      Output directory (default: ./reports/missing-keys/)');
        console.log('  --languages=<list>       Specific languages to check (default: all)');
        console.log('  --include-empty          Include empty translations in export');
        console.log('  --verbose                Show detailed progress');
        console.log('  --help                   Show this help message\n');
        console.log('EXAMPLES:');
        console.log('  node export-missing-keys.js');
        console.log('  node export-missing-keys.js --format=json,csv --languages=de,fr');
        console.log('  node export-missing-keys.js --include-empty --verbose');
    }

    /**
     * Load and parse JSON file
     */
    loadJsonFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            if (this.verbose) {
                console.log(`⚠️  Warning: Could not load ${filePath}: ${error.message}`);
            }
            return null;
        }
    }

    /**
     * Get all keys from an object recursively
     */
    getAllKeys(obj, prefix = '') {
        const keys = [];
        
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                keys.push(...this.getAllKeys(value, fullKey));
            } else {
                keys.push(fullKey);
            }
        }
        
        return keys;
    }

    /**
     * Get value from nested object using dot notation
     */
    getNestedValue(obj, key) {
        return key.split('.').reduce((current, part) => {
            return current && current[part] !== undefined ? current[part] : undefined;
        }, obj);
    }

    /**
     * Check if a translation is empty or placeholder
     */
    isEmptyOrPlaceholder(value) {
        if (!value || typeof value !== 'string') return true;
        
        const trimmed = value.trim();
        if (!trimmed) return true;
        
        // Check for placeholder patterns
        const placeholderPatterns = [
            /^\[NOT TRANSLATED\]/,
            /^\[TRANSLATE\]/,
            /^\[[A-Z]{2}\]/,
            /^\[TODO\]/
        ];
        
        return placeholderPatterns.some(pattern => pattern.test(trimmed));
    }

    /**
     * Analyze missing keys for a specific language
     */
    analyzeMissingKeys(referenceData, targetData, language) {
        const referenceKeys = this.getAllKeys(referenceData);
        const missingKeys = [];
        const emptyKeys = [];
        const placeholderKeys = [];
        
        for (const key of referenceKeys) {
            const targetValue = this.getNestedValue(targetData, key);
            const referenceValue = this.getNestedValue(referenceData, key);
            
            if (targetValue === undefined) {
                missingKeys.push({
                    key,
                    referenceValue,
                    status: 'missing'
                });
            } else if (this.isEmptyOrPlaceholder(targetValue)) {
                if (!targetValue || (typeof targetValue === 'string' && !targetValue.trim())) {
                    emptyKeys.push({
                        key,
                        referenceValue,
                        currentValue: targetValue,
                        status: 'empty'
                    });
                } else {
                    placeholderKeys.push({
                        key,
                        referenceValue,
                        currentValue: targetValue,
                        status: 'placeholder'
                    });
                }
            }
        }
        
        return {
            language,
            totalKeys: referenceKeys.length,
            missingKeys,
            emptyKeys,
            placeholderKeys,
            missingCount: missingKeys.length,
            emptyCount: emptyKeys.length,
            placeholderCount: placeholderKeys.length,
            completeness: Math.round(((referenceKeys.length - missingKeys.length - emptyKeys.length - placeholderKeys.length) / referenceKeys.length) * 100)
        };
    }

    /**
     * Export data in JSON format
     */
    exportJson(data, filename) {
        const filePath = path.join(this.outputDir, `${filename}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return filePath;
    }

    /**
     * Export data in CSV format
     */
    exportCsv(data, filename) {
        const filePath = path.join(this.outputDir, `${filename}.csv`);
        
        let csvContent = 'Language,Key,Status,Reference Value,Current Value\n';
        
        for (const langData of data.languages) {
            const allIssues = [
                ...langData.missingKeys,
                ...langData.emptyKeys,
                ...langData.placeholderKeys
            ];
            
            for (const issue of allIssues) {
                const refValue = typeof issue.referenceValue === 'string' ? issue.referenceValue : String(issue.referenceValue || '');
                const currValue = typeof issue.currentValue === 'string' ? issue.currentValue : String(issue.currentValue || '');
                
                const row = [
                    langData.language,
                    issue.key,
                    issue.status,
                    `"${refValue.replace(/"/g, '""')}"`,
                    `"${currValue.replace(/"/g, '""')}"`
                ].join(',');
                csvContent += row + '\n';
            }
        }
        
        fs.writeFileSync(filePath, csvContent, 'utf8');
        return filePath;
    }

    /**
     * Export data in TXT format
     */
    exportTxt(data, filename) {
        const filePath = path.join(this.outputDir, `${filename}.txt`);
        
        let txtContent = `MISSING TRANSLATION KEYS REPORT\n`;
        txtContent += `Generated: ${data.timestamp}\n`;
        txtContent += `${'='.repeat(60)}\n\n`;
        
        txtContent += `SUMMARY:\n`;
        txtContent += `- Languages analyzed: ${data.summary.totalLanguages}\n`;
        txtContent += `- Total missing keys: ${data.summary.totalMissing}\n`;
        txtContent += `- Total empty keys: ${data.summary.totalEmpty}\n`;
        txtContent += `- Total placeholder keys: ${data.summary.totalPlaceholders}\n`;
        txtContent += `- Average completeness: ${data.summary.averageCompleteness}%\n\n`;
        
        for (const langData of data.languages) {
            txtContent += `${langData.language.toUpperCase()} (${langData.completeness}% complete):\n`;
            txtContent += `${'─'.repeat(30)}\n`;
            
            if (langData.missingKeys.length > 0) {
                txtContent += `Missing Keys (${langData.missingKeys.length}):\n`;
                for (const key of langData.missingKeys) {
                    txtContent += `  - ${key.key}\n`;
                }
                txtContent += '\n';
            }
            
            if (langData.placeholderKeys.length > 0) {
                txtContent += `Placeholder Keys (${langData.placeholderKeys.length}):\n`;
                for (const key of langData.placeholderKeys) {
                    txtContent += `  - ${key.key}: ${key.currentValue}\n`;
                }
                txtContent += '\n';
            }
            
            if (this.includeEmpty && langData.emptyKeys.length > 0) {
                txtContent += `Empty Keys (${langData.emptyKeys.length}):\n`;
                for (const key of langData.emptyKeys) {
                    txtContent += `  - ${key.key}\n`;
                }
                txtContent += '\n';
            }
            
            txtContent += '\n';
        }
        
        fs.writeFileSync(filePath, txtContent, 'utf8');
        return filePath;
    }

    /**
     * Ensure output directory exists
     */
    ensureOutputDir() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
            if (this.verbose) {
                console.log(`📁 Created output directory: ${this.outputDir}`);
            }
        }
    }

    /**
     * Main export function
     */
    async export() {
        console.log('🔍 EXPORTING MISSING TRANSLATION KEYS');
        console.log('='.repeat(50));
        
        this.ensureOutputDir();
        
        // Load reference language
        const referencePath = path.join(this.uiLocalesDir, `${this.referenceLanguage}.json`);
        const referenceData = this.loadJsonFile(referencePath);
        
        if (!referenceData) {
            console.error(`❌ Could not load reference language file: ${referencePath}`);
            process.exit(1);
        }
        
        if (this.verbose) {
            console.log(`📖 Loaded reference language: ${this.referenceLanguage}`);
        }
        
        const results = {
            timestamp: new Date().toISOString(),
            referenceLanguage: this.referenceLanguage,
            exportFormats: this.exportFormats,
            includeEmpty: this.includeEmpty,
            languages: [],
            summary: {
                totalLanguages: 0,
                totalMissing: 0,
                totalEmpty: 0,
                totalPlaceholders: 0,
                averageCompleteness: 0
            }
        };
        
        // Analyze each target language
        for (const language of this.supportedLanguages) {
            if (this.verbose) {
                console.log(`🔍 Analyzing ${language}...`);
            }
            
            const languagePath = path.join(this.uiLocalesDir, `${language}.json`);
            const languageData = this.loadJsonFile(languagePath);
            
            if (!languageData) {
                console.log(`⚠️  Skipping ${language}: file not found`);
                continue;
            }
            
            const analysis = this.analyzeMissingKeys(referenceData, languageData, language);
            results.languages.push(analysis);
            
            console.log(`   ${language}: ${analysis.completeness}% complete (${analysis.missingCount + analysis.placeholderCount} issues)`);
        }
        
        // Calculate summary
        results.summary.totalLanguages = results.languages.length;
        results.summary.totalMissing = results.languages.reduce((sum, lang) => sum + lang.missingCount, 0);
        results.summary.totalEmpty = results.languages.reduce((sum, lang) => sum + lang.emptyCount, 0);
        results.summary.totalPlaceholders = results.languages.reduce((sum, lang) => sum + lang.placeholderCount, 0);
        results.summary.averageCompleteness = Math.round(
            results.languages.reduce((sum, lang) => sum + lang.completeness, 0) / results.languages.length
        );
        
        // Export in requested formats
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const baseFilename = `missing-keys-${timestamp}`;
        const exportedFiles = [];
        
        for (const format of this.exportFormats) {
            let filePath;
            
            switch (format.toLowerCase()) {
                case 'json':
                    filePath = this.exportJson(results, baseFilename);
                    break;
                case 'csv':
                    filePath = this.exportCsv(results, baseFilename);
                    break;
                case 'txt':
                    filePath = this.exportTxt(results, baseFilename);
                    break;
                default:
                    console.log(`⚠️  Unknown format: ${format}`);
                    continue;
            }
            
            exportedFiles.push(filePath);
            console.log(`✅ Exported ${format.toUpperCase()}: ${filePath}`);
        }
        
        console.log('\n📊 EXPORT SUMMARY');
        console.log('─'.repeat(30));
        console.log(`🌍 Languages analyzed: ${results.summary.totalLanguages}`);
        console.log(`❌ Total missing keys: ${results.summary.totalMissing}`);
        console.log(`🔄 Total placeholder keys: ${results.summary.totalPlaceholders}`);
        if (this.includeEmpty) {
            console.log(`⚪ Total empty keys: ${results.summary.totalEmpty}`);
        }
        console.log(`📊 Average completeness: ${results.summary.averageCompleteness}%`);
        console.log(`📁 Files exported: ${exportedFiles.length}`);
        
        console.log('\n🎉 Export completed successfully!');
        
        return results;
    }
}

// Run the exporter if called directly
if (require.main === module) {
    const exporter = new MissingKeysExporter();
    exporter.parseArgs();
    exporter.export().catch(error => {
        console.error('❌ Export failed:', error.message);
        if (exporter.verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    });
}

module.exports = MissingKeysExporter;