#!/usr/bin/env node
/**
 * I18NTK Translation Key Verification Script
 *
 * Scans all locale files for missing translation keys and provides interactive
 * directory selection for verification and fixing missing keys.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const SecurityUtils = require('../utils/security');
const { loadTranslations } = require('../utils/i18n-helper');
const SetupEnforcer = require('../utils/setup-enforcer');

(async () => {
  try {
    // Ensure setup is complete before running
    await SetupEnforcer.checkSetupCompleteAsync();
  } catch (error) {
    console.error('Setup check failed:', error.message);
    process.exit(1);
  }
})();


// Load translations for UI messages
loadTranslations(process.env.I18NTK_LANG);

class TranslationVerifier {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.missingKeys = new Map();
    this.usedKeys = new Set();
    this.localeFiles = [];
    this.baseKeys = new Set();
  }

  t(key, params = {}) {
    // Fallback translations for the verifier itself
    const translations = {
      verifier: {
        welcome: {
          title: "🌍 I18NTK Translation Key Verifier",
          description: "Scan and verify all translation keys across locale files",
          separator: "=================================================="
        },
        directory: {
          prompt: "📁 Select directory to scan:",
          current: "Current directory",
          locales: "Locales folder",
          custom: "Custom path",
          invalid: "❌ Invalid directory path. Please try again.",
          notFound: "❌ Directory not found:",
          empty: "⚠️  Directory is empty or contains no locale files"
        },
        scanning: {
          start: "🔍 Starting translation key verification...",
          files: "📊 Found {count} locale files",
          keys: "📋 Found {count} unique translation keys",
          progress: "📈 Processing {current}/{total} files...",
          complete: "✅ Scanning complete!"
        },
        results: {
          title: "📊 Translation Key Verification Results",
          missing: "❌ Missing keys found: {count}",
          complete: "✅ All translation keys are complete!",
          summary: "Summary:",
          languages: "Languages scanned: {count}",
          files: "Files processed: {count}",
          keys: "Total keys: {count}"
        },
        fixes: {
          prompt: "🛠️  Apply fixes for missing keys?",
          backup: "💾 Creating backup before applying fixes...",
          applying: "🔄 Applying fixes...",
          complete: "✅ Fixes applied successfully!",
          cancelled: "❌ Fix application cancelled"
        },
        errors: {
          noFiles: "❌ No locale files found to process.",
          readError: "❌ Error reading file: {file}",
          parseError: "❌ Error parsing JSON: {file}",
          cancelled: "❌ Operation cancelled by user"
        },
        options: {
          proceed: "Proceed",
          cancel: "Cancel",
          showDetails: "Show details",
          quit: "Quit"
        }
      }
    };

    let value = translations;
    const keys = key.split('.');
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }

    if (typeof value !== 'string') {
      return key; // Fallback to key
    }

    return value.replace(/\{([^}]+)\}/g, (match, param) => {
      return params[param] !== undefined ? params[param] : match;
    });
  }

  async prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  async selectDirectory() {
    console.log(`\n${this.t('verifier.welcome.title')}`);
    console.log(this.t('verifier.welcome.separator'));
    console.log(this.t('verifier.welcome.description'));
    console.log();
    console.log(this.t('verifier.directory.prompt'));
    console.log('1. ' + this.t('verifier.directory.current'));
    console.log('2. ' + this.t('verifier.directory.locales'));
    console.log('3. ' + this.t('verifier.directory.custom'));
    console.log('4. ' + this.t('verifier.options.quit'));
    console.log();

    const choice = await this.prompt('Select an option (1-4): ');

    switch (choice.trim()) {
      case '1':
        return process.cwd();
      case '2':
        return path.join(__dirname, '..', 'ui-locales');
      case '3':
        const customPath = await this.prompt('Enter custom directory path: ');
        return customPath.trim();
      case '4':
        console.log(this.t('verifier.errors.cancelled'));
        process.exit(0);
      default:
        console.log(this.t('verifier.directory.invalid'));
        return this.selectDirectory();
    }
  }

  async scanDirectory(dirPath) {
    console.log();
    console.log(this.t('verifier.scanning.start'));
    
    const files = SecurityUtils.safeReaddirSync(dirPath);
    this.localeFiles = files
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(dirPath, file),
        language: path.basename(file, '.json')
      }));

    console.log(this.t('verifier.scanning.files', { count: this.localeFiles.length }));

    // Load base English keys
    await this.loadBaseKeys(dirPath);

    // Process each locale file
    for (let i = 0; i < this.localeFiles.length; i++) {
      const file = this.localeFiles[i];
      console.log(this.t('verifier.scanning.progress', { 
        current: i + 1, 
        total: this.localeFiles.length 
      }));

      await this.processLocaleFile(file);
    }

    console.log(this.t('verifier.scanning.complete'));
  }

  async loadBaseKeys(dirPath) {
    if (SecurityUtils.safeExistsSync(enPath, dirPath)) {
      try {
        const fileContent = SecurityUtils.safeReadFileSync(enPath, 'utf8');
        if (!fileContent) {
          throw new Error(`Failed to read file: ${enPath}`);
        }
        this.enContent = JSON.parse(fileContent);
        this.baseKeys = new Set(this.extractAllKeys(this.enContent));
        console.log(this.t('verifier.scanning.keys', { count: this.baseKeys.size }));
      } catch (error) {
        console.warn(`Warning: Could not load base keys from ${enPath}`);
        this.enContent = {};
      }
      }
     else {
      // If no English file, scan all files to build comprehensive key set
      console.log("ℹ️  No English base file found, scanning all files for comprehensive key set...");
      this.enContent = {};
      for (const file of this.localeFiles) {
        try {
          const content = JSON.parse(SecurityUtils.safeReadFileSync(file.path, 'utf8') || '{}');
          const keys = this.extractAllKeys(content);
          keys.forEach(key => this.baseKeys.add(key));
        } catch (error) {
          // Skip files that can't be parsed
        }
      }
    }
  }

  extractAllKeys(obj, prefix = '') {
    const keys = [];
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys.push(...this.extractAllKeys(value, fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    return keys;
  }

  async processLocaleFile(file) {
    try {
      const content = JSON.parse(SecurityUtils.safeReadFileSync(file.path, 'utf8') || '{}');
      const existingKeys = new Set(this.extractAllKeys(content));

      // Find missing keys
      const missing = [...this.baseKeys].filter(key => !existingKeys.has(key));

      if (missing.length > 0) {
        this.missingKeys.set(file.language, {
          file: file,
          missing: missing,
          translations: content
        });
      }
    } catch (error) {
      console.log(this.t('verifier.errors.parseError', { file: file.name }));
    }
  }

  displayResults() {
    console.log();
    console.log(this.t('verifier.results.title'));
    console.log(this.t('verifier.welcome.separator'));
    console.log();

    if (this.missingKeys.size === 0) {
      console.log(this.t('verifier.results.complete'));
      return;
    }

    let totalMissing = 0;
    console.log(this.t('verifier.results.summary'));
    console.log(this.t('verifier.results.languages', { count: this.localeFiles.length }));
    console.log(this.t('verifier.results.files', { count: this.localeFiles.length }));
    console.log();

    for (const [language, data] of this.missingKeys) {
      console.log(`🌐 Language: ${language}`);
      console.log(this.t('verifier.results.missing', { count: data.missing.length }));
      data.missing.slice(0, 5).forEach(key => console.log(`   - ${key}`));
      if (data.missing.length > 5) {
        console.log(`   ...and ${data.missing.length - 5} more`);
      }
      console.log();
      totalMissing += data.missing.length;
    }

    console.log(this.t('verifier.results.keys', { count: totalMissing }));
  }

  async promptForFixes() {
    if (this.missingKeys.size === 0) {
      return;
    }

    console.log();
    console.log(this.t('verifier.fixes.prompt'));
    console.log('1. ' + this.t('verifier.options.proceed'));
    console.log('2. ' + this.t('verifier.options.cancel'));
    console.log('3. ' + this.t('verifier.options.showDetails'));
    console.log();

    const choice = await this.prompt('Select an option (1-3): ');

    switch (choice.trim()) {
      case '1':
        await this.applyFixes();
        break;
      case '2':
        console.log(this.t('verifier.fixes.cancelled'));
        break;
      case '3':
        this.displayDetailedResults();
        await this.promptForFixes();
        break;
      default:
        console.log(this.t('verifier.directory.invalid'));
        await this.promptForFixes();
    }
  }

  displayDetailedResults() {
    console.log();
    console.log(this.t('verifier.results.title'));
    console.log(this.t('verifier.welcome.separator'));
    
    for (const [language, data] of this.missingKeys) {
      console.log(`\n🌐 Language: ${language} (${data.file.name})`);
      console.log('Missing keys:');
      data.missing.forEach(key => {
        console.log(`   - ${key}`);
      });
    }
  }

  getEnglishValue(key) {
    const keys = key.split('.');
    let value = this.enContent;
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) return `[${key}]`;
    }
    return typeof value === 'string' ? value : `[${key}]`;
  }

  async applyFixes() {
    console.log();
    console.log(this.t('verifier.fixes.backup'));

    // Create backup directory
    const backupDir = path.join(__dirname, '..', 'backups', `translation-backup-${Date.now()}`);
    // Validate the backup directory is within the project
    const resolvedBackupDir = path.resolve(backupDir);
    const projectRoot = path.resolve(__dirname, '..');
    if (!resolvedBackupDir.startsWith(projectRoot)) {
      throw new Error('Invalid backup directory path');
    }
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    console.log(this.t('verifier.fixes.applying'));

    for (const [language, data] of this.missingKeys) {
      const backupPath = path.join(backupDir, data.file.name);
      fs.copyFileSync(data.file.path, backupPath);

      // Add missing keys with English reference text and language prefix
      for (const key of data.missing) {
        const englishValue = this.getEnglishValue(key);
        const languageCode = language.toUpperCase();
        const prefixedValue = `[${languageCode}] ${englishValue}`;
        this.setNestedValue(data.translations, key, prefixedValue);
      }

      // Write updated translations
      fs.writeFileSync(data.file.path, JSON.stringify(data.translations, null, 2));
    }

    console.log(this.t('verifier.fixes.complete'));
    console.log(`💾 Backup created at: ${backupDir}`);
  }

  setNestedValue(obj, key, value) {
    const keys = key.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      // Prevent prototype pollution
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
        throw new Error(`Invalid key: ${k}`);
      }
      if (!current[k] || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    const lastKey = keys[keys.length - 1];
    if (lastKey === '__proto__' || lastKey === 'constructor' || lastKey === 'prototype') {
      throw new Error(`Invalid key: ${lastKey}`);
    }
    current[lastKey] = value;
  }

  async run() {
    try {
      const dirPath = await this.selectDirectory();
      
      if (!this.isValidDirectory(dirPath)) {
        isValidDirectory(dirPath) {
    if (!dirPath || typeof dirPath !== 'string') {
      console.log(this.t('verifier.directory.invalid'));
      return false;
    }
    
    if (!SecurityUtils.safeExistsSync(dirPath)) {
      console.log(this.t('verifier.directory.notFound', { path: dirPath }));
      return false;
    }
    
    const stats = SecurityUtils.safeStatSync(dirPath);
    if (!stats.isDirectory()) {
      console.log(this.t('verifier.directory.invalid'));
      return false;
    }
    
    return true;
  }
// Handle graceful cancellation
process.on('SIGINT', () => {
  console.log('\n❌ Operation cancelled by user');
  process.exit(0);
});

// Run the verifier
if (require.main === module) {
  const verifier = new TranslationVerifier();
  verifier.run().catch(error => {
    console.error('Failed to run translation verifier:', error.message);
    process.exit(1);
  });
}

module.exports = TranslationVerifier;
