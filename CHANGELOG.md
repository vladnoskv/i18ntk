# Changelog

All notable changes to the i18n Management Toolkit will be documented in this file.

**Current Version:** 1.4.1

## [1.4.1] - 04/08/2025

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

## [1.4.0] - 04/08/2025

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
- **Portuguese (pt)** added as 8th supported language
- **100% translation coverage** for PIN protection features
- **Complete console internationalization** across all languages

#### Bug Fixes
- **System test failures** - Resolved "Error: null" issues in system tests
- **TypeScript compilation** - Fixed variable redeclaration in i18ntk-complete.js
- **Graceful degradation** - Added fallback mechanisms for missing dependencies

---

## [1.3.0] - 26/07/2025

### Enhanced Directory Configuration & Internationalization

- **Per-script directory configuration** - Customize paths for each script
- **Portuguese language support** added
- **Improved path resolution** - Better handling of relative paths
- **Enhanced settings CLI** - More intuitive configuration management
- **Bug fixes** for directory scanning and validation

---

## [1.2.0] - 25/07/2025

### Enhanced Security & Stability

- **Admin PIN protection** - Secure access to critical functions
- **Session management** - Automatic timeout and re-authentication
- **Enhanced error handling** - Better user experience
- **Performance improvements** - Faster analysis and reporting

---

## [1.1.0] - 24/07/2025

### Initial Internationalization

- **Multi-language support** - 7 languages initially supported
- **Console translation** - Complete UI internationalization
- **Language switching** - Runtime language changes
- **Translation validation** - Ensure language purity

---

## [1.0.0] - 23/07/2025

### Initial Release

- **Core functionality** - Basic i18n management
- **CLI interface** - Interactive command execution
- **Analysis tools** - Translation completeness checking
- **Report generation** - HTML, JSON, and CSV outputs

---

## ⚠️ Deprecation Notice

**All versions < 1.4.0 are deprecated** due to security vulnerabilities and critical bugs. Upgrade immediately to v1.4.0 for:
- Advanced PIN protection
- Enhanced security features
- Complete internationalization
- Latest bug fixes and improvements

Migration required: Uninstall previous version and reinstall v1.4.0.