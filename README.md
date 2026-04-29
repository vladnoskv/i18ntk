# i18ntk v2.5.1

Zero-dependency internationalization toolkit for setup, scanning, analysis, validation, usage tracking, and translation completion.

![i18ntk Logo](https://raw.githubusercontent.com/vladnoskv/i18ntk/main/docs/screenshots/i18ntk-logo-public.PNG)

[![npm version](https://img.shields.io/npm/v/i18ntk.svg?color=brightgreen)](https://www.npmjs.com/package/i18ntk)
[![npm downloads](https://img.shields.io/npm/dt/i18ntk.svg)](https://www.npmjs.com/package/i18ntk)
[![node](https://img.shields.io/badge/node-%3E%3D16-339933)](https://nodejs.org)
[![dependencies](https://img.shields.io/badge/dependencies-0-success)](https://www.npmjs.com/package/i18ntk)
[![license](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![socket](https://socket.dev/api/badge/npm/package/i18ntk/2.5.1)](https://socket.dev/npm/package/i18ntk/overview/2.5.1)

## Upgrade Notice

Versions earlier than `2.5.1` may contain known stability and security issues.
They are considered unsupported for production use. Upgrade to `2.5.1` or newer.

## v2.5.1 Security Update

`v2.5.1` is a security and packaging-process update for the `2.5.x` release line.

### Change Summary

- Hardened `utils/admin-auth.js` so `verifyPin()` fails closed when admin config is missing, disabled, or malformed.
- Hardened auth-required checks so enabled PIN protection does not silently bypass authentication when admin config is unusable.
- Normalized admin session expiry handling by storing both `expires` and `expiresAt` and cleaning up either format consistently.
- Marked the root `package.json` as development-only and added a separate public manifest flow.
- Added package scripts to stage, pack, and publish the public npm package from `package.public.json`.
- Added a root publish guard via `prepack` and `prepublishOnly` to block accidental publishing of the development manifest.
- Updated ignore rules to exclude release staging artifacts and public package metadata from the repo/package payload.
- Replaced the expanded `SECURITY.md` policy with a shorter reporting-oriented policy and added community docs links.
- Updated docs and release reset automation to use `npm run package:public` instead of `npm pack --dry-run`.

### Files Changed

- `utils/admin-auth.js`: fixed fail-open PIN verification and session expiry consistency.
- `tests/security.test.js`: added admin-auth fail-closed and session cleanup coverage.
- `package.json`: set development-only metadata, adjusted included files, and added public packaging/publish scripts.
- `package.public.json`: introduced the stripped public npm manifest.
- `scripts/build-public-package.js`: added the public package staging, pack, and publish workflow.
- `scripts/prevent-root-publish.js`: added a guard against publishing the root development manifest.
- `scripts/reset-release-state.js`: switched release validation to the public package build flow.
- `README.md`, `docs/README.md`, `docs/development/AGENTS.md`, `docs/migration-guide-v2.5.1.md`, `docs/migration-guide-v2.5.0.md`: documented the security fix, packaging, and community file layout.
- `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `FUNDING.md`: updated or added community and security-facing docs.
- `.gitignore`, `.npmignore`: excluded release staging output and public-package metadata.

### Audit Trail

- Risk addressed: AI-based analysis flagged `verifyPin()` as fail-open when admin config was missing or disabled.
- Behavior change: direct `verifyPin()` calls now return `false` unless a usable enabled PIN config exists.
- Behavior change: when settings require PIN auth but admin config is broken, protected auth checks now require authentication and verification fails closed.
- Risk: the root manifest is intentionally non-publishable, so publishing flows must use the public-package scripts.
- Behavior change: `npm pack` and `npm publish` at the repo root are blocked by guard scripts.
- Behavior change: the public npm payload is staged from `package.public.json` rather than the development manifest.
- Validation note: release-state reset now exercises `npm run package:public` as part of its checks.
- Validation note: this documentation update describes the working tree changes used for the packaging split.

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
  "version": "2.5.1",
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

- [Documentation Index](https://github.com/vladnoskv/i18ntk/blob/main/docs/README.md)
- [Getting Started](https://github.com/vladnoskv/i18ntk/blob/main/docs/getting-started.md)
- [API Reference](https://github.com/vladnoskv/i18ntk/blob/main/docs/api/API_REFERENCE.md)
- [Configuration Guide](https://github.com/vladnoskv/i18ntk/blob/main/docs/api/CONFIGURATION.md)
- [Runtime API Guide](https://github.com/vladnoskv/i18ntk/blob/main/docs/runtime.md)
- [Scanner Guide](https://github.com/vladnoskv/i18ntk/blob/main/docs/scanner-guide.md)
- [Environment Variables](https://github.com/vladnoskv/i18ntk/blob/main/docs/environment-variables.md)
- [Migration Guide v2.5.1](https://github.com/vladnoskv/i18ntk/blob/main/docs/migration-guide-v2.5.1.md)
- [Migration Guide v2.5.0](https://github.com/vladnoskv/i18ntk/blob/main/docs/migration-guide-v2.5.0.md)

## Community

- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)
- [Funding](FUNDING.md)

## Code of Conduct

We are committed to providing a friendly, safe and welcoming environment for all. Please read and respect our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
