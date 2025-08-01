# Release Notes - i18ntk v1.0.4 (DEPRECATED - Use 1.1.5)

**Release Date:** January 27, 2025  
**Release Type:** Patch Release 🔧  
**Status:** Critical Translation System Fixes

## 🎯 Overview

⚠️ **DEPRECATED VERSION** - This version contains known bugs. Please upgrade to v1.1.5 immediately.

Version 1.0.4 was a critical patch release that addressed significant translation system issues discovered in previous versions.

## 🔧 Critical Translation System Fixes

### 🐛 Major Bug Fixes

#### Translation System Initialization
- **Fixed**: Translation system initialization issues causing "Translation not found" errors
- **Enhanced**: Auto-loading of English translations when `t()` function is first called
- **Added**: `isInitialized` flag to prevent redundant translation loading
- **Improved**: Translation system robustness across all modules

#### Dynamic Value Replacement
- **Fixed**: Template placeholders not being replaced with actual values in validation summary
- **Resolved**: Issues with `{{langs}}`, `{{lang}}`, `{count}`, and `{{percentage}}` placeholders
- **Corrected**: Parameter name mismatches between translation function calls and template placeholders
- **Enhanced**: Full support for all template placeholder formats

#### Security Configuration
- **Added**: `uiLanguage` to allowed security configuration keys
- **Resolved**: "Security: Unknown config key: uiLanguage" warnings
- **Improved**: Security validation to include all valid configuration options

### 🔍 Specific Issues Resolved

1. **Translation Not Found Error**
   - **Issue**: `Translation not found for key: hardcodedTexts.securityUnknownConfigKey`
   - **Root Cause**: Translation system not initialized when security module was loaded
   - **Solution**: Added auto-initialization in `i18n-helper.js` `t()` function

2. **Dynamic Value Replacement**
   - **Issue**: Template placeholders like `{{langs}}`, `{{lang}}`, `{count}` not replaced
   - **Root Cause**: Parameter name mismatches in `i18ntk-validate.js`
   - **Solution**: Corrected parameter names to match template expectations
     - `languages` → `langs`
     - `language` → `lang`
     - `*Count` parameters → `count`
     - `translationPercentage` → `percentage`

3. **Security Configuration Warnings**
   - **Issue**: `uiLanguage` flagged as unknown configuration key
   - **Root Cause**: Missing from allowed keys list in security validation
   - **Solution**: Added `uiLanguage` to `allowedKeys` array in `security.js`

## 📁 Files Modified

### Core Translation System
- `utils/i18n-helper.js`
  - Added auto-initialization of translations in `t()` function
  - Added `isInitialized` flag for proper state management
  - Enhanced `loadTranslations()` to set initialization flag

### Validation System
- `main/i18ntk-validate.js`
  - Fixed parameter name mismatches in translation calls
  - Corrected template placeholder alignment
  - Enhanced dynamic value replacement

### Security System
- `utils/security.js`
  - Added `uiLanguage` to allowed configuration keys
  - Improved security validation coverage

### Documentation
- `package.json` - Updated version to 1.1.5
- `CHANGELOG.md` - Added comprehensive v1.1.5 release notes
- `README.md` - Updated to reflect latest fixes and improvements

## ✅ Quality Assurance

### Testing Results
- **Translation Errors**: ✅ Resolved - No more "Translation not found" errors
- **Dynamic Values**: ✅ Working - All template placeholders properly replaced
- **Security Warnings**: ✅ Fixed - No more unknown configuration key warnings
- **Validation Scripts**: ✅ Operational - All tools run without translation errors

### Verification Commands
```bash
# Test validation with proper dynamic values
node main/i18ntk-validate.js --source-dir=./locales

# Verify no translation errors
node main/i18ntk-analyze.js --help

# Check security configuration
node main/i18ntk-manage.js
```

## 🚀 Upgrade Instructions

### For Global Installation
```bash
npm update -g i18ntk
```

### For Local Installation
```bash
npm update i18ntk
```

### Verification
```bash
i18ntk --version  # Should show 1.1.5
i18ntk-validate --help  # Should exit properly without errors
```

## 🔄 Breaking Changes

**None** - This is a patch release with no breaking changes. All existing functionality remains compatible.

## 🎯 Impact

### Before v1.0.4
- Translation errors in console output
- Dynamic values not replaced in validation summary
- Security warnings for valid configuration
- Inconsistent translation system behavior

### After v1.1.5
- ✅ Clean console output without translation errors
- ✅ Proper dynamic value replacement in all outputs
- ✅ No security warnings for valid configurations
- ✅ Robust and reliable translation system

## 📋 Next Steps

After upgrading to v1.1.5:
1. Run your existing i18n workflows to verify improvements
2. Check that all dynamic values display correctly
3. Confirm no translation errors in console output
4. Update any custom scripts that may depend on the fixed behavior

## 🆘 Support

If you encounter any issues with v1.1.5:
- Check the [troubleshooting guide](../debug/DEBUG_TOOLS.md)
- Review the [configuration documentation](../api/CONFIGURATION.md)
- Report issues on [GitHub Issues](https://github.com/vladnoskv/i18n-management-toolkit/issues)

---

**Previous Release:** [v1.0.3](./RELEASE_NOTES_v1.0.3.md)  
**Full Changelog:** [CHANGELOG.md](../../CHANGELOG.md)