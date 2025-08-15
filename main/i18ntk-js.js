#!/usr/bin/env node

/**
 * i18ntk JavaScript/TypeScript Command
 * Specialized command for JavaScript and TypeScript i18n management
 * 
 * Usage: i18ntk-js [options]
 */

const fs = require('fs');
const path = require('path');
const SecurityUtils = require(path.join(__dirname, '../utils/security.js'));
const { getConfig, saveConfig } = require(path.join(__dirname, '../utils/config-helper.js'));
const I18nHelper = require(path.join(__dirname, '../utils/i18n-helper.js'));
const SetupEnforcer = require(path.join(__dirname, '../utils/setup-enforcer'));
const { program } = require('commander');

SetupEnforcer.checkSetupComplete();

class I18ntkJavaScriptCommand {
  constructor() {
    this.config = null;
    this.sourceDir = './src';
    this.jsPatterns = [
      // JavaScript/TypeScript patterns
      /i18n\.t\s*\(\s*["'`]([^"'`]+)["'`]/g,
      /t\s*\(\s*["'`]([^"'`]+)["'`]/g,
      /translate\s*\(\s*["'`]([^"'`]+)["'`]/g,
      /formatMessage\s*\(\s*{[^}]*id:\s*["'`]([^"'`]+)["'`]/g,
      /intl\.formatMessage\s*\(\s*{[^}]*id:\s*["'`]([^"'`]+)["'`]/g,
      /useTranslations?\s*\(\s*["'`]([^"'`]+)["'`]/g,
      /getTranslations?\s*\(\s*["'`]([^"'`]+)["'`]/g,
      
      // React patterns
      /FormattedMessage\s+id=["'`]([^"'`]+)["'`]/g,
      /<FormattedMessage[^>]*id={["'`]([^"'`]+)["'`]}/g,
      /useTranslation\(\)\s*\.t\s*\(\s*["'`]([^"'`]+)["'`]/g,
      
      // Angular patterns
      /translate\s*\|\s*translate/g,
      /\{\{\s*["'`]([^"'`]+)["'`]\s*\|\s*translate\s*}}/g,
      
      // Vue patterns
      /\$t\s*\(\s*["'`]([^"'`]+)["'`]/g,
      /this\.\$t\s*\(\s*["'`]([^"'`]+)["'`]/g,
      
      // Node.js patterns
      /__\s*\(\s*["'`]([^"'`]+)["'`]/g,
      /gettext\s*\(\s*["'`]([^"'`]+)["'`]/g,
      
      // Template literal patterns
      /i18n\.t\s*\(\s*`([^`]+)`/g,
      /t\s*\(\s*`([^`]+)`/g
    ];
    
    this.frameworks = {
      react: {
        indicators: ['package.json', 'react', 'react-dom'],
        patterns: ['useTranslation', 'FormattedMessage', 'react-intl']
      },
      vue: {
        indicators: ['package.json', 'vue', 'vue-i18n'],
        patterns: ['$t', 'vue-i18n', 'i18n']
      },
      angular: {
        indicators: ['package.json', '@angular/core', '@ngx-translate'],
        patterns: ['translate', '@ngx-translate/core']
      },
      node: {
        indicators: ['package.json', 'express', 'i18n'],
        patterns: ['__', 'gettext', 'i18n']
      }
    };
  }

  async init() {
    console.log('🔧 Initializing i18ntk JavaScript/TypeScript command...');
    
    program
      .name('i18ntk-js')
      .description('i18ntk specialized for JavaScript and TypeScript applications')
      .version('1.9.1')
      .option('-s, --source-dir <dir>', 'Source directory to scan', './src')
      .option('-l, --locales-dir <dir>', 'Locales directory', './locales')
      .option('--framework <type>', 'JavaScript framework type', 'auto')
      .option('--typescript', 'Include TypeScript files')
      .option('--react', 'Force React mode')
      .option('--vue', 'Force Vue mode')
      .option('--angular', 'Force Angular mode')
      .option('--node', 'Force Node.js mode')
      .option('--dry-run', 'Show what would be done without making changes')
      .option('--debug', 'Enable debug output')
      .option('--extract-only', 'Only extract translations, don\'t analyze')
      .option('--include-tests', 'Include test files in analysis')
      .parse();

    this.options = program.opts();
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
      this.config.javascript = this.config.javascript || {};
    } catch (error) {
      console.warn('⚠️  Could not load config, using defaults');
      this.config = { javascript: {} };
    }
  }

  async detectFramework() {
    if (this.options.react) return 'react';
    if (this.options.vue) return 'vue';
    if (this.options.angular) return 'angular';
    if (this.options.node) return 'node';
    
    console.log('🔍 Detecting JavaScript framework...');
    
    let framework = 'generic';

    try {
      const packageJsonPath = path.join(this.sourceDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        const dependencies = {
          ...packageJson.dependencies || {},
          ...packageJson.devDependencies || {}
        };

        // Check for React
        if (dependencies.react && dependencies['react-dom']) {
          framework = 'react';
        }
        // Check for Vue
        else if (dependencies.vue && dependencies['vue-i18n']) {
          framework = 'vue';
        }
        // Check for Angular
        else if (dependencies['@angular/core'] || dependencies['@ngx-translate/core']) {
          framework = 'angular';
        }
        // Check for Node.js
        else if (dependencies.express || dependencies.i18n || dependencies['i18next']) {
          framework = 'node';
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

  findFiles(pattern, extensions = []) {
    const results = [];
    const validExtensions = extensions.length > 0 ? extensions : ['.js', '.jsx', '.ts', '.tsx'];
    
    function scanDir(dir) {
      if (!fs.existsSync(dir)) return;
      
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules and hidden directories
          if (item === 'node_modules' || item.startsWith('.')) continue;
          
          // Skip test directories unless explicitly included
          if (!this.options.includeTests && 
              (item === '__tests__' || item === 'test' || item === 'tests' || item.includes('.test.'))) {
            continue;
          }
          
          scanDir.call(this, fullPath);
        } else {
          // Check file extension
          const ext = path.extname(item);
          if (validExtensions.includes(ext)) {
            // Skip test files unless explicitly included
            if (!this.options.includeTests && 
                (item.includes('.test.') || item.includes('.spec.') || item.includes('__test__'))) {
              continue;
            }
            
            results.push(fullPath);
          }
        }
      }
    }
    
    scanDir.call(this, this.sourceDir);
    return results;
  }

  async extractTranslations() {
    console.log('📦 Extracting JavaScript/TypeScript translations...');
    
    const extensions = this.options.typescript 
      ? ['.js', '.jsx', '.ts', '.tsx'] 
      : ['.js', '.jsx'];
    
    const jsFiles = this.findFiles('', extensions);
    const translations = new Set();
    
    for (const file of jsFiles) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        
        for (const pattern of this.jsPatterns) {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            translations.add(match[1]);
          }
        }
        
        // Reset regex state for next file
        for (const pattern of this.jsPatterns) {
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
        
        // Create framework-specific translation files
        const commonFile = path.join(langDir, 'common.json');
        const initialContent = {
          "javascript": {
            "welcome": `Welcome to JavaScript (${lang})`,
            "framework_detected": "Framework detected: {framework}",
            "files_processed": "Processed {count} files",
            "keys_found": "Found {count} translation keys"
          },
          "components": {
            "button": {
              "submit": "Submit",
              "cancel": "Cancel",
              "save": "Save"
            },
            "form": {
              "validation": {
                "required": "This field is required",
                "invalid": "Invalid format"
              }
            }
          }
        };
        
        fs.writeFileSync(commonFile, JSON.stringify(initialContent, null, 2));
      }
    }
  }

  async analyzeFramework(framework) {
    console.log(`🔍 Analyzing ${framework} project...`);
    
    const extensions = this.options.typescript 
      ? ['.js', '.jsx', '.ts', '.tsx'] 
      : ['.js', '.jsx'];
    
    const jsFiles = this.findFiles('', extensions);
    
    const analysis = {
      framework,
      typescript: this.options.typescript || false,
      files: {
        total: jsFiles.length,
        javascript: 0,
        typescript: 0,
        jsx: 0,
        tsx: 0,
        test: 0
      },
      patterns: {
        i18n_t: 0,
        t_function: 0,
        useTranslation: 0,
        FormattedMessage: 0,
        translate: 0,
        $t: 0,
        gettext: 0
      },
      frameworks: {
        react: false,
        vue: false,
        angular: false,
        node: false
      },
      recommendations: [],
      dependencies: []
    };

    // Analyze files
    for (const file of jsFiles) {
      const ext = path.extname(file);
      if (ext === '.js') analysis.files.javascript++;
      else if (ext === '.ts') analysis.files.typescript++;
      else if (ext === '.jsx') analysis.files.jsx++;
      else if (ext === '.tsx') analysis.files.tsx++;
      
      if (file.includes('.test.') || file.includes('.spec.')) {
        analysis.files.test++;
      }

      try {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check patterns
        if (content.includes('i18n.t(')) analysis.patterns.i18n_t++;
        if (content.includes('t(')) analysis.patterns.t_function++;
        if (content.includes('useTranslation')) analysis.patterns.useTranslation++;
        if (content.includes('FormattedMessage')) analysis.patterns.FormattedMessage++;
        if (content.includes('translate')) analysis.patterns.translate++;
        if (content.includes('$t(')) analysis.patterns.$t++;
        if (content.includes('gettext(')) analysis.patterns.gettext++;
        
        // Detect frameworks
        if (content.includes('import React') || content.includes('require("react")')) {
          analysis.frameworks.react = true;
        }
        if (content.includes('Vue') || content.includes('vue-i18n')) {
          analysis.frameworks.vue = true;
        }
        if (content.includes('@angular') || content.includes('@ngx-translate')) {
          analysis.frameworks.angular = true;
        }
        if (content.includes('express') || content.includes('node')) {
          analysis.frameworks.node = true;
        }
        
      } catch (error) {
        // Skip unreadable files
      }
    }

    // Generate recommendations
    if (analysis.files.total > 0 && analysis.patterns.i18n_t === 0) {
      analysis.recommendations.push('Consider adding i18n support to your JavaScript/TypeScript files');
    }
    
    if (analysis.frameworks.react && analysis.patterns.FormattedMessage === 0) {
      analysis.recommendations.push('Consider using react-intl or react-i18next for React i18n');
    }
    
    if (analysis.frameworks.vue && analysis.patterns.$t === 0) {
      analysis.recommendations.push('Consider using vue-i18n for Vue.js i18n');
    }

    // Check package.json for dependencies
    try {
      const packageJsonPath = path.join(this.sourceDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        for (const [pkg, version] of Object.entries(deps)) {
          if (pkg.includes('i18n') || pkg.includes('intl') || pkg.includes('translate')) {
            analysis.dependencies.push(`${pkg}@${version}`);
          }
        }
      }
    } catch (error) {
      // Skip package.json analysis errors
    }

    return analysis;
  }

  async generateReport(analysis, translations) {
    const report = {
      timestamp: new Date().toISOString(),
      framework: analysis.framework,
      typescript: analysis.typescript,
      summary: {
        totalFiles: analysis.files.total,
        javascriptFiles: analysis.files.javascript,
        typescriptFiles: analysis.files.typescript,
        jsxFiles: analysis.files.jsx,
        tsxFiles: analysis.files.tsx,
        testFiles: analysis.files.test,
        translationKeys: translations.length
      },
      patterns: analysis.patterns,
      frameworks: analysis.frameworks,
      dependencies: analysis.dependencies,
      recommendations: analysis.recommendations,
      files: {
        javascript: this.findFiles('', ['.js']),
        typescript: this.findFiles('', ['.ts']),
        jsx: this.findFiles('', ['.jsx']),
        tsx: this.findFiles('', ['.tsx'])
      },
      translations: translations.sort()
    };

    const reportPath = path.join(this.sourceDir, 'i18ntk-js-report.json');
    
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
      console.log('🚀 i18ntk JavaScript/TypeScript Command v1.9.1');
      console.log('=' * 60);
      
      await this.init();
      
      const framework = await this.detectFramework();
      const translations = await this.extractTranslations();
      
      if (!this.options.extractOnly) {
        await this.createLocaleStructure();
        const analysis = await this.analyzeFramework(framework);
        const report = await this.generateReport(analysis, translations);
        
        console.log('\n✅ Analysis complete!');
        console.log(`📊 Framework: ${framework}`);
        console.log(`📄 Total files: ${analysis.files.total}`);
        console.log(`🎯 Translation keys: ${translations.length}`);
        console.log(`📋 Report: ${this.options.dryRun ? 'Not saved (dry-run)' : 'Saved to i18ntk-js-report.json'}`);
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
  const cmd = new I18ntkJavaScriptCommand();
  cmd.run();
}

module.exports = I18ntkJavaScriptCommand;