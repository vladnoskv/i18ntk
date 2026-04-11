# i18ntk Runtime API (v2)

## Install

```bash
npm install i18ntk
```

## Import

```ts
import {
  initRuntime,
  t,
  translate,
  setLanguage,
  getLanguage,
  getAvailableLanguages,
  refresh
} from 'i18ntk/runtime';
```

CommonJS:

```js
const {
  initRuntime,
  t,
  translate,
  setLanguage,
  getLanguage,
  getAvailableLanguages,
  refresh
} = require('i18ntk/runtime');
```

## Initialization

```ts
initRuntime({
  baseDir: './locales',
  language: 'en',
  fallbackLanguage: 'en',
  keySeparator: '.',
  preload: true
});
```

Supported options:

- `baseDir`: locales directory
- `language`: active language
- `fallbackLanguage`: fallback language when key is missing
- `keySeparator`: nested key separator (default `.`)
- `preload`: preload active and fallback language data

## Translation Usage

```ts
const a = t('common.hello');
const b = t('common.greeting', { name: 'Ada' });
const c = translate('menu.home');

setLanguage('fr');
const current = getLanguage();

const languages = getAvailableLanguages();
refresh('fr');
```

Behavior:

- Missing key in active language falls back to `fallbackLanguage`
- If still missing, the key string is returned
- Interpolation supports `{{name}}` and `{name}`

## Locale Structure

Runtime supports both:

1. Directory-per-language

```text
locales/
  en/common.json
  fr/common.json
```

2. Single-file-per-language

```text
locales/
  en.json
  fr.json
```

## Base Directory Resolution Order

When `baseDir` is not provided, runtime resolves locales in this order:

1. `I18NTK_RUNTIME_DIR`
2. `I18NTK_I18N_DIR`
3. `I18NTK_SOURCE_DIR`
4. `.i18ntk-config` (`i18nDir` or `sourceDir`)
5. `./locales` relative to project root

## Notes

- Runtime API is zero dependency.
- Runtime API is framework agnostic.
- Runtime API reads JSON locale files only.
