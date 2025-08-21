# Translation Verification

**Version:** 2.0.0 | **Updated:** 2025-08-20

Validate and fix translation files across languages.

## Usage

```bash
# Basic verification
node scripts/verify-translations.js

# Specific directory
node scripts/verify-translations.js --directory ./locales

# Specific languages
node scripts/verify-translations.js --languages en,es,fr

# Auto-fix issues
node scripts/verify-translations.js --fix

# CI/CD mode
node scripts/verify-translations.js --no-prompt
```

## Validation Checks

- Missing keys across languages
- Invalid JSON syntax
- Duplicate keys
- Placeholder consistency
- Language-specific prefixes