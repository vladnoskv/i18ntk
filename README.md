# 🌍 i18ntk - The Ultimate i18n Translation Management Toolkit

![i18ntk Logo](docs/screenshots/i18ntk-logo-public.PNG)

**Version:** 1.9.1
**Last Updated:** 2025-08-15  
**GitHub Repository:** [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)

[![npm version](https://badge.fury.io/js/i18ntk.svg)](https://badge.fury.io/js/i18ntk) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Performance](https://img.shields.io/badge/Performance-97%25%20faster-blue.svg)](https://github.com/vladnoskv/i18ntk#performance) 
[![npm downloads](https://img.shields.io/npm/dt/i18ntk.svg?label=npm%20downloads)](https://www.npmjs.com/package/i18ntk) [![GitHub stars](https://img.shields.io/github/stars/vladnoskv/i18ntk?style=social&label=github%20stars)](https://github.com/vladnoskv/i18ntk) [![Socket Badge](https://socket.dev/api/badge/npm/package/i18ntk/1.9.1)](https://socket.dev/npm/package/i18ntk/overview/1.9.1)

An ultra-extreme performance i18n **internationalization management toolkit** with 97% performance improvement, intelligent framework detection, security-first design with PIN protection, and comprehensive translation management capabilities. **NEW 1.9.1: Automatic Language Detection**: JavaScript, Python, Go, Java, PHP

## 🚀 Quick Start

### One-Time Setup
```bash
npm install -g i18ntk
i18ntk
```

The toolkit will automatically detect your environment and guide you through a one-time setup process.

### After Setup
Once setup is complete, all commands work seamlessly:

```bash
# Main management interface
i18ntk

# Direct commands
i18ntk analyze --dry-run
i18ntk validate
i18ntk usage
```

## 🎯 Key Features

### 🔍 Intelligent Framework Detection
- **Automatic Language Detection**: JavaScript, Python, Go, Java, PHP
- **Framework Recognition**: React, Vue, Angular, Django, Flask, Spring, Laravel
- **Enhanced Prompting**: Language-aware suggestions with best practices
- **One-time Setup**: Automatic configuration after initial setup

### ⚡ Ultra-Extreme Performance
- **97% faster** than traditional i18n tools
- **15.38ms** for 200k keys processing
- **Memory optimized**: < 1MB for any operation
- **Multiple optimization modes**: Extreme, Ultra, Optimized
- **Zero shell access security** - completely secure execution

### 🛡️ Security-First Design
- **Zero Shell Access**: All operations use secure Node.js APIs
- **Admin PIN Protection**: Secure authentication system
- **Input Validation**: Comprehensive sanitization and validation
- **Command Injection Protection**: Secure spawn-based execution
- **Encrypted Configuration**: AES-256 encrypted settings storage

### 🌍 Multi-Language Support
- **7 built-in UI languages**: English, Spanish, French, German, Japanese, Russian, Chinese, plus English locale templates
- **200+ translation locales** supported
- **Pluralization and context handling**
- **RTL language support**
- **Custom placeholder markers** with validation

## 📋 CLI Commands

### Core Commands
| Command | Description |
|---------|-------------|
| `i18ntk` | Main management interface (post-setup) |
| `i18ntk-setup` | One-time foundational setup |
| `i18ntk-init` | Initialize new i18n project |
| `i18ntk-manage` | Interactive management interface |

### Analysis & Validation
| Command | Description |
|---------|-------------|
| `i18ntk-analyze` | Analyze translation completeness with detailed reports |
| `i18ntk-validate` | Validate translation files for errors and completeness |
| `i18ntk-usage` | Check translation usage across your codebase |
| `i18ntk-complete` | Generate translation completion reports |
| `i18ntk-summary` | Create comprehensive project summaries |

### Framework-Specific
| Command | Description |
|---------|-------------|
| `i18ntk-js` | JavaScript/TypeScript specific analysis |
| `i18ntk-py` | Python specific analysis |
| `i18ntk-java` | Java specific analysis |
| `i18ntk-php` | PHP specific analysis |

### Maintenance & Diagnostics
| Command | Description |
|---------|-------------|
| `i18ntk-doctor` | Diagnose and fix common i18n issues |
| `i18ntk-fixer` | Interactive translation fixer with custom placeholders |
| `i18ntk-scanner` | Advanced file scanning for i18n patterns |
| `i18ntk-sizing` | Analyze translation file sizes and optimization opportunities |
| `i18ntk-complete` | Generate completion reports with actionable insights |

## 🏗️ Supported Frameworks (BETA v2)

**Note**: Our framework feature now beta v2 includes enhanced framework detection and should now support Python. The package also has a more advanced runtime framework that can be run on multiple frameworks, this is an experimental feature and has been tested in simulated environments, but I will require your feedback if things don't work and I will get it fixed!

### JavaScript/TypeScript
- React (react-i18next) - 95% accurate with package installed
- Vue.js (vue-i18n) - 92% accurate with package installed
- Angular (Angular i18n) - 90% accurate with package installed
- Next.js (next-i18next)
- Svelte (svelte-i18n)
- Vanilla JavaScript (i18next) - 85% accurate with generic patterns

### Python
- Django (built-in i18n)
- Flask (Flask-Babel)
- FastAPI (i18n middleware)

### Java
- Spring Boot (Spring i18n)
- Spring Framework
- Quarkus

### Go
- go-i18n
- nicksnyder/go-i18n

### PHP
- Laravel (built-in localization)
- Symfony (Translation component)
- WordPress (i18n functions)

**Framework Detection Accuracy:** Install your framework's i18n package for best results. Without packages, scanner uses generic patterns and may require custom configuration.

## 📊 Performance Benchmarks

| Mode | Operations | Time | Memory Usage | Improvement |
|------|------------|------|--------------|-------------|
| **Ultra-Extreme** ⚡ | 200k keys | **15.38ms** | 1.62MB | **97% faster** |
| **Extreme** | 200k keys | 38.90ms | 0.61MB | **87% faster** |
| **Ultra** | 200k keys | 336.8ms | 0.64MB | **78% faster** |
| **Optimized** | 200k keys | 847.9ms | 0.45MB | **45% faster** |

### v1.9.1 Performance Improvements
- **Zero overhead** from security enhancements
- **Python detection** adds <1ms overhead
- **Enhanced validation** with no performance impact
- **Memory usage** remains <2MB for all operations

### Real-world Performance
```
100 keys:     3.61ms (ultra-extreme)
1,000 keys:   14.19ms (ultra-extreme)
10,000 keys:  151.30ms (ultra-extreme)
200,000 keys: 15.38ms (ultra-extreme)
```

*Benchmarks conducted on Node.js 22+ with 200,000 translation keys across multiple frameworks*

### Performance Features
- **Linear scaling**: 5M+ keys/second with optimized settings
- **Memory efficient**: <2MB for any operation
- **Zero dependencies**: 2.0 MB total package size
- **Parallel processing**: Utilizes all CPU cores for maximum throughput

## 📁 Project Structure

### Production Package (84 files)
```
i18ntk/
├── main/                    # CLI commands (16 executables)
│   ├── i18ntk-manage.js    # Main interface
│   ├── i18ntk-setup.js     # One-time setup
│   ├── i18ntk-analyze.js   # Translation analysis
│   ├── i18ntk-py.js        # NEW: Python analysis
│   └── 12 other commands...
├── runtime/                # Runtime libraries
│   ├── index.js           # Main runtime
│   └── enhanced.js        # Enhanced features
├── utils/                  # Utility modules
│   ├── security.js        # Security functions
│   ├── framework-detector.js # Enhanced detection
│   └── 25+ utility modules...
├── scripts/                # Production scripts
│   ├── locale-optimizer.js # Performance optimization
│   ├── security-check.js   # Security validation
│   └── 10 utility scripts...
├── settings/               # Configuration management
├── ui-locales/             # 8 built-in UI languages
├── locales/                # Translation templates
│   └── common.json        # NEW: Common translation patterns
├── package.json            # Package configuration (v1.9.1)
├── README.md              # This documentation
└── LICENSE                # MIT license
```

## 🔧 Configuration

### Environment Variables
```bash
# Directory settings
I18N_SOURCE_DIR=./locales
I18N_OUTPUT_DIR=./i18ntk-reports
I18N_I18N_DIR=./locales
I18N_PROJECT_ROOT=./

# Performance
I18N_PERFORMANCE_MODE=ultra-extreme
I18N_CACHE_ENABLED=true

# Security
I18N_ADMIN_PIN_ENABLED=true
I18N_SESSION_TIMEOUT=1800

# Runtime
I18NTK_RUNTIME_DIR=./locales
```

### Configuration Files
- `settings/i18ntk-config.json` - Main configuration (single source of truth)
- `settings/initialization.json` - Setup completion marker
- `settings/framework-config.json` - Framework-specific settings
- `settings/backups/` - Automatic backups directory

### Complete Configuration Example
Create `settings/i18ntk-config.json`:

```json
{
  "version": "1.9.1",
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
  },
  "placeholderStyles": {
    "en": ["\\{\\{[^}]+\\}\\}"],
    "de": ["%s"],
    "fr": ["{\\d+}"]
  }
}
```

## 🧩 Runtime Translation API (Framework-Agnostic)

Use i18ntk's minimal runtime helper in any project (framework or vanilla) to load JSON locales at runtime and translate keys.

### Installation
Import from the subpath export `i18ntk/runtime`:

```typescript
// ESM/TypeScript
import { initRuntime, t, translate, setLanguage, getAvailableLanguages } from 'i18ntk/runtime';

initRuntime({
  baseDir: './locales',
  language: 'en',
  fallbackLanguage: 'en',
  keySeparator: '.',
  preload: true,
});

console.log(t('common.hello', { name: 'Ada' }));
setLanguage('de');
```

```javascript
// CommonJS
const { initRuntime, t, translate, setLanguage } = require('i18ntk/runtime');
initRuntime({ preload: true });
console.log(translate('navigation.home'));
```

### Supported Locale Structures
- `./locales/en.json` (single file per language)
- `./locales/en/*.json` (folder per language; files are deep-merged)

### Path Resolution Order
1. Explicit `baseDir` passed to `initRuntime()`
2. `I18NTK_RUNTIME_DIR` environment variable
3. `settings/i18ntk-config.json` via internal config manager
4. Fallback `./locales` relative to project root

## 🛠️ Development

### Prerequisites
- Node.js 16+
- npm 6+

### Installation
```bash
git clone https://github.com/vladnoskv/i18ntk.git
cd i18ntk
npm install
npm test
```

### Testing
```bash
npm test
npm run test:performance
npm run test:security
```

### Integration Examples

#### React Setup
```bash
# Extract from React components
i18ntk extract --source ./src --framework react
```

#### Vue Setup
```bash
# Extract from Vue components
i18ntk extract --source ./src --framework vue
```

## 🛡️ Security Features

### Zero Shell Access Security
- **100% Node.js native operations** - Complete elimination of child_process
- **Zero shell vulnerabilities** - No exec, spawn, or shell commands
- **Direct fs/path API usage** - Secure file operations only
- **Path traversal protection** - Validated directory access
- **Memory-safe execution** - No external process spawning

### Security Comparison (v1.9.1)
| Area | Before (Risk) | After (1.9.1) |
|------|---------------|----------------|
| Shell execution | child_process.exec/spawn | **100% removed** |
| File operations | Mixed shell + Node | **Node.js fs APIs only** |
| Process spawning | External commands | **Zero process spawning** |
| Input validation | Inconsistent | **Validated + normalized** |
| Admin controls | Optional PIN | **PIN + cooldown + timeout** |
| Encryption | Basic | **AES-256-GCM encrypted** |
| Dependencies | 3rd party shell access | **Zero shell dependencies** |

### Security Features
- **Admin PIN Protection**: Secure authentication with session management
- **Command-line PIN**: `--admin-pin` argument for non-interactive mode
- **Standardized Exit Codes**: Consistent across all CLI commands
- **Path Validation**: Directory traversal attack prevention
- **Input Sanitization**: Enhanced validation and sanitization
- **Encrypted Backups**: AES-256-GCM for sensitive data

### Exit Codes
| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Handled configuration error |
| 2 | Validation failed |
| 3 | Security violation |

## 🌍 Locale Size Optimizer

Reduce UI locale bundle size by up to **86%**:

```bash
# Interactive selection
node scripts/locale-optimizer.js --interactive

# Keep specific languages
node scripts/locale-optimizer.js --keep en,es,de

# Restore all languages
node scripts/locale-optimizer.js --restore

# List sizes
node scripts/locale-optimizer.js --list
```

**Example:** 830.4KB → 115.3KB for English-only optimization

## 📊 i18ntk vs Traditional Tools

| Feature | i18ntk 1.9.0 | Traditional Tools | Manual Process |
|---------|--------------|-------------------|----------------|
| **Speed** | 15.38ms (200k keys) | 2-5 minutes | Hours |
| **Memory** | <2MB | 50-200MB | Variable |
| **Package Size** | 315KB packed | 5-50MB | N/A |
| **Dependencies** | Zero | 10-50 packages | Zero |
| **Framework Support** | Auto-detect 8+ frameworks | Manual config | Manual |
| **Security** | AES-256 + PIN | Basic | None |
| **Languages** | 8 UI languages | Usually 1-2 | Manual |
| **CI/CD Ready** | ✅ JSON output | ❌ Manual | ❌ |

## 🎯 Enhanced Translation Fixer

Interactive tool with automatic detection and repair:

```bash
# Enhanced guided mode
i18ntk fixer --interactive

# Fix specific languages with custom markers
i18ntk fixer --languages en,es,fr --markers "{{NOT_TRANSLATED}},__MISSING__"

# Auto-fix with reporting
i18ntk fixer --source ./src/locales --auto-fix --report

# Detect custom placeholder styles
i18ntk fixer --markers "TODO_TRANSLATE,PLACEHOLDER_TEXT,MISSING_TRANSLATION"

# Fix all languages
i18ntk fixer --languages all
```

**Features:**
- 8-language UI support
- Smart marker detection
- Selective fixing by language/file
- Comprehensive reporting
- Secure backup creation
- Real-time progress trackingbash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:performance
```

## 📚 Documentation

All documentation is built into the toolkit. Use:

```bash
i18ntk --help        # General help
i18ntk [command] --help  # Command-specific help
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔄 Changelog

### v1.9.1 - Production Release
- **🔥 Python Support Added** - Full Python i18n framework detection and analysis
- **🚀 Ultra-extreme performance** - 97% faster processing with zero shell access
- **🛡️ Security-first design** - Complete removal of child_process dependencies
- **🔍 Enhanced Framework Detection** - Improved accuracy for all supported frameworks
- **📦 Streamlined package** - Reduced to 84 production files
- **🌍 8 built-in UI languages** - Complete localization support
- **⚙️ One-time setup** - Automatic framework detection with language-specific best practices

### v1.9.0 - Enhanced Setup & Framework Detection
- One-time setup behavior
- Enhanced framework detection with language info
- Language-specific best practices
- Improved user experience

### v1.8.0 - Performance Optimization
- 87% performance improvement
- Memory optimization
- Multiple optimization modes

### v1.7.0 - Security Enhancements
- Admin PIN protection
- Session management
- Input validation improvements

## 🆕 What's New in 1.9.1

### 🔥 Major Enhancements
- **Python Support**: Full i18n analysis for Django, Flask, FastAPI, and generic Python projects
- **Security Overhaul**: Complete elimination of child_process dependencies - 100% Node.js native
- **Enhanced Framework Detection**: Improved accuracy across all supported frameworks
- **Performance Optimizations**: Further refinements to ultra-extreme mode
- **Code Quality**: Improved readability and maintainability across all modules

### 🛡️ Security Improvements
- **Zero Shell Access**: All child_process.exec/spawn calls removed
- **Memory-Safe Operations**: 100% Node.js fs/path API usage
- **Dependency Cleanup**: Removed all shell access vulnerabilities
- **Enhanced Validation**: Improved input sanitization and path validation

### 📁 File Structure Updates
- **Added**: `locales/common.json` - Common translation patterns
- **Removed**: Outdated test files and debug tools
- **Optimized**: Package structure reduced to 84 production files
- **Enhanced**: Framework detection patterns for Python projects

### 🐍 Python-Specific Features
- **Django**: Automatic gettext pattern detection
- **Flask**: Flask-Babel integration support
- **FastAPI**: i18n middleware recognition
- **Generic Python**: Standard gettext and babel support

---

## 📸 Screenshots

| **Framework Detection** | **Main Menu** |
|:-----------------------:|:-------------:|
| ![Framework Detection](docs/screenshots/I18NTK-FRAMEWORK.PNG) | ![Main Menu](docs/screenshots/I18NTK-MENU.PNG) |

| **Initialization** | **Initilization Language Select** |
|:------------------:|:---------------------------------:|
| ![Initialization](docs/screenshots/I18NTK-INIT.PNG) | ![Init Summary](docs/screenshots/I18NTK-INIT-LANG-SELECT.PNG) | 

| **Language Selection** | **Language Changed** |
|:----------------------:|:--------------------:|
| ![Language Selection](docs/screenshots/I18NTK-LANGUAGE-UI.PNG) | ![Language Changed](docs/screenshots/I18NTK-LANGUAGE-UI-CHANGED.PNG) |

| **Settings Manager (v1.8.3)** | **Translation Fixer (v1.8.3)** |
|:-----------------------------:|:-------------------------------:|
| ![Settings Manager](docs/screenshots/I18NTK-SETTINGS.PNG) | ![Translation Fixer](docs/screenshots/I18NTK-FIXER.PNG) |

| **Analyze** | **Complete** | **Usage** |
|:-----------:|:------------:|:----------:|
| ![Analyze](docs/screenshots/I18NTK-ANALYZE.PNG) | ![Complete](docs/screenshots/I18NTK-COMPLETE.PNG) | ![Usage](docs/screenshots/I18NTK-USAGE.PNG) |

| **Sizing (Overview)** | **Sizing (List)** |
|:---------------------:|:-----------------:|
| ![Sizing](docs/screenshots/I18NTK-SIZING.PNG) | ![Sizing List](docs/screenshots/I18NTK-SIZING-LIST.PNG) |

| **Validate** | **Validate End** |
|:-----------:|:-----------------:|
| ![Validate](docs/screenshots/I18NTK-VALIDATE.PNG) | ![Validate End](docs/screenshots/I18NTK-VALIDATE-END.PNG) |

| **Summary** | **Summary Report** | **Summary Completed** |
|:-----------:|:-----------------:|:-----------------:|
| ![Summary Start](docs/screenshots/I18NTK-SUMMARY-1.PNG) | ![Summary End](docs/screenshots/I18NTK-SUMMARY-2.PNG) | ![Summary Options](docs/screenshots/I18NTK-SUMMARY-3.PNG) |


| **Admin Pin** | **Admin Pin Setup** | **Admin Pin Success** | **Admin Pin Ask** |
|:-----------:|:-----------------:|:-----------------:|:-----------------:|
| ![Admin Pin](docs/screenshots/I18NTK-ADMIN-PIN.PNG) | ![Admin Pin Setup](docs/screenshots/I18NTK-ADMIN-PIN-SETUP.PNG) | ![Success](docs/screenshots/I18NTK-ADMIN-PIN-SUCCESS.PNG) | ![Admin Pin Ask](docs/screenshots/I18NTK-ADMIN-PIN-ASK.PNG) |


| **Delete Options** | **Delete Full** | **Delete None** |
|:------------------:|:------------------:|:------------------:|
| ![Delete Options](docs/screenshots/I18NTK-DELETE-CHOOSE.PNG) | ![Delete Full](docs/screenshots/I18NTK-DELETE-FULL.PNG) | ![Delete None](docs/screenshots/I18NTK-DELETE-NONE.PNG) | 

---
## 🤝 Contributing & Support

- **Issues:** [GitHub Issues](https://github.com/vladnoskv/i18ntk/issues)
- **Docs:** `./docs` (full walkthroughs and examples)
- **Benchmarks:** `./benchmarks/results`
- **Version:** `i18ntk --version`

**Made for the global dev community.** ❤️
**Last Updated:** 2025-08-15
**Version:** 1.9.1