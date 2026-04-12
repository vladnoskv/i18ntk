# i18ntk v2.3.5

Zero-dependency internationalization toolkit for setup, scanning, analysis, validation, usage tracking, and translation completion.

![i18ntk Logo](docs/screenshots/i18ntk-logo-public.PNG)

[![npm version](https://img.shields.io/npm/v/i18ntk.svg?color=brightgreen)](https://www.npmjs.com/package/i18ntk)
[![npm downloads](https://img.shields.io/npm/dt/i18ntk.svg)](https://www.npmjs.com/package/i18ntk)
[![node](https://img.shields.io/badge/node-%3E%3D16-339933)](https://nodejs.org)
[![dependencies](https://img.shields.io/badge/dependencies-0-success)](https://www.npmjs.com/package/i18ntk)
[![license](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![socket](https://socket.dev/api/badge/npm/package/i18ntk/2.3.5)](https://socket.dev/npm/package/i18ntk/overview/2.3.5)

## Upgrade Notice

Versions earlier than `2.3.5` may contain known stability and security issues.
They are considered unsupported for production use. Upgrade to `2.3.5` or newer.
The CLI can check npm registry metadata and warn when your installed version is out of date.
Set `I18NTK_ENABLE_UPDATE_CHECK=true` to enable this behavior.
Set `I18NTK_DISABLE_UPDATE_CHECK=true` to force-disable it in restricted/offline environments.
Set `I18NTK_DISABLE_AUTOSAVE=1` in server/runtime environments to keep config in memory and skip disk writes.

## What i18ntk Does

- Zero runtime dependencies
- Interactive and non-interactive project setup
- Translation completeness analysis and usage tracking
- Validation, sizing, and summary reporting
- Missing-key completion and fixer workflows
- Runtime translation helpers for application code
- Support for JS/TS, React, Vue, Angular, and generic projects

## Getting Started

1. Install the package.
2. Run `i18ntk` or `i18ntk --command=init` to initialize the project.
3. Confirm the source language and locale directories.
4. Run `i18ntk --command=analyze` or `i18ntk --command=validate` to inspect translation coverage.
5. Use `i18ntk --command=complete` to fill missing keys when needed.

The full onboarding flow is documented in [docs/getting-started.md](docs/getting-started.md).

## Install

```bash
# global CLI use
npm install -g i18ntk

# local project use
npm install --save-dev i18ntk

# one-off execution
npx i18ntk --help
```

## Setup

The toolkit stores project configuration in `.i18ntk-config` at the project root.

Recommended setup flow:

```bash
i18ntk
# or
i18ntk --command=init
```

During setup, you can define:

- source directory
- source language
- UI language
- framework preference
- output directory
- backup behavior

If you run in CI or a non-interactive shell, use:

```bash
i18ntk --command=init --no-prompt
```

## Daily Use

```bash
i18ntk --command=analyze
i18ntk --command=validate
i18ntk --command=usage
i18ntk --command=scanner
i18ntk --command=sizing
i18ntk --command=complete
i18ntk --command=summary
```

Standalone commands are also available:

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

Example:

```bash
i18ntk --command=analyze --source-dir=./src --i18n-dir=./locales --output-dir=./i18ntk-reports
```

## Runtime API

Use `i18ntk/runtime` when your application needs to read locale JSON files at runtime.

```js
const runtime = require('i18ntk/runtime');

runtime.initRuntime({
  baseDir: './locales',
  language: 'en',
  fallbackLanguage: 'en',
  keySeparator: '.',
  preload: true
});

console.log(runtime.t('common.hello'));
runtime.setLanguage('fr');
console.log(runtime.getLanguage());
console.log(runtime.getAvailableLanguages());
runtime.refresh('fr');
```

For a deeper walkthrough, see [docs/runtime.md](docs/runtime.md).

## Configuration

Example `.i18ntk-config`:

```json
{
  "version": "2.3.5",
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

See [docs/api/CONFIGURATION.md](docs/api/CONFIGURATION.md) for the full configuration model.

## Docs

- [Documentation Index](docs/README.md)
- [Getting Started](docs/getting-started.md)
- [API Reference](docs/api/API_REFERENCE.md)
- [Configuration Guide](docs/api/CONFIGURATION.md)
- [Runtime API Guide](docs/runtime.md)
- [Scanner Guide](docs/scanner-guide.md)
- [Environment Variables](docs/environment-variables.md)
- [Migration Guide v2.3.5](docs/migration-guide-v2.3.5.md)
- [Optimization Prompt](docs/development/package-optimization-prompt.md)

## License

MIT
