#!/usr/bin/env node
/**
 * I18N TRANSLATION FIXER
 *
 * Replaces placeholder translations with English source text prefixed by language code
 * and optionally fills missing keys.
 */

const fs = require('fs');
const path = require('path');
const { getUnifiedConfig, displayHelp } = require('../utils/config-helper');
const { loadTranslations } = require('../utils/i18n-helper');
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
      const localeContent = fs.readFileSync(localeFile, 'utf8');
      return JSON.parse(localeContent);
    } catch (error) {
      // Fallback to basic English strings if locale file not found
      return {
        fixer: {
          help_message: "\nI18n Translation Fixer\n\nUsage: node i18ntk-fixer.js [options]\n\nOptions:\n  --source-dir <dir>     Source directory to scan (default: ./locales)\n  --languages <langs>    Comma separated list of languages to fix\n  --markers <markers>    Comma separated markers to treat as untranslated\n  --no-backup           Skip automatic backup creation\n  --help                Show this help\n\nExamples:\n  node i18ntk-fixer.js --languages de,fr\n  node i18ntk-fixer.js --source-dir=./locales --markers NOT_TRANSLATED\n  node i18ntk-fixer.js --no-backup\n",
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
    const keys = key.split('.');
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
    console.log(`\n${this.t('fixer.markerPrompt.title')}`);
    console.log(this.t('fixer.markerPrompt.description'));
    console.log(this.t('fixer.markerPrompt.currentDefaults', { markers: defaultMarkers.join(', ') }));
    
    const answer = await ask(this.t('fixer.markerPrompt.input'));
    const cleanAnswer = answer.trim();
    if (cleanAnswer) {
      const markers = cleanAnswer.split(',').map(m => m.trim()).filter(Boolean);
      return markers;
    } else {
      return defaultMarkers;
    }
  }

  async promptForLanguages() {
    const { ask } = require('../utils/cli.js');

    const availableLanguages = this.getAvailableLanguages().filter(l => l !== this.config.sourceLanguage);
    
    if (availableLanguages.length === 0) {
      console.log(this.t('fixer.languagePrompt.noLanguages'));
      return [];
    }

    console.log(`\n${this.t('fixer.languagePrompt.title')}`);
    console.log(this.t('fixer.languagePrompt.available', { languages: availableLanguages.join(', ') }));
    console.log(this.t('fixer.languagePrompt.description'));
    
    const answer = await ask(this.t('fixer.languagePrompt.input'));
    const cleanAnswer = answer.trim();
    if (cleanAnswer) {
      const languages = cleanAnswer.split(',').map(l => l.trim()).filter(Boolean);
      // Validate languages exist
      const validLanguages = languages.filter(l => availableLanguages.includes(l));
      return validLanguages;
    } else {
      return availableLanguages;
    }
  }

  async promptForDirectory() {
    const { ask } = require('../utils/cli.js');

    const defaultDir = this.config.sourceDir || './locales';
    console.log(`\n${this.t('fixer.directoryPrompt.title')}`);
    console.log(this.t('fixer.directoryPrompt.current', { dir: defaultDir }));
    console.log(this.t('fixer.directoryPrompt.description'));
    
    const answer = await ask(this.t('fixer.directoryPrompt.input'));
    const cleanAnswer = answer.trim();
    if (cleanAnswer) {
      return cleanAnswer;
    } else {
      return defaultDir;
    }
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
      
      // Prompt for directory
      const customDir = await this.promptForDirectory();
      let sourceDir = customDir;
      sourceDir = sourceDir.replace(/^["']|["']$/g, '');
      
      if (path.isAbsolute(sourceDir)) {
        this.sourceDir = sourceDir;
      } else {
        this.sourceDir = path.resolve(process.cwd(), sourceDir);
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
    
    this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
    this.config.outputDir = this.config.outputDir || './i18ntk-reports';
    this.config.noBackup = args['no-backup'] || false;
  }

  getAvailableLanguages() {
    if (!fs.existsSync(this.sourceDir)) return [];
    const entries = fs.readdirSync(this.sourceDir);
    const langs = new Set();
    entries.forEach(item => {
      const full = path.join(this.sourceDir, item);
      if (fs.statSync(full).isDirectory()) {
        langs.add(item);
      } else if (item.endsWith('.json')) {
        langs.add(path.basename(item, '.json'));
      }
    });
    return Array.from(langs);
  }

  createBackup() {
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.config.backupDir, `fixer-${ts}`);
      fs.cpSync(this.sourceDir, backupPath, { recursive: true });
      console.log(`Backup created at ${path.relative(process.cwd(), backupPath)}`);
    } catch (e) {
      console.warn(`Backup failed: ${e.message}`);
    }
  }

  getAllFiles(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    fs.readdirSync(dir).forEach(item => {
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        results.push(...this.getAllFiles(full));
      } else if (stat.isFile() && item.endsWith('.json')) {
        results.push(full);
      }
    });
    return results;
  }

  fixObject(target, source, lang) {
    Object.keys(source).forEach(key => {
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
    const files = this.getAllFiles(this.sourceLanguageDir);
    files.forEach(file => {
      const rel = path.relative(this.sourceLanguageDir, file);
      const srcData = JSON.parse(fs.readFileSync(file, 'utf8'));
      const targetFile = path.join(this.sourceDir, lang, rel);
      let tgtData = {};
      if (fs.existsSync(targetFile)) {
        try {
          tgtData = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
        } catch {
          tgtData = {};
        }
      } else {
        fs.mkdirSync(path.dirname(targetFile), { recursive: true });
      }
      const fixed = this.fixObject(tgtData, srcData, lang);
      fs.writeFileSync(targetFile, JSON.stringify(fixed, null, 2));
    });
  }

  scanForIssues(lang) {
    const issues = [];
    const files = this.getAllFiles(this.sourceLanguageDir);
    
    files.forEach(file => {
      const rel = path.relative(this.sourceLanguageDir, file);
      const srcData = JSON.parse(fs.readFileSync(file, 'utf8'));
      const targetFile = path.join(this.sourceDir, lang, rel);
      let tgtData = {};
      
      if (fs.existsSync(targetFile)) {
        try {
          tgtData = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
        } catch {
          tgtData = {};
        }
      }

      this.scanObject(issues, srcData, tgtData, lang, rel, []);
    });
    
    return issues;
  }

  scanObject(issues, source, target, lang, file, pathStack) {
    Object.keys(source).forEach(key => {
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

  generateReport(issues) {
    const report = {
      totalIssues: issues.length,
      missingKeys: issues.filter(i => i.type === 'missing').length,
      placeholderKeys: issues.filter(i => i.type === 'placeholder').length,
      languages: {}
    };

    issues.forEach(issue => {
      const lang = issue.newValue.match(/\[([A-Z-]+)\]/)?.[1];
      if (lang) {
        if (!report.languages[lang]) report.languages[lang] = 0;
        report.languages[lang]++;
      }
    });

    return report;
  }

  printDetailedReport(issues, report) {
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
        this.printDetailedReport();
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
    
    // Ensure report directory exists
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportFile = path.join(reportDir, `fixer-report-${timestamp}.json`);
    
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

    fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
    
    console.log(this.t('fixer.reportGenerated', { path: path.relative(process.cwd(), reportFile) }));
    
    return {
      file: reportFile,
      relativePath: path.relative(process.cwd(), reportFile)
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

  printDetailedReport() {
    // This method is called when user selects 's' to show detailed issues
    // Implementation can be added here if needed
    console.log('\n📋 DETAILED REPORT - All issues shown above in the report file');
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
      for (const lang of this.languages) {
        console.log(this.t('fixer.scanningLanguage', { language: lang }));
        const issues = this.scanForIssues(lang);
        allIssues.push(...issues);
      }

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
        this.languages.forEach(lang => this.processLanguage(lang));
        console.log(this.t('fixer.fixingComplete'));
        return;
      }

      // Interactive mode
      console.log(this.t('fixer.fullReportSaved', { reportPath: reportInfo.relativePath }));
      console.log(this.t('fixer.reviewReport'));
      
      const answer = await this.getUserConfirmation();
      
      if (answer === 'y' || answer === 'yes') {
        this.createBackup();
        console.log(this.t('fixer.backupCreated'));
        
        console.log(`\n${this.t('fixer.applyingFixes')}`);
        this.languages.forEach(lang => this.processLanguage(lang));
        console.log(this.t('fixer.fixingComplete'));
      } else {
        console.log(this.t('fixer.operationCancelled'));
      }
    } finally {
      // Ensure readline is properly closed to prevent hanging
      closeGlobalReadline();
    }
  }
}

// Run if executed directly
if (require.main === module) {
  const { closeGlobalReadline } = require('../utils/cli.js');
  const fixer = new I18nFixer();
  fixer.run().catch(err => {
    console.error(err.message);
    process.exit(1);
  }).finally(() => {
    // Ensure readline is properly closed
    closeGlobalReadline();
  });
}

module.exports = I18nFixer;
