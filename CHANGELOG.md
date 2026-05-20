# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.3.0] - 2026-05-20

### Changed
- Auto Translate now supports `--provider google|deepl|libretranslate`; DeepL uses `DEEPL_API_KEY`, while LibreTranslate supports `LIBRETRANSLATE_URL` and optional `LIBRETRANSLATE_API_KEY`.
- Auto Translate provider networking now keeps HTTPS, host allowlist, response-size, private-network, and redacted security logging protections in place for additional providers.

### Fixed
- `i18ntk-complete` now fills missing target-language keys from the English source value with a language prefix such as `[DE] Home` instead of writing `NOT_TRANSLATED`; this works for both `locales/en/*.json` and monolith `locales/en.json` layouts.

### Security
- Eliminated all 21 dynamic `require()` calls flagged by Socket.dev: 20 `require(path.join(__dirname, ...))` patterns in `i18ntk-js.js`, `i18ntk-py.js`, `i18ntk-java.js`, `i18ntk-php.js`, and `i18ntk-go.js` converted to static string literal requires.
- Added `SecurityUtils.validatePath()` gate around the remaining dynamic `require()` in `i18ntk-translate.js` `loadCustomTranslateFn`.
- Created `utils/translate/safe-network.js` — a secure HTTPS wrapper with URL host/path allowlist validation, response size limits (100KB), suspicious query parameter detection, and security event logging. All outbound network access now flows through this validated layer.
- Replaced direct `https.get` call in `utils/translate/api.js` with `safeHttpGet` from the safe-network wrapper.

### Docs
- README.md updated for v3.3.0 Auto Translate providers and secure provider operations.
- SECURITY.md updated with Socket.dev analysis disclaimer and guidance on expected alerts for a CLI/i18n toolkit.
- CHANGELOG.md and `package.json` versionInfo updated for v3.3.0.

### Socket.dev Analysis Disclaimer

This package is a developer CLI and runtime helper that performs file I/O, network access (translation provider APIs on user request), and environment variable access. As such, Socket.dev will flag the following alerts that are **expected and by design**:

| Alert | Why it's expected |
|---|---|
| Network access | Only contacts configured translation providers via HTTPS when user invokes auto-translate. All outbound calls flow through `safe-network.js` with host/path allowlist validation, response size limits, private-network blocking, and redacted security event logging. No telemetry, no unexpected outbound calls. |
| Environment variable access | Centralized through `env-manager.js` with a strict allowlist. Blocks `SECRET`, `PASSWORD`, `KEY`, `TOKEN`, `AWS_*`, `NPM_*`, and 15+ other patterns. |
| Filesystem access | Reads/writes only project locale files and reports within validated paths. All FS operations gated by `SecurityUtils.validatePath`. |
| URL strings | Hardcoded default provider URLs for Google, DeepL, and LibreTranslate used only for auto-translation. No external resource loading. |

The v3.3.0 release resolves the actionable dynamic-require alert by eliminating all 21 instances.

## [3.2.0] - 2026-05-16

### Security
- **CRITICAL**: Fixed invalid `crypto.createCipherGCM`/`createDecipherGCM` API calls in `admin-pin.js` — replaced with `crypto.createCipheriv`/`createDecipheriv`.
- **CRITICAL**: Fixed missing `SecurityUtils` imports in `admin-pin.js`, `security-config.js`, and `scripts/security-check.js` causing `ReferenceError` at runtime.
- **CRITICAL**: Removed encryption key stored alongside ciphertext in `admin-pin.js`. The AES key was stored in the same JSON file as the encrypted PIN, providing zero cryptographic protection. Encryption key is now derived via HKDF from the scrypt hash.
- Enforced HTTPS-only for Google Translate API requests in `utils/translate/api.js`; dropped `http` protocol support.
- Fixed `http.get` timeout for Node.js <16.14 compatibility by using `req.setTimeout()` instead of the options-based `{ timeout }` parameter.
- Added `SecurityUtils.validatePath` checks to `secure-backup.js` `restoreBackup` and `verifyBackup` methods.
- Added `backupDir` traversal validation in `secure-backup.js` constructor.
- Fixed `FileManagementService` `isAuthRequiredForScript`/`verifyPin` stubs — previously returned hardcoded `false`/`true`, disabling PIN protection. Now delegates to proper `AdminAuth` module.
- Fixed `admin-auth.js` `logSecurityEvent` signature mismatches — 6 calls passed raw strings instead of structured objects.
- Fixed `admin-pin.js` `getPinDisplay` to use stored `pinLength` instead of decrypting the raw PIN into memory.

### Fixed
- `admin-pin.js` lockout now uses timestamp-based expiry (`lockedUntil`) instead of `setTimeout`, ensuring lockout state survives process restarts.
- `translate/traverse.js` `setLeaf` now correctly creates `[]` for numeric array indices (was creating `{}`).
- `translate/traverse.js` extracted shared `parseKeyPath` function — `setLeaf` and `getLeaf` had duplicate path-parsing logic.
- `translate/traverse.js` `deepClone` now handles `null`, `undefined`, and circular references gracefully.
- `translate/api.js` retry logic now retries `TimeoutError` and `NetworkError` with exponential backoff (previously only retried rate-limit errors).
- `translate/api.js` added `User-Agent` header to Google Translate API requests.
- `main/manage/index.js` `startupTimeout` no longer cleared before `createPrompt` and other blocking initialization steps.
- `main/manage/index.js` removed silent no-op `t('init.autoDetectedI18nDirectory', ...)` whose return value was never used.
- `ultra-performance-optimizer.js` removed dead `preallocateMemory` pools (`stringPool`, `objectPool`, `arrayPool`) — ~1MB wasted allocation.
- `ultra-performance-optimizer.js` `getCacheKey` now uses async `fs.stat` instead of blocking `fs.statSync`.
- `ultra-performance-optimizer.js` GC timer now enforces minimum 5-second interval and warns when `--expose-gc` is missing.
- `ultra-performance-optimizer.js` `readFileUltra` now handles files >64KB with chunked reads.
- `ultra-performance-optimizer.js` `createUltraCache` replaced per-entry `setTimeout` (timer leak) with unified cleanup interval.
- `ultra-performance-optimizer.js` benchmark now uses real benchmark datasets instead of non-existent mock files.
- `config-manager.js` now exports `loadSettings`/`saveSettings` aliases — resolves 20+ phantom API fallback calls across the codebase.
- `config-manager.js` `updateConfig` now clones before deep-merging to prevent in-place cache corruption.
- `admin-pin.js` scrypt→pbkdf2 fallback now emits a console warning instead of failing silently.

### Changed
- Updated all documentation to v3.2.0: README, CHANGELOG, docs/README, getting-started, runtime, auto-translate, environment-variables, scanner-guide, API_REFERENCE, COMPONENTS, and CONFIGURATION.
- Updated `package.json` version, `versionInfo`, `majorChanges`, and `nextVersion` for v3.2.0.
- Socket badge URL updated to v3.2.0.

## [3.1.2] - 2026-05-07

### Fixed
- Auto Translate now resolves locale roots such as `./locales` to the selected source-language folder such as `./locales/en` when JSON files are stored under language folders.
- Public package staging now verifies root `package.json` and `package.public.json` release metadata are synchronized before pack or publish.
- Added a safe `publish:public:dry-run` path for validating the exact staged npm publish flow.

### Changed
- Updated release docs, npm README metadata, and package manifests for v3.1.2.
- Kept generated backups, temporary benchmark datasets, local setup state, and debug repair files out of future public repo commits through `.gitignore`.

## [3.1.1] - 2026-05-07

### Added
- **Auto Translate protection file workflow**: Added user-editable `i18ntk-auto-translate.json` support for protected terms, key paths, exact values, and regex patterns.
- **Public package README guard**: Public package staging now verifies `README.md` is included and non-empty before publish.

### Changed
- Updated README and release documentation for the current Auto Translate protection workflow and public package contents.
- Removed project-specific hardcoded validation examples so users configure their own brand and domain terms.

### Fixed
- Removed provider-shaped fake secret fixtures from tests to avoid GitHub push protection false positives.
- Ensured public package metadata includes `readmeFilename: "README.md"` so npm can render the package README.

## [3.1.0] - 2026-05-07

### Added
- **Placeholder-preserve translation mode**: Translates text segments around dynamic placeholders and reinserts the original tokens exactly.
- **Auto Translate beta settings**: Added settings for placeholder mode, concurrency, batch size, progress interval, retry count, retry delay, timeout, dry-run preview, report output, and BOM output.
- **Large-file tuning flags**: Added `--batch-size` and `--progress-interval` to `i18ntk-translate`.
- **Short-lived placeholder manifest**: Mirrors placeholder maps to an OS temp file during processing and removes it after each file completes.
- **Validation content-risk helper**: Added structured detection for URLs, email addresses, secret-like values, and likely untranslated English content.
- **Sizing file-set analysis**: Added per-language file counts, per-file sizing statistics, and missing/extra file comparison across locale folders.

### Changed
- Automated and manager Auto Translate flows now default to placeholder `preserve` mode instead of skipping placeholder-bearing strings.
- `i18ntk-translate` can now be imported and run in-process by other package modules.
- Source JSON reads tolerate UTF-8 BOM-prefixed files.
- Validation warnings now report specific issue types and reasons instead of the vague `Risky content` message.
- English-content validation now reports an English percentage and only warns above a 10% threshold with at least three detected English words.
- Sizing reports now include folder-level file counts and per-file key/character breakdowns for each language.

### Fixed
- Fixed false-positive validation warnings for normal product copy terms.
- Fixed validator handling so ordinary explanatory uses of words like `token` or `secret` are not treated as leaked credentials.
- Fixed distorted `i18ntk-sizing` table output by rendering aligned columns from measured values instead of fixed localized spacing.
- Fixed sizing language comparison output so it uses analyzed languages and the configured source language baseline.

### Security
- Removed production `child_process` usage from `main/manage/commands/TranslateCommand.js` by replacing the spawned CLI process with an in-process translator call.

## [3.0.0] - 2026-05-05

### Added
- **`i18ntk-translate`**: Zero-dependency CLI tool that converts English source JSON locale files into any target language via Google's free Translate API.
- **Placeholder protection**: Intelligent detection, masking, and unmasking of dynamic placeholder tokens (`{name}`, `{{count}}`, `%d`, `%s`, `:param`, `{{variable}}`, `%{name}`, `${var}`, etc.) to prevent corruption during translation.
- **Custom regex support**: `--custom-regex` flag to define additional placeholder patterns for detection and protection.
- **Interactive control flow**: Two-level user controls — global choice (skip all / send all / ask per key) and per-key interactive mode where each affected key can be individually flagged.
- **Fully automated CLI mode**: `--no-confirm --skip-placeholders` or `--no-confirm --send-placeholders` flags for unattended CI/CD use.
- **Post-translation report**: Comprehensive report (stdout, file, or both) listing every skipped key with its original value and a reminder for manual translation.
- **Multi-file batch processing**: `--source-dir` and `--files` flags support translating all JSON files in a directory at once.
- **Dry-run mode**: `--dry-run` flag previews which keys would be skipped without making API calls.
- **UTF-8 BOM output**: `--bom` flag for output files with UTF-8 byte order mark.
- **Custom translation function**: `--translate-fn` flag to inject an alternative translation API while maintaining the placeholder safety workflow.
- **Rate-limit handling**: Exponential backoff/retry logic for Google Translate API rate limits and network errors.
- **Deep JSON traversal**: Full support for nested objects and arrays, preserving data types, null values, and non-string leaf values.

### Changed
- Version bumped to 3.0.0 (major release with new translation tool feature).

## [2.6.0] - 2026-05-03

### Security
- **CRITICAL**: Fixed 8+ silent-write failures where `safeWriteFileSync` was called without basePath parameter across `utils/config.js`, `utils/config-helper.js`, `utils/secure-errors.js`, and `main/i18ntk-scanner.js`.
- Replaced all raw `fs` calls (`readdirSync`, `statSync`, `mkdirSync`, `unlinkSync`, `rmSync`) with `SecurityUtils` wrappers in `main/i18ntk-validate.js`, `main/i18ntk-scanner.js`, `main/manage/commands/FixerCommand.js`, and `utils/secure-errors.js`.
- Fixed path traversal checks in `security.js` and `config-manager.js` — replaced fragile `path.sep`-based comparison with robust `startsWith('..')` prefix check.
- Hardened `utils/i18n-helper.js` fallback `SecurityUtils` implementation with path containment checks.
- Fixed `SecurityUtils.safeParseJSON` reference leak — deep-clones objects instead of returning caller's reference.

### Fixed
- Fixed `main/i18ntk-analyze.js` `this.adminAuth` reference error (local variable was not assigned to instance property).
- Fixed `main/i18ntk-validate.js` `ExitCodes.CONFIG_ERROR` referenced before declaration.
- Fixed `main/i18ntk-scanner.js` `fs.readdirSync(projectRoot, { recursive: true })` removed (unsupported in older Node.js).
- Fixed `main/i18ntk-scanner.js` raw `fs.readdirSync`/`fs.statSync`/`fs.mkdirSync` in `scanDirectory` and `generateReport`.
- Fixed `main/i18ntk-validate.js` raw `fs.readdirSync`/`fs.mkdirSync`/`fs.unlinkSync` in `getAvailableLanguages`, `getLanguageFiles`, and validation report cleanup.
- Fixed `utils/secure-errors.js` `safeWriteFileSync` missing basePath and raw `fs.mkdirSync`.
- Fixed `main/manage/commands/FixerCommand.js` `cleanupOldBackups` using raw `fs.rmSync` without path validation.
- Fixed `runtime/enhanced.js` process event handler leak (multiple instances) and missing `setInterval.unref()`.
- Fixed `utils/setup-enforcer.js` async Promise executor anti-pattern.
- Fixed `utils/config-manager.js` stale `process.cwd()` capture at module load time.
- Fixed `utils/config-manager.js` `ensureProjectSettingsDir` being a no-op.
- Fixed `utils/config-helper.js` 7 `safeWriteFileSync` calls missing basePath in `initializeSourceFiles`.
- Fixed `utils/env-manager.js` `getBoolean` comparison against non-boolean values.
- Fixed `utils/admin-auth.js` `uncaughtException` handler wrong parameter format.

### Added
- `SecurityUtils.safeUnlinkSync(filePath, basePath)` — safely delete a file.
- `SecurityUtils.safeRmdirSync(dirPath, basePath)` — safely remove a directory.

### Changed
- `configManager.resolvePaths`, `configManager.toRelative`, and config lock path now dynamically resolve via `getUserProjectRoot()`/`getProjectConfigPath()`.
- `configManager.CONFIG_PATH` is now a getter that dynamically returns the project config path.
- `configManager.migrateLegacyIfNeeded` exported for testability.

### TypeScript
- Fixed `runtime/i18ntk.d.ts` `BasicI18nRuntime.translate` and `t` return types from `Promise<string>` to `string`.

### Scripts
- Fixed `scripts/build-public-package.js` and `scripts/reset-release-state.js` `npm_execpath` fallback for missing env var.
- Fixed `scripts/lint-locales.js` BOM handling and try-catch for `fs.readdirSync`.

## [2.5.1] - 2026-04-29

### Security
- Fixed `AdminAuth.verifyPin()` to fail closed when admin config is missing, disabled, or malformed instead of returning success.
- Fixed auth-required checks to fail closed when settings require admin PIN protection but the admin config is unusable.
- Normalized admin session expiry handling by storing both `expires` and `expiresAt` and cleaning up both formats consistently.

### Added
- Added regression tests for admin PIN fail-closed behavior and session expiry cleanup.

### Changed
- Documented the public npm package staging flow introduced after `2.5.0`.

## [2.5.0] - 2026-04-29

### Security
- Centralized environment-variable access behind the `utils/env-manager.js` allowlist.
- Hardened `SecurityUtils.safeJoin()` and path validation against sibling-prefix containment bypasses.
- Switched admin PIN hash verification to timing-safe comparison.
- Fixed expired admin session cleanup and unref'd the cleanup timer so it does not keep CLI processes alive.
- Expanded the release security scanner to inspect nested production source files.

### Fixed
- Fixed the manager fixer command so applied fixes are written to the same parsed object that is saved.
- Fixed fixer writes for absolute source directories outside the current working directory.
- Fixed debug-menu file reads to use `SecurityUtils` wrappers.
- Fixed `secure-errors` to import its `SecurityUtils` dependency explicitly.

### Changed
- Updated package and documentation metadata to `2.5.0`.

## [2.4.0] - 2026-04-16

### Changed
- Disabled npm registry update-check behavior in CLI startup paths.
- Disabled manager-route backup execution (`i18ntk --command=backup`); standalone `i18ntk-backup` remains available.
- Disabled setup prerequisite command probing via `PATH` inspection.
- Updated README/docs/migration guides/environment variable documentation to reflect the above behavior.

## [2.3.8] - 2026-04-13

### Added
- Added centralized structured logger with standardized prefixes and configurable levels (`error`, `warn`, `info`, `debug`).
- Added opt-in JSON log output for CI/build pipelines via `JSON_LOG=true`.
- Added missing-translation-key cache TTL (5 minutes) to prevent repeated key-miss spam.
- Added build/worker logging utilities for percentage progress and pooled worker activity summaries.
- Added test coverage for logger timing/progress/worker aggregation behavior.

### Fixed
- Fixed repeated default-configuration fallback output by emitting a single fallback notice per process.
- Fixed recursive security/i18n logging interactions that could trigger repeated warning cascades.
- Fixed false-positive security warnings for internal package/project absolute paths through internal root whitelisting.

### Changed
- Logging is now silent by default for non-critical output in production-like builds unless `DEBUG_MODE=true`.
- Security warning reasons now use specific detection details instead of generic "dangerous patterns".
- Updated package/docs/version metadata to `2.3.8`.

## [2.3.7] - 2026-04-12

### Fixed
- Removed false-positive path traversal warnings for safe absolute project paths during framework builds.
- Reduced repeated default-configuration console noise in multi-worker build environments.

### Changed
- Security event console logging is now fully opt-in via `I18NTK_ENABLE_SECURITY_LOGS=true` (or debug envs).
- Config-manager diagnostic console logging is now fully opt-in via `I18NTK_ENABLE_LOGS=true` (or debug envs).
- Updated docs to reflect new default-silent logging behavior and troubleshooting toggles.

## [2.3.6] - 2026-04-12

### Security
- **Fixed path traversal vulnerability** in temporary file creation
- **Added `safeJoin` function** for secure path construction
- **Improved path validation** throughout the codebase

### Fixed
- Hardened settings reset and backup cleanup paths to reduce risk of broad/deep unintended file deletion.
- Hardened backup command path handling to keep source/output/restore operations inside project boundaries by default.
- Fixed backup-class async file operations to consistently use `fs.promises` APIs.

### Changed
- **Silent security logging by default**: Info-level messages suppressed, warnings/errors shown
- **Debug mode**: Enable verbose logging with `I18N_DEBUG=true`
- **Centralized security logging**: All security events use `SecurityUtils.logSecurityEvent()`
- Made npm registry update checks explicit opt-in via `I18NTK_ENABLE_UPDATE_CHECK`.
- Updated package/docs/version metadata to `2.3.6`.

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
