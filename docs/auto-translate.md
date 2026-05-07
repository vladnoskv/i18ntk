# Auto Translate Guide (v3.1.1)

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

- source directory, defaulting to the configured source/i18n directory; absolute paths and project-relative paths such as `./locales/en` are accepted
- source language code, defaulting to `en`
- one or more target language codes, separated by commas or spaces, or `all` to use every configured target language
- one file or all JSON files in the source directory

Before writing files, the manager runs a dry-run preview for the first target language.
After confirmation, it translates each requested target language and writes matching files under sibling target-language directories. By default, placeholder-bearing strings are translated in preserve mode: only the text around placeholders is sent for translation, then the original placeholders are reinserted.

On first use, the manager can create `i18ntk-auto-translate.json` in the project root. This file is user-owned and stores brand names, product terms, exact values, key paths, and regex patterns that Auto Translate should not translate. On later manager runs, i18ntk can ask whether you want to update the file before translating; choose `don't ask again` to disable that prompt, then re-enable it from Settings when needed.

Example source and output:

```text
locales/en/common.json
locales/de/common.json
locales/fr/common.json
locales/ru/common.json
```

The `all` target-language option uses configured target languages from `.i18ntk-config` and any sibling language folders found next to the selected source directory. The selected source language is excluded automatically.

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
i18ntk-translate locales/en es --source-dir locales/en --files "*.json" --no-confirm --preserve-placeholders
```

Create or use a protection file:

```bash
i18ntk-translate locales/en/common.json de --create-protection-file --protection-file ./i18ntk-auto-translate.json
i18ntk-translate locales/en/common.json de --no-confirm --protection-file ./i18ntk-auto-translate.json
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

The manager flow calls the translator in-process and uses `preserve` placeholder mode by default. Direct CLI users can choose:

- `--preserve-placeholders` to translate only normal text segments and reinsert placeholders exactly
- `--skip-placeholders` to copy strings with placeholders unchanged
- `--send-placeholders` to send placeholder-bearing strings through translation after masking
- interactive mode to decide per key

Use `--custom-regex <regex>` when a project uses additional placeholder syntax.

## Protected Terms, Keys, and Values

Auto Translate can protect user-defined content before it is sent to the translation provider.

Default file:

```text
./i18ntk-auto-translate.json
```

Example:

```json
{
  "version": 1,
  "terms": ["BrandName", "PRODUCT_CODE", "API"],
  "keys": ["app.brandName", "legal.companyName", "product.*.symbol"],
  "values": ["BrandName Ltd", "support@example.com"],
  "patterns": ["[A-Z]{2,}-\\d+"]
}
```

- `terms`: masked inside any string, translated around, then restored exactly.
- `keys`: exact key paths or `*` wildcards copied unchanged from the source file.
- `values`: exact source values copied unchanged.
- `patterns`: JavaScript regex patterns for advanced protected substrings.

Use `--no-protection` to disable protection for one direct CLI run.

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
- `--preserve-placeholders`: translate text around placeholders and reinsert original tokens
- `--skip-placeholders`: skip placeholder-bearing strings
- `--send-placeholders`: translate placeholder-bearing strings with masking
- `--protection-file <path>`: JSON file for protected terms, keys, values, and patterns
- `--create-protection-file`: create the protection JSON file if it does not exist
- `--no-protection`: disable protection handling for one run
- `--concurrency <n>`: max concurrent API requests, default `3`
- `--batch-size <n>`: text segments scheduled per batch, default `50`
- `--progress-interval <n>`: completed segments between progress updates, default `10`
- `--retry-count <n>`: max retries per request, default `3`
- `--retry-delay <ms>`: base retry delay, default `1000`
- `--timeout <ms>`: HTTP request timeout, default `15000`
- `--bom`: write output with UTF-8 BOM
- `--translate-fn <module>`: use a custom translation function module

## Notes

- Source JSON structure, nested objects, arrays, null values, and non-string values are preserved.
- The generated target files are intended for immediate review and use.
- Placeholder-bearing strings skipped by policy still need manual translation.
- Auto Translate mirrors placeholder maps to a short-lived manifest in the OS temp directory during processing and removes it after the file completes. Runtime restoration still uses the in-memory map first, with preserve-mode segmentation as the fallback.

## Settings

Open Settings and choose `Auto Translate Beta` to tune:

- placeholder mode: `preserve`, `skip`, or `send`
- request concurrency and text-segment batch size
- progress interval, retry count, retry delay, and request timeout
- dry-run preview, terminal report output, and UTF-8 BOM output
- protection file path, first-run setup prompt, update prompt, and protection enable/disable
