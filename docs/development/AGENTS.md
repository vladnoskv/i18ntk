# 🤖 AI Agent Guidelines for I18N Management Toolkit v1.5.0

## Overview

This document provides essential guidelines for AI agents working with the I18N Management Toolkit v1.5.0. It explains how to properly handle translations, understand the enhanced security architecture, and ensure accurate localization with complete console translation support.

## 🆕 Version 1.5.0 Key Features

- **🌐 100% Console Translation Support**: All console output is fully internationalized
- **🔒 Enhanced Admin PIN Security**: Modern encrypted PIN with session-based authentication
- **🛡️ Session Management**: 30-minute timeout with automatic re-authentication
- **📁 Improved Architecture**: Better organized file structure and modular design
- **🔧 Advanced Security**: AES-256-GCM encryption replacing deprecated crypto functions

## 🔍 Key Search Patterns

### Translation Markers

When working with this codebase, AI agents must search for and understand these critical patterns:

#### 1. `[NOT_TRANSLATED]` Markers

**CRITICAL**: Always search the codebase for `[NOT_TRANSLATED]` markers. These indicate content that needs translation.

```javascript
// Example patterns to look for:
const message = '[NOT_TRANSLATED]Hello, world!';
const error = '[TRANSLATED]File not found';
const status = '[TRANSLATED]Processing complete';
```

**Action Required**: When you find `[NOT_TRANSLATED]` markers:
1. Identify the target language from the file path (e.g., `/de/`, `/es/`, `/fr/`, `/ru/`, `/ja/`, `/zh/`)
2. Translate the content into the appropriate native language
3. Remove the `[NOT_TRANSLATED]` marker after translation
4. Ensure cultural and contextual appropriateness

#### 2. Language Detection from File Paths

**File Path Examples**:
- `/locales/de/common.json` → German (Deutsch)
- `/locales/es/auth.json` → Spanish (Español)
- `/locales/fr/validation.json` → French (Français)
- `/locales/ru/errors.json` → Russian (Русский)
- `/locales/ja/messages.json` → Japanese (日本語)
- `/locales/zh/interface.json` → Chinese (中文)
- `/ui-locales/de.json` → German UI translations

#### 3. Translation Key Patterns

```javascript
// Common translation function patterns:
t('key.name')                    // Standard i18next
$t('key.name')                   // Vue i18n
i18n.t('key.name')              // Direct i18next
translate('key.name')            // Custom function
formatMessage({ id: 'key.name' }) // React Intl
```

## 🌍 Language-Specific Guidelines

### German (de)
- Use formal "Sie" form unless context suggests informal "du"
- Compound words should be properly formed
- Technical terms may remain in English if commonly used
- Example: `[TRANSLATED]Settings` → `Einstellungen`

### Spanish (es)
- Use neutral Spanish (avoid regional variants)
- Maintain gender agreement
- Use formal "usted" for professional contexts
- Example: `[TRANSLATED]Welcome` → `Bienvenido/a`

### French (fr)
- Use formal language for professional contexts
- Maintain proper accent marks
- Consider gender agreement for adjectives
- Example: `[TRANSLATED]Configuration` → `Configuration`

### Russian (ru)
- Use appropriate case endings
- Consider formal vs informal contexts
- Maintain Cyrillic script consistency
- Example: `[TRANSLATED]Error` → `Ошибка`

### Japanese (ja)
- Use appropriate politeness levels (keigo)
- Consider context for hiragana vs katakana
- Technical terms may use katakana
- Example: `[TRANSLATED]File` → `ファイル`

### Chinese (zh)
- Use Simplified Chinese unless specified otherwise
- Consider context for technical vs everyday terms
- Maintain consistency in terminology
- Example: `[TRANSLATED]Settings` → `设置`

## 📁 File Structure Understanding (v1.5.0)

### Core Architecture
```
i18n-management-toolkit/
├── main/                    # Core i18ntk scripts
│   ├── i18ntk-analyze.js   # Translation analysis
│   ├── i18ntk-autorun.js   # Automated workflow
│   ├── i18ntk-complete.js  # Complete missing translations
│   ├── i18ntk-init.js      # Initialize i18n setup
│   ├── i18ntk-manage.js    # Main management interface
│   ├── i18ntk-sizing.js    # Generate sizing reports
│   ├── i18ntk-summary.js   # Generate summary reports
│   ├── i18ntk-usage.js     # Analyze translation usage
│   ├── i18ntk-validate.js  # Validate translations
│   └── i18ntk-ui.js        # UI internationalization helper
├── utils/                   # Utility scripts and helpers
│   ├── admin-auth.js       # Admin authentication (legacy)
│   ├── admin-cli.js        # Admin command-line interface
│   ├── admin-pin.js        # Enhanced PIN security system
│   ├── i18n-helper.js      # i18n utility functions
│   ├── native-translations.js # Native translation replacer
│   ├── security.js         # Security utilities
│   └── [other utilities]   # Language validation, testing tools
├── settings/                # Configuration management
│   ├── settings-manager.js # Main settings manager
│   ├── settings-cli.js     # Settings command-line interface
│   ├── i18ntk-config.json  # User configuration
│   ├── admin-config.json   # Admin configuration
│   └── backups/            # Configuration backups
├── dev/                     # Development and debugging tools
│   ├── debug/              # Debug utilities and analyzers
│   └── tests/              # Test suite
├── docs/                    # Comprehensive documentation
│   ├── api/                # API documentation
│   ├── development/        # Development guides
│   └── reports/            # Report documentation
└── ui-locales/             # Toolkit's UI translations (7 languages)
    ├── en.json             # English (source)
    ├── de.json             # German
    ├── es.json             # Spanish
    ├── fr.json             # French
    ├── ru.json             # Russian
    ├── ja.json             # Japanese
    └── zh.json             # Chinese
```

### Project Locale Files Structure
```
locales/                     # Your project's translation files
├── en/                      # English (source language)
│   ├── common.json
│   ├── auth.json
│   └── pagination.json
├── de/                      # German translations
├── es/                      # Spanish translations
├── fr/                      # French translations
└── ru/                      # Russian translations
```

### Security Architecture
```
settings/
├── admin-pin.json          # Encrypted PIN storage (AES-256-GCM)
├── admin-config.json       # Admin configuration
└── i18ntk-config.json      # User preferences

utils/
├── admin-pin.js            # Enhanced PIN security with session management
├── admin-auth.js           # Legacy authentication (deprecated)
└── security.js             # Security utilities
```

## 🔧 Enhanced Translation Workflow for AI Agents (v1.5.0)

### Step 1: Comprehensive Analysis & Detection
1. Search for `[NOT_TRANSLATED]` markers in project files
2. Run `node dev/debug/console-key-checker.js` to identify missing UI translations
3. Use `node main/i18ntk-analyze.js` for detailed translation analysis
4. Determine target language from file path context
5. Understand the context (UI, console output, error message, documentation, etc.)

### Step 2: Automated Translation Processing
1. Use `node utils/native-translations.js` to replace `[NOT_TRANSLATED]` placeholders
2. Translate content accurately and contextually
3. Maintain technical terminology consistency across all 7 supported languages
4. Consider cultural appropriateness and formality levels
5. Preserve formatting, variables, and special characters

### Step 3: Advanced Validation & Quality Assurance
1. Remove `[NOT_TRANSLATED]` markers after translation
2. Use `node main/i18ntk-validate.js` for comprehensive integrity checks
3. Run `node main/i18ntk-usage.js` to analyze translation usage patterns
4. Ensure JSON syntax remains valid across all files
5. Verify placeholder variables are preserved (e.g., `{{variable}}`)
6. Check for consistency with existing translations
7. Generate reports with `node main/i18ntk-summary.js` and `node main/i18ntk-sizing.js`

### Step 4: Security & Session Management
1. Use enhanced admin PIN system for secure access to management tools
2. Session-based authentication with 30-minute timeout
3. Encrypted configuration storage with AES-256-GCM
4. Secure backup and restore functionality

## 🚨 Critical Rules

### DO:
- ✅ Always search for `[TRANSLATED]` markers
- ✅ Identify language from file path context
- ✅ Maintain JSON structure and syntax
- ✅ Preserve placeholder variables (e.g., `{{variable}}`)
- ✅ Use appropriate formality level for context
- ✅ Maintain consistency with existing translations

### DON'T:
- ❌ Translate technical configuration keys
- ❌ Modify JSON structure or syntax
- ❌ Remove or alter placeholder variables
- ❌ Use machine translation without context consideration
- ❌ Mix languages within the same file
- ❌ Leave `[TRANSLATED]` markers after translation

## 🔍 Enhanced Search Commands for AI Agents (v1.5.0)

### Essential Search Patterns
```bash
# Find all translation markers (updated for v1.5.0)
grep -r "\[NOT_TRANSLATED\]" .
grep -r "\[TRANSLATED\]" .

# Find specific language files in project locales
find . -path "*/locales/de/*" -name "*.json"
find . -path "*/locales/es/*" -name "*.json"
find . -path "*/locales/fr/*" -name "*.json"
find . -path "*/locales/ru/*" -name "*.json"
find . -path "*/locales/ja/*" -name "*.json"
find . -path "*/locales/zh/*" -name "*.json"

# Find UI locale files (toolkit's own translations)
ls ui-locales/*.json

# Search for translation function usage
grep -r "t(\|\$t(\|i18n\.t(" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" .

# Check for English text in foreign language files
grep -r "[a-zA-Z]" locales/de/ --include="*.json" | grep -v "\"[a-zA-Z]*\":"
grep -r "[a-zA-Z]" locales/es/ --include="*.json" | grep -v "\"[a-zA-Z]*\":"
```

### V1.5.0 Diagnostic Commands
```bash
# Run comprehensive translation analysis
node main/i18ntk-analyze.js

# Check for missing console translations
node dev/debug/console-key-checker.js

# Validate all translations
node main/i18ntk-validate.js

# Generate translation usage report
node main/i18ntk-usage.js

# Create summary and sizing reports
node main/i18ntk-summary.js
node main/i18ntk-sizing.js

# Replace [NOT_TRANSLATED] placeholders
node utils/native-translations.js

# Complete missing translations workflow
node main/i18ntk-complete.js
```

## 📝 Example Translation Process

### Before Translation
```json
{
  "welcome": "[TRANSLATED]Welcome to the application",
  "error": {
    "fileNotFound": "[TRANSLATED]File {{filename}} not found",
    "invalidInput": "[TRANSLATED]Please enter a valid value"
  }
}
```

### After Translation (German)
```json
{
  "welcome": "Willkommen in der Anwendung",
  "error": {
    "fileNotFound": "Datei {{filename}} nicht gefunden",
    "invalidInput": "Bitte geben Sie einen gültigen Wert ein"
  }
}
```

## 🛠️ Enhanced Tools and Validation (v1.5.0)

### Core Validation Commands
```bash
# Validate JSON syntax
node -e "console.log(JSON.parse(require('fs').readFileSync('path/to/file.json', 'utf8')))"

# Check for remaining translation markers
grep -r "\[NOT_TRANSLATED\]" locales/
grep -r "\[TRANSLATED\]" locales/

# Run comprehensive toolkit validation
node main/i18ntk-validate.js

# Main management interface
node main/i18ntk-manage.js
```

### Security and Authentication
```bash
# Access admin features (requires PIN)
node utils/admin-cli.js

# Settings management with enhanced security
node settings/settings-manager.js
node settings/settings-cli.js
```

### Advanced Analysis Tools
```bash
# Complete workflow automation
node main/i18ntk-autorun.js

# Initialize new i18n projects
node main/i18ntk-init.js

# Debug and development tools
node dev/debug/console-key-checker.js
```

## 📞 Support and Resources (v1.5.0)

- **Enhanced Security**: Modern AES-256-GCM encryption with session management
- **Settings Configuration**: See `settings/settings-manager.js` for advanced configuration options
- **Admin Authentication**: Enhanced PIN system with `utils/admin-pin.js`
- **Translation Patterns**: Check `processing.translationPatterns` in settings
- **Validation**: Use built-in validation tools with comprehensive reporting
- **Console Translation**: 100% internationalized console output
- **Documentation**: Comprehensive docs in `docs/` directory
- **Development Tools**: Advanced debugging utilities in `dev/debug/`

---

**Remember**: The goal is to provide native, contextually appropriate translations that maintain the technical accuracy and user experience of the original content. Always prioritize clarity and cultural appropriateness over literal translation.