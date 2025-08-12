# 🌍 i18ntk - The Ultimate i18n Translation Management Toolkit

![i18ntk Logo](docs/screenshots/i18ntk-logo-public.PNG)

**Version:** 1.8.2
**Last Updated:** 2025-08-12  
**GitHub Repository:** [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)

[![npm](https://img.shields.io/npm/dt/i18ntk.svg)](https://www.npmjs.com/package/i18ntk) [![npm version](https://badge.fury.io/js/i18ntk.svg)](https://badge.fury.io/js/i18ntk) [![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/) [![Downloads](https://img.shields.io/npm/dm/i18ntk.svg)](https://www.npmjs.com/package/i18ntk) [![GitHub stars](https://img.shields.io/github/stars/vladnoskv/i18ntk?style=social)](https://github.com/vladnoskv/i18ntk) [![Socket Badge](https://socket.dev/api/badge/npm/package/i18ntk/1.8.2)](https://socket.dev/npm/package/i18ntk/overview/1.8.2)

**🚀 The fastest way to manage translations across any framework or vanilla JavaScript projects**

**Framework Support:** Auto-detects popular libraries (React i18next, Vue i18n, i18next, Nuxt i18n, Svelte i18n) or works without a framework. i18ntk manages translation files and validation—it does NOT implement translation logic like i18next or Vue i18n.

> **v1.8.0** – **SAFER WORKFLOW** - Autorun workflow removed for enhanced safety. Enhanced Interactive Translation Fixer Tool with improved automatic detection, selective language/file fixing, mass fix capabilities, and 7-language UI support; enhanced security logging, flexible 4-6 digit PIN authentication, configuration stability improvements, and CI/CD silent mode support; maintains 97% speed improvement.

## 🚀 Quick Start

```bash
# Install globally
npm i i18ntk

# Interactive setup
npx i18ntk

# Basic commands
i18ntk analyze --source ./src
i18ntk complete --source ./src
i18ntk validate --source ./locales
```

---

## ⚡ Performance

| Mode              | Time (200k keys) | Memory | Package Size |
| ----------------- | ---------------- | ------ | ------------ |
| **Ultra‑Extreme** | **15.38ms**      | 1.62MB | 115KB–830KB  |
| **Extreme**       | 38.90ms          | 0.61MB | 115KB–830KB  |
| Ultra             | 336.8ms          | 0.64MB | Configurable |
| Optimized         | 847.9ms          | 0.45MB | Full package |

> Benchmarks are internal; actual results vary by CPU, filesystem, and dataset.

---

## 🎯 Highlights

- **NEW in 1.8.0:** **SAFER WORKFLOW** - Autorun workflow removed for enhanced safety and configuration protection.
- **Enhanced Interactive Translation Fixer:** Improved automatic detection with guided flows, selective language/file fixing, mass fix capabilities, and 7-language UI support.
- **Ultra‑Extreme performance:** 97% speed improvement — **15.38ms** for 200k keys.
- **Security & Privacy:** PIN protection with AES‑256‑GCM; strict path and input validation.
- **Sizing tools:** Interactive locale optimizer (up to **86%** size reduction) and reports.
- **Zero dependencies:** Lightweight, production‑ready.
- **Watch helper:** Optional `--watch` keeps translations in sync.
- **Framework‑agnostic:** Works with React, Vue, Svelte, Nuxt, i18next, or plain JSON.
- **Scale:** Linear scaling up to 5M keys/second with ultra‑extreme settings.
- **Script-by-Script Safety:** Manual execution ensures proper setup before each operation.
- **Framework fingerprints:** Auto-detects i18next, Lingui, and FormatJS projects to apply sensible defaults.
- **Plugin architecture:** Optional extractor and format adapters enable AST parsing or YAML/ICU support without extra deps.

---

## 🛡️ Security in 1.8.0+

### Summary

- **Zero Shell Access:** Removed `execSync`, `spawnSync`, and related calls from production paths.
- **Direct FS APIs:** Replaced shell calls with safe `fs`/`path` operations.
- **Path Safety:** Normalization + traversal prevention on all file inputs.
- **Input Validation:** Sanitization on CLI flags and config values.
- **Session Security:** PIN‑protected admin operations, session timeout, exponential backoff.
- **Encrypted Backups:** AES‑256‑GCM for stored PIN and backups.

### Before → After

| Area                  | Before (risk)                | After (1.7.5+)                    |
| --------------------- | ---------------------------- | --------------------------------- |
| Shell execution       | Possible via `child_process` | **Removed entirely**              |
| File ops              | Mixed shell + Node           | **Node fs/path only**             |
| Input & path handling | Inconsistent in edge cases   | **Validated + normalized**        |
| Admin controls        | Optional PIN                 | **PIN + cooldown + timeout**      |
| Backups               | Plain backups possible       | **AES‑256‑GCM encrypted backups** |

> **Verification tip:** `grep -R "child_process" node_modules/i18ntk` should return nothing in 1.7.5 production code.

**Backward compatibility:** No breaking changes expected; commands and outputs are unchanged except for safer internals.

---

## 📸 Screenshots

| **Framework Detection** | **Main Menu** |
|:-----------------------:|:-------------:|
| ![Framework Detection](docs/screenshots/I18NTK-FRAMEWORK.PNG) | ![Main Menu](docs/screenshots/I18NTK-INIT.PNG) |

| **Initialization** | **Init Summary** |
|:------------------:|:----------------:|
| ![Initialization](docs/screenshots/I18NTK-INIT.PNG) | ![Init Summary](docs/screenshots/I18NTK-INIT-SUMMARY.PNG) |

| **Language Selection** | **Language Changed** |
|:----------------------:|:--------------------:|
| ![Language Selection](docs/screenshots/I18NTK-INIT-LANG-SELECT.PNG) | ![Language Changed](docs/screenshots/I18NTK-LANGUAGE-UI-CHANGED.PNG) |

| **Settings Manager (v1.8.2)** | **Translation Fixer (v1.8.2)** |
|:-----------------------------:|:-------------------------------:|
| ![Settings Manager](docs/screenshots/I18NTK-SETTINGS.PNG) | ![Translation Fixer](docs/screenshots/I18NTK-FIXER.PNG) |

| **Analyze** | **Complete** |
|:-----------:|:------------:|
| ![Analyze](docs/screenshots/I18NTK-ANALYZE.PNG) | ![Complete](docs/screenshots/I18NTK-COMPLETE.PNG) |

| **Sizing (Overview)** | **Sizing (List)** |
|:---------------------:|:-----------------:|
| ![Sizing](docs/screenshots/I18NTK-SIZING.PNG) | ![Sizing List](docs/screenshots/I18NTK-SIZING-LIST.PNG) |
## 📊 Commands

| Command    | Purpose                         | Example                                  |
| ---------- | ------------------------------- | ---------------------------------------- |
| `init`     | Setup project                   | `i18ntk init --interactive`              |
| `analyze`  | Find missing translations       | `i18ntk analyze --source ./src`          |
| `complete` | Generate translations           | `i18ntk complete --config=ultra-extreme` |
| `validate` | Check translation quality       | `i18ntk validate --strict`               |
| `sync`     | Sync across languages           | `i18ntk sync --languages en,es,fr`       |
| `usage`    | Analyze usage patterns          | `i18ntk usage --format=json`             |
| `doctor`   | Diagnose configuration issues   | `i18ntk doctor`                          |
| `sizing`   | Optimize package size           | `i18ntk sizing --interactive`            |
| `fixer`    | **Enhanced:** Fix broken translations/markers | `i18ntk fixer --interactive`             |

---

## Exit Codes

| Code | Meaning |
| ---- | ------- |
| 0 | Success |
| 1 | Handled configuration error |
| 2 | Validation failed |
| 3 | Security violation |

---

## 🔒 Safer Workflow (NEW in v1.8.0)

**Enhanced security through manual script execution:**

- **Autorun workflow removed** for enhanced safety and configuration protection
- **Script-by-script safety** - Each operation requires explicit user initiation
- **Enhanced validation** - All operations validated before execution
- **Improved security logging** - Comprehensive audit trail for all operations
- **Manual review encouraged** - Users maintain full control over each step

**Migration from previous versions:**
- The `workflow` command has been removed for security reasons
- Use individual commands (`analyze`, `validate`, `fixer`) for safer operations
- Enhanced fixer tool provides guided workflows for common tasks
- All previous functionality remains available through safer individual commands

---

## 🔧 Configuration

Create `settings/i18ntk-config.json` (auto‑generated by `init`):

```json
{
  "version": "1.8.0",
  "sourceDir": "./locales",
  "outputDir": "./i18ntk-reports",
  "defaultLanguage": "en",
  "supportedLanguages": ["en", "es", "fr", "de", "ja", "ru", "zh"],
  "performance": {
    "mode": "ultra-extreme",
    "batchSize": 2000,
    "concurrency": 32,
    "memoryLimit": "256MB",
    "streaming": true,
    "compression": "brotli"
  },
  "security": {
    "adminPinEnabled": true,
    "sessionTimeout": 30,
    "maxFailedAttempts": 3
  },
  "backup": {
    "enabled": true,
    "retentionDays": 30,
    "maxBackups": 100
  }
}
```

Define per-language placeholder patterns with `placeholderStyles` to ensure placeholder parity across translations:

```json
"placeholderStyles": {
  "en": ["\\{\\{[^}]+\\}\\}"],
  "de": ["%s"],
  "fr": ["{\\d+}"]
}
```

### Environment Variables

You can override paths with environment variables:

| Variable              | Overrides     | Description                          |
| --------------------- | ------------- | ------------------------------------ |
| `I18NTK_PROJECT_ROOT` | `projectRoot` | Base project directory               |
| `I18NTK_SOURCE_DIR`   | `sourceDir`   | Location of source translation files |
| `I18NTK_I18N_DIR`     | `i18nDir`     | Working i18n directory               |
| `I18NTK_OUTPUT_DIR`   | `outputDir`   | Output directory for reports         |

**Precedence:** CLI flags ⟶ environment vars ⟶ config file defaults.

---

## 🔧 Enhanced Translation Fixer (v1.8.0)

Interactive tool with improved automatic detection to locate and repair placeholders such as `{{NOT_TRANSLATED}}`, `__UNTRANSLATED__`, or custom markers.

**Enhanced Features:**
- **Improved Auto-Detection:** Smarter detection of broken translations and markers
- **Selective Fixing:** Choose specific languages or files to fix
- **Mass Fix Capabilities:** Fix all broken translations at once
- **7-Language UI Support:** Complete interface in 7 languages
- **Script-by-Script Safety:** Manual execution ensures proper review
- **Enhanced Security:** Creates encrypted backups before any changes

**Examples:**

```bash
# Enhanced guided mode
i18ntk fixer --interactive

# Fix specific languages with custom markers
i18ntk fixer --languages en,es,fr --markers "{{NOT_TRANSLATED}},__MISSING__"

# Target a directory + auto-fix with reporting
i18ntk fixer --source ./src/locales --auto-fix --report

# Detect custom placeholder styles
i18ntk fixer --markers "TODO_TRANSLATE,PLACEHOLDER_TEXT,MISSING_TRANSLATION"

# Fix all available languages (default markers)
i18ntk fixer --languages all
```

**Interactive flow:**

- Welcome & help panel with 7-language support
- Enhanced marker configuration (built‑in + custom)
- Language and directory selection with smart filtering
- Preview & confirmation with detailed change overview
- Real‑time progress + comprehensive stats
- Report generation (before/after, per‑file, per‑language, security log)

---

## 🌍 Locale Size Optimizer

```bash
# Interactive selection
node scripts/locale-optimizer.js --interactive

# Keep specific languages
node scripts/locale-optimizer.js --keep en,es,de

# Restore all languages
node scripts/locale-optimizer.js --restore

# List sizes
node scripts/locale-optimizer.js --list
```

> **Result:** Reduce UI locale bundle size by up to **86%** (e.g., 830.4KB → 115.3KB for English‑only).

---

## 🏗️ Integration Examples

### React

```bash
# Extract from React components
i18ntk extract --source ./src --framework react
```

```js
// i18next setup (example)
import i18n from './i18n';
import i18next from 'i18next';
i18next.init({ resources: i18n, lng: 'en' });
```

### Vue

```bash
# Extract from Vue components
i18ntk extract --source ./src --framework vue
```

```js
// vue-i18n setup (example)
import { createI18n } from 'vue-i18n';
const i18n = createI18n({ locale: 'en', messages: translations });
```

---

## 📁 Project Structure for local package development

```
your-project/
├── src/
│   └── components/
├── locales/           # Translation files
│   ├── en.json
│   ├── es.json
│   └── ...
├── i18ntk-reports/    # Generated reports
└── settings/          # Configuration directory
    └── i18ntk-config.json  # Main configuration file
```

## 🚨 Important Notes

- Locale files are **auto‑backed up** before optimization.
- Prefer the **interactive optimizer** for safe locale management.
- Versions **prior to 1.7.1** are deprecated.
- Upgrades apply improvements automatically; no migration steps required for 1.7.5.

---

## 🤝 Contributing & Support

- **Issues:** [GitHub Issues](https://github.com/vladnoskv/i18ntk/issues)
- **Docs:** `./docs` (full walkthroughs and examples)
- **Benchmarks:** `./benchmarks/results`
- **Version:** `i18ntk --version`

**Made for the global dev community.** ❤️
