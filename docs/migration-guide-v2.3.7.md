# Migration Guide: i18ntk v2.3.7

## What's New in v2.3.7

This release focuses on **security improvements** and **reduced console noise** during normal operation.

### Key Changes

#### 1. Security Fixes
- **Fixed path traversal vulnerability** in temporary file creation
- **Added `safeJoin` function** for secure path construction
- **Improved path validation** throughout the codebase

#### 2. Logging Improvements
- **Silent by default**: security/config diagnostics do not print to console in normal runs
- **Opt-in diagnostics**: enable logs with `I18NTK_ENABLE_SECURITY_LOGS=true` and/or `I18NTK_ENABLE_LOGS=true`
- **Centralized security logging**: All security events use `SecurityUtils.logSecurityEvent()`

#### 3. Other Improvements
- **Maintained backward compatibility** for all existing functionality
- **Enhanced security monitoring** while reducing console spam

### Migration Steps

**No breaking changes** - this release is fully backward compatible. However:

1. **If you were relying on security info messages**, set `I18NTK_ENABLE_SECURITY_LOGS=true` (or `I18N_DEBUG=true`) to see them
2. **If you see any path-related warnings**, review your configuration for potential path traversal issues

### Updated Configuration Example

```json
{
  "version": "2.3.7",
  "sourceDir": "./locales",
  "security": {
    "logLevel": "warn" // Only used when security logging is explicitly enabled
  }
}
```

### Security Notes

- Path traversal attempts are now **blocked** (logging is opt-in)
- Temporary files are created **safely within project directories**
- All file paths are **validated before use**

For more information, see the [SECURITY.md](SECURITY.md) file.
