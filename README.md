# I18N Management Toolkit

**Version:** 1.5.2  
**Last Updated:** 27/07/2025  
**Maintainer:** Vladimir Noskov  

A comprehensive, enterprise-grade internationalization (i18n) management toolkit for JavaScript/Node.js projects. This toolkit provides automated translation management, validation, analysis, and maintenance tools to ensure your application supports multiple languages effectively.

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
│   └── i18ntk-validate.js  # Validate translations
├── utils/                   # Utility scripts and helpers
│   ├── admin-auth.js       # Admin authentication
│   ├── admin-cli.js        # Admin command-line interface
│   ├── i18n-helper.js      # i18n utility functions
│   ├── security.js         # Security utilities
│   └── [other utilities]   # Language validation, testing tools
├── dev/                     # Development and debugging tools
│   ├── debug/              # Debug utilities and analyzers
│   └── tests/              # Test suite
├── locales/                 # Your project's translation files
├── ui-locales/             # Toolkit's UI translations
├── i18ntk-reports/         # Generated reports
├── backups/                # Configuration backups
└── settings-manager.js     # Configuration management
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

The toolkit UI supports the following languages:
- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Russian (ru)
- Japanese (ja)
- Chinese (zh)

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
2. Ensure all console output is internationalized
3. Add appropriate tests for new features
4. Update documentation as needed

> **📖 For detailed contribution guidelines, see [Development Documentation](./docs/development/)**

---

**🌍 Happy Internationalizing!**

*For the most up-to-date documentation and guides, visit [docs/README.md](./docs/README.md)*
## 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details.

## 🆘 Support

### Documentation
- **📚 [Complete Documentation](./docs/README.md)** - Main documentation hub
- **🏠 [Documentation Index](./docs/INDEX.md)** - Quick navigation
- **🔧 [API Reference](./docs/api/API_REFERENCE.md)** - Complete API docs
- **⚙️ [Configuration Guide](./docs/api/CONFIGURATION.md)** - Configuration options
- **🐛 [Debug Tools](./docs/debug/DEBUG_TOOLS.md)** - Debugging guide

### Development
- **🛠️ [Development Rules](./docs/development/DEVELOPMENT_RULES.md)** - Development guidelines
- **🤖 [AI Agents](./docs/development/AGENTS.md)** - AI agent guidelines
- **📝 [Changelog](./docs/CHANGELOG.md)** - Version history

### Community
- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - Community discussions and Q&A

---

**🌍 Happy Internationalizing!**

*For the most up-to-date documentation and guides, visit [docs/README.md](./docs/README.md)*