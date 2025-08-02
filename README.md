# i18ntk -  i18n Management Toolkit

[![version](https://badge.fury.io/js/i18ntk.svg)](https://badge.fury.io/js/i18ntk)
[![npm](https://img.shields.io/npm/dt/i18ntk.svg)](https://www.npmjs.com/package/i18ntk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)

**Version:** 1.3.0 – **i18ntk** (i18n Toolkit) is a comprehensive, internationalization management toolkit for JavaScript/TypeScript projects. It provides a complete CLI suite with multi-language support and advanced analysis capabilities for managing translations efficiently.

## 🔧 Key Features

- **Flexible Configuration**: Customize script directories and file formats in `settings.json`
- **Path Resolution**: Automatically resolves relative paths based on project structure
- **Comprehensive Commands**: Includes analyze, complete, manage, validate, and more
- **Multi-Language Support**: UI available in 7 languages with partial internationalization
- **Production-Ready**: Tested extensively in various environments

**⚠️ Important Notice:** All previous versions (< 1.3.0) are now deprecated due to critical bugs and issues. Please upgrade to v1.3.0 for the most stable experience. We recommend backing up your project before upgrading and testing on a development branch first. 

**🎉 Thank You:** 500+ downloads in the first week! Thank you for your support and patience as I resolve the functional issues. My First Published Package, please update to the latest version as any previous bugs were probably fixed. 

## ⚠️ Important Disclaimer

**Important: This is an independent, community-driven toolkit** generated with the help of AI tools therefore, bugs and errors are prone to happen, please report an issue if you find one. Also, this package is not affiliated with any official i18n organization or team. Originally developed as a personal solution for my own translation management, i18ntk has evolved into a feature-rich internationalization toolkit available to the broader development community. The toolkit is designed to be framework-agnostic and highly adaptable:

- Works with any translation file format configured in the settings
- Operates independently (no i18n framework required)
- Provides extensive customization options
- Easily extensible through code modifications or AI-assisted configuration
- Flexible enough to accommodate diverse project requirements

While maintaining its independence, i18ntk strives to follow i18n best practices and standards to ensure compatibility with existing workflows. Although we test thoroughly, we cannot guarantee 100% compatibility with all i18n frameworks or systems and don't accept liability if there are any issues, we recommend running this toolkit on a fresh project. Users are encouraged to test i18ntk with their specific setup and adjust settings as needed or find an alternative solution. Thank you for trying i18ntk, if you have any issues or suggestions, please feel free to open an issue on the GitHub repository!


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

**Important:** Direct command execution (e.g., `npx i18ntk usage`) now bypasses the interactive menu, allowing for more streamlined workflows and scripting.

## ✨ What's New in v1.3.0

### 🆕 Script Directory Configuration
- **New**: Added per-script directory configuration support for maximum flexibility
- **Fixed**: Path resolution now correctly uses relative paths from project root
- **Enhanced**: Added comprehensive internationalization for all new configuration options
- **Improved**: Settings CLI now includes script directory configuration menu
- **Added**: Current working directory display and path guidance in CLI prompts

### 🐛 Previous Version Deprecation
- **Status**: All versions < 1.3.0 are now deprecated due to critical bugs
- **Recommendation**: Immediate upgrade to v1.3.0 for stable functionality
- **Migration**: Major-breaking-changes upgrading from any 1.0.x version. Uninstall, and reinstall and rerun initilization.

### ⬆️ Update Package Functionality
- **New Feature**: Added `Update Package` option to the settings CLI for easy `npm update i18ntk` execution.
- **Convenience**: Simplifies keeping the toolkit up-to-date directly from the interactive menu.

### 🔍 Enhanced Directory Handling
- **Improvement**: All scripts now correctly scan directories based on settings configurations
- **Accuracy**: Path resolution fixed to respect relative paths from project root
- **Bug Fix**: Resolved "Source directory not found" errors with proper path handling

### 🎯 Improved Complete Coverage Scanning
- **Enhancement**: Complete coverage scanning now accurately handles directory configurations.
- **Reliability**: Ensures all relevant files are scanned for comprehensive analysis.
- **Consistency**: Aligns with `i18ntk-usage.js` in respecting `sourceDir` and `i18nDir` settings.

### 📁 Enhanced Project Organization
- **Improved**: Configuration files now properly organized in `settings/` directory
- **Enhanced**: All reports centralized in `i18ntk-reports/` directory for better organization
- **Cleaned**: Removed duplicate configuration files from root directory
- **Updated**: Documentation reflects new file structure and locations

### 🎉 Community Milestone
- **Achievement**: 500+ downloads in the first week
- **Gratitude**: Thank you for your patience as we resolved functional issues
- **Commitment**: Continued focus on stability and user experience

## 📚 Documentation

**📖 [Complete Documentation](./docs/README.md)** - Visit our comprehensive documentation hub

**🏠 [Documentation Index](./docs/INDEX.md)** - Quick navigation to all documentation

**📁 [Script Directory Guide](./docs/SCRIPT_DIRECTORY_GUIDE.md)** - Configure custom directories for each script type (v1.3.0+)

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

**Version:** 1.3.0  
**Release Date:** 02/08/2025  
**Previous Versions:** 1.2.x, 1.1.x, 1.0.x series 

## 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details.