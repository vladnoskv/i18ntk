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
const settingsManager = require('../settings/settings-manager');
const SecurityUtils = require('../utils/security');

// Get configuration from settings manager
function getConfig() {
  const settings = settingsManager.getSettings();
  
  // Check for per-script directory override, fallback to global sourceDir
  const sourceDir = settings.scriptDirectories?.sizing || settings.sourceDir || './locales';
  
  return {
    sourceDir: sourceDir,
    outputDir: settings.outputDir || './i18ntk-reports',
    threshold: settings.processing?.sizingThreshold || 50,
    uiLanguage: settings.language || 'en'
  };
}

class I18nSizingAnalyzer {
  constructor(options = {}) {
    const config = getConfig();
    this.sourceDir = options.sourceDir || config.sourceDir;
    this.outputDir = options.outputDir || config.outputDir;
    this.languages = options.languages || [];
    this.threshold = options.threshold || config.threshold; // Size difference threshold in percentage
    this.format = options.format || 'table';
    this.outputReport = options.outputReport || false;
    this.rl = null;
    
    // Initialize i18n with UI language from config
    const uiLanguage = options.uiLanguage || config.uiLanguage || 'en';
    loadTranslations(uiLanguage);
    this.t = t;
    
    this.stats = {
      files: {},
      languages: {},
      keys: {},
      summary: {}
    };
  }

  // Initialize readline interface
  initReadline() {
    if (!this.rl) {
      const readline = require('readline');
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }
    return this.rl;
  }

  // Prompt for user input
  async prompt(question) {
    const rl = this.rl || this.initReadline();
    return new Promise((resolve) => {
      rl.question(question, resolve);
    });
  }

  // Close readline interface
  closeReadline() {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }

  // Get available language files
  getLanguageFiles() {
    const validatedSourceDir = SecurityUtils.validatePath(this.sourceDir, process.cwd());
    if (!validatedSourceDir) {
      throw new Error(this.t("sizing.invalidSourceDirectoryError", { sourceDir: this.sourceDir }));
    }

    if (!fs.existsSync(validatedSourceDir)) {
      throw new Error(this.t("sizing.sourceDirectoryNotFoundError", { sourceDir: validatedSourceDir }));
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
    console.log(this.t("sizing.analyzing_file_sizes"));
    
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
    console.log(this.t("sizing.analyzing_translation_content"));
    
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
        console.error(this.t("sizing.failed_to_parse_language_error", { language, errorMessage: error.message }));
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
    console.log(this.t("sizing.generating_size_comparisons"));
    
    const languages = Object.keys(this.stats.languages);
    const baseLanguage = languages[0]; // Use first language as baseline
    
    if (!baseLanguage) {
      console.warn(this.t("sizing.no_languages_found_for_comparison"));
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
            difference: diff.toFixed(2),
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
        const comparison = data.percentageDifference > 0 ? this.t("sizing.longer") : this.t("sizing.shorter");
        const absPercentage = Math.abs(data.percentageDifference);
        recommendations.push(this.t("sizing.review_translations", { lang, absPercentage, comparison }));
      }
    });
    
    // Check for problematic keys
    if (this.stats.summary.problematicKeys.length > 0) {
      recommendations.push(this.t("sizing.problematic_keys", { count: this.stats.summary.problematicKeys.length }));
    }
    
    // Check for very long translations
    Object.entries(this.stats.languages).forEach(([lang, data]) => {
      if (data.longKeys > 0) {
        recommendations.push(this.t("sizing.long_translations", { lang, count: data.longKeys }));
      }
    });
    
    this.stats.summary.recommendations = recommendations;
  }

  // Display results in table format
  displayTable() {
    console.log(this.t("sizing.sourceDirectoryLabel", { sourceDir: path.resolve(this.sourceDir) }));
    console.log(this.t("sizing.sourceLanguageLabel", { sourceLanguage: this.config?.sourceLanguage || 'en' }));
    console.log(this.t("sizing.strictModeLabel", { mode: 'OFF' }));
    console.log();
    console.log(this.t("sizing.sizing_analysis_results"));
    console.log(this.t("sizing.separator"));
    
    // File sizes table
    console.log("\n" + this.t("sizing.file_sizes_title"));
    console.log(this.t("sizing.lineSeparator"));
    console.log(this.t("sizing.file_sizes_header"));
    console.log(this.t("sizing.lineSeparator"));
    
    Object.entries(this.stats.files).forEach(([lang, data]) => {
      console.log(this.t("sizing.file_size_row", { lang, sizeKB: data.sizeKB, lines: data.lines, characters: data.characters }));
    });
    
    // Language statistics
    console.log("\n" + this.t("sizing.language_statistics_title"));
    console.log(this.t("sizing.lineSeparator"));
    console.log(this.t("sizing.language_stats_header"));
    console.log(this.t("sizing.lineSeparator"));
    
    Object.entries(this.stats.languages).forEach(([lang, data]) => {
      console.log(this.t("sizing.language_stats_row", { lang, totalKeys: data.totalKeys, totalCharacters: data.totalCharacters, averageKeyLength: data.averageKeyLength.toFixed(1), maxKeyLength: data.maxKeyLength, emptyKeys: data.emptyKeys, longKeys: data.longKeys }));
    });
    
    // Size variations
    if (this.stats.summary.sizeVariations) {
      console.log("\n" + this.t("sizing.size_variations_title"));
      console.log(this.t("sizing.lineSeparator"));
      console.log(this.t("sizing.size_variations_header"));
      console.log(this.t("sizing.lineSeparator"));
      
      Object.entries(this.stats.summary.sizeVariations).forEach(([lang, data]) => {
        const problematic = data.isProblematic ? this.t("sizing.problematic_yes") : this.t("sizing.problematic_no");
        console.log(this.t("sizing.size_variation_row", { lang, characterDifference: data.characterDifference, percentageDifference: data.percentageDifference, problematic }));
      });
    }
    
    // Recommendations
    if (this.stats.summary.recommendations.length > 0) {
      console.log("\n" + this.t("sizing.recommendations_title"));
      console.log(this.t("sizing.lineSeparator"));
      this.stats.summary.recommendations.forEach((rec, index) => {
        console.log(this.t("sizing.recommendation_item", { index: index + 1, recommendation: rec }));
      });
    }
  }

  // Generate detailed report
  async generateReport() {
    if (!this.outputReport) return;
    
    console.log(this.t("sizing.generating_detailed_report"));
    
    const validatedOutputDir = SecurityUtils.validatePath(this.outputDir, process.cwd());
    if (!validatedOutputDir) {
      throw new Error(this.t("sizing.invalidOutputDirectoryError", { outputDir: this.outputDir }));
    }

    // Ensure output directory exists
    if (!fs.existsSync(validatedOutputDir)) {
      fs.mkdirSync(validatedOutputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = SecurityUtils.validatePath(path.join(validatedOutputDir, `sizing-analysis-${timestamp}.json`), process.cwd());
    
    if (!reportPath) {
      throw new Error(this.t("sizing.invalidReportFileError"));
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
    
    const success = SecurityUtils.safeWriteFileSync(reportPath, JSON.stringify(report, null, 2), process.cwd());
    if (success) {
      console.log(this.t("sizing.report_saved_to", { reportPath }));
      SecurityUtils.logSecurityEvent('Sizing report saved', 'info', { reportPath });
    } else {
      throw new Error(this.t("sizing.failedToSaveReportError"));
    }
    
    // Generate CSV if requested
    if (this.format === 'csv') {
      await this.generateCSVReport(timestamp);
    }
  }

  // Generate CSV report
  async generateCSVReport(timestamp) {
    const validatedOutputDir = SecurityUtils.validatePath(this.outputDir, process.cwd());
    if (!validatedOutputDir) {
      throw new Error(this.t("sizing.invalidOutputDirectoryError", { outputDir: this.outputDir }));
    }

    const csvPath = SecurityUtils.validatePath(path.join(validatedOutputDir, `sizing-analysis-${timestamp}.csv`), process.cwd());
    if (!csvPath) {
      throw new Error(this.t("sizing.invalidCsvFileError"));
    }
    
    let csvContent = 'Language,File Size (KB),Lines,Characters,Total Keys,Avg Key Length,Max Key Length,Empty Keys,Long Keys\n';
    
    Object.entries(this.stats.files).forEach(([lang]) => {
      const fileData = this.stats.files[lang];
      const langData = this.stats.languages[lang];
      
      csvContent += `${lang},${fileData.sizeKB},${fileData.lines},${fileData.characters},${langData.totalKeys},${langData.averageKeyLength.toFixed(1)},${langData.maxKeyLength},${langData.emptyKeys},${langData.longKeys}\n`;
    });
    
    const success = SecurityUtils.safeWriteFileSync(csvPath, csvContent, process.cwd());
    if (success) {
      console.log(this.t("sizing.csv_report_saved_to", { csvPath }));
      SecurityUtils.logSecurityEvent('CSV report saved', 'info', { csvPath });
    } else {
      throw new Error(this.t("sizing.failedToSaveCsvError"));
    }
  }

  // Main analysis method
  async analyze() {
    const startTime = performance.now();
    
    try {
      console.log(this.t("sizing.starting_i18n_sizing_analysis"));
      console.log(this.t("sizing.source_directory", { sourceDir: this.sourceDir }));
      
      const files = this.getLanguageFiles();
      
      if (files.length === 0) {
        console.log(this.t("sizing.no_translation_files_found"));
        return;
      }
      
      console.log(this.t("sizing.found_languages", { languages: files.map(f => f.language).join(', ') }));
      
      this.analyzeFileSizes(files);
      this.analyzeTranslationContent(files);
      this.generateSizeComparison();
      
      if (this.format === 'table') {
        this.displayTable();
      } else if (this.format === 'json') {
        console.log(this.t("sizing.analysisStats", { stats: JSON.stringify(this.stats, null, 2) }));
      }
      
      await this.generateReport();
      
      const endTime = performance.now();
      console.log(this.t("sizing.analysis_completed", { duration: (endTime - startTime).toFixed(2) }));
      
    } catch (error) {
      console.error(this.t("sizing.analysis_failed", { errorMessage: error.message }));
      process.exit(1);
    }
  }

  // Add run method for compatibility with manager
  async run(options = {}) {
    const { fromMenu = false } = options;
    
    // Skip admin authentication when called from menu
    if (!fromMenu) {
      const args = this.parseArgs();
      const AdminAuth = require('../utils/admin-auth');
      const adminAuth = new AdminAuth();
      await adminAuth.initialize();
      
      const isCalledDirectly = require.main === module;
      const isRequired = await adminAuth.isAuthRequired();
      if (isRequired && isCalledDirectly && !args.noPrompt) {
        console.log('\n' + this.t('adminCli.authRequiredForOperation', { operation: 'analyze sizing' }));
        
        const pin = await this.prompt('🔐 Enter admin PIN: ');
        const isValid = await adminAuth.verifyPin(pin);
        
        if (!isValid) {
          console.log(this.t('adminCli.invalidPin'));
          if (!fromMenu) process.exit(1);
          return { success: false, error: 'Authentication failed' };
        }
        
        console.log(this.t('adminCli.authenticationSuccess'));
      }
    }
    
    return await this.analyze();
  }
}

// Update the execution block at the end
if (require.main === module) {
  const analyzer = new I18nSizingAnalyzer();
  analyzer.analyze().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error(this.t("sizing.fatalError", { error: error.message }));
    process.exit(1);
  });
}

module.exports = I18nSizingAnalyzer;