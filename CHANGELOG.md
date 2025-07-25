# Changelog

## [1.4.0] - 2025-07-25

### 🚀 New Features
- **Enhanced Usage Analysis**: Comprehensive improvements to `i18ntk-usage.js` for better translation key detection
  - **Modular Folder Support**: Now supports multiple `en.json` files in modular structures like `/locales/pathname/en.json` and `/src/locales/pathname/en.json`
  - **Recursive Translation Discovery**: Automatically discovers translation files in nested directory structures
  - **NOT_TRANSLATED Analysis**: Analyzes and counts "(NOT TRANSLATED)" placeholders across all language files
  - **Translation Completeness Reporting**: Provides detailed statistics on translation completeness per language
- **Improved File Filtering**: Enhanced file processing to exclude toolkit's own JavaScript files from analysis
- **Better Error Handling**: Robust error handling in translation key extraction with try-catch blocks

### 🐛 Bug Fixes
- **Fixed Usage Analysis Errors**: Resolved "Cannot read properties of undefined (reading 'map')" errors in `i18ntk-usage.js`
- **Fixed File Processing**: Prevented toolkit files (debugger.js, admin-auth.js, etc.) from being incorrectly processed for translation keys
- **Enhanced Pattern Matching**: Improved RegExp pattern handling for translation key extraction
- **Fixed Source Directory Detection**: Better detection and exclusion of toolkit directories from source analysis

### 🔧 Technical Improvements
- **Enhanced getAllFiles Method**: Added `excludeFiles` array to prevent processing of toolkit's own files
- **Improved extractKeysFromFile**: Added comprehensive error handling and validation
- **Better Configuration**: Enhanced `includeExtensions` and `excludeDirs` configuration for more accurate file filtering
- **Recursive Translation Loading**: `getAllTranslationKeys` now recursively searches for translation files in subdirectories
- **Translation Completeness Metrics**: Added detailed analysis of translation status across all languages

### 📊 Workflow Improvements
- **Successful Auto-Run**: All 6 workflow steps now complete successfully without errors
  - ✅ Analyze Translations
  - ✅ Validate Translations  
  - ✅ Check Usage
  - ✅ Complete Translations
  - ✅ Analyze Sizing
  - ✅ Generate Summary
- **Enhanced Reporting**: Improved usage analysis reports with accurate key detection and usage statistics
- **Better Performance**: Optimized file processing and analysis performance

### 🌍 Translation Management
- **Consistent Placeholder Handling**: Standardized use of "(NOT TRANSLATED)" instead of confusing placeholders
- **Multi-Language Analysis**: Enhanced support for analyzing translation completeness across all supported languages
- **Modular Structure Support**: Full support for modern project structures with distributed translation files

### 📋 Notes
- Version 1.4.0 focuses on robust usage analysis and translation completeness tracking
- All workflow steps now execute without the previous "map" property errors
- Enhanced file filtering prevents toolkit files from interfering with project analysis
- Improved support for complex project structures with nested translation files
- No breaking changes to existing functionality

## [1.3.9] - 2025-07-25

### 🚀 New Features
- **Enhanced Path Detection**: Automatically detects i18n directories from multiple common locations
- **Cross-Platform Support**: Improved Windows, macOS, and Linux compatibility
- **Framework Detection**: Automatically detects installed i18n frameworks (React, Vue, Angular, etc.)
- **Multiple Source Directory Support**: Checks common source directories (src, app, components, etc.)

### 🐛 Bug Fixes
- **Fixed validation error**: Resolved "this.t is not a function" error in validation module
- **Fixed auto-run error**: Resolved "SettingsManager is not a constructor" error
- **Fixed path validation**: Improved handling of undefined paths in security validation
- **Fixed double readline**: Resolved double character input when changing UI language

### 📝 Documentation
- **Updated file comments**: Replaced outdated script paths with npm run commands
- **Enhanced usage examples**: Added both npm and direct node usage examples
- **Improved error messages**: More descriptive error messages for troubleshooting

### 🔧 Technical Improvements
- **Enhanced security validation**: Better path validation and sanitization
- **Improved configuration management**: More robust settings loading and validation
- **Better error handling**: Enhanced error reporting and logging
- **Cross-language support**: Improved support for multiple programming languages

### 📋 Version 1.3.8 Changes (Completed)
- Fixed critical readline interface conflicts
- Resolved completion method naming issues
- Fixed debug function undefined property errors
- Enhanced error handling in core modules

## [1.3.8] - 2025-07-25

### 🐛 Critical Fixes
- Fixed double character input issue in UI language selection
- Fixed "completer.complete is not a function" error
- Fixed "validatedArgs is not iterable" error
- Fixed debug functions undefined 'length' property errors

### 🔧 Technical Improvements
- Enhanced readline interface management
- Improved error handling in debug functions
- Better validation of command arguments
- Enhanced security logging

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.7] - 2025-07-25

### 🎛️ Enhanced Settings Management
- **New Feature**: Comprehensive interactive settings CLI interface (`settings-cli.js`)
- Added terminal-based settings management with color-coded interface
- Implemented settings categories: UI, Directory, Processing, and Advanced settings
- Added settings validation, backup, and restore functionality
- Enhanced settings schema support for dynamic UI generation
- Integrated with existing `SettingsManager` for centralized configuration

### 🐛 Bug Reporting Integration
- **New Feature**: Built-in bug reporting functionality in settings CLI
- Added "Report Bug" option (key '8') in main settings menu
- Automatic browser opening to GitHub issues page with cross-platform support
- Comprehensive bug reporting guidelines and best practices
- User-friendly instructions for effective issue reporting

### 🔧 Terminal Interface Improvements
- **Critical Fix**: Resolved double character input/output issues across all CLI interfaces
- Updated all `readline.createInterface` configurations with `terminal: true` and `historySize: 0`
- Fixed readline configuration in:
  - `settings-cli.js`: Enhanced settings management interface
  - `i18ntk-manage.js`: Main management interface
  - `i18ntk-autorun.js`: Automated workflow interface
  - `i18ntk-init.js`: Project initialization interface
  - `ui-i18n.js`: Language selection interface
  - `utils/admin-cli.js`: Admin authentication interface

### 🎨 User Experience Enhancements
- Improved terminal output with consistent ANSI color coding
- Enhanced interactive menus with better visual hierarchy
- Added comprehensive help text and option descriptions
- Improved error handling and user feedback across all interfaces
- Better keyboard navigation and input handling

### 🛠️ Code Quality & Maintenance
- Enhanced module imports and dependency management
- Improved error handling and validation throughout the codebase
- Better separation of concerns between UI and business logic
- Enhanced code documentation and inline comments
- Consistent coding standards across all CLI interfaces

### 📋 Notes
- All terminal interface improvements are backward compatible
- Settings CLI provides intuitive management of all configuration options
- Bug reporting feature streamlines issue submission process
- Enhanced user experience with professional-grade terminal interfaces
- No breaking changes to existing functionality

## [1.3.6] - 2025-07-25

### 🔐 Enhanced Admin Authentication System
- **New Feature**: Comprehensive admin PIN authentication with advanced security features
- Implemented persistent authentication sessions with configurable timeout
- Added admin PIN setup prompt during project initialization
- Enhanced `AdminAuth` class with session management and lockout protection
- Integrated admin authentication with `SettingsManager` for centralized configuration
- Added support for "keep authenticated until exit" functionality
- Implemented failed attempt tracking with automatic lockout after configurable attempts
- Enhanced security logging with debug mode integration

### ⚙️ Advanced Settings Management
- **New Feature**: Comprehensive settings system with security and debug configurations
- Added `security` settings section with admin PIN, session timeout, and lockout controls
- Added `debug` settings section with logging preferences and security log visibility
- Implemented settings validation and backup functionality
- Enhanced `SettingsManager` with new methods for security and debug configuration
- Added settings schema for UI generation and validation

### 🛡️ Security Enhancements
- Enhanced `SecurityUtils` with debug mode integration for conditional logging
- Improved security event logging with settings-based visibility controls
- Added comprehensive input validation for admin PIN setup (4-8 digits)
- Implemented secure session management with automatic cleanup
- Enhanced path validation and file operation security
- Added audit trails for all admin authentication events

### 🌍 Internationalization Improvements
- Added new translation keys for admin PIN setup and session management
- Enhanced UI locales with debug and security-related messages
- Improved user experience with clear feedback during admin operations
- Added multilingual support for admin authentication prompts

### 🔧 File Management
- **Renamed**: `auto-run.js` → `i18ntk-autorun.js` for consistent naming convention
- Fixed `SettingsManager` import issues across all modules
- Corrected singleton pattern usage for settings management
- Enhanced module imports for better compatibility
- **Fixed**: Added missing `safeReadFileSync` function to `SecurityUtils` for synchronous file operations
- **Fixed**: Resolved `SecurityUtils.validateConfig` compatibility issues in completion script
- **Fixed**: All auto-run workflow steps now execute successfully without errors

### 🚀 Performance & Reliability
- Improved error handling in admin authentication flows
- Enhanced session cleanup and memory management
- Better integration between authentication and settings systems
- Optimized security logging with conditional output
- Fixed constructor issues with singleton pattern implementations

### 📝 Developer Experience
- Enhanced code documentation with comprehensive inline comments
- Improved error messages and user feedback
- Better separation of concerns between authentication, settings, and security
- Added comprehensive testing for admin authentication flows
- Enhanced debugging capabilities with detailed logging options

### 📋 Notes
- All admin authentication features are backward compatible
- Settings system provides sensible defaults for all new configurations
- Debug mode can be enabled/disabled without affecting core functionality
- Admin PIN setup is optional and can be configured during or after initialization
- Session management provides both security and user convenience

## [1.3.5] - 2025-07-24

### 🔐 Admin Authentication
- **New Feature**: Added comprehensive admin authentication system with PIN protection
- Implemented `AdminCLI` utility module for secure admin operations
- Added admin commands to `i18ntk-validate.js` and `i18ntk-manage.js`:
  - `--setup-admin`: Set up admin PIN protection
  - `--disable-admin`: Disable admin authentication
  - `--admin-status`: Check admin authentication status
- Protected sensitive operations with admin authentication:
  - Project initialization (`init`)
  - Project deletion (`delete`)
  - Workflow management (`workflow`)
- Enhanced security with hidden PIN input and confirmation prompts
- Added admin authentication checks for both CLI and interactive modes

### 🛡️ Security Enhancements
- PIN-based authentication for administrative operations
- Secure PIN storage with encryption
- Hidden PIN input for enhanced security
- Confirmation prompts for destructive operations
- Audit trail for admin authentication events

### 📝 Updated
- Enhanced help messages in English locale to include admin commands
- Updated command-line argument parsing for admin functionality
- Improved user experience with clear admin status feedback
- Added comprehensive error handling for admin operations

### 🔧 Development
- New `utils/admin-cli.js` module for admin functionality
- Enhanced CLI interfaces with admin command support
- Improved security architecture with role-based access
- Better separation of concerns for authentication logic

### 📋 Notes
- Admin authentication is optional and can be enabled/disabled as needed
- Existing functionality remains unchanged for non-admin operations
- Enhanced security for production environments
- Backward compatible with existing workflows

## [1.3.0] - 2025-01-27

### 🔒 Security
- **Major Security Enhancement**: Implemented comprehensive security framework with `SecurityUtils` module
- Added secure file operations with path validation and sanitization
- Implemented input validation and sanitization for all user inputs
- Added security event logging for audit trails
- Enhanced configuration validation with security checks
- Protected against path traversal attacks with strict path validation
- Added secure JSON parsing with error handling
- Implemented safe file read/write operations with proper error handling
- Added command-line argument sanitization
- Enhanced directory validation with security checks

### 🛡️ Security Features
- **SecurityUtils Module**: Centralized security utilities for all operations
  - `validatePath()`: Prevents path traversal attacks
  - `sanitizeInput()`: Sanitizes user input to prevent injection attacks
  - `safeReadFile()`: Secure file reading with validation
  - `safeWriteFile()`: Secure file writing with validation
  - `safeParseJSON()`: Safe JSON parsing with error handling
  - `validateConfig()`: Configuration validation with security checks
  - `logSecurityEvent()`: Security event logging for audit trails

### 🔧 Updated Scripts
- **i18ntk-init.js**: Integrated SecurityUtils for secure initialization
- **i18ntk-analyze.js**: Added security validation for analysis operations
- **i18ntk-complete.js**: Enhanced with secure file operations
- **i18ntk-sizing.js**: Implemented security checks for sizing analysis
- **i18ntk-summary.js**: Added secure report generation
- **i18ntk-usage.js**: Enhanced with comprehensive security validation
- **i18ntk-validate.js**: Strengthened validation with security checks

### 📝 Changed
- All file operations now use secure methods with validation
- Configuration loading enhanced with security validation
- User input processing now includes sanitization
- Error handling improved with security considerations
- Logging enhanced with security event tracking

### 🛠️ Development
- Added comprehensive security testing framework
- Enhanced error handling with security focus
- Improved code quality with security best practices
- Added security documentation and guidelines

### 📋 Notes
- This version focuses on security hardening and vulnerability prevention
- All user inputs and file operations are now properly validated and sanitized
- Security event logging provides audit trails for all operations
- No breaking changes to existing functionality

## [1.2.2] - 2025-07-24

### 🔧 Fixed
- **Critical Fix**: Resolved all old file references throughout the codebase
- Fixed script execution references in `i18ntk-complete.js` from `05-complete-translations.js` to `i18ntk-complete.js`
- Updated translation key namespace from `completeTranslations` to `complete` in `i18ntk-complete.js`
- Corrected header comments and usage examples in all core scripts:
  - `i18ntk-complete.js`: Updated from `05-complete-translations.js`
  - `i18ntk-usage.js`: Updated from `04-check-usage.js`
  - `i18ntk-validate.js`: Updated from `03-validate-translations.js`
- Fixed method comments in `checkUnusedKeys` method referencing old script names
- Resolved JavaScript syntax error in debugger by renaming reserved keyword variable
- Updated help messages in all UI locale files (en.json, fr.json, zh.json) to reference correct script names

### 📝 Changed
- **Documentation Consistency**: All internal references now use current file naming convention
- Updated usage examples across all UI locale files to reflect new script names
- Enhanced code comments to reference correct file paths and script names
- Improved consistency between file names and internal documentation

### 🛠️ Development
- Fixed debugger script syntax error preventing proper project analysis
- Enhanced project validation to catch old file references
- Improved development tooling reliability

### 📋 Notes
- All old numbered script references (03-, 04-, 05-) have been completely removed
- Project now has full consistency between file names and internal references
- Debugger validation confirms all file reference issues are resolved

## [1.2.1] - 2025-07-24

### ✨ Added
- **i18nTK Branding**: Renamed all core files to use `i18ntk-` prefix for better branding
- New `--detailed` flag for sizing analysis with comprehensive reporting
- Enhanced npm scripts with `i18ntk:` namespace for better organization
- Added `npm run i18ntk` command for complete workflow execution
- New binary commands: `i18ntk-sizing`, `i18ntk-summary` for global installation
- Improved auto-run workflow with better error handling and reporting

### 🔧 Fixed
- **Critical Fix**: Resolved 'Analyze Sizing' step failure in auto-run workflow
- Fixed incorrect default source directory path from `./src/locales` to `./locales`
- Enhanced nested directory structure support for translation files
- Improved file size calculation for nested language directories
- Fixed translation content analysis for multi-file language structures
- Updated initialization check messages to reference new file names

### 📝 Changed
- **File Renaming**: All core scripts now use `i18ntk-` prefix:
  - `00-manage-i18n.js` → `i18ntk-manage.js`
  - `01-init-i18n.js` → `i18ntk-init.js`
  - `02-analyze-translations.js` → `i18ntk-analyze.js`
  - `03-validate-translations.js` → `i18ntk-validate.js`
  - `04-check-usage.js` → `i18ntk-usage.js`
  - `05-complete-translations.js` → `i18ntk-complete.js`
  - `06-analyze-sizing.js` → `i18ntk-sizing.js`
  - `07-summary-report.js` → `i18ntk-summary.js`
- Updated package.json main entry point and binary commands
- Enhanced npm scripts with both namespaced and legacy command support
- Improved settings-based configuration for dynamic behavior

### 🌍 Improved
- Better support for nested translation file structures
- Enhanced sizing analysis with detailed reporting capabilities
- Improved error messages and user feedback
- More robust file discovery and processing
- Better integration between all toolkit components
- Enhanced documentation and help text

### 🚀 Performance
- Optimized file scanning for nested directory structures
- Improved memory usage for large translation projects
- Better error handling to prevent workflow interruptions

### 📋 Notes
- Preparing for v1.3 with enhanced debugging capabilities
- Focus on dynamic settings-based configuration over hardcoded values
- Improved open-source development experience

## [1.2.0] - 2025-07-24

### Changed
- **BREAKING**: Changed default translation marker from `__NOT_TRANSLATED__` to `NOT_TRANSLATED`
- Updated all core scripts to use new translation marker
- Updated all locale files to use new translation marker
- Enhanced auto-run functionality with better error handling and reporting
- Improved settings management with comprehensive defaults and validation
- Updated GitHub repository URLs to reflect new ownership

### Added
- Enhanced configuration system with detailed examples and documentation
- Comprehensive notification system with console, desktop, and sound options
- AGENTS.md file with AI agent guidelines for development
- Improved README.md with installation, configuration, and contribution guidelines
- Better auto-run workflow with custom settings support

### Fixed
- Double character issue in translation processing
- Improved marker consistency across all files
- Enhanced error handling in auto-run scripts

### Removed
- Web-based settings components and directory (simplified to CLI-only)
- Deprecated web interface dependencies

## [1.1.0] - 2025-07-24

### ✨ Added
- Complete status translation keys for all 7 supported languages (EN, DE, ES, FR, RU, JA, ZH)
- Enhanced project status reporting with proper localization
- New translation keys for comprehensive status display:
  - `status.title` - Status report title
  - `status.sourceDir` - Source directory information
  - `status.sourceLanguage` - Source language display
  - `status.i18nSetup` - I18n setup status
  - `status.yes` / `status.no` - Boolean status indicators
  - `status.availableLanguages` - Available languages list
  - `status.translationFiles` - Translation files count
  - `status.totalKeys` - Total translation keys count
  - `status.suggestions.analysis` - Analysis suggestions
  - `status.separator` - Visual separator for reports

### 🔧 Fixed
- Resolved "Translation key not found" errors for status commands
- Fixed missing `status.separator` translation key across all locale files
- Improved consistency across all UI locale files
- Enhanced error handling and validation across all scripts

### 📝 Changed
- Updated package.json version to 1.1.0
- Enhanced README.md with version 1.1 changelog and improvements
- Improved documentation with comprehensive feature descriptions
- Better error messages and validation feedback

### 🌍 Improved
- Complete multi-language support for status reporting
- Enhanced translation key validation and error reporting
- Better consistency across all locale files (en.json, de.json, es.json, fr.json, ru.json, ja.json, zh.json)
- Improved user experience with proper localization

## [1.0.0] - 2025-07-24

### ✨ Initial Release
- 🎛️ Main management interface with interactive menu
- 🚀 Initialize new languages functionality
- 📊 Analyze translation completeness
- ✅ Validate translation files
- 🔍 Check translation key usage
- 🎯 Complete translations (100% coverage)
- 📏 Analyze translation sizing and layout impact
- 📋 Generate summary reports
- 🌍 Multi-language UI support (7 languages)
- ⚙️ Settings management
- 🔄 Full workflow automation
- 📈 Visual reports generation
- 🛠️ Command-line interface
- 📁 Project structure initialization
- 🎯 Best practices implementation
- 🔍 Troubleshooting guides
- 📖 Comprehensive documentation

### 🌍 Supported Languages
- 🇺🇸 English (en) - Default
- 🇩🇪 German (de) - Deutsch
- 🇪🇸 Spanish (es) - Español
- 🇫🇷 French (fr) - Français
- 🇷🇺 Russian (ru) - Русский
- 🇯🇵 Japanese (ja) - 日本語
- 🇨🇳 Chinese (zh) - 中文

### 🎯 Key Features
- Interactive menu system
- Command-line interface
- Multi-language UI support
- Comprehensive translation analysis
- Validation and error checking
- Usage analysis and reporting
- Automatic translation completion
- Sizing and layout impact analysis
- Settings management
- Full workflow automation
- Visual report generation
- Project initialization
- Best practices guidance

---

## Version Format

- **Major.Minor.Patch** (e.g., 1.1.0)
- **Major**: Breaking changes or significant new features
- **Minor**: New features, improvements, and enhancements
- **Patch**: Bug fixes and small improvements

## Categories

- **✨ Added**: New features
- **🔧 Fixed**: Bug fixes
- **📝 Changed**: Changes in existing functionality
- **🗑️ Removed**: Removed features
- **🔒 Security**: Security improvements
- **🌍 Improved**: General improvements and enhancements