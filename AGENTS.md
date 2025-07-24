# 🤖 AI Agent Guidelines for I18N Management Toolkit

## Overview

This document provides essential guidelines for AI agents working with the I18N Management Toolkit. It explains how to properly handle translations, understand the codebase structure, and ensure accurate localization.

## 🔍 Key Search Patterns

### Translation Markers

When working with this codebase, AI agents must search for and understand these critical patterns:

#### 1. `[TRANSLATED]` Markers

**CRITICAL**: Always search the codebase for `[TRANSLATED]` markers. These indicate content that needs translation.

```javascript
// Example patterns to look for:
const message = '[TRANSLATED]Hello, world!';
const error = '[TRANSLATED]File not found';
const status = '[TRANSLATED]Processing complete';
```

**Action Required**: When you find `[TRANSLATED]` markers:
1. Identify the target language from the file path (e.g., `/de/`, `/es/`, `/fr/`, `/ru/`, `/ja/`, `/zh/`)
2. Translate the content into the appropriate native language
3. Remove the `[TRANSLATED]` marker after translation
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

## 📁 File Structure Understanding

### Locale Files Structure
```
locales/
├── en/           # English (source language)
│   ├── common.json
│   ├── auth.json
│   └── errors.json
├── de/           # German translations
├── es/           # Spanish translations
├── fr/           # French translations
├── ru/           # Russian translations
├── ja/           # Japanese translations
└── zh/           # Chinese translations
```

### UI Locale Files
```
ui-locales/
├── en.json       # English UI
├── de.json       # German UI
├── es.json       # Spanish UI
├── fr.json       # French UI
├── ru.json       # Russian UI
├── ja.json       # Japanese UI
└── zh.json       # Chinese UI
```

## 🔧 Translation Workflow for AI Agents

### Step 1: Identify Translation Context
1. Search for `[TRANSLATED]` markers
2. Determine target language from file path
3. Understand the context (UI, error message, documentation, etc.)

### Step 2: Perform Translation
1. Translate content accurately and contextually
2. Maintain technical terminology consistency
3. Consider cultural appropriateness
4. Preserve formatting and placeholders

### Step 3: Validation
1. Remove `[TRANSLATED]` marker
2. Ensure JSON syntax remains valid
3. Verify placeholder variables are preserved
4. Check for consistency with existing translations

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

## 🔍 Search Commands for AI Agents

### Essential Search Patterns
```bash
# Find all translation markers
grep -r "\[TRANSLATED\]" .

# Find specific language files
find . -path "*/de/*" -name "*.json"
find . -path "*/es/*" -name "*.json"

# Find UI locale files
ls ui-locales/*.json

# Search for translation function usage
grep -r "t(\|\$t(\|i18n\.t(" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" .
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

## 🛠️ Tools and Validation

### Validation Commands
```bash
# Validate JSON syntax
node -e "console.log(JSON.parse(require('fs').readFileSync('path/to/file.json', 'utf8')))"

# Check for remaining translation markers
grep -r "\[TRANSLATED\]" locales/

# Run toolkit validation
node 00-manage-i18n.js --command=validate
```

## 📞 Support and Resources

- **Settings Configuration**: See `settings-manager.js` for configuration options
- **Translation Patterns**: Check `processing.translationPatterns` in settings
- **Validation**: Use built-in validation tools in the toolkit
- **Testing**: Run comprehensive tests with `test-complete-system.js`

---

**Remember**: The goal is to provide native, contextually appropriate translations that maintain the technical accuracy and user experience of the original content. Always prioritize clarity and cultural appropriateness over literal translation.