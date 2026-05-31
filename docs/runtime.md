# i18ntk Runtime API (v4.3.0)

Use the runtime API when your application needs to read translation JSON files directly at runtime.

## Install

```bash
npm install i18ntk
```

## Import

CommonJS:

```js
const runtime = require('i18ntk/runtime');
```

## Exported API

- `initRuntime(options)`
- `t(key, params?)`
- `translate(key, params?)`
- `translateBatch(keys, params?, options?)`
- `setLanguage(language)`
- `getLanguage()`
- `getAvailableLanguages()`
- `clearCache(language?)`
- `getCacheInfo()`
- `refresh(language?)`

## Initialization

```js
const i18n = runtime.initRuntime({
  baseDir: './locales',
  language: 'en',
  fallbackLanguage: 'en',
  keySeparator: '.',
  preload: true
});
```

Supported options:

- `baseDir`: explicit locale base directory
- `language`: active language
- `fallbackLanguage`: fallback language for missing keys
- `keySeparator`: nested key separator, defaults to `.`
- `preload`: pre-cache active and fallback language files
- `lazy`: defer locale file loading until first key access

Production guidance:

- Prefer the instance returned by `initRuntime()` in application code. Module-level helpers such as `runtime.t()` are kept for compatibility and use the first initialized runtime configuration.
- Pass an explicit absolute or app-root-relative `baseDir` in production. Falling back to config/env/CWD is useful for tools, but less predictable in bundled or serverless deployments.
- Use `lazy: true` for large modular locale folders when memory matters. The runtime still scans JSON files to build a capped key-to-file manifest, then loads matching files on demand.
- Use `preload: true` without `lazy` when the locale set is small or when first-request latency matters more than memory.
- Call `refresh(language)` after locale files are changed on disk. It clears cached translations, lazy manifests, and loaded-file markers for that language.
- Use per-call language overrides when rendering one-off alternate-language strings: `i18n.t('common.hello', {}, { language: 'de' })`.
- Use `translateBatch()` for small groups of labels and `clearCache()` / `getCacheInfo()` for cache maintenance and diagnostics.

## Example Usage

```js
const runtime = require('i18ntk/runtime');

const i18n = runtime.initRuntime({
  baseDir: './locales',
  language: 'en',
  fallbackLanguage: 'en',
  preload: true
});

console.log(i18n.t('common.hello'));
console.log(i18n.translate('menu.home'));

i18n.setLanguage('fr');
console.log(i18n.getLanguage());
console.log(i18n.getAvailableLanguages());
i18n.refresh('fr');
```

Per-call language overrides do not mutate the active runtime language:

```js
console.log(i18n.translate('common.hello', {}, { language: 'de' }));
console.log(i18n.getLanguage()); // still the configured active language
```

Batch translation supports shared params or one params object per key:

```js
const labels = i18n.translateBatch(
  ['common.hello', 'common.goodbye'],
  [{ name: 'Ada' }, { name: 'Lin' }]
);
```

Use cache helpers after changing locale files on disk or for lightweight diagnostics:

```js
i18n.clearCache('fr');
console.log(i18n.getCacheInfo());
```

## Behavior

- The runtime reads JSON files only.
- Missing keys fall back to the fallback language when available.
- If a key is still missing, the key string is returned.
- Interpolation supports `{{name}}` and `{name}`.
- Each `initRuntime()` call returns an independent runtime instance with its own language, fallback language, base directory, and cache.
- Module-level helpers such as `runtime.t()` remain available for compatibility and use the first initialized runtime configuration. Prefer the returned instance for new code.
- Unsafe language names such as `../secret` are rejected before any locale path is resolved.
- When `lazy: true`, stale or incomplete manifests fall back to safe eager loading instead of throwing.
- Valid JSON is parsed before comment-stripping fallback, so translation text such as `/* token */` is preserved.
- `i18ntk/runtime/enhanced` remains available as a legacy public subpath for projects already using the async/encryption-oriented API. New production sites should prefer `i18ntk/runtime` unless they explicitly need that legacy API.

## Directory Layout

Both locale layouts are supported:

```text
locales/
  en/common.json
  fr/common.json
```

and:

```text
locales/
  en.json
  fr.json
```

## Base Directory Resolution

If `baseDir` is not provided, runtime uses:

1. `I18NTK_RUNTIME_DIR`
2. `I18NTK_I18N_DIR`
3. `I18NTK_SOURCE_DIR`
4. `.i18ntk-config` (`i18nDir` or `sourceDir`)
5. `./locales` relative to the project root

## Notes

- Runtime is zero dependency.
- Runtime is framework agnostic.
- Use the CLI for analysis, validation, and completion workflows.
