# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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