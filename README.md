# i18ntk v2.0.3

<div align="center">

![i18ntk Logo](docs/screenshots/i18ntk-logo-public.PNG)

[![npm version](https://img.shields.io/npm/v/i18ntk.svg)](https://www.npmjs.com/package/i18ntk)
[![npm downloads](https://img.shields.io/npm/dt/i18ntk.svg)](https://www.npmjs.com/package/i18ntk)
[![node](https://img.shields.io/badge/node-%3E%3D16-339933)](https://nodejs.org)
[![dependencies](https://img.shields.io/badge/dependencies-0-success)](https://www.npmjs.com/package/i18ntk)
[![license](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![Socket Badge](https://badge.socket.dev/npm/package/i18ntk/2.0.3)](https://badge.socket.dev/npm/package/i18ntk/2.0.3)

Zero-dependency i18n toolkit for initialization, scanning, analysis, validation, and completion workflows.

</div>

## Install

```bash
npm install -g i18ntk
```

## Quick Start

```bash
# interactive menu
i18ntk

# direct workflow
i18ntk --command=init
i18ntk --command=analyze --no-prompt
i18ntk --command=validate --no-prompt
i18ntk --command=complete --no-prompt
```

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
