#!/usr/bin/env node

/**
 * I18n Sizing Analyzer
 * 
 * Analyzes translation file sizes, character counts, and provides sizing statistics
 * for different languages to help with UI layout planning and optimization.
 * 
 * Features:
 * - File size analysis for all translation files
 * - Character count statistics per language
 * - Key-level size comparison across languages
 * - UI layout impact assessment
 * - Size optimization recommendations
 * 
 * Usage:
 *   node 06-analyze-sizing.js [options]
 *   
 * Options:
 *   --source-dir <dir>     Source directory containing translation files (default: ./src/locales)
 *   --languages <langs>    Comma-separated list of languages to analyze (default: all)
 *   --output-report        Generate detailed sizing report
 *   --format <format>      Output format: json, csv, table (default: table)
 *   --threshold <number>   Size difference threshold for warnings (default: 50%)
 *   --help                 Show this help message
 * 
 * Examples:
 *   node 06-analyze-sizing.js --output-report
 *   node 06-analyze-sizing.js --languages=en,de,fr --format=json
 *   node 06-analyze-sizing.js --threshold=30 --output-report
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class I18nSizingAnalyzer {
  constructor(options = {}) {
    this.sourceDir = options.sourceDir || './src/locales';
    this.outputDir = options.outputDir || './reports';
    this.languages = options.languages || [];
    this.threshold = options.threshold || 50; // Size difference threshold in percentage
    this.format = options.format || 'table';
    this.outputReport = options.outputReport || false;
    
    this.stats = {
      files: {},
      languages: {},
      keys: {},
      summary: {}
    };
  }

  // Get available language files
  getLanguageFiles() {
    if (!fs.existsSync(this.sourceDir)) {
      throw new Error(`Source directory not found: ${this.sourceDir}`);
    }

    const files = fs.readdirSync(this.sourceDir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const lang = path.basename(file, '.json');
        return {
          language: lang,
          file: file,
          path: path.join(this.sourceDir, file)
        };
      });

    if (this.languages.length > 0) {
      return files.filter(f => this.languages.includes(f.language));
    }

    return files;
  }

  // Analyze file sizes
  analyzeFileSizes(files) {
    console.log('📊 Analyzing file sizes...');
    
    files.forEach(({ language, file, path: filePath }) => {
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      
      this.stats.files[language] = {
        file,
        size: stats.size,
        sizeKB: (stats.size / 1024).toFixed(2),
        lines: content.split('\n').length,
        characters: content.length,
        lastModified: stats.mtime
      };
    });
  }

  // Analyze translation content
  analyzeTranslationContent(files) {
    console.log('🔤 Analyzing translation content...');
    
    files.forEach(({ language, path: filePath }) => {
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const analysis = this.analyzeTranslationObject(content, '');
        
        this.stats.languages[language] = {
          totalKeys: analysis.keyCount,
          totalCharacters: analysis.charCount,
          averageKeyLength: analysis.charCount / analysis.keyCount,
          maxKeyLength: analysis.maxLength,
          minKeyLength: analysis.minLength,
          emptyKeys: analysis.emptyKeys,
          longKeys: analysis.longKeys
        };
        
        // Store individual key sizes for comparison
        Object.entries(analysis.keys).forEach(([key, value]) => {
          if (!this.stats.keys[key]) {
            this.stats.keys[key] = {};
          }
          this.stats.keys[key][language] = {
            length: value.length,
            characters: value.length
          };
        });
        
      } catch (error) {
        console.error(`❌ Error parsing ${language}: ${error.message}`);
      }
    });
  }

  // Recursively analyze translation object
  analyzeTranslationObject(obj, prefix = '') {
    let keyCount = 0;
    let charCount = 0;
    let maxLength = 0;
    let minLength = Infinity;
    let emptyKeys = 0;
    let longKeys = 0;
    const keys = {};
    
    const traverse = (current, currentPrefix) => {
      Object.entries(current).forEach(([key, value]) => {
        const fullKey = currentPrefix ? `${currentPrefix}.${key}` : key;
        
        if (typeof value === 'string') {
          keyCount++;
          charCount += value.length;
          maxLength = Math.max(maxLength, value.length);
          minLength = Math.min(minLength, value.length);
          
          if (value.length === 0) emptyKeys++;
          if (value.length > 100) longKeys++;
          
          keys[fullKey] = value;
        } else if (typeof value === 'object' && value !== null) {
          traverse(value, fullKey);
        }
      });
    };
    
    traverse(obj, prefix);
    
    return {
      keyCount,
      charCount,
      maxLength: maxLength === 0 ? 0 : maxLength,
      minLength: minLength === Infinity ? 0 : minLength,
      emptyKeys,
      longKeys,
      keys
    };
  }

  // Generate size comparison analysis
  generateSizeComparison() {
    console.log('⚖️  Generating size comparisons...');
    
    const languages = Object.keys(this.stats.languages);
    const baseLanguage = languages[0]; // Use first language as baseline
    
    if (!baseLanguage) {
      console.warn('⚠️  No languages found for comparison');
      return;
    }
    
    this.stats.summary = {
      baseLanguage,
      totalLanguages: languages.length,
      sizeVariations: {},
      problematicKeys: [],
      recommendations: []
    };
    
    // Compare each language to base language
    languages.forEach(lang => {
      if (lang === baseLanguage) return;
      
      const baseStats = this.stats.languages[baseLanguage];
      const langStats = this.stats.languages[lang];
      
      const sizeDiff = ((langStats.totalCharacters - baseStats.totalCharacters) / baseStats.totalCharacters) * 100;
      
      this.stats.summary.sizeVariations[lang] = {
        characterDifference: langStats.totalCharacters - baseStats.totalCharacters,
        percentageDifference: sizeDiff.toFixed(2),
        isProblematic: Math.abs(sizeDiff) > this.threshold
      };
    });
    
    // Find problematic keys (significant size differences)
    Object.entries(this.stats.keys).forEach(([key, langData]) => {
      const baseLang = langData[baseLanguage];
      if (!baseLang) return;
      
      const variations = [];
      Object.entries(langData).forEach(([lang, data]) => {
        if (lang === baseLanguage) return;
        
        const diff = ((data.length - baseLang.length) / baseLang.length) * 100;
        if (Math.abs(diff) > this.threshold) {
          variations.push({
            language: lang,
            difference: diff.toFixed(2),
            baseLength: baseLang.length,
            currentLength: data.length
          });
        }
      });
      
      if (variations.length > 0) {
        this.stats.summary.problematicKeys.push({
          key,
          variations
        });
      }
    });
    
    // Generate recommendations
    this.generateRecommendations();
  }

  // Generate optimization recommendations
  generateRecommendations() {
    const recommendations = [];
    
    // Check for large size variations
    Object.entries(this.stats.summary.sizeVariations).forEach(([lang, data]) => {
      if (data.isProblematic) {
        if (data.percentageDifference > 0) {
          recommendations.push(`Consider reviewing ${lang} translations - they are ${data.percentageDifference}% longer than baseline`);
        } else {
          recommendations.push(`Consider reviewing ${lang} translations - they are ${Math.abs(data.percentageDifference)}% shorter than baseline`);
        }
      }
    });
    
    // Check for problematic keys
    if (this.stats.summary.problematicKeys.length > 0) {
      recommendations.push(`${this.stats.summary.problematicKeys.length} keys have significant size variations across languages`);
    }
    
    // Check for very long translations
    Object.entries(this.stats.languages).forEach(([lang, data]) => {
      if (data.longKeys > 0) {
        recommendations.push(`${lang} has ${data.longKeys} translations longer than 100 characters - consider breaking them down`);
      }
    });
    
    this.stats.summary.recommendations = recommendations;
  }

  // Display results in table format
  displayTable() {
    console.log('\n📋 SIZING ANALYSIS RESULTS');
    console.log('=' .repeat(80));
    
    // File sizes table
    console.log('\n📁 File Sizes:');
    console.log('-'.repeat(60));
    console.log('Language\tSize (KB)\tLines\tCharacters');
    console.log('-'.repeat(60));
    
    Object.entries(this.stats.files).forEach(([lang, data]) => {
      console.log(`${lang}\t\t${data.sizeKB}\t\t${data.lines}\t${data.characters}`);
    });
    
    // Language statistics
    console.log('\n🔤 Language Statistics:');
    console.log('-'.repeat(80));
    console.log('Language\tKeys\tTotal Chars\tAvg Length\tMax Length\tEmpty Keys');
    console.log('-'.repeat(80));
    
    Object.entries(this.stats.languages).forEach(([lang, data]) => {
      console.log(`${lang}\t\t${data.totalKeys}\t${data.totalCharacters}\t\t${data.averageKeyLength.toFixed(1)}\t\t${data.maxKeyLength}\t\t${data.emptyKeys}`);
    });
    
    // Size variations
    if (this.stats.summary.sizeVariations) {
      console.log('\n⚖️  Size Variations (vs baseline):');
      console.log('-'.repeat(60));
      console.log('Language\tChar Diff\tPercentage\tProblematic');
      console.log('-'.repeat(60));
      
      Object.entries(this.stats.summary.sizeVariations).forEach(([lang, data]) => {
        const problematic = data.isProblematic ? '⚠️  Yes' : '✅ No';
        console.log(`${lang}\t\t${data.characterDifference}\t\t${data.percentageDifference}%\t\t${problematic}`);
      });
    }
    
    // Recommendations
    if (this.stats.summary.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      console.log('-'.repeat(60));
      this.stats.summary.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
  }

  // Generate detailed report
  async generateReport() {
    if (!this.outputReport) return;
    
    console.log('\n📄 Generating detailed sizing report...');
    
    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.outputDir, `sizing-analysis-${timestamp}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      configuration: {
        sourceDir: this.sourceDir,
        languages: this.languages,
        threshold: this.threshold
      },
      analysis: this.stats,
      metadata: {
        totalFiles: Object.keys(this.stats.files).length,
        totalLanguages: Object.keys(this.stats.languages).length,
        totalKeys: Object.keys(this.stats.keys).length
      }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`✅ Report saved to: ${reportPath}`);
    
    // Generate CSV if requested
    if (this.format === 'csv') {
      await this.generateCSVReport(timestamp);
    }
  }

  // Generate CSV report
  async generateCSVReport(timestamp) {
    const csvPath = path.join(this.outputDir, `sizing-analysis-${timestamp}.csv`);
    
    let csvContent = 'Language,File Size (KB),Lines,Characters,Total Keys,Avg Key Length,Max Key Length,Empty Keys,Long Keys\n';
    
    Object.entries(this.stats.files).forEach(([lang]) => {
      const fileData = this.stats.files[lang];
      const langData = this.stats.languages[lang];
      
      csvContent += `${lang},${fileData.sizeKB},${fileData.lines},${fileData.characters},${langData.totalKeys},${langData.averageKeyLength.toFixed(1)},${langData.maxKeyLength},${langData.emptyKeys},${langData.longKeys}\n`;
    });
    
    fs.writeFileSync(csvPath, csvContent);
    console.log(`✅ CSV report saved to: ${csvPath}`);
  }

  // Main analysis method
  async analyze() {
    const startTime = performance.now();
    
    try {
      console.log('🚀 Starting I18n Sizing Analysis...');
      console.log(`📂 Source directory: ${this.sourceDir}`);
      
      const files = this.getLanguageFiles();
      
      if (files.length === 0) {
        console.log('❌ No translation files found');
        return;
      }
      
      console.log(`🌍 Found ${files.length} language files: ${files.map(f => f.language).join(', ')}`);
      
      this.analyzeFileSizes(files);
      this.analyzeTranslationContent(files);
      this.generateSizeComparison();
      
      if (this.format === 'table') {
        this.displayTable();
      } else if (this.format === 'json') {
        console.log(JSON.stringify(this.stats, null, 2));
      }
      
      await this.generateReport();
      
      const endTime = performance.now();
      console.log(`\n⏱️  Analysis completed in ${(endTime - startTime).toFixed(2)}ms`);
      
    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      process.exit(1);
    }
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help') {
      console.log(`
I18n Sizing Analyzer

Usage: node 06-analyze-sizing.js [options]

Options:
  --source-dir <dir>     Source directory (default: ./src/locales)
  --languages <langs>    Comma-separated languages (default: all)
  --output-report        Generate detailed report
  --format <format>      Output format: json, csv, table (default: table)
  --threshold <number>   Size difference threshold % (default: 50)
  --help                 Show this help

Examples:
  node 06-analyze-sizing.js --output-report
  node 06-analyze-sizing.js --languages=en,de,fr --format=json
  node 06-analyze-sizing.js --threshold=30 --output-report
`);
      process.exit(0);
    } else if (arg === '--source-dir' && i + 1 < args.length) {
      options.sourceDir = args[++i];
    } else if (arg === '--languages' && i + 1 < args.length) {
      options.languages = args[++i].split(',');
    } else if (arg === '--output-report') {
      options.outputReport = true;
    } else if (arg === '--format' && i + 1 < args.length) {
      options.format = args[++i];
    } else if (arg === '--threshold' && i + 1 < args.length) {
      options.threshold = parseInt(args[++i]);
    }
  }
  
  const analyzer = new I18nSizingAnalyzer(options);
  analyzer.analyze();
}

module.exports = I18nSizingAnalyzer;