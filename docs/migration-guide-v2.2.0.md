# Migration Guide: v2.1.x to v2.2.0

v2.2.0 includes stability/security hardening and packaging cleanup.

## What Changed in 2.2.0

- Fixed critical issues in sizing and usage workflows.
- Reduced npm package exposure by removing internal development scripts from published artifacts.
- Added support guidance: versions below `2.2.0` are not recommended for production.
- Synced release metadata and docs to `2.2.0`.

## Upgrade Steps

```bash
npm install -g i18ntk@2.2.0
# or
npm install --save-dev i18ntk@2.2.0
```

## Verify

```bash
i18ntk --version
npm run security:check
npm run lint:locales
```

Expected version output:

```text
Version: 2.2.0
```

