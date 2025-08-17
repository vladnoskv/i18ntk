#!/usr/bin/env node

/**
 * i18ntk Python Command
 * Specialized command for Python i18n management
 * 
 * Usage: i18ntk-py [options]
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

class I18ntkPythonCommand {
  constructor() {
    this.config = null;
    this.sourceDir = './locales';
    this.pythonPatterns = [
      /_(?:gettext)?\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
      /gettext\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
      /gettext_lazy\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
      /ngettext\s*\(\s*["'`]([^"'`]+)["'`]\s*,/g,
      /lazy_gettext\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
      /ugettext\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g
    ];
  }

  async init() {
    console.log('🔧 Initializing i18ntk Python command...');
    
    const options = {
      'source-dir': { type: 'string', default: './' },
      'locales-dir': { type: 'string', default: './locales' },
      'framework': { type: 'string', default: 'auto' },
      'dry-run': { type: 'boolean', default: false },
      'debug': { type: 'boolean', default: false },
      'extract-only': { type: 'boolean', default: false },
      'django': { type: 'boolean', default: false },
      'flask': { type: 'boolean', default: false },
      'generic': { type: 'boolean', default: false },
      'help': { type: 'boolean', default: false },
      'version': { type: 'boolean', default: false }
    };

    try {
      const { values } = parseArgs({ args: process.argv.slice(2), options, allowPositionals: true });
      this.options = values;
    } catch (error) {
      console.error('Error parsing arguments:', error.message);
      this.showHelp();
      process.exit(1);
    }

    if (this.options.help) {
      this.showHelp();
      process.exit(0);
    }

    if (this.options.version) {
      console.log('i18ntk-py v1.10.0');
      process.exit(0);
    }

    this.sourceDir = path.resolve(this.options.sourceDir);
    this.localesDir = path.resolve(this.options.localesDir);
    
    await this.validateSourceDir();
    await this.loadConfig();
  }

  async validateSourceDir() {
    if (!fs.existsSync(this.sourceDir)) {
      console.error(`❌ Source directory not found: ${this.sourceDir}`);
      process.exit(1);
    }

    const stats = fs.statSync(this.sourceDir);
    if (!stats.isDirectory()) {
      console.error(`❌ Source path is not a directory: ${this.sourceDir}`);
      process.exit(1);
    }
  }

  async loadConfig() {
    try {
      this.config = await getConfig();
      this.config.python = this.config.python || {};
    } catch (error) {
      console.warn('⚠️  Could not load config, using defaults');
      this.config = { python: {} };
    }
  }

  async detectFramework() {
    if (this.options.django) return 'django';
    if (this.options.flask) return 'flask';
    if (this.options.generic) return 'generic';
    
    console.log('🔍 Detecting Python framework...');
    
    // Check for Django
    const djangoIndicators = [
      'manage.py',
      'settings.py',
      'requirements.txt',
      'django'
    ];

    // Check for Flask
    const flaskIndicators = [
      'app.py',
      'requirements.txt',
      'flask'
    ];

    let framework = 'generic';

    try {
      // Check requirements.txt
      const requirementsPath = path.join(this.sourceDir, 'requirements.txt');
      if (fs.existsSync(requirementsPath)) {
        const requirements = fs.readFileSync(requirementsPath, 'utf8');
        if (requirements.includes('Django')) framework = 'django';
        else if (requirements.includes('Flask')) framework = 'flask';
      }

      // Check for Django files
      for (const indicator of djangoIndicators) {
        if (this.findFiles(indicator).length > 0) {
          framework = 'django';
          break;
        }
      }

      // Check for Flask files
      for (const indicator of flaskIndicators) {
        if (this.findFiles(indicator).length > 0) {
          framework = 'flask';
          break;
        }
      }

    } catch (error) {
      if (this.options.debug) {
        console.error('Debug: Framework detection error:', error.message);
      }
    }

    console.log(`✅ Detected framework: ${framework}`);
    return framework;
  }

  findFiles(pattern) {
    const results = [];
    
    function scanDir(dir) {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scanDir(fullPath);
        } else if (item.includes(pattern) || fullPath.includes(pattern)) {
          results.push(fullPath);
        }
      }
    }
    
    scanDir(this.sourceDir);
    return results;
  }

  async extractTranslations() {
    console.log('📦 Extracting Python translations...');
    
    const pythonFiles = this.findFiles('.py');
    const translations = new Set();
    
    for (const file of pythonFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        for (const pattern of this.pythonPatterns) {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            translations.add(match[1]);
          }
        }
        
        // Reset regex state for next file
        for (const pattern of this.pythonPatterns) {
          pattern.lastIndex = 0;
        }
        
      } catch (error) {
        if (this.options.debug) {
          console.error(`Error reading ${file}:`, error.message);
        }
      }
    }

    console.log(`📊 Found ${translations.size} unique translation keys`);
    return Array.from(translations);
  }

  showHelp() {
    console.log(`
🔧 i18ntk-py - Python I18n Management Tool
=========================================

Usage: node i18ntk-py.js [options]

Options:
  -s, --source-dir <dir>     Source directory to scan (default: ./)
  -l, --locales-dir <dir>    Locales directory (default: ./locales)
  --framework <type>         Python framework type (auto|django|flask|generic, default: auto)
  --dry-run                  Show what would be done without making changes
  --debug                    Enable debug output
  --extract-only             Only extract translations, don't analyze
  --django                   Force Django mode
  --flask                    Force Flask mode
  --generic                  Force generic Python mode
  --help                     Show this help message
  --version                  Show version information

Examples:
  node i18ntk-py.js --source-dir ./src --locales-dir ./i18n --framework django
  node i18ntk-py.js --dry-run --debug
`);
  }

  async createLocaleStructure() {
    if (!fs.existsSync(this.localesDir)) {
      if (this.options.dryRun) {
        console.log(`📁 Would create directory: ${this.localesDir}`);
        return;
      }
      
      fs.mkdirSync(this.localesDir, { recursive: true });
      console.log(`📁 Created locales directory: ${this.localesDir}`);
    }

    const languages = ['en', 'es', 'fr', 'de', 'ja', 'ru', 'zh'];
    
    for (const lang of languages) {
      const langDir = path.join(this.localesDir, lang);
      if (!fs.existsSync(langDir)) {
        if (this.options.dryRun) {
          console.log(`📁 Would create directory: ${langDir}`);
          continue;
        }
        
        fs.mkdirSync(langDir, { recursive: true });
        
        // Create basic translation files
        const commonFile = path.join(langDir, 'common.json');
        const initialContent = {
          "python": {
            "welcome": `Welcome to Python (${lang})`,
            "framework_detected": `Framework detected: ${framework}`,
            "files_processed": `Processed ${count} files`
          }
        };
        
        fs.writeFileSync(commonFile, JSON.stringify(initialContent, null, 2));
      }
    }
  }

  async analyzeFramework(framework) {
    console.log(`🔍 Analyzing ${framework} project...`);
    
    const analysis = {
      framework,
      files: {
        total: 0,
        python: 0,
        templates: 0,
        config: 0
      },
      patterns: {
        gettext: 0,
        gettext_lazy: 0,
        ngettext: 0,
        django: 0,
        flask: 0
      },
      recommendations: []
    };

    // Count Python files
    const pythonFiles = this.findFiles('.py');
    analysis.files.python = pythonFiles.length;
    analysis.files.total += pythonFiles.length;

    // Count template files
    const templateExtensions = ['.html', '.jinja', '.j2'];
    let templateFiles = [];
    for (const ext of templateExtensions) {
      templateFiles = templateFiles.concat(this.findFiles(ext));
    }
    analysis.files.templates = templateFiles.length;
    analysis.files.total += templateFiles.length;

    // Analyze patterns
    for (const file of pythonFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        if (content.includes('gettext(')) analysis.patterns.gettext++;
        if (content.includes('gettext_lazy(')) analysis.patterns.gettext_lazy++;
        if (content.includes('ngettext(')) analysis.patterns.ngettext++;
        if (content.includes('django')) analysis.patterns.django++;
        if (content.includes('flask')) analysis.patterns.flask++;
        
      } catch (error) {
        // Skip unreadable files
      }
    }

    // Generate recommendations
    if (framework === 'django' && analysis.patterns.gettext === 0) {
      analysis.recommendations.push('Consider adding Django gettext for i18n support');
    }
    
    if (framework === 'flask' && analysis.patterns.gettext === 0) {
      analysis.recommendations.push('Consider adding Flask-Babel for i18n support');
    }

    return analysis;
  }

  async generateReport(analysis, translations) {
    const report = {
      timestamp: new Date().toISOString(),
      framework: analysis.framework,
      summary: {
        totalFiles: analysis.files.total,
        pythonFiles: analysis.files.python,
        templateFiles: analysis.files.templates,
        translationKeys: translations.length
      },
      patterns: analysis.patterns,
      recommendations: analysis.recommendations,
      files: {
        python: this.findFiles('.py'),
        templates: this.findFiles('.html').concat(this.findFiles('.jinja')).concat(this.findFiles('.j2'))
      },
      translations: translations.sort()
    };

    const reportPath = path.join(this.sourceDir, 'i18ntk-py-report.json');
    
    if (this.options.dryRun) {
      console.log(`📊 Would create report: ${reportPath}`);
      console.log('📋 Report contents:', JSON.stringify(report, null, 2));
    } else {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📊 Report saved: ${reportPath}`);
    }

    return report;
  }

  async run() {
    try {
      console.log('🚀 i18ntk Python Command v1.9.1');
      console.log('=' * 50);
      
      await this.init();
      
      const framework = await this.detectFramework();
      const translations = await this.extractTranslations();
      
      if (!this.options.extractOnly) {
        await this.createLocaleStructure();
        const analysis = await this.analyzeFramework(framework);
        const report = await this.generateReport(analysis, translations);
        
        console.log('\n✅ Analysis complete!');
        console.log(`📊 Framework: ${framework}`);
        console.log(`📄 Python files: ${analysis.files.python}`);
        console.log(`🎯 Translation keys: ${translations.length}`);
        console.log(`📋 Report: ${this.options.dryRun ? 'Not saved (dry-run)' : 'Saved to i18ntk-py-report.json'}`);
      } else {
        console.log(`📦 Extracted ${translations.length} translation keys`);
      }
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      if (this.options.debug) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const cmd = new I18ntkPythonCommand();
  cmd.run();
}

module.exports = I18ntkPythonCommand;