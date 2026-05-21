# i18ntk v4.0.0

A i18n toolkit - A zero-dependency internationalization toolkit for setup, scanning, analysis, validation, usage tracking, translation completion, automatic JSON locale translation, reporting, and runtime translation loading.

![i18ntk Logo](https://raw.githubusercontent.com/vladnoskv/i18ntk/main/docs/screenshots/i18ntk-logo-public.PNG)

[![npm version](https://img.shields.io/npm/v/i18ntk.svg?color=brightgreen)](https://www.npmjs.com/package/i18ntk)
[![npm downloads](https://img.shields.io/npm/dt/i18ntk.svg)](https://www.npmjs.com/package/i18ntk)
[![node](https://img.shields.io/badge/node-%3E%3D16-339933)](https://nodejs.org)
[![dependencies](https://img.shields.io/badge/dependencies-0-success)](https://www.npmjs.com/package/i18ntk)
[![license](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![socket](https://socket.dev/api/badge/npm/package/i18ntk/4.0.0)](https://socket.dev/npm/package/i18ntk/overview/4.0.0)

## Install

```bash
# global CLI use
npm install -g i18ntk

# local project use
npm install --save-dev i18ntk

# one-off execution
npx i18ntk --help
```

Requirements:

- Node.js `>=16.0.0`
- npm `>=8.0.0`
- No runtime dependencies

## What's New in 4.0.0

- **SIZING**: `--predict-expansion` flag computes per-key expansion ratios across languages with Safe/Warning/Critical risk tiers for UI layout planning.
- **WATCH**: `watchLocales()` now returns an EventEmitter-compatible watcher with debounced `change`/`add`/`unlink`/`error` events and SHA-256 hash tracking.
- **USAGE**: `--cleanup` and `--dry-run-delete` flags identify dead translation keys with confidence scores.
- **VALIDATOR**: `--enforce-key-style` enforces dot.notation, snake_case, camelCase, kebab-case, or flat naming conventions.
- **SCANNER**: `--source-language` supports multi-language hardcoded text detection with 12+ language profiles.
- **BACKUP**: `--incremental` flag creates differential backups with SHA-256 hashing and chained restores.
- **RUNTIME**: `lazy: true` option defers locale file loading until first key access for lower memory usage.
- **PROTECTION**: Context-aware rules (`after:word`, `before:word`, `standalone`, `surrounded:left,right`) for precise term masking.
- **FIX**: `initRuntime()` now returns independent instances with isolated language and cache state.

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
i18ntk --command=scanner
i18ntk --command=sizing
i18ntk --command=complete
i18ntk --command=translate
i18ntk --command=summary
i18ntk --command=debug
```

Standalone executables:

```bash
i18ntk-init
i18ntk-analyze
i18ntk-validate
i18ntk-usage
i18ntk-scanner
i18ntk-sizing
i18ntk-complete
i18ntk-summary
i18ntk-doctor
i18ntk-fixer
i18ntk-backup
i18ntk-translate
```
`n
Note: manager route `i18ntk --command=backup` is disabled in current builds. Use `i18ntk-backup` (or legacy `i18ntk-backup`) directly for backup operations.

## Common Options

Most commands support:

- `--source-dir <path>`
- `--i18n-dir <path>`
- `--output-dir <path>`
- `--source-language <code>`
- `--ui-language <code>`
- `--no-prompt`
- `--dry-run`
- `--help`

Example:

```bash
i18ntk --command=analyze --source-dir=./src --i18n-dir=./locales --output-dir=./i18ntk-reports
```

## Auto Translate

Interactive manager flow:

```bash
i18ntk
# choose "Auto Translate (Beta)"
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

### Placeholder Handling

Auto Translate detects common placeholders such as:

- `{name}`
- `{{count}}`
- `%s`
- `%d`
- `:id`
- `%{name}`
- `${value}`

Useful flags:

- `--preserve-placeholders`: translate text around placeholders and reinsert original tokens
- `--skip-placeholders`: copy placeholder-bearing strings unchanged
- `--send-placeholders`: send placeholder-bearing strings through translation after masking
- `--custom-regex <regex>`: add project-specific placeholder detection

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

Open Settings and choose `Auto Translate Beta` to edit defaults for placeholder mode, concurrency, batch size, retry settings, report output, BOM output, protection file path, first-run setup prompt, and update prompt.

See [docs/auto-translate.md](./docs/auto-translate.md) for the full Auto Translate guide.

## Validation

Validation checks locale structure, completeness, placeholders, and content risks.

In 3.1.2, warning types are more specific:

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
- Dynamic key patterns (e.g., `` t(`prefix.${dynamic}`) ``) — lower score
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
  lazy: true
});

console.log(i18n.t('common.hello')); // loads common.json on first access
```

When `lazy: true`, the runtime builds a key-to-file manifest on first access and loads individual files on demand. Files are loaded once and cached. If the manifest is missing or incomplete, the runtime falls back to full eager loading for that language. Manifest size is capped at 100KB with path containment validation.

## Runtime API

Use `i18ntk/runtime` when an application needs to read locale JSON files at runtime.

```js
const runtime = require('i18ntk/runtime');

const i18n = runtime.initRuntime({
  baseDir: './locales',
  language: 'en',
  fallbackLanguage: 'en',
  keySeparator: '.',
  preload: true
});

console.log(i18n.t('common.hello'));
i18n.setLanguage('fr');
console.log(i18n.getLanguage());
console.log(i18n.getAvailableLanguages());
i18n.refresh('fr');
```

See [docs/runtime.md](./docs/runtime.md) for runtime details.

## Configuration

i18ntk uses a project-local `.i18ntk-config` file.

Example:

```json
{
  "version": "4.0.0",
  "sourceDir": "./locales",
  "i18nDir": "./locales",
  "outputDir": "./i18ntk-reports",
  "sourceLanguage": "en",
  "defaultLanguages": ["de", "es", "fr", "ru"],
  "englishContentThresholdPercent": 10,
  "allowedEnglishTerms": ["BrandName", "PRODUCT_CODE"],
  "autoTranslate": {
    "placeholderMode": "preserve",
    "concurrency": 6,
    "batchSize": 100,
    "progressInterval": 25,
    "retryCount": 3,
    "retryDelay": 1000,
    "timeout": 15000,
    "dryRunFirst": true,
    "reportStdout": true,
    "bom": false,
    "protectionEnabled": true,
    "protectionFile": "./i18ntk-auto-translate.json",
    "promptProtectionSetup": true,
    "promptProtectionUpdate": true
  },
  "setup": {
    "completed": true
  }
}
```

See [docs/api/CONFIGURATION.md](./docs/api/CONFIGURATION.md) for the full configuration model.

## Public Package Contents

The public package intentionally ships runtime and CLI files only. The publish staging script excludes development-only content such as tests, scripts, docs, release staging folders, local config files, and generated protection files.

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
- [Migration Guide v3.2.0](./docs/migration-guide-v3.2.0.md)
- [Migration Guide v3.1.1](./docs/migration-guide-v3.1.1.md)
- [Migration Guide v3.0.0](./docs/migration-guide-v3.0.0.md)

## Security

- No API key is required for the default Auto Translate flow.
- Do not store secrets in locale files, `.i18ntk-config`, or protection files.
- Project-specific brand/product terms should be configured by the user, not hardcoded into the package.
- Report security issues using [SECURITY.md](./SECURITY.md).

## Community

- [Contributing](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Funding](./FUNDING.md)

## License

MIT. See [LICENSE](./LICENSE).
