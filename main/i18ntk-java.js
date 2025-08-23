#!/usr/bin/env node

/**
 * i18ntk-java.js - Java Language I18n Management Command
 * 
 * Supports:
 * - Spring Boot i18n
 * - Java ResourceBundle
 * - Android string resources
 * - Java internationalization patterns
 * - Properties files (.properties)
 * - XML resource files
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

class JavaI18nManager {
  constructor() {
    this.supportedPatterns = [
      'getString(R.string.',
      'getResources().getString(',
      'messages.getString(',
      'bundle.getString(',
      'MessageSource.getMessage(',
      '@Value("${',
      '#{messages.',
      'localeMessage.get(',
      'i18n.get(',
      'translate('
    ];
    
    this.fileExtensions = ['.java', '.kt', '.xml', '.properties'];
    this.resourceFormats = ['.properties', '.xml', '.json'];
  }

  async detectFramework(sourceDir) {
    // Check for Android
    const androidManifest = path.join(sourceDir, 'AndroidManifest.xml');
    if (fs.existsSync(androidManifest)) {
      return 'android';
    }
    
    // Check for Spring Boot
    const pomXml = path.join(sourceDir, 'pom.xml');
    const gradleFile = path.join(sourceDir, 'build.gradle');
    
    if (fs.existsSync(pomXml)) {
      const content = fs.readFileSync(pomXml, 'utf8');
      if (content.includes('spring-boot')) {
        return 'spring-boot';
      }
    }
    
    if (fs.existsSync(gradleFile)) {
      const content = fs.readFileSync(gradleFile, 'utf8');
      if (content.includes('spring-boot')) {
        return 'spring-boot';
      }
    }
    
    // Check for standard Java
    const javaFiles = this.findFiles(sourceDir, '.java');
    if (javaFiles.length > 0) {
      return 'standard-java';
    }
    
    // Check for Kotlin
    const kotlinFiles = this.findFiles(sourceDir, '.kt');
    if (kotlinFiles.length > 0) {
      return 'kotlin';
    }
    
    return 'generic';
  }

  async extractTranslations(sourceDir, options = {}) {
    const framework = await this.detectFramework(sourceDir);
    const translations = new Set();
    
    // Process Java/Kotlin files
    const javaFiles = [...this.findFiles(sourceDir, '.java'), ...this.findFiles(sourceDir, '.kt')];
    
    for (const file of javaFiles) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Extract Android string references
      const androidPatterns = [
        /R\.string\.([a-zA-Z0-9_]+)/g,
        /getString\(R\.string\.([a-zA-Z0-9_]+)\)/g
      ];
      
      // Extract Spring/JVM patterns
      const springPatterns = [
        /getResources\(\)\.getString\(R\.string\.([a-zA-Z0-9_]+)\)/g,
        /messages\.getString\("([^"]+)"\)/g,
        /bundle\.getString\("([^"]+)"\)/g,
        /MessageSource\.getMessage\("([^"]+)"/g,
        /@Value\("\$\{([^}]+)\}"\)/g,
        /localeMessage\.get\("([^"]+)"\)/g,
        /i18n\.get\("([^"]+)"\)/g,
        /translate\("([^"]+)"\)/g
      ];
      
      const patterns = framework === 'android' ? androidPatterns : [...androidPatterns, ...springPatterns];
      
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          translations.add(match[1]);
        }
      }
    }
    
    // Process XML files (Android)
    const xmlFiles = this.findFiles(sourceDir, '.xml');
    for (const file of xmlFiles) {
      if (file.includes('strings.xml')) {
        const content = fs.readFileSync(file, 'utf8');
        const stringPatterns = [
          /<string name="([^"]+)"/g,
          /<string-array name="([^"]+)"/g,
          /<plurals name="([^"]+)"/g
        ];
        
        for (const pattern of stringPatterns) {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            translations.add(match[1]);
          }
        }
      }
    }
    
    // Process properties files
    const propertiesFiles = this.findFiles(sourceDir, '.properties');
    for (const file of propertiesFiles) {
      if (file.includes('messages') || file.includes('i18n')) {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
            const key = trimmed.split('=')[0].trim();
            translations.add(key);
          }
        }
      }
    }
    
    return {
      framework,
      translations: Array.from(translations),
      files: javaFiles.length + xmlFiles.length + propertiesFiles.length,
      patterns: this.supportedPatterns
    };
  }

  async createLocaleStructure(outputDir, languages = ['en'], framework = 'standard-java') {
    const localesDir = path.join(outputDir, 'locales');
    
    for (const lang of languages) {
      const langDir = path.join(localesDir, lang);
      fs.mkdirSync(langDir, { recursive: true });
      
      if (framework === 'android') {
        // Android string resources
        fs.writeFileSync(path.join(langDir, 'strings.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">My App</string>
    <string name="hello">Hello, World!</string>
    <string name="items_count">%d items</string>
    
    <plurals name="items">
        <item quantity="one">%d item</item>
        <item quantity="other">%d items</item>
    </plurals>
</resources>
`);
      } else {
        // Java properties format
        fs.writeFileSync(path.join(langDir, 'messages.properties'), `# Java i18n properties for ${lang}
app.name=My Application
hello.message=Hello, World!
items.count={0} items
`);
        
        // JSON format
        fs.writeFileSync(path.join(langDir, 'messages.json'), JSON.stringify({
          app: { name: "My Application" },
          hello: { message: "Hello, World!" },
          items: { count: "{0} items" }
        }, null, 2));
      }
    }
    
    return localesDir;
  }

  findFiles(dir, extension) {
    const files = [];
    
    function traverse(currentDir) {
      if (!fs.existsSync(currentDir)) return;
      
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        try {
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !item.startsWith('.') && 
              !['node_modules', 'build', 'target'].includes(item)) {
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
    
    const reportPath = path.join(outputDir, 'i18ntk-java-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return reportPath;
  }

  getRecommendations(results) {
    const recommendations = [];
    
    if (results.translations.length === 0) {
      recommendations.push('No translations found. Check your Java i18n patterns');
    }
    
    if (results.files === 0) {
      recommendations.push('No Java/Kotlin files found in source directory');
    }
    
    if (results.framework === 'generic') {
      recommendations.push('Consider using Spring Boot for better i18n support');
    }
    
    if (results.framework === 'android') {
      recommendations.push('Use Android string resources for best compatibility');
    }
    
    return recommendations;
  }
}

// CLI Implementation
program
  .name('i18ntk-java')
  .description('Java language i18n management tool')
  .version('1.10.1');

program
  .command('init')
  .description('Initialize Java i18n structure')
  .option('-s, --source-dir <dir>', 'Source directory', './')
  .option('-o, --output-dir <dir>', 'Output directory', './i18ntk-reports')
  .option('-l, --languages <langs>', 'Languages (comma-separated)', 'en')
  .option('-f, --framework <framework>', 'Framework (spring-boot|android|standard)', 'standard-java')
  .action(async (options) => {
    try {
      const manager = new JavaI18nManager();
      const languages = options.languages.split(',');
      
      const localesDir = await manager.createLocaleStructure(options.outputDir, languages, options.framework);
      
      console.log(`✅ Java i18n structure initialized in: ${localesDir}`);
      console.log(`📊 Languages: ${languages.join(', ')}`);
      console.log(`🎯 Framework: ${options.framework}`);
      
    } catch (error) {
      console.error('❌ Error initializing Java i18n:', error.message);
      process.exit(1);
    }
  });

program
  .command('analyze')
  .description('Analyze Java i18n usage')
  .option('-s, --source-dir <dir>', 'Source directory', './')
  .option('-o, --output-dir <dir>', 'Output directory', './i18ntk-reports')
  .option('--dry-run', 'Preview without making changes')
  .action(async (options) => {
    try {
      SecurityUtils.validatePath(options.sourceDir);
      
      const manager = new JavaI18nManager();
      const results = await manager.extractTranslations(options.sourceDir);
      
      console.log(`🔍 Framework detected: ${results.framework}`);
      console.log(`📊 Files processed: ${results.files}`);
      console.log(`📝 Translations found: ${results.translations.length}`);
      
      if (!options.dryRun) {
        const reportPath = await manager.generateReport(results, options.outputDir);
        console.log(`📄 Report saved: ${reportPath}`);
      }
      
    } catch (error) {
      console.error('❌ Error analyzing Java i18n:', error.message);
      process.exit(1);
    }
  });

program
  .command('extract')
  .description('Extract Java translations')
  .option('-s, --source-dir <dir>', 'Source directory', './')
  .option('-o, --output-dir <dir>', 'Output directory', './locales')
  .option('-l, --languages <langs>', 'Languages (comma-separated)', 'en')
  .option('-f, --framework <framework>', 'Framework (spring-boot|android|standard)', 'standard-java')
  .action(async (options) => {
    try {
      SecurityUtils.validatePath(options.sourceDir);
      
      const manager = new JavaI18nManager();
      const results = await manager.extractTranslations(options.sourceDir);
      
      await manager.createLocaleStructure(options.outputDir, options.languages.split(','), options.framework);
      
      console.log(`✅ Extracted ${results.translations.length} translations`);
      console.log(`📁 Locale structure created in: ${options.outputDir}`);
      console.log(`🎯 Framework: ${options.framework}`);
      
    } catch (error) {
      console.error('❌ Error extracting Java translations:', error.message);
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
module.exports = { JavaI18nManager };

if (require.main === module) {
  program.parse();
}