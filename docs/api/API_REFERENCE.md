# I18N Management Toolkit - API Reference

**Version:** 1.4.6  
**Last Updated:** 26/07/2025  
**Maintainer:** Vladimir Noskov  

## 📋 Overview

This document provides a comprehensive API reference for the I18N Management Toolkit, including all available commands, configuration options, and programmatic interfaces.

## 🚀 Command Line Interface (CLI)

### Core Commands

#### `npm run i18ntk`
**Description:** Interactive management menu  
**Usage:** `npm run i18ntk`  
**Options:** None  
**Output:** Interactive menu with 12 options  

#### `npm run i18ntk:init`
**Description:** Initialize i18n structure for new projects  
**Usage:** `npm run i18ntk:init [options]`  
**Options:**
- `--source-dir <path>` - Source directory to scan (default: ./src)
- `--locales-dir <path>` - Locales directory (default: ./locales)
- `--languages <langs>` - Comma-separated language codes (default: en,es,fr,de)
- `--framework <name>` - i18n framework (react-i18next, i18next, vue-i18n)

#### `npm run i18ntk:analyze`
**Description:** Analyze translation completeness across all languages  
**Usage:** `npm run i18ntk:analyze [options]`  
**Options:**
- `--detailed` - Show detailed analysis
- `--output <format>` - Output format (json, csv, html)
- `--threshold <number>` - Completion threshold percentage

#### `npm run i18ntk:validate`
**Description:** Validate translation files for syntax and consistency  
**Usage:** `npm run i18ntk:validate [options]`  
**Options:**
- `--strict` - Enable strict validation mode
- `--fix` - Auto-fix common issues
- `--format <type>` - Validation format (json, yaml)

#### `npm run i18ntk:usage`
**Description:** Check translation key usage in source code  
**Usage:** `npm run i18ntk:usage [options]`  
**Options:**
- `--unused` - Show only unused keys
- `--missing` - Show only missing keys
- `--source-dir <path>` - Source directory to scan

#### `npm run i18ntk:complete`
**Description:** Complete missing translations using AI or manual input  
**Usage:** `npm run i18ntk:complete [options]`  
**Options:**
- `--auto` - Use automatic translation
- `--language <code>` - Target specific language
- `--provider <name>` - Translation provider (google, deepl, openai)

#### `npm run i18ntk:sizing`
**Description:** Analyze translation sizing and memory usage  
**Usage:** `npm run i18ntk:sizing [options]`  
**Options:**
- `--detailed` - Show detailed sizing analysis
- `--format <type>` - Output format (json, table)
- `--threshold <size>` - Size threshold in bytes

#### `npm run i18ntk:summary`
**Description:** Generate comprehensive project summary report  
**Usage:** `npm run i18ntk:summary [options]`  
**Options:**
- `--format <type>` - Report format (html, pdf, json)
- `--include <sections>` - Comma-separated sections to include

#### `npm run i18ntk:autorun`
**Description:** Run full workflow automation  
**Usage:** `npm run i18ntk:autorun [options]`  
**Options:**
- `--config <path>` - Configuration file path
- `--skip <steps>` - Comma-separated steps to skip

### Debug Commands

#### `npm run i18ntk:debug`
**Description:** Run debug analysis and diagnostics  
**Usage:** `npm run i18ntk:debug [options]`  
**Options:**
- `--verbose` - Enable verbose output
- `--component <name>` - Debug specific component

#### `npm run i18ntk:settings`
**Description:** Manage toolkit settings and configuration  
**Usage:** `npm run i18ntk:settings [options]`  
**Options:**
- `--reset` - Reset to default settings
- `--export <path>` - Export current settings
- `--import <path>` - Import settings from file

## 🔧 Configuration API

### Configuration Files

#### `user-config.json`
**Location:** Project root  
**Purpose:** User-specific configuration settings  

```json
{
  "defaultLanguage": "en",
  "supportedLanguages": ["en", "es", "fr", "de"],
  "sourceDirectory": "./src",
  "localesDirectory": "./locales",
  "framework": "react-i18next",
  "autoTranslate": false,
  "translationProvider": "google",
  "validationStrict": true,
  "reportFormat": "html"
}
```

#### `admin-config.json`
**Location:** Project root  
**Purpose:** Administrative settings and security configuration  

```json
{
  "adminMode": false,
  "securityLevel": "standard",
  "backupEnabled": true,
  "backupRetention": 30,
  "auditLogging": true,
  "apiKeys": {
    "encrypted": true,
    "providers": []
  }
}
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `I18N_SOURCE_DIR` | Source directory path | `./src` | No |
| `I18N_LOCALES_DIR` | Locales directory path | `./locales` | No |
| `I18N_DEFAULT_LANG` | Default language code | `en` | No |
| `I18N_FRAMEWORK` | i18n framework | `react-i18next` | No |
| `I18N_AUTO_TRANSLATE` | Enable auto-translation | `false` | No |
| `GOOGLE_TRANSLATE_API_KEY` | Google Translate API key | - | For auto-translate |
| `DEEPL_API_KEY` | DeepL API key | - | For auto-translate |
| `OPENAI_API_KEY` | OpenAI API key | - | For AI translation |

## 📊 Programmatic API

### Core Classes

#### `I18nManager`
**Description:** Main management class for i18n operations  

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
```

#### `I18nAnalyzer`
**Description:** Translation analysis and reporting  

```javascript
const { I18nAnalyzer } = require('i18n-management-toolkit');

const analyzer = new I18nAnalyzer(config);
const report = await analyzer.generateReport();
```

#### `I18nValidator`
**Description:** Translation validation and quality assurance  

```javascript
const { I18nValidator } = require('i18n-management-toolkit');

const validator = new I18nValidator(config);
const results = await validator.validateAll();
```

### Utility Functions

#### `detectFramework()`
**Description:** Auto-detect i18n framework in project  
**Returns:** `string` - Framework name  

#### `scanSourceFiles(directory)`
**Description:** Scan source files for translation keys  
**Parameters:** `directory` (string) - Directory to scan  
**Returns:** `Array<string>` - Found translation keys  

#### `validateLanguageFile(filePath)`
**Description:** Validate individual language file  
**Parameters:** `filePath` (string) - Path to language file  
**Returns:** `Object` - Validation results  

## 🔒 Security API

### Authentication

#### `AdminAuth`
**Description:** Administrative authentication system  

```javascript
const { AdminAuth } = require('i18n-management-toolkit');

const auth = new AdminAuth();
const isAuthenticated = await auth.verify(credentials);
```

### Security Utils

#### `SecurityUtils`
**Description:** Security utilities and encryption  

```javascript
const { SecurityUtils } = require('i18n-management-toolkit');

// Encrypt sensitive data
const encrypted = SecurityUtils.encrypt(data);

// Decrypt sensitive data
const decrypted = SecurityUtils.decrypt(encrypted);
```

## 📈 Reporting API

### Report Types

| Report Type | Description | Output Formats |
|-------------|-------------|----------------|
| Analysis | Translation completeness analysis | JSON, HTML, CSV |
| Validation | Translation validation results | JSON, HTML |
| Usage | Translation key usage analysis | JSON, HTML, CSV |
| Sizing | Translation file sizing analysis | JSON, HTML |
| Summary | Comprehensive project summary | HTML, PDF, JSON |

### Report Generation

```javascript
const { ReportGenerator } = require('i18n-management-toolkit');

const generator = new ReportGenerator(config);

// Generate analysis report
const analysisReport = await generator.generateAnalysis();

// Generate summary report
const summaryReport = await generator.generateSummary();
```

## 🌐 Internationalization Support

### Supported Languages

- **English (en)** - Default
- **Spanish (es)**
- **French (fr)**
- **German (de)**
- **Russian (ru)**
- **Japanese (ja)**
- **Chinese (zh)**

### UI Language Switching

```javascript
const { UIi18n } = require('i18n-management-toolkit');

const ui = new UIi18n();
ui.setLanguage('es'); // Switch to Spanish
const message = ui.t('common.welcome'); // Get translated message
```

## 🔄 Workflow API

### Automated Workflows

#### Full Analysis Workflow
```javascript
const workflow = {
  steps: [
    'initialize',
    'analyze',
    'validate',
    'checkUsage',
    'generateReport'
  ],
  config: {
    autoFix: true,
    generateSummary: true
  }
};

await manager.runWorkflow(workflow);
```

## 📝 Error Handling

### Error Types

| Error Type | Description | Resolution |
|------------|-------------|------------|
| `ConfigurationError` | Invalid configuration | Check config files |
| `ValidationError` | Translation validation failed | Fix translation files |
| `FileSystemError` | File system access issues | Check permissions |
| `NetworkError` | API/network connectivity | Check internet connection |
| `AuthenticationError` | Authentication failed | Verify credentials |

### Error Handling Example

```javascript
try {
  await manager.analyze();
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.details);
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

## 📚 Examples

### Basic Usage

```javascript
// Initialize and analyze project
const manager = new I18nManager();
await manager.initialize();
const analysis = await manager.analyze();
console.log(`Completion: ${analysis.completionPercentage}%`);
```

### Advanced Configuration

```javascript
const config = {
  sourceDir: './src',
  localesDir: './locales',
  languages: ['en', 'es', 'fr', 'de'],
  framework: 'react-i18next',
  validation: {
    strict: true,
    autoFix: true
  },
  reporting: {
    format: 'html',
    includeCharts: true
  }
};

const manager = new I18nManager(config);
```

---

**Note:** This API reference is maintained for version 1.4.6. For the latest updates, please refer to the [Changelog](../../CHANGELOG.md).