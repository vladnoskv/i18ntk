# i18ntk Configuration Guide (v3.1.0)

## Overview

i18ntk v3 uses a project-local config file named `.i18ntk-config`.

- Location: project root
- Format: JSON
- Recommended: commit this file for shared team defaults

## Main Config File

Example:

```json
{
  "version": "3.1.0",
  "language": "en",
  "uiLanguage": "en",
  "projectRoot": ".",
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
  "framework": {
    "detected": false,
    "preference": "auto"
  },
  "setup": {
    "completed": true
  }
}
```

## Key Fields

- `sourceDir`: locale source path for scans/analysis
- `i18nDir`: locale path used by scripts that separate source vs i18n input
- `outputDir`: report output directory
- `sourceLanguage`: base language for key completeness checks
- `defaultLanguages`: target languages used by init/completion flows
- `uiLanguage`: CLI message language
- `setup.completed`: setup marker used by startup checks
- `backup.enabled`: enable or disable backup creation
- `backup.location`: separate backup root directory
- `backup.maxBackups`: how many backups to keep before auto-cleanup
- `englishContentThresholdPercent`: percent of detected English words allowed in target-language values before validation warns. Default: `10`.
- `allowedEnglishTerms`: additional brand, acronym, product, or domain terms to ignore during English-content validation.
- `autoTranslate.placeholderMode`: how placeholder-bearing strings are handled by Auto Translate. Use `preserve`, `skip`, or `send`.
- `autoTranslate.concurrency`: maximum concurrent translation requests.
- `autoTranslate.batchSize`: number of text segments scheduled per translation batch.
- `autoTranslate.progressInterval`: completed segment count between progress updates.
- `autoTranslate.protectionEnabled`: enable or disable user-owned protection rules for Auto Translate.
- `autoTranslate.protectionFile`: project JSON file containing protected terms, key paths, exact values, and patterns.
- `autoTranslate.promptProtectionSetup`: ask to create the protection file on the first manager run.
- `autoTranslate.promptProtectionUpdate`: ask whether to update protection rules before manager translations.

## Validation Warning Tuning

Validation checks URLs, email addresses, secret-like values, and likely untranslated English content.

For non-English target languages, English-content warnings only trigger when the detected English percentage is above the configured threshold and at least three English words are found. Brand names, acronyms, placeholders, URLs, emails, and allowed terms are excluded from the percentage calculation.

Example:

```json
{
  "englishContentThresholdPercent": 15,
  "allowedEnglishTerms": ["BrandName", "PRODUCT_CODE"]
}
```

## Auto Translate Tuning

Auto Translate reads defaults from `autoTranslate` when launched from the management menu. Direct `i18ntk-translate` flags still override command behavior for that run.

Recommended defaults:

```json
{
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
  }
}
```

Use `preserve` for most projects. It translates text outside placeholders and reinserts tokens exactly. Use `skip` for strict manual-review workflows, and use `send` only when a custom translation provider is known to preserve masked tokens reliably.

Protection file example:

```json
{
  "version": 1,
  "terms": ["BrandName", "PRODUCT_CODE", "API"],
  "keys": ["app.brandName", "legal.companyName", "product.*.symbol"],
  "values": ["BrandName Ltd", "support@example.com"],
  "patterns": ["[A-Z]{2,}-\\d+"]
}
```

`terms` are masked before translation and restored afterward. `keys` and `values` are copied unchanged from the source JSON. `patterns` are optional JavaScript regex strings for advanced protected substrings.

## Path and Value Resolution

Value precedence (highest to lowest):

1. CLI flags
2. Environment variables (allowlist only)
3. `.i18ntk-config`
4. Built-in defaults

Common flags:

- `--source-dir`
- `--i18n-dir`
- `--output-dir`
- `--source-language`
- `--ui-language`
- `--no-prompt`

## Command Examples

```bash
# Initialize with defaults from .i18ntk-config
i18ntk --command=init

# Override directories for one run
i18ntk --command=analyze --source-dir=./locales --output-dir=./i18ntk-reports

# Non-interactive validation
i18ntk --command=validate --no-prompt
```

Standalone binaries also read `.i18ntk-config`:

```bash
i18ntk-init --no-prompt
i18ntk-analyze --source-dir=./locales
i18ntk-validate --source-language=en
```

## Legacy Config Compatibility

v3 keeps compatibility with older config locations during migration, but `.i18ntk-config` is the source of truth for current projects.

## Setup Behavior

When `setup.completed` is `true`, i18ntk treats the project as initialized and does not prompt for setup again.

Backup settings are optional:

- backups are disabled by default
- backup location is stored separately from locale source files
- backup retention is bounded so it does not recurse into backup output

## Runtime Setup Example

```js
const runtime = require('i18ntk/runtime');

runtime.initRuntime({
  baseDir: './locales',
  language: 'en',
  fallbackLanguage: 'en'
});
```

## Security Notes

- Do not store secrets in `.i18ntk-config`.
- i18ntk does not require API keys for core workflows or the default Auto Translate flow.
- Keep config scoped to project paths, not user-home global paths.
