# i18ntk v4.6.1

A zero-dependency internationalization toolkit for setup, scanning, analysis, validation, usage tracking, translation completion, automatic JSON locale translation, reporting, and runtime translation loading.

![i18ntk Logo](https://raw.githubusercontent.com/vladnoskv/i18ntk/main/docs/screenshots/i18ntk-logo-public.PNG)

[![npm version](https://img.shields.io/npm/v/i18ntk.svg?color=brightgreen)](https://www.npmjs.com/package/i18ntk)
[![npm downloads](https://img.shields.io/npm/dt/i18ntk.svg)](https://www.npmjs.com/package/i18ntk)
[![node](https://img.shields.io/badge/node-%3E%3D16-339933)](https://nodejs.org)
[![dependencies](https://img.shields.io/badge/dependencies-0-success)](https://www.npmjs.com/package/i18ntk)
[![license](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![socket](https://socket.dev/api/badge/npm/package/i18ntk/4.6.1)](https://socket.dev/npm/package/i18ntk/overview/4.6.1)

[![i18ntk Workbench](https://img.shields.io/badge/VS_Code-Workbench-007ACC?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=VladNoskov.i18ntk-workbench)
[![i18ntk Lens](https://img.shields.io/badge/VS_Code-Lens-007ACC?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=VladNoskov.i18ntk-lens)

## Ecosystem

- **i18ntk** — CLI toolkit and runtime (this package)
- **i18ntk Workbench** — VS Code dashboard, reports, and key management
- **i18ntk Lens** — inline hovers, CodeLens, and diagnostics

## Install

```bash
npm install -g i18ntk
npx i18ntk --help
```

## What's New in 4.6.0

- **25+ framework detections** — Rust, Remix, Gatsby, Astro, Qwik, SolidJS, Ember, React Native, Expo, Ionic added. All drawn from a single centralized detector.
- **Rust support** — Cargo.toml detection and `.rs` file scanning with fluent/gettext-rs framework patterns.
- **File extensions** — `.astro`, `.mdx`, `.mjs`, `.mts`, `.cjs`, `.cts`, `.rs` scanned across all tools.
- **ICU/Fluent placeholder support** — Fluent `$variable` and ICU `{var, plural, ...}` patterns detected.
- **JSX component detection** — `<Trans>`, `<FormattedMessage>`, `<Translate>` components recognized.
- **Health score fix** — No more negative or misleadingly low scores.
- **Centralized architecture** — Framework data, extensions, excludes, and patterns live in one module consumed by all tools.

[Full changelog →](./CHANGELOG.md)

## Quick Start

```bash
i18ntk                                    # interactive menu
i18ntk --command=analyze                  # coverage report
i18ntk --command=validate                 # quality checks
i18ntk --command=usage                    # key usage tracking
i18ntk report --json --out ./reports      # full report
i18ntk --command=complete                 # fill missing keys
i18ntk --command=translate                # auto-translate
i18ntk --command=summary                  # status overview
```

See [docs/getting-started.md](./docs/getting-started.md) for the full onboarding guide.

## Command Reference

| Command     | Purpose                                    | Output                        |
| ----------- | ------------------------------------------ | ----------------------------- |
| `i18ntk`    | Interactive management menu                | —                             |
| `init`      | Setup locale folders and target files      | Locale JSON, `.i18ntk-config` |
| `analyze`   | Translation coverage comparison            | Reports                       |
| `validate`  | Structure, quality, and risk validation    | Summary report                |
| `usage`     | Map keys to source, find dead/missing keys | Usage report                  |
| `report`    | Stable schema report (JSON/MD/HTML)        | stdout or file output         |
| `scanner`   | Detect hardcoded text in source files      | Scanner report                |
| `complete`  | Fill missing keys in target files          | Target locale JSON            |
| `translate` | Auto-translate via provider AI             | Target locale JSON            |
| `sizing`    | Expansion risk and layout analysis         | Sizing report                 |
| `summary`   | Project translation status overview        | Console output                |
| `fixer`     | Fix placeholders and markers               | Locale JSON                   |
| `backup`    | Create/verify/restore locale backups       | Backup archives               |

Each is available as `i18ntk --command=<name>` or standalone `i18ntk-<name>`.

## Common Options

```
--code-dir <path>       Source code directory
--locales-dir <path>    Locale files directory
--output-dir <path>     Report output directory
--source-locale <code>  Source language code (e.g. en)
--framework <name>      Override framework detection
--no-prompt             Skip interactive prompts
--help                  Show help
```

## Auto Translate

```bash
i18ntk-translate locales/en/common.json de
i18ntk-translate locales/en/common.json fr --dry-run --preserve-placeholders
```

**Providers:** Google (default), DeepL, LibreTranslate

```bash
export DEEPL_API_KEY="your-key"
i18ntk-translate locales/en/common.json de --provider deepl --no-confirm
```

**Placeholder-aware translation** detects `{name}`, `{{count}}`, `%s`, `:id`, `${value}`, `$t(key)`, and ICU pattern syntax. The default mode is `--only-missing` — existing translations are preserved.

Protected terms and keys via `i18ntk-auto-translate.json`:

```json
{
  "version": 1,
  "terms": ["BrandName", "PRODUCT_CODE"],
  "keys": ["app.brandName", "product.*.symbol"],
  "values": ["BrandName Ltd"],
  "patterns": ["[A-Z]{2,}-\\d+"]
}
```

[Auto Translate guide →](./docs/auto-translate.md)

## Configuration

Example `.i18ntk-config`:

```json
{
  "version": "4.6.1",
  "sourceDir": "./locales",
  "i18nDir": "./locales",
  "sourceLanguage": "en",
  "defaultLanguages": ["en", "de", "es", "fr", "ru"],
  "keyStyle": "dot.notation",
  "englishContentThresholdPercent": 10,
  "allowedEnglishTerms": ["BrandName"],
  "autoTranslate": {
    "placeholderMode": "preserve",
    "concurrency": 12,
    "onlyMissingOrEnglish": true
  },
  "extensions": {
    "workbench": { "localeDirectory": "./locales", "sourceLocale": "en" },
    "lens": { "localeDirectory": "./locales", "sourceLocale": "en", "keyFormats": ["dot", "snake"] }
  }
}
```

[Configuration reference →](./docs/api/CONFIGURATION.md)

## Scanner

Detects hardcoded text in 12+ languages with language-specific character ranges and stopword filtering. Framework-specific patterns for React, Vue, Angular, Svelte, Astro, Django, Flask, Python, Rust, Go, and more.

```bash
i18ntk-scanner --code-dir ./src --source-locale de
i18ntk-scanner --code-dir ./src --source-locale ja --output-report
```

## Usage Analysis

Tracks key references, detects dead keys with confidence scores, resolves dynamic patterns (templates, arrays, object maps), and recommends namespace alignment.

```bash
i18ntk-usage --code-dir ./src --locales-dir ./locales --cleanup --dry-run-delete
```

## Runtime

```js
const runtime = require('i18ntk/runtime');
const i18n = runtime.initRuntime({
  baseDir: './locales',
  language: 'en',
  fallbackLanguage: 'en',
});

console.log(i18n.t('common.hello'));
i18n.setLanguage('fr');
console.log(i18n.getAvailableLanguages());
```

**Lazy loading** reduces memory on large locale folders:

```js
const i18n = runtime.initRuntime({ baseDir: './locales', language: 'en', lazy: true });
```

**Per-call language overrides:**

```js
i18n.t('common.hello', {}, { language: 'de' });
```

**Batch translation:**

```js
i18n.translateBatch(['menu.home', 'menu.settings']);
```

Production guidance:

- Use the instance from `initRuntime()` — not module-level `runtime.t()` — in multi-tenant apps
- Use `lazy: true` for large folders; `preload: true` for small sets
- Call `refresh(language)` after deploying changed locale files
- `i18ntk/runtime/enhanced` remains available for async/encryption compatibility

[Runtime guide →](./docs/runtime.md)

## Watch

```js
const watchLocales = require('i18ntk/utils/watch-locales');
const watcher = watchLocales('./locales');

watcher.on('change', (filePath) => console.log('changed:', filePath));
watcher.on('add', (filePath) => console.log('added:', filePath));
watcher.stop();
```

Features: 300ms debounce, SHA-256 hash tracking, 50-directory cap. The callback form `watchLocales('./locales', onChange)` is still supported.

## Documentation

- [Getting Started](./docs/getting-started.md)
- [Configuration](./docs/api/CONFIGURATION.md)
- [API Reference](./docs/api/API_REFERENCE.md)
- [Runtime API](./docs/runtime.md)
- [Auto Translate](./docs/auto-translate.md)
- [Scanner Guide](./docs/scanner-guide.md)
- [Environment Variables](./docs/environment-variables.md)

## Security

- No API key required for default Auto Translate
- Do not store secrets in locale files, `.i18ntk-config`, or protection files
- Report issues via [SECURITY.md](./SECURITY.md)

## Related

| Tool             | Purpose                                     |
| ---------------- | ------------------------------------------- |
| i18ntk Workbench | VS Code localization health dashboard       |
| i18ntk Lens      | Inline hovers, CodeLens, and diagnostics    |
| PublishGuard     | Pre-publish safety scanner for npm packages |
| ContextKit       | AI coding context manager                   |

## License

See [LICENSE](./LICENSE).
