# i18ntk API Reference

**Version:** 1.5.1  
**Last Updated:** 2025-08-06  
**GitHub Repository:** [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)

## Overview

Complete API documentation for i18ntk - the comprehensive internationalization toolkit for JavaScript/TypeScript projects.

## CLI Commands

### Core Commands

#### `i18ntk` or `npx i18ntk`
Interactive management menu
```bash
npx i18ntk
```

#### `i18ntk init`
Initialize i18n structure
```bash
npx i18ntk init --source-dir ./src --locales-dir ./locales --languages en,es,fr
```

**Options:**
- `--source-dir <path>` - Source directory (default: ./src)
- `--locales-dir <path>` - Locales directory (default: ./locales)
- `--languages <codes>` - Comma-separated language codes
- `--framework <name>` - Framework type (react-i18next, vue-i18n, i18next)
- `--no-prompt` - Skip interactive prompts (CI/CD mode)

#### `i18ntk analyze`
Analyze translation completeness
```bash
npx i18ntk analyze --detailed --output json
```

**Options:**
- `--detailed` - Show detailed analysis
- `--output <format>` - Output format (json, csv, html)
- `--threshold <number>` - Completion threshold percentage
- `--no-prompt` - Skip interactive prompts (CI/CD mode)

#### `i18ntk validate`
Validate translation files
```bash
npx i18ntk validate --strict --fix
```

**Options:**
- `--strict` - Enable strict validation
- `--fix` - Auto-fix common issues
- `--format <type>` - Validation format (json, yaml)
- `--no-prompt` - Skip interactive prompts (CI/CD mode)

#### `i18ntk usage`
Check translation key usage
```bash
npx i18ntk usage --unused --missing
```

**Options:**
- `--unused` - Show only unused keys
- `--missing` - Show only missing keys
- `--source-dir <path>` - Source directory to scan
- `--no-prompt` - Skip interactive prompts (CI/CD mode)

#### `i18ntk complete`
Complete missing translations
```bash
npx i18ntk complete --auto --language es --provider google
```

**Options:**
- `--auto` - Use automatic translation
- `--language <code>` - Target specific language
- `--provider <name>` - Translation provider (google, deepl, openai)
- `--no-prompt` - Skip interactive prompts (CI/CD mode)

#### `i18ntk sizing`
Analyze file sizes and performance
```bash
npx i18ntk sizing --detailed --format json
```

**Options:**
- `--detailed` - Show detailed sizing analysis
- `--format <type>` - Output format (json, table)
- `--threshold <size>` - Size threshold in bytes
- `--no-prompt` - Skip interactive prompts (CI/CD mode)

#### `i18ntk summary`
Generate comprehensive reports
```bash
npx i18ntk summary --format html --include analysis,validation
```

**Options:**
- `--format <type>` - Report format (html, pdf, json)
- `--include <sections>` - Comma-separated sections
- `--no-prompt` - Skip interactive prompts (CI/CD mode)

#### `i18ntk autorun`
Run complete workflow automation
```bash
npx i18ntk autorun --config custom-config.json --skip sizing
```

**Options:**
- `--config <path>` - Configuration file path
- `--skip <steps>` - Comma-separated steps to skip
- `--no-prompt` - Skip interactive prompts (CI/CD mode)

### Debug Commands

#### `i18ntk debug`
Run diagnostics
```bash
npx i18ntk debug --verbose
```

#### `i18ntk settings`
Manage configuration
```bash
npx i18ntk settings --reset --export settings.json
```

## Configuration

### i18ntk-config.json

```json
{
  "defaultLanguage": "en",
  "supportedLanguages": ["en", "es", "fr", "de", "ja", "ru", "zh"],
  "sourceDirectory": "./src",
  "localesDirectory": "./locales",
  "framework": "react-i18next",
  "autoTranslate": false,
  "translationProvider": "google",
  "validationStrict": true,
  "reportFormat": "html"
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `I18N_SOURCE_DIR` | Source directory | `./src` |
| `I18N_LOCALES_DIR` | Locales directory | `./locales` |
| `I18N_DEFAULT_LANG` | Default language | `en` |
| `I18N_FRAMEWORK` | Framework type | `react-i18next` |
| `I18N_AUTO_TRANSLATE` | Enable auto-translation | `false` |
| `GOOGLE_TRANSLATE_API_KEY` | Google API key | - |
| `DEEPL_API_KEY` | DeepL API key | - |
| `OPENAI_API_KEY` | OpenAI API key | - |

## Programmatic API

### Basic Usage

```javascript
const { I18nManager } = require('i18n-management-toolkit');

const manager = new I18nManager({
  sourceDir: './src',
  localesDir: './locales',
  defaultLanguage: 'en'
});

// Initialize project
await manager.initialize();

// Analyze translations
const analysis = await manager.analyze();

// Validate translations
const validation = await manager.validate();

// Complete missing translations
await manager.completeMissingTranslations();
```

### Advanced Usage

```javascript
const { I18nAnalyzer, I18nValidator } = require('i18n-management-toolkit');

// Analyze specific languages
const analyzer = new I18nAnalyzer(config);
const report = await analyzer.analyzeLanguages(['es', 'fr']);

// Validate with custom rules
const validator = new I18nValidator(config);
const results = await validator.validateFiles({
  strict: true,
  autoFix: true
});
```

## Framework Integration

### React i18next
```bash
npx i18ntk init --framework react-i18next
```

### Vue i18n
```bash
npx i18ntk init --framework vue-i18n
```

### Angular i18n
```bash
npx i18ntk init --framework angular
```

### Next.js
```bash
npx i18ntk init --framework next-i18next
```

## Reports

Generated in `i18ntk-reports/`:
- `analysis-report.html` - Translation completeness
- `validation-report.html` - File integrity
- `usage-report.html` - Key utilization
- `sizing-report.html` - Performance metrics
- `summary-report.html` - Project overview

## Security Features

### PIN Protection
- Script-level authentication with AES-256 encryption
- 30-minute session timeout
- Lockout protection after failed attempts
- Complete audit logging

### Configuration Security
- Encrypted storage of sensitive data
- Environment variable support for API keys
- No hardcoded credentials
- Secure backup retention

## Language Support

- English (en)
- German (de)
- Spanish (es)
- French (fr)

- Japanese (ja)
- Russian (ru)
- Chinese (zh)

All languages maintain 100% translation coverage.