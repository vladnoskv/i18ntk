# Getting Started with i18ntk (v4.5.4)

This guide covers the shortest path from install to a working locale project.

## 1. Install

```bash
npm install -g i18ntk
```

Or add it to a project:

```bash
npm install --save-dev i18ntk
```

Requirements:

- Node.js `>=16.0.0`
- npm `>=8.0.0`
- No runtime dependencies

## 2. Initialize the project

Run the interactive manager:

```bash
i18ntk
```

Then choose `Initialize new languages`, or run the command directly:

```bash
i18ntk --command=init
```

During setup, i18ntk asks for source directory, source language, UI language, framework preference, output directory, backup settings, and target languages. The default target-language set is `en`, `de`, `es`, `fr`, and `ru`.

For automation:

```bash
i18ntk --command=init --no-prompt
```

## 3. Validate and analyze

Run a first check after setup:

```bash
i18ntk --command=analyze
i18ntk --command=validate
```

Analysis reports default to Markdown in `./i18ntk-reports`. Validation prints a terminal summary and writes a validation summary report.

## 4. Check usage

```bash
i18ntk --command=usage
```

If your locale directory is also configured as `sourceDir`, usage analysis avoids scanning the whole project root and reports that no application source directory was available instead of inflating missing-key counts.

## 5. Complete missing keys

When analysis shows gaps:

```bash
i18ntk --command=complete
```

## 6. Auto-translate locale files

Use the management menu:

```bash
i18ntk
# choose "Auto Translate"
```

Or run the standalone translator directly:

```bash
i18ntk-translate locales/en/common.json de --report-stdout
```

Auto Translate is target-aware by default. Existing translated target values are kept, and only missing, empty, untranslated-marker, source-copy, or likely-English values are sent to the provider. Use `--translate-all` only when you intentionally want a full re-translation.

## 7. Use the runtime API

```js
const runtime = require('i18ntk/runtime');

const i18n = runtime.initRuntime({
  baseDir: './locales',
  language: 'en',
  fallbackLanguage: 'en',
  preload: true
});

console.log(i18n.t('common.hello'));
```

For large modular locale folders, use lazy loading to reduce steady-state memory:

```js
const i18n = runtime.initRuntime({
  baseDir: './locales',
  language: 'en',
  fallbackLanguage: 'en',
  lazy: true
});
```

Prefer the returned `i18n` instance in production apps, especially if the process serves multiple sites or locale roots.

Useful runtime helpers:

```js
i18n.t('common.hello', {}, { language: 'de' });
i18n.translateBatch(['menu.home', 'menu.settings']);
i18n.clearCache('fr');
console.log(i18n.getCacheInfo());
```

## Suggested First Run Sequence

```bash
i18ntk
i18ntk --command=analyze
i18ntk --command=validate
i18ntk --command=usage
i18ntk --command=translate
```

## Next Steps

- Read [Runtime API](./runtime.md) for runtime details.
- Read [Auto Translate](./auto-translate.md) for provider, placeholder, and protection behavior.
- Read [Configuration](./api/CONFIGURATION.md) for config fields and precedence.
- Read [Scanner Guide](./scanner-guide.md) for scan and key discovery workflows.
- Read [Migration Guide v4.3.2](./migration-guide-v4.3.2.md) before upgrading older projects.
