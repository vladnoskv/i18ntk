# Migration Guide: v2.3.4 to v2.3.5

v2.3.5 focuses on security hardening for filesystem and network-related behavior.

## What Changed in 2.3.5

- Hardened settings backup/reset path handling to reduce risky file operations.
- Hardened backup command path validation to project scope by default.
- At the time of v2.3.5, npm update checks were opt-in via `I18NTK_ENABLE_UPDATE_CHECK=true`.

## Upgrade Steps

```bash
npm install -g i18ntk@2.3.5
# or
npm install --save-dev i18ntk@2.3.5
```

## Runtime Recommendation

For server/runtime environments:

```bash
I18NTK_DISABLE_AUTOSAVE=1
```

Historical note: `I18NTK_ENABLE_UPDATE_CHECK` was removed in later builds when
startup registry checks were fully disabled.

## Verify

```bash
i18ntk --version
i18ntk --command=analyze --no-prompt
```

Expected version output:

```text
Version: 2.3.5
```
