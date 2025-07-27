# i18ntk - Enterprise i18n Management Toolkit

**Version:** 1.0.5 – System cleanup and organizational improvements. Enhanced production readiness! 🎉

[![1.0.5](https://badge.fury.io/js/i18ntk.svg)](https://badge.fury.io/js/i18ntk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)

**i18ntk** (i18n Toolkit) is a comprehensive, enterprise-grade internationalization management toolkit for JavaScript/TypeScript projects. It provides a complete CLI suite with multi-language support and advanced analysis capabilities for managing translations efficiently.

## 🚀 Quick Start

### Installation

#### Global Installation (Recommended)
```bash
npm install -g i18ntk
```

#### Local Installation
```bash
npm install i18ntk --save-dev
```

#### Using Yarn
```bash
yarn global add i18ntk
# or locally
yarn add -D i18ntk
```

### Get Started in 30 Seconds

```bash
# 1. Install globally
npm install -g i18ntk

# 2. Initialize in your project
i18ntk-init

# 3. Start managing translations
i18ntk-manage

# 4. Run complete analysis
i18ntk-complete
```

### Available Commands

Once installed globally, you have access to the main CLI command:

```bash
i18ntk            # 🎛️  Main management interface (interactive menu)
i18ntk --help     # ❓ Show help and available options
i18ntk --version  # 📋 Show version information
```

**Note:** Console UI translation support is at approximately 95%. Some hardcoded English text remains and will be addressed in upcoming updates, but this doesn't affect core functionality.

## ✨ What's New in v1.0.5

### 🧹 System Cleanup and Organization

#### 🔧 Major Improvements
- **Cleaned Translation Files**: Removed test-specific translation files from user locale directories
- **Fixed Code Issues**: Removed hardcoded validationStep and reportGenerator keys from i18ntk-complete.js
- **Better Organization**: Moved npm test reports to dev/debug/reports directory
- **Enhanced Cleanliness**: Prevented pollution of user systems with non-applicable translation files
- **Syntax Fixes**: Resolved syntax errors after key removal operations

#### 🎯 Production Readiness
- **Essential Files Only**: Ensured only essential file (common.json) remain in locales
- **Clean System**: Enhanced system cleanliness and prevented test artifacts in production
- **Better Structure**: Improved project organization with proper separation of concerns
- **Documentation Updates**: Updated documentation to reflect cleanup and organizational improvements

#### 🛡️ Quality Assurance
- **Test Isolation**: Test-specific files no longer pollute user installations
- **Clean Initialization**: Only necessary translation files are created during project setup
- **Improved Reliability**: Enhanced system stability through better file management
- **Production Safety**: Eliminated risk of test artifacts affecting production deployments

## 📚 Documentation

**📖 [Complete Documentation](./docs/README.md)** - Visit our comprehensive documentation hub

**🏠 [Documentation Index](./docs/INDEX.md)** - Quick navigation to all documentation

**🔧 [API Reference](./docs/api/API_REFERENCE.md)** - Complete API documentation

**⚙️ [Configuration Guide](./docs/api/CONFIGURATION.md)** - Detailed configuration options

**🐛 [Debug Tools](./docs/debug/DEBUG_TOOLS.md)** - Debugging and diagnostic tools

**📝 [Changelog](./CHANGELOG.md)** - Version history and release notes


## 🌟 Features

### Core Functionality
- **Automated Translation Management**: Initialize, analyze, validate, and complete translations
- **Language Purity Validation**: Ensure translations contain only appropriate language content
- **Missing Key Detection**: Identify and export missing translation keys
- **Usage Analysis**: Analyze translation key usage across your codebase
- **Sizing Reports**: Generate reports on translation file sizes and complexity
- **Workflow Automation**: Complete i18n workflows with a single command
- **Enhanced Stability**: Robust readline interface management and error handling

### Developer Tools
- **🌐 Complete Console Internationalization**: 100% of console output is fully translated into all supported languages
- **🔒 Enhanced Security**: Modern encrypted admin PIN with session-based authentication
- **🛡️ Session Management**: Secure PIN authentication with automatic timeout and re-authentication
- **🔧 Debug Tools**: Comprehensive debugging and analysis utilities
- **🧪 Test Suite**: Automated testing for translation completeness and system integrity
- **💾 Backup System**: Automatic configuration backups
- **⚡ Reliability**: Advanced error handling and graceful degradation for non-interactive environments

## 📁 Project Structure

```
i18n-management-toolkit/
├── main/                    # Core i18ntk scripts
│   ├── i18ntk-analyze.js   # Translation analysis
│   ├── i18ntk-autorun.js   # Automated workflow execution
│   ├── i18ntk-complete.js  # Complete missing translations
│   ├── i18ntk-init.js      # Initialize i18n setup
│   ├── i18ntk-manage.js    # Main management interface
│   ├── i18ntk-sizing.js    # Generate sizing reports
│   ├── i18ntk-summary.js   # Generate summary reports
│   ├── i18ntk-usage.js     # Analyze translation usage
│   ├── i18ntk-validate.js  # Validate translations
│   └── ui-i18n.js          # UI internationalization
├── utils/                   # Utility scripts and helpers
│   ├── admin-auth.js       # Admin authentication
│   ├── admin-cli.js        # Admin command-line interface
│   ├── admin-pin.js        # PIN management
│   ├── i18n-helper.js      # i18n utility functions
│   ├── security.js         # Security utilities
│   ├── detect-language-mismatches.js  # Language validation
│   ├── maintain-language-purity.js    # Language purity tools
│   ├── native-translations.js         # Native translation helpers
│   ├── translate-mismatches.js        # Translation mismatch tools
│   ├── validate-language-purity.js    # Language purity validation
│   ├── test-complete-system.js        # System testing
│   └── test-console-i18n.js           # Console i18n testing
├── dev/                     # Development and debugging tools
│   ├── debug/              # Debug utilities and analyzers
│   │   ├── debugger.js     # Main debugger
│   │   ├── console-translations.js    # Console translation tools
│   │   ├── complete-console-translations.js  # Console completion
│   │   ├── console-key-checker.js     # Console key validation
│   │   ├── export-missing-keys.js     # Missing key export
│   │   ├── find-extra-keys.js         # Extra key detection
│   │   ├── normalize-locales.js       # Locale normalization
│   │   ├── refactor-locales.js        # Locale refactoring
│   │   ├── reorder-locales.js         # Locale reordering
│   │   └── replace-hardcoded-console.js  # Console replacement
│   └── tests/              # Test suite
│       ├── test-complete-system.js    # Complete system tests
│       ├── test-console-i18n.js       # Console i18n tests
│       ├── test-features.js           # Feature tests
│       └── test-report.json           # Test reports
├── docs/                    # Comprehensive documentation
│   ├── api/                # API documentation
│   │   ├── API_REFERENCE.md           # Complete API reference
│   │   ├── COMPONENTS.md              # Component documentation
│   │   ├── CONFIGURATION.md           # Configuration guide
│   │   └── NPM_PUBLISHING_GUIDE.md    # NPM publishing guide
│   ├── debug/              # Debug documentation
│   │   ├── DEBUG_README.md            # Debug overview
│   │   └── DEBUG_TOOLS.md             # Debug tools guide
│   ├── development/        # Development documentation
│   │   ├── AGENTS.md                  # AI agent guidelines
│   │   ├── DEVELOPMENT_RULES.md       # Development rules
│   │   └── DEV_README.md              # Development overview
│   ├── release-notes/      # Release documentation
│   │   ├── RELEASE_NOTES_v1.6.0.md    # v1.6.0 release notes
│   │   ├── RELEASE_NOTES_v1.6.1.md    # v1.6.1 release notes
│   │   └── RELEASE_NOTES_v1.0.0.md    # v1.0.0 release notes
│   ├── reports/            # Report documentation
│   │   ├── ANALYSIS_README.md         # Analysis reports
│   │   ├── SIZING_README.md           # Sizing reports
│   │   ├── SUMMARY_README.md          # Summary reports
│   │   ├── USAGE_README.md            # Usage reports
│   │   └── VALIDATION_README.md       # Validation reports
│   ├── INSTALLATION.md     # Installation guide
│   ├── README.md           # Documentation overview
│   └── TODO_ROADMAP.md     # Future roadmap
├── scripts/                 # Utility scripts
│   ├── fix-missing-translation-keys.js  # Translation key fixes
│   └── verify-package.js               # Package verification
├── settings/                # Configuration management
│   ├── admin-config.json   # Admin configuration
│   ├── user-config.json    # User configuration
│   ├── settings-cli.js     # Settings CLI
│   ├── settings-manager.js # Settings management
│   └── backups/            # Configuration backups
├── locales/                 # Sample project translation files
│   ├── en/                 # English translations
│   ├── de/                 # German translations
│   ├── es/                 # Spanish translations
│   ├── fr/                 # French translations
│   └── ru/                 # Russian translations
├── ui-locales/             # Toolkit's UI translations (7 languages)
│   ├── en.json             # English UI
│   ├── de.json             # German UI
│   ├── es.json             # Spanish UI
│   ├── fr.json             # French UI
│   ├── ja.json             # Japanese UI
│   ├── ru.json             # Russian UI
│   └── zh.json             # Chinese UI
├── i18ntk-reports/         # Generated analysis reports
│   ├── analysis/           # Translation analysis
│   ├── validation/         # Validation reports
│   ├── usage/              # Usage analysis
│   ├── sizing/             # Sizing reports
│   ├── summary/            # Summary reports
│   └── workflow/           # Workflow reports
├── package.json            # NPM package configuration
├── CHANGELOG.md            # Version history
├── INDEX.md                # Documentation index
└── README.md               # This file
```


### 📋 TODO

- **🔍 Enhanced Debug Tools**: Expand debugging capabilities with more comprehensive analysis tools
- **📊 Advanced Reporting**: Improve report generation with more detailed analytics
- **🚀 Performance Optimization**: Further optimize translation processing for large projects
- **🌍 Additional Language Support**: Expand UI language support beyond current 6 languages
- **📝 UI-Locales Structure Refactor (Planned)**: Refactor `ui-locales/*.json` to use a multi-language object format for each key, e.g.:

```json
{
  "analyzeTranslations": {
    "reportTitle": {
      "en": "TRANSLATION ANALYSIS REPORT FOR {language}",
      "de": "ÜBERSETZUNGSANALYSENBERICHT FÜR {language}",
      "fr": "RAPPORT D'ANALYSE DE TRADUCTION POUR {language}",
      "es": "INFORME DE ANÁLISIS DE TRADUCCIÓN PARA {language}",
      "ru": "ОТЧЁТ О АНАЛИЗЕ ПЕРЕВОДА ДЛЯ {language}",
      "ja": "{language} の翻訳分析レポート",
      "zh": "{language} 翻译分析报告"
    },
    "generated": {
      "en": "Generated: {timestamp}",
      "de": "Erstellt: {timestamp}",
      "fr": "Généré : {timestamp}",
      "es": "Generado: {timestamp}",
      "ru": "Сгенерировано: {timestamp}",
      "ja": "生成日時: {timestamp}",
      "zh": "生成时间: {timestamp}"
    },
    "status": {
      "en": "Status: {translated}/{total} translated ({percentage}%)",
      "de": "Status: {translated}/{total} übersetzt ({percentage}%)",
      "fr": "Statut : {translated}/{total} traduit ({percentage}%)",
      "es": "Estado: {translated}/{total} traducido ({percentage}%)",
      "ru": "Статус: переведено {translated}/{total} ({percentage}%)",
      "ja": "状況: {total}中{translated}件翻訳済み ({percentage}%)",
      "zh": "状态：{translated}/{total} 已翻译 ({percentage}%)"
    }
  }
}
```

> **📖 For detailed setup and usage instructions, see [Documentation](./docs/README.md)**

## 🛠️ Core Commands

### NPM Scripts (Recommended)

| Command | Description | Direct Usage |
|---------|-------------|-------------|
| `npm run i18ntk` | Interactive management interface | `node main/i18ntk-manage.js` |
| `npm run i18ntk:autorun` | Automated complete workflow | `node main/i18ntk-autorun.js` |
| `npm run i18ntk:init` | Initialize i18n configuration | `node main/i18ntk-init.js` |
| `npm run i18ntk:analyze` | Analyze translation completeness | `node main/i18ntk-analyze.js` |
| `npm run i18ntk:validate` | Validate translation integrity | `node main/i18ntk-validate.js` |
| `npm run i18ntk:complete` | Complete missing translations | `node main/i18ntk-complete.js` |
| `npm run i18ntk:usage` | Analyze translation key usage | `node main/i18ntk-usage.js` |
| `npm run i18ntk:sizing` | Generate sizing reports | `node main/i18ntk-sizing.js` |
| `npm run i18ntk:summary` | Generate summary reports | `node main/i18ntk-summary.js` |
| `npm run i18ntk:debug` | Debug and diagnostics | `node dev/debug/debugger.js` |

### Utility Scripts

| Script | Description | Usage |
|--------|-------------|-------|
| `settings-cli.js` | Configure toolkit settings | `node settings-cli.js` |
| `utils/admin-cli.js` | Admin operations | `node utils/admin-cli.js` |

> **📖 For complete command reference, see [API Documentation](./docs/api/API_REFERENCE.md)**

## 🔧 Configuration

### User Configuration (`user-config.json`)
```json
{
  "localesPath": "./locales",
  "supportedLanguages": ["en", "es", "fr", "de", "ru"],
  "defaultLanguage": "en",
  "excludePatterns": ["node_modules", ".git"],
  "includePatterns": ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"]
}
```

### Admin Configuration (`admin-config.json`)
```json
{
  "adminPasswordHash": "...",
  "securityEnabled": true,
  "backupEnabled": true
}
```

## 📊 Reports and Analysis

The toolkit generates comprehensive reports in the `i18ntk-reports/` directory:

- **Analysis Reports**: Translation completeness and missing keys
- **Validation Reports**: Translation integrity and language purity
- **Usage Reports**: Translation key usage statistics
- **Sizing Reports**: File size and complexity analysis
- **Summary Reports**: Overall project i18n status
- **Workflow Reports**: Complete workflow execution results
- **i18n-settings Reports**: Settings reports are now located in `i18ntk-reports/`

> **📖 For detailed reporting information, see [Reports Documentation](./docs/reports/)**

## 🌍 Supported Languages

The toolkit UI supports **7 languages** with complete internationalization:

| Language | Code | Status | Coverage |
|----------|------|--------|----------|
| 🇺🇸 English | `en` | ✅ Complete | 573/573 keys (100%) |
| 🇩🇪 German | `de` | ✅ Complete | 573/573 keys (100%) |
| 🇪🇸 Spanish | `es` | ✅ Complete | 573/573 keys (100%) |
| 🇫🇷 French | `fr` | ✅ Complete | 573/573 keys (100%) |
| 🇯🇵 Japanese | `ja` | ✅ Complete | 573/573 keys (100%) |
| 🇷🇺 Russian | `ru` | ✅ Complete | 573/573 keys (100%) |
| 🇨🇳 Chinese | `zh` | ✅ Complete | 573/573 keys (100%) |

**Features:**
- 100% console output internationalization
- Complete UI element translation
- Dynamic placeholder support (`{language}`, `{fileName}`, etc.)
- Zero missing or extra translation keys
- Verified translation patterns across all languages

Contributions for additional languages are welcome!

## 🧪 Development and Testing

### Debug Tools
```bash
# Main debug interface
npm run i18ntk:debug

# Check console translations
node dev/debug/console-translations.js

# Complete console translations
node dev/debug/complete-console-translations.js

# Replace hardcoded console messages
node dev/debug/replace-hardcoded-console.js
```

### Testing
```bash
# Run complete system test
node dev/tests/test-complete-system.js

# Test console i18n
node dev/tests/test-console-i18n.js

# Test all features
node dev/tests/test-features.js
```

> **📖 For comprehensive debug tools documentation, see [Debug Tools](./docs/debug/DEBUG_TOOLS.md)**

## 🔒 Security Features

- Admin authentication for sensitive operations
- Secure password hashing
- Configuration backup system
- Input validation and sanitization

## 📝 Best Practices

1. **Regular Validation**: Run validation checks frequently
2. **Backup Configurations**: Enable automatic backups
3. **Language Purity**: Maintain language-specific content
4. **Usage Analysis**: Regularly analyze key usage to identify unused translations
5. **Automated Workflows**: Use `i18ntk-autorun.js` for comprehensive maintenance

## 🤝 Contributing

1. Follow the development rules in [Development Rules](./docs/development/DEVELOPMENT_RULES.md)
2. Ensure all console output is internationalized for all supported languages
3. Add appropriate tests for new features
4. Update documentation and version references as needed

> **📖 For detailed contribution guidelines, see [Development Documentation](./docs/development/)**

---

**🌍 Happy Internationalizing!**

*For the most up-to-date documentation and guides, visit [docs/README.md](./docs/README.md)*

---

**Version:** 1.0.5 – System cleanup and organizational improvements. Enhanced production readiness! 🎉
## 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details.