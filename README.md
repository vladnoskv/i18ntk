# I18N Management Toolkit

**Version:** 1.6.3  
**Last Updated:** 27/07/2025  
**Maintainer:** Vladimir Noskov  

A comprehensive, enterprise-grade internationalization (i18n) management toolkit for JavaScript/TypeScript projects. This toolkit provides automated translation management, validation, analysis, and maintenance tools to ensure your application supports multiple languages effectively with advanced debugging capabilities and robust testing suite.

## 📦 Installation

### Global Installation (Recommended)

```bash
npm install -g i18ntk
```

This will install the toolkit globally, making all commands available in your terminal.

### Local Installation

```bash
npm install i18ntk --save-dev
```

When installed locally, you can run commands using npx:

```bash
npx i18ntk-manage
npx i18ntk-init
# etc.
```

## 🆕 What's New in 1.6.3 - STABLE RELEASE READY

- **🧹 Translation File Cleanup:** Removed 42 extra keys from translation files (18 from Spanish, 24 from Japanese) for cleaner, more maintainable codebase.
- **✅ 100% Translation Coverage:** Maintained complete 573/573 key coverage across all 7 supported languages with zero extra keys.
- **🔍 Dynamic Translation Verification:** Verified all dynamic translation patterns (`{language}`, `{fileName}`, `{fileSize}`, etc.) are working correctly.
- **🛠️ Enhanced Quality Assurance:** All 25 tests passing with 100% translation coverage and zero inconsistencies.
- **📦 NPM Release Ready:** Package is fully optimized and ready for stable npm/yarn distribution.
- **🚀 Production Grade:** Enterprise-ready with comprehensive documentation and robust testing suite.
- **🔧 Advanced Debugging Tools:** Comprehensive debug utilities in `dev/debug/` directory with console translation tools.
- **🏗️ Enhanced Project Structure:** Organized documentation in `docs/` with API references, configuration guides, and release notes.
- **🛡️ Security Features:** Admin authentication system with encrypted PIN protection and session management.
- **📊 Comprehensive Reporting:** Analysis, validation, usage, sizing, and summary reports in `i18ntk-reports/` directory.

### 📊 Language Coverage Status
- 🇺🇸 **English**: 573/573 keys (100%)
- 🇩🇪 **German**: 573/573 keys (100%) - Added 173 keys
- 🇪🇸 **Spanish**: 573/573 keys (100%) - Added 173 keys
- 🇫🇷 **French**: 573/573 keys (100%) - Added 173 keys
- 🇯🇵 **Japanese**: 573/573 keys (100%) - Added 173 keys
- 🇷🇺 **Russian**: 573/573 keys (100%) - Added 173 keys
- 🇨🇳 **Chinese**: 573/573 keys (100%) - Added 173 keys

## 📚 Documentation

**📖 [Complete Documentation](./docs/README.md)** - Visit our comprehensive documentation hub

**🏠 [Documentation Index](./docs/INDEX.md)** - Quick navigation to all documentation

**🔧 [API Reference](./docs/api/API_REFERENCE.md)** - Complete API documentation

**⚙️ [Configuration Guide](./docs/api/CONFIGURATION.md)** - Detailed configuration options

**🐛 [Debug Tools](./docs/debug/DEBUG_TOOLS.md)** - Debugging and diagnostic tools

**📝 [Changelog](./CHANGELOG.md)** - Version history and release notes

## 🆕 Major Release (v1.5.0) - Stable Release

### 🌟 New Features
- **🌐 100% Console Translation Support**: All console output is now fully internationalized in all supported languages
- **🔒 Enhanced Admin PIN Security**: Upgraded encryption with session-based authentication and timeout management
- **⭐ PIN Display Security**: Admin PINs are properly masked with asterisks (****) in all interfaces
- **🔐 Session Management**: PIN authentication persists until session timeout or application exit
- **🛡️ Improved Security**: Replaced deprecated crypto functions with modern secure alternatives

### 🐛 Critical Bug Fixes
- **Fixed crypto deprecation warnings**: Updated to use `createCipheriv` and `createDecipheriv`
- **Fixed PIN display issues**: Proper masking and secure display of admin PINs
- **Fixed readline interface**: Resolved all interactive input issues with proper session handling
- **Fixed authentication flow**: Streamlined admin PIN verification and session management

### 🔧 Stability Improvements
- **Enhanced security architecture**: Modern encryption standards and secure PIN storage
- **Better session handling**: Automatic timeout and re-authentication when needed
- **Improved error handling**: Graceful degradation and user-friendly error messages
- **Robust authentication**: Reliable PIN verification with proper session state management

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
│   │   └── RELEASE_NOTES_v1.6.3.md    # v1.6.3 release notes
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

## 🚀 Quick Start

### 1. Installation
```bash
npm install -g i18n-management-toolkit
# or for local project
npm install
```

### 2. Initialize i18n Setup
```bash
npm run i18ntk:init
# or directly
node main/i18ntk-init.js
```

### 3. Run Main Management Interface
```bash
npm run i18ntk
# or directly
node main/i18ntk-manage.js
```

### 4. Automated Workflow (Recommended)
```bash
npm run i18ntk:autorun
# or directly
node main/i18ntk-autorun.js
```

### New Features

- **🔧 Debug Tools**: Access comprehensive debugging tools via option 13 in the main menu
- **⚙️ Advanced Settings**: Enhanced settings interface with validation and helper text
- **🔒 Admin PIN Protection**: Secure sensitive settings with encrypted PIN authentication
- **📁 Better Organization**: UI internationalization moved to main folder for cleaner structure

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

- **🗑️ Delete Reports and Backups (New)**: Add option to delete backups alongside reports with selection options: by folder, keep last 3, or delete all.

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

**Version 1.6.3 – Documentation and version consistency updates, improved reporting, bug fixes, and enhanced internationalisation support.**
## 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details.