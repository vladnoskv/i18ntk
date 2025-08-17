# i18ntk API Reference

**Version:** 1.10.0
**Last Updated:** 2025-08-16
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
Check translation key usage with enhanced analysis capabilities
```bash
npx i18ntk usage --unused --missing --validate-placeholders --framework-detect --performance-mode
```

**Options:**
- `--unused` - Show only unused keys
- `--missing` - Show only missing keys
- `--source-dir <path>` - Source directory to scan
- `--validate-placeholders` - Enable placeholder validation across translations
- `--framework-detect` - Enable automatic framework detection
- `--performance-mode` - Enable performance metrics tracking
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

#### `i18ntk fixer` (NEW in v1.8.3)
Interactive translation fixer with custom placeholder markers and mass fix capabilities
```bash
npx i18ntk fixer --interactive
```

**Interactive Mode:**
- Step-by-step guided fixing process
- Custom placeholder marker configuration
- Selective language and directory targeting
- Real-time progress tracking
- Comprehensive fix reports
- **Exit/Cancel option** (press 0) during directory selection

**Advanced Options:**
- `--interactive` - Enable interactive mode with guided prompts
- `--markers <list>` - Comma-separated custom placeholder markers (e.g., "{{NOT_TRANSLATED}},__MISSING__,[PLACEHOLDER]")
- `--languages <codes>` - Specific languages to process (e.g., "en,es,fr" or "all")
- `--source <path>` - Target specific directory or file
- `--auto-fix` - Skip confirmation prompts and auto-fix
- `--report` - Generate detailed fix reports
- `--no-backup` - Skip automatic backup creation

**Usage Examples:**
```bash
# Interactive mode with guided prompts
npx i18ntk fixer --interactive

# Fix specific languages with custom markers
npx i18ntk fixer --languages en,es,fr --markers "{{NOT_TRANSLATED}},__MISSING__"

# Fix specific directory with auto-fix
npx i18ntk fixer --source ./src/locales --auto-fix --report

# Custom placeholder detection
npx i18ntk fixer --markers "TODO_TRANSLATE,PLACEHOLDER_TEXT,MISSING_TRANSLATION"

# Fix all available languages
npx i18ntk fixer --languages all --markers "[PLACEHOLDER],{{UNTRANSLATED}}"
```

**Legacy Command:**
#### `i18ntk fix` (Deprecated - use `fixer`)
Replace placeholder translations with English text prefixed by the language code
```bash
npx i18ntk fix --markers "__NOT_TRANSLATED__,[FR]" --languages fr
```

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

## Backup Commands (NEW in v1.10.0)

### `i18ntk-backup`
Secure backup and restore utility for i18n translation files with security-first design.

#### `i18ntk-backup create [directory]`
Create a new backup of translation files with security validation.

**Usage:**
```bash
# Create backup from default directory
i18ntk-backup create

# Create backup from specific directory
i18ntk-backup create ui-locales

# Create backup with custom output directory
i18ntk-backup create --output ./custom-backups
```

**Security Features:**
- Path traversal protection
- Safe file operations with SecurityUtils
- Input validation and sanitization
- Directory validation against traversal attacks

#### `i18ntk-backup list`
List all available backups with interactive directory creation.

**Usage:**
```bash
i18ntk-backup list
```

**Interactive Features:**
- Automatic directory creation prompts
- Configuration persistence
- Custom backup directory setup
- User-friendly error messages

#### `i18ntk-backup restore <backup-file>`
Restore translation files from a backup with integrity validation.

**Usage:**
```bash
# Restore to default directory
i18ntk-backup restore backup-20241215-143022.json

# Restore to specific directory
i18ntk-backup restore backup-20241215-143022.json --output ./restored-locales
```

#### `i18ntk-backup verify <backup-file>`
Verify backup file integrity and structure.

**Usage:**
```bash
i18ntk-backup verify backup-20241215-143022.json
```

#### `i18ntk-backup cleanup`
Remove old backups based on retention policy.

**Usage:**
```bash
# Cleanup with default retention (10 backups)
i18ntk-backup cleanup

# Cleanup keeping specific number of backups
i18ntk-backup cleanup --keep 5
```

### Backup Configuration

Configuration is automatically managed and persisted to `.i18ntk/settings.json`:

```json
{
  "backup": {
    "directory": "./i18ntk-backup",
    "maxBackups": 10
  }
}
```

### Environment Variables

Override configuration with environment variables:
- `I18N_BACKUP_DIR`: Custom backup directory
- `I18N_MAX_BACKUPS`: Maximum backups to retain

## Enhanced Features (v1.10.0)

### Enhanced Runtime API
Improved framework-agnostic translation runtime with better TypeScript support:

```bash
# Enhanced runtime with TypeScript support
i18ntk runtime --generate-types

# Framework-specific runtime generation
i18ntk runtime --framework nextjs --typescript
```

### Enhanced Framework Detection
Enhanced support for Next.js, Nuxt.js, and SvelteKit with improved accuracy:

```bash
# Enhanced framework detection with language info
i18ntk analyze --framework-detection --verbose

# Framework-specific best practices
i18ntk analyze --framework nextjs --recommendations
```

### Security Enhancements (v1.10.0)
- **Path Traversal Protection**: All file operations validated against directory traversal
- **Safe File Operations**: SecurityUtils integration for all read/write operations
- **Input Sanitization**: Comprehensive input validation and sanitization
- **Backup Security**: Secure backup creation with integrity verification

### Framework Validation & Testing (v1.10.0)
Comprehensive testing environment with validated framework configurations:

#### Supported Framework Validation
```bash
# React project validation
i18ntk validate --framework react-i18next --source ./src --i18n ./locales

# Vue.js project validation
i18ntk validate --framework vue-i18n --source ./src --i18n ./locales

# Node.js project validation
i18ntk validate --framework i18n-node --source ./src --i18n ./locales

# Python project validation
i18ntk validate --framework flask-babel --source ./src --i18n ./locales
```

#### Test Environment Features
```bash
# Run comprehensive framework tests
i18ntk test --framework all --verbose

# Generate test report
i18ntk test --report --format json

# Validate specific framework
i18ntk test --framework react --detailed
```

#### Admin PIN Security
```bash
# Setup admin PIN
i18ntk admin setup-pin

# Validate admin access
i18ntk admin validate --pin <your-pin>

# Reset admin configuration
i18ntk admin reset --force
```

#### Cross-Platform Testing
```bash
# Test on Windows
i18ntk test --platform windows

# Test on macOS
i18ntk test --platform macos

# Test on Linux
i18ntk test --platform linux
```

### Placeholder Validation
Enhanced placeholder validation ensures consistency across all translations:

```bash
# Validate placeholders across all translations
npx i18ntk usage --validate-placeholders

# Custom placeholder patterns
npx i18ntk usage --validate-placeholders --placeholder-patterns "{{\\w+}},%s,{\\d+}"
```

**Validation includes:**
- Missing placeholders in translations
- Extra placeholders in translations  
- Placeholder ordering consistency
- Custom placeholder pattern support

### Framework Detection
Automatic detection of i18n frameworks with pattern analysis:

```bash
# Detect framework usage patterns
npx i18ntk usage --framework-detect

# Framework-specific analysis
npx i18ntk usage --framework-detect --framework react
```

**Supported Frameworks:**
- React (react-i18next)
- Vue (vue-i18n)
- Angular (@ngx-translate/core)
- Vanilla i18next
- Lingui
- FormatJS

### Performance Metrics
Real-time performance tracking and optimization:

```bash
# Enable performance monitoring
npx i18ntk usage --performance-mode

# Generate performance report
npx i18ntk usage --performance-mode --format json
```

**Metrics Tracked:**
- Analysis duration
- Keys processed per second
- Memory usage
- File processing time
- Framework detection time

### Key Complexity Analysis
Advanced key complexity scoring for translation management:

```bash
# Analyze key complexity patterns
npx i18ntk usage --complexity-analysis
```

**Complexity Factors:**
- Key depth (dot notation levels)
- Naming consistency
- Translation completeness impact
- Framework-specific patterns

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