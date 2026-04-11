# 🚀 i18ntk - The Ultra-Fast, Zero-Dependency i18n Translation Toolkit

<div align="center">

![i18ntk Logo](docs/screenshots/i18ntk-logo-public.PNG)

**The fastest and most comprehensive i18n toolkit ever built.**

[![npm version](https://img.shields.io/npm/v/i18ntk.svg?color=brightgreen)](https://www.npmjs.com/package/i18ntk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Performance](https://img.shields.io/badge/Performance-97%25%20Faster-blue.svg)](https://github.com/vladnoskv/i18ntk#performance)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-ZERO-red.svg)](https://github.com/vladnoskv/i18ntk#features)
[![npm downloads](https://img.shields.io/npm/dt/i18ntk.svg)](https://www.npmjs.com/package/i18ntk)
[![GitHub stars](https://img.shields.io/github/stars/vladnoskv/i18ntk?style=social)](https://github.com/vladnoskv/i18ntk)
[![Socket Badge](https://socket.dev/api/badge/npm/package/i18ntk/2.0.4)](https://socket.dev/npm/package/i18ntk/overview/2.0.4)

[📦 Install Now](#-installation) • [⚡ Quick Start](#-quick-start) • [📚 Documentation](#-documentation) • [🎯 Features](#-why-choose-i18ntk)

---

## ⚡ Lightning Fast Performance

**15.38ms** for 200k translation keys • **<2MB** memory usage • **97% faster** than traditional tools

**v2.0.4**

</div>

## 📦 Installation

```bash
# Install globally (recommended)
npm install -g i18ntk

# Or use with npx (no installation required)
npx i18ntk

# Or install locally in your project
npm install i18ntk --save-dev
```

## ⚡ Quick Start

Get your i18n project up and running in **60 seconds**:

```bash
# 1. Install i18ntk
npm install -g i18ntk

# 2. Initialize your project
i18ntk init

# 3. Analyze your translations
i18ntk analyze

# 4. Fix any issues
i18ntk fixer --interactive

# 5. Validate everything
i18ntk validate

# 6. Mangage Mre
```

That's it! Your i18n infrastructure is ready. 🎉

## v2 Command Model

Primary CLI commands:

```bash
i18ntk --command=init
i18ntk --command=analyze
i18ntk --command=validate
i18ntk --command=usage
i18ntk --command=scanner
i18ntk --command=sizing
i18ntk --command=complete
i18ntk --command=summary
i18ntk --command=debug
```

Standalone binaries:

```bash
i18ntk-init
i18ntk-analyze
i18ntk-validate
i18ntk-usage
i18ntk-scanner
i18ntk-sizing
i18ntk-complete
i18ntk-summary
i18ntk-doctor
i18ntk-fixer
i18ntk-backup
```

Backup helper:

```bash
i18ntk-backup --help
i18ntk-backup create ./locales
i18ntk-backup list
i18ntk-backup restore <backup-file>
```

## Common Flags

Most commands support:

- `--source-dir <path>`
- `--i18n-dir <path>`
- `--output-dir <path>`
- `--source-language <code>`
- `--ui-language <code>`
- `--no-prompt`
- `--dry-run`
- `--help`

## Configuration

i18ntk reads project settings from `.i18ntk-config` in the project root.

Example:

```json
{
  "version": "2.0.0",
  "sourceDir": "./locales",
  "i18nDir": "./locales",
  "outputDir": "./i18ntk-reports",
  "sourceLanguage": "en",
  "defaultLanguages": ["de", "es", "fr", "ru"],
  "setup": {
    "completed": true
  }
}
```

## Runtime API

```ts
import { initRuntime, t, setLanguage, getLanguage } from 'i18ntk/runtime';

initRuntime({
  baseDir: './locales',
  language: 'en',
  fallbackLanguage: 'en',
  preload: true
});

console.log(t('common.hello'));
setLanguage('fr');
console.log(getLanguage());
```

## Docs

- [Documentation Index](docs/README.md)
- [API Reference](docs/api/API_REFERENCE.md)
- [Configuration Guide](docs/api/CONFIGURATION.md)
- [Runtime API Guide](docs/runtime.md)
- [Scanner Guide](docs/scanner-guide.md)
- [Environment Variables](docs/environment-variables.md)
- [Migration Guide v2.0.0](docs/migration-guide-v2.0.0.md)
- [Release Runbook](DEVUPDATE.md)

## License

MIT
