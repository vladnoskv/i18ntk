#!/usr/bin/env node
/**
 * Console I18n Test Script
 * 
 * This script scans all JavaScript files in the toolkit for console statements
 * (log, warn, error, info) and checks if they're using the translation system 
 * (this.t() or i18n.t()) to identify any remaining hardcoded text.
 * 
 * It provides detailed reports on translation coverage and recommendations
 * for replacing hardcoded strings with translation keys.
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const settingsManager = require('../../settings/settings-manager');

// Import the i18n helper
const { loadTranslations, t } = require('../../utils/i18n-helper');
const UIi18n = require('../../main/i18ntk-ui');

// Get configuration from settings manager
function getConfig() {
  const settings = settingsManager.getSettings();
  return {
    excludeDirs: settings.processing?.excludeDirs || ['node_modules', '.git', 'i18ntk-reports', 'ui-locales'],
    includeExtensions: settings.processing?.includeExtensions || ['.js']
  };
}

class ConsoleI18nTester {
  constructor() {
    const config = getConfig();
    this.rootDir = path.resolve(__dirname);
    this.excludeDirs = config.excludeDirs;
    this.includeExtensions = config.includeExtensions;
    this.targetFiles = [
      '02-analyze-translations.js',
      '03-validate-translations.js',
      '04-check-usage.js',
      '05-complete-translations.js',
      '06-analyze-sizing.js'
    ];
    this.consoleStatements = [];
    this.hardcodedTexts = [];
    this.translatedTexts = [];
    this.fileStats = new Map();
    this.ignoredPatterns = [
      // Patterns to ignore (technical outputs, not user-facing messages)
      /console\.(log|warn|error|info)\(['"\`]=+['"\`]\)/,  // Separator lines like console.log('=======')
      /console\.(log|warn|error|info)\(\)/,              // Empty logs
      /console\.(log|warn|error|info)\(['"\` \t\n'"\`]\)/, // Whitespace only
      /console\.(log|warn|error|info)\(['"](\\n|\\t)['"\`]\)/, // Just newlines or tabs
      /console\.debug/,                // Debug logs
      /console\.trace/,                // Trace logs
      /console\.time/,                 // Time logs
      /console\.timeEnd/,              // TimeEnd logs
      /console\.group/,                // Group logs
      /console\.groupEnd/,             // GroupEnd logs
    ];
    
    // Translation key suggestion patterns
    this.translationKeyPatterns = {
      '02-analyze-translations.js': 'analyzeTranslations',
      '03-validate-translations.js': 'validateTranslations',
      '04-check-usage.js': 'checkUsage',
      '05-complete-translations.js': 'completeTranslations',
      '06-analyze-sizing.js': 'sizing'
    };
  }

  // Get all JavaScript files recursively
  getAllFiles() {
    const files = [];
    return this.traverseDirectory(this.rootDir, files);
  }
  
  // Traverse directory recursively to find all JavaScript files
  traverseDirectory(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      // Skip excluded directories
      if (this.excludeDirs.includes(item)) continue;
      
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        this.traverseDirectory(itemPath, files);
      } else if (stat.isFile() && this.includeExtensions.includes(path.extname(item))) {
        // Only include target files if specified
        const fileName = path.basename(item);
        if (this.targetFiles.length === 0 || this.targetFiles.includes(fileName)) {
          files.push(itemPath);
          console.log(t('consoleI18nTester.found_target_file', { fileName }));
        }
      }
    }
    
    return files;
  }

  // Extract console statements from a file
  extractConsoleStatements(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(this.rootDir, filePath);
    const fileName = path.basename(filePath);
    
    // Initialize file stats
    if (!this.fileStats.has(fileName)) {
      this.fileStats.set(fileName, {
        total: 0,
        translated: 0,
        hardcoded: 0
      });
    }
    
    const fileStats = this.fileStats.get(fileName);
    
    // Regular expression to match console.log statements
    // Improved regex to better handle whitespace and capture more variations
    const consoleLogRegex = /console\.(log|warn|error|info)\s*\(([^;]*?)\)/g;
    
    let match;
    while ((match = consoleLogRegex.exec(content)) !== null) {
      const statement = match[0];
      const consoleType = match[1];
      const lineNumber = this.getLineNumber(content, match.index);
      
      // Skip statements matching ignored patterns
      if (this.ignoredPatterns.some(pattern => pattern.test(statement))) {
        continue;
      }
      
      // Check if the statement uses translation
      const usesTranslation = /this\.t\(|i18n\.t\(|UIi18n\.t\(/.test(statement);
      
      // Extract the text content from the console statement (simplified)
      let textContent = 'Complex expression';
      const textMatch = statement.match(/['"\`]([^'"\`]*)['"\`]/);
      if (textMatch && textMatch[1]) {
        textContent = textMatch[1];
      }
      
      const item = {
        file: relativePath,
        line: lineNumber,
        statement,
        consoleType,
        textContent,
        usesTranslation
      };
      
      this.consoleStatements.push(item);
      fileStats.total++;
      
      if (usesTranslation) {
        this.translatedTexts.push(item);
        fileStats.translated++;
      } else {
        this.hardcodedTexts.push(item);
        fileStats.hardcoded++;
      }
    }
  }

  // Get line number for a position in text
  getLineNumber(text, position) {
    const lines = text.slice(0, position).split('\n');
    return lines.length;
  }
  
  // Extract text content from a console statement
  extractTextContent(statement) {
    // Try to match single quotes
    let match = statement.match(/console\.(log|warn|error|info)\s*\(\s*[']([^']*)[']/);
    if (match && match[2]) return match[2];
    
    // Try to match double quotes
    match = statement.match(/console\.(log|warn|error|info)\s*\(\s*["]([^"]*)["]/);
    if (match && match[2]) return match[2];
    
    // Try to match template literals
    match = statement.match(/console\.(log|warn|error|info)\s*\(\s*`([^`]*)`/);
    if (match && match[2]) return match[2];
    
    // If we can't extract a simple string, return a placeholder
    return 'Complex expression';
  }

  // Analyze all files
  analyze() {
    console.log(t('consoleI18nTester.scanning_files_for_console_statements'));
    
    const files = this.getAllFiles();
    console.log(t('consoleI18nTester.found_javascript_files', { count: files.length }));
    
    for (const file of files) {
      this.extractConsoleStatements(file);
    }
    
    this.reportResults();
  }
  
  // Generate a suggested translation key based on the text content
  suggestTranslationKey(file, textContent) {
    const fileName = path.basename(file);
    const baseKey = this.translationKeyPatterns[fileName] || 'common';
    
    // Convert the text content to a key format
    // Remove special characters, convert to snake_case
    let keyPart = textContent
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .substring(0, 30); // Limit length
    
    if (!keyPart) {
      keyPart = 'message';
    }
    
    return `${baseKey}.${keyPart}`;
  }
  
  // Generate a suggested replacement for a hardcoded console statement
  suggestReplacement(item) {
    const key = this.suggestTranslationKey(item.file, item.textContent);
    
    // Check if the statement likely contains variables
    const hasVariables = item.statement.includes('${') || 
                        item.statement.includes('+') || 
                        item.statement.includes(',');
    
    if (hasVariables) {
      return `console.${item.consoleType}(this.t("${key}", { variables })); // Replace 'variables' with actual variables`;
    } else {
      return `console.${item.consoleType}(this.t("${key}"));`;
    }
  }
  
  // Report the results of the analysis
  reportResults() {
    console.log(t('consoleI18nTester.console_i18n_analysis_results'));
    console.log(`${'='.repeat(60)}`);
    console.log(t('consoleI18nTester.total_console_statements', { count: this.consoleStatements.length }));
    console.log(t('consoleI18nTester.translated_statements', { count: this.translatedTexts.length }));
    console.log(t('consoleI18nTester.hardcoded_statements', { count: this.hardcodedTexts.length }));
    
    const translationPercentage = this.consoleStatements.length > 0 
      ? ((this.translatedTexts.length / this.consoleStatements.length) * 100).toFixed(2)
      : 0;
    
    console.log(t('consoleI18nTester.translation_coverage', { percentage: translationPercentage }));
    
    // Report by file
    console.log(t('consoleI18nTester.coverage_by_file'));
    console.log('-------------------');
    
    this.fileStats.forEach((stats, fileName) => {
      const fileCoverage = stats.translated / stats.total * 100 || 0;
      const coverageEmoji = fileCoverage === 100 ? '🟢' : fileCoverage > 50 ? '🟡' : '🔴';
      console.log(t('consoleI18nTester.file_coverage_stats', { 
        emoji: coverageEmoji, 
        fileName, 
        coverage: fileCoverage.toFixed(2), 
        translated: stats.translated, 
        total: stats.total 
      }));
    });
    
    if (this.hardcodedTexts.length > 0) {
      console.log(t('consoleI18nTester.hardcoded_console_statements'));
      console.log(`${'='.repeat(60)}`);
      
      // Group by file
      const byFile = {};
      this.hardcodedTexts.forEach(item => {
        if (!byFile[item.file]) {
          byFile[item.file] = [];
        }
        byFile[item.file].push(item);
      });
      
      // Display hardcoded statements by file
      Object.keys(byFile).sort().forEach(file => {
        console.log(t('consoleI18nTester.file_header', { file }));
        byFile[file].forEach(item => {
          console.log(t('consoleI18nTester.line_statement', { line: item.line, statement: item.statement.trim() }));
          console.log(t('consoleI18nTester.suggested_key', { key: this.suggestTranslationKey(item.file, item.textContent) }));
          console.log(t('consoleI18nTester.suggested_replacement', { replacement: this.suggestReplacement(item) }));
        });
      });
      
      console.log(t('consoleI18nTester.recommendations'));
      console.log(`${'='.repeat(60)}`);
      console.log(t('consoleI18nTester.recommendation_1'));
      console.log(t('consoleI18nTester.recommendation_2'));
      console.log(t('consoleI18nTester.recommendation_3'));
      console.log(t('consoleI18nTester.recommendation_4'));
      
      console.log(t('consoleI18nTester.translation_keys_to_add'));
      console.log('------------------------');
      console.log(t('consoleI18nTester.add_keys_instruction'));
      console.log('{');
      
      // Group suggested keys by module
      const keysByModule = {};
      this.hardcodedTexts.forEach(item => {
        const key = this.suggestTranslationKey(item.file, item.textContent);
        const [module, subKey] = key.split('.');
        
        if (!keysByModule[module]) {
          keysByModule[module] = {};
        }
        keysByModule[module][subKey] = item.textContent;
      });
      
      // Display suggested keys in JSON format
      Object.keys(keysByModule).sort().forEach((module, moduleIndex) => {
        console.log(`  "${module}": {`);
        
        const subKeys = keysByModule[module];
        Object.keys(subKeys).sort().forEach((subKey, keyIndex) => {
          const comma = keyIndex < Object.keys(subKeys).length - 1 ? ',' : '';
          console.log(`    "${subKey}": "${subKeys[subKey]}"${comma}`);
        });
        
        const comma = moduleIndex < Object.keys(keysByModule).length - 1 ? ',' : '';
        console.log(`  }${comma}`);
      });
      
      console.log('}');
    } else {
      console.log(t('consoleI18nTester.perfect_translation_coverage'));
      console.log(`${'='.repeat(60)}`);
      console.log(t('consoleI18nTester.all_statements_using_translation'));
    }
  }
}

// Main function to run the analysis
function main() {
  // Initialize translations
  loadTranslations();
  
  console.log(t('consoleI18nTester.i18n_console_translation_checker'));
  console.log('====================================');
  console.log(t('consoleI18nTester.script_description_line1'));
  console.log(t('consoleI18nTester.script_description_line2'));
  
  const startTime = performance.now();
  const tester = new ConsoleI18nTester();
  tester.analyze();
  const endTime = performance.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Save report to file
  const reportDir = path.join(__dirname, 'i18ntk-reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = path.join(reportDir, 'console-i18n-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    duration: duration,
    summary: {
      total: tester.consoleStatements.length,
      translated: tester.translatedTexts.length,
      hardcoded: tester.hardcodedTexts.length,
      coverage: tester.translatedTexts.length / tester.consoleStatements.length * 100 || 0
    },
    fileStats: Object.fromEntries(tester.fileStats),
    hardcodedTexts: tester.hardcodedTexts.map(item => ({
      file: item.file,
      line: item.line,
      statement: item.statement,
      textContent: item.textContent,
      suggestedKey: tester.suggestTranslationKey(item.file, item.textContent),
      suggestedReplacement: tester.suggestReplacement(item)
    }))
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(t('consoleI18nTester.analysis_completed_in_duration', { duration }));
  console.log(t('consoleI18nTester.report_saved_to_path', { path: reportPath }));
  
  // Exit with error code if hardcoded text found
  if (tester.hardcodedTexts.length > 0) {
    console.log(t('consoleI18nTester.found_hardcoded_messages', { count: tester.hardcodedTexts.length }));
    process.exit(1);
  } else {
    console.log(t('consoleI18nTester.all_console_messages_use_translation'));
    process.exit(0);
  }
}

// Run the analysis
main();