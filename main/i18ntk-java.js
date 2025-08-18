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
const { parseArgs } = require('util');

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
    if (SecurityUtils.safeExistsSync(androidManifest)) {
      return 'android';
    }
    
    // Check for Spring Boot
    const pomXml = path.join(sourceDir, 'pom.xml');
    const gradleFile = path.join(sourceDir, 'build.gradle');
    
    if (SecurityUtils.safeExistsSync(pomXml)) {
      const content = SecurityUtils.safeReadFileSync(pomXml, 'utf8');
      if (content.includes('spring-boot')) {
        return 'spring-boot';
      }
    }
    
    if (SecurityUtils.safeExistsSync(gradleFile)) {
      const content = SecurityUtils.safeReadFileSync(gradleFile, 'utf8');
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
      const content = SecurityUtils.safeReadFileSync(file, 'utf8');
      
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
        const content = SecurityUtils.safeReadFileSync(file, 'utf8');
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
        const content = SecurityUtils.safeReadFileSync(file, 'utf8');
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
      SecurityUtils.safeMkdirSync(langDir, null, { recursive: true });
      
      if (framework === 'android') {
        // Android string resources
        SecurityUtils.safeWriteFileSync(path.join(langDir, 'strings.xml'), `<?xml version="1.0" encoding="utf-8"?>
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
        SecurityUtils.safeWriteFileSync(path.join(langDir, 'messages.properties'), `# Java i18n properties for ${lang}
app.name=My Application
hello.message=Hello, World!
items.count={0} items
`);
        
        // JSON format
        SecurityUtils.safeWriteFileSync(path.join(langDir, 'messages.json'), JSON.stringify({
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
      if (!SecurityUtils.safeExistsSync(currentDir)) return;
      
      const items = SecurityUtils.safeReaddirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        try {
          const stat = SecurityUtils.safeStatSync(fullPath);
          
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
    SecurityUtils.safeWriteFileSync(reportPath, JSON.stringify(report, null, 2), process.cwd());
    
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
function parseArguments() {
  const { parseArgs } = require('util');
  
  const options = {
    sourceDir: {
      type: 'string',
      short: 's',
      default: './'
    },
    outputDir: {
      type: 'string',
      short: 'o',
      default: './i18ntk-reports'
    },
    languages: {
      type: 'string',
      short: 'l',
      default: 'en'
    },
    framework: {
      type: 'string',
      short: 'f',
      default: 'standard-java'
    },
    'dry-run': {
      type: 'boolean'
    },
    debug: {
      type: 'boolean'
    },
    help: {
      type: 'boolean',
      short: 'h'
    },
    version: {
      type: 'boolean',
      short: 'v'
    }
  };

  try {
    const { values, positionals } = parseArgs({
      args: process.argv.slice(2),
      options,
      allowPositionals: true
    });

    return { values, positionals };
  } catch (error) {
    console.error('❌ Error parsing arguments:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
Java language i18n management tool

Usage: node i18ntk-java.js <command> [options]

Commands:
  init                    Initialize Java i18n structure
  analyze                 Analyze Java i18n usage
  extract                 Extract Java translations

Options:
  -s, --source-dir <dir>     Source directory (default: ./)
  -o, --output-dir <dir>     Output directory (default: ./i18ntk-reports for init/analyze, ./locales for extract)
  -l, --languages <langs>    Languages (comma-separated, default: en)
  -f, --framework <framework> Framework (spring-boot|android|standard, default: standard-java)
      --dry-run              Preview without making changes
      --debug                Enable debug output
  -h, --help                 Show this help message
  -v, --version              Show version information

Examples:
  node i18ntk-java.js init -l en,es,fr
  node i18ntk-java.js analyze --dry-run
  node i18ntk-java.js extract -s ./src -o ./locales
  node i18ntk-java.js init -f spring-boot -l de,ja
`);
}

async function main() {
  const { values, positionals } = parseArguments();
  
  const command = positionals[0];
  
  if (values.help || !command) {
    showHelp();
    return;
  }
  
  if (values.version) {
    console.log('i18ntk-java 1.10.0');
    return;
  }

  try {
    switch (command) {
      case 'init':
        const managerInit = new JavaI18nManager();
        const languages = values.languages.split(',');
        const outputDir = values.outputDir || './i18ntk-reports';
        
        const localesDir = await managerInit.createLocaleStructure(outputDir, languages, values.framework);
        
        console.log(`✅ Java i18n structure initialized in: ${localesDir}`);
        console.log(`📊 Languages: ${languages.join(', ')}`);
        console.log(`🎯 Framework: ${values.framework}`);
        break;
        
      case 'analyze':
        SecurityUtils.validatePath(values.sourceDir);
        
        const managerAnalyze = new JavaI18nManager();
        const results = await managerAnalyze.extractTranslations(values.sourceDir);
        
        console.log(`🔍 Framework detected: ${results.framework}`);
        console.log(`📊 Files processed: ${results.files}`);
        console.log(`📝 Translations found: ${results.translations.length}`);
        
        if (!values['dry-run']) {
          const reportPath = await managerAnalyze.generateReport(results, values.outputDir);
          console.log(`📄 Report saved: ${reportPath}`);
        }
        break;
        
      case 'extract':
        SecurityUtils.validatePath(values.sourceDir);
        
        const managerExtract = new JavaI18nManager();
        const extractResults = await managerExtract.extractTranslations(values.sourceDir);
        const extractOutputDir = values.outputDir || './locales';
        
        await managerExtract.createLocaleStructure(extractOutputDir, values.languages.split(','), values.framework);
        
        console.log(`✅ Extracted ${extractResults.translations.length} translations`);
        console.log(`📁 Locale structure created in: ${extractOutputDir}`);
        console.log(`🎯 Framework: ${values.framework}`);
        break;
        
      default:
        console.error(`❌ Unknown command: ${command}`);
        showHelp();
        process.exit(1);
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
module.exports = { JavaI18nManager };

if (require.main === module) {
  main();
}