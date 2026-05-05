# Migration Guide: i18ntk v3.0.0

## What's New in v3.0.0

v3.0.0 adds Auto Translate for JSON locale files.
The feature is available from the management menu as `Auto Translate (Beta)` and through the standalone `i18ntk-translate` executable.

For the complete change list, see the [CHANGELOG](../CHANGELOG.md#300---2026-05-05).

## Breaking Changes

None expected for existing v2.6.0 projects.
Existing `.i18ntk-config` files, runtime APIs, scanner flows, validation flows, and completion flows continue to work.

## Package Metadata

The package version is now `3.0.0`.
The public npm package includes:

- `main/i18ntk-translate.js`
- `utils/translate/placeholder.js`
- `utils/translate/api.js`
- `utils/translate/traverse.js`
- `utils/translate/report.js`
- `utils/translate/cli.js`

## Upgrade

```bash
npm install -g i18ntk@3.0.0
npm install --save-dev i18ntk@3.0.0
```

Verify:

```bash
i18ntk --version
i18ntk-translate --help
```

## New Auto Translate Workflow

Interactive:

```bash
i18ntk
# choose "Auto Translate (Beta)"
```

Direct CLI:

```bash
i18ntk-translate locales/en/common.json de
i18ntk-translate locales/en/common.json fr --dry-run --report-stdout
i18ntk-translate locales/en es --source-dir locales/en --files "*.json" --no-confirm --skip-placeholders
```

## Placeholder Review

The manager flow uses `--skip-placeholders` for safety.
Strings with placeholders are copied unchanged and listed in the post-translation report so they can be manually translated while preserving tokens.
