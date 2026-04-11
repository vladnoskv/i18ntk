# Migration Guide: v2.1.0 to v2.1.1

## Overview

v2.1.1 is a patch release focused on version consistency and metadata updates. This release ensures all version references are synchronized to `2.1.1`.

## What Changed in 2.1.1

- Updated package and release metadata to `2.1.1`.
- Updated documentation and migration guides to reference `2.1.1`.
- No breaking changes or feature additions.

## Upgrade Steps

```bash
npm install -g i18ntk@2.1.1
# or for project-local use
npm install --save-dev i18ntk@2.1.1
```

## Config Version

Recommended `.i18ntk-config` minimum:

```json
{
  "version": "2.1.1",
  "sourceDir": "./locales",
  "i18nDir": "./locales",
  "outputDir": "./i18ntk-reports",
  "sourceLanguage": "en",
  "setup": { "completed": true }
}