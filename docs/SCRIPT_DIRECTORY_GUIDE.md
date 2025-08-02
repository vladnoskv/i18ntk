# Script Directory Configuration Guide

## Overview

Starting with **i18ntk v1.3.0**, we've introduced powerful new features for managing script directories and fixed critical path resolution issues. This guide explains how to configure custom directories for each script type and take advantage of the improved path handling.

## 🆕 New Features in v1.3.0

### 1. Per-Script Directory Configuration

Each script type can now have its own source directory configured independently. This allows for maximum flexibility in organizing your i18n files.

#### Supported Script Types
- **analyze** - Translation analysis reports
- **complete** - Translation completion tool
- **init** - Project initialization
- **manage** - Main management interface
- **sizing** - Translation sizing analysis
- **summary** - Summary reports
- **usage** - Usage analysis
- **validate** - Validation checks

### 2. Fixed Path Resolution

We've corrected how relative paths are resolved to ensure they always work from your project root directory, eliminating the "Source directory not found" errors.

## Configuration Methods

### Method 1: Settings CLI (Recommended)

```bash
# Launch the interactive settings manager
node main/i18ntk-manage.js --command=settings

# Or directly
node settings/settings-cli.js
```

Navigate to **"Script Directory Configuration"** to configure individual directories for each script type.

### Method 2: Manual Configuration

Edit your settings file (`settings/settings.json`) to add custom directory configurations:

```json
{
  "scriptDirectories": {
    "analyze": "./src/i18n/locales",
    "complete": "./translations",
    "init": "./locales",
    "manage": "./i18n/locales",
    "sizing": "./src/i18n/sizing",
    "summary": "./reports/i18n",
    "usage": "./src/i18n/usage",
    "validate": "./src/i18n/locales"
  },
  "sourceDir": "./locales"
}
```

### Method 3: CLI Arguments

Use command-line arguments to override directories for specific runs:

```bash
# Override source directory for analyze
node main/i18ntk-analyze.js --source-dir=./src/i18n/locales

# Override for complete
node main/i18ntk-complete.js --source-dir=./translations
```

## Path Resolution Priority

The toolkit uses the following priority order for determining source directories:

1. **CLI Arguments** (`--source-dir`) - Highest priority
2. **Script-Specific Configuration** (`scriptDirectories.<script>`)
3. **Global Configuration** (`sourceDir`)
4. **Default Directory** (`./locales`) - Lowest priority

## Usage Examples

### Example 1: Multi-Directory Setup

Organize your i18n files across multiple directories:

```
project/
├── src/
│   └── i18n/
│       ├── locales/          # Main translations
│       ├── admin-locales/   # Admin interface translations
│       └── public-locales/  # Public-facing translations
├── legacy/
│   └── translations/        # Legacy translation files
└── settings/
    └── settings.json
```

Configuration:

```json
{
  "scriptDirectories": {
    "analyze": "./src/i18n/locales",
    "complete": "./legacy/translations",
    "manage": "./src/i18n/admin-locales"
  }
}
```

### Example 2: Development vs Production

Use different directories for development and production:

```json
{
  "scriptDirectories": {
    "analyze": "./src/i18n/dev-locales",
    "validate": "./src/i18n/prod-locales"
  }
}
```

## Path Guidance Features

### Current Working Directory Display

The settings CLI now displays your current working directory and provides helpful hints:

```
📁 Current directory: /home/user/myproject
💡 Tip: Use relative paths like "./src/i18n/locales" or "../translations"
```

### Relative Path Examples

- ✅ `./src/i18n/locales` - Relative to project root
- ✅ `../translations` - Relative to parent directory
- ✅ `/absolute/path/to/locales` - Absolute path
- ❌ `src/i18n/locales` - Missing `./` prefix (may cause issues)

## Migration Guide

### From v1.2.x to v1.3.0

1. **No Breaking Changes**: Your existing configurations will continue to work
2. **Optional Upgrade**: The new features are opt-in
3. **Path Resolution**: Existing relative paths will now work correctly

### Testing Your Configuration

Before deploying to production, test your configuration:

```bash
# Test with a specific directory
node main/i18ntk-analyze.js --source-dir=./test-locales --dry-run

# Verify all scripts work with your new configuration
npm run i18ntk:settings
```

## Internationalization Support

All new configuration options are fully internationalized with support for:
- English (en)
- German (de)
- Spanish (es)
- French (fr)
- Portuguese (pt)
- Russian (ru)
- Japanese (ja)
- Chinese (zh)

## Troubleshooting

### Common Issues

1. **"Source directory not found"**
   - Ensure the directory exists
   - Use relative paths from project root
   - Check file permissions

2. **Settings not applied**
   - Verify `scriptDirectories` configuration in settings.json
   - Check for syntax errors in JSON
   - Ensure settings file is in the correct location

3. **CLI arguments not working**
   - Use the correct argument format: `--source-dir=./path`
   - Ensure no spaces around the equals sign

### Debug Commands

```bash
# Check current settings
node settings/settings-cli.js --show

# Test path resolution
node main/i18ntk-analyze.js --source-dir=./test-path --dry-run

# Validate configuration
node main/i18ntk-validate.js --config-only
```

## Best Practices

1. **Use Relative Paths**: Always use relative paths from project root for portability
2. **Test Before Deploying**: Always test directory configurations on a development branch
3. **Document Your Setup**: Keep a record of your directory structure and configurations
4. **Use Version Control**: Commit your settings.json to version control for team consistency
5. **Backup Settings**: Create backups before making significant configuration changes

## Support

For issues or questions:
- Check the [troubleshooting section](#troubleshooting)
- Review the [CHANGELOG.md](../CHANGELOG.md)
- Open an issue on [GitHub](https://github.com/vladnoskv/i18n-management-toolkit-main/issues)

---

*This guide is part of i18ntk v1.3.0. For previous versions, see the [documentation](../docs/).*