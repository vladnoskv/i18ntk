# i18ntk v3.2.0

Zero-dependency internationalization toolkit for setup, scanning, analysis, validation, usage tracking, translation completion, automatic JSON locale translation, reporting, and runtime translation loading.

![i18ntk Logo](https://raw.githubusercontent.com/vladnoskv/i18ntk/main/docs/screenshots/i18ntk-logo-public.PNG)

[![npm version](https://img.shields.io/npm/v/i18ntk.svg?color=brightgreen)](https://www.npmjs.com/package/i18ntk)
[![npm downloads](https://img.shields.io/npm/dt/i18ntk.svg)](https://www.npmjs.com/package/i18ntk)
[![node](https://img.shields.io/badge/node-%3E%3D16-339933)](https://nodejs.org)
[![dependencies](https://img.shields.io/badge/dependencies-0-success)](https://www.npmjs.com/package/i18ntk)
[![license](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![socket](https://socket.dev/api/badge/npm/package/i18ntk/3.2.0)](https://socket.dev/npm/package/i18ntk/overview/3.2.0)

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

## What's New in 3.2.0

- **SECURITY**: Fixed 4 critical runtime-crash bugs (invalid crypto APIs, missing imports) across admin-pin.js, security-config.js, and scripts/security-check.js.
- **SECURITY**: Removed encryption key stored alongside ciphertext in admin-pin.js; encryption key is now derived via HKDF.
- **SECURITY**: Enforced HTTPS-only for Google Translate API requests; fixed http.get timeout for Node.js <16.14 compatibility.
- **SECURITY**: Added path validation to backup restore/verify operations; locked down FileManagementService PIN verification stubs.

See [CHANGELOG.md](./CHANGELOG.md) and [docs/migration-guide-v3.2.0.md](./docs/migration-guide-v3.2.0.md) for release details.

## Quick Start

Initialize a project:

```bash
i18ntk
# or
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

Note: manager route `i18ntk --command=backup` is disabled in current builds. Use `i18ntk-backup` directly for backup operations.

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
  "terms": ["BrandName", "PRODUCT_CODE", "API"],
  "keys": ["app.brandName", "legal.companyName", "product.*.symbol"],
  "values": ["BrandName Ltd", "support@example.com"],
  "patterns": ["[A-Z]{2,}-\\d+"]
}
```

- `terms` are masked before translation and restored exactly afterward.
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

## Runtime API

Use `i18ntk/runtime` when an application needs to read locale JSON files at runtime.

```js
const runtime = require('i18ntk/runtime');

runtime.initRuntime({
  baseDir: './locales',
  language: 'en',
  fallbackLanguage: 'en',
  keySeparator: '.',
  preload: true
});

console.log(runtime.t('common.hello'));
runtime.setLanguage('fr');
console.log(runtime.getLanguage());
console.log(runtime.getAvailableLanguages());
runtime.refresh('fr');
```

See [docs/runtime.md](./docs/runtime.md) for runtime details.

## Configuration

i18ntk uses a project-local `.i18ntk-config` file.

Example:

```json
{
  "version": "3.2.0",
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
- [Migration Guide v2.6.0](./docs/migration-guide-v2.6.0.md)
- [Migration Guide v2.5.1](./docs/migration-guide-v2.5.1.md)

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
