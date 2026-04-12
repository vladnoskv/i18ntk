# Migration Guide: v2.3.0 to v2.3.1

v2.3.1 is a focused hotfix release for package export-path compatibility in production builds.

## What Changed in 2.3.1

- Removed legacy fallback resolution to `i18ntk/resources/i18n/ui-locales/en.json` in `utils/i18n-helper`.
- Locale resolution now relies on the exported package path `i18ntk/ui-locales/en.json`.
- This prevents bundler warnings about non-exported subpaths during optimized production builds.

## Upgrade Steps

```bash
npm install -g i18ntk@2.3.1
# or
npm install --save-dev i18ntk@2.3.1
```

## Verify

```bash
i18ntk --version
npm run security:test
```

Expected version output:

```text
Version: 2.3.1
```
