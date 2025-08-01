# i18ntk - Enterprise i18n Management Toolkit

**Version:** 1.2 – **PRODUCTION READY** with enhanced documentation and npm metadata cleanup! 🌍

**⚠️ Important Notice:** All previous versions (< 1.2) are now deprecated due to critical bugs and issues. Please upgrade to v1.1.5 for the most stable experience. We recommend backing up your project before upgrading. 

**🎉 Thank You:** 200+ downloads in the first week! Thank you for your support and patience as we resolved the functional issues. My First Published Project. 

[![version](https://badge.fury.io/js/i18ntk.svg)](https://badge.fury.io/js/i18ntk)
[![npm](https://img.shields.io/npm/dt/i18ntk.svg)](https://www.npmjs.com/package/i18ntk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)

**i18ntk** (i18n Toolkit) is a comprehensive, internationalization management toolkit for JavaScript/TypeScript projects. It provides a complete CLI suite with multi-language support and advanced analysis capabilities for managing translations efficiently.

## ⚠️ Important Disclaimer

**Important: This is an independent, community-driven toolkit** - not affiliated with any official i18n organization or team. Originally developed as a personal solution for translation management, i18ntk has evolved into a feature-rich internationalization toolkit available to the broader development community. The toolkit is designed to be framework-agnostic and highly adaptable:

- Works with any translation file format configured in the settings
- Operates independently (no i18n framework required)
- Provides extensive customization options
- Easily extensible through code modifications or AI-assisted configuration
- Flexible enough to accommodate diverse project requirements

While maintaining its independence, i18ntk strives to follow i18n best practices and standards to ensure compatibility with existing workflows. Although we test thoroughly, we cannot guarantee 100% compatibility with all i18n frameworks or systems. Users are encouraged to test i18ntk with their specific setup and adjust settings as needed or find an alternative solution.

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

> **📖 For complete command reference, see [API Documentation](./docs/api/API_REFERENCE.md)**

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

The toolkit UI supports **7 languages** with partial internationalization:

Requests for additional languages are welcome!

## 🧪 Development and Testing

### Debug Tools
```bash
# Main debug interface
npm run i18ntk:debug

> **📖 For comprehensive debug tools documentation, see [Debug Tools](./docs/debug/DEBUG_TOOLS.md)**


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

**Version:** 1.2.0 – Enhanced CLI experience with proper version command and improved documentation! 🚀
## 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details.