# i18ntk API Reference (v3.2.0)

## Primary CLI

```bash
i18ntk
i18ntk --help
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
i18ntk --command=debug
```

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

Most commands support:

- `--source-dir <path>`
- `--i18n-dir <path>`
- `--output-dir <path>`
- `--source-language <code>`
- `--ui-language <code>`
- `--no-prompt`
- `--dry-run`
- `--help`

## Validation

`i18ntk --command=validate` and `i18ntk-validate` check locale structure, completeness, placeholders, and content risks.

Validation content warnings are specific in v3.1.2:

- `Potential risky content`: URL, email, or secret-like value detected.
- `Possible untranslated English content`: target-language string contains more than the configured English-content threshold.

English-content warning details include the detected percentage, threshold, matched word count, and sample matched words. The default threshold is `10%`.

## Scanner-Specific Options

`i18ntk-scanner` (or `i18ntk --command=scanner`) supports additional options:

- `--patterns <regex-list>`
- `--exclude <pattern-list>`
- `--output-report`
- `--min-length <n>`
- `--max-length <n>`
- `--include-tests`

## Auto Translate

`i18ntk --command=translate` opens the interactive manager flow for Auto Translate.

`i18ntk-translate` supports direct translation:

```bash
i18ntk-translate <source-file> <target-lang> [options]
i18ntk-translate locales/en/common.json de
i18ntk-translate locales/en/common.json fr --dry-run --report-stdout
i18ntk-translate locales/en es --source-dir locales/en --files "*.json" --no-confirm --preserve-placeholders
```

Translate-specific options:

- `--source-dir <dir>`
- `--output-dir <dir>`
- `--source-lang <code>`
- `--files <pattern>`
- `--custom-regex <regex>`
- `--no-confirm`
- `--preserve-placeholders`
- `--skip-placeholders`
- `--send-placeholders`
- `--protection-file <path>`
- `--create-protection-file`
- `--no-protection`
- `--batch-size <n>`
- `--progress-interval <n>`
- `--concurrency <n>`
- `--dry-run`
- `--report-file <path>`
- `--report-stdout`
- `--bom`
- `--translate-fn <module>`
- `--retry-count <n>`
- `--retry-delay <ms>`
- `--timeout <ms>`

## Sizing Command

```bash
i18ntk-sizing --source-dir ./locales --format table
i18ntk-sizing --source-dir ./locales --detailed --output-dir ./i18ntk-reports
```

In v3.1.2, sizing table output includes aligned columns for language, file count, size, keys, average length, and total characters. The generated JSON/text reports also include:

- file counts for each language folder
- missing/extra file comparison across language folders
- per-file key counts, character counts, average length, and size

Use `--detailed` to print the per-file table in the CLI output.

## Backup Command

Backup operations are available via the standalone executable.
Manager route `i18ntk --command=backup` is disabled in current builds.

```bash
i18ntk-backup --help
i18ntk-backup create ./locales
i18ntk-backup list
i18ntk-backup restore <backup-file>
i18ntk-backup verify <backup-file>
i18ntk-backup cleanup --keep 10
```

## Runtime API

See [Runtime API Guide](../runtime.md).

## Configuration

See [Configuration Guide](./CONFIGURATION.md).
