# I18NTK - CLI API Reference

**Version:** 2.0.0 | **Updated:** 2025-08-20

Complete API documentation for I18NTK - the comprehensive internationalization toolkit for JavaScript/TypeScript projects.

## CLI Commands

### Core Commands

#### `i18ntk` or `npx i18ntk`
Interactive management menu
```bash
npx i18ntk
```

#### `i18ntk init`
Initialize I18NTK structure
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
- `--strict` - Strict validation
- `--fix` - Auto-fix issues
- `--format <type>` - Validation format
- `--no-prompt` - Skip prompts

#### `i18ntk usage`
Check translation key usage
```bash
npx i18ntk usage --unused --missing
```

**Options:**
- `--unused` - Show unused keys
- `--missing` - Show missing keys
- `--source-dir <path>` - Source directory
- `--validate-placeholders` - Placeholder validation
- `--framework-detect` - Framework detection
- `--performance-mode` - Performance tracking
- `--no-prompt` - Skip prompts

#### `i18ntk complete`
Complete missing translations
```bash
npx i18ntk complete --auto --language es --provider google
```

**Options:**
- `--auto` - Auto-translate
- `--language <code>` - Target language
- `--provider <name>` - Provider (google, deepl, openai)
- `--no-prompt` - Skip prompts

#### `i18ntk fixer` (NEW in v1.8.3)
Interactive translation fixer with custom placeholder markers and mass fix capabilities
```bash
npx i18ntk fixer --interactive
```

#### `i18ntk verify-translations` (NEW in v1.10.1)
Comprehensive translation verification script for validating and fixing missing translation keys across all locale files
```bash
node scripts/verify-translations.js
```

#### `i18ntk --security-check`
Run comprehensive security validation to verify all security enhancements are properly implemented
```bash
npx i18ntk --security-check
```

**Security Validation Includes:**
- ✅ Path traversal vulnerability checks
- ✅ Input sanitization validation
- ✅ Secure file operation verification
- ✅ Configuration encryption status
- ✅ Permission validation for sensitive files
- ✅ Cross-platform security compatibility
- ✅ Zero shell access verification
- ✅ Encrypted settings integrity check

**verify-translations — Features:**
- **Comprehensive Key Scanning**: Uses English (en.json) as base for comparison across all languages
- **Language-Specific Prefixing**: Adds missing translations with language code prefixes (e.g., `[FR]`, `[DE]`, `[ES]`)
- **Interactive Directory Selection**: Choose target directories with validation and confirmation
- **Real-time Progress**: Live progress tracking during verification and fixing processes
- **Automatic Backup**: Creates timestamped backups before applying any changes
- **Detailed Reporting**: Comprehensive reports showing missing keys by language
- **Graceful Cancellation**: Safe cancellation options with proper cleanup

#### Usage Examples# Run interactive verification
node scripts/verify-translations.js

# Select specific directory during interactive mode
# Option 1: Current directory
# Option 2: ui-locales folder (default)
# Option 3: Custom path

# The script will:
# 1. Scan all locale files (de.json, es.json, fr.json, ja.json, ru.json, zh.json)
# 2. Compare against en.json for completeness
# 3. Report missing keys with language-specific counts
# 4. Offer to fix missing keys with English translations prefixed by language code
# 5. Create automatic backup before applying changes
```

**Output Example:**
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

🛠️ Fix Options:
✔ Create backup: ./backups/translation-backup-1234567890/
✔ Add missing keys with language prefixes
✔ Preserve exact key structure and formatting
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

## Security API - v2.0.0 Enhanced Security

### SecurityUtils - Zero-Vulnerability Certified

Security utilities for safe file operations and path validation. Methods perform strict path normalization and containment checks; read/write helpers can optionally encrypt/decrypt content using AES-256-GCM when enabled (e.g., for backups or protected configs).

#### `SecurityUtils.safeSanitizePath(path, options)`**Parameters:**
- `path` (string): The file path to sanitize
- `options` (object): Validation options
  - `baseDir` (string): Base directory for validation (required)
  - `allowAbsolute` (boolean): Allow absolute paths (default: false)
  - `allowTraversal` (boolean): Allow directory traversal (default: false)
  - `allowedExtensions` (array): Whitelist of allowed file extensions

**Returns:**
- `string`: Sanitized absolute path

**Security Features:**
- ✅ Prevents directory traversal (`../`, `..\`)
- ✅ Blocks absolute path access unless explicitly allowed
- ✅ Validates against symlink attacks
- ✅ Whitelist-based file extension validation
- ✅ Cross-platform path normalization (Windows, macOS, Linux)

**Example:**
```javascript
const { SecurityUtils } = require('i18ntk/utils/security');
const safePath = SecurityUtils.safeSanitizePath('../config.json', {
  baseDir: '/app/translations',
  allowTraversal: false,
  allowedExtensions: ['.json', '.js', '.ts']
});
```

#### `SecurityUtils.safeReadFile(path, options)`
Securely read files with comprehensive path validation and error handling.

**Parameters:**
- `path` (string): File path to read
- `options` (object): Security options (same as safeSanitizePath)

**Returns:**
- `Promise<string>`: File contents

**Example:**
```javascript
const content = await SecurityUtils.safeReadFile('translations/en.json', {
  baseDir: '/app/translations',
  allowedExtensions: ['.json']
});
```

#### `SecurityUtils.safeReadFileSync(path, options)`
Synchronous version of safeReadFile.

**Returns:**
- `string`: File contents

#### `SecurityUtils.safeWriteFile(path, content, options)`
Securely write files with path validation and permission checking.

**Parameters:**
- `path` (string): File path to write
- `content` (string): Content to write
- `options` (object): Security options

**Returns:**
- `Promise<void>`

#### `SecurityUtils.safeWriteFileSync(path, content, options)`
Synchronous version of safeWriteFile.

#### `SecurityUtils.safeReaddir(path, options)`
Securely read directory contents with validation.

**Parameters:**
- `path` (string): Directory path
- `options` (object): Security options

**Returns:**
- `Promise<string[]>`: Array of file/directory names

#### `SecurityUtils.safeStat(path, options)`
Secure file status checking with path validation.

**Parameters:**
- `path` (string): File path to check
- `options` (object): Security options

**Returns:**
- `Promise<fs.Stats>`: File statistics

#### `SecurityUtils.safeExists(path, options)`
Secure file existence checking.

**Parameters:**
- `path` (string): File path to check
- `options` (object): Security options

**Returns:**
- `Promise<boolean>`: True if file exists

#### `SecurityUtils.safeMkdir(path, options)`
Secure directory creation with validation.

**Parameters:**
- `path` (string): Directory path to create
- `options` (object): Security options plus standard mkdir options

**Returns:**
- `Promise<string>`: Created directory path

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