# i18ntk Runtime API (v2.3.2)

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
runtime.initRuntime({
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

runtime.initRuntime({
  baseDir: './locales',
  language: 'en',
  fallbackLanguage: 'en',
  preload: true
});

console.log(runtime.t('common.hello'));
console.log(runtime.translate('menu.home'));

runtime.setLanguage('fr');
console.log(runtime.getLanguage());
console.log(runtime.getAvailableLanguages());
runtime.refresh('fr');
```

## Behavior

- The runtime reads JSON files only.
- Missing keys fall back to the fallback language when available.
- If a key is still missing, the key string is returned.
- Interpolation supports `{{name}}` and `{name}`.

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
