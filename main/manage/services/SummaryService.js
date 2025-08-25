/**
 * Summary Service
 * Handles summary report generation without circular dependencies
 * @module services/SummaryService
 */

const path = require('path');
const fs = require('fs');
const SecurityUtils = require('../../../utils/security');
const { loadTranslations, t } = require('../../../utils/i18n-helper');
const { getUnifiedConfig } = require('../../../utils/config-helper');

module.exports = class SummaryService {
  constructor(config = {}) {
    this.config = config;
    this.settings = null;
    this.configManager = null;
    this.stats = {
      languages: [],
      totalFiles: 0,
      totalKeys: 0,
      keysByLanguage: {},
      filesByLanguage: {},
      fileSizes: {},
      folderSizes: {},
      missingFiles: [],
      inconsistentKeys: [],
      emptyFiles: [],
      malformedFiles: [],
      duplicateKeys: []
    };
  }

  /**
   * Initialize the service with required dependencies
   * @param {Object} configManager - Configuration manager instance
   */
  initialize(configManager) {
    this.configManager = configManager;
    this.settings = configManager.loadSettings ? configManager.loadSettings() : (configManager.getConfig ? configManager.getConfig() : {});
  }

  /**
   * Run summary analysis and generate report
   * @param {Object} options - Execution options
   * @returns {Promise<string>} Generated report
   */
  async run(options = {}) {
    try {
      // Get unified configuration
      const baseConfig = await getUnifiedConfig('summary', {});
      this.config = { ...this.config, ...baseConfig };

      // Load translations
      const uiLanguage = this.config.uiLanguage || 'en';
      loadTranslations(uiLanguage);

      // Validate source directory
      if (!SecurityUtils.safeExistsSync(this.config.sourceDir, this.config.sourceDir)) {
        throw new Error(`Source directory does not exist: ${this.config.sourceDir}`);
      }

      // Analyze structure and generate report
      await this.analyzeStructure();
      const report = this.generateReport();

      return report;
    } catch (error) {
      console.error(`Error in SummaryService: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get available languages from the source directory
   * @returns {string[]} Array of language codes
   */
  getAvailableLanguages() {
    if (!SecurityUtils.safeExistsSync(this.config.sourceDir, this.config.sourceDir)) {
      return [];
    }

    // Check for monolith JSON files (en.json, es.json, etc.)
    const files = SecurityUtils.safeReaddirSync(this.config.sourceDir, this.config.sourceDir) || [];
    const languages = files
      .filter(file => file.endsWith('.json'))
      .map(file => path.basename(file, '.json'));

    // Also check for directory-based structure for backward compatibility
    const directories = fs.readdirSync(this.config.sourceDir)
      .filter(item => {
        const itemPath = path.join(this.config.sourceDir, item);
        const stats = SecurityUtils.safeStatSync(itemPath, this.config.sourceDir);
        return stats && stats.isDirectory() &&
               !item.startsWith('.') &&
               item !== 'node_modules';
      });

    return [...new Set([...languages, ...directories])].sort();
  }

  /**
   * Get translation files for a specific language
   * @param {string} language - Language code
   * @returns {string[]} Array of file names
   */
  getLanguageFiles(language) {
    const languageDir = path.join(this.config.sourceDir, language);

    if (!SecurityUtils.safeExistsSync(languageDir, this.config.sourceDir)) {
      return [];
    }

    return SecurityUtils.safeReaddirSync(languageDir, this.config.sourceDir) || []
      .filter(file => {
        return this.config.supportedExtensions.some(ext => file.endsWith(ext)) &&
               !this.config.excludeFiles.includes(file);
      })
      .sort();
  }

  /**
   * Extract keys from a translation file
   * @param {string} filePath - Path to the translation file
   * @returns {Promise<string[]>} Array of translation keys
   */
  async extractKeysFromFile(filePath) {
    try {
      const content = await SecurityUtils.safeReadFile(filePath, this.config.sourceDir);
      if (!content) {
        return [];
      }

      if (filePath.endsWith('.json')) {
        const data = JSON.parse(content);
        return this.extractKeysFromObject(data);
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Extract keys recursively from an object
   * @param {Object} obj - Object to extract keys from
   * @param {string} prefix - Key prefix for nested objects
   * @returns {string[]} Array of keys
   */
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

  /**
   * Analyze the translation file structure
   * @returns {Promise<void>}
   */
  async analyzeStructure() {
    console.log(t('summary.analyzingFolder'));

    this.stats.languages = this.getAvailableLanguages();

    if (this.stats.languages.length === 0) {
      console.log(t('summary.noLanguageDirectoriesFound'));
      return;
    }

    console.log(t('summary.foundLanguages', {count: this.stats.languages.length, languages: this.stats.languages.join(', ')}));

    // Analyze each language
    for (const language of this.stats.languages) {
      console.log(t('summary.analyzingLanguage', {language}));

      const files = this.getLanguageFiles(language);
      this.stats.filesByLanguage[language] = files;
      this.stats.keysByLanguage[language] = {};

      let totalKeysForLanguage = 0;

      // Check for missing files compared to reference
      const referenceLanguage = this.stats.languages[0];
      const referenceFiles = this.getLanguageFiles(referenceLanguage);
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

        // Extract keys
        const keys = await this.extractKeysFromFile(filePath);
        this.stats.keysByLanguage[language][file] = keys;
        totalKeysForLanguage += keys.length;

        this.stats.totalFiles++;
      }

      this.stats.totalKeys += totalKeysForLanguage;
      console.log(t('summary.keysInFiles', {keys: totalKeysForLanguage, files: files.length}));
    }

    // Find inconsistent keys across languages
    this.findInconsistentKeys();
  }

  /**
   * Find keys that are inconsistent across languages
   */
  findInconsistentKeys() {
    console.log(t('summary.checkingInconsistentKeys'));

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

  /**
   * Generate table row for reports
   * @param {string[]} cells - Table cells
   * @param {number[]} widths - Column widths
   * @returns {string} Formatted table row
   */
  generateTableRow(cells, widths) {
    const row = cells.map((cell, index) => {
      const width = widths[index] || 15;
      return String(cell).padEnd(width);
    }).join(' | ');
    return row;
  }

  /**
   * Generate table separator
   * @param {number[]} widths - Column widths
   * @returns {string} Table separator line
   */
  generateTableSeparator(widths) {
    return widths.map(width => '-'.repeat(width)).join('-+-');
  }

  /**
   * Format file size in human readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate the summary report
   * @returns {string} Complete report
   */
  generateReport() {
    const report = [];
    const timestamp = new Date().toISOString();

    report.push(t('summary.reportTitle'));
    report.push('='.repeat(50));
    report.push(t('summary.generated', {timestamp}));
    report.push(t('summary.sourceDirectory', {dir: this.config.sourceDir}));
    report.push('');

    // Overview
    report.push(t('summary.overview'));
    report.push('='.repeat(30));
    report.push(t('summary.languagesCount', {count: this.stats.languages.length}));
    report.push(t('summary.totalFiles', {count: this.stats.totalFiles}));
    report.push(t('summary.totalKeys', {count: this.stats.totalKeys}));
    report.push(t('summary.avgKeysPerLanguage', {count: Math.round(this.stats.totalKeys / this.stats.languages.length)}));
    report.push('');

    // Languages breakdown
    report.push(t('summary.languagesBreakdown'));
    report.push('='.repeat(30));

    const langTableWidths = [12, 8, 8, 12];
    report.push(this.generateTableRow(['Language', 'Files', 'Keys', 'Avg Keys/File'], langTableWidths));
    report.push(this.generateTableSeparator(langTableWidths));

    for (const language of this.stats.languages) {
      const files = this.stats.filesByLanguage[language];
      const totalKeys = Object.values(this.stats.keysByLanguage[language])
        .reduce((sum, keys) => sum + keys.length, 0);
      const avgKeys = files.length > 0 ? Math.round(totalKeys / files.length) : 0;

      report.push(this.generateTableRow([
        language.toUpperCase(),
        files.length,
        totalKeys,
        avgKeys
      ], langTableWidths));
    }
    report.push('');

    // File structure
    report.push(t('summary.fileStructure'));
    report.push('='.repeat(30));

    const fileTableWidths = [20, 8, 12, 15, 15];
    report.push(this.generateTableRow(['File', 'Keys', 'Languages', 'Missing In'], fileTableWidths));
    report.push(this.generateTableSeparator(fileTableWidths));

    const referenceLanguage = this.stats.languages[0];
    const referenceFiles = this.stats.filesByLanguage[referenceLanguage] || [];

    for (const file of referenceFiles) {
      const keysInFile = this.stats.keysByLanguage[referenceLanguage][file]?.length || 0;

      // Calculate languages with this file
      let languagesWithFile = [];
      let missingIn = [];

      for (const language of this.stats.languages) {
        if (this.stats.filesByLanguage[language].includes(file)) {
          languagesWithFile.push(language.toUpperCase());
        } else {
          missingIn.push(language.toUpperCase());
        }
      }

      report.push(this.generateTableRow([
        file,
        keysInFile,
        languagesWithFile.join(', '),
        missingIn.join(', ')
      ], fileTableWidths));
    }
    report.push('');

    // Issues
    if (this.stats.missingFiles.length > 0 ||
        this.stats.emptyFiles.length > 0 ||
        this.stats.malformedFiles.length > 0 ||
        this.stats.duplicateKeys.length > 0 ||
        this.stats.inconsistentKeys.length > 0) {

      report.push(t('summary.issuesFound'));
      report.push('='.repeat(30));

      if (this.stats.missingFiles.length > 0) {
        report.push(t('summary.missingFiles'));
        for (const item of this.stats.missingFiles) {
          report.push(`   ${item.language}: ${item.files.join(', ')}`);
        }
        report.push('');
      }

      if (this.stats.inconsistentKeys.length > 0) {
        report.push(t('summary.inconsistentKeys'));
        for (const item of this.stats.inconsistentKeys) {
          report.push(`   ${item.language}/${item.file}:`);
          if (item.missing.length > 0) {
            report.push(t('summary.missingKeys', {keys: item.missing.slice(0, 5).join(', '), more: item.missing.length > 5 ? '...' : ''}));
          }
          if (item.extra.length > 0) {
            report.push(t('summary.extraKeys', {keys: item.extra.slice(0, 5).join(', '), more: item.extra.length > 5 ? '...' : ''}));
          }
        }
        report.push('');
      }
    } else {
      report.push(t('summary.noIssuesFound'));
      report.push('='.repeat(30));
      report.push(t('summary.allFilesConsistent'));
      report.push('');
    }

    // Recommendations
    report.push(t('summary.recommendations'));
    report.push('='.repeat(30));
    if (this.stats.missingFiles.length > 0) {
      report.push(t('summary.createMissingFiles'));
    }
    if (this.stats.inconsistentKeys.length > 0) {
      report.push(t('summary.synchronizeKeys'));
    }
    if (this.stats.languages.length === 1) {
      report.push(t('summary.addMoreLanguages'));
    }

    report.push('');
    report.push(t('summary.nextSteps'));
    report.push(t('summary.nextStep1'));
    report.push(t('summary.nextStep2'));
    report.push(t('summary.nextStep3'));
    report.push(t('summary.nextStep4'));

    return report.join('\n');
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Get current settings
   * @returns {Object} Current settings
   */
  getSettings() {
    return this.settings;
  }
};