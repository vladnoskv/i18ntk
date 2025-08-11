# 🌍 i18ntk - The Ultimate i18n Translation Management Toolkit

![i18ntk Logo](docs/screenshots/i18ntk-logo-public.PNG)

**Version:** 1.7.4
**Last Updated:** 2025-08-11  
**GitHub Repository:** [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)

[![npm](https://img.shields.io/npm/dt/i18ntk.svg)](https://www.npmjs.com/package/i18ntk) [![npm version](https://badge.fury.io/js/i18ntk.svg)](https://badge.fury.io/js/i18ntk) [![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/) [![Downloads](https://img.shields.io/npm/dm/i18ntk.svg)](https://www.npmjs.com/package/i18ntk) [![GitHub stars](https://img.shields.io/github/stars/vladnoskv/i18ntk?style=social)](https://github.com/vladnoskv/i18ntk) 
[![Socket Badge](https://socket.dev/api/badge/npm/package/i18ntk/1.7.1)](https://socket.dev/npm/package/i18ntk/overview/1.7.4)

**🚀 The fastest way to manage translations across any framework or vanilla JavaScript projects**

**Framework Support:** Auto-detects popular libraries (React i18next, Vue i18n, i18next, Nuxt i18n, Svelte i18n) or works without a framework. i18ntk manages translation files and validation—it does NOT implement translation logic like i18next or Vue i18n.

> **v1.7.4** – **NEW Interactive Translation Fixer Tool** with custom placeholder markers, selective language/file fixing, mass fix capabilities, and 7-language UI support; enhanced security logging, flexible 4-6 digit PIN authentication, configuration stability improvements, and CI/CD silent mode support; maintains 97% speed improvement (**15.38ms** for 200k keys)

## 🚀 Quick Start

```bash
# Install globally
npm i i18ntk

# Interactive setup
npx i18ntk

# Basic commands
i18ntk analyze --source ./src
i18ntk complete --source ./src
i18ntk validate --source ./locales
```

## ⚡ Performance

| Mode | Time (200k keys) | Memory | Package Size |
|------|------------------|--------|--------------|
| **Ultra-Extreme** | **15.38ms** | 1.62MB | 115KB-830KB |
| **Extreme** | **38.90ms** | 0.61MB | 115KB-830KB |
| Ultra | 336.8ms | 0.64MB | Configurable |
| Optimized | 847.9ms | 0.45MB | Full package |

## 🎯 Key Features

### ✨ **MAJOR FEATURE FOR 1.7.4: Interactive Translation Fixer Tool**

- **Ultra-Extreme Performance**: 97% speed improvement - **15.38ms** for 200k keys
- **Enhanced Security**: Advanced PIN protection with exponential backoff & AES-256 encryption
- **Edge Case Handling**: Robust handling of corrupt files, encoding issues, and network failures
- **Smart Sizing**: Interactive locale optimizer (up to 86% size reduction)
- **Interactive Translation Fixer**: New `i18ntk fixer` command with step-by-step guided fixing process
- **Enterprise Backup**: Automated encrypted backups with cloud integration
- **Zero Dependencies**: Lightweight, production-ready
- **Watch Helper**: Optional `--watch` mode keeps translations synced in real time
- **Lite Package Framework**: Build an English-only UI locale bundle for minimal footprint
- **7 UI Languages**: English, Spanish, French, German, Japanese, Russian, Chinese
- **Framework Support**: Auto-detects React i18next, Vue i18n, Angular, Next i18next, Nuxt i18next, Svelte i18n
- **Memory Optimization**: 67% memory reduction with streaming processing
- **Scalability**: Linear scaling up to 5M keys per second with ultra-extreme settings
- **Smart Framework Detection**: Automatically skips unnecessary prompts when i18n frameworks are detected

### 📸 Screenshots

| **Logo & Branding** | **Framework Detection** |
|:-------------------:|:----------------------:|
| ![i18ntk Logo](docs/screenshots/i18ntk-logo-public.PNG) | ![Framework Check](docs/screenshots/i18ntk-check-framwork.PNG) |

| **Management Interface** | **Initialization Menu** |
|:------------------------:|:------------------------:|
| ![i18ntk Management](docs/screenshots/i18ntk-manage-menu.PNG) | ![Init Menu](docs/screenshots/i18ntk-menu-init.PNG) |

| **Language Selection** | **Language Change** |
|:----------------------:|:-------------------:|
| ![Language Selection](docs/screenshots/i18ntk-menu-init-language.PNG) | ![Language Change](docs/screenshots/i18ntk-menu-language-change.PNG) |

## 📊 Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `init` | Setup project | `i18ntk init --interactive` |
| `analyze` | Find missing translations | `i18ntk analyze --source ./src` |
| `complete` | Generate translations | `i18ntk complete --config=ultra-extreme` |
| `validate` | Check translation quality | `i18ntk validate --strict` |
| `sync` | Sync across languages | `i18ntk sync --languages en,es,fr` |
| `usage` | Analyze usage patterns | `i18ntk usage --format=json` |
| `doctor` | Diagnose configuration issues | `i18ntk doctor` |
| `sizing` | Optimize package size | `i18ntk sizing --interactive` |
| `fixer` | Fix broken translations & placeholders | `i18ntk fixer --interactive` |

## 🔧 Configuration

Configuration is managed through the `settings/i18ntk-config.json` file:

```json
{
  "version": "1.7.4",
  "sourceDir": "./locales",
  "outputDir": "./i18ntk-reports",
  "defaultLanguage": "en",
  "supportedLanguages": ["en", "es", "fr", "de", "ja", "ru", "zh"],
  "performance": {
    "mode": "ultra-extreme",
    "batchSize": 2000,
    "concurrency": 32,
    "memoryLimit": "256MB",
    "streaming": true,
    "compression": "brotli"
  },
  "security": {
    "adminPinEnabled": true,
    "sessionTimeout": 30,
    "maxFailedAttempts": 3
  },
  "backup": {
    "enabled": true,
    "retentionDays": 30,
    "maxBackups": 100
  }
}
```

### Environment Variables

You can override common path settings with environment variables:

| Variable | Overrides | Description |
|----------|-----------|-------------|
| `I18NTK_PROJECT_ROOT` | `projectRoot` | Base project directory |
| `I18NTK_SOURCE_DIR` | `sourceDir` | Location of source translation files |
| `I18NTK_I18N_DIR` | `i18nDir` | Working i18n directory |
| `I18NTK_OUTPUT_DIR` | `outputDir` | Output directory for generated reports |

These values are merged into the loaded configuration at runtime.

## 🌍 Language Optimization

```bash
# Interactive locale selection
node scripts/locale-optimizer.js --interactive

# Keep specific languages
node scripts/locale-optimizer.js --keep en,es,de

# Restore all languages
node scripts/locale-optimizer.js --restore

# Check sizes
node scripts/locale-optimizer.js --list
```

## 🏗️ Integration Examples

### React
```javascript
// Extract from React components
i18ntk extract --source ./src --framework react

// Setup i18next
import i18n from './i18n';
i18next.init({ resources: i18n, lng: 'en' });
```

### Vue
```javascript
// Extract from Vue components  
i18ntk extract --source ./src --framework vue

// Setup vue-i18n
import { createI18n } from 'vue-i18n';
const i18n = createI18n({ locale: 'en', messages: translations });
```

## 🔒 Security Features

- **Admin PIN Protection**: AES-256-GCM encryption with 30-min sessions
- **Advanced Input Sanitization**: Comprehensive path traversal prevention
- **Zero-Trust Architecture**: All inputs validated and sanitized
- **Session Management**: Automatic timeout & cleanup with exponential backoff
- **File Validation**: Safe file operations with permission checks
- **Edge Case Security**: Robust handling of security edge cases
- **Encrypted Backups**: AES-256 encrypted backup storage

### 🎯 **NEW INTERACTIVE LOCALE OPTIMIZER** - up to 86% Package Size Reduction

- **Package Size**: 830.4KB → 115.3KB (86% reduction for English only)
- **Smart Management**: Interactive selection with automatic backups
- **Zero Breaking Changes**: Safe restoration from backups

### 🔧 **NEW TRANSLATION FIXER TOOL** - Mass Fix Broken Translations

**Interactive Translation Fixer with Multi-Marker Support**

- **Interactive Mode**: Step-by-step guided fixing process
- **Custom Placeholder Markers**: Configure any markers (e.g., `{{NOT_TRANSLATED}}`, `__UNTRANSLATED__`, `[PLACEHOLDER]`)
- **Selective Language Fixing**: Choose specific languages or fix all
- **Selective File Fixing**: Target specific files or directories
- **Mass Fix Capability**: Fix thousands of broken translations at once
- **Comprehensive Reports**: Detailed analysis and fix reports
- **8 Language Support**: Full internationalization for all UI interactions

**Usage Examples:**

```bash
# Interactive mode with guided prompts
i18ntk fixer --interactive

# Fix specific languages with custom markers
i18ntk fixer --languages en,es,fr --markers "{{NOT_TRANSLATED}},__MISSING__"

# Fix specific directory with auto-fix
i18ntk fixer --source ./src/locales --auto-fix --report

# Custom placeholder detection
i18ntk fixer --markers "TODO_TRANSLATE,PLACEHOLDER_TEXT,MISSING_TRANSLATION"

# Fix all available languages
i18ntk fixer --languages all --markers "[PLACEHOLDER],{{UNTRANSLATED}}"
```i18ntk fixer --interactive

# Fix specific languages with custom markers
i18ntk fixer --languages en,es,fr --markers "{{NOT_TRANSLATED}},__MISSING__"

# Fix specific directory with default settings
i18ntk fixer --source ./src/locales --languages all

# Non-interactive mode with auto-fix
i18ntk fixer --source ./locales --auto-fix --report

# Custom placeholder detection
i18ntk fixer --markers "TODO_TRANSLATE,PLACEHOLDER_TEXT,MISSING_TRANSLATION"
```

**Interactive Features:**
- **Welcome Screen**: Introduction and tool overview
- **Marker Configuration**: Custom placeholder marker setup
- **Language Selection**: Choose specific languages to fix
- **Directory Selection**: Target specific directories
- **Progress Tracking**: Real-time progress and statistics
- **Fix Confirmation**: Review before applying changes
- **Report Generation**: Detailed fix reports with before/after analysis

**Supported Placeholder Types:**
- **Standard Markers**: `{{NOT_TRANSLATED}}`, `__UNTRANSLATED__`
- **Custom Markers**: Any user-defined placeholder text
- **Framework Markers**: Framework-specific placeholders
- **Legacy Markers**: Support for old translation systems

**Output Reports Include:**
- Total issues found and fixed
- Missing translations identified
- Placeholder translations detected
- Language-specific statistics
- File-by-file analysis
- Before/after comparison

## 📋 Project Structure

```
your-project/
├── src/
│   └── components/
├── locales/           # Translation files
│   ├── en.json
│   ├── es.json
│   └── ...
├── i18ntk-reports/    # Generated reports
└── settings/          # Configuration directory
    └── i18ntk-config.json  # Main configuration file
```

## 🚨 Important Notes

- **Locale files are backed up automatically** before optimization
- **Use interactive optimizer** for safe locale management
- **All versions prior to 1.7.1 are deprecated**
- **All improvements applied automatically** on update


## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/vladnoskv/i18ntk/issues)
- **Documentation**: [Complete docs](./docs)
- **Performance**: [Benchmark results](./benchmarks/results)
- **Version**: `i18ntk --version`
---

**Made for the global development community** ❤️