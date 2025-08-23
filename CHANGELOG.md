# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.10.2] - 2025-08-23

### 🚨 Critical Fix
- **Fixed projectRoot default path**: Resetting settings now correctly restores `projectRoot` to `/` instead of `./`, ensuring fresh installs work out-of-the-box

### 🆕 New Features
- **Centralized Environment Variable Management**: Added comprehensive environment variable support with validation and security controls
- **Enhanced Debug Logging**: Improved debug logging with environment variable support for better troubleshooting
- **Secure Plugin Loading**: Added path sanitization for module loading to prevent security issues

### 🔒 Security Enhancements
- **Enhanced Path Validation**: Strengthened path validation and file operations security
- **Secure Module Loading**: Added path sanitization for all plugin/module loading operations
- **Environment Variable Security**: Implemented centralized environment variable management with security filtering

### 🛠️ Improvements
- **Refactored Configuration Handling**: Updated config system with integrated environment variable support
- **Enhanced Logging System**: Improved debug logging capabilities with environment variable integration
- **Better Error Handling**: Enhanced error messages and debugging information

### 📚 Documentation
- **Environment Variables Guide**: Added comprehensive documentation for all supported environment variables
- **Migration Notes**: Added clear migration guidance for projectRoot path changes

### 🔧 Technical Changes
- **Package Version**: Updated to v1.10.2 across all files
- **Security Patches**: Applied security improvements to path handling and file operations

## [1.10.1] - 2025-08-22

### Added
- **New Terminal-Icons Utility**: Added `terminal-icons` utility for better emoji support in terminal output
- **Enhanced UI Text Processing**: Improved text processing with terminal-safe fallbacks for special characters

### Fixed
- Fixed infinite setup loop issue (Hotfix)
- Resolved version string update inconsistencies

### Changed
- Update version strings across all files from 1.9.1 to 1.10.1
- Remove outdated package-lock.json and backup config

## [1.10.0] - 2025-08-22

### Added
- **Enhanced Runtime API**: Improved framework-agnostic translation runtime with better TypeScript support
- **Framework Detection**: Enhanced support for Next.js, Nuxt.js, and SvelteKit projects
- **Reset Script**: Added `reset-for-publish.js` for clean package publishing
- **Documentation**: Comprehensive updates for new features and improvements
- **Configuration Persistence**: Fixed configuration changes not being saved to disk
- **Caching System**: Added configuration caching to prevent redundant initialization

### Fixed
- **DNR Functionality**: Fixed persistence of "Do Not Remind" settings across version updates
- **Settings Management**: Improved error handling and logging for settings operations
- **TypeScript Definitions**: Enhanced type safety and autocomplete for better developer experience
- **Performance**: Optimized translation lookups with reduced memory footprint
- **Shell Security**: Verified zero shell access vulnerabilities in setup-enforcer.js
- **Configuration Loading**: Fixed multiple "Initializing with default configuration" messages
- **Path Resolution**: Fixed source directory path handling for CLI arguments

### Security
- **Settings Persistence**: Secure handling of user preferences and framework settings
- **Error Handling**: Improved error reporting for configuration issues
- **Dependencies**: Maintained zero runtime dependencies for maximum security
- **Shell Access**: Confirmed no child_process usage in setup-enforcer.js
- **Input Validation**: Enhanced path validation for source and output directories



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
