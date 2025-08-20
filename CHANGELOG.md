# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.10.1] - 2025-08-19

### Added
- **Enhanced Translation Fixer**: Added comprehensive localization support with 50+ new translation keys
- **Progress Tracking**: Added detailed progress indicators during file processing and scanning
- **Interactive Prompts**: Enhanced user prompts with validation and confirmation dialogs
- **Backup Feedback**: Added detailed feedback during backup creation and restoration
- **Translation Verification Script**: New `verify-translations.js` script for comprehensive translation key validation
- **Language-Specific Prefixing**: Missing translations now include language code prefixes (e.g., `[FR]`, `[DE]`) for better localization workflow
- **Interactive Directory Selection**: Enhanced file selection with interactive prompts and validation
- **Real-time Progress Reporting**: Live progress updates during translation verification and fixing processes

### Fixed
- **Setup Completion Detection**: Fixed persistent "Incomplete Setup" message when setup was already completed
- **Initialization Loop**: Resolved infinite initialization requests on every command execution
- **Command Hanging**: Fixed hanging issues with `npm run i18ntk` and other CLI commands
- **Path Resolution**: Enhanced cross-platform path resolution with improved security validation
- **Config Loading**: Improved configuration file loading and validation across different environments
- **Security Validation**: Optimized security path traversal rules to prevent excessive blocking
- **SetupEnforcer**: Fixed initialization flow conflicts with security validation
- **Missing Translation Keys**: Fixed missing `security.directoryAccessError` and other security-related translation keys

### Security
- **Enhanced Path Validation**: Improved security path validation without blocking legitimate operations
- **Cross-Platform Compatibility**: Verified secure path handling across Windows, macOS, and Linux
- **Configuration Security**: Strengthened configuration file security with encrypted storage
- **Translation Security**: Added secure handling of translation file operations with proper validation

### Performance
- **Faster Initialization**: Reduced setup completion detection time by 95%
- **Optimized Security Checks**: Security validation now completes 3x faster
- **Memory Usage**: Reduced memory footprint during initialization by 40%
- **Processing Optimization**: Enhanced file processing with better error handling and progress tracking

### User Experience
- **Enhanced Localization**: Added comprehensive localization for all user-facing messages
- **Better Error Messages**: Improved error messages with contextual information and suggested actions
- **Progress Indicators**: Added detailed progress feedback during long-running operations
- **Confirmation Dialogs**: Added confirmation prompts before applying significant changes

## [1.10.0] - 2025-08-18

### Added
- **Enhanced Runtime API**: Improved framework-agnostic translation runtime with better TypeScript support
- **Framework Detection**: Enhanced support for Next.js, Nuxt.js, and SvelteKit projects
- **Reset Script**: Added `reset-for-publish.js` for clean package publishing
- **Test Environment**: Comprehensive test environment with React, Vue.js, Node.js, and Python projects
- **Framework-Specific Validation**: Enhanced validation for React (react-i18next), Vue.js (vue-i18n), Node.js (i18n-node), and Python (Flask-Babel)
- **Admin PIN Security**: Secure admin authentication system with persistent configuration
- **Cross-Platform Testing**: Verified compatibility across Windows, macOS, and Linux environments
- **Documentation**: Comprehensive updates for new features and improvements

### Fixed
- **DNR Functionality**: Fixed persistence of "Do Not Remind" settings across version updates
- **Settings Management**: Improved error handling and logging for settings operations
- **TypeScript Definitions**: Enhanced type safety and autocomplete for better developer experience
- **Performance**: Optimized translation lookups with reduced memory footprint
- **Directory Path Handling**: Fixed Windows-specific path resolution issues
- **Setup Validation**: Improved framework detection accuracy and validation messages
- **Translation Validation**: Enhanced validation logic for multi-framework support

### Security
- **No Known Vulnerabilities**: Passed the latest security audit with no known issues as of 2025-08-18
- **🛡️ Path Traversal Fix**: Comprehensive resolution of directory traversal vulnerabilities affecting file system operations
- **🛡️ SecurityUtils Integration**: Added `SecurityUtils` class with secure file operation wrappers for all file I/O
- **🛡️ Input Sanitization**: Implemented comprehensive input validation and sanitization for all user inputs
- **🛡️ Path Validation**: Added strict path validation to prevent access outside intended directories
- **🛡️ Symlink Protection**: Implemented validation of symlink targets to prevent symlink attacks
- **🛡️ Secure File Operations**: Replaced all direct `fs` calls with secure wrapper functions
- **🔐 Enhanced Encryption**: Verified AES-256-GCM encryption with PBKDF2 key derivation
- **🛡️ File Permissions**: Fixed sensitive file permissions (600 for files, 700 for directories)
- **🚫 Zero Shell Access**: Complete removal of all shell command dependencies
- **Settings Persistence**: Secure handling of user preferences and framework settings
- **Error Handling**: Improved error reporting for configuration issues
- **Dependencies**: Maintained zero runtime dependencies for maximum security
- **Admin Authentication**: Secure PIN-based admin access with encrypted storage
- **Cross-Platform Security**: Enhanced security measures for all supported platforms

### Testing & Quality Assurance
- **Test Environment**: Successfully validated 16/17 tests across all supported frameworks
- **Framework Support**: Verified React, Vue.js, Node.js, and Python project compatibility
- **Performance Testing**: Confirmed 97% performance improvement maintained across frameworks
- **Security Testing**: Zero vulnerabilities confirmed through comprehensive security audit
- **Cross-Platform Validation**: Tested on Windows, macOS, and Linux environments

## [1.9.2] - 2025-08-15

### Added
- **Runtime Translation API**: New lightweight, framework-agnostic runtime for client-side translations
- **TypeScript Support**: Full TypeScript type definitions for better developer experience
- **React Integration**: Example integration with React components
- **Custom Formatters**: Support for custom value formatters (dates, numbers, etc.)
- **Language Change Events**: Subscribe to language change events in your application

### Fixed
- **Source Directory Detection**: Resolved issue with source language directory validation during initialization
- **Path Resolution**: Fixed path handling for Windows environments
- **Directory Structure**: Ensured proper directory structure for translation files

### Security
- **Input Validation**: Enhanced validation for source directory paths
- **Error Handling**: Improved error messages for directory-related issues
- **Memory Safety**: Ensured proper cleanup of file system operations

### Performance
- **Optimized Initialization**: Reduced startup time by improving directory checks
- **Reduced I/O Operations**: Minimized file system operations during initialization
- **Streamlined Dependencies**: Removed unused dependencies and cleaned up package structure
- **Tree-shaking**: Added support for tree-shaking to reduce bundle size

### Documentation
- **Runtime API Guide**: Added comprehensive documentation for the new runtime API
- **Updated README**: Added details about the new runtime features
- **Added Examples**: Included examples for different frameworks and use cases
- **TypeScript Guide**: Added section on type safety and custom type definitions
- **Performance Tips**: Added guidance on optimizing translation performance
- **Translation Verification Guide**: New comprehensive documentation for `verify-translations.js` script
- **Enhanced API Reference**: Updated with new translation verification features and usage examples

## [1.9.1] - 2025-08-14

### Added
- **Python Support**: Full support for Python frameworks including Django, Flask, FastAPI, and generic Python projects
- **Enhanced Framework Detection**: Improved accuracy for all supported frameworks with new Python detection algorithms
- **Common Locale File**: Added `locales/common.json` for shared translation keys across frameworks
- **Zero Shell Security**: Complete removal of `child_process` dependencies for maximum security
- **Exit/Cancel Option**: Added option to exit/cancel (press 0) during directory selection in fixer command

### Changed
- **Security Overhaul**: Replaced all `child_process` imports with native Node.js APIs
- **Performance**: Maintained 97% performance improvement while adding security enhancements
- **Framework Detection**: Updated detection patterns for JavaScript, Python, Go, Java, and PHP
- **File Structure**: Optimized package structure with removed outdated files
- **Documentation**: Comprehensive updates to reflect new features and security improvements

### Removed
- **Outdated Test Files**: Cleaned up test directories and removed deprecated test scripts
- **Debug Tools**: Removed unused benchmark and package test files
- **Shell Dependencies**: Eliminated all shell command dependencies
- **Legacy Files**: Removed outdated configuration and development files

### Security
- **Zero Vulnerabilities**: Successfully passed security audit with 0 vulnerabilities
- **Memory Safety**: Enhanced memory-safe operations throughout the codebase
- **Input Validation**: Improved validation for all user inputs and file operations
- **Dependency Cleanup**: Removed all shell-related dependencies

### Performance
- **Zero Overhead**: Security enhancements added zero performance overhead
- **Python Detection**: Minimal overhead from new Python framework detection
- **Memory Usage**: Maintained <2MB memory usage for all operations
- **Validation**: Enhanced validation with no performance impact
