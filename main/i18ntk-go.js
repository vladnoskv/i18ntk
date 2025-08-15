#!/usr/bin/env node

/**
 * i18ntk-go.js - Go Language I18n Management Command
 * 
 * Supports:
 * - Standard Go i18n patterns
 * - go-i18n library
 * - Custom Go i18n implementations
 * - Resource file (.json, .toml) management
 */

const fs = require('fs');
const path = require('path');
const SecurityUtils = require(path.join(__dirname, '../utils/security'));
const { getConfig, saveConfig } = require(path.join(__dirname, '../utils/config-helper'));
const I18nHelper = require(path.join(__dirname, '../utils/i18n-helper'));
const SetupEnforcer = require(path.join(__dirname, '../utils/setup-enforcer'));
const { program } = require('commander');

(async () => {
  try {
    await SetupEnforcer.checkSetupCompleteAsync();
  } catch (error) {
    console.error('Setup check failed:', error.message);
    process.exit(1);
  }
})();

class GoI18nManager {
  constructor() {
    this.supportedPatterns = [
      'T("key")',
      'Localize("key")',
      'i18n.T("key")',
      'tr("key")',
      'message.Printer.Printf',
      'i18n.MustLocalize'
    ];
    
    this.fileExtensions = ['.go', '.mod', '.sum'];
    this.resourceFormats = ['.json', '.toml', '.yaml', '.yml'];
  }

  async detectFramework(sourceDir) {
    const goModPath = path.join(sourceDir, 'go.mod');
    if (fs.existsSync(goModPath)) {
      const content = fs.readFileSync(goModPath, 'utf8');
      
      if (content.includes('go-i18n')) return 'go-i18n';
      if (content.includes('nicksnyder/go-i18n')) return 'go-i18n-v2';
      if (content.includes('golang.org/x/text')) return 'golang-text';
      
      return 'standard-go';
    }
    
    // Check for Go files
    const goFiles = this.findFiles(sourceDir, '.go');
    if (goFiles.length > 0) {
      return 'standard-go';
    }
    
    return 'generic';
  }

  async extractTranslations(sourceDir, options = {}) {
    const framework = await this.detectFramework(sourceDir);
    const translations = new Set();
    
    const goFiles = this.findFiles(sourceDir, '.go');
    
    for (const file of goFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Extract Go i18n patterns
      const patterns = [
        /T\("([^"]+)"\)/g,
        /Localize\("([^"]+)"\)/g,
        /i18n\.T\("([^"]+)"\)/g,
        /tr\("([^"]+)"\)/g,
        /message\.Printer\.Printf\("([^"]+)"/g,
        /i18n\.MustLocalize\(&i18n\.LocalizeConfig\{MessageID:\s*"([^"]+)"/g
      ];
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          translations.add(match[1]);
        }
      }
    }
    
    return {
      framework,
      translations: Array.from(translations),
      files: goFiles.length,
      patterns: this.supportedPatterns
    };
  }

  async createLocaleStructure(outputDir, languages = ['en']) {
    const localesDir = path.join(outputDir, 'locales');
    
    for (const lang of languages) {
      const langDir = path.join(localesDir, lang);
      fs.mkdirSync(langDir, { recursive: true });
      
      // Create Go i18n format files
      fs.writeFileSync(path.join(langDir, 'active.en.toml'), `# Go i18n translations for ${lang}
[hello]
other = "Hello, World!"

[items]
one = "{{.Count}} item"
other = "{{.Count}} items"
`);
      
      fs.writeFileSync(path.join(langDir, 'active.en.json'), JSON.stringify({
        hello: "Hello, World!",
        items: {
          one: "{{.Count}} item",
          other: "{{.Count}} items"
        }
      }, null, 2));
    }
    
    return localesDir;
  }

  findFiles(dir, extension) {
    const files = [];
    
    function traverse(currentDir) {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          traverse(fullPath);
        } else if (stat.isFile() && path.extname(item) === extension) {
          files.push(fullPath);
        }
      }
    }
    
    traverse(dir);
    return files;
  }

  async generateReport(results, outputDir) {
    const report = {
      timestamp: new Date().toISOString(),
      framework: results.framework,
      totalTranslations: results.translations.length,
      translations: results.translations,
      filesProcessed: results.files,
      patterns: results.patterns,
      recommendations: this.getRecommendations(results)
    };
    
    const reportPath = path.join(outputDir, 'i18ntk-go-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return reportPath;
  }

  getRecommendations(results) {
    const recommendations = [];
    
    if (results.translations.length === 0) {
      recommendations.push('No translations found. Check your Go i18n patterns');
    }
    
    if (results.files === 0) {
      recommendations.push('No Go files found in source directory');
    }
    
    if (results.framework === 'generic') {
      recommendations.push('Consider using go-i18n library for better i18n support');
    }
    
    return recommendations;
  }
}

// CLI Implementation
program
  .name('i18ntk-go')
  .description('Go language i18n management tool')
  .version('1.9.1');

program
  .command('init')
  .description('Initialize Go i18n structure')
  .option('-s, --source-dir <dir>', 'Source directory', './')
  .option('-o, --output-dir <dir>', 'Output directory', './i18ntk-reports')
  .option('-l, --languages <langs>', 'Languages (comma-separated)', 'en')
  .action(async (options) => {
    try {
      const manager = new GoI18nManager();
      const languages = options.languages.split(',');
      
      const localesDir = await manager.createLocaleStructure(options.outputDir, languages);
      
      console.log(`✅ Go i18n structure initialized in: ${localesDir}`);
      console.log(`📊 Languages: ${languages.join(', ')}`);
      
    } catch (error) {
      console.error('❌ Error initializing Go i18n:', error.message);
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Analyze Go i18n usage')
  .option('-s, --source-dir <dir>', 'Source directory', './')
  .option('-o, --output-dir <dir>', 'Output directory', './i18ntk-reports')
  .option('--dry-run', 'Preview without making changes')
  .action(async (options) => {
    try {
      SecurityUtils.validatePath(options.sourceDir);
      
      const manager = new GoI18nManager();
      const results = await manager.extractTranslations(options.sourceDir);
      
      console.log(`🔍 Framework detected: ${results.framework}`);
      console.log(`📊 Files processed: ${results.files}`);
      console.log(`📝 Translations found: ${results.translations.length}`);
      
      if (!options.dryRun) {
        const reportPath = await manager.generateReport(results, options.outputDir);
        console.log(`📄 Report saved: ${reportPath}`);
      }
      
    } catch (error) {
      console.error('❌ Error analyzing Go i18n:', error.message);
      process.exit(1);
    }
  });

program
  .command('extract')
  .description('Extract Go translations')
  .option('-s, --source-dir <dir>', 'Source directory', './')
  .option('-o, --output-dir <dir>', 'Output directory', './locales')
  .option('-l, --languages <langs>', 'Languages (comma-separated)', 'en')
  .action(async (options) => {
    try {
      SecurityUtils.validatePath(options.sourceDir);
      
      const manager = new GoI18nManager();
      const results = await manager.extractTranslations(options.sourceDir);
      
      await manager.createLocaleStructure(options.outputDir, options.languages.split(','));
      
      console.log(`✅ Extracted ${results.translations.length} translations`);
      console.log(`📁 Locale structure created in: ${options.outputDir}`);
      
    } catch (error) {
      console.error('❌ Error extracting Go translations:', error.message);
      process.exit(1);
    }
  });

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection:', reason);
  process.exit(1);
});

// Export for programmatic use
module.exports = { GoI18nManager };

if (require.main === module) {
  program.parse();
}