# Migration Guide: v2.3.3 to v2.3.4

v2.3.4 focuses on runtime-safe configuration persistence.

## What Changed in 2.3.4

- Added `I18NTK_DISABLE_AUTOSAVE` support for server/runtime environments.
- `saveConfig` now logs and degrades gracefully on persistence errors instead of hard-throwing.
- Added concurrency regression coverage for parallel config saves.

## Upgrade Steps

```bash
npm install -g i18ntk@2.3.4
# or
npm install --save-dev i18ntk@2.3.4
```

## Runtime Recommendation

For immutable containers or read-only filesystems:

```bash
I18NTK_DISABLE_AUTOSAVE=1
```

## Verify

```bash
i18ntk --version
i18ntk --command=analyze --no-prompt
```

Expected version output:

```text
Version: 2.3.4
```
