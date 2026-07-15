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
const { detectProjectFramework, getFrameworkPatterns, getFrameworkSuggestions, SCANNER_EXTENSIONS, WRAPPER_SKIP_PATTERNS, getExcludeDirs } = require('../utils/framework-detector');

// Enforce setup only for the executable CLI. Keeping module loading side-effect
// free lets integrations and tests use the scanner helpers safely.
if (require.main === module) {
  (async () => {
    try {
      await SetupEnforcer.checkSetupCompleteAsync();
    } catch (error) {
      console.error('Setup check failed:', error.message);
      process.exit(1);
    }
  })();
}

loadTranslations();

const JS_BUILTIN_NAMES = new Set([
  'Promise', 'Boolean', 'String', 'Number', 'Array', 'Object', 'Function',
  'Symbol', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Date', 'RegExp', 'Error',
  'BigInt', 'Int8Array', 'Uint8Array', 'Int16Array', 'Uint16Array',
  'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array', 'Buffer',
  'ReadableStream', 'WritableStream', 'FormData', 'URL', 'URLSearchParams',
  'Headers', 'Request', 'Response', 'AbortController', 'AbortSignal',
  'Blob', 'File', 'FileList', 'JSON', 'Math', 'Reflect', 'Proxy', 'Intl',
  'console', 'process', 'global', 'globalThis', 'window', 'document',
  'navigator', 'Element', 'HTMLElement', 'Node', 'Event', 'Component',
  'React', 'NextResponse', 'NextRequest', 'NextApiRequest', 'NextApiResponse',
]);

class I18nTextScanner {
  constructor(config = {}) {
    this.config = config;
    this.sourceDir = null;
    this.patterns = [];
    this.exclusions = [];
    this.locale = this.loadLocale();
    this.results = [];
    this.framework = null;
    this.scanCache = new Map();
    this.telemetry = { filesScanned: 0, cacheHits: 0, filesSkipped: 0, durationMs: 0 };
  }

  loadLocale() {
    const uiLocalesDir = path.join(__dirname, '..', 'ui-locales');
    const localeFile = path.join(uiLocalesDir, 'en.json');

    try {
      const localeContent = SecurityUtils.safeReadFileSync(localeFile, uiLocalesDir, 'utf8');
      return SecurityUtils.safeParseJSON(localeContent);
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

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith('--')) {
        const [key, ...valueParts] = arg.substring(2).split('=');
        let value = valueParts.join('=');
        if (!value && args[i + 1] && !args[i + 1].startsWith('--')) {
          value = args[i + 1];
        }

        switch (key) {
          case 'source-dir':
          case 'code-dir':
          case 'source-code-dir':
            parsed.sourceDir = value || '';
            if (value === args[i + 1]) i++;
            break;
          case 'framework':
            parsed.framework = value || '';
            if (value === args[i + 1]) i++;
            break;
          case 'patterns':
            parsed.patterns = value ? value.split(',').map(p => p.trim()).filter(Boolean) : [];
            if (value === args[i + 1]) i++;
            break;
          case 'exclude':
            parsed.exclude = value ? value.split(',').map(e => e.trim()).filter(Boolean) : [];
            if (value === args[i + 1]) i++;
            break;
          case 'output-dir':
            parsed.outputDir = value || '';
            if (value === args[i + 1]) i++;
            break;
          case 'min-length':
            parsed.minLength = parseInt(value) || 3;
            if (value === args[i + 1]) i++;
            break;
          case 'max-length':
            parsed.maxLength = parseInt(value) || 100;
            if (value === args[i + 1]) i++;
            break;
          case 'output-report':
            parsed.outputReport = true;
            break;
          case 'include-tests':
            parsed.includeTests = true;
            break;
          case 'source-language':
          case 'source-locale':
            parsed.sourceLanguage = value || '';
            if (value === args[i + 1]) i++;
            break;
          case 'help':
          case 'h':
            parsed.help = true;
            break;
        }
      }
    }

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
      if (SecurityUtils.safeExistsSync(requirementsPath, projectRoot)) {
        const requirements = SecurityUtils.safeReadFileSync(requirementsPath, projectRoot, 'utf8');
        if (requirements.includes('Django')) return 'django';
        if (requirements.includes('Flask') || requirements.includes('flask-babel')) return 'flask';
      }

      if (SecurityUtils.safeExistsSync(setupPath, projectRoot)) {
        const setup = SecurityUtils.safeReadFileSync(setupPath, projectRoot, 'utf8');
        if (setup.includes('Django')) return 'django';
        if (setup.includes('Flask')) return 'flask';
      }

      if (SecurityUtils.safeExistsSync(pyprojectPath, projectRoot)) {
        const pyproject = SecurityUtils.safeReadFileSync(pyprojectPath, projectRoot, 'utf8');
        if (pyproject.includes('Django')) return 'django';
        if (pyproject.includes('Flask')) return 'flask';
      }

      // Check for Python files using safeReaddirSync
      const pythonItems = SecurityUtils.safeReaddirSync(projectRoot, projectRoot, { withFileTypes: true }) || [];
      const hasPythonFiles = pythonItems.some(item => item.isFile && item.name && item.name.endsWith('.py'));
      if (hasPythonFiles) return 'python';
    } catch (error) {
      // Continue to JS frameworks
    }

    try {
      const packageJsonContent = SecurityUtils.safeReadFileSync(packagePath, projectRoot, 'utf8');
      const packageJson = SecurityUtils.safeParseJSON(packageJsonContent);
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      if (deps.next || deps['next-intl'] || deps['next-i18next']) return 'next';
      if (deps.react || deps['react-dom']) return 'react';
      if (deps.vue || deps['vue-router']) return 'vue';
      if (deps['@angular/core'] || deps.angular) return 'angular';
      if (deps.svelte) return 'svelte';
      if (deps.astro || deps['astro-i18next'] || deps['@astrojs/i18n']) return 'astro';
      if (deps['@remix-run/react'] || deps['remix-i18next']) return 'remix';
      if (deps.gatsby || deps['gatsby-plugin-react-i18next']) return 'gatsby';
      if (deps['@builder.io/qwik'] || deps['qwik-speak']) return 'qwik';
      if (deps['solid-js'] || deps['@solid-primitives/i18n']) return 'solid';
      if (deps['ember-source'] || deps['ember-intl']) return 'ember';
      if (deps.nuxt || deps['@nuxtjs/i18n']) return 'nuxt';

      // Check for Rust project
      const cargoTomlPath = path.join(projectRoot, 'Cargo.toml');
      if (SecurityUtils.safeExistsSync(cargoTomlPath, projectRoot)) return 'rust';

      // Check for Go project
      const goModPath = path.join(projectRoot, 'go.mod');
      if (SecurityUtils.safeExistsSync(goModPath, projectRoot)) return 'go';

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
        /children:\s*["']([^"']{2,99})["']/g,
        /dangerouslySetInnerHTML={{\s*__html:\s*["']([^"']{2,99})["']/g,
        />([^<{][^<>{]*[^}>])</g,
        /<button[^>]*>([^<]{2,99})<\/button>/g,
        /<span[^>]*>([^<]{2,99})<\/span>/g,
        /<(?:FormattedMessage|Trans)[\s\S]*?\b(?:id|defaultMessage|i18nKey)\s*=\s*(?:\{|)(['"`])([^'"`}]+)\1[^>]*>/g,
        /<(?:FormattedMessage|Trans)[\s\S]*?\b(?:id|defaultMessage|i18nKey)\s*=\s*\{[']\s*([^'}]+\.[^'}]+)\s*[']/g
      ],
      vue: [
        /v-text=["']([^"']{2,99})["']/g,
        /v-html=["']([^"']{2,99})["']/g,
        />([^<{][^<>{]*[^}>])</g,
        /<button[^>]*>([^<]{2,99})<\/button>/g,
        /<span[^>]*>([^<]{2,99})<\/span>/g,
        /\$t\(["']([^"']{2,99})["']\)/g,
        /v-t=["']([^"']{2,99})["']/g
      ],
      angular: [
        /\[innerHTML\]=["']([^"']{2,99})["']/g,
        /\[textContent\]=["']([^"']{2,99})["']/g,
        />([^<{][^<>{]*[^}>])</g,
        /<button[^>]*>([^<]{2,99})<\/button>/g,
        /<span[^>]*>([^<]{2,99})<\/span>/g,
        /i18n=["']([^"']{2,99})["']/g,
        /\[attr\.title\]=["']([^"']{2,99})["']/g
      ],
      next: [
        /children:\s*["']([^"']{2,99})["']/g,
        />([^<{][^<>{]*[^}>])</g,
        /<button[^>]*>([^<]{2,99})<\/button>/g,
        /<(?:FormattedMessage|Trans)[\s\S]*?\b(?:id|defaultMessage|i18nKey)\s*=\s*(?:\{|)(['"`])([^'"`}]+)\1[^>]*>/g
      ],
      svelte: [
        />([^<{][^<>{]*[^}>])</g,
        /<button[^>]*>([^<]{2,99})<\/button>/g,
        /\$_\(["']([^"']{2,99})["']\)/g,
        /t\.set\(["']([^"']{2,99})["']/g,
        /\{#if[^}]*\}([^<]{2,99})\{\/if\}/g
      ],
      astro: [
        />([^<{][^<>{]*[^}>])</g,
        /<button[^>]*>([^<]{2,99})<\/button>/g,
        /t\(["']([^"']{2,99})["']\)/g
      ],
      remix: [
        /children:\s*["']([^"']{2,99})["']/g,
        />([^<{][^<>{]*[^}>])</g,
        /<button[^>]*>([^<]{2,99})<\/button>/g,
        /<(?:FormattedMessage|Trans)[\s\S]*?\b(?:id|defaultMessage|i18nKey)\s*=\s*(?:\{|)(['"`])([^'"`}]+)\1[^>]*>/g
      ],
      qwik: [
        />([^<{][^<>{]*[^}>])</g,
        /<button[^>]*>([^<]{2,99})<\/button>/g,
        /t\(["']([^"']{2,99})["']\)/g,
        /useTranslate\(\)/g
      ],
      solid: [
        />([^<{][^<>{]*[^}>])</g,
        /<button[^>]*>([^<]{2,99})<\/button>/g,
        /t\(["']([^"']{2,99})["']\)/g,
        /useI18n\(\)\.t\(["']([^"']{2,99})["']\)/g
      ],
      ember: [
        />([^<{][^<>{]*[^}>])</g,
        /\{\{t\s+["']([^"']{2,99})["']\s*\}\}/g,
        /\{\{intl\.t\s+["']([^"']{2,99})["']\s*\}\}/g
      ],
      gatsby: [
        /children:\s*["']([^"']{2,99})["']/g,
        />([^<{][^<>{]*[^}>])</g,
        /<(?:Trans)[\s\S]*?\bi18nKey\s*=\s*(?:\{|)(['"`])([^'"`}]+)\1[^>]*>/g
      ],
      django: [
        /\{\%\s*trans\s+["']([^"']{2,99})["']\s*%\}/g,
        /\{\%\s*blocktrans\s*%\}([^%]{2,99})\{\%\s*endblocktrans\s*%\}/g,
        /{{\s*_["']([^"']{2,99})["']\s*}}/g,
        /{{\s*gettext\(["']([^"']{2,99})["']\)\s*}}/g
      ],
      flask: [
        /\{\{\s*_["']([^"']{2,99})["']\s*}}/g,
        /\{\{\s*gettext\(["']([^"']{2,99})["']\)\s*}}/g,
        /\{\{\s*lazy_gettext\(["']([^"']{2,99})["']\)\s*}}/g
      ],
      python: [
        /gettext\(["']([^"']{2,99})["']\)/g,
        /_\(["']([^"']{2,99})["']\)/g,
        /gettext_lazy\(["']([^"']{2,99})["']\)/g,
        /lazy_gettext\(["']([^"']{2,99})["']\)/g
      ],
      rust: [
        /bundle\.get_message\(\s*["']([^"']{2,99})["']\)/g,
        /\.get_message\s*\(\s*["']([^"']{2,99})["']\)/g,
        /ts!\s*\(\s*["']([^"']{2,99})["']/g,
        /fluent!\s*\(\s*["']([^"']{2,99})["']/g
      ],
      go: [
        /i18n\.Translate\([^,]+,\s*["']([^"']{2,99})["']\)/g,
        /i18n\.NewMessage\([^,]+,\s*["']([^"']{2,99})["']\)/g,
        /t\.Get\([^,]+,\s*["']([^"']{2,99})["']\)/g
      ],
      vanilla: [
        /t\(["']([^"']{2,99})["']\)/g,
        /i18n\.t\(["']([^"']{2,99})["']\)/g,
        /translate\(["']([^"']{2,99})["']\)/g
      ]
    };

    return [...basePatterns, ...(frameworkSpecific[framework] || [])];
  }

  shouldExcludeFile(filePath, exclusions) {
    const fileName = path.basename(filePath);
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
    return exclusions.some(pattern => {
      const value = String(pattern || '').replace(/\\/g, '/').replace(/^\.\//, '');
      if (!value) return false;
      const escaped = part => part.replace(/[.+?^$()|[\]\\]/g, '\\$&').replace(/[{}]/g, '\\$&');
      const regex = new RegExp(`^${value.split('*').map(escaped).join('.*')}$`, 'i');
      return regex.test(fileName) || regex.test(relativePath) || relativePath.split('/').includes(value);
    });
  }

  isNonUserFacingLiteral(text, context = '') {
    const value = String(text || '').trim();
    const line = String(context || '').trim();
    return !value ||
      /^(?:[A-Za-z0-9_-]+\/)+[A-Za-z0-9_./@-]+$/.test(value) ||
      /^(?:@|#|\.|\/)[A-Za-z0-9_./@#:-]+$/.test(value) ||
      /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ||
      /^(?:force-dynamic|use client|use server|javascript|typescript|text|button|div|span|main|true|false|null|undefined)$/i.test(value) ||
      /^(?:[a-z-]+:)?[a-z-]+(?:\/[a-z-]+)*$/.test(value) ||
      /^(?:[a-z-]+\.)+[a-z-]+$/.test(value) ||
      /^(?:import\s|export\s.*\sfrom\s|const\s+\w+\s*=\s*require\s*\()/.test(line) ||
      /\b(?:t|i18n\.t|translate|\$t)\s*\(/.test(line) ||
      /^[a-z][a-z0-9_.-]*$/.test(value) && value.includes('.');
  }

  isEnglishText(text) {
    const trimmed = text.trim();
    if (trimmed.length < 3) return false;

    if (/^\d+$/.test(trimmed)) return false;
    if (/^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]+$/.test(trimmed)) return false;

    if (JS_BUILTIN_NAMES.has(trimmed)) return false;
    if (/[&|!=<>+\-*/%]=|&&|\|\||===|!==|=>|;|function\b|\$\{/.test(trimmed)) return false;

    const validChars = trimmed.match(/[\p{L}\p{N}\s\-,.!?':"()\[\]{}]/gu) || [];
    const validRatio = validChars.length / trimmed.length;

    const hasAlpha = /[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\u0400-\u04FF\u4E00-\u9FFF\uAC00-\uD7AF]/u.test(trimmed);

    return validRatio >= 0.5 && hasAlpha;
  }

  getLanguageProfile(langCode) {
    const profiles = {
      en: {
        name: 'English',
        charRegex: /[a-zA-Z\u00C0-\u024F]/u,
        stopwords: ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'from', 'they', 'that', 'with', 'this', 'will', 'your', 'which', 'their', 'them', 'than', 'then', 'been', 'being', 'would', 'should', 'could', 'about', 'after'],
        minLength: 3,
        maxLength: 150
      },
      de: {
        name: 'German',
        charRegex: /[a-zA-Z\u00C0-\u00FF\u0100-\u017F\u00DF\u1E00-\u1EFF]/u,
        stopwords: ['der', 'die', 'das', 'und', 'ist', 'von', 'mit', 'sich', 'des', 'auf', 'dem', 'nicht', 'ein', 'eine', 'auch', 'als', 'aus', 'bei', 'nach', 'wie', 'oder', 'war', 'hat', 'ich', 'sie', 'einem', 'um', 'am', 'im', 'es'],
        minLength: 3,
        maxLength: 180
      },
      fr: {
        name: 'French',
        charRegex: /[a-zA-Z\u00C0-\u00FF\u0152\u0153]/u,
        stopwords: ['le', 'la', 'les', 'des', 'est', 'pas', 'que', 'une', 'dans', 'sur', 'plus', 'par', 'pour', 'avec', 'aux', 'ces', 'ses', 'mes', 'tes', 'notre', 'votre', 'leur', 'dont', 'sont', 'comme', 'mais', 'alors', 'peut', 'tout', 'tous', 'fait'],
        minLength: 3,
        maxLength: 170
      },
      es: {
        name: 'Spanish',
        charRegex: /[a-zA-Z\u00C0-\u00FF\u00F1\u00D1]/u,
        stopwords: ['que', 'los', 'las', 'del', 'como', 'por', 'para', 'con', 'una', 'sus', 'muy', 'más', 'pero', 'este', 'esta', 'hay', 'son', 'eran', 'fue', 'han', 'será', 'está', 'todo', 'otro', 'otra'],
        minLength: 3,
        maxLength: 150
      },
      ja: {
        name: 'Japanese',
        charRegex: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF66-\uFF9F]/u,
        stopwords: ['の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し', 'れ', 'さ', 'る', 'す', 'ん', 'な', 'い', 'か', 'ま', 'も', 'こ', 'り', 'ち', 'き', 'ょ', 'う'],
        minLength: 2,
        maxLength: 80
      },
      zh: {
        name: 'Chinese',
        charRegex: /[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF]/u,
        stopwords: ['的', '是', '在', '不', '了', '有', '和', '人', '这', '中', '大', '为', '上', '个', '国', '我', '以', '要', '他', '时', '来', '用', '们', '生', '到', '作', '地'],
        minLength: 1,
        maxLength: 50
      },
      ru: {
        name: 'Russian',
        charRegex: /[\u0400-\u04FF\u0500-\u052F]/u,
        stopwords: ['и', 'в', 'не', 'на', 'что', 'как', 'по', 'к', 'от', 'это', 'за', 'то', 'для', 'все', 'его', 'она', 'так', 'же', 'но', 'был', 'быть', 'еще', 'уже', 'кто', 'мой', 'ее', 'их', 'из'],
        minLength: 2,
        maxLength: 200
      },
      ko: {
        name: 'Korean',
        charRegex: /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/u,
        stopwords: ['이', '그', '저', '것', '수', '등', '들', '및', '년', '월', '일', '에서', '에게', '으로', '보다', '에게서', '의', '에', '는', '은', '가', '를', '과', '와', '도', '만', '까지', '부터'],
        minLength: 1,
        maxLength: 70
      },
      ar: {
        name: 'Arabic',
        charRegex: /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/u,
        stopwords: ['في', 'من', 'على', 'عن', 'مع', 'هو', 'هي', 'كان', 'هذا', 'ذلك', 'بين', 'بعد', 'قبل', 'عند', 'حتى', 'الى', 'او', 'لا', 'ما', 'لم', 'لن', 'كل', 'بعض', 'أي'],
        minLength: 2,
        maxLength: 150
      },
      hi: {
        name: 'Hindi',
        charRegex: /[\u0900-\u097F]/u,
        stopwords: ['का', 'की', 'के', 'है', 'हैं', 'था', 'थे', 'होगा', 'होगी', 'में', 'से', 'पर', 'को', 'तक', 'और', 'या', 'लेकिन', 'जब', 'तब', 'कि', 'यह', 'वह', 'एक', 'दो'],
        minLength: 2,
        maxLength: 160
      },
      vanilla: {
        name: 'Generic Latin',
        charRegex: /[a-zA-Z\u00C0-\u024F]/u,
        stopwords: [],
        minLength: 3,
        maxLength: 150
      }
    };
    return profiles[langCode] || profiles.en;
  }

  isTextInLanguage(text, langCode) {
    const profile = this.getLanguageProfile(langCode);
    const trimmed = text.trim();

    if (trimmed.length < profile.minLength) return false;
    if (trimmed.length > profile.maxLength) return false;

    if (/^\d+$/.test(trimmed)) return false;
    if (/^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]+$/.test(trimmed)) return false;

    const hasScriptChar = profile.charRegex.test(trimmed);
    if (!hasScriptChar) return false;

    if (profile.stopwords.length > 0) {
      const words = trimmed.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (profile.stopwords.includes(word)) return true;
      }
    }

    const validChars = trimmed.match(/[\p{L}\p{N}\s\-,.!?':"()\[\]{}]/gu) || [];
    const validRatio = validChars.length / trimmed.length;
    return validRatio >= 0.5;
  }

  scanFile(filePath, patterns, minLength, maxLength) {
    try {
      const stat = SecurityUtils.safeStatSync(filePath, path.dirname(filePath));
      const patternKey = patterns.map(pattern => `${pattern.source}/${pattern.flags}`).join('|');
      const cacheKey = stat && `${stat.size}:${stat.mtimeMs}:${this.sourceLanguage || 'en'}:${minLength}:${maxLength}:${patternKey}`;
      const cached = this.config.cache !== false && cacheKey && this.scanCache.get(filePath);
      if (cached && cached.key === cacheKey) {
        this.telemetry.cacheHits++;
        return cached.results.map(result => ({ ...result }));
      }
      const content = SecurityUtils.safeReadFileSync(filePath, path.dirname(filePath), 'utf8');
      const lines = content.split('\n');
      const results = [];
      const sourceLang = this.sourceLanguage || 'en';

      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const text = match[1] || match[0];

          const beforeMatch = content.substring(Math.max(0, match.index - 20), match.index);
          if (beforeMatch.includes('t(') || beforeMatch.includes('i18next.t(') ||
              beforeMatch.includes('$t(') || beforeMatch.includes('translate(')) {
            continue;
          }

          if (text && !this.isNonUserFacingLiteral(text, lines[content.substring(0, match.index).split('\n').length - 1]) && this.isTextInLanguage(text, sourceLang) &&
              text.length >= minLength && text.length <= maxLength) {

            const lineNumber = content.substring(0, match.index).split('\n').length;
            const lineContent = lines[lineNumber - 1] || '';

            if (!results.some(existing => existing.line === lineNumber && existing.text === text.trim())) results.push({
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

      this.telemetry.filesScanned++;
      if (this.config.cache !== false && cacheKey) this.scanCache.set(filePath, { key: cacheKey, results });
      return results;
    } catch (error) {
      console.warn(`Warning: Could not read file ${filePath}: ${error.message}`);
      return [];
    }
  }

  generateSuggestion(text) {
    const sourceLang = this.sourceLanguage || 'en';
    const transliterations = {
      ja: { 'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o', 'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko', 'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so', 'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to', 'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no', 'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho', 'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo', 'や': 'ya', 'ゆ': 'yu', 'よ': 'yo', 'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro', 'わ': 'wa', 'を': 'wo', 'ん': 'n' },
      ru: { 'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya' },
      zh: { '的': 'de', '一': 'yi', '是': 'shi', '在': 'zai', '不': 'bu', '了': 'le', '有': 'you', '和': 'he', '人': 'ren', '这': 'zhe', '中': 'zhong', '大': 'da', '为': 'wei', '上': 'shang', '个': 'ge', '国': 'guo', '我': 'wo', '以': 'yi_t', '要': 'yao', '他': 'ta', '时': 'shi_t', '来': 'lai', '用': 'yong', '们': 'men', '生': 'sheng', '到': 'dao', '作': 'zuo', '地': 'di' }
    };

    let transliterated = text;
    const table = transliterations[sourceLang];
    if (table) {
      transliterated = '';
      for (const ch of text) {
        transliterated += table[ch] || ch;
      }
    }

    const key = transliterated.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);

    return {
      key: `ui.${key}`,
      original: text,
      translationKey: `t('ui.${key}')`,
      frameworkSpecific: getFrameworkSuggestions(this.framework, text)
    };
  }

  getFrameworkSpecific(text) {
    const frameworks = {
      react: {
        hook: `const { t } = useTranslation();`,
        usage: `{t('ui.${this._keySnippet(text)}')}`,
        component: `<Trans i18nKey="ui.${this._keySnippet(text)}">${text}</Trans>`
      },
      next: {
        hook: `const t = useTranslations();`,
        usage: `{t('ui.${this._keySnippet(text)}')}`,
        component: `<Trans i18nKey="ui.${this._keySnippet(text)}">${text}</Trans>`
      },
      vue: {
        directive: `{{ $t('ui.${this._keySnippet(text)}') }}`,
        method: `this.$t('ui.${this._keySnippet(text)}')`
      },
      angular: {
        pipe: `{{ '${text}' | translate }}`,
        service: `this.translateService.instant('ui.${this._keySnippet(text)}')`
      },
      svelte: {
        store: `$_(('ui.${this._keySnippet(text)}'))`,
        method: `t.set('ui.${this._keySnippet(text)}', '${text}')`
      },
      astro: {
        import: `import { t } from 'astro-i18next';`,
        usage: `{t('ui.${this._keySnippet(text)}')}`
      },
      remix: {
        hook: `const { t } = useTranslation();`,
        usage: `{t('ui.${this._keySnippet(text)}')}`,
        server: `export const handle = i18next.handle;`
      },
      qwik: {
        hook: `const t = useTranslate();`,
        usage: `{t('ui.${this._keySnippet(text)}')}`
      },
      solid: {
        hook: `const [t] = useI18n();`,
        usage: `{t('ui.${this._keySnippet(text)}')}`
      },
      ember: {
        template: `{{t 'ui.${this._keySnippet(text)}'}}`,
        helper: `this.intl.t('ui.${this._keySnippet(text)}')`
      },
      gatsby: {
        hook: `const { t } = useTranslation();`,
        usage: `{t('ui.${this._keySnippet(text)}')}`,
        plugin: `'gatsby-plugin-react-i18next'`
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
      },
      rust: {
        fluent: `bundle.get_message("ui_${this._keySnippet(text)}")`,
        gettext: `gettext("ui_${this._keySnippet(text)}")`
      },
      go: {
        translate: `i18n.Translate("ui_${this._keySnippet(text)}")`,
        message: `i18n.NewMessage("ui_${this._keySnippet(text)}")`
      },
      vanilla: {
        generic: `t('ui.${this._keySnippet(text)}')`
      }
    };

    return frameworks[this.framework] || frameworks.vanilla;
  }

  _keySnippet(text) {
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 40);
  }

  async scanDirectory(dir, options = {}) {
    const startedAt = Date.now();
    const {
      patterns = [],
      exclusions = [],
      minLength = 3,
      maxLength = 100,
      includeTests = false
    } = options;

    if (!SecurityUtils.safeExistsSync(dir, path.dirname(dir))) {
      throw new Error(`Directory does not exist: ${dir}`);
    }

    const allResults = [];
    const extensions = [...SCANNER_EXTENSIONS];

    const scanRecursive = (currentDir) => {
      const items = SecurityUtils.safeReaddirSync(currentDir, path.dirname(currentDir), { withFileTypes: true });
      if (!items) return;

      for (const item of items) {
        const fullPath = path.join(currentDir, item.name);
        const stat = SecurityUtils.safeStatSync(fullPath, currentDir);
        if (!stat) continue;

        if (stat.isDirectory()) {
          if (!item.name.startsWith('.') && !this.shouldExcludeFile(fullPath, exclusions)) {
            scanRecursive(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(item.name);
          if (extensions.includes(ext) && !this.shouldExcludeFile(fullPath, exclusions)) {
            if (!includeTests && (item.name.includes('.test.') || item.name.includes('.spec.'))) {
              this.telemetry.filesSkipped++;
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
    this.telemetry.durationMs += Date.now() - startedAt;
    return allResults;
  }

  getScanTelemetry() { return { ...this.telemetry, cacheEntries: this.scanCache.size }; }

  clearScanCache() { this.scanCache.clear(); }

  async generateReport(results, outputDir) {
    if (!SecurityUtils.safeExistsSync(outputDir, path.dirname(outputDir))) {
      SecurityUtils.safeMkdirSync(outputDir, process.cwd(), { recursive: true });
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
    SecurityUtils.safeWriteFileSync(reportFile, JSON.stringify(summary, null, 2), outputDir, 'utf8');

    // Markdown summary
    const mdContent = this.generateMarkdownReport(summary);
    SecurityUtils.safeWriteFileSync(summaryFile, mdContent, outputDir, 'utf8');

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
    // Scanner-specific CLI flags must take effect immediately. getUnifiedConfig
    // handles shared settings, while these switches control this command's report
    // output and scan bounds.
    this.config = { ...baseConfig, ...args, ...(this.config || {}) };

    this.sourceDir = this.config.sourceDir || './src';
    // If sourceDir equals the locale/i18n directory, fall back to ./src for source code scanning
    const i18nDir = this.config.i18nDir || this.config.localeDir || './locales';
    if (path.resolve(this.sourceDir) === path.resolve(i18nDir)) {
      this.sourceDir = './src';
    }

    // Source language for multi-language detection
    this.sourceLanguage = args.sourceLanguage || this.config.sourceLanguage || 'en';

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
      const detected = detectProjectFramework(process.cwd());
      this.framework = detected || fwFallback;
    } else {
      this.framework = fwFallback;
    }

    // Validate source directory
    if (!SecurityUtils.safeExistsSync(this.sourceDir, path.dirname(this.sourceDir))) {
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

    const patterns = getFrameworkPatterns(this.framework);
    const exclusions = [
      ...(this.config.exclude || []),
      ...(this.config.excludeFiles || []),
      ...(this.config.excludeDirs || []),
      ...(this.config.processing?.excludeFiles || []),
      ...(this.config.processing?.excludeDirs || []),
      'node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.output',
      '.svelte-kit', '.astro', '.cache', '__generated__', 'coverage'
    ];
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
