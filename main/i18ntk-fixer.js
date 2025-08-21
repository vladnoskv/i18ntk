#!/usr/bin/env node
/**
 * I18NTK TRANSLATION FIXER
 *
 * Replaces placeholder translations with English source text prefixed by language code
 * and optionally fills missing keys.
 */

const fs = require('fs');
const path = require('path');
const { getUnifiedConfig, displayHelp } = require('../utils/config-helper');
const { loadTranslations } = require('../utils/i18n-helper');
const SecurityUtils = require('../utils/security');
const configManager = require('../utils/config-manager');
const SetupEnforcer = require('../utils/setup-enforcer');

// Ensure setup is complete before running
(async () => {
  try {
    await SetupEnforcer.checkSetupCompleteAsync();
  } catch (error) {
    console.error('Setup check failed:', error.message);
    process.exit(1);
  }
})();

loadTranslations(process.env.I18NTK_LANG);

class I18nFixer {
  constructor(config = {}) {
    this.config = config;
    this.sourceDir = null;
    this.sourceLanguageDir = null;
    this.markers = [];
    this.languages = [];
    this.locale = this.loadLocale();
  }

  loadLocale() {
    const uiLocalesDir = path.join(__dirname, '..', 'ui-locales');
    const localeFile = path.join(uiLocalesDir, 'en.json');
    
    try {
      const localeContent = SecurityUtils.safeReadFileSync(localeFile) || '';
      return JSON.parse(localeContent);
    } catch (error) {
      // Fallback to basic English strings if locale file not found
      return {
        fixer: {
          help_options: {
            source_dir: "Source directory to scan (default: ./locales)",
            languages: "Comma separated list of languages to fix",
            markers: "Comma separated markers to treat as untranslated",
            no_backup: "Skip automatic backup creation"
          },
          welcome: {
            title: "🛠️ I18NTK Translation Fixer",
            description: "Fix placeholder translations and missing keys across your i18n files"
          },
          languageSelection: {
            title: "🌍 Language Selection",
            available: "Available languages: {languages}",
            noneFound: "❌ No language directories found in {directory}",
            selectPrompt: "Enter language codes to fix (comma-separated, or 'all' for all): ",
            invalid: "❌ Invalid language selection. Please try again.",
            confirmed: "✅ Selected languages: {languages}"
          },
          markerConfiguration: {
            title: "🏷️ Placeholder Marker Configuration",
            description: "Configure markers that indicate untranslated content",
            defaults: "Default markers: {markers}",
            customPrompt: "Enter custom markers (comma-separated, or press Enter for defaults): ",
            validation: "⚠️  Invalid marker format. Using defaults.",
            confirmed: "✅ Using markers: {markers}"
          },
          directoryHandling: {
            validation: "📁 Validating directory: {directory}",
            notFound: "❌ Directory not found: {directory}",
            created: "📁 Created directory: {directory}",
            empty: "⚠️  Directory is empty or contains no language files"
          },
          processing: {
            start: "🚀 Starting translation fixing for languages: {languages}",
            progress: "📊 Processing {current}/{total} languages",
            languageComplete: "✅ Completed {language} ({issues} issues found)",
            backupCreated: "💾 Backup created: {path}",
            applyingFixes: "🔄 Applying fixes...",
            fixApplied: "✅ Fixed {count} issues in {language}",
            allComplete: "🎉 All translations fixed successfully!"
          },
          errors: {
            noLanguages: "❌ No languages selected for fixing.",
            noFiles: "❌ No translation files found to process.",
            directoryInvalid: "❌ Invalid directory path: {path}",
            processingFailed: "❌ Failed to process {language}: {error}",
            backupFailed: "⚠️  Failed to create backup: {error}"
          },
          confirmation: {
            title: "🤔 Confirm Translation Fixes",
            summary: "Found {total} issues across {languages} languages",
            proceed: "Proceed with fixes?",
            options: "Options: [y]es / [n]o / [s]how details: "
          },
          starting: "🚀 Starting translation fixing for languages: {languages}",
          sourceDirectory: "📁 Source directory: {sourceDir}",
          sourceLanguage: "🔤 Source language: {sourceLanguage}",
          markers: "🏷️  Markers to fix: {markers}",
          scanningLanguage: "📊 Scanning {language}...",
          noLanguages: "❌ No languages specified for fixing.",
          allComplete: "🎉 All translations are already complete!",
          fullReportSaved: "📊 Full report saved to: {reportPath}",
          reviewReport: "Please review the report before proceeding.",
          backupCreated: "💾 Backup created successfully.",
          applyingFixes: "🔄 Applying fixes...",
          fixingComplete: "✅ Translation fixing complete!",
          operationCancelled: "❌ Operation cancelled by user.",
          analysisTitle: "🔍 TRANSLATION FIXING ANALYSIS",
          analysisSeparator: "==================================================",
          totalIssues: "Total issues found: {totalIssues}",
          missingTranslations: "Missing translations: {missing}",
          placeholderTranslations: "Placeholder translations: {placeholder}",
          noIssues: "✅ No issues found. All translations are complete.",
          detailedIssues: "📋 DETAILED ISSUES:",
          detailedSeparator: "--------------------------------------------------",
          filePath: "📄 {file} → {path}",
          missingKey: "❌ MISSING: {source} → {new}",
          placeholderKey: "⚠️  PLACEHOLDER: \"{target}\" → \"{new}\"",
          moreIssues: "... and {count} more issues. Check the report file for complete details.",
          confirmationTitle: "🤔 Do you want to proceed with these fixes?",
          confirmationOptions: "Options:",
          optionYes: "y - Yes, apply all fixes",
          optionNo: "n - No, cancel operation",
          optionShow: "s - Show detailed issues",
          choicePrompt: "Your choice (y/n/s): ",
          nonInteractiveMode: "⚡ Non-interactive mode detected - applying fixes automatically...",
          reportGenerated: "📊 Fixer report generated: {path}",
          summary: {
            totalIssues: "Total issues: {total}",
            missingKeys: "Missing keys: {missing}",
            placeholderKeys: "Placeholder keys: {placeholder}",
            languages: "Languages: {languages}"
          }
        }
      };
    }
  }

  t(key, params = {}) {
    // Ensure key is a string
    const keyStr = String(key || '');
    const keys = keyStr.split('.');
    let value = this.locale;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }
    
    if (typeof value !== 'string') {
      return key; // Fallback to key if translation not found
    }
    
    return value.replace(/\{([^}]+)\}/g, (match, param) => {
      return params[param] !== undefined ? params[param] : match;
    });
  }

  parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};
    args.forEach(arg => {
      if (arg.startsWith('--')) {
        const [key, ...valueParts] = arg.substring(2).split('=');
        const value = valueParts.join('=');
        
        if (key === 'source-dir') {
          parsed.sourceDir = value || '';
        } else if (key === 'source-language') {
          parsed.sourceLanguage = value || '';
        } else if (key === 'languages') {
          parsed.languages = value ? value.split(',').map(l => l.trim()).filter(Boolean) : [];
        } else if (key === 'markers') {
          parsed.markers = value ? value.split(',').map(m => m.trim()).filter(Boolean) : [];
        } else if (key === 'no-backup') {
          parsed.noBackup = true;
        } else if (key === 'help' || key === 'h') {
          parsed.help = true;
        }
      }
    });
    return parsed;
  }

  async promptForMarkers() {
    const { ask } = require('../utils/cli.js');

    const defaultMarkers = ['__NOT_TRANSLATED__', 'NOT_TRANSLATED', 'TODO_TRANSLATE'];
    console.log(`\n${this.t('fixer.markerConfiguration.title')}`);
    console.log(this.t('fixer.markerConfiguration.description'));
    console.log(this.t('fixer.markerConfiguration.defaults', { markers: defaultMarkers.join(', ') }));
    
    let selectedMarkers = [];
    let isValid = false;
    
    while (!isValid) {
      const answer = await ask(this.t('fixer.markerConfiguration.customPrompt'));
      const cleanAnswer = answer.trim();
      
      if (cleanAnswer) {
        const markers = cleanAnswer.split(',').map(m => m.trim()).filter(Boolean);
        
        // Validate marker format - ensure no empty strings and reasonable length
        const validMarkers = markers.filter(m => m.length > 0 && m.length <= 50);
        
        if (validMarkers.length === 0) {
          console.log(this.t('fixer.markerConfiguration.validation'));
          selectedMarkers = defaultMarkers;
        } else {
          selectedMarkers = validMarkers;
        }
        isValid = true;
      } else {
        selectedMarkers = defaultMarkers;
        isValid = true;
      }
    }
    
    // Persist marker settings to config for session
    this.config.markers = selectedMarkers;
    
    console.log(this.t('fixer.markerConfiguration.confirmed', { markers: selectedMarkers.join(', ') }));
    return selectedMarkers;
  }

  async promptForLanguages() {
    const { ask } = require('../utils/cli.js');

    const availableLanguages = this.getAvailableLanguages().filter(l => l !== this.config.sourceLanguage);
    
    if (availableLanguages.length === 0) {
      console.log(this.t('fixer.errors.noLanguages'));
      return [];
    }

    console.log(`\n${this.t('fixer.languageSelection.title')}`);
    console.log(this.t('fixer.languageSelection.available', { languages: availableLanguages.join(', ') }));
    console.log(this.t('fixer.languageSelection.description'));
    
    let selectedLanguages = [];
    let isValid = false;
    
    while (!isValid) {
      const answer = await ask(this.t('fixer.languageSelection.selectPrompt'));
      const cleanAnswer = answer.trim().toLowerCase();
      
      if (cleanAnswer === 'all') {
        selectedLanguages = availableLanguages;
        isValid = true;
      } else if (cleanAnswer) {
        const languages = cleanAnswer.split(',').map(l => l.trim()).filter(Boolean);
        // Validate languages exist
        const validLanguages = languages.filter(l => availableLanguages.includes(l));
        
        if (validLanguages.length === 0) {
          console.log(this.t('fixer.languageSelection.invalid'));
          continue;
        }
        
        selectedLanguages = validLanguages;
        isValid = true;
      } else {
        selectedLanguages = availableLanguages;
        isValid = true;
      }
    }
    
    console.log(this.t('fixer.languageSelection.confirmed', { languages: selectedLanguages.join(', ') }));
    return selectedLanguages;
  }

  async promptForDirectory() {
    const { ask } = require('../utils/cli.js');

    const defaultDir = this.config.sourceDir || './locales';
    const projectRoot = this.config.projectRoot || process.cwd();

    // Build candidate directories (existing + common defaults)
    const candidates = new Set();
    const addIf = p => {
      try {
        const abs = path.isAbsolute(p) ? p : path.resolve(projectRoot, p);
        const stat = SecurityUtils.safeStatSync(abs);
        if (stat && stat.isDirectory()) {
          candidates.add(configManager.toRelative(abs));
        }
      } catch (_) { /* ignore */ }
    };
    // Common locations
    ['.','./locales','./src/locales','./i18n','./public/locales','./app/locales'].forEach(addIf);
    // Scan immediate subdirectories under project root for likely i18n dirs
    try {
      const validatedProjectRoot = SecurityUtils.sanitizePath(projectRoot, process.cwd());
      if (validatedProjectRoot) {
        SecurityUtils.safeReaddirSync(validatedProjectRoot, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .forEach(d => {
            const dir = SecurityUtils.sanitizePath(path.join(validatedProjectRoot, d.name), validatedProjectRoot);
            if (dir) {
              // Heuristic: contains *.json or has typical locale filenames
              try {
                const hasJson = SecurityUtils.safeReaddirSync(dir, validatedProjectRoot).some(f => /\.json$/i.test(f));
                if (hasJson || /locale|locales|i18n/i.test(d.name)) {
                  addIf(dir);
                }
              } catch (_) { /* ignore directory access issues */ }
            }
          });
      }
    } catch (_) { /* ignore */ }

    // Ensure default dir shown (even if not existing yet)
    if (!Array.from(candidates).includes(defaultDir)) {
      candidates.add(defaultDir);
    }

    const options = Array.from(candidates);

    console.log(`\n${this.t('fixer.directoryHandling.title')}`);
    console.log(this.t('fixer.directoryHandling.description', { dir: defaultDir }));
    console.log('\nOptions:');
    if (options.length > 0) {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      options.forEach((opt, idx) => {
        const label = letters[idx] || `${idx+1}`;
        console.log(`  ${label}) ${opt}`);
      });
    }
    console.log('  *) Enter a custom path');
    console.log('  0) Exit/Cancel');

    let selectedDir = null;
    let isValid = false;
    
    while (!isValid) {
      const answer = await ask(this.t('fixer.directoryHandling.prompt'));
      const cleanAnswer = answer.trim();
      
      if (cleanAnswer === '0') {
        console.log('Operation cancelled.');
        process.exit(0);
      }
      
      let targetDir;
      if (cleanAnswer === '*' || !/^[A-Z0-9]$/.test(cleanAnswer)) {
        targetDir = cleanAnswer === '*' ? cleanAnswer : cleanAnswer;
        if (targetDir === '*' || !options.includes(targetDir)) {
          targetDir = await ask('Enter custom directory path: ');
        }
      } else {
        const idx = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(cleanAnswer.toUpperCase());
        targetDir = options[idx] || cleanAnswer;
      }
      
      const fullPath = path.isAbsolute(targetDir) ? targetDir : path.resolve(projectRoot, targetDir);
      const validatedPath = SecurityUtils.safeSanitizePath(fullPath, projectRoot);
      
      if (!validatedPath) {
        console.log(this.t('fixer.directoryHandling.validation', { directory: targetDir }));
        console.log(this.t('fixer.directoryHandling.notFound', { directory: targetDir }));
        continue;
      }
      
      if (!SecurityUtils.safeExists(validatedPath)) {
        console.log(this.t('fixer.directoryHandling.notFound', { directory: targetDir }));
        const createAnswer = await ask(this.t('fixer.directoryHandling.createPrompt'));
        if (createAnswer.toLowerCase().startsWith('y')) {
          SecurityUtils.safeMkdirSync(validatedPath, projectRoot, { recursive: true });
          console.log(this.t('fixer.directoryHandling.created', { directory: targetDir }));
          selectedDir = validatedPath;
          isValid = true;
        }
        continue;
      }
      
      const hasFiles = this.getAllFiles(validatedPath).length > 0;
      if (!hasFiles) {
        console.log(this.t('fixer.directoryHandling.empty'));
        const continueAnswer = await ask(this.t('fixer.directoryHandling.continueAnyway'));
        if (!continueAnswer.toLowerCase().startsWith('y')) {
          continue;
        }
      }
      
      const confirmAnswer = await ask(this.t('fixer.directoryHandling.confirm'));
      if (confirmAnswer.toLowerCase().startsWith('y')) {
        selectedDir = validatedPath;
        isValid = true;
      }
    }

    // Persist selection to config
    try {
      const rel = configManager.toRelative(selectedDir);
      const sanitizedRel = rel.replace(/[^a-zA-Z0-9\-_\/\\. ]/g, '');
      if (!sanitizedRel || sanitizedRel.includes('..')) {
        throw new Error('Invalid directory path');
      }
      const validatedPath = SecurityUtils.sanitizePath(path.resolve(projectRoot, sanitizedRel), projectRoot);
      if (!validatedPath) {
        throw new Error('Invalid or unsafe directory path');
      }
      await configManager.updateConfig({ 
        sourceDir: sanitizedRel,
        i18nDir: sanitizedRel 
      }, {
        allowedKeys: ['sourceDir', 'i18nDir']
      });
      this.config.sourceDir = validatedPath;
      this.config.i18nDir = this.config.sourceDir;
    } catch (err) {
      console.warn(`Warning: could not persist directory selection: ${err.message}`);
    }

    return configManager.toRelative(selectedDir);
  }

 async initialize() {
    const args = this.parseArgs();
    if (args.help) {
      displayHelp('i18ntk-fixer', {
        'markers': this.t('fixer.help_options.markers'),
        'languages': this.t('fixer.help_options.languages'),
        'no-backup': this.t('fixer.help_options.no_backup')
      });
      process.exit(0);
    }

    const baseConfig = await getUnifiedConfig('fixer', args);
    this.config = { ...baseConfig, ...(this.config || {}) };
    
    // Interactive mode - prompt for settings if not provided via CLI
    if (!args['source-dir'] && !args.languages && !args.markers && !this.config.noBackup) {
      console.log(`\n${this.t('fixer.welcome.title')}`);
      console.log(this.t('fixer.welcome.description'));
      
      // Prompt for directory (with selection + persistence)
      const customDir = await this.promptForDirectory();
      let sourceDir = customDir || this.config.sourceDir || './locales';
      if (typeof sourceDir === 'string') {
        sourceDir = sourceDir.replace(/^['"]|['"]$/g, '');
      }
      if (sourceDir && typeof sourceDir === 'string') {
        this.config.sourceDir = path.isAbsolute(sourceDir) ? sourceDir : path.resolve(process.cwd(), sourceDir);
        this.config.i18nDir = this.config.sourceDir;
      } else {
        // Fallback to default
        this.config.sourceDir = path.resolve(process.cwd(), './locales');
        this.config.i18nDir = this.config.sourceDir;
      }
      
      // Prompt for markers
      const customMarkers = await this.promptForMarkers();
      this.markers = customMarkers;
      
      // Prompt for languages
      const customLanguages = await this.promptForLanguages();
      this.languages = customLanguages;
    } else {
      // CLI mode - use provided arguments or defaults
      let sourceDir = args['source-dir'] || this.config.sourceDir || './locales';
      sourceDir = sourceDir.replace(/^["']|["']$/g, '');
      
      if (path.isAbsolute(sourceDir)) {
        this.sourceDir = sourceDir;
      } else {
        this.sourceDir = path.resolve(process.cwd(), sourceDir);
      }
      
      const baseMarkers = this.config.notTranslatedMarkers || [this.config.notTranslatedMarker || '__NOT_TRANSLATED__'];
      let markerArg = args.markers;
      if (typeof markerArg === 'string') {
        markerArg = markerArg.split(',').map(m => m.trim()).filter(Boolean);
      } else if (!Array.isArray(markerArg)) {
        markerArg = [];
      }
      this.markers = [...baseMarkers, ...markerArg].filter(Boolean);

      const langArg = args.languages || this.config.languages;
      if (typeof langArg === 'string') {
        this.languages = langArg.split(',').map(l => l.trim()).filter(Boolean);
      } else if (Array.isArray(langArg)) {
        this.languages = langArg;
      } else {
        this.languages = this.getAvailableLanguages().filter(l => l !== this.config.sourceLanguage);
      }
    }
    
    this.sourceLanguageDir = path.join(this.sourceDir || path.resolve(process.cwd(), './locales'), this.config.sourceLanguage);
    this.config.outputDir = this.config.outputDir || './i18ntk-reports';
    this.config.backupDir = this.config.backupDir || './i18ntk-backups/fixer';
    this.config.noBackup = args['no-backup'] || false;
  }

  getAvailableLanguages() {
    if (!SecurityUtils.safeExists(this.sourceDir)) return [];
    const entries = SecurityUtils.safeReaddirSync(this.sourceDir);
    const langs = new Set();
    entries.forEach(item => {
      const full = path.join(this.sourceDir, item);
      const stat = SecurityUtils.safeStatSync(full);
      if (stat && stat.isDirectory()) {
        langs.add(item);
      } else if (item.endsWith('.json')) {
        langs.add(path.basename(item, '.json'));
      }
    });
    return Array.from(langs);
  }

  isUnsafeKey(key) {
    // Prevent prototype pollution by blocking dangerous keys
    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    return dangerousKeys.includes(key);
  }

  createBackup() {
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.config.backupDir, `fixer-${ts}`);
      const success = SecurityUtils.safeCpSync(this.sourceDir, backupPath, this.sourceDir, { recursive: true });
      if (success) {
        console.log(`Backup created at ${path.relative(process.cwd(), backupPath)}`);
      } else {
        console.warn('Backup failed: Security validation failed or operation error');
      }
    } catch (e) {
      console.warn(`Backup failed: ${e.message}`);
    }
  }

  getAllFiles(dir) {
    const results = [];
    const validatedDir = SecurityUtils.safeSanitizePath(dir, this.sourceDir);
    if (!validatedDir || !SecurityUtils.safeExistsSync(validatedDir)) return results;
    
    try {
      SecurityUtils.safeReaddirSync(validatedDir, this.sourceDir).forEach(item => {
        const full = path.join(validatedDir, item);
        const validatedFull = SecurityUtils.sanitizePath(full, this.sourceDir);
        if (!validatedFull) return;
        
        const stat = SecurityUtils.safeStatSync(validatedFull);
        if (stat.isDirectory()) {
          results.push(...this.getAllFiles(validatedFull));
        } else if (stat.isFile() && item.endsWith('.json')) {
          results.push(validatedFull);
        }
      });
    } catch (error) {
      console.warn(`Error reading directory ${validatedDir}: ${error.message}`);
    }
    return results;
  }

  fixObject(target, source, lang) {
    Object.keys(source).forEach(key => {
      // Prevent prototype pollution by validating keys
      if (this.isUnsafeKey(key)) {
        console.warn(`Skipping unsafe key: ${key}`);
        return;
      }
      
      const srcVal = source[key];
      const tgtVal = target[key];
      if (srcVal && typeof srcVal === 'object' && !Array.isArray(srcVal)) {
        target[key] = this.fixObject(
          tgtVal && typeof tgtVal === 'object' ? tgtVal : {},
          srcVal,
          lang
        );
      } else {
        const placeholder = `[${lang.toUpperCase()}] ${srcVal}`;
        if (tgtVal === undefined) {
          target[key] = placeholder;
        } else if (typeof tgtVal === 'string' && this.markers.some(m => tgtVal.includes(m))) {
          target[key] = placeholder;
        }
      }
    });
    return target;
  }

  processLanguage(lang) {
    try {
      this.safeProcessLanguage(lang);
    } catch (error) {
      console.error(this.t('fixer.errors.processingFailed', {
        language: lang,
        error: error.message
      }));
    }
  }

  safeProcessLanguage(lang) {
    const errors = [];
    console.log(this.t('fixer.scanningLanguage', { language: lang }));
    
    const files = this.getAllFiles(this.sourceLanguageDir);
    let processedFiles = 0;
    
    for (const file of files) {
      try {
        this.processSingleFile(file, lang);
        processedFiles++;
        
        if (processedFiles % 5 === 0 || processedFiles === files.length) {
          console.log(this.t('fixer.processing.progress', {
            current: processedFiles,
            total: files.length
          }));
        }
      } catch (error) {
        const errorMessage = this.t('fixer.errors.processingFailed', {
          language: `${lang}/${path.basename(file)}`,
          error: error.message
        });
        console.error(errorMessage);
        errors.push({ file, error: errorMessage });
      }
    }
    
    console.log(this.t('fixer.processing.languageComplete', {
      language: lang,
      issues: processedFiles
    }));
    
    return errors;
  }

  processSingleFile(file, lang) {
    const rel = path.relative(this.sourceLanguageDir, file);
    
    // Sanitize relative path to prevent path traversal
    const sanitizedRel = rel.replace(/[^a-zA-Z0-9\-_\/\. ]/g, '');
    if (sanitizedRel.includes('..')) {
      console.warn(`Skipping unsafe path: ${rel}`);
      return;
    }
    
    const validatedSrcFile = SecurityUtils.safeSanitizePath(file, this.sourceLanguageDir);
    if (!validatedSrcFile) {
      console.warn(`Skipping invalid source file: ${file}`);
      return;
    }
    
    const srcData = JSON.parse(SecurityUtils.safeReadFileSync(validatedSrcFile, this.sourceLanguageDir));
    if (!srcData) {
      console.warn(`Failed to read source file: ${validatedSrcFile}`);
      return;
    }
    
    const targetFile = path.join(this.sourceDir, lang, sanitizedRel);
    const validatedTargetFile = SecurityUtils.safeSanitizePath(targetFile, this.sourceDir);
    if (!validatedTargetFile) {
      console.warn(`Skipping invalid target file: ${targetFile}`);
      return;
    }
    
    let tgtData = {};
    if (SecurityUtils.safeExists(validatedTargetFile)) {
      try {
        const content = SecurityUtils.safeReadFileSync(validatedTargetFile, this.sourceDir);
        tgtData = content ? JSON.parse(content) : {};
      } catch {
        tgtData = {};
      }
    } else {
      const targetDir = path.dirname(validatedTargetFile);
      const validatedTargetDir = SecurityUtils.safeSanitizePath(targetDir, this.sourceDir);
      if (validatedTargetDir) {
        SecurityUtils.safeMkdirSync(validatedTargetDir, this.sourceDir, { recursive: true });
      }
    }
    
    const fixed = this.fixObject(tgtData, srcData, lang);
    SecurityUtils.safeWriteFileSync(validatedTargetFile, JSON.stringify(fixed, null, 2), this.sourceDir);
  }

  scanForIssues(lang) {
    const issues = [];
    const files = SecurityUtils.safeGetAllFiles(this.sourceLanguageDir);
    
    files.forEach(file => {
      const rel = path.relative(this.sourceLanguageDir, file);
      
      // Sanitize relative path to prevent path traversal
      const sanitizedRel = rel.replace(/[^a-zA-Z0-9\-_\/\. ]/g, '');
      if (sanitizedRel.includes('..')) {
        console.warn(`Skipping unsafe path: ${rel}`);
        return;
      }
      
      const validatedSrcFile = SecurityUtils.safeSanitizePath(file, this.sourceLanguageDir);
      if (!validatedSrcFile) {
        console.warn(`Skipping invalid source file: ${file}`);
        return;
      }
      
      const srcData = JSON.parse(SecurityUtils.safeReadFileSync(validatedSrcFile, this.sourceLanguageDir));
      if (!srcData) {
        console.warn(`Failed to read source file: ${validatedSrcFile}`);
        return;
      }
      
      const targetFile = path.join(this.sourceDir, lang, sanitizedRel);
      const validatedTargetFile = SecurityUtils.safeSanitizePath(targetFile, this.sourceDir);
      if (!validatedTargetFile) {
        console.warn(`Skipping invalid target file: ${targetFile}`);
        return;
      }
      
      let tgtData = {};
      if (SecurityUtils.safeExists(validatedTargetFile)) {
        try {
          const content = SecurityUtils.safeReadFileSync(validatedTargetFile, this.sourceDir);
          tgtData = content ? JSON.parse(content) : {};
        } catch {
          tgtData = {};
        }
      }

      this.scanObject(issues, srcData, tgtData, lang, sanitizedRel, []);
    });
    
    return issues;
  }

  scanObject(issues, source, target, lang, file, pathStack) {
    Object.keys(source).forEach(key => {
      // Prevent prototype pollution by validating keys
      if (this.isUnsafeKey(key)) {
        console.warn(`Skipping unsafe key during scan: ${key}`);
        return;
      }
      
      const srcVal = source[key];
      const tgtVal = target[key];
      const currentPath = [...pathStack, key];
      
      if (srcVal && typeof srcVal === 'object' && !Array.isArray(srcVal)) {
        this.scanObject(issues, srcVal, tgtVal || {}, lang, file, currentPath);
      } else {
        const placeholder = `[${lang.toUpperCase()}] ${srcVal}`;
        
        if (tgtVal === undefined) {
          issues.push({
            type: 'missing',
            file,
            path: currentPath.join('.'),
            sourceValue: srcVal,
            targetValue: null,
            action: 'add',
            newValue: placeholder
          });
        } else if (typeof tgtVal === 'string') {
          // Check if any marker is present in the target value
          const hasMarker = this.markers.some(m => {
            if (m === '__NOT_TRANSLATED__') {
              return tgtVal === '__NOT_TRANSLATED__' || tgtVal.includes('__NOT_TRANSLATED__');
            }
            return tgtVal.includes(m);
          });
          
          if (hasMarker) {
            issues.push({
              type: 'placeholder',
              file,
              path: currentPath.join('.'),
              sourceValue: srcVal,
              targetValue: tgtVal,
              action: 'replace',
              newValue: placeholder
            });
          }
        }
      }
    });
  }

  printDetailedReport(issues) {
    if (!issues || issues.length === 0) {
      console.log(this.t('fixer.noIssues'));
      return;
    }

    const groupedIssues = issues.reduce((acc, issue) => {
      const key = `${issue.file}:${issue.path}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(issue);
      return acc;
    }, {});

    Object.entries(groupedIssues).forEach(([key, keyIssues]) => {
      const [file, path] = key.split(':');
      console.log(`\n${this.t('fixer.filePath', { file, path })}`);
      
      keyIssues.forEach(issue => {
        if (issue.type === 'missing') {
          console.log(`   ${this.t('fixer.missingKey', { source: issue.sourceValue, new: issue.newValue })}`);
        } else {
          console.log(`   ${this.t('fixer.placeholderKey', { target: issue.targetValue, new: issue.newValue })}`);
        }
      });
    });
  }

  async getUserConfirmation() {
    const { ask } = require('../utils/cli.js');

    const askQuestion = async () => {
      console.log(`\n${this.t('fixer.confirmationTitle')}`);
      console.log(this.t('fixer.confirmationOptions'));
      console.log(`  ${this.t('fixer.optionYes')}`);
      console.log(`  ${this.t('fixer.optionNo')}`);
      console.log(`  ${this.t('fixer.optionShow')}`);
      
      const answer = await ask(this.t('fixer.choicePrompt'));
      const cleanAnswer = answer.toLowerCase().trim();
      if (cleanAnswer === 's' || cleanAnswer === 'show') {
        // Show detailed report and ask again
        this.printDetailedReport(allIssues);
        return askQuestion();
      } else {
        return cleanAnswer;
      }
    };
    
    return askQuestion();
  }

  generateFixerReport(issues, report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportDir = path.join(this.config.outputDir || './i18ntk-reports', 'fixer-reports');
    
    // Validate report directory path
    const validatedReportDir = SecurityUtils.safeSanitizePath(reportDir);
    if (!validatedReportDir) {
      throw new Error('Invalid report directory path');
    }
    
    // Ensure report directory exists
    if (!SecurityUtils.safeExists(validatedReportDir)) {
      SecurityUtils.safeMkdir(validatedReportDir, { recursive: true });
    }

    const reportFile = path.join(validatedReportDir, `fixer-report-${timestamp}.json`);
    const validatedReportFile = SecurityUtils.safeSanitizePath(reportFile, validatedReportDir);
    if (!validatedReportFile) {
      throw new Error('Invalid report file path');
    }
    
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIssues: report.totalIssues,
        missingTranslations: report.missingKeys,
        placeholderTranslations: report.placeholderKeys,
        languages: report.languages
      },
      issues: issues.map(issue => ({
        type: issue.type,
        file: issue.file,
        path: issue.path,
        sourceValue: issue.sourceValue,
        targetValue: issue.targetValue,
        newValue: issue.newValue,
        action: issue.action
      }))
    };

    const success = SecurityUtils.safeWriteFile(validatedReportFile, JSON.stringify(reportData, null, 2), validatedReportDir);
    if (!success) {
      throw new Error('Failed to write report file');
    }
    
    console.log(this.t('fixer.reportGenerated', { path: path.relative(process.cwd(), validatedReportFile) }));
    
    return {
      file: validatedReportFile,
      relativePath: path.relative(process.cwd(), validatedReportFile)
    };
  }

  printLimitedReport(issues, report) {
    const MAX_DISPLAY = 10;
    const displayIssues = issues.slice(0, MAX_DISPLAY);
    
    console.log(`\n${this.t('fixer.analysisTitle')}`);
    console.log(this.t('fixer.analysisSeparator'));
    console.log(this.t('fixer.totalIssues', { totalIssues: report.totalIssues }));
    console.log(this.t('fixer.missingTranslations', { missing: report.missingKeys }));
    console.log(this.t('fixer.placeholderTranslations', { placeholder: report.placeholderKeys }));
    
    if (report.totalIssues === 0) {
      console.log(`\n${this.t('fixer.noIssues')}`);
      return;
    }

    console.log(`\n${this.t('fixer.detailedIssues')}`);
    console.log(this.t('fixer.detailedSeparator'));

    displayIssues.forEach(issue => {
      if (issue.type === 'missing') {
        console.log(this.t('fixer.filePath', { file: issue.file, path: issue.path }));
        console.log(`   ${this.t('fixer.missingKey', { source: issue.sourceValue, new: issue.newValue })}`);
      } else {
        console.log(this.t('fixer.filePath', { file: issue.file, path: issue.path }));
        console.log(`   ${this.t('fixer.placeholderKey', { target: issue.targetValue, new: issue.newValue })}`);
      }
    });

    if (issues.length > MAX_DISPLAY) {
      const remaining = issues.length - MAX_DISPLAY;
      console.log(`\n${this.t('fixer.moreIssues', { count: remaining })}`);
    }
  }

  printDetailedReport(issues = []) {
    if (!issues || issues.length === 0) {
      console.log('\n📋 DETAILED REPORT - No issues found');
      return;
    }

    console.log('\n📋 DETAILED REPORT - All issues:');
    console.log('='.repeat(50));
    
    issues.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.type.toUpperCase()} issue:`);
      console.log(`   File: ${issue.file}`);
      console.log(`   Path: ${issue.path}`);
      console.log(`   Source: ${issue.sourceValue}`);
      console.log(`   Target: ${issue.targetValue || 'undefined'}`);
      console.log(`   Action: ${issue.action}`);
      console.log(`   New Value: ${issue.newValue}`);
    });
    
    console.log(`\nTotal issues: ${issues.length}`);
    console.log('='.repeat(50));
  }

  async run() {
    const { closeGlobalReadline } = require('../utils/cli.js');
    
    try {
      await this.initialize();
      
      if (this.languages.length === 0) {
        console.log(this.t('fixer.noLanguages'));
        return;
      }

      console.log(`\n${this.t('fixer.starting', { languages: this.languages.join(', ') })}`);
      console.log(this.t('fixer.sourceDirectory', { sourceDir: this.sourceDir }));
      console.log(this.t('fixer.sourceLanguage', { sourceLanguage: this.config.sourceLanguage }));
      console.log(this.t('fixer.markers', { markers: this.markers.join(', ') }));

      const allIssues = [];
      let processedLanguages = 0;
      
      console.log(this.t('fixer.scanning.start', { count: this.languages.length }));
      
      for (const lang of this.languages) {
        console.log(this.t('fixer.scanning.progress', { 
          language: lang, 
          progress: Math.round((processedLanguages / this.languages.length) * 100) 
        }));
        
        try {
          const issues = this.safeScanForIssues(lang);
          allIssues.push(...issues);
          console.log(this.t('fixer.scanning.languageComplete', { 
            language: lang, 
            issues: issues.length 
          }));
        } catch (error) {
          console.error(this.t('fixer.errors.scanFailed', { language: lang, error: error.message }));
        }
        
        processedLanguages++;
      }
      
      console.log(this.t('fixer.scanning.complete', { 
        languages: this.languages.length, 
        totalIssues: allIssues.length 
      }));

      const report = this.generateReport(allIssues);

      if (report.totalIssues === 0) {
        console.log(`\n${this.t('fixer.allComplete')}`);
        return;
      }

      // Generate and save report
      const reportInfo = this.generateFixerReport(allIssues, report);
      
      // Print limited report to console
      this.printLimitedReport(allIssues, report);

      // Non-interactive mode (for tests)
      if (this.config.noBackup) {
        console.log(`\n${this.t('fixer.nonInteractiveMode')}`);
        const allProcessingErrors = [];
        this.languages.forEach(lang => {
          const errors = this.safeProcessLanguage(lang);
          allProcessingErrors.push(...errors);
        });

        if (allProcessingErrors.length > 0) {
          console.error(`\n${this.t('fixer.errors.processingSummary')}`);
          allProcessingErrors.forEach(err => {
            console.error(`- ${err.error}`);
          });
        }

        console.log(this.t('fixer.fixingComplete'));
        return;
      }

      // Interactive mode
      console.log(this.t('fixer.fullReportSaved', { reportPath: reportInfo.relativePath }));
      console.log(this.t('fixer.reviewReport'));
      
      const answer = await this.getUserConfirmation();
      
      if (answer === 'y' || answer === 'yes') {
        console.log(this.t('fixer.processing.start', { languages: this.languages.join(', ') }));
        
        const allProcessingErrors = [];
        let processedLanguagesCount = 0;
        for (const lang of this.languages) {
          console.log(this.t('fixer.processing.progress', { 
            current: processedLanguagesCount + 1, 
            total: this.languages.length 
          }));
          
          const errors = this.safeProcessLanguage(lang);
          allProcessingErrors.push(...errors);
          
          processedLanguagesCount++;
        }

        if (allProcessingErrors.length > 0) {
          console.error(`\n${this.t('fixer.errors.processingSummary')}`);
          allProcessingErrors.forEach(err => {
            console.error(`- ${err.error}`);
          });
        } else {
          console.log(this.t('fixer.processing.allComplete'));
        }
      } else if (answer === 's' || answer === 'show') {
        this.printDetailedReport(allIssues);
        return;
      } else {
        console.log(this.t('fixer.operationCancelled'));
      }
    } catch (error) {
      console.error('Error during processing:', error.message);
      process.exit(1);
    } finally {
      // Ensure readline is properly closed
      closeGlobalReadline();
    }
  }



  generateReport(issues) {
    const report = {
      totalIssues: issues.length,
      missingKeys: issues.filter(i => i.type === 'missing').length,
      placeholderKeys: issues.filter(i => i.type === 'placeholder').length,
      languages: [...new Set(issues.map(i => i.language))]
    };
    return report;
  }

  safeScanForIssues(lang) {
  /* Removed duplicate, broken method redefinitions */
}}
module.exports = I18nFixer;