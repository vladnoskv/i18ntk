#!/usr/bin/env node
/**
 * I18N USAGE ANALYSIS SCRIPT
 * 
 * This script analyzes source code to find unused translation keys
 * and missing translations that are referenced in code.
 * 
 * Usage:
 *   node i18ntk-usage.js
 *   node i18ntk-usage.js --source-dir=./src
 *   node i18ntk-usage.js --i18n-dir=./src/i18n/locales
 *   node i18ntk-usage.js --output-report
 */

const fs = require('fs');
const path = require('path');
const { loadTranslations, t } = require('./utils/i18n-helper');
const settingsManager = require('./settings-manager');
const SecurityUtils = require('./utils/security');

// Get configuration from settings manager
async function getConfig() {
  try {
    await SecurityUtils.logSecurityEvent('config_load_attempt', { component: 'i18ntk-usage' });
    const settings = settingsManager.getSettings();
    const config = {
      sourceDir: settings.directories?.sourceDir || './',
      i18nDir: settings.directories?.sourceDir || './locales',
      sourceLanguage: settings.directories?.sourceLanguage || 'en',
      outputDir: settings.directories?.outputDir || './i18n-reports',
      excludeDirs: settings.processing?.excludeDirs || ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
      includeExtensions: settings.processing?.includeExtensions || ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'],
      translationPatterns: settings.processing?.translationPatterns || [
        // Common i18n patterns
        /t\(['"`]([^'"`]+)['"`]\)/g,                    // t('key')
        /t\(['"`]([^'"`]+)['"`],/g,                     // t('key', ...)
        /\$t\(['"`]([^'"`]+)['"`]\)/g,                  // $t('key')
        /i18n\.t\(['"`]([^'"`]+)['"`]\)/g,              // i18n.t('key')
        /translate\(['"`]([^'"`]+)['"`]\)/g,            // translate('key')
        /useTranslation\(['"`]([^'"`]+)['"`]\)/g,       // useTranslation('key')
        /formatMessage\(\{\s*id:\s*['"`]([^'"`]+)['"`]/g, // formatMessage({ id: 'key' })
      ]
    };
    await SecurityUtils.validateConfig(config);
    await SecurityUtils.logSecurityEvent('config_loaded', { component: 'i18ntk-usage' });
    return config;
  } catch (error) {
    await SecurityUtils.logSecurityEvent('config_load_failed', { component: 'i18ntk-usage', error: error.message });
    throw error;
  }
}

class I18nUsageAnalyzer {
  constructor(config = {}) {
    this.config = config;
    this.usedKeys = new Set();
    this.availableKeys = new Set();
    this.fileUsage = new Map();
    this.t = t;
  }

  async initialize() {
    try {
      const baseConfig = await getConfig();
      this.config = { ...baseConfig, ...this.config };
      
      await SecurityUtils.validatePath(this.config.sourceDir);
      await SecurityUtils.validatePath(this.config.i18nDir);
      await SecurityUtils.validatePath(this.config.outputDir);
      
      this.sourceDir = path.resolve(this.config.sourceDir);
      this.i18nDir = path.resolve(this.config.i18nDir);
      this.outputDir = path.resolve(this.config.outputDir);
      this.sourceLanguageDir = path.join(this.i18nDir, this.config.sourceLanguage);
      
      // Initialize i18n
      loadTranslations();
      
      await SecurityUtils.logSecurityEvent('analyzer_initialized', { component: 'i18ntk-usage' });
    } catch (error) {
      await SecurityUtils.logSecurityEvent('analyzer_init_failed', { component: 'i18ntk-usage', error: error.message });
      throw error;
    }
  }

  // Parse command line arguments
  async parseArgs() {
    try {
      const args = process.argv.slice(2);
      const validatedArgs = await SecurityUtils.validateCommandArgs(args);
      const parsed = {};
      
      for (const arg of validatedArgs) {
        if (arg.startsWith('--')) {
          const [key, value] = arg.substring(2).split('=');
          if (key === 'source-dir' && value) {
            const sanitized = await SecurityUtils.sanitizeInput(value);
            await SecurityUtils.validatePath(sanitized);
            parsed.sourceDir = sanitized;
          } else if (key === 'i18n-dir' && value) {
            const sanitized = await SecurityUtils.sanitizeInput(value);
            await SecurityUtils.validatePath(sanitized);
            parsed.i18nDir = sanitized;
          } else if (key === 'output-report') {
            parsed.outputReport = true;
          } else if (key === 'output-dir' && value) {
            const sanitized = await SecurityUtils.sanitizeInput(value);
            await SecurityUtils.validatePath(sanitized);
            parsed.outputDir = sanitized;
          } else if (key === 'help') {
            parsed.help = true;
          }
        }
      }
      
      await SecurityUtils.logSecurityEvent('args_parsed', { component: 'i18ntk-usage', args: parsed });
      return parsed;
    } catch (error) {
      await SecurityUtils.logSecurityEvent('args_parse_failed', { component: 'i18ntk-usage', error: error.message });
      throw error;
    }
  }

  // Show help message
  showHelp() {
    console.log(this.t('checkUsage.help_message'));
  }

  // Get all files recursively from a directory
  async getAllFiles(dir, extensions = this.config.includeExtensions) {
    const files = [];
    
    const traverse = async (currentDir) => {
      try {
        await SecurityUtils.validatePath(currentDir);
        
        if (!fs.existsSync(currentDir)) {
          return;
        }
        
        const items = fs.readdirSync(currentDir);
        
        for (const item of items) {
          const itemPath = path.join(currentDir, item);
          await SecurityUtils.validatePath(itemPath);
          
          const stat = fs.statSync(itemPath);
          
          if (stat.isDirectory()) {
            // Skip excluded directories
            if (!this.config.excludeDirs.includes(item)) {
              await traverse(itemPath);
            }
          } else if (stat.isFile()) {
            // Include files with specified extensions
            const ext = path.extname(item);
            if (extensions.includes(ext)) {
              files.push(itemPath);
            }
          }
        }
      } catch (error) {
        await SecurityUtils.logSecurityEvent('file_traversal_error', { 
          component: 'i18ntk-usage', 
          directory: currentDir, 
          error: error.message 
        });
      }
    };
    
    await traverse(dir);
    return files;
  }

  // Get all translation keys from i18n files
  async getAllTranslationKeys() {
    const keys = new Set();
    
    try {
      await SecurityUtils.validatePath(this.sourceLanguageDir);
      
      if (!fs.existsSync(this.sourceLanguageDir)) {
        console.warn(this.t("checkUsage.source_language_directory_not_", { sourceLanguageDir: this.sourceLanguageDir }));
        return keys;
      }
      
      const jsonFiles = fs.readdirSync(this.sourceLanguageDir)
        .filter(file => file.endsWith('.json'));
      
      for (const fileName of jsonFiles) {
        const filePath = path.join(this.sourceLanguageDir, fileName);
        
        try {
          await SecurityUtils.validatePath(filePath);
          const content = await SecurityUtils.safeReadFile(filePath);
          const jsonData = await SecurityUtils.safeParseJSON(content);
          const namespace = fileName.replace('.json', '');
          const fileKeys = this.extractKeysFromObject(jsonData, '', namespace);
          fileKeys.forEach(key => keys.add(key));
        } catch (error) {
          console.warn(this.t("checkUsage.failed_to_parse_filename_error", { fileName, errorMessage: error.message }));
          await SecurityUtils.logSecurityEvent('translation_file_parse_error', {
            component: 'i18ntk-usage',
            file: fileName,
            error: error.message
          });
        }
      }
    } catch (error) {
      await SecurityUtils.logSecurityEvent('translation_keys_load_error', {
        component: 'i18ntk-usage',
        error: error.message
      });
    }
    
    return keys;
  }

  // Extract keys recursively from translation object
  extractKeysFromObject(obj, prefix = '', namespace = '') {
    const keys = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        keys.push(...this.extractKeysFromObject(value, fullKey, namespace));
      } else {
        // Add dot notation key (e.g., "pagination.showing")
        keys.push(fullKey);
        
        // If we have a namespace, also add the namespace:key format
        if (namespace) {
          keys.push(`${namespace}:${fullKey}`);
        }
      }
    }
    
    return keys;
  }

  // Extract translation keys from source code
  async extractKeysFromFile(filePath) {
    const keys = new Set();
    
    try {
      await SecurityUtils.validatePath(filePath);
      const content = await SecurityUtils.safeReadFile(filePath);
      
      // Apply all translation patterns
      for (const pattern of this.config.translationPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const key = match[1];
          if (key && key.trim()) {
            keys.add(key.trim());
          }
        }
      }
      
      // Additional patterns for dynamic keys (basic detection)
      // Look for template literals and concatenated strings
      const dynamicPatterns = [
        /t\(`([^`]*\$\{[^}]+\}[^`]*)`\)/g,  // t(`prefix.${variable}.suffix`)
        /t\(['"]([^'"]*)['"]\s*\+/g,        // t('prefix' + variable)
      ];
      
      for (const pattern of dynamicPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const key = match[1];
          if (key && key.trim()) {
            keys.add(`${key.trim()}*`); // Mark as dynamic with asterisk
          }
        }
      }
    } catch (error) {
      console.warn(this.t("checkUsage.failed_to_read_filepath_errorm", { filePath, errorMessage: error.message }));
      await SecurityUtils.logSecurityEvent('source_file_read_error', {
        component: 'i18ntk-usage',
        file: filePath,
        error: error.message
      });
    }
    
    return keys;
  }

  // Analyze usage in source files
  analyzeUsage() {
    console.log(this.t('checkUsage.scanningSourceFiles'));
    
    const sourceFiles = this.getAllFiles(this.sourceDir);
    console.log(this.t("checkUsage.found_sourcefileslength_source", { sourceFilesLength: sourceFiles.length }));
    
    let totalKeysFound = 0;
    
    for (const filePath of sourceFiles) {
      const keys = this.extractKeysFromFile(filePath);
      
      if (keys.size > 0) {
        const relativePath = path.relative(this.sourceDir, filePath);
        this.fileUsage.set(relativePath, Array.from(keys));
        
        keys.forEach(key => {
          this.usedKeys.add(key);
          totalKeysFound++;
        });
      }
    }
    
    console.log(this.t("checkUsage.found_thisusedkeyssize_unique_", { usedKeysSize: this.usedKeys.size }));
    console.log(this.t("checkUsage.total_key_usages_totalkeysfoun", { totalKeysFound }));
  }

  // Load available translation keys
  loadAvailableKeys() {
    console.log(this.t("checkUsage.loading_available_translation_"));
    
    this.availableKeys = this.getAllTranslationKeys();
    console.log(this.t("checkUsage.found_thisavailablekeyssize_av", { availableKeysSize: this.availableKeys.size }));
  }

  // Find unused keys
  findUnusedKeys() {
    const unused = [];
    
    for (const key of this.availableKeys) {
      let isUsed = false;
      
      // Check exact match
      if (this.usedKeys.has(key)) {
        isUsed = true;
      } else {
        // Check if any dynamic key could match this
        for (const usedKey of this.usedKeys) {
          if (usedKey.endsWith('*')) {
            const prefix = usedKey.slice(0, -1);
            if (key.startsWith(prefix)) {
              isUsed = true;
              break;
            }
          }
        }
      }
      
      if (!isUsed) {
        unused.push(key);
      }
    }
    
    return unused;
  }

  // Find missing keys (used but not available)
  findMissingKeys() {
    const missing = [];
    
    for (const key of this.usedKeys) {
      // Skip dynamic keys for missing check
      if (key.endsWith('*')) {
        continue;
      }
      
      if (!this.availableKeys.has(key)) {
        missing.push(key);
      }
    }
    
    return missing;
  }

  // Find files that use specific keys
  findKeyUsage(searchKey) {
    const usage = [];
    
    for (const [filePath, keys] of this.fileUsage) {
      const matchingKeys = keys.filter(key => {
        if (key.endsWith('*')) {
          const prefix = key.slice(0, -1);
          return searchKey.startsWith(prefix);
        }
        return key === searchKey;
      });
      
      if (matchingKeys.length > 0) {
        usage.push({ filePath, keys: matchingKeys });
      }
    }
    
    return usage;
  }

  // Generate usage report
  generateUsageReport() {
    const unusedKeys = this.findUnusedKeys();
    const missingKeys = this.findMissingKeys();
    const dynamicKeys = Array.from(this.usedKeys).filter(key => key.endsWith('*'));
    
    const timestamp = new Date().toISOString();
    
    let report = `I18N USAGE ANALYSIS REPORT\n`;
    report += `Generated: ${timestamp}\n`;
    report += `Source directory: ${this.sourceDir}\n`;
    report += `I18n directory: ${this.i18nDir}\n\n`;
    
    // Summary
    report += `SUMMARY\n`;
    report += `${'='.repeat(50)}\n`;
    report += `📄 Source files scanned: ${this.fileUsage.size}\n`;
    report += `🔤 Available translation keys: ${this.availableKeys.size}\n`;
    report += `🎯 Used translation keys: ${this.usedKeys.size - dynamicKeys.length}\n`;
    report += `🔄 Dynamic keys detected: ${dynamicKeys.length}\n`;
    report += `❌ Unused keys: ${unusedKeys.length}\n`;
    report += `⚠️  Missing keys: ${missingKeys.length}\n\n`;
    
    // Unused keys
    if (unusedKeys.length > 0) {
      report += `UNUSED TRANSLATION KEYS\n`;
      report += `${'='.repeat(50)}\n`;
      report += `These keys exist in translation files but are not used in source code:\n\n`;
      
      unusedKeys.slice(0, 100).forEach(key => {
        report += `❌ ${key}\n`;
      });
      
      if (unusedKeys.length > 100) {
        report += `... and ${unusedKeys.length - 100} more unused keys\n`;
      }
      
      report += `\n`;
    }
    
    // Missing keys
    if (missingKeys.length > 0) {
      report += `MISSING TRANSLATION KEYS\n`;
      report += `${'='.repeat(50)}\n`;
      report += `These keys are used in source code but missing from translation files:\n\n`;
      
      missingKeys.forEach(key => {
        report += `⚠️  ${key}\n`;
        
        // Show where it's used
        const usage = this.findKeyUsage(key);
        usage.slice(0, 3).forEach(({ filePath }) => {
          report += `   📄 Used in: ${filePath}\n`;
        });
        
        if (usage.length > 3) {
          report += `   ... and ${usage.length - 3} more files\n`;
        }
        
        report += `\n`;
      });
    }
    
    // Dynamic keys
    if (dynamicKeys.length > 0) {
      report += `DYNAMIC TRANSLATION KEYS\n`;
      report += `${'='.repeat(50)}\n`;
      report += `These keys use dynamic patterns and need manual verification:\n\n`;
      
      dynamicKeys.forEach(key => {
        report += `🔄 ${key}\n`;
        
        // Show where it's used
        const usage = this.findKeyUsage(key);
        usage.slice(0, 2).forEach(({ filePath }) => {
          report += `   📄 Used in: ${filePath}\n`;
        });
        
        report += `\n`;
      });
    }
    
    // File usage breakdown
    report += `FILE USAGE BREAKDOWN\n`;
    report += `${'='.repeat(50)}\n`;
    
    const sortedFiles = Array.from(this.fileUsage.entries())
      .sort(([,a], [,b]) => b.length - a.length)
      .slice(0, 20);
    
    sortedFiles.forEach(([filePath, keys]) => {
      report += `📄 ${filePath} (${keys.length} keys)\n`;
    });
    
    if (this.fileUsage.size > 20) {
      report += `... and ${this.fileUsage.size - 20} more files\n`;
    }
    
    return report;
  }

  // Save report to file
  async saveReport(report) {
    try {
      await SecurityUtils.validatePath(this.outputDir);
      
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
      }
      
      const reportPath = path.join(this.outputDir, 'usage-analysis.txt');
      await SecurityUtils.validatePath(reportPath);
      await SecurityUtils.safeWriteFile(reportPath, report);
      
      await SecurityUtils.logSecurityEvent('report_saved', {
        component: 'i18ntk-usage',
        reportPath
      });
      
      return reportPath;
    } catch (error) {
      await SecurityUtils.logSecurityEvent('report_save_error', {
        component: 'i18ntk-usage',
        error: error.message
      });
      throw error;
    }
  }

  // Main analysis process
  async analyze() {
    try {
      await SecurityUtils.logSecurityEvent('analysis_started', { component: 'i18ntk-usage' });
      
      console.log(this.t('checkUsage.title'));
      console.log(this.t("checkUsage.message"));
      
      // Initialize if not already done
      if (!this.sourceDir) {
        await this.initialize();
      }
      
      // Parse command line arguments
      const args = await this.parseArgs();
      
      // Show help if requested
      if (args.help) {
        this.showHelp();
        return { success: true, help: true };
      }
      
      if (args.sourceDir) {
        this.config.sourceDir = args.sourceDir;
        this.sourceDir = path.resolve(this.config.sourceDir);
      }
      if (args.i18nDir) {
        this.config.i18nDir = args.i18nDir;
        this.i18nDir = path.resolve(this.config.i18nDir);
        this.sourceLanguageDir = path.join(this.i18nDir, this.config.sourceLanguage);
      }
      if (args.outputDir) {
        this.config.outputDir = args.outputDir;
        this.outputDir = path.resolve(this.config.outputDir);
      }
      
      console.log(this.t("checkUsage.source_directory_thissourcedir", { sourceDir: this.sourceDir }));
      console.log(this.t("checkUsage.i18n_directory_thisi18ndir", { i18nDir: this.i18nDir }));
      
      // Validate directories
      await SecurityUtils.validatePath(this.sourceDir);
      await SecurityUtils.validatePath(this.i18nDir);
      
      if (!fs.existsSync(this.sourceDir)) {
        throw new Error(`Source directory not found: ${this.sourceDir}`);
      }
      
      if (!fs.existsSync(this.i18nDir)) {
        throw new Error(`I18n directory not found: ${this.i18nDir}`);
      }
      
      // Load available keys
      await this.loadAvailableKeys();
      
      // Analyze usage
      await this.analyzeUsage();
      
      // Generate analysis results
      const unusedKeys = this.findUnusedKeys();
      const missingKeys = this.findMissingKeys();
      const dynamicKeys = Array.from(this.usedKeys).filter(key => key.endsWith('*'));
      
      // Display results
      console.log(this.t("checkUsage.n"));
      console.log(this.t("checkUsage.usage_analysis_results"));
      console.log(this.t("checkUsage.message"));
      
      console.log(this.t("checkUsage.source_files_scanned_thisfileu", { fileUsageSize: this.fileUsage.size }));
      console.log(this.t("checkUsage.available_translation_keys_thi", { availableKeysSize: this.availableKeys.size }));
      console.log(this.t("checkUsage.used_translation_keys_thisused", { usedKeysCount: this.usedKeys.size - dynamicKeys.length }));
      console.log(this.t("checkUsage.dynamic_keys_detected_dynamick", { dynamicKeysLength: dynamicKeys.length }));
      console.log(this.t("checkUsage.unused_keys_unusedkeyslength", { unusedKeysLength: unusedKeys.length }));
      console.log(this.t("checkUsage.missing_keys_missingkeyslength", { missingKeysLength: missingKeys.length }));
      
      // Show some examples
      if (unusedKeys.length > 0) {
        console.log(this.t("checkUsage.n_sample_unused_keys"));
        unusedKeys.slice(0, 5).forEach(key => {
          console.log(this.t("checkUsage.key", { key }));
        });
        if (unusedKeys.length > 5) {
          console.log(this.t("checkUsage.and_unusedkeyslength_5_more", { moreCount: unusedKeys.length - 5 }));
        }
      }
      
      if (missingKeys.length > 0) {
        console.log(this.t("checkUsage.n_sample_missing_keys"));
        missingKeys.slice(0, 5).forEach(key => {
          console.log(this.t("checkUsage.key", { key }));
        });
        if (missingKeys.length > 5) {
          console.log(this.t("checkUsage.and_missingkeyslength_5_more", { moreCount: missingKeys.length - 5 }));
        }
      }
      
      // Generate and save report if requested
      if (args.outputReport) {
        console.log(this.t("checkUsage.n_generating_detailed_report"));
        const report = this.generateUsageReport();
        const reportPath = await this.saveReport(report);
        console.log(this.t("checkUsage.report_saved_reportpath", { reportPath }));
      }
      
      // Recommendations
      console.log(this.t("checkUsage.n_recommendations"));
      console.log(this.t("checkUsage.message"));
      
      if (unusedKeys.length > 0) {
        console.log(this.t("checkUsage.consider_removing_unused_trans"));
      }
      
      if (missingKeys.length > 0) {
        console.log(this.t("checkUsage.add_missing_translation_keys_t"));
      }
      
      if (dynamicKeys.length > 0) {
        console.log(this.t("checkUsage.review_dynamic_keys_manually_t"));
      }
      
      if (unusedKeys.length === 0 && missingKeys.length === 0) {
        console.log(this.t("checkUsage.all_translation_keys_are_prope"));
      }
      
      console.log(this.t("checkUsage.n_next_steps"));
      console.log(this.t("checkUsage.1_review_the_analysis_results"));
      if (args.outputReport) {
        console.log(this.t("checkUsage.2_check_the_detailed_report_fo"));
      } else {
        console.log(this.t("checkUsage.2_run_with_outputreport_for_de"));
      }
      console.log(this.t("checkUsage.3_remove_unused_keys_or_add_mi"));
      console.log(this.t("checkUsage.4_rerun_analysis_to_verify_imp"));
      
      await SecurityUtils.logSecurityEvent('analysis_completed', {
        component: 'i18ntk-usage',
        stats: {
          availableKeys: this.availableKeys.size,
          usedKeys: this.usedKeys.size - dynamicKeys.length,
          dynamicKeys: dynamicKeys.length,
          unusedKeys: unusedKeys.length,
          missingKeys: missingKeys.length,
          filesScanned: this.fileUsage.size
        }
      });
      
      return {
        success: true,
        stats: {
          availableKeys: this.availableKeys.size,
          usedKeys: this.usedKeys.size - dynamicKeys.length,
          dynamicKeys: dynamicKeys.length,
          unusedKeys: unusedKeys.length,
          missingKeys: missingKeys.length,
          filesScanned: this.fileUsage.size
        },
        unusedKeys,
        missingKeys,
        dynamicKeys
      };
      
    } catch (error) {
      console.error(this.t("checkUsage.usage_analysis_failed"));
      console.error(error.message);
      
      await SecurityUtils.logSecurityEvent('analysis_failed', {
        component: 'i18ntk-usage',
        error: error.message
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Run if called directly
if (require.main === module) {
  const analyzer = new I18nUsageAnalyzer();
  analyzer.analyze();
}

module.exports = I18nUsageAnalyzer;