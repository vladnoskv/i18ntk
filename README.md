# i18ntk v2.1.0

Zero-dependency i18n toolkit for initialization, scanning, analysis, validation, usage tracking, and translation completion.

![i18ntk Logo](docs/screenshots/i18ntk-logo-public.PNG)

[![npm version](https://img.shields.io/npm/v/i18ntk.svg?color=brightgreen)](https://www.npmjs.com/package/i18ntk)
[![npm downloads](https://img.shields.io/npm/dt/i18ntk.svg)](https://www.npmjs.com/package/i18ntk)
[![node](https://img.shields.io/badge/node-%3E%3D16-339933)](https://nodejs.org)
[![dependencies](https://img.shields.io/badge/dependencies-0-success)](https://www.npmjs.com/package/i18ntk)
[![license](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![socket](https://socket.dev/api/badge/npm/package/i18ntk/2.1.0)](https://socket.dev/npm/package/i18ntk/overview/2.1.0)

## Why i18ntk

- Zero runtime dependencies
- Works across JS/TS, React, Vue, Angular, and generic projects
- Supports non-interactive CI runs (`--no-prompt`)
- Includes usage/coverage validation and missing-key completion
- Ships with runtime translation helpers via `i18ntk/runtime`

## Install

```bash
# global (recommended for CLI use)
npm install -g i18ntk

# local
npm install --save-dev i18ntk

# one-off
npx i18ntk --help
```

## Quick Start

```bash
# initialize locales/project settings
i18ntk --command=init

# analyze translation completeness
i18ntk --command=analyze

# validate translation structure/content
i18ntk --command=validate

# complete missing keys
i18ntk --command=complete
```

## Command Model (v2)

Primary CLI:

```bash
i18ntk
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

Standalone executables:

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

## Common Flags

- `--source-dir <path>`
- `--i18n-dir <path>`
- `--output-dir <path>`
- `--source-language <code>`
- `--ui-language <code>`
- `--no-prompt`
- `--dry-run`
- `--help`

## Configuration

i18ntk reads project settings from `.i18ntk-config` in your project root.

Example:

```json
{
  "version": "2.1.0",
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

## Documentation

- [Documentation Index](docs/README.md)
- [API Reference](docs/api/API_REFERENCE.md)
- [Configuration Guide](docs/api/CONFIGURATION.md)
- [Runtime API Guide](docs/runtime.md)
- [Scanner Guide](docs/scanner-guide.md)
- [Environment Variables](docs/environment-variables.md)
- [Migration Guide v2.1.0](docs/migration-guide-v2.1.0.md)
- [Release Runbook](DEVUPDATE.md)

## License

MIT
