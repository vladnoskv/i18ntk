# i18ntk - Enterprise i18n Management Toolkit

**Version:** 1.1.5 – **PRODUCTION READY** with enhanced documentation and npm metadata cleanup! 🌍

**⚠️ Important Notice:** All previous versions (< 1.1.5) are now deprecated due to critical bugs and issues. Please upgrade to v1.1.5 for the most stable experience. We recommend backing up your project before upgrading. 

**🎉 Thank You:** 200+ downloads in the first week! Thank you for your support and patience as we resolved the functional issues. My First Published Project. 

[![1.1.5](https://badge.fury.io/js/i18ntk.svg)](https://badge.fury.io/js/i18ntk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)

**i18ntk** (i18n Toolkit) is a comprehensive, enterprise-grade internationalization management toolkit for JavaScript/TypeScript projects. It provides a complete CLI suite with multi-language support and advanced analysis capabilities for managing translations efficiently.

## ⚠️ Important Disclaimer

**This is NOT an official i18n team product or affiliated with any i18n organization.** This toolkit was originally created as a personal project to help manage my own translation files, which was then enhanced with additional features, internationalization support, and made available to the community. It should work with any `en.json` translation files, even without i18n installed, and includes custom logic and settings that can be customized to fit your specific project needs. With simple code modifications or AI-assisted edits, you can easily adapt it to your project's requirements.

## 🚀 Quick Start

### Installation

#### Local Installation (Recommended)
```bash
npm install i18ntk --save-dev
```

#### Using npx (for local installations)
```bash
npx i18ntk <command>
```

#### Global Installation (Optional)
```bash
npm install -g i18ntk
```

#### Using Yarn
```bash
yarn add -D i18ntk
# or globally
yarn global add i18ntk
```

### Get Started in 30 Seconds

```bash
# 1. Install locally
npm install i18ntk --save-dev

# 2. Initialize in your project
npx i18ntk-init

# 3. Start managing translations
npx i18ntk-manage

# 4. Run complete analysis
npx i18ntk-complete
```

### Available Commands

Once installed, you can access the CLI commands using `npx` (for local installations) or directly if installed globally:

```bash
npx i18ntk            # 🎛️  Main management interface (interactive menu)
npx i18ntk <command>  # 🚀 Execute a specific command directly (e.g., `npx i18ntk usage`)
npx i18ntk --help     # ❓ Show help and available options
npx i18ntk --version  # 📋 Show detailed version information
npx i18ntk -v         # 📋 Show detailed version information (short flag)
```

**Note:** v1.1.4 is production-ready with full core functionality. Console UI translation support is at approximately 95% with English fallback for missing keys. Core features work flawlessly - only translation completion remains.

**Important:** Direct command execution (e.g., `npx i18ntk usage`) now bypasses the interactive menu, allowing for more streamlined workflows and scripting.

## ✨ What's New in v1.1.5

### 🧹 Documentation & Metadata Cleanup
- **Enhanced**: Updated all documentation to reflect current version and best practices
- **Improved**: Cleaned up npm package metadata for better clarity
- **Fixed**: Repository URLs and homepage links in package configuration
- **Updated**: Installation instructions and version references throughout documentation

### 🐛 Previous Version Deprecation
- **Status**: All versions < 1.1.5 are now deprecated due to critical bugs
- **Recommendation**: Immediate upgrade to v1.1.5 for stable functionality
- **Migration**: Major-breaking-changes upgrading from any 1.0.x version. Uninstall, and reinstall and rerun initilization.

### 📁 Enhanced Project Organization
- **Improved**: Configuration files now properly organized in `settings/` directory
- **Enhanced**: All reports centralized in `i18ntk-reports/` directory for better organization
- **Cleaned**: Removed duplicate configuration files from root directory
- **Updated**: Documentation reflects new file structure and locations

### 🎉 Community Milestone
- **Achievement**: 200+ downloads in the first week
- **Gratitude**: Thank you for your patience as we resolved functional issues
- **Commitment**: Continued focus on stability and user experience

## 📚 Documentation

**📖 [Complete Documentation](./docs/README.md)** - Visit our comprehensive documentation hub

**🏠 [Documentation Index](./docs/INDEX.md)** - Quick navigation to all documentation

**📊 [Translation Status](./docs/TRANSLATION_STATUS.md)** - Current translation completion status

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
│   └── i18ntk-ui.js        # UI internationalization
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
│   ├── i18ntk-config.json  # User configuration (main config file)
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

### User Configuration (`i18ntk-config.json`)
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

**Version:** 1.1.0 – Enhanced CLI experience with proper version command and improved documentation! 🚀
## 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details.