# i18ntk v4.5.3

A zero-dependency internationalization toolkit for setup, scanning, analysis, validation, usage tracking, translation completion, automatic JSON locale translation, reporting, and runtime translation loading.

![i18ntk Logo](https://raw.githubusercontent.com/vladnoskv/i18ntk/main/docs/screenshots/i18ntk-logo-public.PNG)

[![npm version](https://img.shields.io/npm/v/i18ntk.svg?color=brightgreen)](https://www.npmjs.com/package/i18ntk)
[![npm downloads](https://img.shields.io/npm/dt/i18ntk.svg)](https://www.npmjs.com/package/i18ntk)
[![node](https://img.shields.io/badge/node-%3E%3D16-339933)](https://nodejs.org)
[![dependencies](https://img.shields.io/badge/dependencies-0-success)](https://www.npmjs.com/package/i18ntk)
[![license](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![socket](https://socket.dev/api/badge/npm/package/i18ntk/4.5.3)](https://socket.dev/npm/package/i18ntk/overview/4.5.3)

[![i18ntk Workbench](https://img.shields.io/badge/VS_Code-i18ntk_Workbench-007ACC?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=VladNoskov.i18ntk-workbench)
[![i18ntk Lens](https://img.shields.io/badge/VS_Code-i18ntk_Lens-007ACC?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=VladNoskov.i18ntk-lens)

## The i18ntk ecosystem

- i18ntk — CLI and runtime toolkit
- i18ntk Workbench — full VS Code dashboard and reports
- i18ntk Lens — inline hovers, CodeLens, and diagnostics

Use the CLI in CI, Workbench for project-level management, and Lens for day-to-day editor feedback.

## Install

```bash
# global CLI use
npm install -g i18ntk

# local project use
npm install --save-dev i18ntk

# one-off execution
npx i18ntk --help
```

## i18ntk Summary

**What it does**

- Manages locale files from the command line.
- Finds missing, unused, risky, and inconsistent translation keys.
- Produces validation and summary reports.
- Supports framework-aware i18n workflows.
- Provides a lightweight runtime translation toolkit.

**What it does not do**

- It is not a translation management SaaS.
- It does not replace human translation review.
- It does not force you to replace i18next, react-i18next, vue-i18n, or another runtime.

**Why not i18next?**

i18next is mainly a runtime internationalization library. i18ntk is mainly workflow tooling around translation files. They can work together: i18next handles runtime translation, while i18ntk handles setup, scanning, validation, reporting, and maintenance.

| Need                      | i18ntk        | i18next          |
| ------------------------- | ------------- | ---------------- |
| Runtime translation       | Basic toolkit | Mature runtime   |
| Locale file scanning      | Yes           | No               |
| Missing key detection     | Yes           | No               |
| Unused key detection      | Yes           | No               |
| Validation reports        | Yes           | Limited          |
| Auto-translation workflow | Yes           | External tooling |

## What's New in 4.5.3

- **TSX/JSX SCANNING**: `supportedExtensions` default now includes `.tsx` and `.jsx`. Previously excluded from source scanning, causing React/Next.js projects to miss 97%+ of translation keys.

## What's New in 4.5.2

- The `complete` command now correctly inserts missing keys at the right nesting level when target locale files have namespace wrappers (e.g., `auth.json` containing `{ "auth": { ... } }`). Keys inside `auth.panel.sign_in` now go inside the `auth` wrapper, not at root level.
- Fixed `complete` command: missing keys now inserted inside namespace wrapper when file has top-level key matching filename (e.g., auth.json with `{ "auth": … }`).
- Fixed `translate --output-dir`: output now placed in `<outputDir>/<targetLang>/<filename>`, preventing language overwrites.
- Enhanced `scanner` and `report-model` to filter out JS built-in type names (e.g., Promise, Boolean) and code expressions (e.g., `&&`, `${…}`) from hardcoded text detection.

## What's New in 4.5.1

- **CORRECT COMPLETENESS**: Validation now shows accurate completion percentages vs source locale (e.g., 33% instead of misleading 100%).
- **NO MORE PARENT KEYS**: `getAllKeys()` no longer reports parent namespace objects (`footer`) as missing keys alongside their leaf children (`footer.copyright`).
- **DOCTOR SMARTER**: No longer flags unconfigured languages (`de`, `ru`) as issues. Auto-detects available languages from the i18n directory structure.
- **SCANNER FIXED**: Scanner now correctly scans `src/` directory for hardcoded text, not `locales/`.
- **RUNTIME ALIASES**: `initRuntime()` now supports `localeDir`/`targetLocale`/`sourceLocale` as aliases for `baseDir`/`language`/`fallbackLanguage`.

## What's New in 4.5.0

- **PROTOTYPE POLLUTION HARDENED**: Three layers of defense added — `readJsonSafe()` now recursively strips `__proto__`, `constructor`, and `prototype` keys from all parsed JSON; `deepMerge()` in the runtime blocks these keys during locale merging; `mergeWithDefaults()` in settings-manager filters them from user settings.
- **BACKUP FIXED**: All backup operations (create, restore, list, verify, cleanup) now work. A duplicate `sourceDir` declaration that caused a SyntaxError at module load has been removed. Corrupt backup files are now handled gracefully with descriptive error messages.
- **COMPLETE COMMAND FIXED**: `i18ntk-complete` no longer crashes with `getUnifiedConfig is not defined`. The missing config-helper import has been added.
- **MALFORMED JSON HANDLING**: Report generation now gracefully skips malformed JSON files with a warning instead of aborting the entire report.
- **NULL SAFETY**: `stripBOMAndComments()` in i18n-helper now handles null/undefined inputs without throwing.
- **ERROR HANDLING HARDENED**: Lazy-load failures in runtime now log to console when `I18NTK_DEBUG` is set. Settings save errors are now re-thrown instead of silently swallowed. Legacy config migration has proper error handling.

See [CHANGELOG.md](./CHANGELOG.md) for more release details.

## Quick Start

Initialize a project:

```bash
i18ntk
# or with explicit command
i18ntk --command=init
```

Run common checks:

```bash
i18ntk --command=analyze
i18ntk --command=validate
i18ntk --command=usage
i18ntk report --json
i18ntk --command=sizing
i18ntk --command=summary
```

Complete or fix translation files:

```bash
i18ntk --command=complete
i18ntk-fixer --help
```

Auto-translate locale JSON:

```bash
i18ntk --command=translate
# or
i18ntk-translate locales/en/common.json de --report-stdout
```

The full onboarding guide is in [docs/getting-started.md](./docs/getting-started.md).

## Main Commands

Primary CLI:

```bash
i18ntk
i18ntk --help
i18ntk --command=init
i18ntk --command=analyze
i18ntk --command=validate
i18ntk --command=usage
i18ntk report --json --markdown --html --out ./i18ntk-reports
i18ntk --command=scanner
i18ntk --command=sizing
i18ntk --command=complete
i18ntk --command=translate
i18ntk --command=summary
```

Standalone executables:

```bash
i18ntk-init
i18ntk-analyze
i18ntk-validate
i18ntk-usage
i18ntk-report
i18ntk-scanner
i18ntk-sizing
i18ntk-complete
i18ntk-summary
i18ntk-doctor
i18ntk-fixer
i18ntk-backup
i18ntk-translate
```

Note: manager route `i18ntk --command=backup` is available via the interactive menu. Use `i18ntk-backup` directly for scripted backup operations.

## Command Reference

| Command                                           | What it does                                                                                                 | Looks for                                                                                                                                                                            | Writes or changes                                                                                                                                                                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `i18ntk`                                          | Opens the interactive management menu.                                                                       | Project config, setup state, available commands.                                                                                                                                     | Only changes files after you choose a command that writes.                                                                                                                                                                                  |
| `i18ntk --command=init` / `i18ntk-init`           | Sets up locale folders and missing target-language files.                                                    | Source language files and selected target languages.                                                                                                                                 | Locale JSON files, `.i18ntk-config`, optional reports/backups.                                                                                                                                                                              |
| `i18ntk --command=analyze` / `i18ntk-analyze`     | Compares source and target translation coverage.                                                             | Missing keys, extra keys, untranslated markers, completion by language.                                                                                                              | Markdown/JSON/text reports when report output is enabled.                                                                                                                                                                                   |
| `i18ntk --command=validate` / `i18ntk-validate`   | Validates structure and translation quality risks.                                                           | Placeholder mismatches, missing keys, risky URLs/emails/secrets, likely English target text.                                                                                         | Validation summary report. Does not edit locale files.                                                                                                                                                                                      |
| `i18ntk --command=usage` / `i18ntk-usage`         | Maps translation keys to source files and finds unused/missing keys.                                         | Direct i18n calls, literal known-key references, bounded dynamic templates/object maps, unresolved dynamic expressions, hardcoded text candidates, namespace/file naming mismatches. | Usage report with key locations, namespace recommendations, unresolved dynamic expressions, hardcoded text suggestions, and optional dead-key report. Does not delete unless cleanup deletion is explicitly enabled.                        |
| `i18ntk report` / `i18ntk-report`                 | Generates the stable schemaVersion 1 report used by CLI automation and i18ntk Workbench.                     | Locale completeness, missing keys, unused keys with confidence, placeholders, likely untranslated values, expansion risk, and hardcoded text candidates.                             | JSON to stdout by default, plus JSON/Markdown/HTML files when `--out` is used. Does not edit locale files.                                                                                                                                  |
| `i18ntk --command=scanner` / `i18ntk-scanner`     | Scans source for i18n issues and hardcoded user-facing text.                                                 | JSX/template text, common text attributes, i18n usage patterns, source-language text profiles.                                                                                       | Scanner report. Does not edit files.                                                                                                                                                                                                        |
| `i18ntk --command=complete` / `i18ntk-complete`   | Adds missing keys to target language files for 100% key coverage.                                            | Source-language keys missing from targets.                                                                                                                                           | Target locale JSON files, using missing translation markers/prefixes.                                                                                                                                                                       |
| `i18ntk --command=translate` / `i18ntk-translate` | Auto-translates locale JSON using configured provider behavior.                                              | Missing, empty, untranslated-marker, source-copy, likely-English, or visibly corrupt target values by default.                                                                       | Target locale JSON files and translation reports. Existing translated values are kept unless `--translate-all` is used. If unresolved values remain after retry, writes `i18ntk-reports/auto-translate/latest.json` for targeted follow-up. |
| `i18ntk --command=sizing` / `i18ntk-sizing`       | Estimates translated string length expansion and layout risk.                                                | Text length, expansion ratios, placeholder-bearing strings.                                                                                                                          | Sizing report. Does not edit locale files.                                                                                                                                                                                                  |
| `i18ntk --command=summary` / `i18ntk-summary`     | Shows project translation status.                                                                            | Configured locales, reports, completeness status.                                                                                                                                    | Console/report output only.                                                                                                                                                                                                                 |
| `i18ntk-fixer`                                    | Fixes placeholder and missing-marker issues, and can audit English source files with `--check-placeholders`. | Placeholder corruption, missing translation markers, configured language files, `[LANG] ...` leftovers in English locales.                                                           | Locale JSON files when fixes are applied. Use dry-run options where available before bulk edits.                                                                                                                                            |
| `i18ntk-backup`                                   | Creates, verifies, restores, and cleans locale backups.                                                      | Locale JSON files and backup manifests.                                                                                                                                              | Backup archives/manifests, or restored locale files when using restore.                                                                                                                                                                     |

## Common Options

Many commands support:

- `--source-dir <path>`
- `--i18n-dir <path>`
- `--output-dir <path>`
- `--source-language <code>`
- `--ui-language <code>`
- `--no-prompt`
- `--help`

Command-specific tools add their own flags such as `--dry-run`, `--output-report`, `--cleanup`, `--predict-expansion`, or Auto Translate provider options.

Example:

```bash
i18ntk --command=analyze --source-dir=./src --i18n-dir=./locales --output-dir=./i18ntk-reports
```

## Auto Translate

Interactive manager flow:

```bash
i18ntk
# choose "Auto Translate"
```

Direct CLI examples:

```bash
i18ntk-translate locales/en/common.json de
i18ntk-translate locales/en/common.json fr --dry-run --report-stdout
i18ntk-translate locales/en es --source-dir locales/en --files "*.json" --no-confirm --preserve-placeholders
```

Provider examples:

```bash
export DEEPL_API_KEY="your-deepl-api-key"
i18ntk-translate locales/en/common.json de --provider deepl --no-confirm --preserve-placeholders

export LIBRETRANSLATE_URL="https://libretranslate.com/translate"
export LIBRETRANSLATE_API_KEY="optional-api-key"
i18ntk-translate locales/en/common.json es --provider libretranslate --no-confirm --preserve-placeholders
```

`google` remains the default provider. You can also set `I18NTK_TRANSLATE_PROVIDER=deepl` or `I18NTK_TRANSLATE_PROVIDER=libretranslate`.

Provider requests are HTTPS-only and response-size limited, and security logs redact provider query strings and response bodies. DeepL is pinned to official DeepL hosts by default; set `I18NTK_ALLOW_CUSTOM_TRANSLATE_HOSTS=1` only for a trusted DeepL-compatible proxy. Custom LibreTranslate URLs are blocked for localhost/private IP ranges unless `I18NTK_ALLOW_PRIVATE_TRANSLATE_URLS=1` is set for trusted local testing. Keep provider API keys in environment variables or a secret manager.

The manager flow asks for:

- source locale directory, either the folder with JSON files or a locale root such as `./locales`
- source language code
- one or more target languages, or `all`
- one JSON file or all JSON files in the source directory

If you select a locale root such as `./locales` and choose source language `en`, the manager automatically uses `./locales/en` when that folder contains the source JSON files.

Before writing files, the manager can run a dry-run preview. After confirmation it writes translated files under sibling target-language folders, for example:

```text
locales/en/common.json
locales/de/common.json
locales/fr/common.json
```

Auto Translate is target-aware by default. When a target file already exists, it keeps translated target values and only sends values that are missing, empty, marked as untranslated, still identical to the source, likely still English, or visibly corrupt from encoding damage such as `?????`, replacement characters, or common mojibake. Use `--translate-all` when you intentionally want to re-translate every source string.

### Placeholder Handling

Auto Translate detects common placeholders such as:

- `{name}`
- `{{count}}`
- `%s`
- `%d`
- `:id`
- `%{name}`
- `${value}`
- `{count, plural, one {# item} other {# items}}`
- `$t(common.save)`
- `%(total).2f`

Useful flags:

- `--preserve-placeholders`: translate text around placeholders and reinsert original tokens
- `--skip-placeholders`: copy placeholder-bearing strings unchanged
- `--send-placeholders`: send placeholder-bearing strings through translation after masking
- `--custom-regex <regex>`: add project-specific placeholder detection
- `--only-missing`: keep existing translated target values and translate only missing/source-copy/likely English values (default)
- `--translate-all`: re-translate every source string

Progress output is stage-aware for large files. Normal keys are reported as `Translating strings`, while preserve-mode placeholder work is reported as `Translating placeholder-safe text segments`; each progress update includes the current key path when available.

### Protected Terms and Keys

Auto Translate can create and use a project-local protection file:

```bash
i18ntk-translate locales/en/common.json de --create-protection-file --protection-file ./i18ntk-auto-translate.json
```

Example `i18ntk-auto-translate.json`:

```json
{
  "version": 1,
  "terms": [
    "BrandName",
    "PRODUCT_CODE",
    { "value": "OK", "context": "after:Click|Press|Tap" },
    { "value": "API", "context": "standalone" }
  ],
  "keys": ["app.brandName", "legal.companyName", "product.*.symbol"],
  "values": ["BrandName Ltd", "support@example.com"],
  "patterns": ["[A-Z]{2,}-\\d+"]
}
```

- `terms` are masked before translation and restored exactly afterward.
  - **Plain strings**: masked everywhere (backward compatible).
  - **Context objects**: masked only in specific contexts (`after:word`, `before:word`, `standalone`, `surrounded:left,right`).
- `keys` are exact key paths or `*` wildcard paths copied unchanged.
- `values` are exact source values copied unchanged.
- `patterns` are JavaScript regex strings for advanced protected substrings.

Useful flags:

- `--protection-file <path>`
- `--create-protection-file`
- `--no-protection`

Open Settings and choose `Auto Translate` to edit defaults for placeholder mode, translate-only-needed mode, concurrency, batch size, retry settings, report output, BOM output, protection file path, first-run setup prompt, and update prompt.

See [docs/auto-translate.md](./docs/auto-translate.md) for the full Auto Translate guide.

## Validation

Validation checks locale structure, completeness, placeholders, and content risks.

Validation warning types are specific:

- `Potential risky content`: URL, email address, or secret-like value
- `Possible untranslated English content`: target-language value appears to contain too much English

English-content warnings include:

- detected English percentage
- configured threshold
- matched word count
- sample matched words

Tune warnings in `.i18ntk-config`:

```json
{
  "englishContentThresholdPercent": 10,
  "allowedEnglishTerms": ["BrandName", "PRODUCT_CODE"]
}
```

## Sizing Analysis

`i18ntk-sizing` reports translation file sizes, key counts, average value length, and file-set mismatches across language folders.

```bash
i18ntk-sizing --source-dir ./locales --format table
i18ntk-sizing --source-dir ./locales --detailed --output-dir ./i18ntk-reports
```

Use `--detailed` to print per-file rows in the terminal.

### Expansion Prediction (New in 4.0.0)

Predict UI layout overflow risk by analyzing per-key character-count expansion across languages:

```bash
i18ntk-sizing --source-dir ./locales --predict-expansion --output-report
```

Expansion ratios are classified into risk tiers:

- **Safe** (<30% expansion): no UI impact expected
- **Warning** (30–50%): may overflow in tight layouts — test on target languages
- **Critical** (>50%): high risk of truncation — review UI element sizing

The report includes a built-in language-pair expansion reference table (EN→DE +35%, EN→RU +50%, EN→JA −40%, etc.) and lists the top-30 most-expanded keys.

## Scanner: Multi-Language Detection (New in 4.0.0)

`i18ntk-scanner` now supports detecting hardcoded text in multiple source languages beyond English:

```bash
i18ntk-scanner --source-dir ./src --source-language de
i18ntk-scanner --source-dir ./src --source-language ja --output-report
```

Supported language profiles (12+): English, German, French, Spanish, Japanese, Chinese, Russian, Korean, Arabic, Hindi, and more. Each profile includes language-specific character ranges, stopword lists for false-positive filtering, and transliteration rules for key generation.

## Usage: Dead Key Detection (New in 4.0.0)

`i18ntk-usage` can identify translation keys that are defined but never referenced in source code:

```bash
i18ntk-usage --source-dir ./src --i18n-dir ./locales --cleanup
i18ntk-usage --source-dir ./src --i18n-dir ./locales --cleanup --dry-run-delete
```

Each dead key receives a confidence score (0.0–1.0) factoring:

- Unresolved dynamic key patterns (e.g., ``t(`prefix.${dynamic}`)``) — lower score and listed in the usage report; simple consts, bounded arrays, object maps, and ternaries are expanded to exact keys where possible
- Key appears in source code comments or JSDoc — medium score
- Parent file recently modified (<30 days) — medium score
- No references found anywhere — high score (>0.8)

The `--dry-run-delete` flag writes a `.dead-keys.json` report for review before any destructive action.

## Validator: Key Naming Conventions (New in 4.0.0)

Enforce consistent translation key naming across your project:

```bash
i18ntk-validate --enforce-key-style
```

Configure the expected style in `.i18ntk-config`:

```json
{
  "keyStyle": "dot.notation"
}
```

Supported styles: `dot.notation`, `snake_case`, `camelCase`, `kebab-case`, `flat`. Violations are reported as warnings with suggested canonical forms.

## Watch: Hot Reload (New in 4.0.0)

`utils/watch-locales.js` now provides debounced file watching with EventEmitter support:

```js
const watchLocales = require('i18ntk/utils/watch-locales');
const watcher = watchLocales('./locales');

watcher.on('change', (filePath) => {
  console.log('Locale changed:', filePath);
});

watcher.on('add', (filePath) => {
  console.log('Locale added:', filePath);
});

// Later:
watcher.stop();
```

Features: 300ms debounce (configurable), SHA-256 hash tracking to skip no-change saves, and a maximum of 50 watched directories.

### Migration

The `watchLocales` return value gained EventEmitter methods in v4.0.0. Existing stop-function usage still works:

```js
const stop = watchLocales('./locales', onChange);
```

Can be updated to:

```js
const watcher = watchLocales('./locales');
watcher.on('change', onChange);
watcher.stop();
```

Passing a callback as the second argument is still supported — it auto-subscribes to `change` and `add` events.

## Backup: Incremental Mode (New in 4.0.0)

Create differential backups that only include changed files:

```bash
i18ntk-backup create ./locales --incremental
```

Incremental backups store SHA-256 hashes per file and a parent-chain reference. Restoring an incremental backup automatically chains from the oldest full backup through each incremental diff in order. Chain depth is capped at 10 increments. Use `verify` to validate the hash chain.

## Runtime: Lazy Loading (New in 4.0.0)

Reduce memory usage by deferring locale file loads until first key access:

```js
const runtime = require('i18ntk/runtime');

const i18n = runtime.initRuntime({
  baseDir: './locales',
  language: 'en',
  lazy: true,
});

console.log(i18n.t('common.hello')); // loads common.json on first access
```

When `lazy: true`, the runtime builds a key-to-file manifest on first access and loads individual files on demand. Files are loaded once and cached. If the manifest is missing or incomplete, the runtime falls back to full eager loading for that language. Manifest size is capped at 100KB with path containment validation.

Production guidance:

- Prefer the object returned from `initRuntime()` instead of module-level `runtime.t()` in apps with multiple tenants, projects, or locale roots.
- Use `lazy: true` for large modular locale folders where lower steady-state memory matters more than a small first-key lookup cost.
- Use `preload: true` without `lazy` for small locale sets or latency-sensitive startup paths.
- Call `refresh(language)` after deploying or writing changed locale files so cached data and lazy manifests are rebuilt.
- Use per-call language overrides when rendering one-off alternate-language strings: `i18n.t('common.hello', {}, { language: 'de' })`.
- Use `translateBatch()` for small groups of labels and `clearCache()` / `getCacheInfo()` for cache maintenance and diagnostics.
- `i18ntk/runtime/enhanced` remains available for compatibility with existing async/encryption users, but new production integrations should start with `i18ntk/runtime`.

## Runtime API

Use `i18ntk/runtime` when an application needs to read locale JSON files at runtime.

```js
const runtime = require('i18ntk/runtime');

const i18n = runtime.initRuntime({
  baseDir: './locales',
  language: 'en',
  fallbackLanguage: 'en',
  keySeparator: '.',
  preload: true,
});

console.log(i18n.t('common.hello'));
i18n.setLanguage('fr');
console.log(i18n.getLanguage());
console.log(i18n.getAvailableLanguages());
i18n.refresh('fr');
```

Useful production helpers:

```js
i18n.t('common.hello', {}, { language: 'de' }); // per-call language override
i18n.translateBatch(['menu.home', 'menu.settings']);
i18n.clearCache('fr');
console.log(i18n.getCacheInfo());
```

See [docs/runtime.md](./docs/runtime.md) for runtime details.

## Configuration

i18ntk uses a project-local `.i18ntk-config` file.

Example:

```json
{
  "version": "4.5.3",
  "sourceDir": "./locales",
  "i18nDir": "./locales",
  "outputDir": "./i18ntk-reports",
  "sourceLanguage": "en",
  "defaultLanguages": ["en", "de", "es", "fr", "ru"],
  "reports": {
    "format": "markdown"
  },
  "englishContentThresholdPercent": 10,
  "allowedEnglishTerms": ["BrandName", "PRODUCT_CODE"],
  "autoTranslate": {
    "placeholderMode": "preserve",
    "concurrency": 12,
    "batchSize": 100,
    "progressInterval": 25,
    "retryCount": 3,
    "retryDelay": 1000,
    "timeout": 15000,
    "dryRunFirst": true,
    "onlyMissingOrEnglish": true,
    "reportStdout": true,
    "bom": false,
    "protectionEnabled": true,
    "protectionFile": "./i18ntk-auto-translate.json",
    "promptProtectionSetup": true,
    "promptProtectionUpdate": true
  },
  "setup": {
    "completed": true
  },
  "extensions": {
    "workbench": {
      "localeDirectory": "./locales",
      "sourceLocale": "en"
    },
    "lens": {
      "localeDirectory": "./locales",
      "sourceLocale": "en",
      "keyFormats": ["dot", "snake"]
    }
  }
}
```

See [docs/api/CONFIGURATION.md](./docs/api/CONFIGURATION.md) for the full configuration model.

## Public Package Contents

The public package intentionally ships runtime and CLI files only.

The package includes:

- CLI entry points under `main/`
- manager commands and services
- runtime API files under `runtime/`
- settings UI files required at runtime
- bundled internal UI locales
- shared utilities required by the shipped commands
- `README.md`, `CHANGELOG.md`, `LICENSE`, and policy files

The public package manifest includes `readmeFilename: "README.md"`, and the release staging script fails if `README.md` is missing or empty.

## Documentation

- [Documentation Index](./docs/README.md)
- [Getting Started](./docs/getting-started.md)
- [API Reference](./docs/api/API_REFERENCE.md)
- [Configuration Guide](./docs/api/CONFIGURATION.md)
- [Runtime API Guide](./docs/runtime.md)
- [Auto Translate Guide](./docs/auto-translate.md)
- [Scanner Guide](./docs/scanner-guide.md)
- [Environment Variables](./docs/environment-variables.md)
- [Migration Guide v4.3.3](./docs/migration-guide-v4.3.3.md)

## Security

- No API key is required for the default Auto Translate flow.
- Do not store secrets in locale files, `.i18ntk-config`, or protection files.
- Project-specific brand/product terms should be configured by the user, not hardcoded into the package.
- Report security issues using [SECURITY.md](./SECURITY.md).

## Community

- [Contributing](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Funding](./FUNDING.md)

## Related Tools

| Tool                 | Purpose                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| **i18ntk**           | Zero-dependency i18n toolkit for scanning, validation, translation, reports, and runtime loading. |
| **i18ntk Workbench** | Full VS Code localization health dashboard powered by i18ntk.                                     |
| **i18ntk Lens**      | Lightweight inline translation hovers, diagnostics, and key navigation.                           |
| **PublishGuard**     | Pre-publish safety scanner for npm packages and VS Code extensions.                               |
| **ContextKit**       | AI coding context manager for AGENTS.md, Claude, Cursor, Copilot, Roo, and Codex files.           |

## License

MIT. See [LICENSE](./LICENSE).
