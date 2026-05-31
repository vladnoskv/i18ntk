# Migration Guide v4.3.2

This guide covers the current upgrade path for projects using older `i18ntk` versions.

## Recommended Upgrade

```bash
npm install -g i18ntk@4.3.2
# or, for a project-local install:
npm install --save-dev i18ntk@4.3.2
```

Verify the installed version:

```bash
i18ntk --version
```

## Config Updates

Review `.i18ntk-config` and update these fields when missing:

```json
{
  "version": "4.3.2",
  "sourceDir": "./locales",
  "i18nDir": "./locales",
  "outputDir": "./i18ntk-reports",
  "sourceLanguage": "en",
  "defaultLanguages": ["en", "de", "es", "fr", "ru"],
  "reports": {
    "format": "markdown"
  },
  "autoTranslate": {
    "placeholderMode": "preserve",
    "onlyMissingOrEnglish": true,
    "concurrency": 12,
    "batchSize": 100,
    "progressInterval": 25,
    "retryCount": 3,
    "retryDelay": 1000,
    "timeout": 15000,
    "dryRunFirst": true,
    "reportStdout": true,
    "protectionEnabled": true,
    "protectionFile": "./i18ntk-auto-translate.json",
    "promptProtectionSetup": true,
    "promptProtectionUpdate": true
  }
}
```

Notes:

- `defaultLanguages` now includes `en` by default so setup remains consistent when the UI language is not English.
- `reports.format` controls init and analysis report output. The default is `markdown`; `json` is pretty-printed.
- `autoTranslate.onlyMissingOrEnglish` keeps translated target values and only translates missing, marker, source-copy, or likely-English values. Use `--translate-all` for full re-translation.
- Auto Translate now treats target-code placeholder leftovers such as `[AR] What We Offer`, `[AR] Email`, `[zh] Email`, and `[TR] Password` as needing translation, retries any remaining leftovers before writing output, and warns with report details if the provider still returns untranslated text.
- Managed Auto Translate now checks every selected source file for a target language before reporting leftover failures.
- Short all-caps acronyms and codes such as `XP` may remain unchanged without failing the final leftover check.
- Fix Placeholder now audits English source files for `[LANG] ...` leftovers before applying fixes. Use `i18ntk-fixer --check-placeholders` for the check-only mode; a clean source language reports `0` placeholders.

## Command Changes To Check

Supported manager commands:

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

Use standalone CLIs for these flows:

```bash
i18ntk-backup create ./locales
i18ntk-backup create ./locales --incremental
i18ntk-fixer --help
i18ntk-fixer --check-placeholders
i18ntk-doctor
i18ntk-translate locales/en/common.json de --no-confirm
```

`i18ntk --command=backup` is intentionally disabled in current builds.

## Auto Translate Migration

Auto Translate is no longer beta.

Default behavior changed for existing target files:

- Existing translated target values are preserved.
- Missing, empty, untranslated-marker, source-copy, or likely-English values are translated.
- Target-only extra keys are preserved in the output file.
- `--translate-all` or `--force-translate` re-translates every source string.

Recommended first run:

```bash
i18ntk-translate locales/en/common.json de --dry-run --report-stdout
```

Then run without `--dry-run`:

```bash
i18ntk-translate locales/en/common.json de --no-confirm
```

## Reports Migration

Init and analysis reports now default to readable Markdown:

```json
{
  "reports": {
    "format": "markdown"
  }
}
```

Use JSON only when a downstream integration expects it:

```json
{
  "reports": {
    "format": "json"
  }
}
```

JSON reports are now pretty-printed instead of a one-line JSON string containing escaped newline characters.

## Usage Analysis Migration

If older runs showed very high missing-key counts when `sourceDir` and `i18nDir` both pointed at `./locales`, rerun usage analysis on `4.3.2`:

```bash
i18ntk-usage --source-dir ./src --i18n-dir ./locales
```

If you do not have an application source directory, usage scanning is disabled with a clear warning instead of scanning the whole package/root directory.

## Validation And UI Output

Validation output now prints one path block followed by the validator summary. The manager menu is grouped with clearer spacing and aligned option numbers.

## Security Notes

Upgrade to `4.3.2` or newer for:

- runtime language-name validation before locale file resolution
- stricter backup restore entry validation
- stricter shared path containment checks
- Auto Translate provider URL validation for IPv4-mapped IPv6 private/loopback hosts
- custom internal path prefix hardening

## Post-Upgrade Checklist

1. Run `i18ntk --version`.
2. Run `i18ntk --command=validate`.
3. Run `i18ntk --command=analyze`.
4. Run `i18ntk --command=usage`.
5. Run `i18ntk --command=translate` or `i18ntk-translate ... --dry-run` if you use Auto Translate.
6. Review reports in `./i18ntk-reports`.
