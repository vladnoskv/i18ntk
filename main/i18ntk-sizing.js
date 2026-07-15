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
const { loadTranslations, t } = require('../utils/i18n-helper');
const configManager = require('../settings/settings-manager');
const projectConfigManager = require('../utils/config-manager');
const SecurityUtils = require('../utils/security');
const { getUnifiedConfig } = require('../utils/config-helper');
const { logger } = require('../utils/logger');
const { getGlobalReadline, closeGlobalReadline } = require('../utils/cli');
const SetupEnforcer = require('../utils/setup-enforcer');

// Ensure setup is complete before running (only when executed directly)
if (require.main === module) {
  (async () => {
    try {
      await SetupEnforcer.checkSetupCompleteAsync();
    } catch (error) {
      console.error('Setup check failed:', error.message);
      process.exit(1);
    }
  })();
}

loadTranslations();

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
    uiLanguage: settings.language || 'en',
    sourceLanguage: settings.sourceLanguage || 'en'
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
    this.sourceLanguage = options.sourceLanguage || config.sourceLanguage || 'en';
    this.detailed = options.detailed || false;
    this.detailedKeys = options.detailedKeys || false;
    this.predictExpansion = options.predictExpansion || false;
    this.rl = null;
    this.expansionPredictions = null;
    
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

    if (!SecurityUtils.safeExistsSync(validatedSourceDir)) {
      throw new Error(t("sizing.sourceDirectoryNotFoundError", { sourceDir: validatedSourceDir }));
    }

    const files = [];
    const items = SecurityUtils.safeReaddirSync(validatedSourceDir);
    
    // Check for nested language directories
    for (const item of items) {
      const itemPath = SecurityUtils.validatePath(path.join(validatedSourceDir, item), process.cwd());
      if (!itemPath) continue;
      
      const stat = SecurityUtils.safeStatSync(itemPath);
      if (!stat) continue;
      
      if (stat.isDirectory()) {
        // This is a language directory, combine all JSON files
        const langFiles = this.collectJsonFiles(itemPath);
        
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
          path: itemPath,
          files: [itemPath],
          isSingleFile: true
        });
      }
    }

    if (this.languages.length > 0) {
      return files
        .filter(f => this.languages.includes(f.language))
        .sort((a, b) => a.language.localeCompare(b.language));
    }

    return files.sort((a, b) => a.language.localeCompare(b.language));
  }

  collectJsonFiles(dirPath) {
    const jsonFiles = [];
    const entries = SecurityUtils.safeReaddirSync(dirPath, process.cwd(), { withFileTypes: true });

    entries.forEach(entry => {
      const entryPath = SecurityUtils.validatePath(path.join(dirPath, entry.name), process.cwd());
      if (!entryPath) return;

      if (entry.isDirectory()) {
        jsonFiles.push(...this.collectJsonFiles(entryPath));
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        jsonFiles.push(entryPath);
      }
    });

    return jsonFiles.sort((a, b) => this.getFileSortName(dirPath, a).localeCompare(this.getFileSortName(dirPath, b)));
  }

  getLanguageFileName(languageEntry, filePath) {
    if (languageEntry.isSingleFile) {
      return path.basename(filePath);
    }

    return this.getFileSortName(languageEntry.path, filePath);
  }

  getFileSortName(basePath, filePath) {
    return path.relative(basePath, filePath).replace(/\\/g, '/');
  }

  createTable(columns, rows) {
    const widths = columns.map(column => {
      return Math.max(
        column.label.length,
        ...rows.map(row => String(row[column.key] ?? '').length)
      );
    });

    const formatCell = (value, width, align = 'left') => {
      const text = String(value ?? '');
      return align === 'right' ? text.padStart(width) : text.padEnd(width);
    };

    const header = columns.map((column, index) => formatCell(column.label, widths[index], column.align)).join('  ');
    const separator = widths.map(width => '-'.repeat(width)).join('  ');
    const body = rows.map(row => columns
      .map((column, index) => formatCell(row[column.key], widths[index], column.align))
      .join('  '));

    return [header, separator, ...body].join('\n');
  }

  // Analyze file sizes
  analyzeFileSizes(files) {
      logger.info(t("sizing.analyzing_file_sizes"));
    
    files.forEach(languageEntry => {
      const { language, file, path: filePath, files: langFiles } = languageEntry;
      if (langFiles) {
        // Handle nested directory structure
        let totalSize = 0;
        let totalLines = 0;
        let totalCharacters = 0;
        let lastModified = new Date(0);
        const perFiles = {};

        langFiles.forEach(langFile => {
          const stats = SecurityUtils.safeStatSync(langFile, process.cwd());
          if (!stats) return;

          let content = SecurityUtils.safeReadFileSync(langFile, process.cwd(), 'utf8');
          if (typeof content !== "string") content = "";
          totalSize += stats.size;
          totalLines += content.split('\n').length;
          totalCharacters += content.length;
          if (stats.mtime > lastModified) {
            lastModified = stats.mtime;
          }

          const relativeName = this.getLanguageFileName(languageEntry, langFile);
          perFiles[relativeName] = {
            file: relativeName,
            path: langFile,
            size: stats.size,
            sizeKB: (stats.size / 1024).toFixed(2),
            lines: content.split('\n').length,
            characters: content.length,
            lastModified: stats.mtime
          };
        });

        this.stats.files[language] = {
          file,
          size: totalSize,
          sizeKB: (totalSize / 1024).toFixed(2),
          lines: totalLines,
          characters: totalCharacters,
          lastModified: lastModified,
          fileCount: Object.keys(perFiles).length,
          perFiles
        };
      } else {
        // Handle single file structure
        const stats = SecurityUtils.safeStatSync(filePath, process.cwd());
        if (!stats) return;
        
        let content = SecurityUtils.safeReadFileSync(filePath, process.cwd(), 'utf8');
        if (typeof content !== "string") content = "";
        this.stats.files[language] = {
          file,
          size: stats.size,
          sizeKB: (stats.size / 1024).toFixed(2),
          lines: content.split('\n').length,
          characters: content.length,
          lastModified: stats.mtime,
          fileCount: 1,
          perFiles: {
            [file]: {
              file,
              path: filePath,
              size: stats.size,
              sizeKB: (stats.size / 1024).toFixed(2),
              lines: content.split('\n').length,
              characters: content.length,
              lastModified: stats.mtime
            }
          }
        };
      }
    });
  }

  // Analyze translation content
  analyzeTranslationContent(files) {
      logger.info(t("sizing.analyzing_translation_content"));
    
    files.forEach(languageEntry => {
      const { language, path: filePath, files: langFiles } = languageEntry;
      try {
        let combinedContent = {};
        const fileAnalyses = {};

        if (langFiles && !languageEntry.isSingleFile) {
          // Handle nested directory structure - combine all JSON files
          langFiles.forEach(langFile => {
            const rawContent = SecurityUtils.safeReadFileSync(langFile, process.cwd(), 'utf8');
            const fileContent = SecurityUtils.safeParseJSON(rawContent);
            if (fileContent) {
              const fileName = this.getLanguageFileName(languageEntry, langFile);
              const combinedKey = fileName.replace(/\.json$/i, '');
              combinedContent[combinedKey] = fileContent;
              const fileAnalysis = this.analyzeTranslationObject(fileContent, '');
              fileAnalyses[fileName] = {
                totalKeys: fileAnalysis.keyCount,
                totalCharacters: fileAnalysis.charCount,
                averageKeyLength: fileAnalysis.keyCount > 0 ? fileAnalysis.charCount / fileAnalysis.keyCount : 0,
                maxKeyLength: fileAnalysis.maxLength,
                minKeyLength: fileAnalysis.minLength,
                emptyKeys: fileAnalysis.emptyKeys,
                longKeys: fileAnalysis.longKeys
              };
            }
          });
        } else {
          // Handle single file structure
          const singleFilePath = languageEntry.isSingleFile && langFiles ? langFiles[0] : filePath;
          const rawContent = SecurityUtils.safeReadFileSync(singleFilePath, process.cwd(), 'utf8');
          combinedContent = SecurityUtils.safeParseJSON(rawContent) || {};
          const fileAnalysis = this.analyzeTranslationObject(combinedContent, '');
          fileAnalyses[path.basename(singleFilePath)] = {
            totalKeys: fileAnalysis.keyCount,
            totalCharacters: fileAnalysis.charCount,
            averageKeyLength: fileAnalysis.keyCount > 0 ? fileAnalysis.charCount / fileAnalysis.keyCount : 0,
            maxKeyLength: fileAnalysis.maxLength,
            minKeyLength: fileAnalysis.minLength,
            emptyKeys: fileAnalysis.emptyKeys,
            longKeys: fileAnalysis.longKeys
          };
        }
        
        const analysis = this.analyzeTranslationObject(combinedContent, '');
        
        this.stats.languages[language] = {
          totalKeys: analysis.keyCount,
          totalCharacters: analysis.charCount,
          averageKeyLength: analysis.keyCount > 0 ? analysis.charCount / analysis.keyCount : 0,
          maxKeyLength: analysis.maxLength,
          minKeyLength: analysis.minLength,
          emptyKeys: analysis.emptyKeys,
          longKeys: analysis.longKeys,
          files: fileAnalyses
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
          logger.error(t("sizing.failed_to_parse_language_error", { language, errorMessage: error.message }));
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
      logger.info(t("sizing.generating_size_comparisons"));
    
    const languages = Object.keys(this.stats.languages);
    const baseLanguage = languages.includes(this.sourceLanguage) ? this.sourceLanguage : languages[0];
    
    if (!baseLanguage) {
        logger.warn(t("sizing.no_languages_found_for_comparison"));
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
      
      const sizeDiff = baseStats.totalCharacters > 0
        ? ((langStats.totalCharacters - baseStats.totalCharacters) / baseStats.totalCharacters) * 100
        : 0;
      
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
        
        const diff = baseLang.length > 0 ? ((data.length - baseLang.length) / baseLang.length) * 100 : 0;
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
    this.generateFileComparison();

    // Generate recommendations
    this.generateRecommendations();

    // Generate expansion predictions if requested
    if (this.predictExpansion) {
      this.generateExpansionPredictions();
    }
  }

  generateFileComparison() {
    const languages = Object.keys(this.stats.files);
    const baseLanguage = this.stats.summary.baseLanguage || languages[0];
    const fileSets = {};
    const allFiles = new Set();

    languages.forEach(language => {
      const files = Object.keys(this.stats.files[language]?.perFiles || {}).sort();
      fileSets[language] = files;
      files.forEach(file => allFiles.add(file));
    });

    const baseFiles = new Set(fileSets[baseLanguage] || []);
    const commonFiles = [...allFiles].filter(file => languages.every(language => fileSets[language].includes(file))).sort();
    const missingFilesByLanguage = {};
    const extraFilesByLanguage = {};

    languages.forEach(language => {
      const currentFiles = new Set(fileSets[language]);
      missingFilesByLanguage[language] = [...allFiles].filter(file => !currentFiles.has(file)).sort();
      extraFilesByLanguage[language] = fileSets[language].filter(file => !baseFiles.has(file)).sort();
    });

    this.stats.summary.fileComparison = {
      baseLanguage,
      totalUniqueFiles: allFiles.size,
      commonFiles,
      fileSets,
      missingFilesByLanguage,
      extraFilesByLanguage,
      hasMismatches: Object.values(missingFilesByLanguage).some(files => files.length > 0)
    };
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

  // Language pair expansion reference table (average % expansion from English)
  // Values represent typical character count ratio (target/source) minus 1, as percentage
  getExpansionReference() {
    return {
      de: 35, es: 25, fr: 20, it: 15, pt: 20, nl: 30, sv: 15,
      ru: 50, uk: 45, pl: 30, cs: 25, sk: 25, bg: 40, sr: 40,
      ja: -40, zh: -45, ko: -35, th: -30, vi: -20, km: -5,
      ar: 15, he: 10, fa: 20, tr: 10, fi: 25, hu: 20, el: 15,
      da: 10, nb: 10, ro: 15, id: 5, ms: 5, hi: 15, bn: 20,
      ta: 10, te: 15, mr: 20, gu: 20, ml: 25, kn: 15
    };
  }

  classifyExpansionRisk(ratio) {
    const absRatio = Math.abs(ratio);
    if (absRatio < 30) return { tier: 'safe', label: 'Safe', color: 'green' };
    if (absRatio < 50) return { tier: 'warning', label: 'Warning', color: 'yellow' };
    return { tier: 'critical', label: 'Critical', color: 'red' };
  }

  generateExpansionPredictions() {
    const languages = Object.keys(this.stats.languages);
    if (languages.length < 2) return;

    const baseLanguage = this.stats.summary.baseLanguage || this.config.sourceLanguage || 'en';
    const expansionRef = this.getExpansionReference();
    const predictions = {
      baseLanguage,
      perLanguage: {},
      perKey: {},
      topExpandedKeys: [],
      summary: { safe: 0, warning: 0, critical: 0, total: 0 }
    };

    for (const lang of languages) {
      if (lang === baseLanguage) continue;

      const baseStats = this.stats.languages[baseLanguage];
      const langStats = this.stats.languages[lang];
      if (!baseStats || !langStats) continue;

      const actualRatio = baseStats.totalCharacters > 0
        ? ((langStats.totalCharacters - baseStats.totalCharacters) / baseStats.totalCharacters) * 100
        : 0;

      const referenceRatio = expansionRef[lang] || 10;
      const risk = this.classifyExpansionRisk(actualRatio);
      predictions.perLanguage[lang] = {
        actualExpansionPercent: Math.round(actualRatio * 100) / 100,
        referenceExpansionPercent: referenceRatio,
        riskTier: risk.tier,
        riskLabel: risk.label,
        totalKeys: langStats.totalKeys,
        totalChars: langStats.totalCharacters
      };
    }

    const keyEntries = [];
    for (const [key, langData] of Object.entries(this.stats.keys)) {
      const baseData = langData[baseLanguage];
      if (!baseData || baseData.length === 0) continue;

      const keyPredictions = {};
      for (const [lang, data] of Object.entries(langData)) {
        if (lang === baseLanguage) continue;
        const ratio = ((data.length - baseData.length) / baseData.length) * 100;
        const risk = this.classifyExpansionRisk(ratio);
        keyPredictions[lang] = {
          sourceLength: baseData.length,
          targetLength: data.length,
          expansionPercent: Math.round(ratio * 100) / 100,
          riskTier: risk.tier
        };
        predictions.summary[risk.tier]++;
        predictions.summary.total++;
      }

      const maxExpansion = Math.max(...Object.values(keyPredictions).map(p => Math.abs(p.expansionPercent)));
      keyEntries.push({ key, maxExpansion, predictions: keyPredictions });
    }

    keyEntries.sort((a, b) => b.maxExpansion - a.maxExpansion);
    predictions.topExpandedKeys = keyEntries.slice(0, 30);
    predictions.perKey = Object.fromEntries(keyEntries.slice(0, 200).map(e => [e.key, e.predictions]));

    this.expansionPredictions = predictions;
    this.stats.expansionPredictions = predictions;
  }

  displayExpansionPredictions() {
    if (!this.expansionPredictions) return;

    const p = this.expansionPredictions;
    console.log('\n' + '='.repeat(60));
    console.log('  EXPANSION PREDICTION ANALYSIS');
    console.log('='.repeat(60));
    console.log(`  Base Language: ${p.baseLanguage}`);
    console.log(`  Total Key-Language Pairs Analyzed: ${p.summary.total}`);
    console.log(`  Safe (<30%): ${p.summary.safe} | Warning (30-50%): ${p.summary.warning} | Critical (>50%): ${p.summary.critical}`);

    console.log('\n  PER-LANGUAGE EXPANSION RATIOS:');
    const langRows = Object.entries(p.perLanguage).map(([lang, data]) => ({
      language: lang,
      actual: `${data.actualExpansionPercent > 0 ? '+' : ''}${data.actualExpansionPercent}%`,
      reference: `${data.referenceExpansionPercent > 0 ? '+' : ''}${data.referenceExpansionPercent}%`,
      risk: data.riskLabel
    }));
    console.log(this.createTable([
      { key: 'language', label: 'Language' },
      { key: 'actual', label: 'Actual', align: 'right' },
      { key: 'reference', label: 'Reference', align: 'right' },
      { key: 'risk', label: 'Risk Tier' }
    ], langRows));

    if (p.topExpandedKeys.length > 0) {
      console.log('\n  TOP EXPANDED KEYS (highest risk of UI overflow):');
      const keyRows = p.topExpandedKeys.slice(0, 15).map(entry => {
        const langs = Object.entries(entry.predictions).map(([l, d]) =>
          `${l}:${d.expansionPercent > 0 ? '+' : ''}${d.expansionPercent}%`
        ).join(' ');
        return { key: entry.key, maxExp: `${entry.maxExpansion > 0 ? '+' : ''}${Math.round(entry.maxExpansion)}%`, languages: langs };
      });
      console.log(this.createTable([
        { key: 'key', label: 'Key' },
        { key: 'maxExp', label: 'Max Exp', align: 'right' },
        { key: 'languages', label: 'Per-Language' }
      ], keyRows));
    }

    console.log('\n  RECOMMENDATIONS:');
    if (p.summary.critical > 0) {
      console.log(`  - ${p.summary.critical} key-language pairs have >50% expansion — review UI layouts for truncation risk`);
    }
    if (p.summary.warning > 0) {
      console.log(`  - ${p.summary.warning} key-language pairs have 30-50% expansion — test on target languages`);
    }
    console.log('  - Use the reference expansion ratios to plan UI element sizing for unsupported languages');
  }

  // Display concise folder-level results
  displayFolderResults() {
    console.log("\n" + t("sizing.sizing_analysis_results"));
    console.log(t("sizing.lineSeparator"));
    
    // Folder-level summary table
    console.log("\n" + t("sizing.folder_summary_title"));
    const folderRows = Object.entries(this.stats.files).map(([lang, data]) => {
      const langData = this.stats.languages[lang];
      return {
        language: lang,
        files: data.fileCount,
        sizeKB: data.sizeKB,
        totalKeys: langData.totalKeys,
        avgLength: langData.averageKeyLength.toFixed(1),
        totalChars: langData.totalCharacters
      };
    });
    console.log(this.createTable([
      { key: 'language', label: 'Language' },
      { key: 'files', label: 'Files', align: 'right' },
      { key: 'sizeKB', label: 'Size(KB)', align: 'right' },
      { key: 'totalKeys', label: 'Keys', align: 'right' },
      { key: 'avgLength', label: 'Avg Len', align: 'right' },
      { key: 'totalChars', label: 'Total Chars', align: 'right' }
    ], folderRows));
    
    // Language comparison summary
    console.log("\n" + t("sizing.language_comparison_title"));
    const comparisonRows = Object.entries(this.stats.summary.sizeVariations || {}).map(([lang, data]) => ({
      language: lang,
      charDiff: `${data.characterDifference > 0 ? '+' : ''}${data.characterDifference}`,
      percent: `${data.percentageDifference > 0 ? '+' : ''}${data.percentageDifference}%`,
      status: data.isProblematic ? 'WARN' : 'OK'
    }));

    if (comparisonRows.length > 0) {
      console.log(this.createTable([
        { key: 'language', label: 'Language' },
        { key: 'charDiff', label: 'Char Diff', align: 'right' },
        { key: 'percent', label: 'Diff %', align: 'right' },
        { key: 'status', label: 'Status' }
      ], comparisonRows));
    } else {
      console.log("No language comparison available.");
    }
    this.displayFileComparison();

    if (this.detailed) {
      this.displayPerFileResults();
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

    if (this.predictExpansion && this.expansionPredictions) {
      this.displayExpansionPredictions();
    }
  }

  displayFileComparison() {
    const comparison = this.stats.summary.fileComparison;
    if (!comparison) return;

    console.log("\nFile Set Comparison");
    const rows = Object.keys(this.stats.files).map(language => ({
      language,
      files: this.stats.files[language].fileCount,
      missing: comparison.missingFilesByLanguage[language]?.length || 0,
      extra: comparison.extraFilesByLanguage[language]?.length || 0
    }));

    console.log(this.createTable([
      { key: 'language', label: 'Language' },
      { key: 'files', label: 'Files', align: 'right' },
      { key: 'missing', label: 'Missing', align: 'right' },
      { key: 'extra', label: 'Extra vs Base', align: 'right' }
    ], rows));

    if (comparison.hasMismatches) {
      Object.entries(comparison.missingFilesByLanguage).forEach(([language, files]) => {
        if (files.length > 0) {
          console.log(`${language} missing: ${files.join(', ')}`);
        }
      });
    }
  }

  displayPerFileResults() {
    console.log("\nPer-File Analysis");
    const rows = [];

    Object.entries(this.stats.languages).forEach(([language, languageData]) => {
      Object.entries(languageData.files || {}).forEach(([fileName, fileData]) => {
        const fileSizeData = this.stats.files[language]?.perFiles?.[fileName] || {};
        rows.push({
          language,
          file: fileName,
          sizeKB: fileSizeData.sizeKB || '0.00',
          keys: fileData.totalKeys,
          avgLength: fileData.averageKeyLength.toFixed(1),
          totalChars: fileData.totalCharacters
        });
      });
    });

    if (rows.length === 0) {
      console.log("No per-file analysis available.");
      return;
    }

    console.log(this.createTable([
      { key: 'language', label: 'Language' },
      { key: 'file', label: 'File' },
      { key: 'sizeKB', label: 'Size(KB)', align: 'right' },
      { key: 'keys', label: 'Keys', align: 'right' },
      { key: 'avgLength', label: 'Avg Len', align: 'right' },
      { key: 'totalChars', label: 'Total Chars', align: 'right' }
    ], rows));
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
      
      Object.entries(data).forEach(([lang, keyData]) => {
        const length = keyData.length;
        const isEmpty = length === 0;
        const isLong = length > this.threshold;
        const status = isEmpty ? t("sizing.status_empty") : isLong ? t("sizing.status_long") : t("sizing.status_ok");

        console.log(t("sizing.key_analysis_detail", { lang, length, status, translation: `${length} chars` }));
      });
      
      console.log("");
      counter++;
    });
  }

  // Generate human-readable report
  async generateHumanReadableReport() {
    if (!this.outputReport) return;
    
    logger.info(t("sizing.generating_detailed_report"));
    
    const validatedOutputDir = SecurityUtils.validatePath(this.outputDir, process.cwd());
    if (!validatedOutputDir) {
      throw new Error(t("sizing.invalidOutputDirectoryError", { outputDir: this.outputDir }));
    }

    // Ensure output directory exists
    if (!SecurityUtils.safeExistsSync(validatedOutputDir)) {
      SecurityUtils.safeMkdirSync(validatedOutputDir, process.cwd(), { recursive: true });
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
        logger.info(t("sizing.human_report_saved", { reportPath: textReportPath }));
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
        totalFiles: Object.values(this.stats.files).reduce((total, data) => total + (data.fileCount || 0), 0),
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
- Languages: ${(this.languages.length > 0 ? this.languages : Object.keys(this.stats.languages)).join(', ')}
- Threshold: ${this.threshold}%

## Summary Statistics
- Total Languages: ${Object.keys(this.stats.languages).length}
- Total Translation Keys: ${Object.keys(this.stats.keys).length}
- Total Files: ${Object.values(this.stats.files).reduce((total, data) => total + (data.fileCount || 0), 0)}

## Language Overview
`;

    Object.entries(this.stats.languages).forEach(([lang, data]) => {
      const fileData = this.stats.files[lang] || { sizeKB: 0, lines: 0, characters: 0 };
      report += `
### ${lang.toUpperCase()}
- Files: ${fileData.fileCount || 0}
- File Size: ${fileData.sizeKB} KB
- Lines: ${fileData.lines}
- Total Characters: ${fileData.characters}
- Translation Keys: ${data.totalKeys}
- Average Key Length: ${data.averageKeyLength.toFixed(1)} characters
- Empty Translations: ${data.emptyKeys}
- Long Keys (> ${this.threshold} chars): ${data.longKeys}
`;
    });

    const fileComparison = this.stats.summary.fileComparison;
    if (fileComparison) {
      report += `
## File Set Comparison
- Base Language: ${fileComparison.baseLanguage}
- Unique Files: ${fileComparison.totalUniqueFiles}
- Common Files: ${fileComparison.commonFiles.length}
- Mismatches: ${fileComparison.hasMismatches ? 'Yes' : 'No'}
`;

      Object.entries(fileComparison.missingFilesByLanguage).forEach(([lang, files]) => {
        report += `- ${lang}: ${files.length} missing${files.length > 0 ? ` (${files.join(', ')})` : ''}\n`;
      });
    }

    report += `
## Per-File Analysis
`;

    Object.entries(this.stats.languages).forEach(([lang, data]) => {
      Object.entries(data.files || {}).forEach(([fileName, fileData]) => {
        const sizeData = this.stats.files[lang]?.perFiles?.[fileName] || {};
        report += `- ${lang}/${fileName}: ${fileData.totalKeys} keys, ${fileData.totalCharacters} chars, ${fileData.averageKeyLength.toFixed(1)} avg chars, ${sizeData.sizeKB || '0.00'} KB\n`;
      });
    });

    // Size variations
    if (this.stats.summary.sizeVariations && Object.keys(this.stats.summary.sizeVariations).length > 0) {
      report += `
## Size Variations (vs ${this.stats.summary.baseLanguage})
`;
      Object.entries(this.stats.summary.sizeVariations).forEach(([lang, data]) => {
        report += `- ${lang}: ${data.characterDifference > 0 ? '+' : ''}${data.characterDifference} chars (${data.percentageDifference > 0 ? '+' : ''}${data.percentageDifference}%) ${data.isProblematic ? 'PROBLEMATIC' : 'OK'}\n`;
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
        Object.entries(data).forEach(([lang, keyData]) => {
          const length = keyData.length;
          const isEmpty = length === 0;
          const isLong = length > this.threshold;
          const status = isEmpty ? 'EMPTY' : isLong ? 'LONG' : 'OK';
          report += `- ${lang}: ${length} chars [${status}]\n`;
        });
      });
    }

    // Expansion predictions
    if (this.expansionPredictions) {
      const ep = this.expansionPredictions;
      report += `
## Expansion Prediction Analysis

### Summary
- Base Language: ${ep.baseLanguage}
- Safe (<30%): ${ep.summary.safe}
- Warning (30-50%): ${ep.summary.warning}
- Critical (>50%): ${ep.summary.critical}
- Total Pairs: ${ep.summary.total}

### Per-Language Ratios
`;
      Object.entries(ep.perLanguage).forEach(([lang, data]) => {
        report += `- ${lang}: ${data.actualExpansionPercent > 0 ? '+' : ''}${data.actualExpansionPercent}% (ref: ${data.referenceExpansionPercent > 0 ? '+' : ''}${data.referenceExpansionPercent}%) [${data.riskLabel}]\n`;
      });

      if (ep.topExpandedKeys.length > 0) {
        report += `
### Top Expanded Keys
`;
        ep.topExpandedKeys.slice(0, 30).forEach((entry, idx) => {
          report += `${idx + 1}. ${entry.key} (max: ${entry.maxExpansion > 0 ? '+' : ''}${Math.round(entry.maxExpansion)}%)\n`;
          Object.entries(entry.predictions).forEach(([l, d]) => {
            report += `   ${l}: ${d.sourceLength} → ${d.targetLength} chars (${d.expansionPercent > 0 ? '+' : ''}${d.expansionPercent}%) [${d.riskTier}]\n`;
          });
          report += '\n';
        });
      }
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
    
    let csvContent = 'Language,File Count,File Size (KB),Lines,Characters,Total Keys,Avg Key Length,Max Key Length,Empty Keys,Long Keys\n';
    
    Object.entries(this.stats.files).forEach(([lang]) => {
      const fileData = this.stats.files[lang];
      const langData = this.stats.languages[lang];
      
      csvContent += `${lang},${fileData.fileCount},${fileData.sizeKB},${fileData.lines},${fileData.characters},${langData.totalKeys},${langData.averageKeyLength.toFixed(1)},${langData.maxKeyLength},${langData.emptyKeys},${langData.longKeys}\n`;
    });
    
    const success = await SecurityUtils.safeWriteFile(csvPath, csvContent, process.cwd());
    if (success) {
        logger.info(t("sizing.csv_report_saved_to", { csvPath }));
        SecurityUtils.logSecurityEvent('CSV report saved', 'info', { csvPath });
    } else {
      throw new Error(t("sizing.failedToSaveCsvError"));
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
      'source-language': '',
      'detailed': false,
      'detailed-keys': false,
      'output-dir': './i18ntk-reports',
      'help': false,
      's': './locales',
      'l': '',
      'o': true,
      'f': 'table',
      't': 50,
      'd': false,
      sourceDirExplicit: false,
      outputDirExplicit: false
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
        
        if (key === 'source-dir' || key === 'locales-dir' || key === 'i18n-dir' || key === 's') {
          options['source-dir'] = value;
          options.s = value;
          options.sourceDirExplicit = true;
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
        } else if (key === 'source-language' || key === 'source-locale') {
          options['source-language'] = value;
        } else if (key === 'detailed' || key === 'd') {
          options.detailed = value.toLowerCase() !== 'false';
          options.d = options.detailed;
        } else if (key === 'detailed-keys') {
          options['detailed-keys'] = value.toLowerCase() !== 'false';
        } else if (key === 'predict-expansion') {
          options['predict-expansion'] = value.toLowerCase() !== 'false';
        } else if (key === 'output-dir') {
          options['output-dir'] = value;
          options.outputDirExplicit = true;
        }
        continue;
      }
      
      // Handle --key value format
      const match = arg.match(/^--?(.+)/);
      if (match) {
        const key = match[1];
        const nextArg = args[i + 1];
        
        if (key === 'source-dir' || key === 'locales-dir' || key === 'i18n-dir' || key === 's') {
          options['source-dir'] = nextArg || options['source-dir'];
          options.s = options['source-dir'];
          options.sourceDirExplicit = true;
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
        } else if (key === 'source-language' || key === 'source-locale') {
          options['source-language'] = nextArg || options['source-language'];
          if (nextArg && !nextArg.startsWith('-')) i++;
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
        } else if (key === 'predict-expansion') {
          if (nextArg && !nextArg.startsWith('-') && ['true', 'false'].includes(nextArg.toLowerCase())) {
            options['predict-expansion'] = nextArg.toLowerCase() !== 'false';
            i++;
          } else {
            options['predict-expansion'] = true;
          }
        } else if (key === 'output-dir') {
          options['output-dir'] = nextArg || options['output-dir'];
          options.outputDirExplicit = true;
          if (nextArg && !nextArg.startsWith('-')) i++;
        }
      }
    }
    
    if (options.help) {
      console.log(`
I18NTK Sizing Analysis Tool

Usage: i18ntk-sizing [options]

Options:
  -s, --locales-dir <dir>     Locale directory containing translation files (default: ./locales)
  --i18n-dir <dir>            Alias for --locales-dir
  --source-dir <dir>          Legacy alias for --locales-dir
  -l, --languages <langs>     Comma-separated list of languages to analyze
  -o, --output-report         Generate detailed sizing report (default: true)
  -f, --format <format>       Output format: json, csv, table (default: table)
  -t, --threshold <number>    Size difference threshold for warnings (%) (default: 50)
  --source-locale <code>      Source locale baseline for comparisons (default: en)
  --source-language <code>    Legacy alias for --source-locale
  -d, --detailed              Generate detailed report with more information
  --detailed-keys             Show detailed key-level analysis
  --predict-expansion         Predict UI layout expansion risk per language
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
    const commonArgs = {};
    if (args.sourceDirExplicit) commonArgs.sourceDir = args['source-dir'];
    if (args.outputDirExplicit) commonArgs.outputDir = args['output-dir'];
    if (args['source-language']) commonArgs.sourceLanguage = args['source-language'];
    const persistedConfig = projectConfigManager.getConfig();
    const config = await getUnifiedConfig('sizing', commonArgs);
    const projectRoot = config.projectRoot || persistedConfig.projectRoot || process.cwd();
    const configuredSizingDir = persistedConfig.scriptDirectories?.sizing;
    const translationDir = args.sourceDirExplicit
      ? args['source-dir']
      : (configuredSizingDir || persistedConfig.i18nDir || persistedConfig.sourceDir || config.i18nDir || config.sourceDir || './locales');

    this.sourceDir = path.resolve(projectRoot, translationDir);
    this.outputDir = path.resolve(config.projectRoot || '.', config.outputDir || './i18ntk-reports');
    this.threshold = args.threshold ?? config.processing?.sizingThreshold ?? 50;
    this.languages = args.languages ? args.languages.split(',').map(l => l.trim()) : [];
    this.outputReport = args['output-report'] !== undefined ? args['output-report'] : false;
    this.format = args.format || 'table';
    this.detailed = args.detailed;
    this.detailedKeys = args['detailed-keys'];
    this.predictExpansion = args['predict-expansion'] || false;
    this.sourceLanguage = args['source-language'] || config.sourceLanguage || this.sourceLanguage || 'en';

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
        const isValid = await adminAuth.verifyPin(pin);
        
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
        logger.info(t("sizing.starting_analysis"));
        logger.info(t("sizing.source_directory", { sourceDir: this.sourceDir }));
      
      const startTime = Date.now();
      
      // Get language files
      const files = this.getLanguageFiles();
      if (files.length === 0) {
          logger.warn(t("sizing.no_translation_files_found"));
          return { success: false, error: "No translation files found" };
      }
      
      logger.info(t("sizing.found_files", { count: files.length }));
      
      // Analyze file sizes
      this.analyzeFileSizes(files);
      
      // Analyze translation content
      this.analyzeTranslationContent(files);
      
      // Generate size comparison
      this.generateSizeComparison();
      
      // Display results
      if (this.format === 'table') {
        this.displayFolderResults();
      } else if (this.format === 'json') {
          logger.info(t("sizing.analysisStats", { stats: JSON.stringify(this.stats, null, 2) }));
      }
      
      // Generate reports if requested
      await this.generateHumanReadableReport();
      
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      logger.info(t("sizing.analysis_completed", { duration }));
      
      return { success: true, stats: this.stats };
      
    } catch (error) {
        logger.error(t("sizing.analysis_failed", { errorMessage: error.message }));
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
