# i18ntk v5.0.0

Find, validate, and maintain application translations without adding runtime dependencies.

![i18ntk Logo](https://raw.githubusercontent.com/vladnoskv/i18ntk/main/docs/screenshots/i18ntk-logo-public.PNG)

[![npm version](https://img.shields.io/npm/v/i18ntk.svg?color=brightgreen)](https://www.npmjs.com/package/i18ntk)
[![npm downloads](https://img.shields.io/npm/dt/i18ntk.svg)](https://www.npmjs.com/package/i18ntk)
[![node](https://img.shields.io/badge/node-%3E%3D16-339933)](https://nodejs.org)
[![dependencies](https://img.shields.io/badge/dependencies-0-success)](https://www.npmjs.com/package/i18ntk)
[![license](https://img.shields.io/badge/license-personal%20use%20free-blue.svg)](LICENSE)
[![socket](https://socket.dev/api/badge/npm/package/i18ntk/5.0.0)](https://socket.dev/npm/package/i18ntk/overview/5.0.0)

[![i18ntk Workbench](https://img.shields.io/badge/VS_Code-Workbench-007ACC?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=VladNoskov.i18ntk-workbench)
[![i18ntk Lens](https://img.shields.io/badge/VS_Code-Lens-007ACC?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=VladNoskov.i18ntk-lens)

## Why i18ntk

- Finds missing and unused keys across your source code and locale files.
- Checks placeholders, tags, source-language leftovers, and other translation-quality issues.
- Completes missing keys and translates only the entries that need attention.
- Supports JavaScript, TypeScript, Python, PHP, Ruby, Go, Rust, JVM templates, and 30+ framework or i18n integrations.
- Works interactively on your machine or non-interactively in automation, with no production dependencies.

Use the CLI on its own, or pair it with [i18ntk Workbench](https://marketplace.visualstudio.com/items?itemName=VladNoskov.i18ntk-workbench) for project-wide management and [i18ntk Lens](https://marketplace.visualstudio.com/items?itemName=VladNoskov.i18ntk-lens) for inline editor feedback.

## Quick start

Try it without installing:

```bash
npx i18ntk
```

Or install it for your project (required if using i18ntk/runtime):

```bash
npm install --save-dev i18ntk
npx i18ntk --command=init
```

Then inspect translation health before making changes:

```bash
npx i18ntk --command=analyze
npx i18ntk --command=validate
npx i18ntk --command=usage
```

Use `npx i18ntk` for the guided menu. It detects the project framework and adds only compatible source types and safe generated-file exclusions to a newly created configuration. For a walkthrough, see [Getting started](./docs/getting-started.md).

## What's new in 5.0.0

- **Stronger quality checks** for placeholders, tags, corrupted text, source-language leftovers, and unsafe bidirectional characters.
- **Better framework detection** for Laravel, Spring Boot, Nuxt, next-intl, and mixed-stack projects.
- **Faster repeat scans** and more reliable discovery across regional, namespaced, and underscore-style locale folders.
- **Safer Auto Translate** that respects protected terms and reports unresolved work clearly.
- **An optional LLM skill** for Codex, Claude Code, GitHub Copilot, and compatible agents.

See the [release notes](./CHANGELOG.md) for the full list of user-facing changes.

## Everyday workflows

```bash
i18ntk                                    # guided menu
i18ntk --command=analyze                  # translation coverage
i18ntk --command=validate                 # quality checks
i18ntk --command=usage                    # missing and unused keys
i18ntk --command=complete                 # add missing keys
i18ntk --command=translate                # translate eligible entries
i18ntk --command=report --format=json     # shareable report
```

Use `npx i18ntk --command=<name>` when i18ntk is installed locally.

## Command Reference

| Command | Use it when you want to |
| --- | --- |
| `i18ntk` | Open the guided setup and maintenance menu. |
| `init` | Create or extend a project configuration. |
| `analyze`, `validate`, `usage` | Review coverage, translation quality, and key usage. |
| `complete`, `translate` | Add missing entries or translate eligible values. |
| `report`, `summary`, `sizing` | Produce a shareable status or planning view. |
| `scanner`, `fixer`, `backup` | Find hardcoded text, repair locale data, or protect a snapshot. |
| `skills` | Install i18ntk guidance for an AI coding agent. |

Each command is also available as a standalone `i18ntk-<name>` executable.

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
# POSIX
DEEPL_API_KEY="your-key" i18ntk-translate locales/en/common.json de --provider deepl --no-confirm

# PowerShell
$env:DEEPL_API_KEY = "your-key"
i18ntk-translate locales/en/common.json de --provider deepl --no-confirm
```

**Placeholder-aware translation** recognises `{name}`, `{{count}}`, `%s`, `:id`, `${value}`, `$t(key)`, and ICU patterns. By default, existing translations are left unchanged.

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

## Configure your project

Example `.i18ntk-config`:

```json
{
  "version": "5.0.0",
  "sourceDir": "./src",
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
  }
}
```

[Configuration reference →](./docs/api/CONFIGURATION.md)

When i18ntk detects a supported framework, it checks whether your setup version and configuration need a v5 update. The interactive menu asks before adding safe defaults for source file types, generated directories, scan caching, report summaries, and performance tracking. Your existing choices are preserved. See [framework configuration templates](./docs/framework-templates.md).

## Find hardcoded text

Scan source files for text that should move into locale files. i18ntk understands common patterns across React, Vue, Angular, Svelte, Astro, Django, Flask, Python, Rust, Go, and more.

```bash
i18ntk-scanner --code-dir ./src --source-locale de
i18ntk-scanner --code-dir ./src --source-locale ja --output-report
```

## Find unused and missing keys

Trace key references, find likely unused entries, and recognise common dynamic patterns such as templates, arrays, and object maps.

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

## Use i18ntk with an AI coding agent

Give your coding agent the same up-to-date i18ntk guidance you use. The installer finds supported skill locations and lets you choose where to add it:

```bash
npx i18ntk --command=skills
npx i18ntk --command=skills --agents=codex,claude,copilot --scope=personal --dry-run --no-prompt
```

The installer supports Codex, Claude Code, GitHub Copilot, shared Agent Skills, and compatible project folders. The core instructions are model-neutral; Codex receives optional OpenAI UI metadata, while Claude and Copilot receive the same portable workflow. The installer shows destinations and asks before changing anything. Existing skills are kept unless you choose to update them.

For manual installation, copy the complete `skills/i18ntk` folder into your agent's skills directory.

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

i18ntk 5.0.0 and later is source-available under a dual-license model:

- **Personal and qualifying noncommercial use:** free under the [PolyForm Noncommercial License 1.0.0](./LICENSE).
- **Business and commercial use:** requires a separate paid commercial license. This includes internal company tooling, CI/CD, consulting or client work, and use connected to a commercial product or service.

Commercial customers can also request custom integration support for frameworks, monorepos, CI/CD pipelines, migrations, translation providers, and organization-specific workflows. Scope and support terms are agreed separately.

Licensed public sites can use `i18ntk-license` to generate a searchable verification meta tag and `/i18ntk-license.json`. The tool does not phone home or collect visitor data; verification uses only intentionally published markers and licensing records.

Downloading from npm does not grant commercial-use rights. See [Commercial licensing](./COMMERCIAL-LICENSE.md) for examples and how to request a license.

Earlier versions released under MIT remain available under their original license terms.
