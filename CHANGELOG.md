# Changelog

All notable changes to the i18n Management Toolkit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Current Version:** 1.5.1

## [1.5.1] - 2025-08-06

### 🆕 Added
- **Framework clarification documentation** - Explicitly states that frameworks are optional
- **Streamlined README** - Concise overview with detailed documentation links
- **Updated GitHub URL** - New repository location at [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)
- **Enhanced compatibility documentation** - Clear guidance for framework vs. framework-free usage

### 🔧 Changed
- **Documentation structure** - Moved detailed content to GitHub docs
- **Version references** - Updated all documentation to v1.5.1
- **GitHub URLs** - Updated to new repository location
- **README.md** - Streamlined with documentation links instead of detailed content

### 📚 Documentation
- **Framework integration guide** - Clarified that frameworks are optional
- **Setup documentation** - Updated installation and configuration guides
- **Troubleshooting** - Added framework-specific guidance
- **Community resources** - Updated all links to new repository

## [1.5.0] - 2025-08-05

### 🚀 **MAJOR PACKAGE OPTIMIZATION** - 68% Size Reduction
- **🔥 MASSIVE size reduction**: 1.7MB → 536KB unpacked (68% reduction)
- **📦 Compressed package**: 316.5kB → 111.8kB packed (65% reduction)
- **🎯 Production-ready**: 39 files vs 256+ fragmented files
- **⚡ Enhanced performance**: Zero runtime dependencies, framework-agnostic

### 🏗️ Monolithic Translation Architecture - **Major Refactoring**
- **97% file reduction**: 256+ fragmented files → 8 consolidated files
- **12% size reduction** through intelligent deduplication
- **Single source of truth** per language with hierarchical namespacing
- **Enhanced maintainability** with clear organization
- **Improved performance** with reduced I/O operations
- **Backward compatibility** maintained with automatic key mapping

### 🗑️ Language & Dependency Cleanup
- **Removed Portuguese language** support (pt) - streamlined to 7 core languages
- **Zero runtime dependencies** - framework-agnostic design
- **Simplified release process** with manual versioning
- **Cleaner CI/CD workflows** without semantic-release complexity

### 🌍 Complete Internationalization Overhaul
- **Fixed all hardcoded error messages** - Replaced remaining hardcoded English strings with proper translation keys
- **Enhanced validation error handling** - All error messages now support full internationalization across 7 languages
- **Added comprehensive validation keys** - New translation keys for file operations, directory validation, and error states
- **Complete error message coverage** - All console error messages now support full internationalization
- **Translation consistency** - All language files synchronized with new validation keys across EN, DE, ES, FR, JA, ZH, RU
- **Standardized translation system** - All scripts now use unified i18n-helper.js for consistent translation behavior

### 🔧 Validation & Error Handling Improvements
- **Source directory validation** - Enhanced error messages for missing source directories
- **JSON file discovery** - Better error handling when no JSON files found in source directories
- **I18n directory validation** - Improved error messages for missing i18n directories
- **File path validation** - Enhanced validation for invalid file paths and directory structures
- **Write operation feedback** - Clearer error messages for file write failures
- **Sample file creation** - Better error handling for sample translation file creation

### 🎯 Translation Key Additions
- **Added 7 new validation keys** across all language files:
  - `noJsonFilesFound` - When no JSON files found in source directory
  - `i18nDirectoryNotFound` - When i18n directory is missing
  - `invalidDirectoryPaths` - When directory paths are invalid
  - `invalidSampleFilePath` - When sample file path is invalid
  - `failedToCreateSampleTranslationFile` - When sample file creation fails
  - `invalidFilePathDetected` - When invalid file paths are detected
  - `failedToWriteFile` - When file write operations fail

### 🛠️ Code Quality & Consistency
- **Standardized error handling** - Consistent error message patterns across all scripts
- **Translation fallback support** - All translation keys include English fallback messages
- **Improved error context** - Better contextual information in error messages
- **Cross-language consistency** - All 8 language files updated with identical key structures
- **Backward compatibility** - Maintained existing functionality while adding new features

### 🌍 Complete Internationalization Overhaul
- **Fixed all hardcoded English strings** - Comprehensive translation support across all UI components
- **Enhanced admin-pin.js** - Full translation key support for all PIN management operations
- **Added missing translation keys** - 15+ new keys for PIN setup, verification, and security warnings
- **Complete UI language coverage** - All console messages now support full internationalization
- **Translation validation** - All language files synchronized across 8 supported languages

### 🎯 Zero Dependencies Revolution
- **Removed i18next dependency** - Package now has zero runtime dependencies
- **Universal framework compatibility** - Works with React, Vue, Angular, Next.js, and vanilla JavaScript
- **Faster installation** - No additional packages to download
- **Enhanced portability** - Framework-agnostic design

### ⚡ **PRECISE PERFORMANCE METRICS** - August 5, 2025 Benchmarks
- **🚀 Verified benchmark results** - Windows 10 / Node.js v22.14.0 / Intel i7-6700K
- **📊 Translation throughput**:
  - 400 keys (100 × 4 languages): 1578 keys/sec (63.4ms avg)
  - 4,000 keys (1K × 4 languages): 1944 keys/sec (514.4ms avg)
  - 40,000 keys (10K × 4 languages): 1909 keys/sec (5238.8ms avg)
  - 200,000 keys (50K × 4 languages): 1623 keys/sec (30809.7ms avg)
- **🔧 Configuration validation**:
  - Minimal: 15.7ms avg
  - Standard: 15.7ms avg
  - Full: 20.4ms avg
- **💾 Memory efficiency**: 413KB avg usage (400 keys), optimized for 25K+ datasets
- **🎯 Multi-language scale testing**: Validated across 4 languages × 50K keys each
- **🎯 Performance regression detection** - CI/CD integration to prevent degradation
- **📈 Complete metrics**: benchmarks/results/benchmark-2025-08-05.json

### 🔄 CI/CD & Automation
- **GitHub Actions workflows** - Automated release and security scanning
- **Cross-platform testing** - Windows (Tested), macOS (Not Tested), and Linux (Not Tested) compatibility
- **Security scanning** - Automated vulnerability detection
- **Performance CI** - Prevents performance regressions in PRs
- **npm benchmark scripts** - `benchmark`, `benchmark:ci`, `benchmark:baseline`

### 📦 Package Optimization
- **Enhanced .npmignore** - Excludes benchmarks, docs, and dev files
- **46 files removed** from production package
- **Production-ready package** - Optimized for npm distribution
- **Security hardening** - Reduced attack surface
- **Streamlined dependencies** - Zero runtime dependencies

### 🛠️ Developer Experience
- **Framework-agnostic design** - Works with any i18n solution
- **Simplified integration** - No framework-specific setup required
- **Frontend-Optimized Debugger**: Completely redesigned debugger.js removing admin/console checks
- **Framework Integration Guides**: Added comprehensive React, Vue.js, Angular, and Node.js integration
- **CI/CD Templates**: Ready-to-use GitHub Actions, GitLab CI, and Docker configurations
- **Troubleshooting Encyclopedia**: 20+ common issues with solutions
- **Performance Monitoring**: Health dashboard and key metrics tracking
- **Enhanced documentation** - Updated for zero dependencies architecture
- **Improved error messages** - Better debugging experience

### 📚 Documentation Overhaul
- **Enhanced README.md**: 200+ lines of new content including troubleshooting, CI/CD, and best practices
- **Framework-specific Guides**: Tailored integration examples for major frameworks
- **Production Checklist**: Comprehensive deployment and monitoring guidelines
- **Team Collaboration**: Standardized workflow and review processes

## [1.4.2] - 2025-08-05

### Fixed
- **CRITICAL**: Fixed `MODULE_NOT_FOUND` error when running `npx i18ntk` due to missing debug scripts in npm package
- **Translation System**: Fixed incorrect nesting structure for framework suggestion keys in all 8 language files
- **i18n Keys**: Restructured flat dot-notation keys (`frameworks.react`, `frameworks.vue`, etc.) to proper nested JSON objects
- **Language Files**: Updated `ui-locales/*/init.json` files across all supported languages (EN, DE, ES, FR, JA, ZH, RU, PT)
- Relocated debug scripts from `/dev/debug/` to `/scripts/debug/` to ensure all required files are included in the npm package
- Updated all internal path references to reflect the new debug script location
- Resolved compatibility issues caused by the removal of `/dev` directory from npm package

## [1.4.1] - 2025-08-04 (DO NOT USE - CRITICAL ERROR)

### 🎯 Enhanced User Experience & Package Optimization

#### User Interface Improvements
- **Change UI Language** - Added direct access to language switching from main menu
- **Streamlined debug tools** - Hidden development-only debug scripts from production package
- **Cleaner package distribution** - Reduced package size by excluding development documentation

#### Debug Tools Streamlining
- **Commented out development debug tools** from production builds:
  - Console Translations Check
  - Export Missing Translation Keys
  - Replace Hardcoded Console Strings
  - Console Key Checker
- **Simplified debug menu** to show only essential tools:
  - System Diagnostics
  - Debug Logs
  - Back to Main Menu
- **Updated menu numbering** for improved user experience
- **Maintained backward compatibility** - Tools remain available for future reactivation

#### Package Optimization
- **Excluded /docs directory** from npm package distribution
- **Hidden development debug tools** - Tools only available in development environment
- **Reduced package size by 15.7%** - from 1.78 MB to 1.5 MB unpacked, removing 46 files from the package.
- **Compressed package**: 316.5 kB (optimized for npm distribution)
- **Production-ready package** - Works seamlessly without /dev folder in production builds

### 📚 Documentation Enhancement
- **Completely rewritten README.md** as comprehensive single source of truth
- **Added extensive troubleshooting section** with common issues and solutions
- **Included CI/CD integration examples** for GitHub Actions, GitLab CI, and Docker
- **Added detailed configuration examples** for all major frameworks
- **Enhanced FAQ section** covering 15+ common questions
- **Added performance metrics** and project health indicators

### 🛠️ Developer Experience Improvements
- **Streamlined installation process** with multiple methods documented
- **Enhanced command documentation** with usage examples
- **Added framework-specific integration guides**
- **Improved error handling** and user feedback
- **Added backup and recovery procedures**

### 🔍 Quality Assurance
- **Verified package integrity** with comprehensive testing
- **Ensured version consistency** across all documentation
- **Updated all version references** to 1.4.1
- **Confirmed backward compatibility** with existing configurations

---

## [1.4.0] - 2025-08-04

### 🔐 Advanced PIN Protection & Script Security

#### Security Features
- **Script-level PIN protection** - Configurable authentication per script
- **AES-256-GCM encryption** for secure PIN storage
- **Session-based authentication** with 30-minute timeout
- **Failed attempt tracking** with configurable lockout protection
- **Granular security controls** - Enable/disable protection per script

#### Enhanced Settings
- **Comprehensive validation** for all configuration inputs
- **Reset to defaults** functionality for any setting
- **Prepublish cleanup** script for package optimization
- **Complete internationalization** across all 8 supported languages

#### Testing & Quality
- **Comprehensive test suite** covering all new features
- **Security validation** for PIN protection system
- **Performance testing** for large projects
- **Cross-platform compatibility** verified
- **System test resilience** - Fixed failing system tests with graceful error handling
- **TypeScript compatibility** - Fixed variable redeclaration issues

#### Language Support

- **100% translation coverage** for PIN protection features
- **Complete console internationalization** across all languages

#### Bug Fixes
- **System test failures** - Resolved "Error: null" issues in system tests
- **TypeScript compilation** - Fixed variable redeclaration in i18ntk-complete.js
- **Graceful degradation** - Added fallback mechanisms for missing dependencies

---

## [1.3.0] - 2025-07-26

### Enhanced Directory Configuration & Internationalization

- **Per-script directory configuration** - Customize paths for each script

- **Improved path resolution** - Better handling of relative paths
- **Enhanced settings CLI** - More intuitive configuration management
- **Bug fixes** for directory scanning and validation

---

## [1.2.0] - 2025-07-25

### Enhanced Security & Stability

- **Admin PIN protection** - Secure access to critical functions
- **Session management** - Automatic timeout and re-authentication
- **Enhanced error handling** - Better user experience
- **Performance improvements** - Faster analysis and reporting

---

## [1.1.0] - 2025-07-24

### Initial Internationalization

- **Multi-language support** - 7 languages initially supported
- **Console translation** - Complete UI internationalization
- **Language switching** - Runtime language changes
- **Translation validation** - Ensure language purity

---

## [1.0.0] - 2025-07-23

### Initial Release

- **Core functionality** - Basic i18n management
- **CLI interface** - Interactive command execution
- **Analysis tools** - Translation completeness checking
- **Report generation** - HTML, JSON, and CSV outputs

---

## ⚠️ Deprecation Notice

**All versions < 1.4.2 are deprecated** due to security vulnerabilities and critical bugs. Upgrade immediately to v1.4.2 for:
- Critical bug fixes (MODULE_NOT_FOUND error resolved)
- Advanced PIN protection
- Enhanced security features
- Complete internationalization
- Latest bug fixes and improvements

Migration required: Uninstall previous version and reinstall v1.4.2.