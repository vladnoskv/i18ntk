# i18ntk v5.1.1

Ship multilingual applications with confidence. i18ntk finds translation gaps, checks quality, and keeps locale files healthy without adding production dependencies to CLI-only projects.

![i18ntk Logo](https://raw.githubusercontent.com/vladnoskv/i18ntk/main/docs/screenshots/i18ntk-logo-public.PNG)

[![npm version](https://img.shields.io/npm/v/i18ntk.svg?color=brightgreen)](https://www.npmjs.com/package/i18ntk)
[![npm downloads](https://img.shields.io/npm/dt/i18ntk.svg)](https://www.npmjs.com/package/i18ntk)
[![node](https://img.shields.io/badge/node-%3E%3D16-339933)](https://nodejs.org)
[![dependencies](https://img.shields.io/badge/dependencies-0-success)](https://www.npmjs.com/package/i18ntk)
[![license](https://img.shields.io/badge/license-personal%20use%20free-blue.svg)](LICENSE)
[![socket](https://socket.dev/api/badge/npm/package/i18ntk/5.1.1)](https://socket.dev/npm/package/i18ntk/overview/5.1.1)

[![i18ntk Workbench](https://img.shields.io/badge/VS_Code-Workbench-007ACC?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=VladNoskov.i18ntk-workbench)
[![i18ntk Lens](https://img.shields.io/badge/VS_Code-Lens-007ACC?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=VladNoskov.i18ntk-lens)

## What i18ntk helps you do

- **Catch problems before release:** find missing keys, unused keys, broken placeholders, mismatched tags, and untranslated copy.
- **Focus translation work:** complete missing entries and translate only the values that still need attention.
- **Fit your stack:** scan JavaScript, TypeScript, Python, PHP, Ruby, Go, Rust, JVM templates, and more than 30 framework or i18n integrations.
- **Use it your way:** work from the guided menu locally or produce stable JSON results in CI.
- **Add a runtime only when you need one:** CLI-only projects have no production dependencies, while applications can opt into the environment-specific runtime.

Use the CLI on its own, or pair it with [i18ntk Workbench](https://marketplace.visualstudio.com/items?itemName=VladNoskov.i18ntk-workbench) for project-wide management and [i18ntk Lens](https://marketplace.visualstudio.com/items?itemName=VladNoskov.i18ntk-lens) for inline editor feedback.

## Quick start

Try it without installing:

```bash
npx i18ntk
```

Install it as a development tool when you only use the CLI:

```bash
npm install --save-dev i18ntk
npx i18ntk --command=init
```

Applications that import `i18ntk/runtime` should install it as a production dependency instead:

```bash
npm install i18ntk
```

Then inspect translation health before making changes:

```bash
npx i18ntk --command=analyze
npx i18ntk --command=validate
npx i18ntk --command=usage
```

Use `npx i18ntk` for the guided menu. It detects the project framework and adds only compatible source types and safe generated-file exclusions to a newly created configuration. For a walkthrough, see [Getting started](./docs/getting-started.md).

## What improves in 5.1.1

- **CI results you can trust.** Empty translations and untranslated markers now appear in validation totals. Strict mode fails the build, and unfinished locales never look 100% complete.
- **One clear coverage result.** `validate` and `usage` now agree about which strings still need work, including strings inside arrays.
- **Better TypeScript guidance.** Browser projects see the browser API and Node projects see the Node API, so autocomplete no longer suggests methods that will be missing at runtime. Existing 5.x `TranslationValue` imports continue to work.
- **Accurate language pickers.** Static and custom loaders can list every available locale without downloading every translation first.
- **A smoother 5.x migration.** Applications still using the enhanced runtime regain named namespaces, ready-to-use encryption, and working cache controls.
- **Fresher translations when you need them.** Node applications can disable caching, expire cached locales after a TTL, or cap the number of cached languages.

Upgrade with:

```bash
npm install i18ntk@5.1.1
```

Most 5.1.0 projects need no configuration changes. Keep normal validation when unfinished translations should be reported but allowed; use `--strict` when they must block a release.

See the [release notes](./CHANGELOG.md) for the full list of user-facing changes.

Upgrading from v4? Follow the [v4 to v5 migration guide](./docs/migration-v4-to-v5.md), including the licensing change and one-time configuration migration.

## Choose your next step

| I want to... | Start with |
| --- | --- |
| Set up i18ntk for a project | `npx i18ntk --command=init` |
| See how complete my translations are | `npx i18ntk --command=analyze` |
| Block a release when translations are unfinished | `npx i18ntk --command=validate --strict --no-prompt` |
| Find missing, unused, or hard-to-trace keys | `npx i18ntk --command=usage` |
| Find user-facing text still embedded in source code | `npx i18ntk --command=scanner` |
| Add missing locale entries | `npx i18ntk --command=complete` |
| Translate eligible values | `npx i18ntk --command=translate` |
| Create a report for teammates or stakeholders | `npx i18ntk --command=report --format=json` |
| Use translations inside my application | Choose an entry point in [Runtime](#runtime) |

Run `npx i18ntk` when you prefer the guided menu. Every command is also available as a standalone `i18ntk-<name>` executable.

## Common Options

```
--code-dir <path>       Source code directory
--locales-dir <path>    Locale files directory
--output-dir <path>     Report output directory
--source-locale <code>  Source language code (e.g. en)
--framework <name>      Override framework detection
--json                  Write one JSON document to stdout
--indent <0-10>         JSON indentation (default: 2)
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
  "version": "5.1.1",
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

Choose the entry point by where the translation code will actually run:

| Your application code                                             | Import                                          |
| ----------------------------------------------------------------- | ----------------------------------------------- |
| Node server, Express/Fastify, or a Node Server Component          | `i18ntk/runtime/node`                           |
| Browser, Edge, React Native, Expo, Deno, or Bun with bundled translations | `i18ntk/runtime/static`                  |
| Browser or Edge application that downloads translations          | `i18ntk/runtime/fetch`                          |
| React Client Components that need providers and hooks             | `i18ntk/runtime/react` with `static` or `fetch` |
| Library code that needs the smallest browser-safe API             | `i18ntk/runtime/core`                           |

Rust, Go, Python, Java, and other non-JavaScript applications can use the i18ntk CLI and generated JSON, but cannot run the JavaScript runtime natively.

```js
const runtime = require('i18ntk/runtime/node');
const i18n = runtime.initRuntime({
  projectRoot: process.cwd(),
  localeDir: 'locales',
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

- Use `i18ntk/runtime/node` only for Node servers and Node Server Components.
- Use `i18ntk/runtime/static` or `i18ntk/runtime/fetch` in browsers, Edge routes, client islands, React Native, and Expo.
- Keep mutable locale state request-scoped for SSR and multi-tenant services.
- Preload the same locale resources on the server and client to avoid hydration mismatches.
- `i18ntk/runtime/enhanced` is a deprecated 5.x compatibility wrapper and will be removed in the next major release.

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

- [Upgrade from v4 to v5](./docs/migration-v4-to-v5.md)
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

Downloading from npm does not grant commercial-use rights. See [Commercial licensing](./COMMERCIAL-LICENSE.md) for examples and how to request a license. For the technical upgrade and privacy-safe public marker workflow, see the [v4 to v5 migration guide](./docs/migration-v4-to-v5.md).

Earlier versions released under MIT remain available under their original license terms.
