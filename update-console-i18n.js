#!/usr/bin/env node

/**
 * I18n Console Message Updater
 * 
 * This script updates hardcoded console messages in the i18n toolkit files
 * with translation keys. It reads the console-i18n-report.json file generated
 * by test-console-i18n.js and applies the suggested replacements.
 * 
 * Usage:
 *   node update-console-i18n.js [options]
 * 
 * Options:
 *   --dry-run             Show changes without applying them
 *   --file <filename>     Only update a specific file
 *   --help                Show this help message
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const settingsManager = require('./settings-manager');

// Import the i18n helper
const { loadTranslations, t } = require('./utils/i18n-helper');

// Get configuration from settings manager
function getConfig() {
  const settings = settingsManager.getSettings();
  return {
    reportPath: settings.directories?.outputDir ? path.join(settings.directories.outputDir, 'console-i18n-report.json') : './i18n-reports/console-i18n-report.json'
  };
}

class ConsoleI18nUpdater {
  constructor(options = {}) {
    const config = getConfig();
    this.reportPath = options.reportPath || config.reportPath;
    this.dryRun = options.dryRun || false;
    this.targetFile = options.file || null;
    this.stats = {
      filesUpdated: 0,
      messagesUpdated: 0,
      errors: 0
    };
    this.report = null;
    this.translationKeys = {};
    
    // Initialize translations
    loadTranslations();
  }

  async run() {
    const startTime = performance.now();
    console.log(t('consoleI18nUpdater.i18n_console_message_updater'));
    console.log('='.repeat(60));

    try {
      // Load the report
      await this.loadReport();
      
      // Group hardcoded texts by file
      const fileGroups = this.groupByFile();
      
      // Update each file
      for (const [file, texts] of Object.entries(fileGroups)) {
        if (this.targetFile && path.basename(file) !== this.targetFile) {
          continue;
        }
        await this.updateFile(file, texts);
      }
      
      // Generate translation keys file
      await this.generateTranslationKeysFile();
      
      // Print summary
      this.printSummary();
    } catch (error) {
      console.error(t('consoleI18nUpdater.error', { error }));
      process.exit(1);
    }

    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(t('consoleI18nUpdater.update_completed_in_duration', { duration }));
    
    // Exit with appropriate code
    process.exit(this.stats.errors > 0 ? 1 : 0);
  }

  async loadReport() {
    try {
      const reportData = await fs.promises.readFile(this.reportPath, 'utf8');
      this.report = JSON.parse(reportData);
      console.log(t('consoleI18nUpdater.loaded_report_with_report_hard', { hardcodedTextsLength: this.report.hardcodedTexts.length }));
    } catch (error) {
      throw new Error(`Failed to load report: ${error.message}`);
    }
  }

  groupByFile() {
    const fileGroups = {};
    
    for (const text of this.report.hardcodedTexts) {
      if (!fileGroups[text.file]) {
        fileGroups[text.file] = [];
      }
      fileGroups[text.file].push(text);
      
      // Also collect translation keys for later
      if (text.suggestedKey && text.textContent) {
        const keyParts = text.suggestedKey.split('.');
        const namespace = keyParts[0];
        const key = keyParts[1];
        
        if (!this.translationKeys[namespace]) {
          this.translationKeys[namespace] = {};
        }
        
        // Handle complex expressions
        if (text.textContent === 'Complex expression') {
          this.translationKeys[namespace][key] = key.replace(/_/g, ' ');
        } else {
          this.translationKeys[namespace][key] = text.textContent;
        }
      }
    }
    
    return fileGroups;
  }

  async updateFile(filename, texts) {
    try {
      const filePath = path.join(process.cwd(), filename);
      let content = await fs.promises.readFile(filePath, 'utf8');
      let updatedContent = content;
      let updateCount = 0;
      
      // Sort texts by line number in descending order to avoid offset issues
      texts.sort((a, b) => b.line - a.line);
      
      console.log(t('consoleI18nUpdater.updating_filename_texts_length', { filename, textsLength: texts.length }));
      
      for (const text of texts) {
        const lines = updatedContent.split('\n');
        const lineIndex = text.line - 1;
        
        if (lineIndex >= 0 && lineIndex < lines.length) {
          const originalLine = lines[lineIndex];
          
          // Check if the line contains the console statement
          if (originalLine.includes(text.statement.substring(0, Math.min(text.statement.length, 30)))) {
            // Create the replacement line
            let replacementLine = text.suggestedReplacement;
            
            // If the replacement contains a comment about variables, try to extract them
            if (replacementLine.includes('// Replace \'variables\' with actual variables')) {
              replacementLine = this.improveVariableReplacement(replacementLine, text.textContent, originalLine);
            }
            
            // Replace the line
            lines[lineIndex] = originalLine.replace(text.statement, replacementLine);
            updateCount++;
            
            if (this.dryRun) {
              console.log(`  Line ${text.line}:\n    - ${originalLine.trim()}\n    + ${lines[lineIndex].trim()}`);
            }
          } else {
            console.log(t('consoleI18nUpdater.line_text_line_statement_not_f', { line: text.line }));
            this.stats.errors++;
          }
        } else {
          console.log(t('consoleI18nUpdater.line_text_line_line_number_out', { line: text.line }));
          this.stats.errors++;
        }
        
        updatedContent = lines.join('\n');
      }
      
      // Write the updated content back to the file
      if (updateCount > 0 && !this.dryRun) {
        await fs.promises.writeFile(filePath, updatedContent, 'utf8');
        console.log(t('consoleI18nUpdater.updated_updatecount_messages_i', { updateCount, filename }));
        this.stats.filesUpdated++;
        this.stats.messagesUpdated += updateCount;
      } else if (this.dryRun) {
        console.log(t('consoleI18nUpdater.would_update_updatecount_messa', { updateCount, filename }));
      } else {
        console.log(t('consoleI18nUpdater.no_changes_made_to_filename', { filename }));
      }
    } catch (error) {
      console.error(t('consoleI18nUpdater.error_updating_filename_error_', { filename, error: error.message }));
      this.stats.errors++;
    }
  }

  improveVariableReplacement(replacementLine, textContent, originalLine) {
    // Extract template variables from the original text content
    const templateVars = [];
    const regex = /\${([^}]+)}/g;
    let match;
    
    while ((match = regex.exec(textContent)) !== null) {
      templateVars.push(match[1]);
    }
    
    if (templateVars.length > 0) {
      // Create a variables object with the extracted variables
      const variablesObj = templateVars.map(v => `${v}`).join(', ');
      return replacementLine.replace('// Replace \'variables\' with actual variables', '').replace('{ variables }', `{ ${variablesObj} }`);
    }
    
    return replacementLine;
  }

  async generateTranslationKeysFile() {
    try {
      // Create the output directory if it doesn't exist
      const outputDir = path.join(process.cwd(), 'ui-locales');
      if (!fs.existsSync(outputDir)) {
        await fs.promises.mkdir(outputDir, { recursive: true });
      }
      
      // Check if en.json exists and load it
      const enJsonPath = path.join(outputDir, 'en.json');
      let existingTranslations = {};
      
      if (fs.existsSync(enJsonPath)) {
        const content = await fs.promises.readFile(enJsonPath, 'utf8');
        existingTranslations = JSON.parse(content);
      }
      
      // Merge new translation keys with existing ones
      const mergedTranslations = { ...existingTranslations };
      
      for (const [namespace, keys] of Object.entries(this.translationKeys)) {
        if (!mergedTranslations[namespace]) {
          mergedTranslations[namespace] = {};
        }
        
        for (const [key, value] of Object.entries(keys)) {
          if (!mergedTranslations[namespace][key]) {
            mergedTranslations[namespace][key] = value;
          }
        }
      }
      
      // Write the merged translations to en.json
      if (!this.dryRun) {
        const content = JSON.stringify(mergedTranslations, null, 2);
        await fs.promises.writeFile(enJsonPath, content, 'utf8');
        console.log(t('consoleI18nUpdater.updated_translation_keys_in_en', { enJsonPath }));
      } else {
        console.log(t('consoleI18nUpdater.would_update_translation_keys_', { enJsonPath }));
      }
    } catch (error) {
      console.error(t('consoleI18nUpdater.error_generating_translation_k', { error: error.message }));
      this.stats.errors++;
    }
  }

  printSummary() {
    console.log(t('consoleI18nUpdater.update_summary'));
    console.log('='.repeat(60));
    console.log(t('consoleI18nUpdater.files_updated', { filesUpdated: this.stats.filesUpdated }));
    console.log(t('consoleI18nUpdater.messages_updated', { messagesUpdated: this.stats.messagesUpdated }));
    console.log(t('consoleI18nUpdater.errors', { errors: this.stats.errors }));
    
    if (this.dryRun) {
      console.log(t('consoleI18nUpdater.this_was_a_dry_run_no_changes_'));
    }
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: false,
    file: null
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--file' && i + 1 < args.length) {
      options.file = args[++i];
    } else if (arg === '--help') {
      showHelp();
      process.exit(0);
    }
  }
  
  return options;
}

function showHelp() {
  // Load translations for help message
  loadTranslations();
  console.log(t('consoleI18nUpdater.help_message', {
    default: `
I18n Console Message Updater

Usage:
  node update-console-i18n.js [options]

Options:
  --dry-run             Show changes without applying them
  --file <filename>     Only update a specific file
  --help                Show this help message
`
  }));
}

// Main execution
if (require.main === module) {
  const options = parseArgs();
  const updater = new ConsoleI18nUpdater(options);
  updater.run();
}

module.exports = ConsoleI18nUpdater;