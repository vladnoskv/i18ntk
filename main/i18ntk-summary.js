#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const settingsManager = require('../settings/settings-manager');
const SecurityUtils = require('../utils/security');
const UIi18n = require('./i18ntk-ui');

// Get configuration from settings manager
function getConfig() {
  const settings = settingsManager.getSettings();
  return {
    sourceLanguage: settings.directories?.sourceLanguage || 'en',
    excludeFiles: settings.processing?.excludeFiles || ['index.js', 'index.ts', '.DS_Store'],
    supportedExtensions: settings.processing?.supportedExtensions || ['.json', '.js', '.ts'],
    sourceDir: settings.directories?.sourceDir || null,
    uiLanguage: settings.language || 'en'
  };
}

/**
 * I18N SUMMARY REPORT GENERATOR
 * 
 * Analyzes the i18n folder structure and generates a comprehensive summary report
 * including key statistics, file structure analysis, and validation checks.
 * 
 * This script is designed to be generic and work with any i18n project structure.
 */
class I18nSummaryReporter {
  constructor() {
    this.config = getConfig();
    this.ui = new UIi18n();
    this.t = this.ui.t.bind(this.ui);
    this.stats = {
      languages: [],
      totalFiles: 0,
      totalKeys: 0,
      keysByLanguage: {},
      filesByLanguage: {},
      missingFiles: [],
      inconsistentKeys: [],
      emptyFiles: [],
      malformedFiles: [],
      duplicateKeys: []
    };
  }

  // Parse command line arguments
  parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {
      sourceDir: null,
      outputFile: null,
      verbose: false,
      help: false,
      keepReports: false,
      deleteReports: false
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--help' || arg === '-h') {
        parsed.help = true;
      } else if (arg === '--verbose' || arg === '-v') {
        parsed.verbose = true;
      } else if (arg === '--source-dir' || arg === '-s') {
        parsed.sourceDir = args[++i];
      } else if (arg === '--output' || arg === '-o') {
        parsed.outputFile = args[++i];
      } else if (arg === '--keep-reports') {
        parsed.keepReports = true;
      } else if (arg === '--delete-reports') {
        parsed.deleteReports = true;
      }
    }

    return parsed;
  }

  // Show help information
  showHelp() {
    console.log(`\n${this.t('summary.helpTitle')}\n`);
    console.log(this.t('summary.helpDescription') + '\n');
    console.log(this.t('summary.helpUsage') + '\n');
    console.log(this.t('summary.helpOptions'));
    console.log(this.t('summary.helpSourceDir'));
    console.log(this.t('summary.helpOutput'));
    console.log(this.t('summary.helpVerbose'));
    console.log(this.t('summary.helpKeepReports'));
    console.log(this.t('summary.helpDeleteReports'));
    console.log(this.t('summary.helpHelp') + '\n');
    console.log(this.t('summary.helpExamples'));
    console.log(this.t('summary.helpExample1'));
    console.log(this.t('summary.helpExample2'));
    console.log(this.t('summary.helpExample3'));
    console.log(this.t('summary.helpExample4'));
    console.log(this.t('summary.helpExample5') + '\n');
  }

  // Auto-detect i18n directory
  detectI18nDirectory() {
    const possiblePaths = [
      'locales',
      'i18ntk-reports',
      'src/i18n/locales',
      'src/locales',
      'src/i18n',
      'i18n/locales',
      'i18n',
      'public/locales',
      'assets/i18n',
      'translations'
    ];

    for (const possiblePath of possiblePaths) {
      const fullPath = path.resolve(possiblePath);
      if (fs.existsSync(fullPath)) {
        const contents = fs.readdirSync(fullPath);
        // Check if it contains language directories
        const hasLanguageDirs = contents.some(item => {
          const itemPath = path.join(fullPath, item);
          return fs.statSync(itemPath).isDirectory() && 
                 item.length === 2 && // Language codes are typically 2 characters
                 /^[a-z]{2}$/.test(item);
        });
        
        if (hasLanguageDirs) {
          return fullPath;
        }
      }
    }

    return null;
  }

  // Get all available languages
  getAvailableLanguages() {
    if (!fs.existsSync(this.config.sourceDir)) {
      return [];
    }

    return fs.readdirSync(this.config.sourceDir)
      .filter(item => {
        const itemPath = path.join(this.config.sourceDir, item);
        return fs.statSync(itemPath).isDirectory() && 
               !item.startsWith('.') &&
               item !== 'node_modules';
      })
      .sort();
  }

  // Get all translation files for a language
  getLanguageFiles(language) {
    const languageDir = path.join(this.config.sourceDir, language);
    
    if (!fs.existsSync(languageDir)) {
      return [];
    }

    return fs.readdirSync(languageDir)
      .filter(file => {
        return this.config.supportedExtensions.some(ext => file.endsWith(ext)) &&
               !this.config.excludeFiles.includes(file);
      })
      .sort();
  }

  // Extract keys from a translation file
  async extractKeysFromFile(filePath) {
    try {
      const content = await SecurityUtils.safeReadFile(filePath, this.config.sourceDir);
      if (!content) {
        console.warn(this.t('summary.couldNotReadFile', { filePath }));
        return [];
      }
      
      if (filePath.endsWith('.json')) {
        const data = JSON.parse(content);
        return this.extractKeysFromObject(data);
      } else if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
        // Basic extraction for JS/TS files (assumes export default or module.exports)
        const match = content.match(/(?:export\s+default|module\.exports\s*=)\s*({[\s\S]*})/);;
        if (match) {
          const objStr = match[1];
          // This is a simplified approach - in production, you might want to use a proper JS parser
          try {
            const data = eval(`(${objStr})`);
            return this.extractKeysFromObject(data);
          } catch (e) {
            console.warn(this.t('summary.couldNotParseJSFile', { filePath }));
            return [];
          }
        }
      }
      
      return [];
    } catch (error) {
      console.warn(this.t('summary.errorReadingFile', { filePath, error: error.message }));
      return [];
    }
  }

  // Extract keys recursively from an object
  extractKeysFromObject(obj, prefix = '') {
    const keys = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        keys.push(...this.extractKeysFromObject(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    
    return keys;
  }

  // Check if file is empty or has no meaningful content
  async isFileEmpty(filePath) {
    try {
      const content = await SecurityUtils.safeReadFile(filePath, this.config.sourceDir);
      if (!content) return true;
      const trimmedContent = content.trim();
      if (!trimmedContent) return true;
      
      if (filePath.endsWith('.json')) {
        const data = SecurityUtils.safeParseJSON(trimmedContent);
        if (!data) return true;
        return Object.keys(data).length === 0;
      }
      
      return false;
    } catch (error) {
      return false; // If we can't parse it, it's not empty, just malformed
    }
  }

  // Check if file is malformed
  async isFileMalformed(filePath) {
    try {
      const content = await SecurityUtils.safeReadFile(filePath, this.config.sourceDir);
      if (!content) return true;
      
      if (filePath.endsWith('.json')) {
        const parsed = SecurityUtils.safeParseJSON(content);
        if (!parsed) return true;
      }
      
      return false;
    } catch (error) {
      return true;
    }
  }

  // Find duplicate keys within a file
  async findDuplicateKeys(filePath) {
    try {
      const content = await SecurityUtils.safeReadFile(filePath, this.config.sourceDir);
      if (!content) return [];
      
      if (filePath.endsWith('.json')) {
        // For JSON files, check for duplicate keys in the raw content
        const keys = [];
        const keyRegex = /"([^"]+)"\s*:/g;
        let match;
        
        while ((match = keyRegex.exec(content)) !== null) {
          keys.push(match[1]);
        }
        
        const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
        return [...new Set(duplicates)];
      }
      
      return [];
    } catch (error) {
      return [];
    }
  }

  // Analyze folder structure and collect statistics
  async analyzeStructure() {
    console.log(this.t('summary.analyzingFolder'));
    
    this.stats.languages = this.getAvailableLanguages();
    
    if (this.stats.languages.length === 0) {
      console.log(this.t('summary.noLanguageDirectoriesFound'));
      return;
    }
    
    console.log(this.t('summary.foundLanguages', {count: this.stats.languages.length, languages: this.stats.languages.join(', ')}));
    
    // Use first language as reference for file structure
    const referenceLanguage = this.stats.languages[0];
    const referenceFiles = this.getLanguageFiles(referenceLanguage);
    
    console.log(this.t('summary.referenceLanguageFiles', {language: referenceLanguage, count: referenceFiles.length}));
    
    // Analyze each language
    for (const language of this.stats.languages) {
      console.log(this.t('summary.analyzingLanguage', {language}));
      
      const files = this.getLanguageFiles(language);
      this.stats.filesByLanguage[language] = files;
      this.stats.keysByLanguage[language] = {};
      
      let totalKeysForLanguage = 0;
      
      // Check for missing files compared to reference
      const missingFiles = referenceFiles.filter(file => !files.includes(file));
      if (missingFiles.length > 0) {
        this.stats.missingFiles.push({
          language,
          files: missingFiles
        });
      }
      
      // Analyze each file
      for (const file of files) {
        const filePath = path.join(this.config.sourceDir, language, file);
        
        // Check if file is empty
        if (await this.isFileEmpty(filePath)) {
          this.stats.emptyFiles.push({ language, file });
        }
        
        // Check if file is malformed
        if (await this.isFileMalformed(filePath)) {
          this.stats.malformedFiles.push({ language, file });
          continue;
        }
        
        // Find duplicate keys
        const duplicates = await this.findDuplicateKeys(filePath);
        if (duplicates.length > 0) {
          this.stats.duplicateKeys.push({ language, file, duplicates });
        }
        
        // Extract keys
        const keys = await this.extractKeysFromFile(filePath);
        this.stats.keysByLanguage[language][file] = keys;
        totalKeysForLanguage += keys.length;
        
        this.stats.totalFiles++;
      }
      
      this.stats.totalKeys += totalKeysForLanguage;
      console.log(this.t('summary.keysInFiles', {keys: totalKeysForLanguage, files: files.length}));
    }
    
    // Find inconsistent keys across languages
    this.findInconsistentKeys();
  }

  // Find keys that are inconsistent across languages
  findInconsistentKeys() {
    console.log(this.t('summary.checkingInconsistentKeys'));
    
    const referenceLanguage = this.stats.languages[0];
    const referenceKeys = this.stats.keysByLanguage[referenceLanguage];
    
    for (const file of Object.keys(referenceKeys)) {
      const refKeys = new Set(referenceKeys[file]);
      
      for (const language of this.stats.languages.slice(1)) {
        const langKeys = this.stats.keysByLanguage[language][file] || [];
        const langKeySet = new Set(langKeys);
        
        // Find missing keys in this language
        const missingInLang = [...refKeys].filter(key => !langKeySet.has(key));
        // Find extra keys in this language
        const extraInLang = [...langKeySet].filter(key => !refKeys.has(key));
        
        if (missingInLang.length > 0 || extraInLang.length > 0) {
          this.stats.inconsistentKeys.push({
            file,
            language,
            missing: missingInLang,
            extra: extraInLang
          });
        }
      }
    }
  }

  // Generate summary report
  generateReport() {
    const report = [];
    const timestamp = new Date().toISOString();
    
    report.push(this.t('summary.reportTitle'));
    report.push('='.repeat(50));
    report.push(this.t('summary.generated', {timestamp}));
    report.push(this.t('summary.sourceDirectory', {dir: this.config.sourceDir}));
    report.push('');
    // Overview
    report.push(this.t('summary.overview'));
    report.push('='.repeat(30));
    report.push(this.t('summary.languagesCount', {count: this.stats.languages.length}));
    report.push(this.t('summary.totalFiles', {count: this.stats.totalFiles}));
    report.push(this.t('summary.totalKeys', {count: this.stats.totalKeys}));
    report.push(this.t('summary.avgKeysPerLanguage', {count: Math.round(this.stats.totalKeys / this.stats.languages.length)}));
    report.push('');
    // Languages breakdown
    report.push(this.t('summary.languagesBreakdown'));
    report.push('='.repeat(30));
    for (const language of this.stats.languages) {
      const files = this.stats.filesByLanguage[language];
      const totalKeys = Object.values(this.stats.keysByLanguage[language])
        .reduce((sum, keys) => sum + keys.length, 0);
      report.push(this.t('summary.languageBreakdown', {language, files: files.length, keys: totalKeys}));
    }
    report.push('');
    // File structure
    report.push(this.t('summary.fileStructure'));
    report.push('='.repeat(30));
    const referenceLanguage = this.stats.languages[0];
    const referenceFiles = this.stats.filesByLanguage[referenceLanguage] || [];
    for (const file of referenceFiles) {
      const keysInFile = this.stats.keysByLanguage[referenceLanguage][file]?.length || 0;
      report.push(this.t('summary.fileKeys', {file, keys: keysInFile}));
      // Show which languages have this file
      const languagesWithFile = this.stats.languages.filter(lang => 
        this.stats.filesByLanguage[lang].includes(file)
      );
      if (languagesWithFile.length < this.stats.languages.length) {
        const missingIn = this.stats.languages.filter(lang => 
          !languagesWithFile.includes(lang)
        );
        report.push(this.t('summary.missingInLanguages', {languages: missingIn.join(', ')}));
      }
    }
    report.push('');
    
    // Issues
    if (this.stats.missingFiles.length > 0 || 
        this.stats.emptyFiles.length > 0 || 
        this.stats.malformedFiles.length > 0 || 
        this.stats.duplicateKeys.length > 0 || 
        this.stats.inconsistentKeys.length > 0) {
      
      report.push(this.t('summary.issuesFound'));
      report.push('='.repeat(30));
      
      if (this.stats.missingFiles.length > 0) {
        report.push(this.t('summary.missingFiles'));
        for (const item of this.stats.missingFiles) {
          report.push(`   ${item.language}: ${item.files.join(', ')}`);
        }
        report.push('');
      }
      
      if (this.stats.emptyFiles.length > 0) {
        report.push(this.t('summary.emptyFiles'));
        for (const item of this.stats.emptyFiles) {
          report.push(`   ${item.language}/${item.file}`);
        }
        report.push('');
      }
      
      if (this.stats.malformedFiles.length > 0) {
        report.push(this.t('summary.malformedFiles'));
        for (const item of this.stats.malformedFiles) {
          report.push(`   ${item.language}/${item.file}`);
        }
        report.push('');
      }
      
      if (this.stats.duplicateKeys.length > 0) {
        report.push(this.t('summary.duplicateKeys'));
        for (const item of this.stats.duplicateKeys) {
          report.push(`   ${item.language}/${item.file}: ${item.duplicates.join(', ')}`);
        }
        report.push('');
      }
      
      if (this.stats.inconsistentKeys.length > 0) {
        report.push(this.t('summary.inconsistentKeys'));
        for (const item of this.stats.inconsistentKeys) {
          report.push(`   ${item.language}/${item.file}:`);
          if (item.missing.length > 0) {
            report.push(this.t('summary.missingKeys', {keys: item.missing.slice(0, 5).join(', '), more: item.missing.length > 5 ? '...' : ''}));
          }
          if (item.extra.length > 0) {
            report.push(this.t('summary.extraKeys', {keys: item.extra.slice(0, 5).join(', '), more: item.extra.length > 5 ? '...' : ''}));
          }
        }
        report.push('');
      }
    } else {
      report.push(this.t('summary.noIssuesFound'));
      report.push('='.repeat(30));
      report.push(this.t('summary.allFilesConsistent'));
      report.push('');
    }
    // Recommendations
    report.push(this.t('summary.recommendations'));
    report.push('='.repeat(30));
    if (this.stats.missingFiles.length > 0) {
      report.push(this.t('summary.createMissingFiles'));
    }
    if (this.stats.emptyFiles.length > 0) {
      report.push(this.t('summary.addContentToEmptyFiles'));
    }
    if (this.stats.malformedFiles.length > 0) {
      report.push(this.t('summary.fixMalformedFiles'));
    }
    if (this.stats.duplicateKeys.length > 0) {
      report.push(this.t('summary.removeDuplicateKeys'));
    }
    if (this.stats.inconsistentKeys.length > 0) {
      report.push(this.t('summary.synchronizeKeys'));
    }
    if (this.stats.totalKeys > 10000) {
      report.push(this.t('summary.splitLargeFiles'));
    }
    if (this.stats.languages.length === 1) {
      report.push(this.t('summary.addMoreLanguages'));
    }
    report.push('');
    report.push(this.t('summary.nextSteps'));
    report.push(this.t('summary.nextStep1'));
    report.push(this.t('summary.nextStep2'));
    report.push(this.t('summary.nextStep3'));
    report.push(this.t('summary.nextStep4'));
    return report.join('\n');
  }

  // Run the analysis and generate report
  async run() {
    const args = this.parseArgs();
    
    if (args.help) {
      this.showHelp();
      return;
    }
    
    // Determine source directory
    if (args.sourceDir) {
      this.config.sourceDir = path.resolve(args.sourceDir);
    } else {
      this.config.sourceDir = this.detectI18nDirectory();
    }
    
    if (!this.config.sourceDir) {
      console.error(this.t('summary.couldNotFindI18nDirectory'));
      process.exit(1);
    }
    
    if (!fs.existsSync(this.config.sourceDir)) {
      console.error(this.t('summary.sourceDirectoryDoesNotExist', { sourceDir: this.config.sourceDir }));
      process.exit(1);
    }
    
    console.log(this.t('summary.i18nSummaryReportGenerator'));
    console.log(this.t('summary.separator'));
    console.log(this.t('summary.sourceDirectory', {dir: this.config.sourceDir}));
    
    if (args.verbose) {
      console.log(this.t('summary.configurationTitle'));
      console.log(this.t('summary.sourceLanguage', { sourceLanguage: this.config.sourceLanguage }));
      console.log(this.t('summary.supportedExtensions', { extensions: this.config.supportedExtensions.join(', ') }));
      console.log(this.t('summary.excludedFiles', { files: this.config.excludeFiles.join(', ') }));
    }
    
    try {
      // Analyze structure
      await this.analyzeStructure();
      
      // Generate report
      console.log(this.t('summary.generatingSummaryReport'));
      const report = this.generateReport();
      
      // Output report
      if (args.outputFile) {
        // Always save summary reports to i18ntk-reports
        const reportsDir = path.resolve(process.cwd(), 'i18ntk-reports');
        if (!fs.existsSync(reportsDir)) {
          fs.mkdirSync(reportsDir, { recursive: true });
        }
        const outputFileName = args.outputFile ? path.basename(args.outputFile) : `summary-report-${new Date().toISOString().slice(0,10)}.txt`;
        const outputPath = path.join(reportsDir, outputFileName);
        const success = await SecurityUtils.safeWriteFile(outputPath, report, reportsDir);
        if (success) {
          console.log(this.t('summary.reportSaved', { reportPath: outputPath }));
        } else {
          console.log(this.t('summary.reportSaveFailed', { reportPath: outputPath }));
        }
      } else {
        console.log(this.t('summary.reportContent', { report }));
      }
      
      // Handle report file management
      if (args.deleteReports && !args.keepReports) {
        console.log(this.t('summary.cleaningUpReportFiles'));
        try {
          const reportsDir = path.join(this.config.sourceDir, 'scripts', 'i18n', 'reports');
          if (fs.existsSync(reportsDir)) {
            const files = fs.readdirSync(reportsDir);
            const reportFiles = files.filter(file => 
              (file.endsWith('.txt') || file.endsWith('.json') || file.endsWith('.log')) &&
              file !== path.basename(args.outputFile || '')
            );
            
            let deletedCount = 0;
            for (const file of reportFiles) {
              try {
                fs.unlinkSync(path.join(reportsDir, file));
                deletedCount++;
              } catch (error) {
                console.log(this.t('summary.couldNotDelete', { file, error: error.message }));
              }
            }
            
            if (deletedCount > 0) {
              console.log(this.t('summary.deletedOldReportFiles', { count: deletedCount }));
            } else {
              console.log(this.t('summary.noOldReportFilesToDelete'));
            }
          }
        } catch (error) {
          console.log(this.t('summary.errorCleaningUpReports', { error: error.message }));
        }
      } else if (args.keepReports) {
        console.log(this.t('summary.reportFilesPreserved'));
      }
      
      // Summary
      console.log(this.t('summary.separator'));
      console.log(this.t('summary.analysisComplete'));
      console.log(this.t('summary.separator'));
      console.log(this.t('summary.analyzedLanguages', { count: this.stats.languages.length }));
      console.log(this.t('summary.processedFiles', { count: this.stats.totalFiles }));
      console.log(this.t('summary.foundTranslationKeys', { count: this.stats.totalKeys }));
      
      const totalIssues = this.stats.missingFiles.length + 
                         this.stats.emptyFiles.length + 
                         this.stats.malformedFiles.length + 
                         this.stats.duplicateKeys.length + 
                         this.stats.inconsistentKeys.length;
      
      if (totalIssues > 0) {
        console.log(this.t('summary.foundIssues', {count: totalIssues}));
      } else {
        console.log(this.t('summary.noIssuesConsole'));
      }
      
    } catch (error) {
      console.error(this.t('summary.errorDuringAnalysis', { error: error.message }));
      if (args.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const reporter = new I18nSummaryReporter();
  reporter.run().catch(error => {
    console.error(this.t('summary.fatalError', { error: error.message }));
    process.exit(1);
  });
}

module.exports = I18nSummaryReporter;