# Migration Guide: v1.10.2

## 🚨 Critical Fix: projectRoot Path Resolution

### Issue Summary
In versions prior to v1.10.2, resetting settings would incorrectly restore `projectRoot` to `"./"` instead of `"/"`. This caused fresh installations to fail with path resolution errors.

### What's Fixed
- **Before**: `projectRoot` defaulted to `"./"` on settings reset
- **After**: `projectRoot` correctly defaults to `"/"` on settings reset
- **Impact**: Fresh installations now work out-of-the-box without manual configuration

## Migration Instructions

### For New Users (Fresh Install)
**No action required!** v1.10.2 works perfectly with default settings.

### For Existing Users (Upgrade)
**Your existing configuration is preserved.** The fix only affects:
- New installations
- Manual settings reset operations

### Manual Verification Steps

#### 1. Check Current Configuration
```bash
# View your current projectRoot setting
i18ntk settings get projectRoot

# Expected output for existing users: "./" (unchanged)
# Expected output for new users: "/" (new default)
```

#### 2. Update if Needed (Optional)
If you experience issues, you can manually update:

```bash
# Update to the new default
i18ntk settings set projectRoot "/"

# Or reset all settings to defaults
i18ntk settings reset --confirm
```

#### 3. Verify Installation
```bash
# Test your configuration
i18ntk validate

# Should complete without path-related errors
```

## Environment Variable Migration

### Before (v1.10.1 and earlier)
```bash
# Could cause issues with fresh installs
I18NTK_PROJECT_ROOT="./"
```

### After (v1.10.2+)
```bash
# Works correctly for all scenarios
I18NTK_PROJECT_ROOT="/"
```

## Configuration File Changes

### Before (i18ntk-config.json)
```json
{
  "projectRoot": "./"
}
```

### After (i18ntk-config.json)
```json
{
  "projectRoot": "/"
}
```

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Path not found" errors on fresh install
**Solution**: Update to v1.10.2 and reset settings
```bash
npm update -g i18ntk
i18ntk settings reset --confirm
```

#### Issue: Existing configuration broken after upgrade
**Solution**: Your settings are preserved, but you can manually fix if needed
```bash
# Backup current settings
i18ntk backup create --name "pre-migration"

# Reset to defaults
i18ntk settings reset --confirm
```

#### Issue: CI/CD pipeline failures
**Solution**: Update your CI configuration to use v1.10.2
```yaml
# GitHub Actions example
- name: Setup i18ntk
  run: npm install -g i18ntk@^1.10.2
```

## Rollback Instructions

If you need to rollback:

```bash
# Reinstall previous version
npm install -g i18ntk@1.10.1

# Restore from backup if available
i18ntk backup list
i18ntk backup restore <backup-id>
```

## Support

For migration assistance:
1. Check the [troubleshooting guide](./environment-variables.md#troubleshooting)
2. Create an issue on [GitHub](https://github.com/vladnoskv/i18ntk/issues)
3. Use debug mode: `I18NTK_LOG_LEVEL=debug i18ntk validate`

## Summary

| Scenario | Action Required | Impact |
|----------|----------------|---------|
| **New installation** | None | ✅ Works perfectly |
| **Existing upgrade** | None | ✅ Settings preserved |
| **Settings reset** | None | ✅ Uses new default |
| **CI/CD pipeline** | Update to v1.10.2 | ✅ Fixes path issues |

**Bottom line**: v1.10.2 is fully backward compatible. The fix only improves the default behavior for new users while preserving existing configurations.