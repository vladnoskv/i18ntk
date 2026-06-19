# i18ntk Configuration Guide (v4.5.4)

## Overview

i18ntk uses a project-local config file named `.i18ntk-config`.

- Location: project root
- Format: JSON
- Recommended: commit non-secret project defaults

## Main Config File

Example:

```json
{
  "version": "4.5.4",
  "language": "en",
  "uiLanguage": "en",
  "projectRoot": ".",
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
  "backup": {
    "enabled": false,
    "maxBackups": 1,
    "location": "./i18ntk-backups"
  },
  "framework": {
    "detected": false,
    "preference": "auto"
  },
  "setup": {
    "completed": true
  },
  "extensions": {
    "workbench": {
      "localeDirectory": "./locales",
      "sourceLocale": "en",
      "maxScanFiles": 2000
    },
    "lens": {
      "localeDirectory": "./locales",
      "sourceLocale": "en",
      "keyFormats": ["dot", "snake"]
    }
  }
}
```

## Key Fields

- `sourceDir`: source path for project/app scanning.
- `i18nDir`: locale directory used by translation analysis, validation, completion, and usage comparison.
- `outputDir`: report output directory.
- `sourceLanguage`: base language for completeness checks and Auto Translate source values.
- `defaultLanguages`: target languages used by init, completion, and manager Auto Translate.
- `uiLanguage`: CLI message language.
- `reports.format`: report output format for init and analysis reports. Supported values are `markdown`, `json`, and `text`; default is `markdown`.
- `setup.completed`: setup marker used by startup checks.
- `backup.enabled`: enable or disable backup creation. Setup defaults this to `false`.
- `backup.location`: separate backup root directory.
- `backup.maxBackups`: how many backups to keep before cleanup.
- `englishContentThresholdPercent`: percent of detected English words allowed in target-language values before validation warns. Default: `10`.
- `allowedEnglishTerms`: brand, acronym, product, or domain terms to ignore during English-content validation.
- `autoTranslate.placeholderMode`: placeholder handling mode. Use `preserve`, `skip`, or `send`.
- `autoTranslate.onlyMissingOrEnglish`: keep existing translated target values and translate only missing, marker, source-copy, likely-English, or visibly corrupt values.
- `autoTranslate.concurrency`: maximum concurrent translation requests. Google can be set up to `100`; DeepL and LibreTranslate are capped lower because provider/account limits vary.
- `autoTranslate.batchSize`: number of text segments scheduled per translation batch.
- `autoTranslate.progressInterval`: completed string or placeholder-segment count between progress updates.
- `autoTranslate.protectionEnabled`: enable user-owned protection rules for Auto Translate.
- `autoTranslate.protectionFile`: project JSON file containing protected terms, key paths, exact values, and patterns.
- `autoTranslate.promptProtectionSetup`: ask to create the protection file on first manager run.
- `autoTranslate.promptProtectionUpdate`: ask whether to update protection rules before manager translations.
- `extensions`: optional extension-owned settings. The CLI preserves this object and ignores unknown nested keys.

## Shared Extension Config

i18ntk Workbench and i18ntk Lens can read and write project defaults from `.i18ntk-config`:

- `extensions.workbench`: Workbench-owned settings such as locale directory, source locale, report format, diagnostics, scan scheduling, and Auto Translate defaults.
- `extensions.lens`: Lens-owned settings such as locale directory, source locale, scan scheduling, custom wrappers, and key formats.

The CLI treats these as extension data. It validates the top-level `extensions` property as allowed config, preserves it when config is read back, and does not use nested extension-only keys for CLI commands.

Shared defaults:

- If an extension-specific value is missing, extensions can fall back to top-level `i18nDir`, `sourceDir`, `sourceLanguage`, and `excludeDirs`.
- Explicit VS Code workspace/user settings still override values from `.i18ntk-config`.
- Do not store secrets or provider credentials in `extensions.*`; use environment variables for credentials.
- Unknown nested extension keys are reserved for editor tooling and should not affect CLI scans, validation, or Auto Translate.

## Value Precedence

Configuration order, highest to lowest:

1. CLI flags
2. Supported environment variables
3. `.i18ntk-config`
4. Built-in defaults

Common flags:

- `--code-dir` / `--source-code-dir`
- `--locales-dir` / `--i18n-dir`
- `--source-dir` (legacy alias)
- `--output-dir`
- `--source-locale`
- `--source-language` (legacy alias)
- `--ui-language`
- `--no-prompt`

For source-scanning commands such as `usage`, `report`, and `scanner`, `--source-dir` remains a legacy alias for the application source directory. For locale-only commands such as `validate`, `summary`, `complete`, and `sizing`, prefer `--locales-dir` to make the locale root explicit.

## Command Examples

```bash
i18ntk --command=init
i18ntk --command=analyze --code-dir=./src --locales-dir=./locales --source-locale=en --output-dir=./i18ntk-reports
i18ntk --command=validate --no-prompt
i18ntk --command=translate
```

Standalone binaries also read `.i18ntk-config`:

```bash
i18ntk-init --no-prompt
i18ntk-analyze --code-dir=./src --locales-dir=./locales
i18ntk-validate --locales-dir=./locales --source-locale=en
i18ntk-translate locales/en/common.json de --no-confirm
```

Backup operations use the standalone CLI:

```bash
i18ntk-backup create ./locales
i18ntk-backup list
i18ntk-backup verify <backup-file>
i18ntk-backup restore <backup-file>
i18ntk-backup cleanup --keep 10
```

The manager route `i18ntk --command=backup` is disabled in current builds.

## Reports

Init and analysis reports use `reports.format`.

- `markdown`: readable `.md` reports, default
- `json`: pretty-printed JSON
- `text`: plain text

Validation and some specialized tools may still write their own report formats, such as validation summary `.txt` files or sizing reports.

## Validation Warning Tuning

Validation checks URLs, email addresses, secret-like values, and likely untranslated English content.

For non-English target languages, English-content warnings only trigger when the detected English percentage is above the configured threshold and at least three English words are found. Brand names, acronyms, placeholders, URLs, emails, and allowed terms are excluded from the percentage calculation.

Dynamic placeholders inside translated values are ignored for English-content scoring. For example, values such as `"指示： {command}"` or `"📄 {file} -> {path}"` should not be reported as untranslated only because placeholder tokens use English names.

Example:

```json
{
  "englishContentThresholdPercent": 15,
  "allowedEnglishTerms": ["BrandName", "PRODUCT_CODE"]
}
```

## Auto Translate Tuning

Auto Translate reads defaults from `autoTranslate` when launched from the management menu. Direct `i18ntk-translate` flags override command behavior for that run.

## CLI Edge Cases To Review

The CLI intentionally ignores extension-only settings, but the following areas should be reviewed when extending the main package:

- Config synchronization: keep top-level `i18nDir`, `sourceDir`, `sourceLanguage`, and `excludeDirs` compatible with `extensions.workbench` and `extensions.lens` fallbacks.
- Report scoring: dynamic placeholder names, icon-only labels, file-path templates, and command examples should not be treated as untranslated copy unless the surrounding human text is also untranslated.
- Unknown extension keys: nested keys under `extensions.*` should remain editor-owned and must not change CLI behavior without an explicit CLI feature.
- Bulk ignore workflows: ignored diagnostics should remain scoped enough to avoid hiding unrelated missing or untranslated keys.
- Auto Translate protection: intentionally unchanged brands, acronyms, commands, and placeholder-heavy values should be added to protection rules instead of broad global allow-lists.

Recommended defaults:

```json
{
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
  }
}
```

Use `preserve` for most projects. It translates text outside placeholders and reinserts tokens exactly. Use `skip` for strict manual-review workflows, and use `send` only when a custom translation provider is known to preserve masked tokens reliably.

## Legacy Config Compatibility

i18ntk can read older config locations during migration, but `.i18ntk-config` is the source of truth for current projects.

## Security Notes

- Do not store secrets in `.i18ntk-config`.
- i18ntk does not require API keys for core workflows or the default Auto Translate flow.
- Provider API keys should be supplied through environment variables or a secret manager.
- Keep config scoped to project paths, not user-home global paths.
