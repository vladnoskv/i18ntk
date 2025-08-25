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
const { program } = require('commander');

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
    if (SecurityUtils.safeExistsSync(composerJson, sourceDir)) {
      const content = SecurityUtils.safeReadFileSync(composerJson, sourceDir, 'utf8');
      const composer = SecurityUtils.safeParseJSON(content);

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
    if (SecurityUtils.safeExistsSync(wpConfig, sourceDir)) {
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
      const content = SecurityUtils.safeReadFileSync(file, path.dirname(file), 'utf8');

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
          const content = SecurityUtils.safeReadFileSync(file, path.dirname(file), 'utf8');

          if (file.endsWith('.php')) {
            // PHP array translations
            const arrayPattern = /'([^']+)'\s*=>/g;
            let match;
            while ((match = arrayPattern.exec(content)) !== null) {
              translations.add(match[1]);
            }
          } else if (file.endsWith('.json')) {
            // JSON translations
            const data = SecurityUtils.safeParseJSON(content);
            const keys = this.extractKeysFromObject(data);
            keys.forEach(key => translations.add(key));
          } else if (file.endsWith('.yml') || file.endsWith('.yaml')) {
            // YAML translations (basic parsing)
            const lines = content.split('\n');
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed && !trimmed.startsWith('#') && trimmed.includes(':')) {
                const key = trimmed.split(':')[0].trim();
                if (!key.startsWith(' ')) {
                  translations.add(key);
                }
              }
            }
          }
        } catch (error) {
          // Skip files that can't be parsed
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

    for (const lang of languages) {
      const langDir = path.join(localesDir, lang);
      fs.mkdirSync(langDir, { recursive: true });

      if (framework === 'laravel') {
        // Laravel structure
        SecurityUtils.safeWriteFileSync(path.join(langDir, 'messages.php'), `<?php
// Laravel i18n for ${lang}
return [
    'hello' => 'Hello, World!',
    'items' => [
        'one' => ':count item',
        'other' => ':count items'
    ],
    'welcome' => 'Welcome to our application'
];
`, path.dirname(langDir));

        SecurityUtils.safeWriteFileSync(path.join(langDir, 'validation.php'), `<?php
// Laravel validation messages for ${lang}
return [
    'required' => 'The :attribute field is required.',
    'email' => 'The :attribute must be a valid email address.',
    'unique' => 'The :attribute has already been taken.'
];
`, path.dirname(localesDir));
      } else if (framework === 'symfony') {
        // Symfony structure
        SecurityUtils.safeWriteFileSync(path.join(langDir, 'messages.yml'), `# Symfony i18n for ${lang}
hello: "Hello, World!"
items:
  one: "%count% item"
  other: "%count% items"
welcome: "Welcome to our application"
`, path.dirname(localesDir));

        SecurityUtils.safeWriteFileSync(path.join(langDir, 'validators.yml'), `# Symfony validation for ${lang}
required: "The {{ field }} field is required."
email: "The {{ field }} must be a valid email address."
unique: "The {{ field }} has already been taken."
`, path.dirname(localesDir));
      } else {
        // Standard PHP
        SecurityUtils.safeWriteFileSync(path.join(langDir, 'messages.php'), `<?php
// PHP i18n for ${lang}
return [
    'hello' => 'Hello, World!',
    'items' => [
        'one' => '{0} item',
        'other' => '{0} items'
    ],
    'welcome' => 'Welcome to our application'
];
`, path.dirname(langDir));

        SecurityUtils.safeWriteFileSync(path.join(langDir, 'messages.json'), JSON.stringify({
          hello: "Hello, World!",
          items: {
            one: "{0} item",
            other: "{0} items"
          },
          welcome: "Welcome to our application"
        }, null, 2), path.dirname(langDir));
      }
    }

    return localesDir;
  }

  findFiles(dir, extension) {
    const files = [];

    function traverse(currentDir) {
      if (!SecurityUtils.safeExistsSync(currentDir, path.dirname(currentDir))) return;

      const items = fs.readdirSync(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        try {
          const stat = fs.statSync(fullPath);

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
    SecurityUtils.safeWriteFileSync(reportPath, JSON.stringify(report, null, 2), outputDir);

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
program
  .name('i18ntk-php')
  .description('PHP language i18n management tool')
  .version('1.10.1');

program
  .command('init')
  .description('Initialize PHP i18n structure')
  .option('-s, --source-dir <dir>', 'Source directory', './')
  .option('-o, --output-dir <dir>', 'Output directory', './i18ntk-reports')
  .option('-l, --languages <langs>', 'Languages (comma-separated)', 'en')
  .option('-f, --framework <framework>', 'Framework (laravel|symfony|wordpress|standard)', 'standard-php')
  .action(async (options) => {
    try {
      const manager = new PhpI18nManager();
      const languages = options.languages.split(',');

      const localesDir = await manager.createLocaleStructure(options.outputDir, languages, options.framework);

      console.log(`✅ PHP i18n structure initialized in: ${localesDir}`);
      console.log(`📊 Languages: ${languages.join(', ')}`);
      console.log(`🎯 Framework: ${options.framework}`);

    } catch (error) {
      console.error('❌ Error initializing PHP i18n:', error.message);
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Analyze PHP i18n usage')
  .option('-s, --source-dir <dir>', 'Source directory', './')
  .option('-o, --output-dir <dir>', 'Output directory', './i18ntk-reports')
  .option('--dry-run', 'Preview without making changes')
  .action(async (options) => {
    try {
      SecurityUtils.validatePath(options.sourceDir);

      const manager = new PhpI18nManager();
      const results = await manager.extractTranslations(options.sourceDir);

      console.log(`🔍 Framework detected: ${results.framework}`);
      console.log(`📊 Files processed: ${results.files}`);
      console.log(`📝 Translations found: ${results.translations.length}`);

      if (!options.dryRun) {
        const reportPath = await manager.generateReport(results, options.outputDir);
        console.log(`📄 Report saved: ${reportPath}`);
      }

    } catch (error) {
      console.error('❌ Error analyzing PHP i18n:', error.message);
      process.exit(1);
    }
  });

program
  .command('extract')
  .description('Extract PHP translations')
  .option('-s, --source-dir <dir>', 'Source directory', './')
  .option('-o, --output-dir <dir>', 'Output directory', './locales')
  .option('-l, --languages <langs>', 'Languages (comma-separated)', 'en')
  .option('-f, --framework <framework>', 'Framework (laravel|symfony|wordpress|standard)', 'standard-php')
  .action(async (options) => {
    try {
      SecurityUtils.validatePath(options.sourceDir);

      const manager = new PhpI18nManager();
      const results = await manager.extractTranslations(options.sourceDir);

      await manager.createLocaleStructure(options.outputDir, options.languages.split(','), options.framework);

      console.log(`✅ Extracted ${results.translations.length} translations`);
      console.log(`📁 Locale structure created in: ${options.outputDir}`);
      console.log(`🎯 Framework: ${options.framework}`);

    } catch (error) {
      console.error('❌ Error extracting PHP translations:', error.message);
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
module.exports = { PhpI18nManager };

if (require.main === module) {
  program.parse();
}