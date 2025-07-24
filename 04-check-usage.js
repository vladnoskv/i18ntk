#!/usr/bin/env node
/**
 * I18N USAGE ANALYSIS SCRIPT
 * 
 * This script analyzes source code to find unused translation keys
 * and missing translations that are referenced in code.
 * 
 * Usage:
 *   node scripts/i18n/04-check-usage.js
 *   node scripts/i18n/04-check-usage.js --source-dir=./src
 *   node scripts/i18n/04-check-usage.js --i18n-dir=./src/i18n/locales
 *   node scripts/i18n/04-check-usage.js --output-report
 */

const fs = require('fs');
const path = require('path');

// Default configuration
const DEFAULT_CONFIG = {
  sourceDir: './',
  i18nDir: './locales',
  sourceLanguage: 'en',
  outputDir: './i18n-reports',
  excludeDirs: ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'],
  includeExtensions: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'],
  translationPatterns: [
    // Common i18n patterns
    /t\(['"`]([^'"`)]+)['"`]\)/g,                    // t('key')
    /t\(['"`]([^'"`)]+)['"`],/g,                     // t('key', ...)
    /\$t\(['"`]([^'"`)]+)['"`]\)/g,                  // $t('key')
    /i18n\.t\(['"`]([^'"`)]+)['"`]\)/g,              // i18n.t('key')
    /translate\(['"`]([^'"`)]+)['"`]\)/g,            // translate('key')
    /useTranslation\(['"`]([^'"`)]+)['"`]\)/g,       // useTranslation('key')
    /formatMessage\(\{\s*id:\s*['"`]([^'"`)]+)['"`]/g, // formatMessage({ id: 'key' })
  ]
};

class I18nUsageAnalyzer {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sourceDir = path.resolve(this.config.sourceDir);
    this.i18nDir = path.resolve(this.config.i18nDir);
    this.outputDir = path.resolve(this.config.outputDir);
    this.sourceLanguageDir = path.join(this.i18nDir, this.config.sourceLanguage);
    
    this.usedKeys = new Set();
    this.availableKeys = new Set();
    this.fileUsage = new Map();
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
        } else if (key === 'i18n-dir') {
          parsed.i18nDir = value;
        } else if (key === 'output-report') {
          parsed.outputReport = true;
        } else if (key === 'output-dir') {
          parsed.outputDir = value;
        }
      }
    });
    
    return parsed;
  }

  // Get all files recursively from a directory
  getAllFiles(dir, extensions = this.config.includeExtensions) {
    const files = [];
    
    const traverse = (currentDir) => {
      if (!fs.existsSync(currentDir)) {
        return;
      }
      
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const itemPath = path.join(currentDir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
          // Skip excluded directories
          if (!this.config.excludeDirs.includes(item)) {
            traverse(itemPath);
          }
        } else if (stat.isFile()) {
          // Include files with specified extensions
          const ext = path.extname(item);
          if (extensions.includes(ext)) {
            files.push(itemPath);
          }
        }
      }
    };
    
    traverse(dir);
    return files;
  }

  // Get all translation keys from i18n files
  getAllTranslationKeys() {
    const keys = new Set();
    
    if (!fs.existsSync(this.sourceLanguageDir)) {
      console.warn(`⚠️  Source language directory not found: ${this.sourceLanguageDir}`);
      return keys;
    }
    
    const jsonFiles = fs.readdirSync(this.sourceLanguageDir)
      .filter(file => file.endsWith('.json'));
    
    for (const fileName of jsonFiles) {
      const filePath = path.join(this.sourceLanguageDir, fileName);
      
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const namespace = fileName.replace('.json', '');
        const fileKeys = this.extractKeysFromObject(content, '', namespace);
        fileKeys.forEach(key => keys.add(key));
      } catch (error) {
        console.warn(`⚠️  Failed to parse ${fileName}: ${error.message}`);
      }
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
  extractKeysFromFile(filePath) {
    const keys = new Set();
    
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
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
      console.warn(`⚠️  Failed to read ${filePath}: ${error.message}`);
    }
    
    return keys;
  }

  // Analyze usage in source files
  analyzeUsage() {
    console.log('🔍 Scanning source files for translation usage...');
    
    const sourceFiles = this.getAllFiles(this.sourceDir);
    console.log(`📄 Found ${sourceFiles.length} source files`);
    
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
    
    console.log(`🔤 Found ${this.usedKeys.size} unique translation keys in source code`);
    console.log(`📊 Total key usages: ${totalKeysFound}`);
  }

  // Load available translation keys
  loadAvailableKeys() {
    console.log('📚 Loading available translation keys...');
    
    this.availableKeys = this.getAllTranslationKeys();
    console.log(`🗂️  Found ${this.availableKeys.size} available translation keys`);
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
  saveReport(report) {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    
    const reportPath = path.join(this.outputDir, 'usage-analysis.txt');
    fs.writeFileSync(reportPath, report, 'utf8');
    
    return reportPath;
  }

  // Main analysis process
  async analyze() {
    try {
      console.log('🔍 I18N USAGE ANALYSIS');
      console.log('=' .repeat(60));
      
      // Parse command line arguments
      const args = this.parseArgs();
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
      
      console.log(`📁 Source directory: ${this.sourceDir}`);
      console.log(`🌐 I18n directory: ${this.i18nDir}`);
      
      // Validate directories
      if (!fs.existsSync(this.sourceDir)) {
        throw new Error(`Source directory not found: ${this.sourceDir}`);
      }
      
      if (!fs.existsSync(this.i18nDir)) {
        throw new Error(`I18n directory not found: ${this.i18nDir}`);
      }
      
      // Load available keys
      this.loadAvailableKeys();
      
      // Analyze usage
      this.analyzeUsage();
      
      // Generate analysis results
      const unusedKeys = this.findUnusedKeys();
      const missingKeys = this.findMissingKeys();
      const dynamicKeys = Array.from(this.usedKeys).filter(key => key.endsWith('*'));
      
      // Display results
      console.log('\n' + '=' .repeat(60));
      console.log('📊 USAGE ANALYSIS RESULTS');
      console.log('=' .repeat(60));
      
      console.log(`📄 Source files scanned: ${this.fileUsage.size}`);
      console.log(`🔤 Available translation keys: ${this.availableKeys.size}`);
      console.log(`🎯 Used translation keys: ${this.usedKeys.size - dynamicKeys.length}`);
      console.log(`🔄 Dynamic keys detected: ${dynamicKeys.length}`);
      console.log(`❌ Unused keys: ${unusedKeys.length}`);
      console.log(`⚠️  Missing keys: ${missingKeys.length}`);
      
      // Show some examples
      if (unusedKeys.length > 0) {
        console.log('\n🗑️  Sample unused keys:');
        unusedKeys.slice(0, 5).forEach(key => {
          console.log(`   ❌ ${key}`);
        });
        if (unusedKeys.length > 5) {
          console.log(`   ... and ${unusedKeys.length - 5} more`);
        }
      }
      
      if (missingKeys.length > 0) {
        console.log('\n⚠️  Sample missing keys:');
        missingKeys.slice(0, 5).forEach(key => {
          console.log(`   ⚠️  ${key}`);
        });
        if (missingKeys.length > 5) {
          console.log(`   ... and ${missingKeys.length - 5} more`);
        }
      }
      
      // Generate and save report if requested
      if (args.outputReport) {
        console.log('\n📄 Generating detailed report...');
        const report = this.generateUsageReport();
        const reportPath = this.saveReport(report);
        console.log(`📄 Report saved: ${reportPath}`);
      }
      
      // Recommendations
      console.log('\n📋 RECOMMENDATIONS');
      console.log('=' .repeat(60));
      
      if (unusedKeys.length > 0) {
        console.log('🗑️  Consider removing unused translation keys to reduce bundle size');
      }
      
      if (missingKeys.length > 0) {
        console.log('⚠️  Add missing translation keys to avoid runtime errors');
      }
      
      if (dynamicKeys.length > 0) {
        console.log('🔄 Review dynamic keys manually to ensure all variations exist');
      }
      
      if (unusedKeys.length === 0 && missingKeys.length === 0) {
        console.log('🎉 All translation keys are properly used!');
      }
      
      console.log('\n💡 Next steps:');
      console.log('1. Review the analysis results');
      if (args.outputReport) {
        console.log('2. Check the detailed report for specific files and keys');
      } else {
        console.log('2. Run with --output-report for detailed analysis');
      }
      console.log('3. Remove unused keys or add missing translations');
      console.log('4. Re-run analysis to verify improvements');
      
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
      console.error('❌ Usage analysis failed:', error.message);
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