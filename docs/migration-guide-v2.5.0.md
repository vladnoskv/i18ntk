# Migration Guide: i18ntk v2.5.0

## What's New in v2.5.0

v2.5.0 is a hardening and correctness release focused on package-audit signals, path safety, admin PIN handling, and fixer reliability.

## Security Hardening

- Environment-variable reads now go through the centralized `utils/env-manager.js` allowlist.
- Path containment checks now reject sibling-prefix paths such as `base-other` when `base` is the intended root.
- Admin PIN hash verification uses timing-safe comparison.
- Expired admin sessions are cleaned up correctly, and the cleanup timer no longer keeps CLI processes alive.
- The release security checker now scans nested production source files.

## Fixer Reliability

The fixer now applies changes to the same target object that is serialized back to disk. It also validates writes against the configured source directory, so absolute `sourceDir` paths outside the current working directory work correctly.

## Upgrade

```bash
npm install -g i18ntk@2.5.0
```

or:

```bash
npm install --save-dev i18ntk@2.5.0
```

## Compatibility

No breaking configuration changes are expected for projects already on v2.4.0. Existing `.i18ntk-config` files continue to work.

## Validation

After upgrading, run:

```bash
i18ntk --command=validate
i18ntk --command=fix --dry-run
```

Version: 2.5.0
