# 🤖 AI Agent Guidelines for I18N Management Toolkit v1.7.4

## Overview

This document provides essential guidelines for AI agents working with the I18N Management Toolkit v1.6.0. It explains how to properly handle translations, understand the enhanced security architecture, and ensure accurate localization with complete console translation support.

## 🆕 Version 1.7.4 Key Features 

- **🚀 Extreme-Performance Optimizations**: 97% cumulative speed improvements across the toolkit
- **🎯 Interactive Locale Optimizer**: Selectively include locales with real-time size impact
- **🛠 Interactive Translation Fixer**: Mass fix broken translations with custom placeholder markers
- **🔒 Expanded Security & Sanitization**: Comprehensive validation of inputs and translation keys
- **📊 Performance Benchmarking Suite**: Automated regression detection with JSON metrics
- **🌍 7-Language UI Support**: Complete console translations for all major commands

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

## 📁 File Structure Understanding (v1.7.4)

### Core Architecture
```
i18n-management-toolkit/
├── main/                    # Core i18ntk scripts
│   ├── i18ntk-analyze.js   # Translation analysis
│   ├── i18ntk-autorun.js   # Automated workflow
│   ├── i18ntk-complete.js  # Complete missing translations
│   ├── i18ntk-fixer.js     # Interactive translation fixer
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
│   ├── .i18ntk-config  # User configuration
│   ├── admin-config.json   # Admin configuration
│   └── backups/            # Configuration backups
├── dev/                     # Development and debugging tools
│   ├── debug/              # Debug utilities and analyzers
│   └── tests/              # Test suite
├── docs/                    # Comprehensive documentation
│   ├── api/                # API documentation
│   ├── development/        # Development guides
│   └── reports/            # Report documentation
├── benchmarks/             # Automated performance benchmarking suite
├── scripts/                # Helper scripts (locale optimizer, etc.)
└── ui-locales/             # Toolkit's UI translations (8 languages)
    ├── en.json             # English (source)
    ├── de.json             # German
    ├── es.json             # Spanish
    ├── fr.json             # French
    ├── ru.json             # Russian
    ├── ja.json             # Japanese
    ├── zh.json             # Chinese
    └── pt.json             # Portuguese
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
└── .i18ntk-config      # User preferences

utils/
├── admin-pin.js            # Enhanced PIN security with session management
├── admin-auth.js           # Legacy authentication (deprecated)
└── security.js             # Security utilities
```

## 🔧 Enhanced Translation Workflow for AI Agents (v1.6.0)

### Step 1: Comprehensive Analysis & Detection
1. Search for `[NOT_TRANSLATED]` markers in project files
2. Run `node dev/debug/console-key-checker.js` to identify missing UI translations
3. Use `node main/i18ntk-analyze.js` for detailed translation analysis
4. Use `node main/i18ntk-fixer.js --interactive` for interactive fixing of broken translations
5. Execute performance diagnostics with `npm run benchmark` when investigating speed issues
6. Determine target language from file path context
7. Understand the context (UI, console output, error message, documentation, etc.)

### Step 2: Automated Translation Processing
1. Use `node main/i18ntk-fixer.js --markers [custom-marker] --languages [lang1,lang2]` for mass fixing
2. Use `node utils/native-translations.js` to replace `[NOT_TRANSLATED]` placeholders
3. Translate content accurately and contextually
4. Maintain technical terminology consistency across all 8 supported languages
5. Consider cultural appropriateness and formality levels
6. Preserve formatting, variables, and special characters
7. Use `node utils/locale-optimizer.js --interactive` when adjusting included locales

### Step 3: Advanced Validation & Quality Assurance
1. Remove `[NOT_TRANSLATED]` markers after translation
2. Use `node main/i18ntk-validate.js` for comprehensive integrity checks
3. Run `node main/i18ntk-usage.js` to analyze translation usage patterns
4. Ensure JSON syntax remains valid across all files
5. Verify placeholder variables are preserved (e.g., `{{variable}}`)
6. Check for consistency with existing translations
7. Generate reports with `node main/i18ntk-summary.js` and `node main/i18ntk-sizing.js`
8. Validate configuration with `i18ntk --validate-config`

### Step 4: Security & Session Management
1. Use enhanced admin PIN system for secure access to management tools
2. Session-based authentication with 30-minute timeout
3. Encrypted configuration storage with AES-256-GCM
4. Secure backup and restore functionality

## 🚨 Critical Rules

### DO:
- ✅ Always search for country codes like [GB], [ES], [FR], [RU], [JA], [ZH]`[NOT TRANSLATED]` markers
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
- ❌ Leave `[NOT TRANSLATED]` markers after translation


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

**Remember**: The goal is to provide native, contextually appropriate translations that maintain the technical accuracy and user experience of the original content. Always prioritize clarity and cultural appropriateness over literal translation.
