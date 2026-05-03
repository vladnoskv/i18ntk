# Migration Guide: i18ntk v2.6.0

## What's New in v2.6.0

v2.6.0 is a comprehensive hardening release from a two-pass code audit fixing 35+ bugs and security issues. For the complete list of all changes, see the **[CHANGELOG](../CHANGELOG.md#260---2026-05-03)**.

## Breaking Changes

None. All APIs remain backward compatible with v2.5.x.

## Key Highlights

### Silent Write Failures (Critical)
Multiple call sites were passing incorrect parameters to `safeWriteFileSync`. Path validation silently failed and file writes were silently dropped. All call sites have been corrected.

### Path Security
- All remaining raw Node.js `fs` calls replaced with validated `SecurityUtils` wrappers.
- Path traversal detection hardened for Windows environments.
- Fallback `SecurityUtils` implementation in `i18n-helper.js` now includes path containment.

### Runtime Improvements
- Process event handler leak fixed in `enhanced.js`.
- JSON parse error handling added to `runtime/index.js`.
- TypeScript return types corrected (`Promise<string>` → `string`).

## Upgrade

```bash
npm install -g i18ntk@2.6.0
npm install --save-dev i18ntk@2.6.0
```

No configuration changes or code modifications are required.

## Validation

After upgrading, run:

```bash
i18ntk --command=validate
i18ntk --command=doctor
```

For full details on every fix, see the **[CHANGELOG](../CHANGELOG.md)**
