# i18ntk Runtime API (v3.2.0)

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
- `setLanguage(language)`
- `getLanguage()`
- `getAvailableLanguages()`
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

## Behavior

- The runtime reads JSON files only.
- Missing keys fall back to the fallback language when available.
- If a key is still missing, the key string is returned.
- Interpolation supports `{{name}}` and `{name}`.
- Each `initRuntime()` call returns an independent runtime instance with its own language, fallback language, base directory, and cache.
- Module-level helpers such as `runtime.t()` remain available for compatibility and use the first initialized runtime configuration. Prefer the returned instance for new code.

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
