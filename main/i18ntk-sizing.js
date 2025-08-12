#!/usr/bin/env node

/**
 * I18n Sizing Analyzer
 * 
 * Analyzes translation file sizes, character counts, and provides sizing statistics
 * for different languages to help with UI layout planning and optimization.
 * 
 * Features:
 * - File size analysis for all translation files
 * - Character count statistics per language
 * - Key-level size comparison across languages
 * - UI layout impact assessment
 * - Size optimization recommendations
 * 
 * Usage:
 *   i18ntk sizing [options]
 *   
 * Options:
 *   --source-dir <dir>     Source directory containing translation files (default: ./locales)
 *   --languages <langs>    Comma-separated list of languages to analyze (default: all)
 *   --output-report        Generate detailed sizing report
 *   --format <format>      Output format: json, csv, table (default: table)
 *   --threshold <number>   Size difference threshold for warnings (default: 50%)
 *   --detailed             Generate detailed report with more information
 *   --help                 Show this help message
 * 
 * Examples:
 *   i18ntk sizing --output-report
 *   i18ntk sizing --languages=en,de,fr --format=json
 *   i18ntk sizing --threshold=30 --output-report
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const { loadTranslations, t } = require('../utils/i18n-helper');
loadTranslations(process.env.I18NTK_LANG);
const configManager = require('../settings/settings-manager');
const SecurityUtils = require('../utils/security');
const { getUnifiedConfig } = require('../utils/config-helper');
const { getGlobalReadline, closeGlobalReadline } = require('../utils/cli');

// Get configuration from settings manager
function getConfig() {
  const settings = configManager.loadSettings ? configManager.loadSettings() : (configManager.getConfig ? configManager.getConfig() : {});
  
  // Check for per-script directory override, fallback to global sourceDir
  const sourceDir = settings.scriptDirectories?.sizing || settings.sourceDir || './locales';
  
  return {
    projectRoot: settings.projectRoot || '.',
    sourceDir: sourceDir,
    i18nDir: settings.i18nDir || settings.sourceDir || './locales',
    outputDir: settings.outputDir || './i18ntk-reports',
    threshold: settings.processing?.sizingThreshold || 50,
    uiLanguage: settings.language || 'en'
  };
}

class I18nSizingAnalyzer {
  constructor(options = {}) {
    const config = getConfig();
    const projectRoot = path.resolve(config.projectRoot || '.');
    this.sourceDir = path.resolve(projectRoot, options.sourceDir || config.sourceDir);
    this.outputDir = path.resolve(projectRoot, options.outputDir || config.outputDir);
    this.languages = options.languages || [];
    this.threshold = options.threshold || config.threshold; // Size difference threshold in percentage
    this.format = options.format || 'table';
    this.outputReport = options.outputReport || false;
    this.rl = null;
    
    // Initialize i18n with UI language from config
    const uiLanguage = options.uiLanguage || config.uiLanguage || 'en';
    loadTranslations(uiLanguage, path.resolve(__dirname, '..', 'ui-locales'));
    this.stats = {
      files: {},
      languages: {},
      keys: {},
      summary: {}
    };
  }

  // Initialize readline interface
  initReadline() {
    return getGlobalReadline();
  }

  // Prompt for user input
  async prompt(question) {
    const rl = getGlobalReadline();
    return new Promise(resolve => rl.question(question, resolve));
  }

  // Close readline interface
  closeReadline() {
    closeGlobalReadline();
  }

  // Get available language files
  getLanguageFiles() {
    const validatedSourceDir = SecurityUtils.validatePath(this.sourceDir, process.cwd());
    if (!validatedSourceDir) {
      throw new Error(t("sizing.invalidSourceDirectoryError", { sourceDir: this.sourceDir }));
    }

    if (!fs.existsSync(validatedSourceDir)) {
      throw new Error(t("sizing.sourceDirectoryNotFoundError", { sourceDir: validatedSourceDir }));
    }

    const files = [];
    const items = fs.readdirSync(validatedSourceDir);
    
    // Check for nested language directories
    for (const item of items) {
      const itemPath = SecurityUtils.validatePath(path.join(validatedSourceDir, item), process.cwd());
      if (!itemPath) continue;
      
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // This is a language directory, combine all JSON files
        const langFiles = fs.readdirSync(itemPath)
          .filter(file => file.endsWith('.json'))
          .map(file => SecurityUtils.validatePath(path.join(itemPath, file), process.cwd()))
          .filter(file => file !== null);
        
        if (langFiles.length > 0) {
          files.push({
            language: item,
            file: `${item}/*.json`,
            path: itemPath,
            files: langFiles
          });
        }
      } else if (item.endsWith('.json')) {
        // Direct JSON file in root
        const lang = path.basename(item, '.json');
        files.push({
          language: lang,
          file: item,
          path: itemPath
        });
      }
    }

    if (this.languages.length > 0) {
      return files.filter(f => this.languages.includes(f.language));
    }

    return files;
  }

  // Analyze file sizes
  analyzeFileSizes(files) {
    console.log(t("sizing.analyzing_file_sizes"));
    
    files.forEach(({ language, file, path: filePath, files: langFiles }) => {
      if (langFiles) {
        // Handle nested directory structure
        let totalSize = 0;
        let totalLines = 0;
        let totalCharacters = 0;
        let lastModified = new Date(0);
        
        langFiles.forEach(langFile => {
          const stats = fs.statSync(langFile);
          let content = SecurityUtils.safeReadFileSync(langFile, process.cwd());
          if (typeof content !== "string") content = "";
          totalSize += stats.size;
          totalLines += content.split('\n').length;
          totalCharacters += content.length;
          if (stats.mtime > lastModified) {
            lastModified = stats.mtime;
          }
        });
        
        this.stats.files[language] = {
          file,
          size: totalSize,
          sizeKB: (totalSize / 1024).toFixed(2),
          lines: totalLines,
          characters: totalCharacters,
          lastModified: lastModified,
          fileCount: langFiles.length
        };
      } else {
        // Handle single file structure
        const stats = fs.statSync(filePath);
        let content = SecurityUtils.safeReadFileSync(filePath, process.cwd());
        if (typeof content !== "string") content = "";
        this.stats.files[language] = {
          file,
          size: stats.size,
          sizeKB: (stats.size / 1024).toFixed(2),
          lines: content.split('\n').length,
          characters: content.length,
          lastModified: stats.mtime,
          fileCount: 1
        };
      }
    });
  }

  // Analyze translation content
  analyzeTranslationContent(files) {
    console.log(t("sizing.analyzing_translation_content"));
    
    files.forEach(({ language, path: filePath, files: langFiles }) => {
      try {
        let combinedContent = {};
        
        if (langFiles) {
          // Handle nested directory structure - combine all JSON files
          langFiles.forEach(langFile => {
            const rawContent = SecurityUtils.safeReadFileSync(langFile, process.cwd());
            const fileContent = SecurityUtils.safeParseJSON(rawContent);
            if (fileContent) {
              const fileName = path.basename(langFile, '.json');
              combinedContent[fileName] = fileContent;
            }
          });
        } else {
          // Handle single file structure
          const rawContent = SecurityUtils.safeReadFileSync(filePath, process.cwd());
          combinedContent = SecurityUtils.safeParseJSON(rawContent) || {};
        }
        
        const analysis = this.analyzeTranslationObject(combinedContent, '');
        
        this.stats.languages[language] = {
          totalKeys: analysis.keyCount,
          totalCharacters: analysis.charCount,
          averageKeyLength: analysis.keyCount > 0 ? analysis.charCount / analysis.keyCount : 0,
          maxKeyLength: analysis.maxLength,
          minKeyLength: analysis.minLength,
          emptyKeys: analysis.emptyKeys,
          longKeys: analysis.longKeys
        };
        
        // Store individual key sizes for comparison
        Object.entries(analysis.keys).forEach(([key, value]) => {
          if (!this.stats.keys[key]) {
            this.stats.keys[key] = {};
          }
          this.stats.keys[key][language] = {
            length: value.length,
            characters: value.length
          };
        });
        
      } catch (error) {
        console.error(t("sizing.failed_to_parse_language_error", { language, errorMessage: error.message }));
      }
    });
  }

  // Recursively analyze translation object
  analyzeTranslationObject(obj, prefix = '') {
    let keyCount = 0;
    let charCount = 0;
    let maxLength = 0;
    let minLength = Infinity;
    let emptyKeys = 0;
    let longKeys = 0;
    const keys = {};
    
    const traverse = (current, currentPrefix) => {
      Object.entries(current).forEach(([key, value]) => {
        const fullKey = currentPrefix ? `${currentPrefix}.${key}` : key;
        
        if (typeof value === 'string') {
          keyCount++;
          charCount += value.length;
          maxLength = Math.max(maxLength, value.length);
          minLength = Math.min(minLength, value.length);
          
          if (value.length === 0) emptyKeys++;
          if (value.length > 100) longKeys++;
          
          keys[fullKey] = value;
        } else if (typeof value === 'object' && value !== null) {
          traverse(value, fullKey);
        }
      });
    };
    
    traverse(obj, prefix);
    
    return {
      keyCount,
      charCount,
      maxLength: maxLength === 0 ? 0 : maxLength,
      minLength: minLength === Infinity ? 0 : minLength,
      emptyKeys,
      longKeys,
      keys
    };
  }

  // Generate size comparison analysis
  generateSizeComparison() {
    console.log(t("sizing.generating_size_comparisons"));
    
    const languages = Object.keys(this.stats.languages);
    const baseLanguage = languages[0]; // Use first language as baseline
    
    if (!baseLanguage) {
      console.warn(t("sizing.no_languages_found_for_comparison"));
      return;
    }
    
    this.stats.summary = {
      baseLanguage,
      totalLanguages: languages.length,
      sizeVariations: {},
      problematicKeys: [],
      recommendations: []
    };
    
    // Compare each language to base language
    languages.forEach(lang => {
      if (lang === baseLanguage) return;
      
      const baseStats = this.stats.languages[baseLanguage];
      const langStats = this.stats.languages[lang];
      
      const sizeDiff = ((langStats.totalCharacters - baseStats.totalCharacters) / baseStats.totalCharacters) * 100;
      
      this.stats.summary.sizeVariations[lang] = {
        characterDifference: langStats.totalCharacters - baseStats.totalCharacters,
        percentageDifference: sizeDiff.toFixed(2),
        isProblematic: Math.abs(sizeDiff) > this.threshold
      };
    });
    
    // Find problematic keys (significant size differences)
    Object.entries(this.stats.keys).forEach(([key, langData]) => {
      const baseLang = langData[baseLanguage];
      if (!baseLang) return;
      
      const variations = [];
      Object.entries(langData).forEach(([lang, data]) => {
        if (lang === baseLanguage) return;
        
        const diff = ((data.length - baseLang.length) / baseLang.length) * 100;
        if (Math.abs(diff) > this.threshold) {
          variations.push({
            language: lang,
            characterDifference: data.length - baseLang.length,
            percentageDifference: diff.toFixed(2),
            baseLength: baseLang.length,
            currentLength: data.length
          });
        }
      });
      
      if (variations.length > 0) {
        this.stats.summary.problematicKeys.push({
          key,
          variations
        });
      }
    });
    
    // Generate recommendations
    this.generateRecommendations();
  }

  // Generate optimization recommendations
  generateRecommendations() {
    const recommendations = [];
    
    // Check for large size variations
    Object.entries(this.stats.summary.sizeVariations).forEach(([lang, data]) => {
      if (data.isProblematic) {
        const comparison = data.percentageDifference > 0 ? t("sizing.longer") : t("sizing.shorter");
        const absPercentage = Math.abs(data.percentageDifference);
        recommendations.push(t("sizing.review_translations", { lang, absPercentage, comparison }));
      }
    });
    
    // Check for problematic keys
    if (this.stats.summary.problematicKeys.length > 0) {
      const problematicKeyNames = this.stats.summary.problematicKeys.map(item => item.key).join(', ');
      recommendations.push(t("sizing.problematic_keys", { count: this.stats.summary.problematicKeys.length, problematicKeys: problematicKeyNames }));
    }
    
    // Check for very long translations
    Object.entries(this.stats.languages).forEach(([lang, data]) => {
      if (data.longKeys > 0) {
        recommendations.push(t("sizing.long_translations", { lang, count: data.longKeys }));
      }
    });
    
    this.stats.summary.recommendations = recommendations;
  }

  // Display concise folder-level results
  displayFolderResults() {
    console.log("\n" + t("sizing.sizing_analysis_results"));
    console.log(t("sizing.lineSeparator"));
    
    // Folder-level summary table
    console.log("\n" + t("sizing.folder_summary_title"));
    console.log(t("sizing.folder_summary_table_header"));
    console.log(t("sizing.lineSeparator"));
    
    Object.entries(this.stats.files).forEach(([lang, data]) => {
      const langData = this.stats.languages[lang];
      const totalChars = Math.round(langData.totalKeys * langData.averageKeyLength);
      console.log(t("sizing.folder_summary_row", { 
        lang, 
        sizeKB: data.sizeKB, 
        totalKeys: langData.totalKeys, 
        avgLength: langData.averageKeyLength.toFixed(1),
        totalChars: totalChars
      }));
    });
    
    // Language comparison summary
    console.log("\n" + t("sizing.language_comparison_title"));
    const baseLang = this.languages[0];
    if (this.languages.length > 1 && this.stats.languages[baseLang]) {
      const baseChars = Math.round(this.stats.languages[baseLang].totalKeys * this.stats.languages[baseLang].averageKeyLength);
      
      this.languages.slice(1).forEach(lang => {
        if (this.stats.languages[lang]) {
          const langChars = Math.round(this.stats.languages[lang].totalKeys * this.stats.languages[lang].averageKeyLength);
          const diff = langChars - baseChars;
          const percent = baseChars > 0 ? ((diff / baseChars) * 100).toFixed(1) : 0;
          const status = Math.abs(diff) > this.threshold ? "⚠️" : "✅";
          console.log(`${lang}: ${diff > 0 ? '+' : ''}${diff} chars (${percent}%) ${status}`);
        }
      });
    }
    
    // Summary stats
    console.log("\n" + t("sizing.summary_stats", { 
      totalLanguages: Object.keys(this.stats.languages).length,
      totalKeys: Object.keys(this.stats.keys).length,
      reportPath: this.outputDir
    }));
    
    if (this.detailedKeys) {
      this.displayDetailedKeys();
    }
  }

  // Display detailed key analysis (only when explicitly requested)
  displayDetailedKeys() {
    console.log("\n" + t("sizing.detailed_key_analysis_title"));
    console.log(t("sizing.lineSeparator"));
    
    let counter = 0;
    Object.entries(this.stats.keys).forEach(([key, data]) => {
      if (counter >= 50) {
        console.log(t("sizing.too_many_keys_warning"));
        return;
      }
      
      console.log(t("sizing.key_analysis_header", { key }));
      
      Object.entries(data.translations).forEach(([lang, translation]) => {
        const length = translation.length;
        const isEmpty = length === 0;
        const isLong = length > this.threshold;
        const status = isEmpty ? t("sizing.status_empty") : isLong ? t("sizing.status_long") : t("sizing.status_ok");
        
        console.log(t("sizing.key_analysis_detail", { lang, length, status, translation: translation.substring(0, 50) + (translation.length > 50 ? "..." : "") }));
      });
      
      console.log("");
      counter++;
    });
  }

  // Generate human-readable report
  async generateHumanReadableReport() {
    if (!this.outputReport) return;
    
    console.log(t("sizing.generating_detailed_report"));
    
    const validatedOutputDir = SecurityUtils.validatePath(this.outputDir, process.cwd());
    if (!validatedOutputDir) {
      throw new Error(t("sizing.invalidOutputDirectoryError", { outputDir: this.outputDir }));
    }

    // Ensure output directory exists
    if (!fs.existsSync(validatedOutputDir)) {
      fs.mkdirSync(validatedOutputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Generate human-readable text report
    const textReportPath = SecurityUtils.validatePath(path.join(validatedOutputDir, `sizing-analysis-${timestamp}.txt`), process.cwd());
    if (!textReportPath) {
      throw new Error(t("sizing.invalidReportFileError"));
    }
    
    let textReport = this.generateTextReport(timestamp);
    const textSuccess = await SecurityUtils.safeWriteFile(textReportPath, textReport, process.cwd());
    if (textSuccess) {
      console.log(t("sizing.human_report_saved", { reportPath: textReportPath }));
    }
    
    // Generate JSON for programmatic access
    const jsonReportPath = SecurityUtils.validatePath(path.join(validatedOutputDir, `sizing-analysis-${timestamp}.json`), process.cwd());
    if (!jsonReportPath) {
      throw new Error(t("sizing.invalidReportFileError"));
    }
    
    const report = {
      timestamp: new Date().toISOString(),
      configuration: {
        sourceDir: this.sourceDir,
        languages: this.languages,
        threshold: this.threshold
      },
      analysis: this.stats,
      metadata: {
        totalFiles: Object.keys(this.stats.files).length,
        totalLanguages: Object.keys(this.stats.languages).length,
        totalKeys: Object.keys(this.stats.keys).length
      }
    };
    
    const jsonSuccess = await SecurityUtils.safeWriteFile(jsonReportPath, JSON.stringify(report, null, 2), process.cwd());
    if (jsonSuccess) {
      SecurityUtils.logSecurityEvent('Sizing report saved', 'info', { jsonReportPath });
    }
    
    // Generate CSV if requested
    if (this.format === 'csv') {
      await this.generateCSVReport(timestamp);
    }
  }

  // Generate human-readable text report
  generateTextReport(timestamp) {
    let report = `# i18n Sizing Analysis Report
Generated: ${new Date().toISOString()}

## Configuration
- Source Directory: ${this.sourceDir}
- Languages: ${this.languages.join(', ')}
- Threshold: ${this.threshold}%

## Summary Statistics
- Total Languages: ${Object.keys(this.stats.languages).length}
- Total Translation Keys: ${Object.keys(this.stats.keys).length}
- Total Files: ${Object.keys(this.stats.files).length}

## Language Overview
`;

    Object.entries(this.stats.languages).forEach(([lang, data]) => {
      const fileData = this.stats.files[lang] || { sizeKB: 0, lines: 0, characters: 0 };
      report += `
### ${lang.toUpperCase()}
- File Size: ${fileData.sizeKB} KB
- Lines: ${fileData.lines}
- Total Characters: ${fileData.characters}
- Translation Keys: ${data.totalKeys}
- Average Key Length: ${data.averageKeyLength.toFixed(1)} characters
- Empty Translations: ${data.emptyKeys}
- Long Keys (> ${this.threshold} chars): ${data.longKeys}
`;
    });

    // Size variations
    if (this.stats.summary.sizeVariations && Object.keys(this.stats.summary.sizeVariations).length > 0) {
      report += `
## Size Variations (vs ${this.languages[0]})
`;
      Object.entries(this.stats.summary.sizeVariations).forEach(([lang, data]) => {
        report += `- ${lang}: ${data.characterDifference > 0 ? '+' : ''}${data.characterDifference} chars (${data.percentageDifference > 0 ? '+' : ''}${data.percentageDifference}%) ${data.isProblematic ? '⚠️ PROBLEMATIC' : '✅ OK'}\n`;
      });
    }

    // Problematic keys
    if (this.stats.summary.problematicKeys.length > 0) {
      report += `
## Problematic Keys (${this.stats.summary.problematicKeys.length})
`;
      this.stats.summary.problematicKeys.forEach((item, index) => {
        report += `${index + 1}. ${item.key}\n`;
        item.variations.forEach(v => {
          report += `   ${v.language}: ${v.characterDifference > 0 ? '+' : ''}${v.characterDifference} chars (${v.percentageDifference > 0 ? '+' : ''}${v.percentageDifference}%)\n`;
        });
        report += '\n';
      });
    }

    // Recommendations
    if (this.stats.summary.recommendations.length > 0) {
      report += `
## Recommendations
`;
      this.stats.summary.recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n`;
      });
    }

    // Detailed key analysis
    if (this.detailedKeys) {
      report += `
## Detailed Key Analysis
`;
      Object.entries(this.stats.keys).forEach(([key, data]) => {
        report += `
### ${key}
`;
        Object.entries(data.translations).forEach(([lang, translation]) => {
          const length = translation.length;
          const isEmpty = length === 0;
          const isLong = length > this.threshold;
          const status = isEmpty ? 'EMPTY' : isLong ? 'LONG' : 'OK';
          report += `- ${lang}: ${length} chars [${status}] "${translation.substring(0, 100)}${translation.length > 100 ? '...' : ''}"\n`;
        });
      });
    }

    return report;
  }

  // Generate CSV report
  async generateCSVReport(timestamp) {
    const validatedOutputDir = SecurityUtils.validatePath(this.outputDir, process.cwd());
    if (!validatedOutputDir) {
      throw new Error(t("sizing.invalidOutputDirectoryError", { outputDir: this.outputDir }));
    }

    const csvPath = SecurityUtils.validatePath(path.join(validatedOutputDir, `sizing-analysis-${timestamp}.csv`), process.cwd());
    if (!csvPath) {
      throw new Error(t("sizing.invalidCsvFileError"));
    }
    
    let csvContent = 'Language,File Size (KB),Lines,Characters,Total Keys,Avg Key Length,Max Key Length,Empty Keys,Long Keys\n';
    
    Object.entries(this.stats.files).forEach(([lang]) => {
      const fileData = this.stats.files[lang];
      const langData = this.stats.languages[lang];
      
      csvContent += `${lang},${fileData.sizeKB},${fileData.lines},${fileData.characters},${langData.totalKeys},${langData.averageKeyLength.toFixed(1)},${langData.maxKeyLength},${langData.emptyKeys},${langData.longKeys}\n`;
    });
    
    const success = await SecurityUtils.safeWriteFile(csvPath, csvContent, process.cwd());
    if (success) {
      console.log(t("sizing.csv_report_saved_to", { csvPath }));
      SecurityUtils.logSecurityEvent('CSV report saved', 'info', { csvPath });
    } else {
      throw new Error(t("sizing.failedToSaveCsvError"));
    }
  }

  // Main analysis method
  async analyze() {
    const startTime = performance.now();
    
    try {
      console.log(t("sizing.starting_i18n_sizing_analysis"));
      console.log(t("sizing.source_directory", { sourceDir: this.sourceDir }));
      
      const files = this.getLanguageFiles();
      
      if (files.length === 0) {
        console.log(t("sizing.no_translation_files_found"));
        return;
      }
      
      console.log(t("sizing.found_languages", { languages: files.map(f => f.language).join(', ') }));
      
      this.analyzeFileSizes(files);
      this.analyzeTranslationContent(files);
      this.generateSizeComparison();
      
      if (this.format === 'table') {
        this.displayFolderResults();
      } else if (this.format === 'json') {
        console.log(t("sizing.analysisStats", { stats: JSON.stringify(this.stats, null, 2) }));
      }
      
      await this.generateHumanReadableReport();
      
      const endTime = performance.now();
      console.log(t("sizing.analysis_completed", { duration: (endTime - startTime).toFixed(2) }));
      
    } catch (error) {
      console.error(t("sizing.analysis_failed", { errorMessage: error.message }));
      process.exit(1);
    }
  }

  // Parse command line arguments without yargs
  parseArgs() {
    const args = process.argv.slice(2);
    const options = {
      'source-dir': './locales',
      'languages': '',
      'output-report': true,
      'format': 'table',
      'threshold': 50,
      'detailed': false,
      'detailed-keys': false,
      'output-dir': './i18ntk-reports',
      'help': false,
      's': './locales',
      'l': '',
      'o': true,
      'f': 'table',
      't': 50,
      'd': false
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--help' || arg === '-h') {
        options.help = true;
        continue;
      }
      
      // Handle --key=value format
      const keyValueMatch = arg.match(/^--?([^=]+)=(.+)$/);
      if (keyValueMatch) {
        const key = keyValueMatch[1];
        const value = keyValueMatch[2];
        
        if (key === 'source-dir' || key === 's') {
          options['source-dir'] = value;
          options.s = value;
        } else if (key === 'languages' || key === 'l') {
          options.languages = value;
          options.l = value;
        } else if (key === 'output-report' || key === 'o') {
          options['output-report'] = value.toLowerCase() !== 'false';
          options.o = options['output-report'];
        } else if (key === 'format' || key === 'f') {
          if (['json', 'csv', 'table'].includes(value)) {
            options.format = value;
            options.f = value;
          }
        } else if (key === 'threshold' || key === 't') {
          const numValue = parseInt(value);
          if (!isNaN(numValue)) {
            options.threshold = numValue;
            options.t = numValue;
          }
        } else if (key === 'detailed' || key === 'd') {
          options.detailed = value.toLowerCase() !== 'false';
          options.d = options.detailed;
        } else if (key === 'detailed-keys') {
          options['detailed-keys'] = value.toLowerCase() !== 'false';
        } else if (key === 'output-dir') {
          options['output-dir'] = value;
        }
        continue;
      }
      
      // Handle --key value format
      const match = arg.match(/^--?(.+)/);
      if (match) {
        const key = match[1];
        const nextArg = args[i + 1];
        
        if (key === 'source-dir' || key === 's') {
          options['source-dir'] = nextArg || options['source-dir'];
          options.s = options['source-dir'];
          if (nextArg && !nextArg.startsWith('-')) i++;
        } else if (key === 'languages' || key === 'l') {
          options.languages = nextArg || options.languages;
          options.l = options.languages;
          if (nextArg && !nextArg.startsWith('-')) i++;
        } else if (key === 'output-report' || key === 'o') {
          if (nextArg && !nextArg.startsWith('-') && ['true', 'false'].includes(nextArg.toLowerCase())) {
            options['output-report'] = nextArg.toLowerCase() !== 'false';
            options.o = options['output-report'];
            i++;
          } else {
            options['output-report'] = true;
            options.o = true;
          }
        } else if (key === 'format' || key === 'f') {
          const value = nextArg || options.format;
          if (['json', 'csv', 'table'].includes(value)) {
            options.format = value;
            options.f = value;
          }
          if (nextArg && !nextArg.startsWith('-') && ['json', 'csv', 'table'].includes(nextArg)) i++;
        } else if (key === 'threshold' || key === 't') {
          const value = parseInt(nextArg);
          if (!isNaN(value)) {
            options.threshold = value;
            options.t = value;
          }
          if (nextArg && !nextArg.startsWith('-') && !isNaN(parseInt(nextArg))) i++;
        } else if (key === 'detailed' || key === 'd') {
          if (nextArg && !nextArg.startsWith('-') && ['true', 'false'].includes(nextArg.toLowerCase())) {
            options.detailed = nextArg.toLowerCase() !== 'false';
            options.d = options.detailed;
            i++;
          } else {
            options.detailed = true;
            options.d = true;
          }
        } else if (key === 'detailed-keys') {
          if (nextArg && !nextArg.startsWith('-') && ['true', 'false'].includes(nextArg.toLowerCase())) {
            options['detailed-keys'] = nextArg.toLowerCase() !== 'false';
            i++;
          } else {
            options['detailed-keys'] = true;
          }
        } else if (key === 'output-dir') {
          options['output-dir'] = nextArg || options['output-dir'];
          if (nextArg && !nextArg.startsWith('-')) i++;
        }
      }
    }
    
    if (options.help) {
      console.log(`
I18NTK Sizing Analysis Tool

Usage: i18ntk-sizing [options]

Options:
  -s, --source-dir <dir>      Source directory containing translation files (default: ./locales)
  -l, --languages <langs>     Comma-separated list of languages to analyze
  -o, --output-report         Generate detailed sizing report (default: true)
  -f, --format <format>       Output format: json, csv, table (default: table)
  -t, --threshold <number>    Size difference threshold for warnings (%) (default: 50)
  -d, --detailed              Generate detailed report with more information
  --detailed-keys             Show detailed key-level analysis
  --output-dir <dir>          Output directory for reports (default: ./i18ntk-reports)
  --help                  Show this help message
`);
      process.exit(0);
    }
    
    return options;
  }

  // Add run method for compatibility with manager
  async run(options = {}) {
    const { fromMenu = false } = options;
    
    const args = this.parseArgs();
    const config = await getUnifiedConfig('sizing', args);

    this.sourceDir = path.resolve(config.projectRoot || '.', config.sourceDir || './locales');
    this.outputDir = path.resolve(config.projectRoot || '.', config.outputDir || './i18ntk-reports');
    this.threshold = args.threshold ?? config.processing?.sizingThreshold ?? 50;
    this.languages = args.languages ? args.languages.split(',').map(l => l.trim()) : [];
    this.outputReport = args['output-report'] !== undefined ? args['output-report'] : false;
    this.format = args.format || 'table';
    this.detailed = args.detailed;
    this.detailedKeys = args['detailed-keys'];

    if (!fromMenu) {

      const AdminAuth = require('../utils/admin-auth');
      const adminAuth = new AdminAuth();
      await adminAuth.initialize();
      
      const isCalledDirectly = require.main === module;
      const isRequired = await adminAuth.isAuthRequired();
      if (isRequired && isCalledDirectly && !args.noPrompt) {
        console.log('\n' + t('adminCli.authRequiredForOperation', { operation: 'analyze sizing' }));
        
        const cliHelper = require('../utils/cli-helper');
        const pin = await cliHelper.promptPin(t('adminCli.enterPin'));
        const isValid = await this.adminAuth.verifyPin(pin);
        
        if (!isValid) {
          console.log(t('adminCli.invalidPin'));
          if (!fromMenu) process.exit(1);
          return { success: false, error: 'Authentication failed' };
        }
        
        console.log(t('adminCli.authenticationSuccess'));
      }
    }
    
    return await this.analyze();
  }

  // Main analysis method
  async analyze() {
    try {
      console.log(t("sizing.starting_analysis"));
      console.log(t("sizing.source_directory", { sourceDir: this.sourceDir }));
      
      const startTime = performance.now();
      
      // Get language files
      const files = this.getLanguageFiles();
      if (files.length === 0) {
        console.warn(t("sizing.no_translation_files_found"));
        return { success: false, error: "No translation files found" };
      }
      
      console.log(t("sizing.found_files", { count: files.length }));
      
      // Analyze file sizes
      this.analyzeFileSizes(files);
      
      // Analyze translation content
      this.analyzeTranslationContent(files);
      
      // Generate size comparison
      this.generateSizeComparison();
      
      // Display results
      this.displayFolderResults();
      
      // Generate reports if requested
      await this.generateHumanReadableReport();
      
      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      console.log(t("sizing.analysis_completed", { duration }));
      
      return { success: true, stats: this.stats };
      
    } catch (error) {
      console.error(t("sizing.analysis_failed", { errorMessage: error.message }));
      return { success: false, error: error.message };
    }
  }
}

// Update the execution block at the end
if (require.main === module) {
  const analyzer = new I18nSizingAnalyzer();
  analyzer.run().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error(t('sizing.fatalError', { error: error.message }));
    process.exit(1);
  });
}

module.exports = I18nSizingAnalyzer;