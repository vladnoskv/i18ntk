# i18ntk Runtime Translation API (v1.9.0+)

A lightweight, framework-agnostic TypeScript-first runtime for internationalization that works with any JavaScript project. Part of the i18ntk toolkit, designed for maximum flexibility and performance.

## ✨ Key Features

- **Zero Dependencies**: Ultra-lightweight with no external dependencies
- **TypeScript First**: Full type definitions and IntelliSense support
- **Flexible Loading**: Works with single files or folder structures
- **Framework Agnostic**: Use with React, Vue, Angular, or vanilla JS
- **Performance**: Optimized for fast loading and minimal bundle size
- **Configurable**: Supports all i18ntk configuration options
- **Tree-shakeable**: Only include what you use in your final bundle

## 📦 Installation

```bash
# Install as a dependency
npm install i18ntk
```

## 🔧 Basic Usage

### Importing the API

```typescript
// ESM/TypeScript
import { 
  initRuntime, 
  t, 
  translate, 
  setLanguage, 
  getAvailableLanguages,
  getCurrentLanguage,
  onLanguageChange
} from 'i18ntk/runtime';

// CommonJS
const { initRuntime, t } = require('i18ntk/runtime');
```

### Initialization

```typescript
// Initialize with options (all optional)
initRuntime({
  // Directory containing locale files (default: './locales')
  baseDir: './path/to/locales',
  
  // Default language (default: 'en')
  language: 'en',
  
  // Fallback language if translation is missing (default: 'en')
  fallbackLanguage: 'en',
  
  // Key separator for nested translations (default: '.')
  keySeparator: '.',
  
  // Whether to preload all languages (default: false)
  preload: false,
  
  // Custom logger (default: console)
  logger: {
    warn: (message: string) => console.warn(`[i18ntk] ${message}`),
    error: (message: string) => console.error(`[i18ntk] ${message}`)
  }
});
```

### Basic Translation

```typescript
// Simple translation
t('common.hello'); // 'Hello'

// With interpolation
t('common.greeting', { name: 'Alice' }); // 'Hello, Alice!'

// Pluralization
t('messages.unread', { count: 5 }); // '5 unread messages'

// Alias for t()
translate('common.hello');
```

### Language Management

```typescript
// Get current language
const currentLang = getCurrentLanguage(); // 'en'

// Get all available languages
const languages = getAvailableLanguages(); // ['en', 'fr', 'es']

// Change language
setLanguage('fr');

// Listen for language changes
const unsubscribe = onLanguageChange((newLang) => {
  console.log(`Language changed to ${newLang}`);
});

// Clean up listener
unsubscribe();
```

## 🚀 Advanced Usage

### Namespacing

```typescript
// Load specific namespace
initRuntime({
  namespaces: ['common', 'validation']
});

// Use with namespace
t('common:greeting');
```

### Custom Formatters

```typescript
initRuntime({
  formatters: {
    uppercase: (value) => String(value).toUpperCase(),
    currency: (value, options) => 
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: options?.currency || 'USD'
      }).format(value)
  }
});

// Usage
t('price', { 
  value: 42.99, 
  format: { 
    value: { 
      style: 'currency', 
      currency: 'EUR' 
    } 
  }
});
```

## 🔌 Framework Integration

### React Example

```typescript
// i18n.ts
import { initRuntime, t } from 'i18ntk/runtime';

initRuntime({
  baseDir: '/locales',
  language: 'en'
});

export { t };

// Component.tsx
import { t } from './i18n';

function Greeting() {
  return <h1>{t('common.hello')}</h1>;
}
```

## 📚 Type Safety

```typescript
// types.ts
declare module 'i18ntk/runtime' {
  interface CustomTypeOptions {
    resources: {
      common: {
        hello: string;
        welcome: (name: string) => string;
      };
      // Add other namespaces
    };
    // Default language
    defaultNS: 'common';
  }
}

// Now you get full type checking and autocompletion
t('common.hello'); // ✅ Valid
t('common.nonexistent'); // ❌ Type error
```

## 📊 Performance Tips

1. **Lazy Loading**: Only load languages as needed
2. **Code Splitting**: Split translations by route/feature
3. **Tree Shaking**: Import only what you use
4. **Preloading**: Preload critical translations

## 🔍 Debugging

```typescript
initRuntime({
  debug: true, // Enable debug logging
  logger: {
    debug: (msg) => console.debug(`[i18ntk:debug] ${msg}`),
    warn: (msg) => console.warn(`[i18ntk:warn] ${msg}`),
    error: (msg) => console.error(`[i18ntk:error] ${msg}`)
  }
});
```

## 📝 License

MIT © [i18ntk](https://github.com/yourusername/i18ntk)

## Install & Import

```bash
npm install i18ntk
```

```ts
// ESM/TypeScript
import { initRuntime, t, translate, setLanguage, getAvailableLanguages, refresh } from 'i18ntk/runtime';
```

```js
// CommonJS
const { initRuntime, t, translate, setLanguage, getAvailableLanguages, refresh } = require('i18ntk/runtime');
```

## Initialize

```ts
initRuntime({
  // All optional; if omitted, the helper reads i18ntk-config.json
  baseDir: './locales',        // Explicit override
  language: 'en',              // Default language
  fallbackLanguage: 'en',      // Fallback lookup language
  keySeparator: '.',           // Nested key separator
  preload: true,               // Preload current and fallback
});
```

## Translate

```ts
const s1 = t('common.hello', { name: 'Ada' });    // Interpolation supports {{name}} and {name}
const s2 = translate('nav.home');                 // Alias of t
setLanguage('fr');                                // Switch language at runtime
```

## Available Languages

```ts
const langs = getAvailableLanguages(); // e.g., ['en', 'fr']
```

## Path Resolution Order

1. `baseDir` passed to `initRuntime()`
2. `I18NTK_RUNTIME_DIR` environment variable
3. `settings/i18ntk-config.json` via internal config manager (`i18nDir` or `sourceDir`, resolved to absolute)
4. Fallback `./locales` relative to the consumer project root (`process.cwd()`)

This ensures correct behavior when i18ntk is used from `node_modules` in any project.

## Single Source of Truth

The config file `settings/i18ntk-config.json` is the authoritative configuration used across CLI and runtime. If a legacy `~/.i18ntk/i18ntk-config.json` exists, i18ntk will migrate it to `settings/i18ntk-config.json` on first run.

Useful env overrides:
- `I18NTK_PROJECT_ROOT`, `I18NTK_SOURCE_DIR`, `I18NTK_I18N_DIR`, `I18NTK_OUTPUT_DIR`
- `I18NTK_RUNTIME_DIR` (runtime helper only)

## Notes

- The runtime helper is intentionally minimal and not a full framework.
- It complements i18ntk’s CLI by enabling simple runtime reads of the same JSON sources you manage with the toolkit. We recommend using established packages for more comprehensive support. We may develop the runtime helper further in the future. 
