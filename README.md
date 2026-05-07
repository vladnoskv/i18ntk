# i18ntk v3.1.0

Zero-dependency internationalization toolkit for setup, scanning, analysis, validation, usage tracking, translation completion, automatic locale translation, and runtime translation loading.

![i18ntk Logo](https://raw.githubusercontent.com/vladnoskv/i18ntk/main/docs/screenshots/i18ntk-logo-public.PNG)

[![npm version](https://img.shields.io/npm/v/i18ntk.svg?color=brightgreen)](https://www.npmjs.com/package/i18ntk)
[![npm downloads](https://img.shields.io/npm/dt/i18ntk.svg)](https://www.npmjs.com/package/i18ntk)
[![node](https://img.shields.io/badge/node-%3E%3D16-339933)](https://nodejs.org)
[![dependencies](https://img.shields.io/badge/dependencies-0-success)](https://www.npmjs.com/package/i18ntk)
[![license](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![socket](https://socket.dev/api/badge/npm/package/i18ntk/3.1.0)](https://socket.dev/npm/package/i18ntk/overview/3.1.0)

## Upgrade Notice

Versions earlier than `3.1.0` may contain known stability and security issues.
They are considered unsupported for production use. Upgrade to `3.1.0` or newer.

## v3.1.0 - Auto Translate Hardening and Validation Warning Tuning

v3.1.0 improves automatic JSON locale translation through the management menu and the standalone `i18ntk-translate` command. It also reduces noisy validation warnings and added a dedicated settings module for the auto translator.

For the full detailed changelog, see [CHANGELOG.md](./CHANGELOG.md). For migration notes, see [docs/migration-guide-v3.1.0.md](./docs/migration-guide-v3.1.0.md).

## What i18ntk Does

- Zero runtime dependencies
- Interactive and non-interactive project setup
- Translation completeness analysis and usage tracking
- Validation, sizing, and summary reporting
- Missing-key completion and fixer workflows
- Automatic translation of JSON locale files
- Runtime translation helpers for application code
- Support for JS/TS, React, Vue, Angular, and generic projects

## Getting Started

1. Install the package.
2. Run `i18ntk` or `i18ntk --command=init` to initialize the project.
3. Confirm the source language and locale directories.
4. Run `i18ntk --command=analyze` or `i18ntk --command=validate` to inspect translation coverage.
5. Use `i18ntk --command=complete` to fill missing keys when needed.
6. Use `i18ntk --command=translate` or menu option 14 to auto-translate source JSON files.

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
i18ntk --command=translate
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
i18ntk-translate
```

Note: `i18ntk --command=backup` in the manager flow is disabled in current builds.
Use the standalone `i18ntk-backup` executable when backup operations are required.

## Common Flags

- `--source-dir <path>`
- `--i18n-dir <path>`
- `--output-dir <path>`
- `--source-language <code>`
- `--ui-language <code>`
- `--no-prompt`
- `--dry-run`
- `--help`

Auto Translate also supports:

- `--source-lang <code>`
- `--files <pattern>`
- `--preserve-placeholders`
- `--skip-placeholders`
- `--send-placeholders`
- `--batch-size <n>`
- `--progress-interval <n>`
- `--report-file <path>`
- `--report-stdout`

Example:

```bash
i18ntk --command=analyze --source-dir=./src --i18n-dir=./locales --output-dir=./i18ntk-reports
```

## Auto Translate

Interactive menu flow:

```bash
i18ntk
# choose "Auto Translate (Beta)"
```

Direct CLI examples:

```bash
i18ntk-translate locales/en/common.json de
i18ntk-translate locales/en/common.json fr --dry-run --report-stdout
i18ntk-translate locales/en es --files "*.json" --no-confirm --preserve-placeholders
```

The manager flow accepts comma- or space-separated target language codes, or `all` for every configured target language. It previews the first target language with a dry run when enabled, asks for confirmation, then writes translated files under matching target-language directories such as `locales/de/common.json`. By default it preserves placeholders while translating the surrounding text.

See [docs/auto-translate.md](docs/auto-translate.md) for full usage details.

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
  "version": "3.1.0",
  "sourceDir": "./locales",
  "i18nDir": "./locales",
  "outputDir": "./i18ntk-reports",
  "sourceLanguage": "en",
  "defaultLanguages": ["de", "es", "fr", "ru"],
  "englishContentThresholdPercent": 10,
  "allowedEnglishTerms": ["BrandName", "PRODUCT_CODE"],
  "autoTranslate": {
    "protectionEnabled": true,
    "protectionFile": "./i18ntk-auto-translate.json"
  },
  "setup": {
    "completed": true
  }
}
```

See [docs/api/CONFIGURATION.md](docs/api/CONFIGURATION.md) for the full configuration model.

## Docs

- [Documentation Index](https://github.com/vladnoskv/i18ntk/blob/main/docs/README.md)
- [Getting Started](https://github.com/vladnoskv/i18ntk/blob/main/docs/getting-started.md)
- [API Reference](https://github.com/vladnoskv/i18ntk/blob/main/docs/api/API_REFERENCE.md)
- [Configuration Guide](https://github.com/vladnoskv/i18ntk/blob/main/docs/api/CONFIGURATION.md)
- [Runtime API Guide](https://github.com/vladnoskv/i18ntk/blob/main/docs/runtime.md)
- [Auto Translate Guide](https://github.com/vladnoskv/i18ntk/blob/main/docs/auto-translate.md)
- [Scanner Guide](https://github.com/vladnoskv/i18ntk/blob/main/docs/scanner-guide.md)
- [Environment Variables](https://github.com/vladnoskv/i18ntk/blob/main/docs/environment-variables.md)
- [Migration Guide v3.1.0](https://github.com/vladnoskv/i18ntk/blob/main/docs/migration-guide-v3.1.0.md)
- [Migration Guide v3.0.0](https://github.com/vladnoskv/i18ntk/blob/main/docs/migration-guide-v3.0.0.md)
- [Migration Guide v2.6.0](https://github.com/vladnoskv/i18ntk/blob/main/docs/migration-guide-v2.6.0.md)
- [Migration Guide v2.5.1](https://github.com/vladnoskv/i18ntk/blob/main/docs/migration-guide-v2.5.1.md)

## Community

- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)
- [Funding](FUNDING.md)

## Code of Conduct

We are committed to providing a friendly, safe and welcoming environment for all. Please read and respect our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
