# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),

## [5.0.0] - 2026-07-11

### Highlights

- **Better translation quality checks.** Catch placeholder and tag mismatches, untranslated source text, corrupted characters, suspicious markers, and unsafe bidirectional text before it reaches users.
- **Safer Auto Translate.** Unresolved translations now report a failure instead of a false success. Protected product names and approved acronyms stay untouched and are no longer repeatedly selected for translation.
- **More accurate project support.** i18ntk better recognises mixed projects and supports Laravel, Spring Boot, Nuxt, next-intl, and a wider range of locale folder layouts.
- **Smarter scanning.** Find translation usage across monolithic, namespaced, regional, and underscore-style locale structures while reducing false positives from routes, imports, styles, and metadata.
- **Clearer translation status.** Source-copy markers are identified separately from completed translations, so coverage reports more accurately reflect work still to do.
- **More flexible locales.** Regional and legacy language codes such as `pt-BR`, `zh_CN`, and `iw-IL` resolve to their supported language where appropriate. Right-to-left languages are handled more clearly in CLI output.
- **Faster repeat scans.** Unchanged files can be reused during a session, helping larger projects complete repeat checks sooner.
- **LLM-ready guidance.** The package now includes an i18ntk skill for Codex, Claude Code, GitHub Copilot, and compatible agents. Use menu option 15 or `i18ntk --command=skills` to discover and install it.
- **Framework-aware configuration upgrades.** Older project setups are identified during startup and can be updated from the interactive UI with framework-specific source types, safe exclusions, cached scanning, richer reports, and performance defaults. Existing settings are preserved.

### Licensing

- Changed i18ntk 5.0.0 and later from MIT to a dual-license model: PolyForm Noncommercial 1.0.0 for permitted personal/noncommercial use and a separate commercial license for business use. The major version reflects this material licensing change.
- Added `COMMERCIAL-LICENSE.md` defining common commercial-use cases, the licensing request path, and the treatment of prior MIT releases.
- Documented optional custom integration support for commercial customers, with scope, fees, response targets, and deliverables established by separate written agreement.
- This change is prospective: versions already distributed under MIT retain their original license grants.
- Added `i18ntk-license` to help licensed public sites publish an optional verification marker. It does not collect visitor data or send information to i18ntk.

## [4.7.3] - 2026-07-07

### Fixed

- Fixed an installation issue that could prevent some CLI commands from starting.
- Version 4.7.2 had this installation issue; upgrade to 4.7.3 or later.

## [4.7.2] - 2026-07-07

### FIXED

- The CLI language picker now shows the languages available in your installation, using their native names.
- Language selection remains accurate as more interface languages are added.

## [4.7.1] - 2026-07-07

### Added

- The CLI interface is now available in 23 languages, including Arabic, Czech, Greek, Hebrew, Hindi, Italian, Japanese, Korean, Polish, Portuguese, Swedish, Thai, Turkish, Ukrainian, and Vietnamese.
- Language names appear in their native form in the selector.

### Changed

- Project setup and framework detection now recognise a broader range of projects and keep configuration focused on what is actually detected.
- New projects can start with the full set of supported interface languages.

## [4.7.0] - 2026-07-07

### Added

- Added support for more i18n libraries and frameworks, including Nuxt, next-intl, Lingui, FormatJS, ngx-translate, Svelte, Solid, FastAPI, Rails, React Native, and Ionic.
- Project detection now also works for Python, Rust, Go, and Ruby projects.
- Key discovery recognises more translation helpers, components, and namespace patterns.

### Changed

- Framework detection now works even when a project does not use Node.js.

## [4.6.1] - 2026-07-05

### Fixed

- **LANGUAGE_CONFIG missing 22+ languages:** `i18ntk-init.js` and `InitService.js` expanded from 21 to 61 languages with native names. All common ISO 639-1 codes now display proper names instead of "Unknown".
- **Init silently truncating defaultLanguages:** When `defaultLanguages` is an empty array or `null`, init no longer silently falls back to 5 languages.
- **Auto Translate exiting non-zero on success:** Residual untranslated values (placeholders, branded terms) no longer cause non-zero exit codes. Only real failures produce exit 1.
- **supportedExtensions silently overridden:** `i18ntk-init.js` no longer unconditionally overrides `supportedExtensions` from config with the format adapter's single extension.
- **allowedEnglishTerms in two places:** `validation-risk.js` now exports `resolveAllowedEnglishTerms()` which accepts both per-call options and project-level config terms as fallback sources.

## [4.6.0] - 2026-07-04

### Added

- **Framework Detection (10 new frameworks):** Added Rust (fluent, gettext-rs), Remix (remix-i18next), Gatsby (gatsby-plugin-react-i18next), Astro (astro-i18next, @astrojs/i18n), Qwik (qwik-speak, qwik-i18n), SolidJS (@solid-primitives/i18n), Ember (ember-intl), React Native (react-native-localize), Expo (expo-localization), and Ionic (ionic-angular/react/vue) to `utils/framework-detector.js`.
- **FRAMEWORK_COMPATIBILITY:** Extended compatibility metadata with Rust, Fluent, Remix, Gatsby, Astro, Qwik, Ember, React Native, and Ionic version requirements.
- **Rust/Cargo.toml detection:** `FrameworkDetectionService` now detects Rust projects via `Cargo.toml`. Supports `fluent`, `gettext-rs`, and generic Rust framework types.
- **JSX component detection:** Added support for `<Trans>`, `<FormattedMessage>`, `<t>`, and `<Translate>` components when finding translation keys.
- **ICU/Fluent placeholder support:** Added `$variable` (Fluent), `{var, plural, ...}`, `{var, select, ...}`, `{var, number}`, and `{var, date}` ICU MessageFormat patterns to `extractPlaceholders()` with overlap deduplication and token length safety.
- **Framework-specific exclude defaults:** Added `.nuxt`, `.output`, `.astro`, `.svelte-kit`, `.cache`, `__generated__`, and `target` to default exclude lists in all scanners and configs.
- **Framework-specific locale discovery paths:** Added `app/i18n`, `src/lib/i18n`, `content/locales`, `messages`, and `lang` to locale directory candidates.
- **Framework suggestions:** Expanded `getFrameworkSuggestions()` in FrameworkDetectionService with all newly supported frameworks by language.

### Changed

- **File extensions (all packages):** Added `.astro`, `.mdx`, `.mjs`, `.mts`, `.cjs`, `.cts`, `.rs` to `SOURCE_EXTENSIONS` in all scanners and file-walk functions. Astro single-file components, ESM modules, and Rust source files are now scanned for translation keys.
- **Locate discovery excludes:** Added `.nuxt`, `.output`, `.astro`, `.svelte-kit`, `.cache`, `__generated__`, `target` to `DISCOVERY_EXCLUDES`.
- **Config-helper:** Extended `supportedExtensions` to match new file types; excludeDirs now includes all framework-specific directories.
- **Framework detection expansion (FrameworkDetectionService):** JS framework detection expanded from 7 to 15+ frameworks. `checkI18nDependencies()` i18n framework list expanded from 8 to 26 entries covering all new frameworks.
- **Health score:** Penalty is now capped at `(totalKeys - 1) * 2` and uses a linear decay curve (`40%` max) to prevent negative or zero scores on small key sets with many issues.

### Fixed

- **Dot/snake key style validation:** The hybrid regex now correctly validates both dot path and snake_case segments simultaneously, matching the documented behavior.

## [4.5.4] - 2026-06-19

### Fixed

- **Analyze:** Fixed `this.provideSetupGuidance is not a function` when no target locales are available. Analyze now prints setup guidance instead of crashing.
- **Manager Route:** Manager-routed commands now propagate subcommand failures and no longer print `Operation completed successfully!` after a runtime failure.
- **Complete:** Fixed `i18ntk-complete --help` by wiring the shared help renderer and keeping help output side-effect free.
- **Validate:** Removed mixed failure/success output. Validation only prints successful completion when the validation result succeeds.
- **Summary:** Guarded empty locale roots so `Average keys per language` prints `0` instead of `NaN`, and missing locale roots exit as invalid setup/argument failures.
- **Analyze Reports:** Report write failures now fail analyze with a non-zero exit code instead of continuing with success wording.

### Changed

- **CLI Flags:** Added canonical aliases: `--code-dir` / `--source-code-dir` for application source files, `--locales-dir` / `--i18n-dir` for locale files, and `--source-locale` for source language. Legacy `--source-dir`, `--i18n-dir`, and `--source-language` remain supported.
- **Exit Codes:** Standardized automation behavior: `0` for success, `1` for validation/report/runtime failures, and `2` for invalid arguments or missing setup in non-interactive mode.
- **CI Behavior:** Commands skip prompts when `--no-prompt` is passed, `CI=true`, stdin is not a TTY, or stdout is not a TTY.
- **Complete Summary:** Completion output now distinguishes locales scanned, target locales changed, unique source keys added, total key insertions, files modified, files skipped, and dry-run status.

## [4.5.3] - 2026-06-19

### Fixed

- **Usage Scanner (Critical):** Fixed `supportedExtensions` default fallback in `config-helper.js` that excluded `.tsx` and `.jsx` files from source scanning. The default was `['.json', '.js', '.ts']` — missing `.jsx` and `.tsx`. In a Next.js project with 2704 keys across 1087 files, this caused the scanner to find only 57 keys (2.1%) instead of 2702 (99.9%) because all `.tsx` component files were silently ignored. The fix adds `.jsx` and `.tsx` to the default fallback: `['.json', '.js', '.jsx', '.ts', '.tsx']`.
- **Usage Dead Code:** Cleaned up unreachable initializer in `i18ntk-usage.js` that was supposed to set default `includeExtensions` but never ran because `supportedExtensions` was always set by `config-helper.js`. Added `.vue` and `.svelte` to the fallback for completeness.

## [4.5.2] - 2026-06-19

### Fixed

- **Complete (Namespace Wrapper):** Fixed critical bug where missing keys were inserted at the wrong nesting level in target locale files. When a file (e.g., `auth.json`) contains a namespace wrapper matching its filename (`{ "auth": { ... } }`), the `complete` command now detects this wrapper and inserts keys inside it (`auth.panel.sign_in`) instead of at root level (`panel.sign_in`). This prevents runtime lookup failures for `t("auth.panel.sign_in")`.
- **Translate (--output-dir):** Fixed bug where the `--output-dir` flag wrote translated files directly to `<output-dir>/<filename>` instead of `<output-dir>/<targetLang>/<filename>`. This caused all translations (regardless of target language) to land in the same directory, silently overwriting files from other languages in multi-language projects. When `args.outputDir` is provided, `processFile()` now appends `targetLang` to construct the correct output path.

- Added `--output-dir` target language subdirectory tests to `tests/regression-v452.test.js`: verifies `processFile()` places output in `<outputDir>/<targetLang>/<file>` and that CLI `--output-dir` produces the correct nested path
- Added 8 tests in `tests/usage-insights.test.js` for hardcoded text false-positive filtering:
  - JS/TS built-in type name rejection (Promise, Boolean, String)
  - Code expression operator rejection (&&, ||, ===, !==, =>)
  - Template literal interpolation rejection (${...})
  - Real human text still correctly detected (welcome messages, form labels)

## [4.5.1] - 2026-06-19

### Fixed

- **Complete:** Fixed wrong nesting level when adding missing keys to target locale files that have a namespace wrapper matching the file name. Previously, `parseKeyPath("auth.panel.sign_in")` returned `{ file: "auth.json", key: "panel.sign_in" }`, and `setNestedValue` inserted `panel` at the root level instead of inside the existing `auth` wrapper. The fix detects namespace wrappers (e.g., `auth.json` containing `{ "auth": { ... } }`) and prepends the namespace to the insertion path so keys go inside the wrapper.
- **Validate:** `getAllKeys()` no longer reports parent namespace objects (e.g., `footer`) as missing keys alongside their leaf children (`footer.copyright`). Only leaf (string) keys are now compared during structural validation.
- **Validate:** Completion percentage now compares against source locale total keys, not target locale self-count. A locale with 14 of 42 source keys now correctly shows 33% instead of 100%.
- **Doctor:** No longer flags unconfigured locales (`de`, `ru`) as "missing". Now auto-detects available languages from the i18n directory structure, only checking against actually-configured languages.
- **Scanner:** Now detects when `sourceDir` was set to the locale directory (common after setup) and falls back to `./src` for source code scanning instead of scanning locale JSON files.
- **Runtime:** `initRuntime()` now accepts alias parameter names for better developer experience: `localeDir` → `baseDir`, `targetLocale` → `language`, `sourceLocale` → `fallbackLanguage`, `projectRoot` + `localeDir` → `baseDir` resolution.

## [4.5.0] - 2026-06-19

### Security — Prototype Pollution Hardened

- **safe-json.js:** Added `stripPrototypePollution()` function that recursively filters `__proto__`, `constructor`, and `prototype` keys from parsed JSON locale files. Applied to all `readJsonSafe()` calls.
- **runtime/index.js:** `deepMerge()` now blocks `__proto__`, `constructor`, and `prototype` keys during locale data merging. `readJsonSafe()` now applies `stripPrototypeKeys()` to all parsed JSON, ensuring prototype pollution protection at runtime data ingestion point.
- **settings-manager.js:** `mergeWithDefaults()` now filters prototype pollution keys from user-supplied settings before spreading into defaults.
- **safe-json.js:** Exported `stripPrototypePollution` for use by other modules.

### Fixed

- **Backup:** Removed duplicate `const sourceDir` declaration that caused SyntaxError at module load (was unrecoverable crash for all backup operations).
- **Backup:** Added `try/catch` around `JSON.parse()` in restore path to handle corrupt backup files gracefully with a descriptive error message.
- **Complete:** Added missing `getUnifiedConfig` import from `utils/config-helper` (was ReferenceError at runtime).
- **Report:** Replaced 3 direct `fs.writeFileSync` calls with `SecurityUtils.safeWriteFileSync` for path containment on report output.
- **Report Model:** Replaced direct `fs.existsSync` and `fs.readFileSync` with `SecurityUtils` wrappers. Malformed JSON locale files now skipped gracefully with a warning instead of aborting report generation.
- **Runtime:** Lazy-load failures now log to console when `I18NTK_DEBUG` is set (was silently swallowed).
- **Settings Manager:** `_saveImmediately()` now re-throws errors instead of silently logging them, so callers can react to save failures.
- **Config Manager:** Fire-and-forget legacy config migration now has proper `.catch()` error handling instead of an unobserved promise.
- **i18n-helper:** `stripBOMAndComments()` now safely handles null/undefined inputs.

### Changed

- **Version:** Bumped to 4.5.0 (minor version due to scope and severity of security fixes).
- **i18n-helper deepMerge:** Synchronized with runtime `deepMerge` — now uses `Object.keys` (safe) instead of `for...in`, handles null target/fallback, and filters `__proto__`/`constructor`/`prototype` keys for consistent prototype pollution protection across all code paths.
- **Testing:** Added `tests/edge-case-hardening.test.js` with 33 new tests covering prototype pollution protection, SecurityUtils edge cases, backup corrupt handling, report malformed JSON resilience, validation risk detection null-safety, config manager robustness, version consistency, and deepMerge edge cases.
- **Audit Complete:** Comprehensive security audit (24 findings) and error-handling audit (42 findings) completed with critical fixes applied.

## [4.4.5] - 2026-06-08

### Fixed

- Removed orphaned duplicate code block from `main/i18ntk-scanner.js` that caused a SyntaxError when loading the scanner CLI.
- Fixed `utils/safe-json.js` where a duplicate `readJsonSafe` function overwrote the SecurityUtils-based implementation with an insecure version that referenced an undefined `fs` variable.
- Added periodic cache eviction to `missingKeyCache` in `utils/i18n-helper.js` to prevent unbounded memory growth in long-running processes.
- Replaced silent error swallowing in `utils/watch-locales.js` with stderr logging so file-watcher failures are visible.
- Routed `utils/report-model.js` through `SecurityUtils.safeExistsSync` and `SecurityUtils.safeReadFileSync` for consistent path containment and file-size validation.
- **Framework detection:** Removed `async` keyword from `detectFramework()` that caused callers to receive unresolved Promises instead of framework objects, silently losing framework-specific translation patterns.
- **Framework detection:** Fixed `react-i18next` entry using `dependencies` instead of `deps`, which made the most popular React i18n framework completely invisible to dependency-based detection.
- **Framework detection:** Replaced broken `.source` concatenation that produced a String instead of a RegExp for the `useTranslation()` destructuring pattern.
- **Runtime:** `t(null)` and `t(undefined)` now return strings instead of raw null/undefined, preventing crashes in string-based renderers.
- **Runtime:** Added JSON nesting depth limit (max 1000 levels) to `readJsonSafe` to prevent stack overflow DoS from malicious deeply-nested locale files.
- **Runtime:** Fixed path containment boundary in `readJsonSafe` using `path.dirname()` which was too lax; now uses resolved parent directory.
- **Security:** `validateConfig` now runs `isSafePath` validation on absolute paths instead of skipping them entirely (`return` in forEach was bypassing all checks for absolute config paths).

### Added

- **Framework detection:** Added support for ngx-translate (Angular), next-intl (Next.js), nuxt-i18n (Nuxt), svelte-i18n (Svelte), and solid-i18n (Solid) framework detection via dependency lookup.
- `detectFramework()` now also checks the `dependencies` property as a fallback for the `deps` array, ensuring backward compatibility.

### Changed

- Removed dead `{ gte }` import from `version-utils` and unused `FRAMEWORK_COMPATIBILITY` object from `framework-detector.js`.

## [4.4.4] - 2026-06-05

### Fixed

- Likely-untranslated reporting now ignores placeholder-only and symbol/dynamic values such as `{file}`, `{path}`, and icon-prefixed labels instead of treating them as untranslated English.
- Dynamic values with translated surrounding copy and English placeholder tokens, such as `"command": "指示： {command}"`, are no longer flagged as untranslated.

### Changed


## [4.4.3] - 2026-06-04

### Fixed

- `package.public.json` now includes the `./report` export entry (`./utils/report-model.js`) that was missing, fixing the sync check during public package builds.

## [4.4.2] - 2026-06-02

### Fixed

- Auto Translate `processFile()` now accepts source file paths relative to the current project, matching direct CLI behavior and avoiding safe-read failures in programmatic callers.
- Auto Translate now treats protected product terms as allowed English when deciding whether existing target values should be kept in `only-missing` mode.
- Auto Translate detects and retries more visibly broken target values, including replacement-character artifacts, mojibake, repeated question marks, and target-language prefix leftovers.

## [4.4.1] - 2026-06-02

### Security

- **HIGH**: Backup operations (`create`, `restore`, `list`, `verify`) now validate all path arguments via `SecurityUtils.validatePath()`. Previously, `i18ntk-backup` accepted arbitrary `--output` and source directory paths without any validation, enabling writes outside project boundaries.
- **HIGH**: Backup `handleCreate`, `handleRestore` now use `SecurityUtils.safeWriteFileSync`, `safeReadFileSync`, `safeMkdirSync` instead of raw `fs.promises`/`fs` calls.
- **HIGH**: `i18ntk-complete` now validates `--source-dir` CLI override through `SecurityUtils.validatePath()` and sanitizes `--source-language` through `SecurityUtils.sanitizeInput()` instead of accepting raw user input.
- **HIGH**: `config-helper` dual-path resolution (when both `--source-dir` and `--i18n-dir` are explicit) now wraps each resolved path in `SecurityUtils.validatePath()`.
- **MEDIUM**: JSON parsing now enforces maximum depth (1000) and maximum size (50 MB) limits in `safeParseJSON` to prevent denial-of-service via deeply nested or oversized JSON files.
- **MEDIUM**: LibreTranslate custom URL (`LIBRETRANSLATE_URL`) now requires `I18NTK_ALLOW_CUSTOM_LIBRETRANSLATE_HOST=1` env flag to add arbitrary hosts to the allowed list, bringing parity with DeepL's gated approach.
- **MEDIUM**: `sanitizeInput` default character whitelist tightened — removed `\\`, `{`, `}` characters that could enable path traversal or template injection.

### Added

- `SecurityUtils.MAX_JSON_SIZE`, `SecurityUtils.MAX_JSON_DEPTH`, `SecurityUtils.MAX_FILENAME_LENGTH` constants for configurable safety limits.

## [4.4.0] - 2026-06-02

### Added

- Dead-key detection now uses resolved dynamic key data from usage insights instead of crude text-overlap heuristics. Keys expanded from template literals or const arrays are properly tracked and marked with low confidence.
- Locale JSON import detection: `import en from '../../locales/en/foo.json'` is detected and property accesses are tracked as key usages.
- Confidence-split unused key reports: confirmed (≥80%), likely (40-80%), possibly used (<40%).
- `--strict-unused` flag: only reports high-confidence confirmed unused keys.
- `--json` flag: outputs structured JSON report for automation and CI/CD.
- `--prune` / `--prune-keep` flags: removes stale report files, keeping N most recent.
- Mojibake detection: replacement-character artifacts like `Abwicklungspr?fung` and `L?ser` detected during translation analysis.
- Client-boundary warnings: flags `"use client"` files that import locale JSON, which bypasses i18ntk runtime and increases bundle size.
- Copy-formatter detection: identifies local `const tx = ...` functions that do not call known translation runtimes.
- Wrapper configuration: `.i18ntk-config` now supports `usage.translationFunctions`, `usage.serverWrappers`, and `usage.copyFormatters`.
- Next.js App Router detection: identifies `"use server"` / `"use client"` directives and reports component type.
- Auto Translate now writes `i18ntk-reports/auto-translate/latest.json` when residual untranslated values remain after the final targeted retry, so follow-up tooling can retry only unresolved keys.
- Bounded dynamic expansion suggestions in usage report with explicit-map recommendation pattern.
- Telemetry/event literal classification: known-key strings inside `trackEvent()`, `emitDomainEvent()`, `analytics.track()`, etc. are classified as `literal-telemetry` and excluded from translation usage counts. Non-translation calls get context notes in the report.
- Object-method translation calls: `input.tx("key")`, `helper.tx("key")`, and `.tx(\`key.${var}\`)`are now recognized as translation calls alongside standalone`tx()`.
- Local wrapper resolution: functions like `const text = (key, fallback) => tx(key)` that internally call known translation runtimes are detected and their string-literal invocations resolved to keys with `local-wrapper` match type.

### Fixed

- `--source-dir` and `--i18n-dir` no longer forced to the same value when both are explicitly passed via CLI.
- Path display (`displayPaths`) now reflects CLI overrides instead of only config file values.
- Dead-key detection `_matchesDynamicPattern` replaced with `_matchesDynamicPrefix` using actual resolved data.
- Locale JSON import detection properly deduplicates namespace prefix (e.g., `leaderboard.error` not `leaderboard.leaderboard.error`).
- Literal key matching no longer credits telemetry/event call strings (e.g., `trackEvent("leaderboard.view")`) as translation usage, preventing CLI false negatives on genuinely unused keys.

## [4.3.3] - 2026-06-01

### Fixed

- Usage extraction no longer reports ordinary method calls such as `get("next")`, `headers.get("etag")`, `set(...)`, or `setItem(...)` as missing translation keys.
- Usage insights now resolve `tx(...)` wrapper calls and bounded dynamic `tx` template keys, reducing false unused-key reports for local wrappers.
- Key naming validation now supports hybrid dot-path plus snake_case segment keys, such as `namespace.section.snake_case_leaf`, while still rejecting malformed separators and uppercase segments.
- Usage documentation now treats unused-key reports as advisory; do not bulk-delete keys from an unused report without manual verification or a more precise usage scan.

## [4.3.2] - 2026-05-31

### Changed

- Documentation, README badges, and migration guidance now reference the current 4.3.2 release.
- Release metadata now marks 4.3.0 for npm deprecation because its npm tarball is unavailable.

## [4.3.1] - 2026-05-31

### Fixed

- Published tarball now includes `utils/english-placeholder-checker.js`, resolving `MODULE_NOT_FOUND` at startup for `i18ntk-fixer --check-placeholders` and manager option 7.
- Language-specific CLI entry points (`main/i18ntk-go.js`, `main/i18ntk-java.js`, `main/i18ntk-js.js`, `main/i18ntk-php.js`, `main/i18ntk-py.js`) and their shared `utils/mini-commander.js` dependency are now included in the published package.
- Removed inconsistent `.js` extension suffixes from require paths in `main/i18ntk-js.js`.

## [4.3.0] - 2026-05-31

### Fixed

- Auto Translate now treats single-word uppercase target-language placeholders such as `[AR] Email` and `[AR] Password` as untranslated target values, matching the existing multi-word `[AR] What We Offer` detection.
- Auto Translate now treats bracketed target-language placeholders case-insensitively, so `[zh] Email` and `[TR] Password` are both retried for the matching target language.
- Managed Auto Translate now checks every selected source file for a target language before reporting leftover failures, instead of stopping after the first failed file.
- Auto Translate no longer fails a run when a provider legitimately returns a short all-caps acronym or code unchanged, such as `XP`.
- Manager option 7 and `i18ntk-fixer --check-placeholders` now run an English source placeholder audit, reporting any `[LANG] ...` values left in English locale files; a clean project reports `0` placeholders.
- The management command router no longer prints a generic operation-success message when a command returns `{ success: false }`.

## [4.2.1] - 2026-05-31

### Changed

- Auto Translate now treats uppercase target-language placeholders such as `[AR] What We Offer` as untranslated target values when the bracketed code matches the target language, so target-aware mode sends the source text for translation instead of keeping the placeholder copy.
- Auto Translate now performs a final pre-write leftover check and retries values that still look like placeholder-prefixed untranslated text, untranslated markers, source-language copies, or broken output.
- Auto Translate reports leftover values in the post-translation report and exits with validation failure when leftovers remain after the final retry, instead of reporting a clean completion.

### Fixed

- Usage analysis no longer writes its inferred app source fallback, such as `src`, back into the shared locale configuration when `sourceDir` and `i18nDir` are both the locale directory.
- Manager sizing now reads the configured i18n directory unless `--source-dir` is explicitly provided, so running sizing after usage no longer silently analyzes the wrong directory.
- Manager sizing now treats a failed sizing analysis as a command failure instead of printing a generic operation success.
- Validation summary reports now include warning and error details, including content-risk warning payloads, instead of only totals.

## [4.2.0] - 2026-05-30

### Security

- Shared path validation no longer permits artifact-like filenames such as `.lock` or `.temp-config.json` to bypass base-directory containment.
- Shared path validation now rejects Windows cross-drive escape cases where `path.relative()` returns an absolute path.
- Custom `I18NTK_INTERNAL_PATH_PREFIXES` entries can no longer mark arbitrary outside directories as internal roots.
- Backup restore now rejects backup entry names containing path separators, absolute paths, traversal, or non-JSON names before writing restored files.
- Runtime locale loading now validates language identifiers before resolving single-file or directory locale paths, blocking `../` language names from reading JSON outside `baseDir`.
- Auto Translate provider URL validation now blocks IPv4-mapped IPv6 loopback/private hosts.

### Changed

- Main runtime now includes production-safe features from the enhanced runtime surface: per-call language overrides, synchronous `translateBatch()`, and `clearCache()` / `getCacheInfo()` helpers.
- `i18ntk/runtime/enhanced` remains available as a legacy public subpath for compatibility, while new production integrations should prefer the lightweight `i18ntk/runtime` API.
- Usage analysis now indexes known translation keys back to source files, including direct i18n calls and literal key references that were previously missed.
- Usage analysis now expands simple dynamic templates backed by literal constants, bounded literal arrays, object maps, and ternaries to exact available keys before falling back to unresolved dynamic-expression reporting.
- Usage reports now list unresolved dynamic key expressions separately instead of treating broad wildcard prefixes as proof that every matching key is used.
- Usage reports now include namespace/file naming recommendations such as preferring `shop.*` keys and `shop.json` for `/shop` page or route files.
- Usage reports now list likely hardcoded user-facing text with suggested translation keys, and prefer an existing source key when the inline text matches a source translation value.
- Translation analysis and init reports now default to Markdown for readable output, with `reports.format` supporting `markdown`, `json`, or `text` through settings and config.
- Init default target languages now include English (`en`) before `de`, `es`, `fr`, and `ru` when the UI is running in another language.
- Confirmation prompts now accept localized native yes/no input for supported UI languages while retaining English fallback tokens.
- Auto Translate has moved out of beta in menus and documentation, and its settings are exposed with localized labels.
- Auto Translate now keeps existing translated target values by default and only translates missing, marker, source-copy, or likely English target strings; use `--translate-all` to force a full re-translation.
- Auto Translate now treats visibly corrupt target strings such as `?????`, Unicode replacement characters, and common mojibake as needing retranslation from the source language.
- Auto Translate now defaults to 12 concurrent provider requests and allows Google concurrency up to 100 instead of the old 25-request cap; DeepL and LibreTranslate remain capped lower to avoid provider/account throttling.
- Auto Translate progress output now separates string translation from placeholder-safe text-segment translation and shows the active key path during progress updates.
- Placeholder detection now covers ICU plural/select blocks, i18next nested `$t(...)` references, and wider named printf formats such as `%(total).2f`.
- Manager menu output is now grouped with clearer spacing and aligned option numbers.
- Documentation now consolidates migration guidance around `4.2.0` and removes stale old per-version migration guides from the working docs tree.
- Removed stale duplicate development artifacts `main/manage/index-fixed.js` and `utils/security-fixed.js` to reduce audit drift and prevent accidental reuse.
- Updated public, root, and development package metadata for the 4.2.0 release line.

### Fixed

- Runtime JSON loading now preserves valid translation strings containing comment-like text such as `/* token */` by parsing valid JSON before using the comment-stripping fallback.
- Enhanced runtime now exports the top-level `translateBatch()`, `translateBatchEncrypted()`, and `tTyped()` helpers declared by its TypeScript definitions, and those declarations now reflect async return values.
- Usage analysis no longer scans the project root when `sourceDir` and `i18nDir` both point at the locale directory; it now uses a detected app source directory or disables usage scanning with a clear warning.
- Init backup prompts, completion summaries, report prompts, and report status text now use bundled UI locale keys instead of hard-coded English.
- Bundled UI locales were regenerated from `ui-locales/en.json` for newly added, source-copy, and corrupt target strings.
- JSON report output is now pretty-printed object JSON instead of a single JSON string containing escaped newlines.
- The managed Auto Translate command no longer forces UI translations back to English after the user has selected another UI language.
- Manager validation output no longer prints duplicate source/i18n/output directory blocks before the validator summary.
- `i18ntk-setup --help` now exits after printing help instead of running setup and writing project files.
- `npm run languages:list` and `npm run languages:status` now produce non-interactive output instead of opening the settings menu.
- `i18ntk-backup create locales` now recursively backs up modular locale layouts such as `locales/en/common.json`, and restore safely recreates nested JSON paths without allowing traversal.

## [4.1.0] - 2026-05-21

### Fixed

- Runtime: stale manifest entries (deleted files after manifest construction) no longer cause unhandled exceptions; loadedFiles set before load with try/catch guard.
- Runtime: `refresh()` now correctly clears the key manifest for the refreshed language, preventing stale file references.
- Runtime: null `baseDir` guard prevents cascading `validatePath(null)` errors in `loadKeyManifestFromDir`.
- Backup: `handleVerify` hash-chain verification rewritten for incremental backups — rebuilds full state oldest→newest before per-entry hash comparison; no longer reports false "Missing file" errors for unchanged files.
- Backup: `cleanupOldBackups` and `handleCleanup` now preserve parent backups of incremental chains by scanning kept backups for `_meta.parent` references before deletion.
- Backup: `--incremental=false` is now correctly parsed as falsy (string-to-boolean conversion fixed).
- Backup: `buildRestoreChain` detects circular parent references via visited-set traversal.
- Sizing: `this.adminAuth` undefined crash in `run()` fixed — changed to correct `adminAuth` local variable.
- Sizing: duplicate `analyze()` method removed; format-based display logic (`--format=json` vs table) restored to the surviving method.
- Sizing: setup-check IIFE now guarded with `require.main === module`, preventing unexpected `process.exit()` on `require()`.
- Scanner: `frameworks.vanilla` key added to `getFrameworkSpecific` — no longer returns `undefined` for vanilla projects.
- Scanner: `--source-language` CLI flag now correctly propagates through config chain to `scanFile` and `generateSuggestion` (camelCase vs hyphen key mismatch fixed).
- Scanner: `isTextInLanguage` now always validates character ratio unconditionally even for no-stopword language profiles.
- Watch: `{ onChange: fn }` object-format callbacks are now properly subscribed to change/add/unlink events.
- Watch: debounce `setTimeout` timers are now stored per-watcher and cleared on `emitter.stop()`, preventing memory leaks and spurious I/O after stop.
- Watch: `'unlink'` events are now subscribed for backward-compatible plain-function callback users.
- Usage: duplicate `require.main === module` block removed (caused `TypeError: Identifier 'main' has already been declared` at execution).
- Usage: `_keyInSourceComments` optimized from O(n\*m) to O(n+m) by pre-computing a `Set` of all comment strings once before the dead key loop.
- Usage: `--cleanup=false` and `--dry-run-delete=false` now correctly parse as falsy via `toBool()` helper.
- Usage: broken `detectFrameworkPatterns()` call with `undefined` arguments removed.
- Usage: dead `return;` in `analyze()` removed so the result object is now actually returned.
- Validator: missing `try` block in `run()` added so errors are caught by the existing `catch(error)` handler.
- Validator: `--enforce-key-style=true/false` now correctly parsed (previously silently ignored due to `!includes('=')` guard).
- Validator: `flat` style no longer produces false positives for nested keys — validates only the leaf segment (last `.`-delimited part).
- Validator: `suggestKeyFix` for `flat` style now returns `segments.map(s => s.toLowerCase()).join('')` instead of camelCase.
- Validator: `getLanguageFiles` no longer crashes when `excludeFiles` config property is undefined.
- Validator: `enforceKeyStyle` now correctly propagated from CLI args to `this.config.enforceKeyStyle` in `run()`.
- Protection: `standalone` mode boundary check now handles opening/closing punctuation (`(`, `[`, `{`, `"`, `'`, `-`, `–`, `—`) and CJK marks (`。`, `、`, `」`).
- Protection: `\b` word-boundary assertions replaced with Unicode-aware `(^|[\s\p{P}])` / `([\s\p{P}]|$)` patterns with `u` flag for non-ASCII language support.
- Protection: `surrounded` context rule parser now uses `indexOf(',')` split instead of greedy `(.+,.+)` regex to correctly parse multi-word right-side expressions.
- Protection: `hasProtectionRules` no longer throws `TypeError` when `terms` property is undefined.
- Protection: `shouldPreserveWholeValue` now respects context rules by only matching `type === 'global'` entries.
- Manager option 7 ("Fix placeholder translations") now interpolates fixer status values correctly instead of printing raw `{languages}`, `{sourceDir}`, `{skipped}`, or `{totalIssues}` placeholders.
- Delete Reports settings now include cache cleanup targets.
- Public package metadata updated.

### Security

- Watch module: debounce timers properly cleaned up on stop and callback subscriptions corrected for object-format and unlink handlers.
- Runtime: loadedFiles lock-before-load pattern prevents duplicate I/O and stale manifest crash.
- Backup: circular parent reference detection; `--incremental=false` string truthy bypass closed.
- Sizing: adminAuth variable reference corrected; require()-time `process.exit()` guarded.
- Scanner: vanilla framework key prevents `undefined` return; stopword-less validRatio enforced.
- Usage: O(n+m) comment scanning prevents DoS via large codebase with many dead keys; `toBool()` prevents flag injection.
- Validator: try/catch pairing restored; `flat` leaf-segment prevents false-positive flood.
- Protection: Unicode-aware punctuation boundaries for CJK/Cyrillic/Arabic; standalone boundaries include the expanded punctuation set.

## [4.0.0] - 2026-05-21

### Added

- **Sizing Expansion Prediction**: `i18ntk-sizing` now supports `--predict-expansion` flag that computes per-key character-count expansion ratios across languages and classifies them into Safe/Warning/Critical risk tiers for UI layout planning. Includes a built-in language-pair expansion reference table (EN→DE 35%, EN→RU 50%, EN→JA -40%, etc.).
- **Watch Hot Reload**: `utils/watch-locales.js` rewritten as an EventEmitter-compatible watcher with debouncing (300ms default) and SHA-256 hash tracking to skip no-change saves. Returns a callable watcher object with `change`, `add`, `unlink`, `error` events and `stop()`.
- **Usage Dead Key Detection**: `i18ntk-usage` adds `--cleanup` and `--dry-run-delete` flags that identify unused translation keys with confidence scores (0.0–1.0) factoring dynamic access patterns, comment references, and file recency. Produces a `.dead-keys.json` report for safe review before deletion.
- **Validator Key Naming Convention**: `i18ntk-validate` adds `--enforce-key-style` flag and `keyStyle` config setting supporting `dot.notation`, `snake_case`, `camelCase`, `kebab-case`, and `flat` conventions. Reports all violating keys with suggested canonical forms.
- **Scanner Multi-Language Detection**: `i18ntk-scanner` adds `--source-language` flag with character-class profiles for 12+ languages (English, German, French, Spanish, Japanese, Chinese, Russian, Korean, Arabic, Hindi, etc.). Language-specific stopword lists and key generation with transliteration for non-Latin scripts.
- **Backup Incremental Mode**: `i18ntk-backup` adds `--incremental` flag producing differential backups with SHA-256 file hashing, parent-chain metadata, and chained restore (oldest full → incremental diffs in order). `verify` validates the hash chain. Chain depth capped at 10.
- **Runtime Lazy Loading**: `runtime/index.js` adds `lazy: true` option to `initRuntime()`. Defers locale file loading until the first key access, guided by an auto-generated key-to-file manifest. Falls back to eager loading if manifest is missing. Manifest capped at 100KB with path containment validation.
- **Protection Context-Aware Rules**: `utils/translate/protection.js` extends the protection config schema to support context rules (`after:word`, `before:word`, `standalone`, `surrounded:left,right`). Plain string terms remain fully backward compatible. Total context rules capped at 100.

### Fixed

- `i18ntk/runtime` `initRuntime()` now returns independent runtime instances with separate language, fallback language, base directory, and cache state. Later `initRuntime()` calls no longer overwrite earlier returned runtimes or the module-level compatibility singleton.

### Changed

- `watchLocales()` now returns a callable watcher object with EventEmitter methods instead of only a bare `stop` function. Existing `const stop = watchLocales(...); stop();` usage remains supported. The returned object fires `change`, `add`, `unlink`, `error` events. If a callback function is passed as the second argument, it is auto-subscribed to `change` and `add` for backward compatibility.
- **BREAKING**: `i18ntk-sizing` JSON reports now include `expansionPredictions` at the top level when `--predict-expansion` is used. This field is additive — existing report fields are preserved.

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

| Alert                       | Why it's expected                                                                                                                                                                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Network access              | Only contacts configured translation providers via HTTPS when user invokes auto-translate. All outbound calls flow through `safe-network.js` with host/path allowlist validation, response size limits, private-network blocking, and redacted security event logging. No telemetry, no unexpected outbound calls. |
| Environment variable access | Centralized through `env-manager.js` with a strict allowlist. Blocks `SECRET`, `PASSWORD`, `KEY`, `TOKEN`, `AWS_*`, `NPM_*`, and 15+ other patterns.                                                                                                                                                               |
| Filesystem access           | Reads/writes only project locale files and reports within validated paths. All FS operations gated by `SecurityUtils.validatePath`.                                                                                                                                                                                |
| URL strings                 | Hardcoded default provider URLs for Google, DeepL, and LibreTranslate used only for auto-translation. No external resource loading.                                                                                                                                                                                |

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
