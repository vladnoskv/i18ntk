#!/usr/bin/env node
/**
 * I18NTK TEXT SCANNER
 *
 * Scans source files for hardcoded English text and identifies text that may require translation support.
 * This tool analyzes JavaScript, TypeScript, React, Vue, and Angular files for untranslated text.
 *
 * Features:
 * - Framework-aware detection (React, Vue, Angular, vanilla JS/TS)
 * - Smart text extraction with context
 * - Configurable detection patterns
 * - Local analysis with zero external dependencies
 * - Detailed reports with line numbers and suggestions
 * - Integration with existing i18n frameworks
 * - Security-first with path validation
 */

const fs = require('fs');
const path = require('path');
const { getUnifiedConfig, displayHelp } = require('../utils/config-helper');
const { loadTranslations } = require('../utils/i18n-helper');
const SecurityUtils = require('../utils/security');
const SetupEnforcer = require('../utils/setup-enforcer');

// Ensure setup is complete before running
SetupEnforcer.checkSetupComplete();

loadTranslations(process.env.I18NTK_LANG);

class I18nTextScanner {
  constructor(config = {}) {
    this.config = config;
    this.sourceDir = null;
    this.patterns = [];
    this.exclusions = [];
    this.locale = this.loadLocale();
    this.results = [];
    this.framework = null;
  }

  loadLocale() {
    const uiLocalesDir = path.join(__dirname, '..', 'ui-locales');
    const localeFile = path.join(uiLocalesDir, 'en.json');
    
    try {
      const localeContent = fs.readFileSync(localeFile, 'utf8');
      return JSON.parse(localeContent);
    } catch (error) {
      return {
        scanner: {
          help_options: {
            source_dir: "Source directory to scan (default: ./src)",
            framework: "Framework type: react, vue, angular, vanilla (auto-detected)",
            patterns: "Custom patterns to match (comma-separated)",
            exclude: "Exclude patterns (comma-separated)",
            output_report: "Generate detailed report",
            output_dir: "Report output directory (default: ./reports)",
            min_length: "Minimum text length to consider (default: 3)",
            max_length: "Maximum text length to consider (default: 100)",
            include_tests: "Include test files in scan"
          },
          starting: "🔍 Starting text analysis for {framework} project...",
          sourceDirectory: "📁 Source directory: {sourceDir}",
          framework: "🏗️ Framework: {framework}",
          scanningFiles: "📊 Scanning {count} files...",
          foundText: "📝 Found {count} potential hardcoded text instances",
          reportGenerated: "📊 Report generated: {path}",
          noTextFound: "✅ No hardcoded text found!",
          analysisTitle: "🔍 TEXT ANALYSIS RESULTS",
          summary: {
            totalFiles: "📄 Total files scanned: {count}",
            textInstances: "📝 Text instances found: {count}",
            filesWithText: "📂 Files with hardcoded text: {count}",
            framework: "🏗️ Framework detected: {framework}"
          }
        }
      };
    }
  }

  t(key, params = {}) {
    const keyStr = String(key || '');
    const keys = keyStr.split('.');
    let value = this.locale;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }
    
    if (typeof value !== 'string') {
      return key;
    }
    
    return value.replace(/\{([^}]+)\}/g, (match, param) => {
      return params[param] !== undefined ? params[param] : match;
    });
  }

  parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {};
    
    args.forEach(arg => {
      if (arg.startsWith('--')) {
        const [key, ...valueParts] = arg.substring(2).split('=');
        const value = valueParts.join('=');
        
        switch (key) {
          case 'source-dir':
            parsed.sourceDir = value || '';
            break;
          case 'framework':
            parsed.framework = value || '';
            break;
          case 'patterns':
            parsed.patterns = value ? value.split(',').map(p => p.trim()).filter(Boolean) : [];
            break;
          case 'exclude':
            parsed.exclude = value ? value.split(',').map(e => e.trim()).filter(Boolean) : [];
            break;
          case 'output-dir':
            parsed.outputDir = value || '';
            break;
          case 'min-length':
            parsed.minLength = parseInt(value) || 3;
            break;
          case 'max-length':
            parsed.maxLength = parseInt(value) || 100;
            break;
          case 'output-report':
            parsed.outputReport = true;
            break;
          case 'include-tests':
            parsed.includeTests = true;
            break;
          case 'help':
          case 'h':
            parsed.help = true;
            break;
        }
      }
    });
    
    return parsed;
  }

  detectFramework(projectRoot) {
    const packagePath = path.join(projectRoot, 'package.json');
    
    // Check for Python frameworks
    const requirementsPath = path.join(projectRoot, 'requirements.txt');
    const setupPath = path.join(projectRoot, 'setup.py');
    const pyprojectPath = path.join(projectRoot, 'pyproject.toml');
    
    try {
      // Check Python frameworks first
      if (fs.existsSync(requirementsPath)) {
        const requirements = fs.readFileSync(requirementsPath, 'utf8');
        if (requirements.includes('Django')) return 'django';
        if (requirements.includes('Flask') || requirements.includes('flask-babel')) return 'flask';
      }
      
      if (fs.existsSync(setupPath)) {
        const setup = fs.readFileSync(setupPath, 'utf8');
        if (setup.includes('Django')) return 'django';
        if (setup.includes('Flask')) return 'flask';
      }
      
      if (fs.existsSync(pyprojectPath)) {
        const pyproject = fs.readFileSync(pyprojectPath, 'utf8');
        if (pyproject.includes('Django')) return 'django';
        if (pyproject.includes('Flask')) return 'flask';
      }
      
      // Check for Python files
      const hasPythonFiles = fs.readdirSync(projectRoot, { recursive: true })
        .some(file => file.endsWith && file.endsWith('.py'));
      if (hasPythonFiles) return 'python';
    } catch (error) {
      // Continue to JS frameworks
    }
    
    try {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (deps.react || deps['react-dom']) return 'react';
      if (deps.vue || deps['vue-router']) return 'vue';
      if (deps['@angular/core'] || deps.angular) return 'angular';
      if (deps.next) return 'next';
      if (deps.svelte) return 'svelte';
      
      return 'vanilla';
    } catch (error) {
      return 'vanilla';
    }
  }

  getFrameworkPatterns(framework) {
    const basePatterns = [
      // String literals in JSX/TSX - enhanced for Unicode
      /(?<![\w])["'`]([^"'`]{2,99})["'`]/g,
      // Template literals - enhanced for Unicode
      /`([^`]{2,99})`/g,
      // Text content in HTML - enhanced for Unicode
      />([^<]{2,99})</g,
      // Title attributes - enhanced for Unicode
      /title=["']([^"']{2,99})["']/g,
      // Alt attributes - enhanced for Unicode
      /alt=["']([^"']{2,99})["']/g,
      // Placeholder attributes - enhanced for Unicode
      /placeholder=["']([^"']{2,99})["']/g
    ];

    const frameworkSpecific = {
      react: [
        // React specific patterns - enhanced for i18next detection
        /children:\s*["']([^"']{2,99})["']/g,
        /dangerouslySetInnerHTML={{\s*__html:\s*["']([^"']{2,99})["']/g,
        // JSX text content without translation
        />([^<{][^<>{]*[^}>])</g,
        // Button text
        /<button[^>]*>([^<]{2,99})<\/button>/g,
        // Span text
        /<span[^>]*>([^<]{2,99})<\/span>/g
      ],
      vue: [
        // Vue specific patterns - enhanced for vue-i18n detection
        /v-text=["']([^"']{2,99})["']/g,
        /v-html=["']([^"']{2,99})["']/g,
        // Vue template text
        />([^<{][^<>{]*[^}>])</g,
        // Button text
        /<button[^>]*>([^<]{2,99})<\/button>/g,
        // Span text
        /<span[^>]*>([^<]{2,99})<\/span>/g
      ],
      angular: [
        // Angular specific patterns - enhanced for ngx-translate detection
        /\[innerHTML\]=["']([^"']{2,99})["']/g,
        /\[textContent\]=["']([^"']{2,99})["']/g,
        // Angular template text
        />([^<{][^<>{]*[^}>])</g,
        // Button text
        /<button[^>]*>([^<]{2,99})<\/button>/g,
        // Span text
        /<span[^>]*>([^<]{2,99})<\/span>/g
      ],
      django: [
        // Django template patterns
        /\{\%\s*trans\s+["']([^"']{2,99})["']\s*%\}/g,
        /\{\%\s*blocktrans\s*%\}([^%]{2,99})\{\%\s*endblocktrans\s*%\}/g,
        /{{\s*_["']([^"']{2,99})["']\s*}}/g,
        /{{\s*gettext\(["']([^"']{2,99})["']\)\s*}}/g
      ],
      flask: [
        // Flask/Jinja2 template patterns
        /\{\{\s*_["']([^"']{2,99})["']\s*}}/g,
        /\{\{\s*gettext\(["']([^"']{2,99})["']\)\s*}}/g,
        /\{\{\s*lazy_gettext\(["']([^"']{2,99})["']\)\s*}}/g
      ],
      python: [
        // Python source patterns
        /gettext\(["']([^"']{2,99})["']\)/g,
        /_\(["']([^"']{2,99})["']\)/g,
        /gettext_lazy\(["']([^"']{2,99})["']\)/g,
        /lazy_gettext\(["']([^"']{2,99})["']\)/g
      ]
    };

    return [...basePatterns, ...(frameworkSpecific[framework] || [])];
  }

  shouldExcludeFile(filePath, exclusions) {
    const fileName = path.basename(filePath);
    return exclusions.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(fileName) || regex.test(filePath);
      }
      return fileName.includes(pattern) || filePath.includes(pattern);
    });
  }

  isEnglishText(text) {
    // Enhanced text detection for Unicode and multilingual support
    const trimmed = text.trim();
    if (trimmed.length < 3) return false;
    
    // Skip if it's just numbers or special characters
    if (/^\d+$/.test(trimmed)) return false;
    if (/^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]+$/.test(trimmed)) return false;
    
    // Allow Unicode characters including CJK, Cyrillic, etc.
    const validChars = trimmed.match(/[\p{L}\p{N}\s\-,.!?':"()\[\]{}]/gu) || [];
    const validRatio = validChars.length / trimmed.length;
    
    // Must have at least 50% valid characters and some alphabetic characters
    const hasAlpha = /[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\u0400-\u04FF\u4E00-\u9FFF\uAC00-\uD7AF]/u.test(trimmed);
    
    return validRatio >= 0.5 && hasAlpha;
  }

  scanFile(filePath, patterns, minLength, maxLength) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const results = [];

      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const text = match[1] || match[0];
          
          // Skip translation function calls
          const beforeMatch = content.substring(Math.max(0, match.index - 20), match.index);
          if (beforeMatch.includes('t(') || beforeMatch.includes('i18next.t(') || 
              beforeMatch.includes('$t(') || beforeMatch.includes('translate(')) {
            continue;
          }
          
          if (text && this.isEnglishText(text) && 
              text.length >= minLength && text.length <= maxLength) {
            
            const lineNumber = content.substring(0, match.index).split('\n').length;
            const lineContent = lines[lineNumber - 1] || '';
            
            results.push({
              text: text.trim(),
              line: lineNumber,
              column: match.index - content.lastIndexOf('\n', match.index),
              context: lineContent.trim(),
              pattern: pattern.toString(),
              suggestion: this.generateSuggestion(text)
            });
          }
        }
      });

      return results;
    } catch (error) {
      console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
      return [];
    }
  }

  generateSuggestion(text) {
    const key = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    
    return {
      key: `ui.${key}`,
      original: text,
      translationKey: `t('ui.${key}')`,
      frameworkSpecific: this.getFrameworkSpecific(text)
    };
  }

  getFrameworkSpecific(text) {
    const frameworks = {
      react: {
        hook: `const { t } = useTranslation();`,
        usage: `{t('ui.${text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_')}')}`,
        component: `<Trans i18nKey="ui.${text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_')}">${text}</Trans>`
      },
      vue: {
        directive: `{{ $t('ui.${text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_')}') }}`,
        method: `this.$t('ui.${text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_')}')`
      },
      angular: {
        pipe: `{{ '${text}' | translate }}`,
        service: `this.translateService.instant('ui.${text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_')}')`
      },
      django: {
        template: `{% trans '${text}' %}`,
        python: `from django.utils.translation import gettext as _\n_('${text}')`,
        model: `from django.utils.translation import gettext_lazy as _\n_('${text}')`
      },
      flask: {
        template: `{{ _('${text}') }}`,
        python: `from flask_babel import gettext as _\n_('${text}')`,
        lazy: `from flask_babel import lazy_gettext as _\n_('${text}')`
      },
      python: {
        gettext: `import gettext\ngettext.gettext('${text}')`,
        underscore: `from gettext import gettext as _\n_('${text}')`,
        lazy: `from gettext import gettext_lazy as _\n_('${text}')`
      }
    };

    return frameworks[this.framework] || frameworks.vanilla;
  }

  async scanDirectory(dir, options = {}) {
    const { 
      patterns = [], 
      exclusions = [], 
      minLength = 3, 
      maxLength = 100,
      includeTests = false 
    } = options;

    if (!fs.existsSync(dir)) {
      throw new Error(`Directory does not exist: ${dir}`);
    }

    const allResults = [];
    const extensions = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.html', '.svelte', '.py', '.pyx', '.pyi'];
    
    const scanRecursive = (currentDir) => {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          if (!item.startsWith('.') && !this.shouldExcludeFile(fullPath, exclusions)) {
            scanRecursive(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(item);
          if (extensions.includes(ext) && !this.shouldExcludeFile(fullPath, exclusions)) {
            if (!includeTests && (item.includes('.test.') || item.includes('.spec.'))) {
              continue;
            }
            
            const results = this.scanFile(fullPath, patterns, minLength, maxLength);
            if (results.length > 0) {
              allResults.push({
                file: fullPath,
                results
              });
            }
          }
        }
      }
    };

    scanRecursive(dir);
    return allResults;
  }

  async generateReport(results, outputDir) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(outputDir, `text-analysis-${timestamp}.json`);
    const summaryFile = path.join(outputDir, `text-analysis-${timestamp}.md`);

    const summary = {
      totalFiles: results.length,
      totalInstances: results.reduce((sum, file) => sum + file.results.length, 0),
      filesWithText: results.length,
      framework: this.framework,
      timestamp: new Date().toISOString(),
      results
    };

    // JSON report
    fs.writeFileSync(reportFile, JSON.stringify(summary, null, 2));

    // Markdown summary
    const mdContent = this.generateMarkdownReport(summary);
    fs.writeFileSync(summaryFile, mdContent);

    return { reportFile, summaryFile, summary };
  }

  generateMarkdownReport(summary) {
    let content = `# Text Analysis Report

**Framework:** ${summary.framework}  
**Total Files Scanned:** ${summary.totalFiles}  
**Text Instances Found:** ${summary.totalInstances}  
**Files with Hardcoded Text:** ${summary.filesWithText}  
**Generated:** ${summary.timestamp}

## Summary

| Metric | Count |
|--------|-------|
| Total Files | ${summary.totalFiles} |
| Text Instances | ${summary.totalInstances} |
| Files with Text | ${summary.filesWithText} |

## Files with Hardcoded Text

`;

    summary.results.forEach(file => {
      content += `### ${file.file}

| Text | Line | Suggestion |
|------|------|------------|
`;

      file.results.forEach(result => {
        const suggestion = result.suggestion;
        content += `| "${result.text}" | ${result.line} | \`${suggestion.translationKey}\` |
`;
      });
      content += '\n';
    });

    content += `
## Recommendations

1. **Create Translation Keys**: Add the suggested keys to your translation files
2. **Replace Text**: Replace hardcoded text with the suggested translation patterns
3. **Test Changes**: Verify translations work correctly in your application
4. **Update Framework**: Ensure your i18n framework is properly configured

## Next Steps

- Run \`i18ntk init\` to set up translation infrastructure if needed
- Use \`i18ntk fixer\` to fix any placeholder translations
- Run \`i18ntk validate\` to ensure all translations are properly configured
`;

    return content;
  }

  async initialize() {
    const args = this.parseArgs();
    if (args.help) {
      displayHelp('i18ntk-scanner', {
        'source-dir': this.t('scanner.help_options.source_dir'),
        'framework': this.t('scanner.help_options.framework'),
        'patterns': this.t('scanner.help_options.patterns'),
        'exclude': this.t('scanner.help_options.exclude'),
        'output-report': this.t('scanner.help_options.output_report'),
        'output-dir': this.t('scanner.help_options.output_dir'),
        'min-length': this.t('scanner.help_options.min_length'),
        'max-length': this.t('scanner.help_options.max_length'),
        'include-tests': this.t('scanner.help_options.include_tests')
      });
      process.exit(0);
    }

    const baseConfig = await getUnifiedConfig('scanner', args);
    this.config = { ...baseConfig, ...(this.config || {}) };
    
    this.sourceDir = this.config.sourceDir || './src';

    // Resolve framework with precedence: CLI arg > config.framework.preference|string > auto-detect > fallback
    const cliFramework = args.framework;
    const cfgFramework = this.config.framework;
    const fwPref = typeof cfgFramework === 'string' ? cfgFramework : (cfgFramework?.preference || 'auto');
    const fwDetectEnabled = typeof cfgFramework === 'object' ? (cfgFramework.detect !== false) : true;
    const fwFallback = typeof cfgFramework === 'object' ? (cfgFramework.fallback || 'vanilla') : 'vanilla';

    if (cliFramework && typeof cliFramework === 'string') {
      this.framework = cliFramework;
    } else if (fwPref && fwPref !== 'auto') {
      this.framework = fwPref;
    } else if (fwDetectEnabled) {
      const detected = this.detectFramework(process.cwd());
      this.framework = detected || fwFallback;
    } else {
      this.framework = fwFallback;
    }

    // Validate source directory
    if (!fs.existsSync(this.sourceDir)) {
      console.error(`❌ Source directory does not exist: ${this.sourceDir}`);
      process.exit(1);
    }

    const validatedPath = SecurityUtils.validatePath(this.sourceDir);
    if (!validatedPath) {
      console.error(`❌ Security validation failed: Path validation returned null`);
      process.exit(1);
    }
    this.sourceDir = validatedPath;

    return this;
  }

  async run() {
    console.log(this.t('scanner.starting', { framework: this.framework }));
    console.log(this.t('scanner.sourceDirectory', { sourceDir: this.sourceDir }));

    const patterns = this.getFrameworkPatterns(this.framework);
    const exclusions = this.config.exclude || ['node_modules', '.git', 'dist', 'build'];
    const minLength = this.config.minLength || 3;
    const maxLength = this.config.maxLength || 100;
    const includeTests = this.config.includeTests || false;

    try {
      const results = await this.scanDirectory(this.sourceDir, {
        patterns,
        exclusions,
        minLength,
        maxLength,
        includeTests
      });

      console.log(this.t('scanner.foundText', { count: results.reduce((sum, file) => sum + file.results.length, 0) }));

      if (results.length > 0 && this.config.outputReport) {
        const outputDir = this.config.outputDir || './reports';
        const { reportFile, summaryFile } = await this.generateReport(results, outputDir);
        console.log(this.t('scanner.reportGenerated', { path: summaryFile }));
      }

      return results;
    } catch (error) {
      console.error(`❌ Error during scanning: ${error.message}`);
      process.exit(1);
    }
  }
}

// CLI execution
if (require.main === module) {
  (async () => {
    const scanner = new I18nTextScanner();
    await scanner.initialize();
    await scanner.run();
  })();
}

module.exports = I18nTextScanner;