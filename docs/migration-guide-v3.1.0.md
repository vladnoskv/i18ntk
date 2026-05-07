# Migration Guide: i18ntk v3.1.0

## What's New in v3.1.0

v3.1.0 hardens Auto Translate, makes placeholder-bearing strings usable by default, and reduces noisy validation warnings for branded or domain-specific copy.
It also improves sizing analysis output for projects that keep multiple JSON files in each language folder.

## Upgrade

```bash
npm install -g i18ntk@3.1.0
npm install --save-dev i18ntk@3.1.0
```

## Auto Translate Changes

- Placeholder strings now default to `preserve` mode in automated and manager flows.
- `preserve` mode translates only text outside placeholders, then reinserts tokens such as `{asset}`, `{{count}}`, `%s`, and `${value}` exactly.
- The manager target-language prompt now accepts `all` to select every configured target language while excluding the source language.
- The manager source-directory prompt now shows the default path, current project root, accepted path formats, and examples.
- The manager can create a user-editable `i18ntk-auto-translate.json` protection file on first Auto Translate run.
- Protected terms are masked before translation and restored afterward; protected keys and exact values are copied unchanged.
- The manager can ask before later runs whether to update protection rules. Settings can disable and re-enable both prompts.
- `--preserve-placeholders` is available for direct CLI use.
- `--protection-file`, `--create-protection-file`, and `--no-protection` are available for direct CLI use.
- `--batch-size` and `--progress-interval` tune large-file processing and terminal progress output.
- The management menu calls Auto Translate in-process, removing production `child_process` usage from `main/manage/commands/TranslateCommand.js`.

## Validation Warning Changes

- The old generic `Risky content` warning has been replaced with specific warning messages.
- `Potential risky content` is used for URLs, email addresses, and secret-like values.
- `Possible untranslated English content` is used for target-language strings that appear to contain too much English.
- Project-specific brand and product terms should be configured with `allowedEnglishTerms`; v3.1.0 no longer relies on package-level product keywords.
- English-content warnings include `englishPercentage`, `englishThresholdPercent`, `englishWordCount`, and sample matched words.
- The default English-content threshold is `10%`, and at least three English words must be detected before a warning is emitted.

## Sizing Analysis Changes

- `i18ntk-sizing` now renders measured CLI tables instead of fixed-space localized row strings.
- Folder summaries include a `Files` column for the number of JSON files in each language folder.
- File-set comparison shows missing files per language and extra files relative to the source-language baseline.
- Text and JSON reports include per-file key counts, total characters, average value length, and size.
- Use `--detailed` to print the per-file analysis table in the terminal.

## Settings

Open Settings and choose `Auto Translate Beta` to configure:

- placeholder mode: `preserve`, `skip`, or `send`
- concurrency, batch size, and progress interval
- retry count, retry delay, and request timeout
- dry-run preview, report output, and BOM output
- protection file path, protection enable/disable, first-run setup prompt, and update prompt

Validation warning tuning can be configured at the top level:

```json
{
  "englishContentThresholdPercent": 10,
  "allowedEnglishTerms": ["BrandName", "PRODUCT_CODE"]
}
```

Auto Translate protection rules live in a separate project JSON file:

```json
{
  "version": 1,
  "terms": ["BrandName", "PRODUCT_CODE", "API"],
  "keys": ["app.brandName", "legal.companyName"],
  "values": ["BrandName Ltd"],
  "patterns": ["[A-Z]{2,}-\\d+"]
}
```

## Compatibility

Existing explicit flags still work:

```bash
i18ntk-translate locales/en/common.json de --skip-placeholders
i18ntk-translate locales/en/common.json de --send-placeholders
```

For unattended translation, prefer:

```bash
i18ntk-translate locales/en/common.json de --no-confirm --preserve-placeholders
```
