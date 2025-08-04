# i18ntk Documentation

**Version:** 1.4.0 (04/08/2025)

## Overview

i18ntk is a comprehensive internationalization toolkit for JavaScript/TypeScript projects. It provides automated translation management, validation, and reporting capabilities.

## What's New in v1.4.0

- **Advanced PIN Protection System** - Script-level authentication with AES-256 encryption
- **Enhanced Settings Validation** - Comprehensive input validation and reset functionality
- **Prepublish Cleanup** - Automated package optimization before release
- **Complete Translation Updates** - 100% coverage across 8 languages
- **Enhanced Security Features** - Granular access controls and audit logging

## Quick Start

```bash
npm install i18ntk --save-dev
npx i18ntk init
npx i18ntk analyze
```

## Core Features

### Translation Management
- **Initialize** - Set up i18n structure
- **Analyze** - Check translation completeness
- **Validate** - Ensure file integrity
- **Complete** - Fill missing translations
- **Usage** - Analyze key utilization

### Security
- **PIN Protection** - Configurable script-level authentication
- **Session Management** - 30-minute timeout with re-authentication
- **Encryption** - AES-256-GCM for secure storage
- **Audit Logging** - Complete security event tracking

### Reporting
- **Analysis Reports** - Translation completeness
- **Validation Reports** - File integrity checks
- **Usage Reports** - Key utilization patterns
- **Sizing Reports** - Performance metrics
- **Summary Reports** - Project overview

## Available Commands

| Command | Description |
|---------|-------------|
| `npx i18ntk` | Interactive management menu |
| `npx i18ntk init` | Initialize i18n structure |
| `npx i18ntk analyze` | Analyze translation completeness |
| `npx i18ntk validate` | Validate translation files |
| `npx i18ntk usage` | Check key usage in source |
| `npx i18ntk complete` | Complete missing translations |
| `npx i18ntk sizing` | Analyze file sizes |
| `npx i18ntk summary` | Generate comprehensive reports |
| `npx i18ntk autorun` | Run complete workflow |

## Language Support (Now Supporting **8 Languages**)

- English (en)
- German (de)
- Spanish (es)
- French (fr)
- Portuguese (pt)
- Japanese (ja)
- Russian (ru)
- Chinese (zh)

## Documentation Structure

- **[Installation Guide](INSTALLATION.md)** - Setup instructions
- **[API Reference](api/API_REFERENCE.md)** - Complete command reference
- **[Configuration Guide](api/CONFIGURATION.md)** - Setup options
- **[PIN Protection Guide](PIN_PROTECTION_GUIDE.md)** - Security features
- **[Debug Tools](debug/DEBUG_TOOLS.md)** - Diagnostic utilities
- **[Development Guide](development/DEV_README.md)** - Contributing guidelines

## Configuration

Create `i18ntk-config.json`:

```json
{
  "sourceDirectory": "./src",
  "localesDirectory": "./locales",
  "defaultLanguage": "en",
  "supportedLanguages": ["en", "es", "fr", "de", "pt", "ja", "ru", "zh"]
}
```

## Reports

Generated in `i18ntk-reports/`:
- Analysis reports
- Validation reports  
- Usage reports
- Sizing reports
- Summary reports

## Support

- **Issues:** [GitHub Issues](https://github.com/vladnoskv/i18n-management-toolkit-main/issues)
- **Documentation:** This guide
- **Examples:** See framework-specific examples in `examples/`

## Contributing

Issues and pull requests welcome! See [Development Guide](development/DEV_README.md) for setup instructions.