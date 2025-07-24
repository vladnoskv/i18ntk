#!/usr/bin/env node

/**
 * Language Mismatch Detection Tool
 * 
 * This script detects and reports language mismatches in translation files:
 * - English text in foreign language files
 * - Untranslated markers like [TRANSLATE], [DE], [FR], etc.
 * - Missing translations that should be in native language
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class LanguageMismatchDetector {
    constructor() {
        this.localesDir = path.join(__dirname, 'ui-locales');
        this.sourceLanguage = 'en';
        this.results = {
            mismatches: {},
            summary: {
                totalFiles: 0,
                filesWithMismatches: 0,
                totalMismatches: 0
            }
        };
        
        // Common English words that shouldn't appear in foreign translations
        this.englishIndicators = [
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
            'above', 'below', 'between', 'among', 'under', 'over', 'inside', 'outside',
            'this', 'that', 'these', 'those', 'here', 'there', 'where', 'when', 'why',
            'how', 'what', 'which', 'who', 'whom', 'whose', 'all', 'any', 'some',
            'many', 'much', 'few', 'little', 'more', 'most', 'less', 'least',
            'good', 'better', 'best', 'bad', 'worse', 'worst', 'big', 'bigger',
            'biggest', 'small', 'smaller', 'smallest', 'new', 'newer', 'newest',
            'old', 'older', 'oldest', 'first', 'second', 'third', 'last', 'next',
            'previous', 'same', 'different', 'other', 'another', 'each', 'every',
            'both', 'either', 'neither', 'one', 'two', 'three', 'four', 'five',
            'Error', 'Warning', 'Success', 'Failed', 'Loading', 'Saving', 'Delete',
            'Create', 'Update', 'Add', 'Remove', 'Edit', 'View', 'Show', 'Hide',
            'Open', 'Close', 'Start', 'Stop', 'Run', 'Execute', 'Process', 'Generate',
            'Analysis', 'Report', 'Summary', 'Details', 'Configuration', 'Settings',
            'Options', 'Preferences', 'Tools', 'Debug', 'Test', 'Validate',
            'Check', 'Verify', 'Confirm', 'Cancel', 'Continue', 'Finish', 'Complete',
            'Please', 'try', 'again', 'Invalid', 'choice', 'Select', 'option',
            'Back', 'Main', 'Menu', 'File', 'files', 'found', 'not', 'available'
        ];
        
        // Language-specific patterns
        this.languagePatterns = {
            de: {
                name: 'German',
                prefixes: ['[DE]', '[GERMAN]'],
                commonWords: ['der', 'die', 'das', 'und', 'oder', 'aber', 'mit', 'von', 'zu', 'für', 'auf', 'in', 'an', 'bei', 'nach', 'vor', 'über', 'unter', 'durch', 'gegen', 'ohne', 'um', 'bis', 'seit', 'während', 'wegen', 'trotz']
            },
            fr: {
                name: 'French',
                prefixes: ['[FR]', '[FRENCH]'],
                commonWords: ['le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'mais', 'avec', 'de', 'du', 'pour', 'sur', 'dans', 'par', 'sans', 'sous', 'vers', 'chez', 'depuis', 'pendant', 'avant', 'après']
            },
            es: {
                name: 'Spanish',
                prefixes: ['[ES]', '[SPANISH]'],
                commonWords: ['el', 'la', 'los', 'las', 'un', 'una', 'y', 'o', 'pero', 'con', 'de', 'del', 'para', 'por', 'en', 'a', 'desde', 'hasta', 'durante', 'antes', 'después', 'sobre', 'bajo', 'entre']
            },
            ru: {
                name: 'Russian',
                prefixes: ['[RU]', '[RUSSIAN]'],
                commonWords: ['и', 'в', 'не', 'на', 'я', 'быть', 'он', 'с', 'что', 'а', 'по', 'это', 'она', 'к', 'но', 'они', 'мы', 'как', 'из', 'у', 'который', 'то', 'за', 'свой', 'что', 'её', 'так', 'же', 'от', 'может', 'когда', 'очень', 'где', 'уже', 'если', 'да', 'его', 'нет', 'ещё']
            },
            ja: {
                name: 'Japanese',
                prefixes: ['[JA]', '[JAPANESE]'],
                commonWords: ['の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し', 'れ', 'さ', 'ある', 'いる', 'も', 'する', 'から', 'な', 'こと', 'として', 'い', 'や', 'れる', 'など', 'なっ', 'ない', 'この', 'ため', 'その', 'あっ', 'よう', 'また', 'もの', 'という', 'あり', 'まで', 'られ', 'なる', 'へ', 'か', 'だ', 'これ', 'によって', 'により', 'おり', 'より', 'による', 'ず', 'なり', 'られる', 'において', 'ば', 'なかっ', 'なく', 'しかし', 'について', 'せ', 'だっ', 'その後', 'できる', 'それ']
            },
            zh: {
                name: 'Chinese',
                prefixes: ['[ZH]', '[CHINESE]'],
                commonWords: ['的', '一', '是', '在', '不', '了', '有', '和', '人', '这', '中', '大', '为', '上', '个', '国', '我', '以', '要', '他', '时', '来', '用', '们', '生', '到', '作', '地', '于', '出', '就', '分', '对', '成', '会', '可', '主', '发', '年', '动', '同', '工', '也', '能', '下', '过', '子', '说', '产', '种', '面', '而', '方', '后', '多', '定', '行', '学', '法', '所', '民', '得', '经', '十', '三', '之', '进', '着', '等', '部', '度', '家', '电', '力', '里', '如', '水', '化', '高', '自', '二', '理', '起', '小', '物', '现', '实', '加', '量', '都', '两', '体', '制', '机', '当', '使', '点', '从', '业', '本', '去', '把', '性', '好', '应', '开', '它', '合', '还', '因', '由', '其', '些', '然', '前', '外', '天', '政', '四', '日', '那', '社', '义', '事', '平', '形', '相', '全', '表', '间', '样', '与', '关', '各', '重', '新', '线', '内', '数', '正', '心', '反', '你', '明', '看', '原', '又', '么', '利', '比', '或', '但', '质', '气', '第', '向', '道', '命', '此', '变', '条', '只', '没', '结', '解', '问', '意', '建', '月', '公', '无', 'ä¸\u200d', 'ä¸\u200d', 'ä¸\u200d']
            }
        };
    }

    /**
     * Main detection method
     */
    async detectMismatches() {
        console.log('🔍 Language Mismatch Detection Tool');
        console.log('=====================================\n');
        
        const localeFiles = this.getLocaleFiles();
        
        for (const file of localeFiles) {
            if (file.language === this.sourceLanguage) {
                continue; // Skip source language
            }
            
            console.log(`📄 Analyzing ${file.language}.json...`);
            await this.analyzeFile(file);
        }
        
        this.generateReport();
    }

    /**
     * Get all locale files
     */
    getLocaleFiles() {
        const files = fs.readdirSync(this.localesDir)
            .filter(file => file.endsWith('.json'))
            .map(file => ({
                filename: file,
                language: path.basename(file, '.json'),
                path: path.join(this.localesDir, file)
            }));
        
        this.results.summary.totalFiles = files.length - 1; // Exclude source language
        return files;
    }

    /**
     * Analyze a single translation file
     */
    async analyzeFile(file) {
        try {
            const content = fs.readFileSync(file.path, 'utf8');
            const translations = JSON.parse(content);
            
            const mismatches = [];
            this.analyzeObject(translations, '', mismatches, file.language);
            
            if (mismatches.length > 0) {
                this.results.mismatches[file.language] = {
                    filename: file.filename,
                    language: this.languagePatterns[file.language]?.name || file.language,
                    mismatches: mismatches,
                    count: mismatches.length
                };
                
                this.results.summary.filesWithMismatches++;
                this.results.summary.totalMismatches += mismatches.length;
            }
            
        } catch (error) {
            console.error(`❌ Error analyzing ${file.filename}: ${error.message}`);
        }
    }

    /**
     * Recursively analyze translation object
     */
    analyzeObject(obj, keyPath, mismatches, language) {
        for (const [key, value] of Object.entries(obj)) {
            const currentPath = keyPath ? `${keyPath}.${key}` : key;
            
            if (typeof value === 'string') {
                const issues = this.detectStringIssues(value, language);
                if (issues.length > 0) {
                    mismatches.push({
                        key: currentPath,
                        value: value,
                        issues: issues
                    });
                }
            } else if (typeof value === 'object' && value !== null) {
                this.analyzeObject(value, currentPath, mismatches, language);
            } else if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    if (typeof item === 'string') {
                        const issues = this.detectStringIssues(item, language);
                        if (issues.length > 0) {
                            mismatches.push({
                                key: `${currentPath}[${index}]`,
                                value: item,
                                issues: issues
                            });
                        }
                    }
                });
            }
        }
    }

    /**
     * Detect issues in a translation string
     */
    detectStringIssues(text, language) {
        const issues = [];
        const lowerText = text.toLowerCase();
        
        // Check for translation markers
        if (text.includes('[TRANSLATE]')) {
            issues.push({
                type: 'untranslated_marker',
                description: 'Contains [TRANSLATE] marker - needs translation'
            });
        }
        
        // Check for language prefixes
        const langPattern = this.languagePatterns[language];
        if (langPattern) {
            for (const prefix of langPattern.prefixes) {
                if (text.includes(prefix)) {
                    issues.push({
                        type: 'language_prefix',
                        description: `Contains ${prefix} prefix - should be translated to ${langPattern.name}`
                    });
                }
            }
        }
        
        // Check for English indicators
        const words = lowerText.match(/\b\w+\b/g) || [];
        const englishWords = words.filter(word => 
            this.englishIndicators.includes(word) && 
            word.length > 2 // Ignore very short words that might be common across languages
        );
        
        if (englishWords.length > 0) {
            // Calculate English word ratio
            const englishRatio = englishWords.length / words.length;
            
            if (englishRatio > 0.3 || englishWords.length > 3) {
                issues.push({
                    type: 'english_content',
                    description: `Contains English words: ${englishWords.slice(0, 5).join(', ')}${englishWords.length > 5 ? '...' : ''}`,
                    englishWords: englishWords,
                    ratio: englishRatio
                });
            }
        }
        
        // Check for common English phrases
        const englishPhrases = [
            'error', 'warning', 'success', 'failed', 'loading', 'saving',
            'please try again', 'invalid choice', 'select option', 'back to main menu',
            'configuration debug', 'translation debug', 'performance debug',
            'full system debug', 'debug tools', 'admin pin setup',
            'would you like', 'enter admin pin', 'confirm admin pin',
            'pins do not match', 'authentication failed', 'access denied'
        ];
        
        for (const phrase of englishPhrases) {
            if (lowerText.includes(phrase)) {
                issues.push({
                    type: 'english_phrase',
                    description: `Contains English phrase: "${phrase}"`
                });
            }
        }
        
        return issues;
    }

    /**
     * Generate and display the report
     */
    generateReport() {
        console.log('\n📊 LANGUAGE MISMATCH DETECTION RESULTS');
        console.log('========================================\n');
        
        // Summary
        console.log('📋 SUMMARY:');
        console.log(`   Total files analyzed: ${this.results.summary.totalFiles}`);
        console.log(`   Files with mismatches: ${this.results.summary.filesWithMismatches}`);
        console.log(`   Total mismatches found: ${this.results.summary.totalMismatches}\n`);
        
        if (this.results.summary.totalMismatches === 0) {
            console.log('✅ No language mismatches found! All translations appear to be in their correct languages.\n');
            return;
        }
        
        // Detailed results
        console.log('🔍 DETAILED RESULTS:\n');
        
        for (const [language, data] of Object.entries(this.results.mismatches)) {
            console.log(`📄 ${data.filename} (${data.language})`);
            console.log(`   Found ${data.count} mismatch(es):\n`);
            
            data.mismatches.forEach((mismatch, index) => {
                console.log(`   ${index + 1}. Key: ${mismatch.key}`);
                console.log(`      Value: "${mismatch.value.substring(0, 100)}${mismatch.value.length > 100 ? '...' : ''}"}`);
                
                mismatch.issues.forEach(issue => {
                    console.log(`      Issue: ${issue.description}`);
                });
                console.log('');
            });
        }
        
        // Recommendations
        console.log('💡 RECOMMENDATIONS:\n');
        console.log('1. Review and translate all entries marked with [TRANSLATE]');
        console.log('2. Replace language prefixes (e.g., [DE], [FR]) with proper translations');
        console.log('3. Translate English text to the appropriate target language');
        console.log('4. Use native language equivalents for all user-facing text');
        console.log('5. Run this tool again after making corrections to verify fixes\n');
        
        // Save report
        this.saveReport();
    }

    /**
     * Save report to file
     */
    saveReport() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(__dirname, 'i18n-reports', 'language-mismatches', `language-mismatches-${timestamp}.json`);
        
        // Ensure directory exists
        const reportDir = path.dirname(reportPath);
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: this.results.summary,
            mismatches: this.results.mismatches,
            recommendations: [
                'Review and translate all entries marked with [TRANSLATE]',
                'Replace language prefixes (e.g., [DE], [FR]) with proper translations',
                'Translate English text to the appropriate target language',
                'Use native language equivalents for all user-facing text',
                'Run this tool again after making corrections to verify fixes'
            ]
        };
        
        try {
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            console.log(`📄 Detailed report saved to: ${reportPath}\n`);
        } catch (error) {
            console.error(`❌ Error saving report: ${error.message}\n`);
        }
    }

    /**
     * Auto-fix some common issues
     */
    async autoFix(dryRun = true) {
        console.log(`🔧 Auto-fix mode ${dryRun ? '(DRY RUN)' : '(LIVE)'}`);
        console.log('=====================================\n');
        
        const fixes = [];
        
        for (const [language, data] of Object.entries(this.results.mismatches)) {
            const filePath = path.join(this.localesDir, data.filename);
            const content = fs.readFileSync(filePath, 'utf8');
            let translations = JSON.parse(content);
            let modified = false;
            
            for (const mismatch of data.mismatches) {
                for (const issue of mismatch.issues) {
                    if (issue.type === 'language_prefix') {
                        // Remove language prefixes
                        const newValue = mismatch.value.replace(/\[\w+\]\s*/g, '');
                        if (newValue !== mismatch.value) {
                            this.setNestedValue(translations, mismatch.key, newValue);
                            modified = true;
                            fixes.push({
                                file: data.filename,
                                key: mismatch.key,
                                old: mismatch.value,
                                new: newValue,
                                type: 'prefix_removal'
                            });
                        }
                    }
                }
            }
            
            if (modified && !dryRun) {
                fs.writeFileSync(filePath, JSON.stringify(translations, null, 2));
                console.log(`✅ Fixed ${data.filename}`);
            }
        }
        
        console.log(`\n📊 Auto-fix Summary:`);
        console.log(`   Total fixes applied: ${fixes.length}`);
        
        if (dryRun && fixes.length > 0) {
            console.log('\n🔍 Preview of fixes:');
            fixes.slice(0, 10).forEach(fix => {
                console.log(`   ${fix.file}: ${fix.key}`);
                console.log(`     Old: "${fix.old}"`);
                console.log(`     New: "${fix.new}"\n`);
            });
            
            if (fixes.length > 10) {
                console.log(`   ... and ${fixes.length - 10} more fixes\n`);
            }
            
            console.log('💡 Run with --apply to apply these fixes\n');
        }
    }

    /**
     * Set nested object value by dot notation key
     */
    setNestedValue(obj, key, value) {
        const keys = key.split('.');
        let current = obj;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!(keys[i] in current)) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const detector = new LanguageMismatchDetector();
    
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
Language Mismatch Detection Tool

Usage:
  node detect-language-mismatches.js [options]

Options:
  --auto-fix           Show auto-fixable issues (dry run)
  --apply              Apply auto-fixes (live mode)
  --help, -h           Show this help message

Examples:
  node detect-language-mismatches.js                    # Detect mismatches
  node detect-language-mismatches.js --auto-fix         # Preview auto-fixes
  node detect-language-mismatches.js --apply            # Apply auto-fixes
`);
        process.exit(0);
    }
    
    detector.detectMismatches().then(() => {
        if (args.includes('--auto-fix') || args.includes('--apply')) {
            const dryRun = !args.includes('--apply');
            return detector.autoFix(dryRun);
        }
    }).catch(error => {
        console.error('❌ Error:', error.message);
        process.exit(1);
    });
}

module.exports = LanguageMismatchDetector;