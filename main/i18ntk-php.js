#!/usr/bin/env node

/**
 * i18ntk-php.js - PHP Language I18n Management Command
 * 
 * Supports:
 * - Laravel i18n
 * - Symfony translations
 * - WordPress i18n
 * - Standard PHP gettext
 * - PHP array translations
 * - JSON translations
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

class PhpI18nManager {
  constructor() {
    this.supportedPatterns = [
      '__(',
      '_e(',
      '_n(',
      '_x(',
      '_ex(',
      '_nx(',
      'trans(',
      'trans_choice(',
      'Lang::get(',
      'Lang::choice(',
      '$this->trans(',
      'Yii::t(',
      '$this->t(',
      'dgettext(',
      'dngettext(',
      'dcgettext(',
      'ngettext(',
      'gettext('
    ];
    
    this.fileExtensions = ['.php', '.blade.php', '.twig', '.phtml', '.module', '.theme'];
    this.resourceFormats = ['.php', '.json', '.yml', '.yaml', '.po', '.mo'];
  }

  async detectFramework(sourceDir) {
    // Check for Laravel
    const composerJson = path.join(sourceDir, 'composer.json');
    if (SecurityUtils.safeExistsSync(composerJson)) {
      const content = SecurityUtils.safeReadFileSync(composerJson, 'utf8');
      const composer = JSON.parse(content);
      
      if (composer.require && composer.require['laravel/framework']) {
        return 'laravel';
      }
      
      if (composer.require && composer.require['symfony/framework-bundle']) {
        return 'symfony';
      }
      
      if (composer.require && composer.require['yiisoft/yii2']) {
        return 'yii2';
      }
      
      if (composer.require && composer.require['wordpress/wordpress']) {
        return 'wordpress';
      }
    }
    
    // Check for WordPress
    const wpConfig = path.join(sourceDir, 'wp-config.php');
    if (SecurityUtils.safeExistsSync(wpConfig)) {
      return 'wordpress';
    }
    
    // Check for standard PHP
    const phpFiles = this.findFiles(sourceDir, '.php');
    if (phpFiles.length > 0) {
      return 'standard-php';
    }
    
    return 'generic';
  }

  async extractTranslations(sourceDir, options = {}) {
    const framework = await this.detectFramework(sourceDir);
    const translations = new Set();
    
    // Process PHP files
    const phpFiles = [
      ...this.findFiles(sourceDir, '.php'),
      ...this.findFiles(sourceDir, '.blade.php'),
      ...this.findFiles(sourceDir, '.twig'),
      ...this.findFiles(sourceDir, '.phtml')
    ];
    
    for (const file of phpFiles) {
      const content = SecurityUtils.safeReadFileSync(file, 'utf8');
      
      // Extract PHP i18n patterns
      const patterns = [
        /__\(\s*["']([^"']+)["']/g,
        /_e\(\s*["']([^"']+)["']/g,
        /_n\(\s*["']([^"']+)["']/g,
        /_x\(\s*["']([^"']+)["']/g,
        /trans\(\s*["']([^"']+)["']/g,
        /trans_choice\(\s*["']([^"']+)["']/g,
        /Lang::get\(\s*["']([^"']+)["']/g,
        /Lang::choice\(\s*["']([^"']+)["']/g,
        /Yii::t\(\s*["']([^"']+)["']/g,
        /gettext\(\s*["']([^"']+)["']/g,
        /dgettext\(\s*["']([^"']+)["']/g,
        /ngettext\(\s*["']([^"']+)["']/g,
        /dngettext\(\s*["']([^"']+)["']/g
      ];
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          translations.add(match[1]);
        }
      }
      
      // Blade template patterns
      const bladePatterns = [
        /@lang\(['"]([^'"]+)['"]\)/g,
        /@choice\(['"]([^'"]+)['"]\)/g,
        /{{\s*__\(['"]([^'"]+)['"]\)\s*}}/g,
        /{{\s*trans\(['"]([^'"]+)['"]\)\s*}}/g
      ];
      
      for (const pattern of bladePatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          translations.add(match[1]);
        }
      }
    }
    
    // Process translation files
    const translationFiles = [
      ...this.findFiles(sourceDir, '.php'),
      ...this.findFiles(sourceDir, '.json'),
      ...this.findFiles(sourceDir, '.yml'),
      ...this.findFiles(sourceDir, '.yaml')
    ];
    
    for (const file of translationFiles) {
      if (file.includes('lang') || file.includes('translations') || file.includes('i18n')) {
        try {
          const content = SecurityUtils.safeReadFileSync(file, 'utf8');
          
          if (file.endsWith('.php')) {
            // PHP array translations
            const arrayPattern = /['"]([^'"]+)['"]\s*=>/g;
            let match;
            while ((match = arrayPattern.exec(content)) !== null) {
              translations.add(match[1]);
            }
          } else if (file.endsWith('.json')) {
            // JSON translations
            try {
              const data = JSON.parse(content);
              const keys = this.extractKeysFromObject(data);
              keys.forEach(key => translations.add(key));
            } catch (parseError) {
              console.warn(`Skipping invalid JSON file: ${file}`);
            }
          } else if (file.endsWith('.yml') || file.endsWith('.yaml')) {
            // YAML translations (improved parsing)
            try {
              const lines = content.split('\n');
              let currentIndent = 0;
              let keyStack = [];
              
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                
                const indent = line.search(/\S/);
                const colonIndex = trimmed.indexOf(':');
                
                if (colonIndex > -1) {
                  let key = trimmed.substring(0, colonIndex).trim();
                  
                  // Handle nested keys
                  if (indent < currentIndent) {
                    keyStack = keyStack.slice(0, Math.floor(indent / 2));
                  }
                  
                  const fullKey = [...keyStack, key].join('.');
                  translations.add(fullKey);
                  
                  if (indent > currentIndent || (indent === currentIndent && keyStack.length > 0)) {
                    keyStack.push(key);
                  }
                  
                  currentIndent = indent;
                }
              }
            } catch (parseError) {
              console.warn(`Skipping invalid YAML file: ${file}`);
            }
          }
        } catch (error) {
          console.warn(`Error processing file ${file}:`, error.message);
        }
      }
    }
    
    return {
      framework,
      translations: Array.from(translations),
      files: phpFiles.length + translationFiles.length,
      patterns: this.supportedPatterns
    };
  }

  extractKeysFromObject(obj, prefix = '') {
    const keys = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.push(fullKey);
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys.push(...this.extractKeysFromObject(value, fullKey));
      }
    }
    
    return keys;
  }

  async createLocaleStructure(outputDir, languages = ['en'], framework = 'standard-php') {
    const localesDir = path.join(outputDir, 'locales');
    
    try {
      // Ensure locales directory exists
      await fs.promises.mkdir(localesDir, { recursive: true });
      
      for (const lang of languages) {
        const langDir = path.join(localesDir, lang);
        await fs.promises.mkdir(langDir, { recursive: true });
        
        if (framework === 'laravel') {
          // Laravel structure
          const messagesContent = `<?php
// Laravel i18n for ${lang}
return [
    'hello' => 'Hello, World!',
    'items' => [
        'one' => ':count item',
        'other' => ':count items'
    ],
    'welcome' => 'Welcome to our application'
];
`;
          const validationContent = `<?php
// Laravel validation messages for ${lang}
return [
    'required' => 'The :attribute field is required.',
    'email' => 'The :attribute must be a valid email address.',
    'unique' => 'The :attribute has already been taken.'
];
`;
          
          SecurityUtils.safeWriteFileSync(path.join(langDir, 'messages.php'), messagesContent, process.cwd());
          SecurityUtils.safeWriteFileSync(path.join(langDir, 'validation.php'), validationContent, process.cwd());
          const validatorsContent = `<?php
// Laravel validation messages for ${lang}
return [
    'required' => 'The :attribute field is required.',
    'email' => 'The :attribute must be a valid email address.',
    'unique' => 'The :attribute has already been taken.'
];
`;
          SecurityUtils.safeWriteFileSync(path.join(langDir, 'validators.php'), validatorsContent, process.cwd());

        } else if (framework === 'symfony') {
          // Symfony structure
          const messagesContent = `# Symfony i18n for ${lang}
    hello: "Hello, World!"
    items:
      one: "%count% item"
      other: "%count% items"
    welcome: "Welcome to our application"
    `;
          const validatorsContent = `# Symfony validation for ${lang}
    required: "The {{ field }} field is required."
    email: "The {{ field }} must be a valid email address."
    unique: "The {{ field }} has already been taken."
    `;
          
          SecurityUtils.safeWriteFileSync(path.join(langDir, 'messages.yml'), messagesContent, process.cwd());
          SecurityUtils.safeWriteFileSync(path.join(langDir, 'validators.yml'), validatorsContent, process.cwd());
          
        } else {
          // Standard PHP
          const messagesContent = `<?php
    // PHP i18n for ${lang}
    return [
        'hello' => 'Hello, World!',
        'items' => [
            'one' => '{0} item',
            'other' => '{0} items'
        ],
        'welcome' => 'Welcome to our application'
    ];
    `;
          
          const messagesJson = JSON.stringify({
            hello: "Hello, World!",
            items: {
              one: "{0} item",
              other: "{0} items"
            },
            welcome: "Welcome to our application"
          }, null, 2);
          
          SecurityUtils.safeWriteFileSync(path.join(langDir, 'messages.php'), messagesContent, process.cwd());
          SecurityUtils.safeWriteFileSync(path.join(langDir, 'messages.json'), messagesJson, process.cwd());
        }
      }
      
      return localesDir;
    } catch (error) {
      throw new Error(`Failed to create locale structure: ${error.message}`);
    }
  }

  findFiles(dir, extension) {
    const files = [];
    
    function traverse(currentDir) {
      if (!SecurityUtils.safeExistsSync(currentDir)) return;
      
      const items = SecurityUtils.safeReaddirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        try {
          const stat = SecurityUtils.safeStatSync(fullPath);
          
          if (stat.isDirectory() && !item.startsWith('.') && 
              !['node_modules', 'vendor', 'cache', 'storage'].includes(item)) {
            traverse(fullPath);
          } else if (stat.isFile() && path.extname(item) === extension) {
            files.push(fullPath);
          }
        } catch (error) {
          // Skip files we can't access
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
    
    const reportPath = path.join(outputDir, 'i18ntk-php-report.json');
    SecurityUtils.safeWriteFileSync(reportPath, JSON.stringify(report, null, 2), process.cwd());
    
    return reportPath;
  }

  getRecommendations(results) {
    const recommendations = [];
    
    if (results.translations.length === 0) {
      recommendations.push('No translations found. Check your PHP i18n patterns');
    }
    
    if (results.files === 0) {
      recommendations.push('No PHP files found in source directory');
    }
    
    if (results.framework === 'generic') {
      recommendations.push('Consider using Laravel or Symfony for better i18n support');
    }
    
    if (results.framework === 'wordpress') {
      recommendations.push('Use WordPress i18n functions (__(), _e(), _n()) for consistency');
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
    'languages': { type: 'string', default: 'en' },
    'framework': { type: 'string', default: 'standard-php' },
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
🔧 i18ntk-php - PHP Language I18n Management Tool
===============================================

Usage: node i18ntk-php.js [command] [options]

Commands:
  init                       Initialize PHP i18n structure
  analyze                    Analyze PHP i18n usage
  extract                    Extract PHP translations

Options:
  -s, --source-dir <dir>     Source directory (default: ./)
  -o, --output-dir <dir>     Output directory (default: ./i18ntk-reports)
  -l, --languages <langs>    Languages (comma-separated, default: en)
  -f, --framework <type>     Framework (laravel|symfony|wordpress|standard, default: standard-php)
  --dry-run                  Preview without making changes
  --help                     Show this help message
  --version                  Show version information

Examples:
  node i18ntk-php.js init --languages en,es,fr --framework laravel
  node i18ntk-php.js analyze --source-dir ./src --dry-run
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
    console.log('i18ntk-php v1.10.0');
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

  const manager = new PhpI18nManager();

  try {
    if (command === 'init') {
      const languages = options.languages.split(',');
      const localesDir = await manager.createLocaleStructure(options.outputDir, languages, options.framework);
      
      console.log(`✅ PHP i18n structure initialized in: ${localesDir}`);
      console.log(`📊 Languages: ${languages.join(', ')}`);
      console.log(`🎯 Framework: ${options.framework}`);
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
      
      await manager.createLocaleStructure(options.outputDir, options.languages.split(','), options.framework);
      
      console.log(`✅ Extracted ${results.translations.length} translations`);
      console.log(`📁 Locale structure created in: ${options.outputDir}`);
      console.log(`🎯 Framework: ${options.framework}`);
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
module.exports = { PhpI18nManager };

if (require.main === module) {
  main();
}