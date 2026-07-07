# i18ntk API Reference (v4.5.4)

## Primary CLI

```bash
i18ntk
i18ntk --help
i18ntk --version
```

Direct command execution:

```bash
i18ntk --command=init
i18ntk --command=analyze
i18ntk --command=validate
i18ntk --command=usage
i18ntk --command=scanner
i18ntk --command=sizing
i18ntk --command=complete
i18ntk --command=translate
i18ntk --command=summary
```

`i18ntk --command=backup` is not a supported manager route. Use `i18ntk-backup`.

## Standalone Executables

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

## Common Options

Many commands support:

- `--code-dir <path>` or `--source-code-dir <path>` for application source files
- `--locales-dir <path>` or `--i18n-dir <path>` for locale files
- `--source-dir <path>` legacy alias; source code for scanner-style commands, locale root for locale-only commands
- `--output-dir <path>`
- `--source-locale <code>`
- `--source-language <code>` legacy alias for `--source-locale`
- `--ui-language <code>` for the CLI UI locale. Supported UI locale codes match the package language registry used by the interactive language selector.
- `--no-prompt`
- `--help`

Exit codes are standardized for automation: `0` means successful execution, `1` means validation/report/runtime failure, and `2` means invalid arguments or missing required setup in non-interactive mode. Commands do not prompt when `--no-prompt` is passed, `CI=true`, stdin is not a TTY, or stdout is not a TTY.

Command-specific tools add their own flags, such as `--dry-run`, `--output-report`, `--cleanup`, `--predict-expansion`, or Auto Translate provider options.

## Fix Placeholder

`i18ntk --command=fix` and `i18ntk-fixer` repair missing keys, empty values, and untranslated markers from the source language.

Use the English placeholder checker when the source files may still contain copied target placeholders:

```bash
i18ntk-fixer --check-placeholders
```

The checker scans English source locale files for bracketed language-code prefixes such as `[AR] Email` or `[SV] Real-Money Markets`, reports the count, and fails when the count is not `0`.

## Validation

`i18ntk --command=validate` and `i18ntk-validate` check locale structure, completeness, placeholders, key naming when enabled, and content risks.

Content warning types:

- `Potential risky content`: URL, email, or secret-like value detected.
- `Possible untranslated English content`: target-language string contains more than the configured English-content threshold.

English-content warning details include detected percentage, threshold, matched word count, and sample matched words. The default threshold is `10%`.

## Scanner

`i18ntk-scanner` and `i18ntk --command=scanner` support:

- `--code-dir <dir>` or `--source-code-dir <dir>`
- `--source-dir <dir>` legacy alias for source code directory
- `--source-locale <code>`
- `--source-language <code>` legacy alias for source locale
- `--patterns <regex-list>`
- `--exclude <pattern-list>`
- `--output-report`
- `--min-length <n>`
- `--max-length <n>`
- `--include-tests`

## Auto Translate

`i18ntk --command=translate` opens the interactive manager flow for Auto Translate.

Direct translation:

```bash
i18ntk-translate <source-file> <target-lang> [options]
i18ntk-translate locales/en/common.json de
i18ntk-translate locales/en/common.json fr --dry-run --report-stdout
i18ntk-translate locales/en es --source-dir locales/en --files "*.json" --no-confirm --preserve-placeholders
```

Translate-specific options:

- `--source-dir <dir>`
- `--output-dir <dir>`
- `--provider <google|deepl|libretranslate>`
- `--source-lang <code>`
- `--files <pattern>`
- `--custom-regex <regex>`
- `--no-confirm`
- `--preserve-placeholders`
- `--skip-placeholders`
- `--send-placeholders`
- `--only-missing`
- `--only-missing-or-english`
- `--translate-all`
- `--force-translate`
- `--protection-file <path>`
- `--create-protection-file`
- `--no-protection`
- `--batch-size <n>`
- `--progress-interval <n>`
- `--concurrency <n>`: concurrent provider requests, default `12`; Google accepts up to `100`
- `--dry-run`
- `--report-file <path>`
- `--report-stdout`
- `--bom`
- `--translate-fn <module>`
- `--retry-count <n>`
- `--retry-delay <ms>`
- `--timeout <ms>`

By default, existing translated target values are kept and only missing, marker, source-copy, likely-English, or visibly corrupt values are translated. Corrupt-value detection covers common broken output such as `?????`, Unicode replacement characters, and mojibake. Use `--translate-all` or `--force-translate` for a full re-translation.

If the final leftover check still finds untranslated values after its targeted retry, Auto Translate exits with validation failure and writes `i18ntk-reports/auto-translate/latest.json`. That report lists unresolved keys so automation, i18ntk Workbench, or i18ntk Lens can retry or review only the remaining values instead of restarting a full translation.

## Sizing

```bash
i18ntk-sizing --locales-dir ./locales --format table
i18ntk-sizing --locales-dir ./locales --detailed --output-dir ./i18ntk-reports
i18ntk-sizing --locales-dir ./locales --predict-expansion --output-report
```

Sizing reports translation file sizes, key counts, average value length, file-set mismatches, and optional expansion prediction risk tiers.

## Usage

```bash
i18ntk-usage --code-dir ./src --locales-dir ./locales
i18ntk-usage --code-dir ./src --locales-dir ./locales --cleanup --dry-run-delete
```

When `sourceDir` equals `i18nDir` and no application source directory can be inferred, current releases avoid scanning the whole project root to prevent inflated missing-key counts.

## Backup

```bash
i18ntk-backup --help
i18ntk-backup create ./locales
i18ntk-backup create ./locales --incremental
i18ntk-backup list
i18ntk-backup restore <backup-file>
i18ntk-backup verify <backup-file>
i18ntk-backup cleanup --keep 10
```

Backup restore validates entries before writing and supports modular locale layouts such as `locales/en/common.json`.

## Runtime API

See [Runtime API Guide](../runtime.md).

## Configuration

See [Configuration Guide](./CONFIGURATION.md).
