#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { loadTranslations, t } = require('../utils/i18n-helper');
loadTranslations(process.env.I18NTK_LANG || 'en');
const { getUnifiedConfig, parseCommonArgs, displayHelp } = require('../utils/config-helper');
const SecurityUtils = require('../utils/security');
const AdminCLI = require('../utils/admin-cli');
const { getGlobalReadline, closeGlobalReadline } = require('../utils/cli');


class I18nSummaryReporter {
  constructor() {
    this.config = null; // Will be set from getUnifiedConfig
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
    this.rl = null;
  }

  async initialize() {
    try {
      const cliArgs = parseCommonArgs(process.argv.slice(2));
      if (cliArgs.help) {
        this.showHelp();
        process.exit(0);
      }

      const baseConfig = await getUnifiedConfig('summary', cliArgs);
      this.config = baseConfig;

      const uiLanguage = this.config.uiLanguage || 'en';
      loadTranslations(uiLanguage, path.resolve(__dirname, '..', 'ui-locales'));

      this.sourceDir = this.config.sourceDir;

      // Validate source directory
      const { validateSourceDir } = require('../utils/config-helper');
      validateSourceDir(this.sourceDir, 'i18ntk-summary');
    } catch (error) {
      console.error(`Error initializing summary reporter: ${error.message}`);
      throw error;
    }
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



  // Show help information
  showHelp() {
    console.log(`\n${t('summary.helpTitle')}\n`);
    console.log(t('summary.helpDescription') + '\n');
    console.log(t('summary.helpUsage') + '\n');
    console.log(t('summary.helpOptions'));
    console.log(t('summary.helpSourceDir'));
    console.log(t('summary.helpOutput'));
    console.log(t('summary.helpVerbose'));
    console.log(t('summary.helpKeepReports'));
    console.log(t('summary.helpDeleteReports'));
    console.log(t('summary.helpHelp') + '\n');
    console.log(t('summary.helpExamples'));
    console.log(t('summary.helpExample1'));
    console.log(t('summary.helpExample2'));
    console.log(t('summary.helpExample3'));
    console.log(t('summary.helpExample4'));
    console.log(t('summary.helpExample5') + '\n');
  }



  // Get all available languages
  getAvailableLanguages() {
    if (!fs.existsSync(this.config.sourceDir)) {
      return [];
    }

    // Check for monolith JSON files (en.json, es.json, etc.)
    const files = fs.readdirSync(this.config.sourceDir);
    const languages = files
      .filter(file => file.endsWith('.json'))
      .map(file => path.basename(file, '.json'));
    
    // Also check for directory-based structure for backward compatibility
    const directories = fs.readdirSync(this.config.sourceDir)
      .filter(item => {
        const itemPath = path.join(this.config.sourceDir, item);
        return fs.statSync(itemPath).isDirectory() && 
               !item.startsWith('.') &&
               item !== 'node_modules';
      });
    
    return [...new Set([...languages, ...directories])].sort();
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

  // Get file size information
  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return {
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        lastModified: stats.mtime
      };
    } catch (error) {
      return { size: 0, sizeFormatted: '0 B', lastModified: null };
    }
  }

  // Format file size in human readable format
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Calculate folder size
  calculateFolderSize(folderPath) {
    let totalSize = 0;
    try {
      const items = fs.readdirSync(folderPath);
      for (const item of items) {
        const itemPath = path.join(folderPath, item);
        const stats = fs.statSync(itemPath);
        if (stats.isDirectory()) {
          totalSize += this.calculateFolderSize(itemPath);
        } else {
          totalSize += stats.size;
        }
      }
    } catch (error) {
      // Ignore errors for inaccessible files
    }
    return totalSize;
  }

  // Extract keys from a translation file
  async extractKeysFromFile(filePath) {
    try {
      const content = await SecurityUtils.safeReadFile(filePath, this.config.sourceDir);
      if (!content) {
        console.warn(t('summary.couldNotReadFile', { filePath }));
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
            console.warn(t('summary.couldNotParseJSFile', { filePath }));
            return [];
          }
        }
      }
      
      return [];
    } catch (error) {
      console.warn(t('summary.errorReadingFile', { filePath, error: error.message }));
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
        // Parse the JSON and check for actual duplicate keys using full path
        const data = SecurityUtils.safeParseJSON(content);
        if (!data) return [];
        
        // Get all keys with full path
        const allKeys = this.extractKeysFromObject(data);
        
        // Find actual duplicates (same full path)
        const seen = new Set();
        const duplicates = new Set();
        
        for (const key of allKeys) {
          if (seen.has(key)) {
            duplicates.add(key);
          }
          seen.add(key);
        }
        
        return [...duplicates];
      }
      
      return [];
    } catch (error) {
      return [];
    }
  }

  // Analyze folder structure and collect statistics
  async analyzeStructure() {
    console.log(t('summary.analyzingFolder'));
    
    this.stats.languages = this.getAvailableLanguages();
    
    if (this.stats.languages.length === 0) {
      console.log(t('summary.noLanguageDirectoriesFound'));
      return;
    }
    
    console.log(t('summary.foundLanguages', {count: this.stats.languages.length, languages: this.stats.languages.join(', ')}));
    
    // Calculate folder sizes for each language
    for (const language of this.stats.languages) {
      const languageDir = path.join(this.config.sourceDir, language);
      if (fs.existsSync(languageDir)) {
        this.stats.folderSizes[language] = this.calculateFolderSize(languageDir);
      }
    }
    
    // Use first language as reference for file structure
    const referenceLanguage = this.stats.languages[0];
    const referenceFiles = this.getLanguageFiles(referenceLanguage);
    
    console.log(t('summary.referenceLanguageFiles', {language: referenceLanguage, count: referenceFiles.length}));
    
    // Analyze each language
    for (const language of this.stats.languages) {
      console.log(t('summary.analyzingLanguage', {language}));
      
      const files = this.getLanguageFiles(language);
      this.stats.filesByLanguage[language] = files;
      this.stats.keysByLanguage[language] = {};
      this.stats.fileSizes[language] = {};
      
      let totalKeysForLanguage = 0;
      let totalSizeForLanguage = 0;
      
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
        
        // Get file size information
        const fileInfo = this.getFileSize(filePath);
        this.stats.fileSizes[language][file] = fileInfo;
        totalSizeForLanguage += fileInfo.size;
        
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
      console.log(t('summary.keysInFiles', {keys: totalKeysForLanguage, files: files.length}));
    }
    
    // Find inconsistent keys across languages
    this.findInconsistentKeys();
  }

  // Find keys that are inconsistent across languages
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

  // Generate formatted table row
  generateTableRow(cells, widths) {
    const row = cells.map((cell, index) => {
      const width = widths[index] || 15;
      return String(cell).padEnd(width);
    }).join(' | ');
    return row;
  }

  // Generate table separator
  generateTableSeparator(widths) {
    return widths.map(width => '-'.repeat(width)).join('-+-');
  }

  // Generate summary report
  generateDetailedReport() {
    const report = [];
    
    report.push('I18N DETAILED DUPLICATE KEYS REPORT');
    report.push('='.repeat(40));
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push(`Source directory: ${this.config.sourceDir}`);
    report.push('');
    
    if (this.stats.duplicateKeys.length > 0) {
      report.push('🔑 ACTUAL DUPLICATE KEYS (Same Full Path)');
      report.push('='.repeat(35));
      
      let grandTotal = 0;
      for (const item of this.stats.duplicateKeys) {
        if (item.duplicates.length > 0) {
          report.push(`\n${item.language.toUpperCase()}/${item.file}:`);
          report.push(`Found ${item.duplicates.length} duplicate keys:`);
          
          for (const key of item.duplicates) {
            report.push(`  - "${key}"`);
          }
          
          grandTotal += item.duplicates.length;
        }
      }
      
      report.push('');
      report.push(`TOTAL DUPLICATE KEYS ACROSS ALL FILES: ${grandTotal}`);
      report.push('');
      
      report.push('📋 RECOMMENDATIONS FOR FIXING DUPLICATES');
      report.push('='.repeat(35));
      report.push('1. Review each file listed above');
      report.push('2. Remove duplicate key definitions');
      report.push('3. Ensure each key is defined only once per file');
      report.push('4. Check for actual duplicate key definitions at the same level');
      report.push('5. Note: Keys with same name but different paths (e.g., "hero.title" vs "stats.title") are NOT duplicates');
    } else {
      report.push('✅ No actual duplicate keys found in any files.');
      report.push('Note: Keys with the same name but in different nested structures are not considered duplicates.');
    }
    
    return report.join('\n');
  }

  generateReport() {
    const report = [];
    const timestamp = new Date().toISOString();
    
    report.push(t('summary.reportTitle'));
    report.push('='.repeat(50));
    report.push(t('summary.generated', {timestamp}));
    report.push(t('summary.sourceDirectory', {dir: this.config.sourceDir}));
    report.push('');
    
    // Overview with sizing
    report.push(t('summary.overview'));
    report.push('='.repeat(30));
    report.push(t('summary.languagesCount', {count: this.stats.languages.length}));
    report.push(t('summary.totalFiles', {count: this.stats.totalFiles}));
    report.push(t('summary.totalKeys', {count: this.stats.totalKeys}));
    report.push(t('summary.avgKeysPerLanguage', {count: Math.round(this.stats.totalKeys / this.stats.languages.length)}));
    
    // Calculate total size
    const totalSize = Object.values(this.stats.folderSizes).reduce((sum, size) => sum + size, 0);
    report.push(`Total Size: ${this.formatFileSize(totalSize)}`);
    report.push('');
    
    // Languages breakdown with sizing
    report.push(t('summary.languagesBreakdown'));
    report.push('='.repeat(30));
    
    const langTableWidths = [12, 8, 8, 12, 12];
    report.push(this.generateTableRow(['Language', 'Files', 'Keys', 'Folder Size', 'Avg Keys/File'], langTableWidths));
    report.push(this.generateTableSeparator(langTableWidths));
    
    for (const language of this.stats.languages) {
      const files = this.stats.filesByLanguage[language];
      const totalKeys = Object.values(this.stats.keysByLanguage[language])
        .reduce((sum, keys) => sum + keys.length, 0);
      const folderSize = this.stats.folderSizes[language] || 0;
      const avgKeys = files.length > 0 ? Math.round(totalKeys / files.length) : 0;
      
      report.push(this.generateTableRow([
        language.toUpperCase(),
        files.length,
        totalKeys,
        this.formatFileSize(folderSize),
        avgKeys
      ], langTableWidths));
    }
    report.push('');
    
    // File structure with sizing
    report.push(t('summary.fileStructure'));
    report.push('='.repeat(30));
    
    const fileTableWidths = [20, 8, 12, 15, 15];
    report.push(this.generateTableRow(['File', 'Keys', 'Size', 'Languages', 'Missing In'], fileTableWidths));
    report.push(this.generateTableSeparator(fileTableWidths));
    
    const referenceLanguage = this.stats.languages[0];
    const referenceFiles = this.stats.filesByLanguage[referenceLanguage] || [];
    
    for (const file of referenceFiles) {
      const keysInFile = this.stats.keysByLanguage[referenceLanguage][file]?.length || 0;
      
      // Calculate total size across all languages for this file
      let totalFileSize = 0;
      let languagesWithFile = [];
      let missingIn = [];
      
      for (const language of this.stats.languages) {
        if (this.stats.filesByLanguage[language].includes(file)) {
          languagesWithFile.push(language.toUpperCase());
          const fileSize = this.stats.fileSizes[language][file]?.size || 0;
          totalFileSize += fileSize;
        } else {
          missingIn.push(language.toUpperCase());
        }
      }
      
      report.push(this.generateTableRow([
        file,
        keysInFile,
        this.formatFileSize(totalFileSize),
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
      
      if (this.stats.emptyFiles.length > 0) {
        report.push(t('summary.emptyFiles'));
        for (const item of this.stats.emptyFiles) {
          report.push(`   ${item.language}/${item.file}`);
        }
        report.push('');
      }
      
      if (this.stats.malformedFiles.length > 0) {
        report.push(t('summary.malformedFiles'));
        for (const item of this.stats.malformedFiles) {
          report.push(`   ${item.language}/${item.file}`);
        }
        report.push('');
      }
      
      // Count total duplicate keys
      const totalDuplicateKeys = this.stats.duplicateKeys.reduce((sum, item) => sum + item.duplicates.length, 0);
      
      if (totalDuplicateKeys > 100) {
        // Auto-generate detailed report for large number of duplicates
        report.push('🔑 Duplicate keys detected - generating detailed report...');
        report.push('   A comprehensive duplicate keys report has been created in i18ntk-reports/');
        report.push('   See the detailed report for complete list of duplicates to fix.');
        report.push('   Note: Only keys with identical full paths are considered duplicates.');
        report.push('');
      } else if (this.stats.duplicateKeys.length > 0) {
        // Show limited display for small number of duplicates
        report.push(t('summary.duplicateKeys'));
        let totalDuplicates = 0;
        for (const item of this.stats.duplicateKeys) {
          const displayKeys = item.duplicates.slice(0, 25);
          const remaining = item.duplicates.length - 25;
          report.push(`   ${item.language}/${item.file}: ${displayKeys.join(', ')}${remaining > 0 ? ` ... (+${remaining} more)` : ''}`);
          totalDuplicates += item.duplicates.length;
        }
        report.push(`   (Total actual duplicate keys: ${totalDuplicates})`);
        report.push('   Note: Keys with same name but different paths (e.g., "hero.title" vs "stats.title") are NOT duplicates');
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
      report.push('Note: Keys with the same name but in different nested structures are not considered duplicates.');
      report.push('');
    }
    // Sizing Analysis
    report.push('Sizing Analysis');
    report.push('='.repeat(30));
    
    const totalTranslationSize = Object.values(this.stats.folderSizes).reduce((sum, size) => sum + size, 0);
    report.push(`Total Translation Size: ${this.formatFileSize(totalTranslationSize)}`);
    
    if (totalTranslationSize > 1024 * 1024) { // > 1MB
      report.push('⚠️  Large translation bundle detected - consider optimization');
    }
    
    if (totalTranslationSize > 5 * 1024 * 1024) { // > 5MB
      report.push('🔴 Very large translation bundle - immediate optimization needed');
    }
    
    // Largest languages
    const sortedLanguages = this.stats.languages
      .map(lang => ({
        language: lang,
        size: this.stats.folderSizes[lang] || 0,
        files: this.stats.filesByLanguage[lang].length,
        keys: Object.values(this.stats.keysByLanguage[lang])
          .reduce((sum, keys) => sum + keys.length, 0)
      }))
      .sort((a, b) => b.size - a.size);
    
    if (sortedLanguages.length > 0) {
      report.push('\nLargest Languages:');
      const sizeTableWidths = [12, 12, 8, 8];
      report.push(this.generateTableRow(['Language', 'Size', 'Files', 'Keys'], sizeTableWidths));
      report.push(this.generateTableSeparator(sizeTableWidths));
      
      sortedLanguages.slice(0, 5).forEach(lang => {
        report.push(this.generateTableRow([
          lang.language.toUpperCase(),
          this.formatFileSize(lang.size),
          lang.files,
          lang.keys
        ], sizeTableWidths));
      });
    }
    
    // File size distribution
    const allFiles = [];
    for (const language of this.stats.languages) {
      for (const file of this.stats.filesByLanguage[language]) {
        const fileSize = this.stats.fileSizes[language][file]?.size || 0;
        allFiles.push({
          language: language,
          file: file,
          size: fileSize,
          keys: this.stats.keysByLanguage[language][file]?.length || 0
        });
      }
    }
    
    const largeFiles = allFiles.filter(f => f.size > 50 * 1024); // > 50KB
    if (largeFiles.length > 0) {
      report.push('\nLarge Files (>50KB):');
      const largeFileWidths = [15, 15, 10, 8];
      report.push(this.generateTableRow(['File', 'Language', 'Size', 'Keys'], largeFileWidths));
      report.push(this.generateTableSeparator(largeFileWidths));
      
      largeFiles.slice(0, 10).forEach(f => {
        report.push(this.generateTableRow([
          f.file,
          f.language.toUpperCase(),
          this.formatFileSize(f.size),
          f.keys
        ], largeFileWidths));
      });
    }
    
    report.push('');
    
    // Recommendations
    report.push(t('summary.recommendations'));
    report.push('='.repeat(30));
    if (this.stats.missingFiles.length > 0) {
      report.push(t('summary.createMissingFiles'));
    }
    if (this.stats.emptyFiles.length > 0) {
      report.push(t('summary.addContentToEmptyFiles'));
    }
    if (this.stats.malformedFiles.length > 0) {
      report.push(t('summary.fixMalformedFiles'));
    }
    if (this.stats.duplicateKeys.length > 0) {
      report.push(t('summary.removeDuplicateKeys'));
    }
    if (this.stats.inconsistentKeys.length > 0) {
      report.push(t('summary.synchronizeKeys'));
    }
    if (this.stats.totalKeys > 10000) {
      report.push(t('summary.splitLargeFiles'));
    }
    if (this.stats.languages.length === 1) {
      report.push(t('summary.addMoreLanguages'));
    }
    
    // Sizing-specific recommendations
    if (totalTranslationSize > 1024 * 1024) {
      report.push('• Consider lazy loading translations for specific languages');
      report.push('• Implement translation splitting for large files');
      report.push('• Use compression for production builds');
    }
    
    report.push('');
    report.push(t('summary.nextSteps'));
    report.push(t('summary.nextStep1'));
    report.push(t('summary.nextStep2'));
    report.push(t('summary.nextStep3'));
    report.push(t('summary.nextStep4'));
    return report.join('\n');
  }

  // Parse command line arguments
  parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};
    
    args.forEach(arg => {
      if (arg.startsWith('--')) {
        const [key, value] = arg.substring(2).split('=');
        if (key === 'source-dir') {
          parsed.sourceDir = value;
        } else if (key === 'source-language') {
          parsed.sourceLanguage = value;
        } else if (key === 'output-file') {
          parsed.outputFile = value;
        } else if (key === 'verbose') {
          parsed.verbose = true;
        } else if (key === 'delete-reports') {
          parsed.deleteReports = true;
        } else if (key === 'keep-reports') {
          parsed.keepReports = true;
        } else if (key === 'no-prompt') {
          parsed.noPrompt = true;
        } else if (key === 'help') {
          parsed.help = true;
        }
      }
    });
    
    return parsed;
  }

  // Run the analysis and generate report
  async run(options = {}) {
    const args = this.parseArgs();
    const { fromMenu = false, noPrompt = false } = options;
    
    // Always use unified configuration to respect settings
    const baseConfig = await getUnifiedConfig('summary', args);
    this.config = { ...this.config, ...baseConfig };
    
    const uiLanguage = this.config.uiLanguage || 'en';
    loadTranslations(uiLanguage, path.resolve(__dirname, '..', 'ui-locales'));
    if (!this.config.sourceDir) {
      this.config.sourceDir = this.detectI18nDirectory();
    }
    
    if (!fromMenu) {
      // Check admin authentication for sensitive operations (only when called directly)
      const AdminAuth = require('../utils/admin-auth');
      const adminAuth = new AdminAuth();
      await adminAuth.initialize();
      
      const isCalledDirectly = require.main === module;
      const isRequired = await adminAuth.isAuthRequired();
      if (isRequired && isCalledDirectly && !noPrompt && !fromMenu && !args.noPrompt) {
        console.log('\n' + t('adminCli.authRequiredForOperation', { operation: 'generate summary' }));
        
        const pin = await askHidden(t('adminCli.enterPin'));
        
        const isValid = await adminAuth.verifyPin(pin);
        
        if (!isValid) {
          console.log(t('adminCli.invalidPin'));
          process.exit(1);
        }
        
        console.log(t('adminCli.authenticationSuccess'));
      }
      
      if (args.help) {
        this.showHelp();
        return;
      }
      
      // Validate source directory exists
      if (!fs.existsSync(this.config.sourceDir)) {
        console.error(t('summary.sourceDirectoryDoesNotExist', { sourceDir: this.config.sourceDir }));
        process.exit(1);
      }
    }
    
    console.log(t('summary.i18nSummaryReportGenerator'));
    console.log(t('summary.separator'));
    console.log(t('summary.sourceDirectory', {dir: this.config.sourceDir}));
    
    if (args.verbose) {
      console.log(t('summary.configurationTitle'));
      console.log(t('summary.sourceLanguage', { sourceLanguage: this.config.sourceLanguage }));
      console.log(t('summary.supportedExtensions', { extensions: this.config.supportedExtensions.join(', ') }));
      console.log(t('summary.excludedFiles', { files: this.config.excludeFiles.join(', ') }));
    }
    
    try {
      // Analyze structure
      await this.analyzeStructure();
      
      // Generate report
      console.log(t('summary.generatingSummaryReport'));
      const report = this.generateReport();
      
      // Always generate detailed report when duplicates exist
      const totalDuplicateKeys = this.stats.duplicateKeys.reduce((sum, item) => sum + item.duplicates.length, 0);
      if (totalDuplicateKeys > 0) {
        console.log('📋 Generating detailed duplicate keys report...');
        const detailedReport = this.generateDetailedReport();
        
        // Create output directory if it doesn't exist
        const outputDir = path.resolve(process.cwd(), 'i18ntk-reports');
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const detailedReportName = totalDuplicateKeys > 100 
          ? `duplicate-keys-detailed-${new Date().toISOString().slice(0,10)}.txt`
          : `duplicate-keys-summary-${new Date().toISOString().slice(0,10)}.txt`;
        const detailedReportPath = path.join(outputDir, detailedReportName);
        
        const detailedSuccess = await SecurityUtils.safeWriteFile(detailedReportPath, detailedReport, outputDir);
        if (detailedSuccess) {
          if (totalDuplicateKeys > 100) {
            console.log(`✅ Detailed duplicate keys report saved: ${detailedReportPath}`);
          } else {
            console.log(`✅ Duplicate keys summary saved: ${detailedReportPath}`);
          }
        } else {
          console.log(`⚠️  Could not save detailed report: ${detailedReportPath}`);
        }
      }
      
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
          console.log(t('summary.reportSaved', { reportPath: outputPath }));
        } else {
          console.log(t('summary.reportSaveFailed', { reportPath: outputPath }));
        }
      } else {
        console.log(t('summary.reportContent', { report }));
      }
      
      // Handle report file management
      if (args.deleteReports && !args.keepReports) {
        console.log(t('summary.cleaningUpReportFiles'));
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
                console.log(t('summary.couldNotDelete', { file, error: error.message }));
              }
            }
            
            if (deletedCount > 0) {
              console.log(t('summary.deletedOldReportFiles', { count: deletedCount }));
            } else {
              console.log(t('summary.noOldReportFilesToDelete'));
            }
          }
        } catch (error) {
          console.log(t('summary.errorCleaningUpReports', { error: error.message }));
        }
      } else if (args.keepReports) {
        console.log(t('summary.reportFilesPreserved'));
      }
      
      // Summary
      console.log(t('summary.separator'));
      console.log(t('summary.analysisComplete'));
      console.log(t('summary.separator'));
      console.log(t('summary.analyzedLanguages', { count: this.stats.languages.length }));
      console.log(t('summary.processedFiles', { count: this.stats.totalFiles }));
      console.log(t('summary.foundTranslationKeys', { count: this.stats.totalKeys }));
      
      const totalIssues = this.stats.missingFiles.length + 
                         this.stats.emptyFiles.length + 
                         this.stats.malformedFiles.length + 
                         this.stats.duplicateKeys.length + 
                         this.stats.inconsistentKeys.length;
      
      if (totalIssues > 0) {
        console.log(t('summary.foundIssues', {count: totalIssues}));
      } else {
        console.log(t('summary.noIssuesConsole'));
      }
      
    } catch (error) {
      console.error(t('summary.errorDuringAnalysis', { error: error.message }));
      if (args.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  async function main() {
    const reporter = new I18nSummaryReporter();
    await reporter.initialize();
    await reporter.run();
  }
  main().catch(error => {
    console.error('Error in i18ntk-summary:', error.message);
    process.exit(1);
  });
}

module.exports = I18nSummaryReporter;