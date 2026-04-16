# Migration Guide: i18ntk v2.4.0

## What's New in v2.4.0

This release focuses on scanner-oriented hardening and documentation/version alignment.

### Key Changes

#### 1. Startup Network Checks Removed
- npm registry update checks are disabled in CLI startup paths.
- No update-check environment toggles are required.

#### 2. Setup Prerequisite PATH Probing Removed
- Setup prerequisite command probing no longer inspects `PATH`.
- This reduces environment-variable scanner surface in restricted environments.

#### 3. Manager Backup Route Disabled
- Manager-command backup routing (`i18ntk --command=backup`) is disabled.
- Use standalone `i18ntk-backup` for backup operations.

#### 4. Version and Docs Alignment
- Package metadata and docs were updated to `2.4.0`.
- Added this migration guide and updated documentation index links.

### Migration Steps

1. Upgrade i18ntk to `2.4.0`.
2. If you use manager backup routing, switch to `i18ntk-backup`.
3. Remove any CI/runtime assumptions about startup npm update-check behavior.

### Upgrade Commands

```bash
npm install -g i18ntk@2.4.0
# or
npm install --save-dev i18ntk@2.4.0
```

### Verify

```bash
i18ntk --version
i18ntk --command=analyze --no-prompt
```

Expected version output:

```text
Version: 2.4.0
```
