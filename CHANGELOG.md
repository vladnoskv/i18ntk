# 🌍 i18ntk - The Ultimate i18n Translation Management Toolkit Changelog

![i18ntk Logo](docs/screenshots/i18ntk-logo-public.PNG)

**Version:** 1.9.0
**Last Updated:** 2025-08-13  
**GitHub Repository:** [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)

[![npm](https://img.shields.io/npm/v/i18ntk.svg?label=npm%20version)](https://www.npmjs.com/package/i18ntk) [![npm downloads](https://img.shields.io/npm/dt/i18ntk.svg?label=npm%20downloads)](https://www.npmjs.com/package/i18ntk) [![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/) [![GitHub stars](https://img.shields.io/github/stars/vladnoskv/i18ntk?style=social&label=github%20stars)](https://github.com/vladnoskv/i18ntk) [![Socket Badge](https://socket.dev/api/badge/npm/package/i18ntk/1.9.0)](https://socket.dev/npm/package/i18ntk/overview/1.9.0)

## [1.9.0] - 2025-08-13 - Major Release: Config Centralization, Runtime API & Framework Detection

> **Note**: This release includes all features and fixes that were previously planned for version 1.8.3, which was never officially released.

### ✨ Major Features

#### 🏗️ Configuration Centralization
- **Project-scoped Configuration**: All settings now stored in `settings/i18ntk-config.json`
- **Legacy Migration**: Automatic migration from `~/.i18ntk` with one-time deprecation warning
- **Backup Management**: Backups now stored in `settings/backups/`
- **Environment Variables**: Support for `I18NTK_*` overrides

#### 🚀 Runtime Translation API (Experimental Beta)
- **Framework-Agnostic**: New `i18ntk/runtime` package with TypeScript support
- **Lightweight**: Minimal runtime footprint for production use
- **Flexible Loading**: Supports both single file and folder-based locale structures
- **Type Safety**: Full TypeScript declarations included

#### 🔍 Enhanced Scanner (1.9.0)
- **Framework Detection**: Automatic detection of React, Vue, Angular, and more
- **Comprehensive Testing**: 12+ test cases for framework detection
- **Pattern Matching**: Support for framework-specific i18n patterns
- **Documentation**: Added `scanner-guide.md` with usage examples

### 🛠 Improvements

#### Configuration Management
- **Schema Version**: Updated to 1.9.0
- **Graceful Bootstrap**: Automatic creation of required directories
- **Migration Handling**: Clear deprecation messages for legacy config
- **Security**: Removed all shell access vulnerabilities

#### Performance
- **Ultra-Extreme Mode**: 97% faster processing (15.38ms for 200k keys)
- **Memory Optimization**: 1.62MB memory usage
- **Parallel Processing**: Improved multi-core utilization

### 📚 Documentation
- **Updated README**: Clear setup instructions and feature overview
- **Runtime API Docs**: Comprehensive TypeScript documentation
- **Migration Guide**: Smooth transition from 1.8.x to 1.9.0

### 🐛 Bug Fixes
- Fixed configuration initialization issues
- Resolved path resolution in Node.js modules
- Addressed edge cases in legacy config migration
- Fixed framework detection reliability
 - Corrected Manage Menu numbering/mappings so displayed options match executed actions (9 = Delete reports, 13 = Scanner)
 - Initialization completion summary no longer prompts in non-interactive or no-prompt modes (prevents undefined noPrompt access)
 - Removed legacy `[NOT_TRANSLATED]` default from initializer configuration; tooling now aligns with country-code marker approach

### 🔄 Migration Notes
- **Automatic Migration**: Existing configurations will be moved to `settings/`
- **Backward Compatibility**: All existing CLI commands remain supported
- **Environment Variables**: Updated to support new configuration structure

### 📦 Installation
```bash
# Install globally (recommended)
npm install -g i18ntk

# Or use npx for one-off commands
npx i18ntk
```

### 📞 Support
For issues and feature requests, please visit our [GitHub repository](https://github.com/vladnoskv/i18ntk).

---
*Note: This version maintains backward compatibility while introducing significant improvements to configuration management and runtime capabilities.*

## [1.9.0] - 2025-08-13 - Config Centralization & Runtime API

### ✨ Features & Changes
- Centralized configuration under project `settings/i18ntk-config.json` (single source of truth).
- Automatic migration from legacy `~/.i18ntk/i18ntk-config.json` with one-time deprecation warning.
- Graceful bootstrap: creates `settings/` and `settings/backups/` on demand.
- New framework-agnostic Runtime API exposed via `i18ntk/runtime` with TypeScript declarations.
- Optimized path resolution to work seamlessly when installed from `node_modules`.
- Environment overrides preserved: `I18NTK_PROJECT_ROOT`, `I18NTK_SOURCE_DIR`, `I18NTK_I18N_DIR`, `I18NTK_OUTPUT_DIR`, plus `I18NTK_RUNTIME_DIR` for runtime.
- Schema/version updated to `1.9.0` in settings manager.
- Added optional `migrationComplete` flag to suppress repeated migration notices.

### 🧹 Cleanups & Deprecations
- Removed remaining references to legacy `~/.i18ntk` in main package code (docs now describe migration).
- Delete reports and related flows now use `settings/backups/` only.

### 📚 Docs
- README updated to reflect new config location and migration behavior.
- `docs/runtime.md` updated with usage and config resolution order.

---s

## [1.8.3] - 2025-08-13 - **Major Feature Release: Scanner Framework Detection & Security**

> **🚀 MAJOR FEATURE RELEASE**: Version 1.8.3 introduces comprehensive scanner framework detection, enhanced security validation, and new testing infrastructure.

### ✨ **New Features**

#### **NEW: Comprehensive Scanner Tests** - Added `scanner-comprehensive.test.js` with 12 test cases covering framework detection, edge cases, and i18n patterns
#### **NEW: i18n Framework Detection** - Automatic detection of React+i18next, Vue+vue-i18n, Angular+ngx-translate patterns
#### **NEW: Scanner Framework Support** - Dedicated test suite for vanilla JavaScript, React, Vue, and Angular patterns
#### **NEW: Framework-Specific Patterns** - Intelligent pattern matching based on detected framework
#### **NEW: Unicode & Edge Case Support** - Full support for Unicode characters, empty files, and length limits

### 🐛 **Critical Bug Fixes**

#### **Fixed "undefined match" Error in Usage Analysis**
- **Issue**: Usage analysis was throwing "undefined match" errors when encountering non-string translation values
- **Fix**: Added comprehensive null and type checking before string operations in `validatePlaceholderKeys` function
- **Impact**: Usage analysis now gracefully handles all data types without crashes

#### **Fixed "Cannot read properties of undefined" Error in Initialization**
- **Issue**: `i18ntk-init.js` was throwing "Cannot read properties of undefined" errors during completion summary generation
- **Fix**: Updated `getTranslationStats` method to correctly handle new country code marker format (`[COUNTRY CODE] English`)
- **Impact**: Initialization process now completes successfully with accurate statistics

#### **Enforced Initialization Checks Across All CLI Scripts**
- **Issue**: CLI scripts could run without proper project initialization, leading to confusing errors
- **Fix**: Added strict initialization verification in `i18ntk-usage.js`, `i18ntk-analyze.js`, and `i18ntk-sizing.js`
- **Impact**: Clear error messages guide users to run `i18ntk init` before other operations

#### **Scanner Security Fixes**
- **Issue**: Security validation failures in scanner operations
- **Fix**: Strengthened file system operations with strict permission checks and path validation
- **Impact**: Zero shell access vulnerabilities in scanner operations

#### **Simplified Frontend Menu**
- **Issue**: Debug tools in main menu created confusion for regular users
- **Fix**: Removed debug menu option (option 12) and renumbered remaining options
- **Impact**: Cleaner, more focused user interface for production use

#### **Enhanced Error Handling**
- **Improved Error Messages**: Added clear guidance when project initialization is required
- **Graceful Degradation**: Better handling of edge cases in translation processing
- **User Experience**: More helpful error messages for common setup issues

### 🔒 **Security Enhancements**

#### **Enhanced Security Validation**
- **Comprehensive Security**: Added security validation for all file operations
- **Path Traversal Protection**: Improved path handling with normalized path validation
- **Input Sanitization**: Enhanced input validation and sanitization across all scanner operations

### 📚 **Documentation & Testing**

#### **NEW: Scanner Guide** - Added comprehensive `scanner-guide.md` with framework-specific instructions
#### **Framework Reliability Notice** - Documented scanner reliability dependencies on framework packages
#### **CLI Documentation** - Updated README with new scanner commands and options
#### **Best Practices** - Added troubleshooting and configuration guidelines

#### **Testing Infrastructure**
- **Test Coverage**: Added comprehensive scanner test suite with 12 test cases
- **Framework Detection**: Tests for React, Vue, Angular, and vanilla JavaScript patterns
- **Edge Cases**: Unicode support, empty files, exclusion patterns, and length limits
- **Report Generation**: Automated testing of JSON and Markdown report formats
- **Integration**: Added `npm run test:scanner` command to test suite

---

# i18n Management Toolkit - Version 1.8.3 Release Notes

## [1.8.1] - 2025-08-12 - **Major Release: Enhanced Framework Detection, Plugin System & Security Enhancements**


#### **🎯 Enhanced Framework Detection**
- **Smart Framework Detection** - Automatically detects i18next, Lingui, and FormatJS frameworks
- **Package.json Analysis** - Simplified detection using package.json dependency checks
- **Framework-specific Validation** - Tailored validation rules for each framework type
- **Enhanced Doctor Tool** - New validation capabilities with framework-aware analysis

#### **🔌 Plugin System**
- **Plugin Loader Architecture** - Replace simple utilities with robust PluginLoader and FormatManager classes
- **Extractor Plugins** - Support for custom translation extractors
- **Format Manager** - Unified handling of different translation formats
- **Extensible Architecture** - Easy addition of new plugins and formats

#### **🔒 Security Enhancements**
- **Standardized Exit Codes** - Consistent exit codes across all CLI commands
- **Admin PIN Authentication** - Enhanced admin authentication with command-line argument support
- **Path Validation** - Improved path handling and security checks in doctor script
- **Input Sanitization** - Enhanced input validation and sanitization
- **Security Feature Tests** - Comprehensive security testing including path validation

#### **📊 JSON Output Support**
- **Machine-readable Results** - JSON output support for integration with CI/CD pipelines
- **Structured Reporting** - Consistent JSON schema across all commands
- **Error Reporting** - Detailed error information in JSON format

#### **⚡ Performance Improvements**
- **87% Performance Boost** - Extreme mode achieves 38.90ms for 200k keys
- **Memory Optimization** - <1MB memory usage for all operations
- **No Child Processes** - Removed child_process usage from production code
- **Optimized Validation** - Enhanced placeholder validation with strict mode support

### 🐛 **Bug Fixes**

#### **Interactive Prompt Issues**
- **Fixed double character input** - Resolved global double readline issue causing duplicate characters
- **Fixed double enter requirement** - Scripts now exit cleanly without requiring double Enter press
- **Enhanced readline management** - Proper terminal reset and cleanup
- **Improved CLI experience** - Smoother interactive workflows

#### **Windows Compatibility**
- **Fixed Windows file handling** - Resolved Windows-specific file handling issues in tests
- **Path separator fixes** - Proper handling of Windows path separators
- **Cross-platform testing** - Comprehensive testing on Windows, macOS, and Linux

#### **Argument Parsing Fixes**
- **Fixed sizing script argument parsing** - Resolved issue where `--source-dir` and other command-line arguments were not being respected
- **Enhanced argument format support** - Now properly handles both `--key=value` and `--key value` argument formats
- **Improved path resolution** - Command-line arguments now correctly override default configuration values
- **Better error reporting** - Clearer error messages when invalid arguments are provided

### 🏗️ **Architecture Improvements**

#### **Enhanced Initialization Process**
- **New Translation Marker System** - Replaced `NOT_TRANSLATED` with country code format (`[COUNTRY CODE] English`)
- **Interactive Setup Configuration** - Added prompt for selecting file organization (single file, modular, or existing structure)
- **Robust Completion Summary** - Enhanced completion statistics with detailed reporting and JSON export option
- **Improved Error Handling** - Better error handling and reporting throughout initialization process

#### **Directory Structure**
- **Organized Source Structure** - Changed to `./src/i18n/locales` for better organization
- **Config Directory Support** - Added `--config-dir` support for standalone configurations
- **Enhanced Settings Management** - Improved settings persistence and validation

#### **Validation Logic**
- **Enhanced Placeholder Validation** - Support for more styles and strict mode
- **Target Language Validation** - Improved validation logic for target languages
- **Interactive/Non-interactive Mode** - New prompt helper for seamless mode switching

### 📚 **Documentation Updates**
- **Updated README** - Comprehensive documentation for new features
- **Enhanced API Documentation** - Detailed API reference for plugin system
- **Security Guidelines** - Best practices for secure deployment
- **Performance Benchmarks** - Updated performance metrics and benchmarks

### 🧪 **Testing Enhancements**

#### **New Test Categories**
- **Framework Detection Tests** - Comprehensive testing for framework detection
- **Security Feature Tests** - Path validation and input sanitization tests
- **Plugin System Tests** - Plugin loader and format manager testing
- **Performance Benchmarks** - Updated performance testing suite

#### **Test Infrastructure**
- **Enhanced Test Runner** - Improved test runner with new test categories
- **New NPM Scripts** - Additional scripts for running specific test suites
- **Test Environment** - Robust test environment with retry mechanisms

## [1.8.0] - 2025-08-11 - **Major Changes & Improvements**

## 🚀 Major Changes

### Autorun Workflow Removed
**Breaking Change**: The autorun workflow has been completely removed from the main toolkit interface and moved to development tools.

#### Why This Change?
- **Safety First**: Script-by-script operations are safer as some scripts require pre-setup before execution
- **Setup Requirements**: Different scripts have varying setup requirements that make automated execution unreliable
- **User Control**: Manual execution gives users full control over each step of the process
- **Error Prevention**: Prevents accidental clearing of configuration files during autorun

#### What Changed?
- **Removed**: `i18ntk-autorun.js` moved from `main/` to `dev/` directory
- **Removed**: All autorun-related commands from the interactive menu
- **Removed**: `workflow` option (previously option 8) from main menu
- **Removed**: `i18n:autorun`, `i18ntk:autorun`, and `workflow` scripts from package.json
- **Removed**: `i18ntk-autorun` entry from package.json bin configuration

## ✨ New Features & Improvements

### Enhanced Automatic Fixer
The automatic fixer has been significantly improved and is now the recommended way to handle translation fixes:

#### Key Improvements
- **Smart Detection**: Automatically detects placeholder translations and common issues
- **Safe Operations**: Creates backups before applying any fixes
- **Interactive Confirmation**: Prompts user before applying changes
- **Comprehensive Fixes**: Handles missing translations, placeholder issues, and formatting problems
- **Detailed Reporting**: Provides clear summary of changes made
- **Backup Recognition**: Easily download backups after successful fix application

#### How to Use
1. Run `npm run i18ntk` to access the main menu
2. Select option **7** "Fix translation issues automatically"
3. Review detected issues and confirm fixes
4. Check the generated reports for detailed results

### Menu Updates
- **Renumbered Options**: Removed workflow option, renumbered remaining options
- **Cleaner Interface**: More focused menu with essential operations
- **Better Organization**: Commands grouped by functionality

#### Updated Menu Structure
```
📋 i18n Management Toolkit - Main Menu
1. Initialize i18n project structure
2. Analyze translation files
3. Validate translations for errors
4. Check translation usage in code
5. Run complete analysis (init + analyze + validate + usage)
6. Analyze translation sizing and memory usage
7. Fix translation issues automatically  ← NEW
8. Generate summary reports  ← Renumbered
9. Delete reports and debug logs  ← Renumbered
10. Settings and configuration  ← Renumbered
11. Show help and documentation  ← Renumbered
12. Language settings  ← Renumbered
13. Scanner  ← Renumbered
```

## 🔧 Technical Changes

### File Structure Updates
```
📁 Before (v1.8.3):
├── main/
│   ├── i18ntk-autorun.js    ← REMOVED
│   └── ...
└── package.json
    └── "bin": {
        "i18ntk-autorun": "./main/i18ntk-autorun.js"  ← REMOVED
    }

📁 After (v1.8.3):
├── main/                    ← Cleaner, focused on essential scripts
├── dev/
│   └── i18ntk-autorun.js    ← Moved to development tools for local development, requires improvements and fixes.
└── package.json
    └── "bin": {
        "i18ntk": "./main/i18ntk-manage.js"  ← Only essential entry points
    }
```

### Script Changes
- **Removed**: `npm run i18n:autorun`
- **Removed**: `npm run i18ntk:autorun`
- **Removed**: `npm run workflow`
- **Updated**: `npm run i18ntk` now points to `i18ntk-manage.js` (safer interactive mode)

## 📊 Performance & Safety

### Safety Improvements
- **Configuration Protection**: No more risk of i18ntk-config.json being cleared
- **Step-by-Step Control**: Users can review each operation before proceeding
- **Backup Creation**: All operations create automatic backups
- **Error Recovery**: Better error handling with rollback capabilities

### Performance Benefits
- **Reduced Memory Usage**: No background autorun processes
- **Faster Startup**: Cleaner codebase with fewer dependencies
- **Focused Operations**: Each script optimized for its specific task

### 📞 **Support**

For any issues encountered with these fixes:
1. **Update to latest version**: `npm update i18ntk`
2. **Reset configuration if needed**: `i18ntk-manage --reset-config`
3. **Check logs**: `i18ntk-manage --debug`
4. **Report issues**: [GitHub Issues](https://github.com/i18n-toolkit/i18ntk/issues)
