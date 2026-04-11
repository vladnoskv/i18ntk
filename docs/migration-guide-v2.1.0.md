# Migration Guide: v2.0.x to v2.1.0

## Overview

v2.1.0 is a stability and workflow release focused on CLI behavior consistency, framework detection reliability, locale-key consistency, and cleaner output.

## What Changed in 2.1.0

- Interactive command flow now reliably returns to Main Menu after command completion.
- Framework detection recognizes setup-complete projects as internal `i18ntk` framework projects.
- Analysis output fixes:
  - Correct progress counters
  - Removed duplicate report-save lines
  - Excludes backup/report directories from language analysis
- UI locale sets are synchronized and normalized between:
  - `resources/i18n/ui-locales`
  - `ui-locales`
- Reduced false-positive security warnings for valid config fields such as `dateFormat`, `timeFormat`, and `reportLanguage`.

## Upgrade Steps

```bash
npm install -g i18ntk@2.1.0
# or for project-local use
npm install --save-dev i18ntk@2.1.0
```

## Config Version

Recommended `.i18ntk-config` minimum:

```json
{
  "version": "2.1.0",
  "sourceDir": "./locales",
  "i18nDir": "./locales",
  "outputDir": "./i18ntk-reports",
  "sourceLanguage": "en",
  "setup": { "completed": true }
}
```

## Verification Checklist

```bash
i18ntk --help
i18ntk --command=init --no-prompt
i18ntk --command=analyze --no-prompt
i18ntk --command=validate --no-prompt
i18ntk --command=complete --no-prompt
```

Confirm:

- no setup loop on initialized projects
- no backup/report folders analyzed as languages
- correct `N/N languages processed` output during analyze
- report output only logs one save line per language

## Rollback

```bash
npm install -g i18ntk@2.0.4
```
