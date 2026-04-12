# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.5] - 2026-04-12

### Fixed
- Hardened settings reset and backup cleanup paths to reduce risk of broad/deep unintended file deletion.
- Hardened backup command path handling to keep source/output/restore operations inside project boundaries by default.
- Fixed backup-class async file operations to consistently use `fs.promises` APIs.

### Changed
- Made npm registry update checks explicit opt-in via `I18NTK_ENABLE_UPDATE_CHECK`.
- Updated package/docs/version metadata to `2.3.5`.
- Updated support policy guidance to recommend upgrading from versions below `2.3.5`.

## [2.3.4] - 2026-04-12

### Fixed
- Fixed runtime autosave behavior so configuration write failures no longer hard-throw through request/render paths.
- Fixed config save race resilience by combining queued writes, cross-process lock files, and unique temp filenames per write.

### Added
- Added `I18NTK_DISABLE_AUTOSAVE` support to skip disk persistence and keep in-memory config in server/runtime environments.
- Added config-manager concurrency regression test covering parallel `saveConfig` calls.

### Changed
- Updated package/docs/version metadata to `2.3.4`.
- Updated support policy guidance to recommend upgrading from versions below `2.3.4`.

## [2.3.3] - 2026-04-12

### Fixed
- Fixed production config persistence race across multiple Node processes by adding cross-process file locking for `.i18ntk-config` writes.
- Fixed intermittent `ENOENT` during atomic config rename operations under concurrent production traffic.

### Changed
- Updated package/docs/version metadata to `2.3.3`.
- Updated support policy guidance to recommend upgrading from versions below `2.3.3`.

## [2.3.2] - 2026-04-12

### Added
- Added startup npm-registry version checks that warn when the installed CLI is behind the latest published `i18ntk` release.
- Added support for checking all published semver versions up to the current latest tag to improve outdated-version detection reliability.

### Fixed
- Fixed fatal analyze-command startup failure in manager command flow caused by missing `validateSourceDir` import.

### Changed
- Updated package/docs/version metadata to `2.3.2`.
- Updated support policy guidance to recommend upgrading from versions below `2.3.2`.

## [2.3.1] - 2026-04-12

### Fixed
- Fixed package export-path fallback in `utils/i18n-helper` that could trigger build warnings in production bundlers (`i18ntk/resources/i18n/ui-locales/en.json` not exported).

### Changed
- Updated package/docs/version metadata to `2.3.1`.
- Updated support policy guidance to recommend upgrading from versions below `2.3.1`.

## [2.3.0] - 2026-04-12

### Added
- Added validation summary report output after validation runs.
- Added init-time backup configuration prompt (default disabled, optional enable).

### Fixed
- Fixed backup recursion/pollution risk by moving automated fixer backups to a dedicated backup root.
- Fixed backup retention behavior to keep 1 by default with enforced bounds up to 3.
- Fixed language discovery in validate/fixer flows to ignore backup/report directories.

### Changed
- Updated package/docs/version metadata to `2.3.0`.
- Updated support policy guidance to recommend upgrading from versions below `2.3.0`.

## [2.2.0] - 2026-04-12

### Added
- Added an explicit upgrade/support notice in docs recommending upgrade from pre-`2.2.0` versions.
- Added migration guide for `v2.2.0`.

### Fixed
- Fixed critical sizing workflow regressions.
- Fixed critical usage-analysis workflow regressions.
- Fixed runtime locale optimizer dependency path after publish-surface cleanup.

### Changed
- Reduced publish surface by excluding internal development scripts from npm package artifacts.
- Excluded legacy fixed artifacts from package output (`main/manage/index-fixed.js`, `utils/security-fixed.js`).
- Updated package/docs/version metadata to `2.2.0`.

## [2.1.1] - 2026-04-11

### Added
- Version bump to 2.1.1 for release.
- Added `SecurityUtils.debugLog` function for consistent debugging.

### Fixed
- Fixed `SecurityUtils.logSecurityEvent` calls missing `level` parameter in `i18ntk-usage` and `UsageService`.
- Fixed `level.toLowerCase is not a function` error in usage analysis.
- Fixed `SecurityUtils.debugLog is not a function` error in sizing analysis.

### Changed
- Updated package and release metadata to `2.1.1`.
- Removed legacy `resources/i18n/ui-locales` path references (use `ui-locales/` instead).
- Updated all UI locale loading to use `ui-locales/` directory.

## [2.1.0] - 2026-04-11

### Added
- Added a v2.1.0 migration guide and updated release runbook references.
- Added stricter language-directory filtering in analysis paths to ignore backup/report folders.

### Fixed
- Fixed interactive menu command flow so it reliably returns to the main menu after command completion.
- Fixed analysis progress output to report the correct processed-language count.
- Fixed duplicate report-save output lines during analysis.
- Fixed framework detection behavior to treat setup-complete projects as internally configured i18ntk projects.
- Fixed false-positive security warnings for valid configuration fields like `dateFormat`, `timeFormat`, and `reportLanguage`.
- Fixed locale-loading path fallback behavior to avoid noisy startup errors in global installs.

### Changed
- Synchronized and normalized UI locale keys across `resources/i18n/ui-locales` and `ui-locales`.
- Updated package/release metadata to `2.1.0`.

## [2.0.0] - 2026-01-01

### Added
- Added missing runtime translation keys across `init`, `fixer`, `sizing`, `summary`, `usage`, and settings import/export flows.
- Added `SecurityUtils.safeParseJSON`, `SecurityUtils.safeReadFile`, and `SecurityUtils.safeWriteFile` compatibility APIs used by v2 command paths.
- Added source-locale bootstrap behavior during `init` when the source language directory exists but has no translation files.

### Fixed
- Fixed initialization state detection to use project `.i18ntk-config` setup metadata as the v2 source of truth.
- Fixed false setup-invalid states caused by BOM-encoded config files during setup checks.
- Fixed config persistence risk by using atomic writes in `config-manager` save flow.
- Fixed self-dependency metadata so the package remains zero-dependency in v2.

### Changed
- Updated package release metadata for the v2 line (`versionInfo`, deprecations, nextVersion).

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
