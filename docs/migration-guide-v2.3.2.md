# Migration Guide: v2.3.1 to v2.3.2

v2.3.2 focuses on startup robustness and upgrade visibility.

## What Changed in 2.3.2

- Fixed a fatal manager analyze startup error: `validateSourceDir is not defined`.
- Added an npm-registry version check on CLI startup.
- Added an upgrade warning when installed `i18ntk` is behind the latest published version.

## Upgrade Steps

```bash
npm install -g i18ntk@2.3.2
# or
npm install --save-dev i18ntk@2.3.2
```

## Verify

```bash
i18ntk --version
i18ntk --command=analyze --no-prompt
```

Expected version output:

```text
Version: 2.3.2
```
