#!/usr/bin/env node
/**
 * I18NTK TRANSLATION COMPLETION SCRIPT
 * 
 * This script automatically adds missing translation keys to achieve 100% coverage.
 * It reads the usage analysis and adds all missing keys with proper markers.
 * 
 * Usage:
 *   node i18ntk-complete.js
 *   node i18ntk-complete.js --auto-translate
 *   node i18ntk-complete.js --source-dir=./src/i18n/locales
 */


const path = require('path');
const fs = require('fs');
const SecurityUtils = require('../utils/security');
const { loadTranslations, t } = require('../utils/i18n-helper');
const { getGlobalReadline, closeGlobalReadline } = require('../utils/cli');
const SetupEnforcer = require('../utils/setup-enforcer');
const { getUnifiedConfig, displayHelp } = require('../utils/config-helper');
const { isInteractive } = require('../utils/prompt-helper');

// Ensure setup is complete before running, except for help output.
(async () => {
  const isHelpRequest = process.argv.slice(2).some(arg => arg === '--help' || arg === '-h');
  if (isHelpRequest) {
    return;
  }
  try {
    await SetupEnforcer.checkSetupCompleteAsync();
  } catch (error) {
    console.error('Setup check failed:', error.message);
    process.exit(1);
  }
})();

loadTranslations();



class I18nCompletionTool {
  constructor(config = {}) {
    this.config = config;
    this.sourceDir = null;
    this.sourceLanguageDir = null;
    this.rl = null;
    
    // Initialize UI i18n for console messages
    const UIi18n = require('./i18ntk-ui');
    // Using shared t() helper from i18n-helper instead of UIi18n for translations
    // Using shared t() helper from i18n-helper
  }
  
  async initialize() {
    try {
      const args = this.parseArgs();
      if (args.help) {
        displayHelp('i18ntk-complete', {
          'auto-translate': 'Enable automatic translation suggestions',
          'dry-run': 'Preview changes without applying them'
        });
        process.exit(0);
      }
      
      const baseConfig = await getUnifiedConfig('complete', args);
      this.config = { ...baseConfig, ...(this.config || {}) };
      this.sourceDir = this.config.localesDir || this.config.i18nDir || this.config.sourceDir;
      this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
      
      // Validate source directory exists
      const { validateSourceDir } = require('../utils/config-helper');
      validateSourceDir(this.sourceDir, 'i18ntk-complete');
      
      SecurityUtils.logSecurityEvent(t('complete.configLoadedSuccessfully'), 'info');
    } catch (error) {
      SecurityUtils.logSecurityEvent(t('complete.configLoadingFailed'), 'error', { error: error.message });
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

  // Parse command line arguments
  parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith('--')) {
        const [key, rawValue] = arg.substring(2).split('=');
        const value = rawValue !== undefined
          ? rawValue
          : (args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true);
        if (key === 'source-dir' || key === 'locales-dir' || key === 'i18n-dir') {
          parsed.sourceDir = value;
          parsed.i18nDir = value;
      } else if (key === 'source-language' || key === 'source-locale') {
        parsed.sourceLanguage = value;
      } else if (key === 'code-dir' || key === 'source-code-dir') {
        parsed.codeDir = value;
      } else if (key === 'auto-translate') {
          parsed.autoTranslate = true;
        } else if (key === 'dry-run') {
          parsed.dryRun = true;
        } else if (key === 'no-prompt') {
          parsed.noPrompt = true;
        } else if (key === 'help' || key === 'h') {
          parsed.help = true;
        }
      }
    }
    
    return parsed;
  }

  // Get all available languages
  getAvailableLanguages() {
    if (!SecurityUtils.safeExistsSync(this.sourceDir, this.config.projectRoot)) {
      throw new Error(`Source directory not found: ${this.sourceDir}`);
    }
    
    // Check for monolith JSON files (en.json, es.json, etc.)
    const files = SecurityUtils.safeReaddirSync(this.sourceDir, this.config.projectRoot);
    const languagesFromFiles = files
      .filter(file => file.endsWith('.json'))
      .map(file => path.basename(file, '.json'))
      .filter(code => this.isValidLanguageCode(code));
    
    // Also check for directory-based structure for backward compatibility
    const directories = SecurityUtils.safeReaddirSync(this.sourceDir, this.config.projectRoot)
      .filter(item => {
        if (this.isExcludedLanguageDirectory(item)) return false;
        if (!this.isValidLanguageCode(item)) return false;
        const itemPath = path.join(this.sourceDir, item);
        const stat = SecurityUtils.safeStatSync(itemPath, this.config.projectRoot);
        if (!stat || !stat.isDirectory()) return false;

        const localeFiles = SecurityUtils.safeReaddirSync(itemPath, this.config.projectRoot)
          .filter(name => name.endsWith('.json'));
        return localeFiles.length > 0;
      });
    
    return [...new Set([...languagesFromFiles, ...directories])];
  }

  isValidLanguageCode(code) {
    if (!code || typeof code !== 'string') return false;
    return /^[a-z]{2}(?:-[A-Za-z0-9]{2,8})*$/i.test(code.trim());
  }

  isExcludedLanguageDirectory(name) {
    if (!name || typeof name !== 'string') return true;
    const lowered = name.toLowerCase();
    return lowered.startsWith('backup-') || lowered === 'backup' || lowered === 'reports' || lowered === 'i18ntk-reports';
  }

  // Get all JSON files from a language directory
  getLanguageFiles(language) {
    const monolithFile = path.join(this.sourceDir, `${language}.json`);
    if (SecurityUtils.safeExistsSync(monolithFile, this.config.projectRoot)) {
      return [`${language}.json`];
    }

    const languageDir = path.join(this.sourceDir, language);
    
    if (!SecurityUtils.safeExistsSync(languageDir, this.config.projectRoot)) {
      return [];
    }
    
    return SecurityUtils.safeReaddirSync(languageDir, this.config.projectRoot)
      .filter(file => {
        return file.endsWith('.json') && 
               !this.config.excludeFiles.includes(file);
      });
  }

  getLanguageFilePath(language, fileName) {
    if (fileName === `${language}.json`) {
      return path.join(this.sourceDir, fileName);
    }

    return path.join(this.sourceDir, language, fileName);
  }

  usesMonolithFile(language) {
    return SecurityUtils.safeExistsSync(path.join(this.sourceDir, `${language}.json`), this.config.projectRoot);
  }

  // Parse key path and determine which file it belongs to
  parseKeyPath(keyPath) {
    // Handle namespace:key format (e.g., "reportGenerator:reportTypes.prospects")
    if (keyPath.includes(':')) {
      const [namespace, key] = keyPath.split(':', 2);
      return {
        file: `${namespace}.json`,
        key: key
      };
    }
    
    // Handle dot notation (e.g., "pagination.showing")
    const keyPathStr = String(keyPath || '');
    const parts = keyPathStr.split('.');
    if (parts.length > 1) {
      return {
        file: `${parts[0]}.json`,
        key: parts.slice(1).join('.')
      };
    }
    
    // Default to common.json for simple keys
    return {
      file: 'common.json',
      key: keyPath
    };
  }

  // Check if nested key exists in object
  hasNestedKey(obj, keyPath) {
    const keyPathStr = String(keyPath || '');
    const keys = keyPathStr.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (!current || typeof current !== 'object' || !(key in current)) {
        return false;
      }
      current = current[key];
    }
    
    return true;
  }

  // Set nested value in object
  setNestedValue(obj, keyPath, value) {
    const keyPathStr = String(keyPath || '');
    const keys = keyPathStr.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  // Add missing keys to a language
  addMissingKeysToLanguage(language, missingKeys, dryRun = false) {
    const languageDir = path.join(this.sourceDir, language);
    const changes = [];
    const usesMonolith = this.usesMonolithFile(language);
    
    // Group keys by file
    const keysByFile = {};
    
    missingKeys.forEach(keyPath => {
      const { file, key } = usesMonolith
        ? { file: `${language}.json`, key: keyPath }
        : this.parseKeyPath(keyPath);
      if (!keysByFile[file]) {
        keysByFile[file] = [];
      }
      keysByFile[file].push({ keyPath, key });
    });
    
    // Process each file
    for (const [fileName, keys] of Object.entries(keysByFile)) {
      const filePath = usesMonolith
        ? path.join(this.sourceDir, fileName)
        : path.join(languageDir, fileName);
      let fileContent = {};
      
      // Load existing file or create new
      if (SecurityUtils.safeExistsSync(filePath, this.config.projectRoot)) {
        try {
          fileContent = JSON.parse(SecurityUtils.safeReadFileSync(filePath, this.config.projectRoot, 'utf8'));
        } catch (error) {
          console.warn(t("completeTranslations.warning_could_not_parse_filepa", { filePath })); ;
          fileContent = {};
        }
      } else {
        // Create directory if it doesn't exist
        if (!usesMonolith && !SecurityUtils.safeExistsSync(languageDir, this.config.projectRoot)) {
          if (!dryRun) {
            SecurityUtils.safeMkdirSync(languageDir, this.config.projectRoot, { recursive: true });
          }
        }
      }
      
      // Add missing keys
      let fileChanged = false;
      // Detect namespace wrapper: if file is "auth.json" and content has an "auth" top-level key,
      // keys should be inserted inside that wrapper, not at root.
      const fileNamespace = path.basename(fileName, '.json');
      const hasWrapper = fileContent && typeof fileContent === 'object' && !Array.isArray(fileContent)
        && fileNamespace in fileContent && typeof fileContent[fileNamespace] === 'object';

      keys.forEach(({ keyPath, key }) => {
        // Resolve the correct insertion path: if the file has a namespace wrapper matching
        // the filename, prepend it so keys go inside the wrapper (e.g. "auth.panel.sign_in"
        // instead of "panel.sign_in").
        const effectiveKey = hasWrapper && !key.startsWith(fileNamespace + '.')
          ? `${fileNamespace}.${key}`
          : key;

        // Check if key already exists at the effective path
        if (!this.hasNestedKey(fileContent, effectiveKey)) {
          const value = this.generateTranslationValue(keyPath, language);

          this.setNestedValue(fileContent, effectiveKey, value);
          fileChanged = true;

          changes.push({
            file: fileName,
            key: keyPath,
            value,
            status: 'source-copy-marker',
            action: 'added'
          });
        }
      });
      
      // Save file
      if (fileChanged && !dryRun) {
        SecurityUtils.safeWriteFileSync(filePath, JSON.stringify(fileContent, null, 2), this.config.projectRoot, 'utf8');
      }
    }
    
    return changes;
  }

  // Generate appropriate translation value based on key and language
  generateTranslationValue(keyPath, language) {
    const sourceValue = this.getSourceValueForKeyPath(keyPath);
    const baseValue = typeof sourceValue === 'string' && sourceValue.trim() !== ''
      ? sourceValue
      : this.generateValueFromKey(keyPath);
    
    // For source language, use the generated value
    if (language === this.config.sourceLanguage) {
      return baseValue;
    }
    
    return `[${language.toUpperCase()}] ${baseValue}`;
  }

  getNestedValue(obj, keyPath) {
    const keys = String(keyPath || '').split('.');
    let current = obj;

    for (const key of keys) {
      if (!current || typeof current !== 'object' || !(key in current)) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  getSourceValueForKeyPath(keyPath) {
    if (!this.sourceLanguageDir && !this.usesMonolithFile(this.config.sourceLanguage)) {
      return undefined;
    }

    const sourceFiles = this.getLanguageFiles(this.config.sourceLanguage);
    const keyPathStr = String(keyPath || '');
    const parsed = this.parseKeyPath(keyPathStr);

    for (const fileName of sourceFiles) {
      const sourceFilePath = this.getLanguageFilePath(this.config.sourceLanguage, fileName);
      try {
        const sourceContent = SecurityUtils.safeParseJSON(SecurityUtils.safeReadFileSync(sourceFilePath, this.config.projectRoot, 'utf8'));
        if (!sourceContent || typeof sourceContent !== 'object') continue;

        const candidates = [keyPathStr];
        if (fileName === parsed.file) {
          candidates.push(parsed.key);
        }

        for (const candidate of candidates) {
          const value = this.getNestedValue(sourceContent, candidate);
          if (value !== undefined) return value;
        }
      } catch (error) {
        console.warn(t("complete.couldNotParseSource", { file: sourceFilePath }));
      }
    }

    return undefined;
  }

  // Generate a readable value from a key path
  generateValueFromKey(keyPath) {
    // Extract the last part of the key (after dots and colons)
    const keyPathStr = String(keyPath || '');
    const keyName = keyPathStr.split('.').pop().split(':').pop();
    
    // Convert camelCase to readable text
    const readable = keyName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
    
    // Never return the namespace prefix as the value
    return readable || keyName;
  }

  // Get all keys from a nested object with full paths
  getAllKeys(obj, prefix = '') {
    const keys = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys.push(...this.getAllKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    
    return keys;
  }

  // Get missing keys by comparing source language with target languages
  getMissingKeysFromComparison() {
    const sourceFiles = this.getLanguageFiles(this.config.sourceLanguage);
    const missingKeys = [];
    
    if (sourceFiles.length === 0) {
      console.log(t("complete.sourceLanguageNotFound", { sourceLanguage: this.config.sourceLanguage }));
      return [];
    }
    
    // Process each file in source language
    for (const fileName of sourceFiles) {
      const sourceFilePath = this.getLanguageFilePath(this.config.sourceLanguage, fileName);
      
      try {
        const sourceContent = SecurityUtils.safeParseJSON(SecurityUtils.safeReadFileSync(sourceFilePath, this.config.projectRoot, 'utf8'));
        const sourceKeys = this.getAllKeys(sourceContent);
        
        // Check all other languages
        const languages = this.getAvailableLanguages();
        for (const language of languages) {
          if (language === this.config.sourceLanguage) continue;
          
          const targetFilePath = fileName === `${this.config.sourceLanguage}.json` || this.usesMonolithFile(language)
            ? path.join(this.sourceDir, `${language}.json`)
            : path.join(this.sourceDir, language, fileName);
          let targetKeys = [];
          
          if (SecurityUtils.safeExistsSync(targetFilePath, this.config.projectRoot)) {
            try {
              const targetContent = SecurityUtils.safeParseJSON(SecurityUtils.safeReadFileSync(targetFilePath, this.config.projectRoot, 'utf8'));
              targetKeys = this.getAllKeys(targetContent);
            } catch (error) {
              console.warn(t("complete.couldNotParseTarget", { file: targetFilePath }));
            }
          }
          
          // Find keys missing in target language
          const missingInTarget = sourceKeys.filter(key => !targetKeys.includes(key));
          missingKeys.push(...missingInTarget);
        }
      } catch (error) {
        console.warn(t("complete.couldNotParseSource", { file: sourceFilePath }));
      }
    }
    
    // Remove duplicates
    const uniqueMissingKeys = [...new Set(missingKeys)];
    console.log(t("complete.foundMissingKeys", { count: uniqueMissingKeys.length }));
    return uniqueMissingKeys;
  }

  // Generate completion report
  async generateReport(changes, languages) {
    const projectRoot = this.config.projectRoot || process.cwd();
    const reportsDir = path.join(projectRoot, 'i18ntk-reports');
    if (!SecurityUtils.safeExistsSync(reportsDir, projectRoot)) {
      SecurityUtils.safeMkdirSync(reportsDir, projectRoot, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportsDir, `completion-report-${timestamp}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      sourceLanguage: this.config.sourceLanguage,
      sourceDir: this.sourceDir,
      languagesProcessed: languages.length,
      totalChanges: changes.reduce((sum, lang) => sum + lang.changes.length, 0),
      languages: changes.map(lang => ({
        language: lang.language,
        changes: lang.changes.length,
        files: lang.changes.reduce((acc, change) => {
          if (!acc[change.file]) acc[change.file] = [];
          acc[change.file].push({
            key: change.key,
            value: change.value,
            action: change.action
          });
          return acc;
        }, {})
      }))
    };
    
    SecurityUtils.safeWriteFileSync(reportPath, JSON.stringify(report, null, 2), projectRoot, 'utf8');
    console.log(t("complete.reportGenerated", { path: reportPath }));
    return reportPath;
  }

  // Run the completion process
  async run(options = {}) {
    const { fromMenu = false } = options;
    
    SecurityUtils.logSecurityEvent('I18n completion tool started', 'info', { 
      version: this.config.version,
      nodeVersion: process.version,
      platform: process.platform
    });
    
    const args = this.parseArgs();
    
    // Skip admin authentication when called from menu
    if (!fromMenu) {
      // Check admin authentication for sensitive operations (only when called directly and not in no-prompt mode)
      const AdminAuth = require('../utils/admin-auth');
      const adminAuth = new AdminAuth();
      await adminAuth.initialize();
      
      const isCalledDirectly = require.main === module;
      const isRequired = await adminAuth.isAuthRequired();
      if (isRequired && isCalledDirectly && !args.noPrompt) {
        console.log('\n' + t('adminCli.authRequiredForOperation', { operation: 'complete translations' }));
        
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
    
    // Initialize configuration properly when called from menu
    if (fromMenu && !this.sourceDir) {
      const baseConfig = await getUnifiedConfig('complete', args);
      this.config = { ...baseConfig, ...(this.config || {}) };
      
      const uiLanguage = (this.config && this.config.uiLanguage) || 'en';
      loadTranslations(uiLanguage, path.resolve(__dirname, '..', 'ui-locales'));
      this.sourceDir = this.config.localesDir || this.config.i18nDir || this.config.sourceDir;
      this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
    } else {
      await this.initialize();
      
      const localesDirArg = args.i18nDir || args.sourceDir;
      if (localesDirArg) {
        const resolvedSourceDir = path.resolve(localesDirArg);
        const validatedSourceDir = SecurityUtils.validatePath(resolvedSourceDir, process.cwd());
        if (!validatedSourceDir) {
          console.error(t("complete.invalidSourceDir", { sourceDir: localesDirArg }));
          console.error(`Path validation failed — source directory is outside the allowed project boundary.`);
          process.exit(1);
        }
        this.config.sourceDir = resolvedSourceDir;
        this.config.i18nDir = resolvedSourceDir;
        this.sourceDir = validatedSourceDir;
      }
      
      if (args.sourceLanguage) {
        this.config.sourceLanguage = SecurityUtils.sanitizeInput(args.sourceLanguage, { 
          allowedChars: /^[a-zA-Z0-9\-_]+$/, 
          maxLength: 10,
          removeHTML: true 
        });
      }
      
      this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
    }
    
    console.log(t("complete.title"));
    console.log(t("complete.separator"));
    console.log(t("complete.sourceDir", { sourceDir: this.sourceDir }));
    console.log(t("complete.sourceLanguage", { sourceLanguage: this.config.sourceLanguage }));
    
    if (args.dryRun) {
      console.log(t("complete.dryRunMode"));
    }
    
    try {
      // Get available languages
      const languages = this.getAvailableLanguages();
      console.log(t("complete.languages", { languages: languages.join(', ') }));
      
      // Get missing keys by comparing source language with others
      const missingKeys = this.getMissingKeysFromComparison();
      console.log(t("complete.addingMissingKeys"));
      
      let totalChanges = 0;
      
      // Process all languages except source language
      const targetLanguages = languages.filter(lang => lang !== this.config.sourceLanguage);
      const allChanges = [];
      for (const language of targetLanguages) {
        console.log(t("complete.processing", { language }));
        
        const changes = this.addMissingKeysToLanguage(language, missingKeys, args.dryRun);
        
        if (changes.length > 0) {
          console.log(t("complete.addedKeys", { count: changes.length }));
          totalChanges += changes.length;
          allChanges.push({ language, changes });
          
          // Show sample of changes
          const sampleChanges = changes.slice(0, 3);
          sampleChanges.forEach(change => {
            console.log(t("usage.complete.changeDetails", { file: change.file, key: change.key }));
          });
          
          if (changes.length > 3) {
            console.log(t("usage.complete.andMore", { count: changes.length - 3 }));
          }
        } else {
          console.log(t("usage.complete.noChangesNeeded", { language }));
        }
      }
      
      console.log('\n');
      console.log(t("complete.summaryTitle"));
      console.log(t("complete.separator"));
      const targetLocalesChanged = allChanges.length;
      const filesModified = new Set(allChanges.flatMap(lang => lang.changes.map(change => `${lang.language}/${change.file}`))).size;
      const filesSkipped = Math.max(0, targetLanguages.length - targetLocalesChanged);
      console.log(`Locales scanned: ${languages.length}`);
      console.log(`Target locales changed: ${targetLocalesChanged}`);
      console.log(`Unique source keys added: ${missingKeys.length}`);
      console.log(`Total key insertions: ${totalChanges}`);
      console.log(`Translation status: ${totalChanges > 0 ? 'key presence added; source-copy markers require translation review' : 'no missing keys'}`);
      console.log(`Files modified: ${args.dryRun ? 0 : filesModified}`);
      console.log(`Files skipped: ${filesSkipped}`);
      if (args.dryRun) {
        console.log('Dry run only. No files were modified.');
      }
      
      if (!args.dryRun && allChanges.length > 0 && isInteractive(args)) {
        const rl = this.rl || this.initReadline();
        const answer = await this.prompt('\n' + t('complete.generateReportPrompt') + ' (Y/N): ');
        
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          await this.generateReport(allChanges, languages);
        }
      }
      
      if (!args.dryRun) {
        console.log('\n' + t("complete.nextStepsTitle"));
        console.log(t("complete.separator"));
        console.log('1. Run usage analysis:');
        console.log('   i18ntk --command=usage');
        console.log('2. Validate translations:');
        console.log('   i18ntk --command=validate');
        console.log('3. Analyze translation status:');
        console.log('   i18ntk --command=analyze');
        console.log('\n' + t("complete.allKeysAvailable"));
      } else {
        console.log('\n' + t("complete.runWithoutDryRun"));
      }
      
      // Only prompt when run from the menu (i.e., when a callback or menu context is present)
      if (typeof this.prompt === "function" && args.fromMenu) {
        console.log(t('common.completed'));
        await this.prompt(t('pressEnterToContinue'));
      }
      
    } catch (error) {
      console.error(t('complete.errorDuringCompletion', { error: error.message }));
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const tool = new I18nCompletionTool();
  tool.run().then(() => {
    const { closeGlobalReadline } = require('../utils/cli');
    closeGlobalReadline();
    process.exit(0);
  }).catch(error => {
    const UIi18n = require('./i18ntk-ui');
    console.error(t('complete.errorDuringCompletion', { error: error.message }));
    SecurityUtils.logSecurityEvent('I18n completion tool failed', 'error', { error: error.message });
    const { closeGlobalReadline } = require('../utils/cli');
    closeGlobalReadline();
    process.exit(1);
  });
}

module.exports = I18nCompletionTool;
