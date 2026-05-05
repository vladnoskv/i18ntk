# Auto Translate Guide (v3.0.0)

Auto Translate converts source JSON locale files into target-language JSON files.
It is available from the management menu and as the standalone `i18ntk-translate` CLI.

## Manager Menu Flow

Start the management menu:

```bash
i18ntk
```

Choose:

```text
14. Auto Translate (Beta)
```

The interactive flow asks for:

- source directory, defaulting to the configured source/i18n directory
- source language code, defaulting to `en`
- one or more target language codes, separated by commas or spaces
- one file or all JSON files in the source directory

Before writing files, the manager runs a dry-run preview for the first target language.
After confirmation, it translates each requested target language and writes matching files under sibling target-language directories.

Example source and output:

```text
locales/en/common.json
locales/de/common.json
locales/fr/common.json
locales/ru/common.json
```

## Standalone CLI

Translate one file:

```bash
i18ntk-translate locales/en/common.json de
```

Preview without API calls:

```bash
i18ntk-translate locales/en/common.json fr --dry-run --report-stdout
```

Translate all JSON files in a source directory:

```bash
i18ntk-translate locales/en es --source-dir locales/en --files "*.json" --no-confirm --skip-placeholders
```

## Placeholder Handling

Auto Translate detects common dynamic placeholder formats, including:

- `{name}`
- `{{count}}`
- `%s`
- `%d`
- `:id`
- `%{name}`
- `${value}`

The manager flow runs the standalone translator with `--skip-placeholders`, which copies placeholder-bearing strings unchanged and reports them for manual review. Direct CLI users can choose:

- `--skip-placeholders` to copy strings with placeholders unchanged
- `--send-placeholders` to send placeholder-bearing strings through translation after masking
- interactive mode to decide per key

Use `--custom-regex <regex>` when a project uses additional placeholder syntax.

## Reports

Use reports to review what was translated or skipped:

```bash
i18ntk-translate locales/en/common.json de --report-stdout
i18ntk-translate locales/en/common.json de --report-file ./i18ntk-reports/translate-de.txt
```

Dry-run reports show planned work without writing translated output.

## Useful Options

- `--source-dir <dir>`: source directory containing JSON locale files
- `--output-dir <dir>`: output directory for translated files
- `--source-lang <code>`: source language code, default `en`
- `--files <pattern>`: file pattern for batch translation, default `*.json`
- `--dry-run`: preview without API calls or writes
- `--no-confirm`: skip interactive prompts
- `--skip-placeholders`: skip placeholder-bearing strings
- `--send-placeholders`: translate placeholder-bearing strings with masking
- `--concurrency <n>`: max concurrent API requests, default `3`
- `--retry-count <n>`: max retries per request, default `3`
- `--retry-delay <ms>`: base retry delay, default `1000`
- `--timeout <ms>`: HTTP request timeout, default `15000`
- `--bom`: write output with UTF-8 BOM
- `--translate-fn <module>`: use a custom translation function module

## Notes

- Source JSON structure, nested objects, arrays, null values, and non-string values are preserved.
- The generated target files are intended for immediate review and use for non-placeholder text.
- Placeholder-bearing strings skipped by policy still need manual translation.
