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
 *   node 06-analyze-sizing.js [options]
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
 *   node 06-analyze-sizing.js --output-report
 *   node 06-analyze-sizing.js --languages=en,de,fr --format=json
 *   node 06-analyze-sizing.js --threshold=30 --output-report
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const { loadTranslations, t } = require('./utils/i18n-helper');
const settingsManager = require('./settings-manager');
const SecurityUtils = require('./utils/security');

// Get configuration from settings manager
function getConfig() {
  const settings = settingsManager.getSettings();
  return {
    sourceDir: settings.sourceDir || './locales',
    outputDir: settings.outputDir || './i18n-reports',
    threshold: settings.processing?.sizingThreshold || 50
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
    
    // Initialize i18n
    loadTranslations('en');
    this.t = t;
    
    this.stats = {
      files: {},
      languages: {},
      keys: {},
      summary: {}
    };
  }

  // Get available language files
  getLanguageFiles() {
    const validatedSourceDir = SecurityUtils.validatePath(this.sourceDir, process.cwd());
    if (!validatedSourceDir) {
      throw new Error(`Invalid source directory path: ${this.sourceDir}`);
    }

    if (!fs.existsSync(validatedSourceDir)) {
      throw new Error(`Source directory not found: ${validatedSourceDir}`);
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
          const content = SecurityUtils.safeReadFileSync(langFile, process.cwd());
          
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
        const content = SecurityUtils.safeReadFileSync(filePath, process.cwd());
        
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
        if (data.percentageDifference > 0) {
          recommendations.push(`Consider reviewing ${lang} translations - they are ${data.percentageDifference}% longer than baseline`);
        } else {
          recommendations.push(`Consider reviewing ${lang} translations - they are ${Math.abs(data.percentageDifference)}% shorter than baseline`);
        }
      }
    });
    
    // Check for problematic keys
    if (this.stats.summary.problematicKeys.length > 0) {
      recommendations.push(`${this.stats.summary.problematicKeys.length} keys have significant size variations across languages`);
    }
    
    // Check for very long translations
    Object.entries(this.stats.languages).forEach(([lang, data]) => {
      if (data.longKeys > 0) {
        recommendations.push(`${lang} has ${data.longKeys} translations longer than 100 characters - consider breaking them down`);
      }
    });
    
    this.stats.summary.recommendations = recommendations;
  }

  // Display results in table format
  displayTable() {
    console.log(this.t("sizing.sizing_analysis_results"));
    console.log("=".repeat(80));
    
    // File sizes table
    console.log("\n" + this.t("sizing.file_sizes_title"));
    console.log("-".repeat(80));
    console.log(this.t("sizing.file_sizes_header"));
    console.log("-".repeat(80));
    
    Object.entries(this.stats.files).forEach(([lang, data]) => {
      console.log(this.t("sizing.file_size_row", { lang, sizeKB: data.sizeKB, lines: data.lines, characters: data.characters }));
    });
    
    // Language statistics
    console.log("\n" + this.t("sizing.language_statistics_title"));
    console.log("-".repeat(80));
    console.log(this.t("sizing.language_stats_header"));
    console.log("-".repeat(80));
    
    Object.entries(this.stats.languages).forEach(([lang, data]) => {
      console.log(this.t("sizing.language_stats_row", { lang, totalKeys: data.totalKeys, totalCharacters: data.totalCharacters, averageKeyLength: data.averageKeyLength.toFixed(1), maxKeyLength: data.maxKeyLength, emptyKeys: data.emptyKeys }));
    });
    
    // Size variations
    if (this.stats.summary.sizeVariations) {
      console.log("\n" + this.t("sizing.size_variations_title"));
      console.log("-".repeat(80));
      console.log(this.t("sizing.size_variations_header"));
      console.log("-".repeat(80));
      
      Object.entries(this.stats.summary.sizeVariations).forEach(([lang, data]) => {
        const problematic = data.isProblematic ? '⚠️  Yes' : '✅ No';
        console.log(this.t("sizing.size_variation_row", { lang, characterDifference: data.characterDifference, percentageDifference: data.percentageDifference, problematic }));
      });
    }
    
    // Recommendations
    if (this.stats.summary.recommendations.length > 0) {
      console.log("\n" + this.t("sizing.recommendations_title"));
      console.log("-".repeat(80));
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
      throw new Error(`Invalid output directory path: ${this.outputDir}`);
    }

    // Ensure output directory exists
    if (!fs.existsSync(validatedOutputDir)) {
      fs.mkdirSync(validatedOutputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = SecurityUtils.validatePath(path.join(validatedOutputDir, `sizing-analysis-${timestamp}.json`), process.cwd());
    
    if (!reportPath) {
      throw new Error('Invalid report file path');
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
      throw new Error('Failed to save report securely');
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
      throw new Error(`Invalid output directory path: ${this.outputDir}`);
    }

    const csvPath = SecurityUtils.validatePath(path.join(validatedOutputDir, `sizing-analysis-${timestamp}.csv`), process.cwd());
    if (!csvPath) {
      throw new Error('Invalid CSV file path');
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
      throw new Error('Failed to save CSV report securely');
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
        console.log(JSON.stringify(this.stats, null, 2));
      }
      
      await this.generateReport();
      
      const endTime = performance.now();
      console.log(this.t("sizing.analysis_completed", { duration: (endTime - startTime).toFixed(2) }));
      
    } catch (error) {
      console.error(this.t("sizing.analysis_failed", { errorMessage: error.message }));
      process.exit(1);
    }
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help') {
      console.log(`
I18n Sizing Analyzer

Usage: node 06-analyze-sizing.js [options]

Options:
  --source-dir <dir>     Source directory containing translation files (default: ./locales)
  --languages <langs>    Comma-separated list of languages to analyze (default: all)
  --output-report        Generate detailed sizing report
  --format <format>      Output format: json, csv, table (default: table)
  --threshold <number>   Size difference threshold for warnings (default: 50%)
  --detailed             Generate detailed report with more information
  --help                 Show this help message

Examples:
  node 06-analyze-sizing.js --output-report
  node 06-analyze-sizing.js --languages=en,de,fr --format=json
  node 06-analyze-sizing.js --threshold=30 --output-report
`);
      process.exit(0);
    } else if (arg === '--source-dir' && i + 1 < args.length) {
      options.sourceDir = args[++i];
    } else if (arg === '--languages' && i + 1 < args.length) {
      options.languages = args[++i].split(',');
    } else if (arg === '--output-report') {
      options.outputReport = true;
    } else if (arg === '--detailed') {
      options.outputReport = true;
      options.detailed = true;
    } else if (arg === '--format' && i + 1 < args.length) {
      options.format = args[++i];
    } else if (arg === '--threshold' && i + 1 < args.length) {
      options.threshold = parseInt(args[++i]);
    }
  }
  
  const analyzer = new I18nSizingAnalyzer(options);
  analyzer.analyze();
}

module.exports = I18nSizingAnalyzer;