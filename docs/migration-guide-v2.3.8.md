# Migration Guide: i18ntk v2.3.8

## What's New in v2.3.8

This release focuses on **production-safe logging**, **false-positive reduction**, and **cleaner build output**.

### Key Changes

#### 1. Logging System Upgrade
- Added centralized structured logging with standard prefixes (`[INFO]`, `[WARN]`, `[ERROR]`, `[BUILD]`, `[WORKERS]`, `[I18N]`, `[SUCCESS]`)
- Logging is now **silent by default for non-critical output** in production-like builds
- Enable verbose diagnostics with:
  - `DEBUG_MODE=true`
  - `I18NTK_LOG_LEVEL=debug`
- Emit JSON logs for CI/build tooling with:
  - `JSON_LOG=true`

#### 2. Fallback and Error Reporting
- Replaced repeated fallback spam with a single fallback notification:
  - `Using default configuration (reason: configuration error)`
- Preserves first error context in memory for debug troubleshooting
- Debug-only detail emission to avoid noisy normal builds

#### 3. Security Warning Improvements
- Internal package/project absolute paths are now auto-whitelisted
- Security reasons now provide specific detection causes (for example, parent traversal segments, shell metacharacters)
- Security warnings are suppressed for internal sources unless debug/security logging is explicitly enabled

#### 4. Translation Warning Throttling
- Missing translation key warnings now use a **5-minute TTL cache** per key
- Prevents repeated warning spam in worker-heavy build environments

#### 5. Scanner-Oriented Hardening (Current Build Behavior)
- npm registry update checks are disabled in CLI startup paths.
- Setup prerequisite command probing no longer inspects `PATH`.
- Backup in manager-command routing is disabled; use standalone `i18ntk-backup`.

### Migration Steps

1. Remove any reliance on always-on config/security console output in CI logs
2. If verbose diagnostics are needed, set `DEBUG_MODE=true`
3. For machine-readable logs, set `JSON_LOG=true`
4. Keep `I18NTK_ENABLE_SECURITY_LOGS=true` only for targeted security troubleshooting
5. If you previously depended on manager backup routing, switch scripts to `i18ntk-backup`.

### Updated Environment Examples

```bash
# Human-readable debug diagnostics
DEBUG_MODE=true i18ntk --command=validate

# Structured logs for CI parsers
JSON_LOG=true DEBUG_MODE=true i18ntk --command=analyze

# Security-focused troubleshooting
DEBUG_MODE=true I18NTK_ENABLE_SECURITY_LOGS=true i18ntk --command=scanner
```

For complete variable references, see [environment-variables.md](./environment-variables.md).
