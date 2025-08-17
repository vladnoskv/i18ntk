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
const { parseArgs } = require('util');

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
    SecurityUtils.safeWriteFileSync(reportPath, JSON.stringify(report, null, 2), process.cwd());
    
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
function parseArguments(args) {
  const options = {
    'init': { type: 'boolean', default: false },
    'analyze': { type: 'boolean', default: false },
    'extract': { type: 'boolean', default: false },
    'source-dir': { type: 'string', default: './' },
    'output-dir': { type: 'string', default: './i18ntk-reports' },
    'locales-dir': { type: 'string', default: './locales' },
    'languages': { type: 'string', default: 'en' },
    'dry-run': { type: 'boolean', default: false },
    'help': { type: 'boolean', default: false },
    'version': { type: 'boolean', default: false }
  };

  try {
    const { values } = parseArgs({ args, options, allowPositionals: true });
    return values;
  } catch (error) {
    console.error('Error parsing arguments:', error.message);
    showHelp();
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
🔧 i18ntk-go - Go Language I18n Management Tool
=============================================

Usage: node i18ntk-go.js [command] [options]

Commands:
  init                       Initialize Go i18n structure
  analyze                    Analyze Go i18n usage
  extract                    Extract Go translations

Options:
  -s, --source-dir <dir>     Source directory (default: ./)
  -o, --output-dir <dir>     Output directory for reports (default: ./i18ntk-reports)
  --locales-dir <dir>        Output directory for locales (default: ./locales)
  -l, --languages <langs>    Languages (comma-separated, default: en)
  --dry-run                  Preview without making changes
  --help                     Show this help message
  --version                  Show version information

Examples:
  node i18ntk-go.js init --languages en,es,fr
  node i18ntk-go.js analyze --source-dir ./src --dry-run
  node i18ntk-go.js extract --source-dir ./src --locales-dir ./i18n
`);
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArguments(args);

  if (options.help) {
    showHelp();
    return;
  }

  if (options.version) {
    console.log('i18ntk-go v1.10.0');
    return;
  }

  // Determine command
  let command = null;
  if (options.init) {
    command = 'init';
  } else if (options.analyze) {
    command = 'analyze';
  } else if (options.extract) {
    command = 'extract';
  } else if (args[0] === 'init') {
    command = 'init';
  } else if (args[0] === 'analyze') {
    command = 'analyze';
  } else if (args[0] === 'extract') {
    command = 'extract';
  } else {
    showHelp();
    return;
  }

  const manager = new GoI18nManager();

  try {
    if (command === 'init') {
      const languages = options.languages.split(',');
      const localesDir = await manager.createLocaleStructure(options.outputDir, languages);
      
      console.log(`✅ Go i18n structure initialized in: ${localesDir}`);
      console.log(`📊 Languages: ${languages.join(', ')}`);
    } else if (command === 'analyze') {
      SecurityUtils.validatePath(options.sourceDir);
      
      const results = await manager.extractTranslations(options.sourceDir);
      
      console.log(`🔍 Framework detected: ${results.framework}`);
      console.log(`📊 Files processed: ${results.files}`);
      console.log(`📝 Translations found: ${results.translations.length}`);
      
      if (!options.dryRun) {
        const reportPath = await manager.generateReport(results, options.outputDir);
        console.log(`📄 Report saved: ${reportPath}`);
      }
    } else if (command === 'extract') {
      SecurityUtils.validatePath(options.sourceDir);
      
      const results = await manager.extractTranslations(options.sourceDir);
      
      await manager.createLocaleStructure(options.localesDir, options.languages.split(','));
      
      console.log(`✅ Extracted ${results.translations.length} translations`);
      console.log(`📁 Locale structure created in: ${options.localesDir}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

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
  main();
}