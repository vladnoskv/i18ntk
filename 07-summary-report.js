#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const settingsManager = require('./settings-manager');

// Get configuration from settings manager
function getConfig() {
  const settings = settingsManager.getSettings();
  return {
    sourceLanguage: settings.directories?.sourceLanguage || 'en',
    excludeFiles: settings.processing?.excludeFiles || ['index.js', 'index.ts', '.DS_Store'],
    supportedExtensions: settings.processing?.supportedExtensions || ['.json', '.js', '.ts'],
    sourceDir: settings.directories?.sourceDir || null
  };
}

/**
 * I18N SUMMARY REPORT GENERATOR
 * 
 * Analyzes the i18n folder structure and generates a comprehensive summary report
 * including key statistics, file structure analysis, and validation checks.
 * 
 * This script is designed to be generic and work with any i18n project structure.
 */
class I18nSummaryReporter {
  constructor() {
    this.config = getConfig();
    
    this.stats = {
      languages: [],
      totalFiles: 0,
      totalKeys: 0,
      keysByLanguage: {},
      filesByLanguage: {},
      missingFiles: [],
      inconsistentKeys: [],
      emptyFiles: [],
      malformedFiles: [],
      duplicateKeys: []
    };
  }

  // Parse command line arguments
  parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {
      sourceDir: null,
      outputFile: null,
      verbose: false,
      help: false,
      keepReports: false,
      deleteReports: false
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg === '--help' || arg === '-h') {
        parsed.help = true;
      } else if (arg === '--verbose' || arg === '-v') {
        parsed.verbose = true;
      } else if (arg === '--source-dir' || arg === '-s') {
        parsed.sourceDir = args[++i];
      } else if (arg === '--output' || arg === '-o') {
        parsed.outputFile = args[++i];
      } else if (arg === '--keep-reports') {
        parsed.keepReports = true;
      } else if (arg === '--delete-reports') {
        parsed.deleteReports = true;
      }
    }

    return parsed;
  }

  // Show help information
  showHelp() {
    console.log(`
🔧 I18N SUMMARY REPORT GENERATOR
`);
    console.log('Analyzes i18n folder structure and generates comprehensive reports\n');
    console.log('Usage: node 07-summary-report.js [options]\n');
    console.log('Options:');
    console.log('  -s, --source-dir <path>    Path to i18n locales directory');
    console.log('  -o, --output <file>        Output file for the report');
    console.log('  -v, --verbose              Show detailed output');
    console.log('      --keep-reports         Keep all existing report files');
    console.log('      --delete-reports       Delete old report files after generation');
    console.log('  -h, --help                 Show this help message\n');
    console.log('Examples:');
    console.log('  node 07-summary-report.js');
console.log('  node 07-summary-report.js --source-dir ./src/i18n/locales');
console.log('  node 07-summary-report.js --output summary.txt --verbose');
console.log('  node 07-summary-report.js --output summary.txt --delete-reports');
console.log('  node 07-summary-report.js --keep-reports\n');
  }

  // Auto-detect i18n directory
  detectI18nDirectory() {
    const possiblePaths = [
      'locales',
      'i18n-reports',
      'src/i18n/locales',
      'src/locales',
      'src/i18n',
      'i18n/locales',
      'i18n',
      'public/locales',
      'assets/i18n',
      'translations'
    ];

    for (const possiblePath of possiblePaths) {
      const fullPath = path.resolve(possiblePath);
      if (fs.existsSync(fullPath)) {
        const contents = fs.readdirSync(fullPath);
        // Check if it contains language directories
        const hasLanguageDirs = contents.some(item => {
          const itemPath = path.join(fullPath, item);
          return fs.statSync(itemPath).isDirectory() && 
                 item.length === 2 && // Language codes are typically 2 characters
                 /^[a-z]{2}$/.test(item);
        });
        
        if (hasLanguageDirs) {
          return fullPath;
        }
      }
    }

    return null;
  }

  // Get all available languages
  getAvailableLanguages() {
    if (!fs.existsSync(this.config.sourceDir)) {
      return [];
    }

    return fs.readdirSync(this.config.sourceDir)
      .filter(item => {
        const itemPath = path.join(this.config.sourceDir, item);
        return fs.statSync(itemPath).isDirectory() && 
               !item.startsWith('.') &&
               item !== 'node_modules';
      })
      .sort();
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

  // Extract keys from a translation file
  extractKeysFromFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
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
            console.warn(`⚠️  Could not parse JS/TS file: ${filePath}`);
            return [];
          }
        }
      }
      
      return [];
    } catch (error) {
      console.warn(`⚠️  Error reading file ${filePath}: ${error.message}`);
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
  isFileEmpty(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8').trim();
      if (!content) return true;
      
      if (filePath.endsWith('.json')) {
        const data = JSON.parse(content);
        return Object.keys(data).length === 0;
      }
      
      return false;
    } catch (error) {
      return false; // If we can't parse it, it's not empty, just malformed
    }
  }

  // Check if file is malformed
  isFileMalformed(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (filePath.endsWith('.json')) {
        JSON.parse(content);
      }
      
      return false;
    } catch (error) {
      return true;
    }
  }

  // Find duplicate keys within a file
  findDuplicateKeys(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (filePath.endsWith('.json')) {
        // For JSON files, check for duplicate keys in the raw content
        const keys = [];
        const keyRegex = /"([^"]+)"\s*:/g;
        let match;
        
        while ((match = keyRegex.exec(content)) !== null) {
          keys.push(match[1]);
        }
        
        const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
        return [...new Set(duplicates)];
      }
      
      return [];
    } catch (error) {
      return [];
    }
  }

  // Analyze folder structure and collect statistics
  analyzeStructure() {
    console.log('📊 Analyzing i18n folder structure...');
    
    this.stats.languages = this.getAvailableLanguages();
    
    if (this.stats.languages.length === 0) {
      console.log('❌ No language directories found!');
      return;
    }
    
    console.log(`🌐 Found ${this.stats.languages.length} languages: ${this.stats.languages.join(', ')}`);
    
    // Use first language as reference for file structure
    const referenceLanguage = this.stats.languages[0];
    const referenceFiles = this.getLanguageFiles(referenceLanguage);
    
    console.log(`📁 Reference language (${referenceLanguage}) has ${referenceFiles.length} files`);
    
    // Analyze each language
    for (const language of this.stats.languages) {
      console.log(`🔍 Analyzing ${language}...`);
      
      const files = this.getLanguageFiles(language);
      this.stats.filesByLanguage[language] = files;
      this.stats.keysByLanguage[language] = {};
      
      let totalKeysForLanguage = 0;
      
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
        
        // Check if file is empty
        if (this.isFileEmpty(filePath)) {
          this.stats.emptyFiles.push({ language, file });
        }
        
        // Check if file is malformed
        if (this.isFileMalformed(filePath)) {
          this.stats.malformedFiles.push({ language, file });
          continue;
        }
        
        // Find duplicate keys
        const duplicates = this.findDuplicateKeys(filePath);
        if (duplicates.length > 0) {
          this.stats.duplicateKeys.push({ language, file, duplicates });
        }
        
        // Extract keys
        const keys = this.extractKeysFromFile(filePath);
        this.stats.keysByLanguage[language][file] = keys;
        totalKeysForLanguage += keys.length;
        
        this.stats.totalFiles++;
      }
      
      this.stats.totalKeys += totalKeysForLanguage;
      console.log(`   📝 ${totalKeysForLanguage} keys in ${files.length} files`);
    }
    
    // Find inconsistent keys across languages
    this.findInconsistentKeys();
  }

  // Find keys that are inconsistent across languages
  findInconsistentKeys() {
    console.log('🔍 Checking for inconsistent keys across languages...');
    
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

  // Generate summary report
  generateReport() {
    const report = [];
    const timestamp = new Date().toISOString();
    
    report.push('I18N SUMMARY REPORT');
    report.push('='.repeat(50));
    report.push(`Generated: ${timestamp}`);
    report.push(`Source directory: ${this.config.sourceDir}`);
    report.push('');
    
    // Overview
    report.push('OVERVIEW');
    report.push('='.repeat(30));
    report.push(`🌐 Languages: ${this.stats.languages.length}`);
    report.push(`📁 Total files: ${this.stats.totalFiles}`);
    report.push(`🔤 Total keys: ${this.stats.totalKeys}`);
    report.push(`📊 Average keys per language: ${Math.round(this.stats.totalKeys / this.stats.languages.length)}`);
    report.push('');
    
    // Languages breakdown
    report.push('LANGUAGES BREAKDOWN');
    report.push('='.repeat(30));
    for (const language of this.stats.languages) {
      const files = this.stats.filesByLanguage[language];
      const totalKeys = Object.values(this.stats.keysByLanguage[language])
        .reduce((sum, keys) => sum + keys.length, 0);
      report.push(`📍 ${language}: ${files.length} files, ${totalKeys} keys`);
    }
    report.push('');
    
    // File structure
    report.push('FILE STRUCTURE');
    report.push('='.repeat(30));
    const referenceLanguage = this.stats.languages[0];
    const referenceFiles = this.stats.filesByLanguage[referenceLanguage] || [];
    
    for (const file of referenceFiles) {
      const keysInFile = this.stats.keysByLanguage[referenceLanguage][file]?.length || 0;
      report.push(`📄 ${file}: ${keysInFile} keys`);
      
      // Show which languages have this file
      const languagesWithFile = this.stats.languages.filter(lang => 
        this.stats.filesByLanguage[lang].includes(file)
      );
      
      if (languagesWithFile.length < this.stats.languages.length) {
        const missingIn = this.stats.languages.filter(lang => 
          !languagesWithFile.includes(lang)
        );
        report.push(`   ⚠️  Missing in: ${missingIn.join(', ')}`);
      }
    }
    report.push('');
    
    // Issues
    if (this.stats.missingFiles.length > 0 || 
        this.stats.emptyFiles.length > 0 || 
        this.stats.malformedFiles.length > 0 || 
        this.stats.duplicateKeys.length > 0 || 
        this.stats.inconsistentKeys.length > 0) {
      
      report.push('ISSUES FOUND');
      report.push('='.repeat(30));
      
      if (this.stats.missingFiles.length > 0) {
        report.push('❌ Missing Files:');
        for (const item of this.stats.missingFiles) {
          report.push(`   ${item.language}: ${item.files.join(', ')}`);
        }
        report.push('');
      }
      
      if (this.stats.emptyFiles.length > 0) {
        report.push('📭 Empty Files:');
        for (const item of this.stats.emptyFiles) {
          report.push(`   ${item.language}/${item.file}`);
        }
        report.push('');
      }
      
      if (this.stats.malformedFiles.length > 0) {
        report.push('💥 Malformed Files:');
        for (const item of this.stats.malformedFiles) {
          report.push(`   ${item.language}/${item.file}`);
        }
        report.push('');
      }
      
      if (this.stats.duplicateKeys.length > 0) {
        report.push('🔄 Duplicate Keys:');
        for (const item of this.stats.duplicateKeys) {
          report.push(`   ${item.language}/${item.file}: ${item.duplicates.join(', ')}`);
        }
        report.push('');
      }
      
      if (this.stats.inconsistentKeys.length > 0) {
        report.push('⚠️  Inconsistent Keys:');
        for (const item of this.stats.inconsistentKeys) {
          report.push(`   ${item.language}/${item.file}:`);
          if (item.missing.length > 0) {
            report.push(`      Missing: ${item.missing.slice(0, 5).join(', ')}${item.missing.length > 5 ? '...' : ''}`);
          }
          if (item.extra.length > 0) {
            report.push(`      Extra: ${item.extra.slice(0, 5).join(', ')}${item.extra.length > 5 ? '...' : ''}`);
          }
        }
        report.push('');
      }
    } else {
      report.push('✅ NO ISSUES FOUND');
      report.push('='.repeat(30));
      report.push('All translation files are consistent and well-formed!');
      report.push('');
    }
    
    // Recommendations
    report.push('RECOMMENDATIONS');
    report.push('='.repeat(30));
    
    if (this.stats.missingFiles.length > 0) {
      report.push('📁 Create missing translation files to maintain consistency');
    }
    
    if (this.stats.emptyFiles.length > 0) {
      report.push('📝 Add content to empty translation files or remove them');
    }
    
    if (this.stats.malformedFiles.length > 0) {
      report.push('🔧 Fix malformed JSON/JS files to prevent runtime errors');
    }
    
    if (this.stats.duplicateKeys.length > 0) {
      report.push('🔄 Remove duplicate keys to avoid confusion');
    }
    
    if (this.stats.inconsistentKeys.length > 0) {
      report.push('⚖️  Synchronize keys across all languages');
    }
    
    if (this.stats.totalKeys > 10000) {
      report.push('📊 Consider splitting large translation files for better maintainability');
    }
    
    if (this.stats.languages.length === 1) {
      report.push('🌐 Consider adding more language support for internationalization');
    }
    
    report.push('');
    report.push('💡 Next steps:');
    report.push('1. Address any issues found above');
    report.push('2. Run validation tools to ensure translation quality');
    report.push('3. Consider implementing automated checks in your CI/CD pipeline');
    report.push('4. Regularly audit translations for completeness and accuracy');
    
    return report.join('\n');
  }

  // Run the analysis and generate report
  async run() {
    const args = this.parseArgs();
    
    if (args.help) {
      this.showHelp();
      return;
    }
    
    // Determine source directory
    if (args.sourceDir) {
      this.config.sourceDir = path.resolve(args.sourceDir);
    } else {
      this.config.sourceDir = this.detectI18nDirectory();
    }
    
    if (!this.config.sourceDir) {
      console.error('❌ Could not find i18n directory. Please specify with --source-dir');
      process.exit(1);
    }
    
    if (!fs.existsSync(this.config.sourceDir)) {
      console.error(`❌ Source directory does not exist: ${this.config.sourceDir}`);
      process.exit(1);
    }
    
    console.log('🔧 I18N SUMMARY REPORT GENERATOR');
    console.log('============================================================');
    console.log(`📁 Source directory: ${this.config.sourceDir}`);
    
    if (args.verbose) {
      console.log(`🔧 Configuration:`);
      console.log(`   Source language: ${this.config.sourceLanguage}`);
      console.log(`   Supported extensions: ${this.config.supportedExtensions.join(', ')}`);
      console.log(`   Excluded files: ${this.config.excludeFiles.join(', ')}`);
    }
    
    try {
      // Analyze structure
      this.analyzeStructure();
      
      // Generate report
      console.log('\n📄 Generating summary report...');
      const report = this.generateReport();
      
      // Output report
      if (args.outputFile) {
        const outputPath = path.resolve(args.outputFile);
        fs.writeFileSync(outputPath, report, 'utf8');
        console.log(`📄 Report saved to: ${outputPath}`);
      } else {
        console.log('\n' + report);
      }
      
      // Handle report file management
      if (args.deleteReports && !args.keepReports) {
        console.log('\n🗑️  Cleaning up report files...');
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
                console.log(`⚠️  Could not delete ${file}: ${error.message}`);
              }
            }
            
            if (deletedCount > 0) {
              console.log(`✅ Deleted ${deletedCount} old report files.`);
            } else {
              console.log('📄 No old report files to delete.');
            }
          }
        } catch (error) {
          console.log(`⚠️  Error cleaning up reports: ${error.message}`);
        }
      } else if (args.keepReports) {
        console.log('\n📁 Report files preserved as requested.');
      }
      
      // Summary
      console.log('\n============================================================');
      console.log('📊 ANALYSIS COMPLETE');
      console.log('============================================================');
      console.log(`✅ Analyzed ${this.stats.languages.length} languages`);
      console.log(`✅ Processed ${this.stats.totalFiles} files`);
      console.log(`✅ Found ${this.stats.totalKeys} translation keys`);
      
      const totalIssues = this.stats.missingFiles.length + 
                         this.stats.emptyFiles.length + 
                         this.stats.malformedFiles.length + 
                         this.stats.duplicateKeys.length + 
                         this.stats.inconsistentKeys.length;
      
      if (totalIssues > 0) {
        console.log(`⚠️  Found ${totalIssues} issues that need attention`);
      } else {
        console.log('🎉 No issues found - your i18n setup looks great!');
      }
      
    } catch (error) {
      console.error('❌ Error during analysis:', error.message);
      if (args.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const reporter = new I18nSummaryReporter();
  reporter.run().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = I18nSummaryReporter;