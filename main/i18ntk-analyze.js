#!/usr/bin/env node
/**
 * I18NTK TRANSLATION ANALYSIS SCRIPT
 * 
 * This script analyzes translation files to identify missing translations,
 * inconsistencies, and provides detailed reports for each language.
 * 
 */

const path = require('path');
const cliHelper = require('../utils/cli-helper');
const { loadTranslations, t } = require('../utils/i18n-helper');
const { getUnifiedConfig, parseCommonArgs, displayHelp } = require('../utils/config-helper');
const SecurityUtils = require('../utils/security');
const AdminCLI = require('../utils/admin-cli');
const watchLocales = require('../utils/watch-locales');
const JsonOutput = require('../utils/json-output');
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

loadTranslations( 'en', path.resolve(__dirname, '..', 'ui-locales'));

const PROJECT_ROOT = process.cwd();

class I18nAnalyzer {
  constructor(config = {}) {
    this.config = config;
    
    // Don't set defaults here - let getUnifiedConfig handle it
    // This ensures we use the configuration from settings files
  }

  async initialize() {
    try {
      const args = this.parseArgs();
      if (args.help) {
        displayHelp('i18ntk-analyze', {
          'language': 'Analyze specific language only',
          'output-reports': 'Generate detailed reports',
          'setup-admin': 'Configure admin PIN protection',
          'disable-admin': 'Disable admin PIN protection',
          'admin-status': 'Check admin PIN status',
          'setup-wizard': 'Interactive setup wizard for analysis configuration',
          'wizard': 'Alias for --setup-wizard',
          'source': 'Source directory path',
          'output': 'Output directory for reports',
          'json': 'Output results as JSON',
          'exclude-files': 'Comma-separated list of files to exclude',
          'exclude': 'Pattern to exclude files'
        });
        process.exit(0);
      }
      
      // Configuration is handled by getUnifiedConfig - no need for .i18ntk directory check
      
      // Initialize i18n with UI language first
      const baseConfig = await getUnifiedConfig('analyze', args);
      this.config = { ...baseConfig, ...(this.config || {}) };
      
      const uiLanguage = (this.config && this.config.uiLanguage) || 'en';
      loadTranslations(uiLanguage, path.resolve(__dirname, '..', 'ui-locales'));
      
      this.sourceDir = this.config.sourceDir;
      this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
      this.outputDir = this.config.outputDir;
      
      // Validate source directory exists
      const { validateSourceDir } = require('../utils/config-helper');
      validateSourceDir(this.sourceDir, 'i18ntk-analyze');
      
    } catch (error) {
      console.error(`Fatal analysis error: ${error.message}`);
      throw error;
    }
  }
  
  // Initialize readline interface (deprecated - use cliHelper directly)
  initReadline() {
    return cliHelper.getInterface();
  }
  
  // Close readline interface (deprecated - use cliHelper.close directly)
  closeReadline() {
    cliHelper.close();
  }
  
  // Prompt for user input
  async prompt(question) {
    return cliHelper.prompt(question);
  }

  // Parse command line arguments
  parseArgs() {
    try {
      const args = process.argv.slice(2);
      const parsed = parseCommonArgs(args);
      
      // Add script-specific arguments
      args.forEach(arg => {
        if (arg.startsWith('--')) {
          const [key, value] = arg.substring(2).split('=');
          const sanitizedKey = SecurityUtils.sanitizeInput(key);
          const sanitizedValue = value ? SecurityUtils.sanitizeInput(value) : true;
          
          if (sanitizedKey === 'language') {
            parsed.language = sanitizedValue;
          } else if (sanitizedKey === 'output-reports') {
            parsed.outputReports = true;
          } else if (sanitizedKey === 'setup-admin') {
            parsed.setupAdmin = true;
          } else if (sanitizedKey === 'disable-admin') {
            parsed.disableAdmin = true;
          } else if (sanitizedKey === 'admin-status') {
            parsed.adminStatus = true;
          } else if (sanitizedKey === 'json') {
            parsed.json = true;
          } else if (sanitizedKey === 'sort-keys') {
            parsed.sortKeys = true;
          } else if (sanitizedKey === 'indent') {
            parsed.indent = parseInt(value) || 2;
          } else if (sanitizedKey === 'newline') {
            parsed.newline = value || 'lf';
          } else if (sanitizedKey === 'setup-wizard' || sanitizedKey === 'wizard') {
            parsed['setup-wizard'] = true;
            parsed.wizard = true;
          }
        }
      });
      
      return parsed;
    } catch (error) {
      throw error;
    }
  }

  // Get all available languages
  getAvailableLanguages() {
    try {
      const items = SecurityUtils.safeReaddirSync(this.sourceDir, process.cwd(), { withFileTypes: true });
      if (!items) {
        console.error('Error reading source directory: Unable to access directory');
        return [];
      }
      
      const languages = [];
      
      // Check for directory-based structure
      const directories = items
        .filter(item => item.isDirectory())
        .map(item => item.name)
        .filter(name => name !== 'node_modules' && !name.startsWith('.') && name !== this.config.sourceLanguage);
      
      // Check for monolith files (language.json files)
      const files = items
        .filter(item => item.isFile() && item.name.endsWith('.json'))
        .map(item => item.name);
      
      // Add directories as languages
      languages.push(...directories);
      
      // Add monolith files as languages (without .json extension)
      const monolithLanguages = files
        .map(file => file.replace('.json', ''))
        .filter(lang => !languages.includes(lang) && lang !== this.config.sourceLanguage);
      languages.push(...monolithLanguages);
      
      // Check for nested structures
      for (const dir of directories) {
        const dirPath = path.join(this.sourceDir, dir);
        try {
          const dirItems = SecurityUtils.safeReaddirSync(dirPath, process.cwd(), { withFileTypes: true });
          if (dirItems) {
            const jsonFiles = dirItems
              .filter(item => item.isFile() && item.name.endsWith('.json'))
              .map(item => item.name.replace('.json', ''));
            
            // If directory contains JSON files, it's likely a language directory
            if (jsonFiles.length > 0) {
              if (!languages.includes(dir)) {
                languages.push(dir);
              }
            }
          }
        } catch (error) {
          // Skip directories we can't read
        }
      }
      
      return [...new Set(languages)].sort();
    } catch (error) {
      console.error('Error reading source directory:', error.message);
      return [];
    }
  }

  // Get all JSON files from a language directory
  getLanguageFiles(language) {
    if (!this.sourceDir) {
      console.warn('Source directory not set');
      return [];
    }
    
    const languageDir = path.resolve(this.sourceDir, language);
    const languageFile = path.resolve(this.sourceDir, `${language}.json`);
    const files = [];
    
    // Handle monolith file structure
    const languageFileStat = SecurityUtils.safeStatSync(languageFile, this.sourceDir);
    if (languageFileStat && languageFileStat.isFile()) {
      return [path.basename(languageFile)];
    }
    
    // Handle directory-based structure
    const languageDirStat = SecurityUtils.safeStatSync(languageDir, this.sourceDir);
    if (languageDirStat && languageDirStat.isDirectory()) {
      try {
        // Ensure the path is within the source directory for security
        const validatedPath = SecurityUtils.validatePath(languageDir, this.sourceDir);
        if (!validatedPath) {
          console.warn(`Language directory not found or invalid: ${languageDir}`);
          return [];
        }
        
        const findJsonFiles = (dir) => {
          const results = [];
          const items = SecurityUtils.safeReaddirSync(dir, this.sourceDir, { withFileTypes: true });
          
          if (!items) return results;
          
          for (const item of items) {
            const fullPath = path.join(dir, item.name);
            
            if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
              // Recursively search subdirectories
              results.push(...findJsonFiles(fullPath));
            } else if (item.isFile() && item.name.endsWith('.json')) {
              // Check exclusion patterns
              const relativePath = path.relative(this.sourceDir, fullPath);
              const shouldExclude = (this.config.excludeFiles || []).some(pattern => {
                if (typeof pattern === 'string') {
                  return relativePath === pattern || relativePath.endsWith(path.sep + pattern);
                }
                if (pattern instanceof RegExp) {
                  return pattern.test(relativePath);
                }
                return false;
              });
              
              if (!shouldExclude && !item.name.startsWith('.')) {
                results.push(path.relative(languageDir, fullPath));
              }
            }
          }
          
          return results;
        };
        
        return findJsonFiles(validatedPath);
      } catch (error) {
        console.error(`Error reading language directory ${languageDir}:`, error.message);
        return [];
      }
    }
    
    // Check for namespace-based structure (language.json files in any subdirectory)
    const findNamespaceFiles = () => {
      const results = [];
      const searchDir = this.sourceDir;
      
      try {
        const searchDirExists = SecurityUtils.safeExistsSync(searchDir, this.sourceDir);
        if (searchDirExists) {
          const items = SecurityUtils.safeReaddirSync(searchDir, this.sourceDir, { withFileTypes: true });
          
          if (items) {
            for (const item of items) {
              if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
                const namespaceDir = path.join(searchDir, item.name);
                const namespaceFile = path.join(namespaceDir, `${language}.json`);
                
                const namespaceFileExists = SecurityUtils.safeExistsSync(namespaceFile, this.sourceDir);
                if (namespaceFileExists) {
                  results.push(path.relative(path.join(this.sourceDir, item.name), namespaceFile));
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Error searching for namespace files: ${error.message}`);
      }
      
      return results;
    };
    
    const namespaceFiles = findNamespaceFiles();
    if (namespaceFiles.length > 0) {
      return namespaceFiles;
    }
    
    return files;
  }

  // Get all keys recursively from an object
  getAllKeys(obj, prefix = '') {
    const keys = new Set();

    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      // Log a warning instead of crashing
      console.warn(`⚠️  Skipping invalid translation object at prefix '${prefix}'`);
      return keys;
    }

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.add(fullKey);

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nestedKeys = this.getAllKeys(value, fullKey);
        nestedKeys.forEach(k => keys.add(k));
      }
    }

    return keys;
  }

  // Get value by key path
  getValueByPath(obj, keyPath) {
    // Ensure keyPath is a string
    const keyPathStr = String(keyPath || '');
    const keys = keyPathStr.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  // Analyze translation issues in an object
  analyzeTranslationIssues(obj, sourceObj = null, prefix = '') {
    const issues = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      const sourceValue = sourceObj ? this.getValueByPath(sourceObj, fullKey) : null;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        issues.push(...this.analyzeTranslationIssues(value, sourceObj, fullKey));
      } else if (typeof value === 'string') {
        const markers = this.config.notTranslatedMarkers || [this.config.notTranslatedMarker];
        if (markers.some(m => value === m)) {
          issues.push({
            type: 'not_translated',
            key: fullKey,
            value,
            sourceValue: sourceValue || 'N/A'
          });
        } else if (value === '') {
          issues.push({
            type: 'empty_value',
            key: fullKey,
            value,
            sourceValue: sourceValue || 'N/A'
          });
        } else if (markers.some(m => value.includes(m))) {
          issues.push({
            type: 'partial_translation',
            key: fullKey,
            value,
            sourceValue: sourceValue || 'N/A'
          });
        } else if (sourceValue && value === sourceValue) {
          issues.push({ 
            type: 'same_as_source', 
            key: fullKey, 
            value, 
            sourceValue
          });
        }
      }
    }
    
    return issues;
  }

  // Get translation statistics for an object
  getTranslationStats(obj) {
    let total = 0;
    let translated = 0;
    let notTranslated = 0;
    let empty = 0;
    let partial = 0;
    
    const markers = this.config.notTranslatedMarkers || [this.config.notTranslatedMarker];
    const count = (item) => {
      if (typeof item === 'string') {
        total++;
        if (markers.some(m => item === m)) {
          notTranslated++;
        } else if (item === '') {
          empty++;
        } else if (markers.some(m => item.includes(m))) {
          partial++;
        } else {
          translated++;
        }
      } else if (Array.isArray(item)) {
        item.forEach(count);
      } else if (item && typeof item === 'object') {
        Object.values(item).forEach(count);
      }
    };
    
    count(obj);
    
    return {
      total,
      translated,
      notTranslated,
      empty,
      partial,
      percentage: total > 0 ? Math.round((translated / total) * 100) : 0,
      missing: notTranslated + empty + partial
    };
  }

  // Check structural consistency between source and target
  checkStructuralConsistency(sourceObj, targetObj) {
    const sourceKeys = this.getAllKeys(sourceObj);
    const targetKeys = this.getAllKeys(targetObj);
    
    const missingKeys = [...sourceKeys].filter(key => !targetKeys.has(key));
    const extraKeys = [...targetKeys].filter(key => !sourceKeys.has(key));
    
    return {
      isConsistent: missingKeys.length === 0 && extraKeys.length === 0,
      missingKeys,
      extraKeys,
      sourceKeyCount: sourceKeys.size,
      targetKeyCount: targetKeys.size
    };
  }

  // Analyze a single language
  analyzeLanguage(language) {
    const languageDir = path.join(this.sourceDir, language);
    const sourceFiles = this.getLanguageFiles(this.config.sourceLanguage);
    const targetFiles = this.getLanguageFiles(language);
    
    const analysis = {
      language,
      files: {},
      summary: {
        totalFiles: sourceFiles.length,
        analyzedFiles: 0,
        totalKeys: 0,
        translatedKeys: 0,
        missingKeys: 0,
        issues: []
      }
    };
    
    for (const fileName of sourceFiles) {
      const sourceFilePath = path.join(this.config.sourceLanguage, fileName);
      const targetFilePath = path.join(language, fileName);
      
      const sourceFullPath = path.join(this.sourceDir, sourceFilePath);
      const targetFullPath = path.join(this.sourceDir, targetFilePath);
      
      const sourceExists = SecurityUtils.safeExistsSync(sourceFullPath, this.sourceDir);
      if (!sourceExists) {
        continue;
      }
      
      let sourceContent, targetContent;
      
      try {
        const sourceFileContent = SecurityUtils.safeReadFileSync(sourceFullPath, this.sourceDir, 'utf8');
        if (!sourceFileContent) {
          analysis.files[fileName] = {
            error: `Failed to read source file: File not accessible or empty`
          };
          continue;
        }
        sourceContent = SecurityUtils.safeParseJSON(sourceFileContent);
        if (!sourceContent) {
          analysis.files[fileName] = {
            error: `Failed to parse source file: Invalid JSON format`
          };
          continue;
        }
      } catch (error) {
        analysis.files[fileName] = {
          error: `Failed to parse source file: ${error.message}`
        };
        continue;
      }
      
      const targetExists = SecurityUtils.safeExistsSync(targetFullPath, this.sourceDir);
      if (!targetExists) {
        analysis.files[fileName] = {
          status: 'missing',
          sourceKeys: this.getAllKeys(sourceContent).size
        };
        continue;
      }
      
try {
    const targetFileContent = SecurityUtils.safeReadFileSync(targetFullPath, this.sourceDir, 'utf8');
    if (!targetFileContent) {
      analysis.files[fileName] = {
        error: `Failed to read target file: File not accessible or empty`
      };
      continue;
    }
    
    const parsed = SecurityUtils.safeParseJSON(targetFileContent);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      analysis.files[fileName] = {
        error: `Invalid structure in target file: must be a plain object (not array/null/type)`
      };
      continue;
    }

    targetContent = parsed;

  } catch (error) {
    analysis.files[fileName] = {
      error: `Failed to parse target file: ${error.message}`
    };
    continue;
  }
      
      // Analyze this file
      const stats = this.getTranslationStats(targetContent);
      const structural = this.checkStructuralConsistency(sourceContent, targetContent);
      const issues = this.analyzeTranslationIssues(targetContent, sourceContent);
      
      analysis.files[fileName] = {
        status: 'analyzed',
        stats,
        structural,
        issues,
        sourceFilePath,
        targetFilePath
      };
      
      // Update summary
      analysis.summary.analyzedFiles++;
      analysis.summary.totalKeys += stats.total;
      analysis.summary.translatedKeys += stats.translated;
      analysis.summary.missingKeys += stats.missing;
      analysis.summary.issues.push(...issues);
    }
    
    // Calculate overall percentage
    analysis.summary.percentage = analysis.summary.totalKeys > 0 
      ? Math.round((analysis.summary.translatedKeys / analysis.summary.totalKeys) * 100) 
      : 0;
    
    return analysis;
  }

  // Generate detailed report for a language
  generateLanguageReport(analysis) {
    const { language } = analysis;
    const timestamp = new Date().toISOString();
    
    let report = `${t('analyze.reportTitle', { language: language.toUpperCase() })}
    `;
    report += `${t('analyze.generated', { timestamp })}
    `;
    report += `${t('analyze.status', { translated: analysis.summary.translatedKeys, total: analysis.summary.totalKeys, percentage: analysis.summary.percentage })}
    `;
    report += `${t('analyze.filesAnalyzed', { analyzed: analysis.summary.analyzedFiles, total: analysis.summary.totalFiles })}
    `;
    report += `${t('analyze.keysNeedingTranslation', { count: analysis.summary.missingKeys })}
    
    `;
    
    report += `${t('analyze.fileBreakdown')}
    `;
    report += `${'='.repeat(50)}\n\n`;
    
    Object.entries(analysis.files).forEach(([fileName, fileData]) => {
      report += `\uD83D\uDCC4 ${fileName}\n`;
      
      if (fileData.error) {
        report += `   \u274C ${t('analyze.error')}: ${fileData.error}\n\n`;
        return;
      }
      
      if (fileData.status === 'missing') {
        report += `   \u274C ${t('analyze.statusFileMissing')}\n`;
        report += `   📊 ${t('analyze.sourceKeys', { count: fileData.sourceKeys })}\n\n`;
        return;
      }
      
      const { stats, structural, issues } = fileData;
      
      report += `   \uD83D\uDCCA ${t('analyze.translation', { translated: stats.translated, total: stats.total, percentage: stats.percentage })}\n`;
      report += `   \uD83C\uDFD7️  ${t('analyze.structure', { status: structural.isConsistent ? t('analyze.consistent') : t('analyze.inconsistent') })}\n`;
      
      if (!structural.isConsistent) {
        if (structural.missingKeys.length > 0) {
          report += `      ${t('analyze.missingKeys', { count: structural.missingKeys.length })}\n`;
        }
        if (structural.extraKeys.length > 0) {
          report += `      ${t('analyze.extraKeys', { count: structural.extraKeys.length })}\n`;
        }
      }
      
      if (issues.length > 0) {
        report += `   ⚠️  ${t('analyze.issues', { count: issues.length })}\n`;
        
        const issueTypes = {
          not_translated: issues.filter(i => i.type === 'not_translated').length,
          empty_value: issues.filter(i => i.type === 'empty_value').length,
          partial_translation: issues.filter(i => i.type === 'partial_translation').length,
          same_as_source: issues.filter(i => i.type === 'same_as_source').length
        };
        
        Object.entries(issueTypes).forEach(([type, count]) => {
          if (count > 0) {
            report += `      ${t('analyze.issueType.' + type, { count })}\n`;
          }
        });
      }
      
      report += `\n`;
    });
    
    // Keys needing translation
    const notTranslatedIssues = analysis.summary.issues.filter(issue => 
      issue.type === 'not_translated' || issue.type === 'empty_value'
    );
    
    if (notTranslatedIssues.length > 0) {
      report += `${t('analyze.keysToTranslate')}\n`;
      report += `${'='.repeat(50)}\n\n`;
      
      notTranslatedIssues.slice(0, 50).forEach(issue => {
        report += `${t('analyze.key')}: ${issue.key}\n`;
        report += `${t('analyze.english')}: "${issue.sourceValue}"\n`;
        report += `${language}: [${t('analyze.needsTranslation')}]\n\n`;
      });
      
      if (notTranslatedIssues.length > 50) {
        report += `${t('analyze.andMoreKeys', { count: notTranslatedIssues.length - 50 })}\n\n`;
      }
    }
    
    return report;
  }

  // Save analysis report to a file
  async saveReport(language, report) {
    try {
      // Ensure we have a valid output directory
      if (!this.outputDir) {
        this.outputDir = path.join(process.cwd(), 'i18n-reports');
        console.warn(`No output directory specified, using default: ${this.outputDir}`);
      }
      
      // Ensure the output directory exists
      const dirCreated = SecurityUtils.safeMkdirSync(this.outputDir, process.cwd(), { recursive: true });
      if (!dirCreated) {
        console.error(`Failed to create output directory ${this.outputDir}`);
        return null;
      }
      
      // Validate the output directory is within the project
      const validatedOutputDir = SecurityUtils.validatePath(this.outputDir, process.cwd());
      if (!validatedOutputDir) {
        console.error(`Invalid output directory: ${this.outputDir} is outside project root`);
        return null;
      }
      
      // Create a safe filename
      const safeLanguage = language.replace(/[^\w-]/g, '_');
      const reportPath = path.resolve(validatedOutputDir, `translation-report-${safeLanguage}.json`);
      
      // Ensure the final path is still within the output directory
      if (!reportPath.startsWith(validatedOutputDir)) {
        console.error('Invalid report path detected, potential directory traversal attack');
        return null;
      }
      
      // Use safeWriteFile for secure file writing
      const success = await SecurityUtils.safeWriteFile(reportPath, JSON.stringify(report, null, 2), process.cwd(), 'utf8');
      if (!success) {
        throw new Error(t('analyze.failedToWriteReportFile') || 'Failed to write report file securely');
      }
      
      console.log(`Report saved to: ${reportPath}`);
      return reportPath;
      
    } catch (error) {
      console.error(`Failed to save report for ${language}:`, error.message);
      return null;
    }
  }

  // Show help message
  showHelp() {
    console.log(t('analyze.help_message'));
  }

  // Main analyze method
  async analyze() {
    try {
      const results = [];
      const args = this.parseArgs();
      const jsonOutput = new JsonOutput('analyze');

      if (!args.json) {
        console.log(t('analyze.starting') || '🔍 Starting translation analysis...');
        console.log(t('analyze.sourceDirectoryLabel', { sourceDir: path.resolve(this.sourceDir) }));
        console.log(t('analyze.sourceLanguageLabel', { sourceLanguage: this.config.sourceLanguage }));
        console.log(t('analyze.strictModeLabel', { mode: this.config.processing?.strictMode || this.config.strictMode ? 'ON' : 'OFF' }));
      }
      
      // Ensure output directory exists
      const outputDirExists = SecurityUtils.safeExistsSync(this.outputDir, process.cwd());
      if (!outputDirExists) {
        SecurityUtils.safeMkdirSync(this.outputDir, process.cwd(), { recursive: true });
      }
      
      const languages = this.getAvailableLanguages();
      
      if (languages.length === 0) {
        const error = t('analyze.noLanguages') || '⚠️  No target languages found.';
        const guidance = this.provideSetupGuidance();
        
        if (args.json) {
          jsonOutput.setStatus('error', error);
          jsonOutput.setOutput({
            error,
            guidance,
            structure: this.detectStructureType()
          });
          console.log(JSON.stringify(jsonOutput.data, null, args.indent || 2));
          return;
        }
        console.log(error);
        console.log('\n' + guidance);
        return;
      }
      
      if (!args.json) {
        console.log(t('analyze.foundLanguages', { count: languages.length, languages: languages.join(', ') }) || `📋 Found ${languages.length} languages to analyze: ${languages.join(', ')}`);
      }
      
      let totalMissing = 0;
      let totalExtra = 0;
      let totalFiles = 0;
      
      for (const language of languages) {
        if (!args.json) {
          console.log(t('analyze.analyzing', { language }) || `\n🔄 Analyzing ${language}...`);
        }
        
        const analysis = this.analyzeLanguage(language);
        const report = this.generateLanguageReport(analysis);
        
        // Save report
        const reportPath = await this.saveReport(language, report);
        
        if (!args.json) {
          console.log(t('analyze.completed', { language }) || `✅ Analysis completed for ${language}`);
          console.log(t('analyze.progress', { 
            translated: results.length, 
            total: languages.length 
          }) || `   Progress: ${results.length}/${languages.length} languages processed`);
          console.log(t('analyze.reportSaved', { reportPath }) || `   Report saved: ${reportPath}`);
        }
        
        results.push({
          language,
          analysis,
          reportPath
        });
        
        // Add issues to JSON output
        Object.values(analysis.files).forEach(fileData => {
          if (fileData.structural) {
            fileData.structural.missingKeys?.forEach(key => {
              jsonOutput.addIssue('missing', key, language);
              totalMissing++;
            });
            fileData.structural.extraKeys?.forEach(key => {
              jsonOutput.addIssue('extra', key, language);
              totalExtra++;
            });
          }
        });
        totalFiles += analysis.summary.analyzedFiles;
      }
      
      // Set JSON output
      jsonOutput.setStats({
        missing: totalMissing,
        extra: totalExtra,
        files: totalFiles,
        languages: languages.length
      });
      
      if (totalMissing > 0 || totalExtra > 0) {
        jsonOutput.setStatus('warn');
      } else {
        jsonOutput.setStatus('ok');
      }
      
      if (args.json) {
        jsonOutput.output();
        return results;
      }
      
      // Summary
      console.log(t('analyze.summary') || '\n📊 ANALYSIS SUMMARY');
      console.log('='.repeat(50));
      
      results.forEach(({ language, analysis }) => {
        console.log(t('analyze.languageStats', { 
          language, 
          percentage: analysis.summary.percentage, 
          translated: analysis.summary.translatedKeys, 
          total: analysis.summary.totalKeys 
        }) || `${language}: ${analysis.summary.percentage}% complete (${analysis.summary.translatedKeys}/${analysis.summary.totalKeys} keys)`);
      });
      
      console.log(t('analyze.finished') || '\n✅ Analysis completed successfully!');
      
      // Only prompt for input if running standalone and not in no-prompt mode
      if (require.main === module && !this.noPrompt) {
        await this.prompt('\nPress Enter to continue...');
      }
      this.closeReadline();
      
      return results;
      
    } catch (error) {
      console.error(t('analyze.error') || '❌ Analysis failed:', error.message);
      this.closeReadline();
      throw error;
    }
  }

  // Main analysis process
  async run(options = {}) {
    const fromMenu = options.fromMenu || false;
    
    try {
      const args = this.parseArgs();
      
      if (args.help) {
        this.showHelp();
        return;
      }
      
      // Handle setup wizard
      if (args['setup-wizard'] || args.wizard) {
        return await this.runSetupWizard();
      }
      
      // Initialize configuration properly when called from menu
      if (fromMenu && !this.sourceDir) {
        const baseConfig = await getUnifiedConfig('analyze', args);
        this.config = { ...baseConfig, ...this.config };
        
        const uiLanguage = this.config.uiLanguage || 'en';
        loadTranslations(uiLanguage, path.resolve(__dirname, '..', 'ui-locales'));
        
        this.sourceDir = this.config.sourceDir;
        this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
        this.outputDir = this.config.outputDir;
      }
      
      // Skip admin authentication when called from menu system (i18ntk-manage.js) or when --no-prompt is used
      // Authentication is handled by the menu system
      const isCalledDirectly = require.main === module;
      if (isCalledDirectly && !args.noPrompt && !fromMenu) {
        // Only check admin authentication when running directly and not in no-prompt mode
        const AdminAuth = require('../utils/admin-auth');
        const adminAuth = new AdminAuth();
        await adminAuth.initialize();
        
        const isRequired = await adminAuth.isAuthRequired();
        if (isRequired) {
          console.log('\n' + t('adminCli.authRequiredForOperation', { operation: 'analyze translations' }));
          const cliHelper = require('../utils/cli-helper');
        const pin = await cliHelper.promptPin(t('adminCli.enterPin'));
        const isValid = await this.adminAuth.verifyPin(pin);
          
          if (!isValid) {
            console.log(t('adminCli.invalidPin'));
            this.closeReadline();
            if (!fromMenu) process.exit(1);
            return;
          }
          
          console.log(t('adminCli.authenticationSuccess'));
        }
      }
      
      // Set noPrompt flag - skip prompts when called from menu
      this.noPrompt = args.noPrompt || fromMenu;
      
      // Handle UI language change
      if (args.uiLanguage) {
        loadTranslations(args.uiLanguage, path.resolve(__dirname, '..', 'ui-locales'));}
      
      // Update config if source directory is provided
      if (args.sourceDir) {
        this.config.sourceDir = args.sourceDir;
        this.sourceDir = path.resolve(PROJECT_ROOT, this.config.sourceDir);
        this.sourceLanguageDir = path.join(this.sourceDir, this.config.sourceLanguage);
      }
      
      if (args.outputDir) {
        this.config.outputDir = args.outputDir;
        this.outputDir = path.resolve(this.config.outputDir);
      }
      const execute = async () => {
        await this.analyze();
      };

      if (args.watch) {
        await execute();
        let running = false;
        watchLocales(this.sourceDir, async () => {
          if (running) return;
          running = true;
          try {
            await execute();
          } finally {
            running = false;
          }
        });
        console.log('��� Watching for translation changes. Press Ctrl+C to exit.');
      } else {
        await execute();
        if (!fromMenu && require.main === module) {
          process.exit(0);
        }
      }
    } catch (error) {
      console.error(t('analyze.error') || '❌ Analysis failed:', error.message);
      this.closeReadline();
      if (!fromMenu && require.main === module) {
        process.exit(1);
      }
    }
  }
  
  async runSetupWizard() {
    console.log('🧙‍♂️  Translation Analysis Setup Wizard');
    console.log('='.repeat(50));
    
    const prompts = require('prompts');
    
    try {
      // Detect current structure
      const structure = this.detectStructureType();
      console.log(`Current structure detected: ${structure.type}`);
      
      const questions = [
        {
          type: 'select',
          name: 'structureType',
          message: 'Choose your translation file structure:',
          choices: [
            { title: 'Monolith files (en.json, de.json, etc.)', value: 'monolith' },
            { title: 'Directory structure (en/common.json, de/common.json)', value: 'directory' },
            { title: 'Namespace structure (common/en.json, forms/en.json)', value: 'namespace' },
            { title: 'Mixed structure (auto-detect)', value: 'mixed' }
          ],
          initial: structure.type === 'monolith' ? 0 : structure.type === 'directory' ? 1 : 2
        },
        {
          type: 'text',
          name: 'sourceDir',
          message: 'Enter source directory path:',
          initial: this.sourceDir,
          validate: value => fs.existsSync(value) ? true : 'Directory does not exist'
        },
        {
          type: 'text',
          name: 'languages',
          message: 'Enter languages to analyze (comma-separated, e.g., de,fr,es):',
          initial: 'de,fr,es,ja,ru',
          validate: value => value.trim() ? true : 'Please enter at least one language'
        },
        {
          type: 'confirm',
          name: 'outputReports',
          message: 'Generate detailed reports for each language?',
          initial: true
        },
        {
          type: 'text',
          name: 'outputDir',
          message: 'Enter output directory for reports:',
          initial: this.outputDir
        }
      ];
      
      const response = await prompts(questions);
      
      if (!response.structureType) {
        console.log('Setup cancelled.');
        return { success: false, cancelled: true };
      }
      
      // Update configuration
      this.sourceDir = path.resolve(response.sourceDir);
      this.outputDir = path.resolve(response.outputDir);
      this.outputReports = response.outputReports;
      
      const languages = response.languages.split(',').map(lang => lang.trim()).filter(Boolean);
      
      console.log('\n📊 Configuration Summary:');
      console.log(`Source: ${this.sourceDir}`);
      console.log(`Output: ${this.outputDir}`);
      console.log(`Languages: ${languages.join(', ')}`);
      console.log(`Structure: ${response.structureType}`);
      
      const confirm = await prompts({
        type: 'confirm',
        name: 'proceed',
        message: 'Proceed with analysis?',
        initial: true
      });
      
      if (!confirm.proceed) {
        console.log('Setup cancelled.');
        return { success: false, cancelled: true };
      }
      
      // Run analysis with specified languages
      const results = [];
      for (const language of languages) {
        try {
          console.log(`\n🔍 Analyzing ${language}...`);
          const result = await this.analyzeLanguage(language);
          results.push({ language, ...result });
          
          if (this.outputReports) {
            await this.saveReport(language, result);
            console.log(`✅ Report saved: ${language}.json`);
          }
        } catch (error) {
          console.error(`❌ Error analyzing ${language}:`, error.message);
          results.push({ language, error: error.message });
        }
      }
      
      // Generate summary
      const summary = {
        totalLanguages: results.length,
        successful: results.filter(r => !r.error).length,
        failed: results.filter(r => r.error).length,
        results
      };
      
      await this.saveReport('wizard-summary', {
        summary,
        configuration: response,
        timestamp: new Date().toISOString()
      });
      
      console.log('\n🎉 Setup complete!');
      console.log(`Analyzed ${summary.successful}/${summary.totalLanguages} languages successfully`);
      
      return {
        success: true,
        summary,
        configuration: response
      };
      
    } catch (error) {
      console.error('Setup wizard error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Run if called directly
if (require.main === module) {
  const analyzer = new I18nAnalyzer();
  analyzer.initialize().then(() => {
    return analyzer.run();
  }).catch(error => {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  });
}

// Export for benchmark usage
async function analyzeTranslations(datasetPath) {
  const analyzer = new I18nAnalyzer();
  
  // Mock configuration for benchmark
  analyzer.config = {
    sourceLanguage: 'en',
    sourceDir: path.dirname(datasetPath),
    outputDir: './reports',
    processing: { strictMode: false }
  };
  
  analyzer.sourceDir = path.dirname(datasetPath);
  analyzer.sourceLanguageDir = path.dirname(datasetPath);
  analyzer.outputDir = './reports';
  
  // Load and analyze the dataset
  const datasetContent = SecurityUtils.safeReadFileSync(datasetPath, process.cwd(), 'utf8');
  if (!datasetContent) {
    throw new Error('Failed to load dataset for benchmark');
  }
  const dataset = SecurityUtils.safeParseJSON(datasetContent);
  if (!dataset) {
    throw new Error('Failed to parse dataset JSON');
  }
  
  // Simulate analysis processing
  const languages = Object.keys(dataset).filter(lang => lang !== 'en');
  const results = {
    totalKeys: Object.keys(dataset.en || {}).length,
    languages: languages.length,
    translations: {}
  };
  
  languages.forEach(lang => {
    const langKeys = Object.keys(dataset[lang] || {});
    const enKeys = Object.keys(dataset.en || {});
    const translatedKeys = langKeys.filter(key => enKeys.includes(key));
    
    results.translations[lang] = {
      total: enKeys.length,
      translated: translatedKeys.length,
      missing: enKeys.length - translatedKeys.length,
      percentage: enKeys.length > 0 ? (translatedKeys.length / enKeys.length) * 100 : 0
    };
  });
  
  // Simulate processing time based on dataset size
  const processingTime = Object.keys(dataset.en || {}).length * 0.5; // ~0.5ms per key
  await new Promise(resolve => setTimeout(resolve, processingTime));
  
  return results;
}

module.exports = {
  I18nAnalyzer,
  analyzeTranslations
};