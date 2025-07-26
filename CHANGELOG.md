# Changelog

All notable changes to the I18N Management Toolkit are documented here. This project follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

**Current Version:** 1.5.2 (2025-07-27)

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.2] - 2025-07-27

### Added
- Added option to delete backups alongside reports with selection options: by folder, keep last 3, or delete all

### Changed
- Version bump to 1.5.2 (July 27, 2025)
- Documentation and versioning updated to reflect latest changes

### Fixed
- Resolved `this.t is not a function` error in summary report generation by properly binding translation context

---

## [1.5.0] - 2025-01-26 - STABLE RELEASE

### 🌟 Major Features
- **🌐 100% Console Translation Support**: Complete internationalization of all console output in all supported languages (en, es, fr, de, ru, ja, zh)
- **🔒 Enhanced Admin PIN Security**: Modern encrypted PIN system with session-based authentication
- **🛡️ Session Management**: PIN authentication with 30-minute timeout and automatic re-authentication
- **⭐ Secure PIN Display**: Proper masking with asterisks (****) in all interfaces
- **🔐 Modern Encryption**: Upgraded from deprecated crypto functions to secure AES-256-GCM encryption

### 🐛 Critical Security Fixes
- **Fixed crypto deprecation**: Replaced `createCipher`/`createDecipher` with `createCipheriv`/`createDecipheriv`
- **Fixed PIN display vulnerabilities**: Secure masking and proper session handling
- **Fixed authentication flow**: Streamlined PIN verification with robust session state management
- **Fixed readline security**: Proper cleanup and secure input handling

### 🔧 Architecture Improvements
- **Enhanced security architecture**: Modern encryption standards with proper key derivation
- **Improved session handling**: Automatic timeout management and secure session state
- **Better error handling**: Graceful degradation with user-friendly error messages
- **Robust authentication**: Reliable PIN verification with proper session persistence

### 📁 Project Structure Updates
- **Organized documentation**: Comprehensive docs structure with clear navigation
- **Enhanced folder organization**: Better separation of concerns and cleaner architecture
- **Updated file paths**: Consistent path resolution across all components
- **Improved modularity**: Better separation between core functionality and utilities

### 🌍 Translation Completeness
- **Complete UI translations**: All console messages translated into 7 languages
- **Consistent terminology**: Standardized translation keys across all components
- **Quality assurance**: Validated translations for accuracy and consistency
- **Missing key detection**: Automated detection and reporting of untranslated content

### 🚀 Performance & Reliability
- **Enhanced stability**: Robust error handling and graceful degradation
- **Improved performance**: Optimized translation loading and caching
- **Better testing**: Comprehensive test suite for all major functionality
- **Documentation updates**: Complete API documentation and usage guides

## [1.4.7] - 2025-07-26

### Fixed
- **Critical**: Fixed "Error executing command: readline was closed" error by implementing proper readline interface management
- **Critical**: Fixed workflow command path issues - commands now correctly reference `main/` directory
- **Critical**: Fixed "Translation key not found: operations.completed" by adding missing translation keys to all language files
- **Critical**: Fixed module not found errors in `i18ntk-complete.js` when calling usage analysis
- **Stability**: Improved readline interface initialization and cleanup to prevent race conditions
- **Stability**: Added proper error handling for interactive input when TTY is not available
- **Stability**: Enhanced workflow execution reliability with better path resolution

### Added
- **Translation**: Added `operations.completed` key with appropriate translations in all supported languages:
  - English: "✅ Operation completed successfully!"
  - German: "✅ Operation erfolgreich abgeschlossen!"
  - Spanish: "✅ ¡Operación completada exitosamente!"
  - French: "✅ Opération terminée avec succès!"
  - Russian: "✅ Операция успешно завершена!"
  - Japanese: "✅ 操作が正常に完了しました！"
  - Chinese: "✅ 操作成功完成！"
- **Reliability**: Added `safeClose()` method for proper readline interface cleanup
- **Reliability**: Added readline state tracking to prevent multiple closures
- **Reliability**: Added fallback handling for non-interactive environments

### Changed
- **Architecture**: Refactored readline interface management in `i18ntk-manage.js`
- **Architecture**: Updated workflow commands to use correct file paths with `main/` prefix
- **Architecture**: Improved error handling in interactive menu system
- **Performance**: Enhanced readline interface reinitialization logic

### Technical Details
- Fixed workflow step commands in `i18ntk-autorun.js` to properly reference script locations
- Updated `i18ntk-complete.js` to use correct path when calling usage analysis
- Implemented proper readline interface lifecycle management
- Added comprehensive error handling for stdin/stdout operations
- Enhanced interactive menu stability and error recovery

## [1.4.6] - 2025-01-XX

### Previous Release
- Core functionality and features as documented in README.md
- Initial release of comprehensive i18n management toolkit
- Support for multiple languages and automated workflows
- Debug tools and testing infrastructure

---

## Release Notes

### Version 1.4.7 Focus
This release primarily focuses on **stability and reliability improvements**, addressing critical runtime errors that could interrupt workflow execution. The fixes ensure:

1. **Uninterrupted Workflow Execution**: No more readline interface errors during automated workflows
2. **Complete Translation Coverage**: All UI messages now have proper translations
3. **Robust Error Handling**: Better graceful degradation when interactive input is not available
4. **Path Resolution**: Correct module and script path resolution across all components

### Upgrade Notes
- No breaking changes in this release
- All existing configurations and workflows remain compatible
- Translation files are automatically updated with new keys
- No manual intervention required for existing installations

### Testing
This release has been tested with:
- Interactive and non-interactive environments
- All supported workflow commands
- Multiple language configurations
- Various terminal and shell environments

## [1.4.8] - 2025-07-27

### Added
- Translation keys for "Settings" (menu 11) and "Debug Tools" (menu 13) in `en.json` and menu rendering logic
- Full translation key support for summary report and analysis output, including all recommendations and next steps
- Added missing translation keys for summary and analysis to `en.json`

### Fixed
- All summary and sizing analysis outputs now use translation keys instead of hardcoded English
- Menu options 11 and 13 now fully support i18n in all supported languages

### Changed
- Updated documentation and translation files to reflect new keys and improved i18n coverage
- Improved consistency of translation key usage across all CLI outputs