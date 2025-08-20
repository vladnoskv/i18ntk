# Translation Verification Guide

**Version:** 1.10.1  
**Last Updated:** 2025-01-19  
**Related Script:** `scripts/verify-translations.js`

## Overview

The Translation Verification Script (`verify-translations.js`) is a comprehensive tool for validating and fixing missing translation keys across all locale files in your i18n project. It uses the English translation file (`en.json`) as a base for comparison and ensures all other language files are complete and consistent.

## Key Features

- **Comprehensive Key Scanning**: Analyzes all locale files against English base
- **Language-Specific Prefixing**: Adds missing translations with language code prefixes (e.g., `[FR]`, `[DE]`, `[ES]`)
- **Interactive Directory Selection**: Choose target directories with validation
- **Real-time Progress Tracking**: Live updates during verification and fixing
- **Automatic Backup Creation**: Creates timestamped backups before changes
- **Detailed Reporting**: Comprehensive reports by language
- **Graceful Cancellation**: Safe exit options with cleanup

## Usage

### Basic Usage

```bash
# Run the verification script
node scripts/verify-translations.js
```

### Interactive Workflow

1. **Launch the script**:
   ```bash
   node scripts/verify-translations.js
   ```

2. **Select directory** (interactive prompt):
   ```
   📁 Select translation directory:
   1. Current directory (.)
   2. ui-locales folder
   3. Custom path
   ```

3. **Review scan results**:
   ```
   📊 Translation Verification Report
   =====================================
   ✅ Scanning 7 locale files...
   📁 Found: de.json, en.json, es.json, fr.json, ja.json, ru.json, zh.json
   🔍 Checking for missing translation keys...
   
   📋 Missing Keys Summary:
   - de.json: 45 missing keys
   - es.json: 32 missing keys
   - fr.json: 38 missing keys
   - ja.json: 41 missing keys
   - ru.json: 35 missing keys
   - zh.json: 29 missing keys
   ```

4. **Apply fixes** (optional):
   - Creates automatic backup
   - Adds missing keys with language prefixes
   - Preserves exact file structure

## Output Format

### Missing Translation Format

When fixing missing translations, the script adds entries in the format:

```json
{
  "scanner": {
    "foundText": "[FR] Found {count} potential hardcoded text instances",
    "processingFile": "[FR] Processing file: {filename}",
    "summary": "[FR] Scan complete. {total} files processed, {issues} issues found"
  }
}
```

### Language Prefixes Used

| Language | Prefix | Example |
|----------|--------|---------|
| German | `[DE]` | `[DE] Save settings` |
| Spanish | `[ES]` | `[ES] Configuration updated` |
| French | `[FR]` | `[FR] File not found` |
| Japanese | `[JA]` | `[JA] Processing complete` |
| Russian | `[RU]` | `[RU] Invalid input` |
| Chinese | `[ZH]` | `[ZH] Operation successful` |

## File Structure Requirements

### Expected Directory Layout

```
project/
├── ui-locales/
│   ├── en.json      # Base reference file
│   ├── de.json      # German translations
│   ├── es.json      # Spanish translations
│   ├── fr.json      # French translations
│   ├── ja.json      # Japanese translations
│   ├── ru.json      # Russian translations
│   └── zh.json      # Chinese translations
└── scripts/
    └── verify-translations.js
```

### JSON Structure Consistency

The script ensures:
- **Exact key nesting**: Maintains original object structure
- **Consistent formatting**: Preserves indentation and line breaks
- **Alphabetical ordering**: Keys are sorted within each section
- **Valid JSON**: Ensures proper syntax and escaping

## Advanced Usage

### Custom Directory Paths

```bash
# Run with custom directory
node scripts/verify-translations.js
# Then select option 3 for custom path and enter: ./src/locales
```

### Integration with CI/CD

```yaml
# GitHub Actions example
- name: Verify Translations
  run: node scripts/verify-translations.js
  continue-on-error: true
```

### Automated Backup Location

Backups are created in:
```
backups/translation-backup-{timestamp}/
```

Each backup contains:
- Complete copy of all locale files
- Timestamp in directory name
- Original file structure preserved

## Troubleshooting

### Common Issues

1. **"Directory not found" error**:
   - Ensure the path exists and is accessible
   - Check file permissions
   - Use absolute paths when possible

2. **"Invalid JSON" errors**:
   - Verify JSON syntax in locale files
   - Check for trailing commas
   - Ensure proper Unicode escaping

3. **Missing en.json**:
   - The script requires en.json as base reference
   - Create en.json with complete key structure

### Debug Mode

Enable verbose logging by setting environment variable:

```bash
DEBUG=1 node scripts/verify-translations.js
```

## Integration Examples

### Package.json Script

```json
{
  "scripts": {
    "verify-translations": "node scripts/verify-translations.js",
    "check-locales": "npm run verify-translations"
  }
}
```

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit
node scripts/verify-translations.js
if [ $? -ne 0 ]; then
  echo "Translation verification failed"
  exit 1
fi
```

## Best Practices

1. **Run verification regularly**: Weekly or before releases
2. **Review generated prefixes**: Ensure language codes match your target audience
3. **Test after fixes**: Verify all translations display correctly
4. **Maintain en.json**: Keep English file as complete reference
5. **Backup before major changes**: Always create backups before bulk operations

## Related Documentation

- [CLI Commands](API_REFERENCE.md)
- [Translation Management](README.md#translation-management)
- [Backup & Restore](README.md#backup--restore)
- [Changelog](../CHANGELOG.md)