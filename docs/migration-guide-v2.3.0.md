# Migration Guide: v2.2.x to v2.3.0

v2.3.0 focuses on safer backup behavior, cleaner validation flow, and release alignment.

## What Changed in 2.3.0

- Backups are disabled by default for safer project operation.
- Automatic fixer backups now use a dedicated backup root (`./i18ntk-backups`) instead of locale folders.
- Backup retention is constrained to `1..3` (default `1`) to prevent uncontrolled growth.
- Validate/fixer language discovery ignores backup/report directories.
- Validation now writes a summary report file to the configured output directory.
- Release metadata and docs were aligned to `2.3.0`.

## Upgrade Steps

```bash
npm install -g i18ntk@2.3.0
# or
npm install --save-dev i18ntk@2.3.0
```

## Verify

```bash
i18ntk --version
npm run security:check
npm run lint:locales
```

Expected version output:

```text
Version: 2.3.0
```
