#!/usr/bin/env node
/**
 * I18N TRANSLATION ANALYSIS SCRIPT
 * 
 * This script analyzes translation files to identify missing translations,
 * inconsistencies, and provides detailed reports for each language.
 * 
 * Usage:
 *   node scripts/i18n/02-analyze-translations.js
 *   node scripts/i18n/02-analyze-translations.js --language=de
 *   node scripts/i18n/02-analyze-translations.js --source-dir=./src/i18n/locales
 *   node scripts/i18n/02-analyze-translations.js --output-reports
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { loadTranslations, t } = require('../utils/i18n-helper');
const settingsManager = require('../settings/settings-manager');
const SecurityUtils = require('../utils/security');

// Get configuration from settings manager
function getConfig() {
  const settings = settingsManager.getSettings();
  return {
    sourceDir: settings.directories?.sourceDir || './locales',
    sourceLanguage: settings.directories?.sourceLanguage || 'en',
    notTranslatedMarker: settings.processing?.notTranslatedMarker || 'NOT_TRANSLATED',
    outputDir: settings.directories?.outputDir || './i18ntk-reports',
    excludeFiles: settings.processing?.excludeFiles || ['.DS_Store', 'Thumbs.db'],
    uiLanguage: settings.language || 'en'
  };
}

class I18nAnalyzer {
  constructor(config = {}) {
    this.config = { ...getConfig(), ...config };
    this.sourceDir = path.resolve(this.config.sourceDir);
    this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
    this.outputDir = path.resolve(this.config.outputDir);
    
    // Initialize i18n with UI language
    const uiLanguage = this.config.uiLanguage || 'en';
    loadTranslations(uiLanguage);
    this.t = t;
    
    // Initialize readline interface
    this.rl = null;
  }
  
  // Initialize readline interface
  initReadline() {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }
    return this.rl;
  }
  
  // Close readline interface
  closeReadline() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
  
  // Prompt for user input
  async prompt(question) {
    const rl = this.initReadline();
    return new Promise((resolve) => {
      rl.question(question, resolve);
    });
  }

  // Parse command line arguments
  parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};
    
    args.forEach(arg => {
      if (arg.startsWith('--')) {
        const [key, value] = arg.substring(2).split('=');
        if (key === 'language') {
          parsed.language = value;
        } else if (key === 'source-dir') {
          parsed.sourceDir = value;
        } else if (key === 'output-reports') {
          parsed.outputReports = true;
        } else if (key === 'output-dir') {
          parsed.outputDir = value;
        } else if (key === 'ui-language') {
          parsed.uiLanguage = value;
        } else if (key === 'help') {
          parsed.help = true;
        } else if (key === 'no-prompt') {
          parsed.noPrompt = true;
        } else if (['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'].includes(key)) {
          // Support shorthand language flags like --de, --fr, etc.
          parsed.uiLanguage = key;
        }
      }
    });
    
    return parsed;
  }

  // Get all available languages
  getAvailableLanguages() {
    if (!fs.existsSync(this.sourceDir)) {
      throw new Error(`Source directory not found: ${this.sourceDir}`);
    }
    
    return fs.readdirSync(this.sourceDir)
      .filter(item => {
        const itemPath = path.join(this.sourceDir, item);
        return fs.statSync(itemPath).isDirectory() && item !== this.config.sourceLanguage;
      });
  }

  // Get all JSON files from a language directory
  getLanguageFiles(language) {
    const languageDir = path.join(this.sourceDir, language);
    
    const validatedPath = SecurityUtils.validatePath(languageDir, this.sourceDir);
    if (!validatedPath || !fs.existsSync(validatedPath)) {
      return [];
    }
    
    return fs.readdirSync(validatedPath)
      .filter(file => {
        return file.endsWith('.json') && 
               !this.config.excludeFiles.includes(file);
      });
  }

  // Get all keys recursively from an object
  getAllKeys(obj, prefix = '') {
    const keys = new Set();
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.add(fullKey);
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nestedKeys = this.getAllKeys(value, fullKey);
        nestedKeys.forEach(k => keys.add(k));
      }
    }
    
    return keys;
  }

  // Get value by key path
  getValueByPath(obj, keyPath) {
    const keys = keyPath.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  // Analyze translation issues in an object
  analyzeTranslationIssues(obj, sourceObj = null, prefix = '') {
    const issues = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const sourceValue = sourceObj ? this.getValueByPath(sourceObj, fullKey) : null;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        issues.push(...this.analyzeTranslationIssues(value, sourceObj, fullKey));
      } else if (typeof value === 'string') {
        if (value === this.config.notTranslatedMarker) {
          issues.push({ 
            type: 'not_translated', 
            key: fullKey, 
            value, 
            sourceValue: sourceValue || 'N/A'
          });
        } else if (value === '') {
          issues.push({ 
            type: 'empty_value', 
            key: fullKey, 
            value, 
            sourceValue: sourceValue || 'N/A'
          });
        } else if (value.includes(this.config.notTranslatedMarker)) {
          issues.push({ 
            type: 'partial_translation', 
            key: fullKey, 
            value, 
            sourceValue: sourceValue || 'N/A'
          });
        } else if (sourceValue && value === sourceValue) {
          issues.push({ 
            type: 'same_as_source', 
            key: fullKey, 
            value, 
            sourceValue
          });
        }
      }
    }
    
    return issues;
  }

  // Get translation statistics for an object
  getTranslationStats(obj) {
    let total = 0;
    let translated = 0;
    let notTranslated = 0;
    let empty = 0;
    let partial = 0;
    
    const count = (item) => {
      if (typeof item === 'string') {
        total++;
        if (item === this.config.notTranslatedMarker) {
          notTranslated++;
        } else if (item === '') {
          empty++;
        } else if (item.includes(this.config.notTranslatedMarker)) {
          partial++;
        } else {
          translated++;
        }
      } else if (Array.isArray(item)) {
        item.forEach(count);
      } else if (item && typeof item === 'object') {
        Object.values(item).forEach(count);
      }
    };
    
    count(obj);
    
    return {
      total,
      translated,
      notTranslated,
      empty,
      partial,
      percentage: total > 0 ? Math.round((translated / total) * 100) : 0,
      missing: notTranslated + empty + partial
    };
  }

  // Check structural consistency between source and target
  checkStructuralConsistency(sourceObj, targetObj) {
    const sourceKeys = this.getAllKeys(sourceObj);
    const targetKeys = this.getAllKeys(targetObj);
    
    const missingKeys = [...sourceKeys].filter(key => !targetKeys.has(key));
    const extraKeys = [...targetKeys].filter(key => !sourceKeys.has(key));
    
    return {
      isConsistent: missingKeys.length === 0 && extraKeys.length === 0,
      missingKeys,
      extraKeys,
      sourceKeyCount: sourceKeys.size,
      targetKeyCount: targetKeys.size
    };
  }

  // Analyze a single language
  analyzeLanguage(language) {
    const languageDir = path.join(this.sourceDir, language);
    const sourceFiles = this.getLanguageFiles(this.config.sourceLanguage);
    const targetFiles = this.getLanguageFiles(language);
    
    const analysis = {
      language,
      files: {},
      summary: {
        totalFiles: sourceFiles.length,
        analyzedFiles: 0,
        totalKeys: 0,
        translatedKeys: 0,
        missingKeys: 0,
        issues: []
      }
    };
    
    for (const fileName of sourceFiles) {
      const sourceFilePath = path.join(this.config.sourceLanguage, fileName);
      const targetFilePath = path.join(language, fileName);
      
      const sourceFullPath = path.join(this.sourceDir, sourceFilePath);
      const targetFullPath = path.join(this.sourceDir, targetFilePath);
      
      if (!fs.existsSync(sourceFullPath)) {
        continue;
      }
      
      let sourceContent, targetContent;
      
      try {
        const sourceFileContent = fs.readFileSync(sourceFullPath, 'utf8');
        sourceContent = JSON.parse(sourceFileContent);
      } catch (error) {
        analysis.files[fileName] = {
          error: `Failed to parse source file: ${error.message}`
        };
        continue;
      }
      
      if (!fs.existsSync(targetFullPath)) {
        analysis.files[fileName] = {
          status: 'missing',
          sourceKeys: this.getAllKeys(sourceContent).size
        };
        continue;
      }
      
      try {
        const targetFileContent = fs.readFileSync(targetFullPath, 'utf8');
        targetContent = JSON.parse(targetFileContent);
      } catch (error) {
        analysis.files[fileName] = {
          error: `Failed to parse target file: ${error.message}`
        };
        continue;
      }
      
      // Analyze this file
      const stats = this.getTranslationStats(targetContent);
      const structural = this.checkStructuralConsistency(sourceContent, targetContent);
      const issues = this.analyzeTranslationIssues(targetContent, sourceContent);
      
      analysis.files[fileName] = {
        status: 'analyzed',
        stats,
        structural,
        issues,
        sourceFilePath,
        targetFilePath
      };
      
      // Update summary
      analysis.summary.analyzedFiles++;
      analysis.summary.totalKeys += stats.total;
      analysis.summary.translatedKeys += stats.translated;
      analysis.summary.missingKeys += stats.missing;
      analysis.summary.issues.push(...issues);
    }
    
    // Calculate overall percentage
    analysis.summary.percentage = analysis.summary.totalKeys > 0 
      ? Math.round((analysis.summary.translatedKeys / analysis.summary.totalKeys) * 100) 
      : 0;
    
    return analysis;
  }

  // Generate detailed report for a language
  generateLanguageReport(analysis) {
    const { language } = analysis;
    const timestamp = new Date().toISOString();
    
    let report = `${this.t('analyze.reportTitle', { language: language.toUpperCase() })}
    `;
    report += `${this.t('analyze.generated', { timestamp })}
    `;
    report += `${this.t('analyze.status', { translated: analysis.summary.translatedKeys, total: analysis.summary.totalKeys, percentage: analysis.summary.percentage })}
    `;
    report += `${this.t('analyze.filesAnalyzed', { analyzed: analysis.summary.analyzedFiles, total: analysis.summary.totalFiles })}
    `;
    report += `${this.t('analyze.keysNeedingTranslation', { count: analysis.summary.missingKeys })}
    
    `;
    
    report += `${this.t('analyze.fileBreakdown')}
    `;
    report += `${'='.repeat(50)}\n\n`;
    
    Object.entries(analysis.files).forEach(([fileName, fileData]) => {
      report += `\uD83D\uDCC4 ${fileName}\n`;
      
      if (fileData.error) {
        report += `   \u274C ${this.t('analyze.error')}: ${fileData.error}\n\n`;
        return;
      }
      
      if (fileData.status === 'missing') {
        report += `   \u274C ${this.t('analyze.statusFileMissing')}\n`;
        report += `   📊 ${this.t('analyze.sourceKeys', { count: fileData.sourceKeys })}\n\n`;
        return;
      }
      
      const { stats, structural, issues } = fileData;
      
      report += `   \uD83D\uDCCA ${this.t('analyze.translation', { translated: stats.translated, total: stats.total, percentage: stats.percentage })}\n`;
      report += `   \uD83C\uDFD7️  ${this.t('analyze.structure', { status: structural.isConsistent ? this.t('analyze.consistent') : this.t('analyze.inconsistent') })}\n`;
      
      if (!structural.isConsistent) {
        if (structural.missingKeys.length > 0) {
          report += `      ${this.t('analyze.missingKeys', { count: structural.missingKeys.length })}\n`;
        }
        if (structural.extraKeys.length > 0) {
          report += `      ${this.t('analyze.extraKeys', { count: structural.extraKeys.length })}\n`;
        }
      }
      
      if (issues.length > 0) {
        report += `   ⚠️  ${this.t('analyze.issues', { count: issues.length })}\n`;
        
        const issueTypes = {
          not_translated: issues.filter(i => i.type === 'not_translated').length,
          empty_value: issues.filter(i => i.type === 'empty_value').length,
          partial_translation: issues.filter(i => i.type === 'partial_translation').length,
          same_as_source: issues.filter(i => i.type === 'same_as_source').length
        };
        
        Object.entries(issueTypes).forEach(([type, count]) => {
          if (count > 0) {
            report += `      ${this.t('analyze.issueType.' + type, { count })}\n`;
          }
        });
      }
      
      report += `\n`;
    });
    
    // Keys needing translation
    const notTranslatedIssues = analysis.summary.issues.filter(issue => 
      issue.type === 'not_translated' || issue.type === 'empty_value'
    );
    
    if (notTranslatedIssues.length > 0) {
      report += `${this.t('analyze.keysToTranslate')}\n`;
      report += `${'='.repeat(50)}\n\n`;
      
      notTranslatedIssues.slice(0, 50).forEach(issue => {
        report += `${this.t('analyze.key')}: ${issue.key}\n`;
        report += `${this.t('analyze.english')}: "${issue.sourceValue}"\n`;
        report += `${language}: [${this.t('analyze.needsTranslation')}]\n\n`;
      });
      
      if (notTranslatedIssues.length > 50) {
        report += `${this.t('analyze.andMoreKeys', { count: notTranslatedIssues.length - 50 })}\n\n`;
      }
    }
    
    return report;
  }

  // Save report to file
  async saveReport(language, report) {
    const reportPath = path.join(this.outputDir, `analysis-${language}.txt`);
    const validatedPath = SecurityUtils.validatePath(reportPath, this.outputDir);
    
    if (!validatedPath) {
      throw new Error('Invalid report file path');
    }
    
    const success = await SecurityUtils.safeWriteFile(validatedPath, report, this.outputDir);
    if (!success) {
      throw new Error('Failed to write report file securely');
    }
    
    return validatedPath;
  }

  // Show help message
  showHelp() {
    console.log(this.t('analyze.help_message'));
  }

  // Main analyze method
  async analyze() {
    try {
      const results = []; // Add this line to declare the results array
      
      console.log(this.t('analyze.starting') || '🔍 Starting translation analysis...');
      
      // Ensure output directory exists
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
      }
      
      const languages = this.getAvailableLanguages();
      
      if (languages.length === 0) {
        console.log(this.t('analyze.noLanguages') || '⚠️  No target languages found.');
        return;
      }
      
      console.log(this.t('analyze.foundLanguages', { count: languages.length, languages: languages.join(', ') }) || `📋 Found ${languages.length} languages to analyze: ${languages.join(', ')}`);
      
      for (const language of languages) {
        console.log(this.t('analyze.analyzing', { language }) || `\n🔄 Analyzing ${language}...`);
        
        const analysis = this.analyzeLanguage(language);
        const report = this.generateLanguageReport(analysis);
        
        // Save report
        const reportPath = await this.saveReport(language, report);
        
        console.log(this.t('analyze.completed', { language }) || `✅ Analysis completed for ${language}`);
        console.log(this.t('analyze.progress', { 
          translated: results.length, 
          total: languages.length 
        }) || `   Progress: ${results.length}/${languages.length} languages processed`);
        console.log(this.t('analyze.reportSaved', { reportPath }) || `   Report saved: ${reportPath}`);
        
        results.push({
          language,
          analysis,
          reportPath
        });
      }
      
      // Summary
      console.log(this.t('analyze.summary') || '\n📊 ANALYSIS SUMMARY');
      console.log('='.repeat(50));
      
      results.forEach(({ language, analysis }) => {
        console.log(this.t('analyze.languageStats', { 
          language, 
          percentage: analysis.summary.percentage, 
          translated: analysis.summary.translatedKeys, 
          total: analysis.summary.totalKeys 
        }) || `${language}: ${analysis.summary.percentage}% complete (${analysis.summary.translatedKeys}/${analysis.summary.totalKeys} keys)`);
      });
      
      console.log(this.t('analyze.finished') || '\n✅ Analysis completed successfully!');
      
      // Only prompt for input if running standalone (not from menu or workflow)
      if (require.main === module && !this.noPrompt) {
        await this.prompt('\nPress Enter to continue...');
      }
      this.closeReadline();
      
      return results;
      
    } catch (error) {
      console.error(this.t('analyze.error') || '❌ Analysis failed:', error.message);
      this.closeReadline();
      throw error;
    }
  }

  // Main analysis process
  async run() {
    try {
      const args = this.parseArgs();
      
      if (args.help) {
        this.showHelp();
        return;
      }
      
      // Set noPrompt flag
      this.noPrompt = args.noPrompt;
      
      // Handle UI language change
      if (args.uiLanguage) {
        loadTranslations(args.uiLanguage);
        this.t = t;
      }
      
      // Update config if source directory is provided
      if (args.sourceDir) {
        this.config.sourceDir = args.sourceDir;
        this.sourceDir = path.resolve(this.config.sourceDir);
        this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
      }
      
      if (args.outputDir) {
        this.config.outputDir = args.outputDir;
        this.outputDir = path.resolve(this.config.outputDir);
      }
      
      await this.analyze();
    } catch (error) {
      this.closeReadline();
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  const analyzer = new I18nAnalyzer();
  analyzer.run().catch(error => {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  });
}

module.exports = I18nAnalyzer;