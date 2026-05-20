# i18ntoolkit (formerly i18ntk) v3.3.0

Zero-dependency internationalization toolkit for setup, scanning, analysis, validation, usage tracking, translation completion, automatic JSON locale translation, reporting, and runtime translation loading.

![i18ntk Logo](https://raw.githubusercontent.com/vladnoskv/i18ntk/main/docs/screenshots/i18ntk-logo-public.PNG)

[![npm version](https://img.shields.io/npm/v/i18ntoolkit.svg?color=brightgreen)](https://www.npmjs.com/package/i18ntoolkit)
[![npm downloads](https://img.shields.io/npm/dt/i18ntk.svg)](https://www.npmjs.com/package/i18ntk)
[![node](https://img.shields.io/badge/node-%3E%3D16-339933)](https://nodejs.org)
[![dependencies](https://img.shields.io/badge/dependencies-0-success)](https://www.npmjs.com/package/i18ntoolkit)
[![license](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![socket](https://socket.dev/api/badge/npm/package/i18ntoolkit/3.3.0)](https://socket.dev/npm/package/i18ntoolkit/overview/3.3.0)

## Install

```bash
# global CLI use (new name)
npm install -g i18ntoolkit

# global CLI use (legacy name, still supported)
npm install -g i18ntk

# local project use
npm install --save-dev i18ntoolkit

# one-off execution
npx i18ntoolkit --help
# legacy command also works
npx i18ntk --help
```

Requirements:

- Node.js `>=16.0.0`
- npm `>=8.0.0`
- No runtime dependencies

## What's New in 3.3.0

- **PACKAGE RENAME**: `i18ntk` → `i18ntoolkit` in the attempt to resolve a Socket.dev typosquat alert. All legacy commands retained as aliases.
- **SECURITY**: Eliminated all 21 dynamic `require()` calls flagged by Socket.dev — 20 converted to static string literals, 1 gated with `SecurityUtils.validatePath`.
- **COMPATIBILITY**: Both `i18ntoolkit` and `i18ntk` CLI commands work interchangeably. Install as `npm install i18ntoolkit`.
- **DOCS**: SECURITY.md updated with Socket.dev analysis disclaimer explaining expected alerts for a CLI/i18n toolkit.

See [CHANGELOG.md](./CHANGELOG.md) for more release details.

## Quick Start

Initialize a project:

```bash
# new command name
i18ntoolkit
# legacy command name (still works)
i18ntk
# or with explicit command
i18ntoolkit --command=init
```

Run common checks:

```bash
i18ntoolkit --command=analyze
i18ntoolkit --command=validate
i18ntoolkit --command=usage
i18ntoolkit --command=sizing
i18ntoolkit --command=summary
```

Complete or fix translation files:

```bash
i18ntoolkit --command=complete
i18ntoolkit-fixer --help
# legacy commands also work:
# i18ntk --command=complete
# i18ntk-fixer --help
```

Auto-translate locale JSON:

```bash
i18ntoolkit --command=translate
# or
i18ntoolkit-translate locales/en/common.json de --report-stdout
# legacy commands also work:
# i18ntk --command=translate
# i18ntk-translate locales/en/common.json de --report-stdout
```

The full onboarding guide is in [docs/getting-started.md](./docs/getting-started.md).

## Main Commands

Primary CLI:

```bash
i18ntoolkit
i18ntoolkit --help
i18ntoolkit --command=init
i18ntoolkit --command=analyze
i18ntoolkit --command=validate
i18ntoolkit --command=usage
i18ntoolkit --command=scanner
i18ntoolkit --command=sizing
i18ntoolkit --command=complete
i18ntoolkit --command=translate
i18ntoolkit --command=summary
i18ntoolkit --command=debug
```

Standalone executables:

```bash
i18ntoolkit-init
i18ntoolkit-analyze
i18ntoolkit-validate
i18ntoolkit-usage
i18ntoolkit-scanner
i18ntoolkit-sizing
i18ntoolkit-complete
i18ntoolkit-summary
i18ntoolkit-doctor
i18ntoolkit-fixer
i18ntoolkit-backup
i18ntoolkit-translate
```

Legacy names (`i18ntk`, `i18ntk-init`, `i18ntk-analyze`, etc.) remain available as aliases for backward compatibility.

Note: manager route `i18ntoolkit --command=backup` is disabled in current builds. Use `i18ntoolkit-backup` (or legacy `i18ntk-backup`) directly for backup operations.

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
i18ntoolkit --command=analyze --source-dir=./src --i18n-dir=./locales --output-dir=./i18ntk-reports
```

## Auto Translate

Interactive manager flow:

```bash
i18ntoolkit
# choose "Auto Translate (Beta)"
```

Direct CLI examples:

```bash
i18ntoolkit-translate locales/en/common.json de
i18ntoolkit-translate locales/en/common.json fr --dry-run --report-stdout
i18ntoolkit-translate locales/en es --source-dir locales/en --files "*.json" --no-confirm --preserve-placeholders
```

Provider examples:

```bash
export DEEPL_API_KEY="your-deepl-api-key"
i18ntoolkit-translate locales/en/common.json de --provider deepl --no-confirm --preserve-placeholders

export LIBRETRANSLATE_URL="https://libretranslate.com/translate"
export LIBRETRANSLATE_API_KEY="optional-api-key"
i18ntoolkit-translate locales/en/common.json es --provider libretranslate --no-confirm --preserve-placeholders
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
i18ntoolkit-translate locales/en/common.json de --create-protection-file --protection-file ./i18ntk-auto-translate.json
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

`i18ntoolkit-sizing` reports translation file sizes, key counts, average value length, and file-set mismatches across language folders.

```bash
i18ntoolkit-sizing --source-dir ./locales --format table
i18ntoolkit-sizing --source-dir ./locales --detailed --output-dir ./i18ntk-reports
```

Use `--detailed` to print per-file rows in the terminal.

## Runtime API

Use `i18ntoolkit/runtime` when an application needs to read locale JSON files at runtime (the legacy `i18ntk/runtime` require path also works).

```js
const runtime = require('i18ntoolkit/runtime');

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

i18ntoolkit uses a project-local `.i18ntk-config` file (shared with the legacy `i18ntk` package).

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
