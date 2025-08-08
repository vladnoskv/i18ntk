# Debug Tools

**Version:** 1.6.0  
**Last Updated:** 2025-08-08  
**GitHub Repository:** [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)

This folder contains debugging tools and utilities for the i18nTK project.

## Debug Scripts

- **debug-security.js** - Security and sanitization diagnostics
- **console-key-checker.js** - Detects missing console translation keys
- **export-missing-keys.js** - Exports untranslated keys for review
- **normalize-locales.js** - Normalizes locale file formatting
- **validate-ui-locales.js** - Ensures toolkit UI locales are complete
- **benchmark.js** - Performance benchmarking tool

## Usage

```bash
# Run main debugger
node dev/debug/debugger.js

# Validate configuration
node dev/debug/config-validator.js

# Security audit
node dev/debug/debug-security.js

# Check missing console keys
node dev/debug/console-key-checker.js

# Export missing translation keys
node dev/debug/export-missing-keys.js

# Normalize locale files
node dev/debug/normalize-locales.js

# Validate toolkit UI locales
node dev/debug/validate-ui-locales.js

## Debug Output

Debug logs and reports are saved to `dev/debug/logs/` with timestamps.