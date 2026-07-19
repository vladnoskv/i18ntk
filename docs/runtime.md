# i18ntk Runtime API (v5.1.0)

i18ntk 5.1 provides one runtime model with explicit adapters for each environment. Runtime instances are isolated: they own their active locale, subscriptions, plugins, diagnostics, and loaded resources, and they never install process signal or exception handlers.

## Choose the right entry point

| Entry point | Runs in | Does not do |
| --- | --- | --- |
| `i18ntk/runtime/node` | Node.js servers, Next.js Node Server Components and Route Handlers, Express, Fastify, Electron main process, Bun with Node compatibility | Browser, React Native, or Edge bundles; it uses Node filesystem APIs |
| `i18ntk/runtime/core` | Browsers, Edge workers, React Native/Expo, Deno, Bun, Node, and framework-independent bundles | Read files or fetch resources by itself |
| `i18ntk/runtime/static` | The same environments as core, with imported/bundled locale objects | Discover files at runtime |
| `i18ntk/runtime/fetch` | Browsers, Edge workers, React Native, and servers with a Fetch API | Access local files; the caller supplies the URL pattern and deployment policy |
| `i18ntk/runtime/react` | React 18+ and React 19 Client Components, using an injected React package and a preloaded runtime | Load during render or run as a hook in React Server Components |
| `i18ntk/runtime/crypto` | Node.js only, when encrypted translation output is explicitly required | Ship in the universal/browser core |
| `i18ntk/runtime/enhanced` | Existing Node.js integrations during the 5.x compatibility period | Provide a separate implementation; it now delegates to the unified runtime and is deprecated |

The conditional `i18ntk/runtime` export selects the Node adapter under Node conditions and the universal core under browser/default conditions. Prefer an explicit subpath in framework configuration so the intended environment is obvious.

Rust, Go, Python, PHP, Ruby, Java, and other non-JavaScript applications can be scanned and validated by the i18ntk CLI, but they cannot execute this JavaScript runtime natively. Use their framework's i18n runtime, consume generated JSON through a language-specific adapter, or run i18ntk in a JavaScript sidecar. WebAssembly alone does not provide Node filesystem APIs.

## Node filesystem runtime

```js
const { initRuntime } = require('i18ntk/runtime/node');

const i18n = initRuntime({
  projectRoot: process.cwd(),
  localeDir: 'locales',
  language: 'en-GB',
  fallbackLanguage: 'en',
  preload: true
});

console.log(i18n.t('common.hello', { name: 'Ada' }));
```

`baseDir` may be absolute or relative to the current working directory. `projectRoot + localeDir` resolves a relative locale directory against the project root, which is safer in monorepos and server processes whose working directory may differ. Both `locales/en.json` and `locales/en/common.json` layouts are supported.

Each `initRuntime()` call creates a new instance and never changes module-level helpers. Legacy module helpers use a separate default runtime; configure it deliberately with `initDefaultRuntime()` if required. Request-driven servers should use an instance or pass `language` per call instead of changing shared mutable locale state.

Node lazy mode indexes namespace filenames without parsing every JSON file. A matching namespace is read on first access; an unconventional layout is read once as a safe fallback. Use `getDiagnostics()` to distinguish malformed/unreadable files from missing keys.

## Universal and static resources

The universal core imports no `fs`, `path`, `crypto`, `process`, `Buffer`, or EventEmitter APIs. Translation lookup is synchronous after resources have loaded.

```js
const { createRuntime } = require('i18ntk/runtime/static');

const i18n = createRuntime({
  locale: 'fr-CA',
  fallbackLocale: 'en',
  resources: {
    fr: { common: { save: 'Enregistrer' } },
    en: { common: { save: 'Save', cancel: 'Cancel' } }
  }
});

i18n.t('save', {}, { namespace: 'common' });
```

Locale fallback follows exact tag, parent tags, then configured fallback: `zh-Hant-HK → zh-Hant → zh → en`. Tags are canonicalized with `Intl.getCanonicalLocales()` when available. `has()` tracks presence independently, so a valid translation equal to its key is not treated as missing.

## Fetch and Edge loading

```js
const { initRuntime, createFetchLoader } = require('i18ntk/runtime/fetch');

const i18n = await initRuntime({
  locale: 'de',
  fallbackLocale: 'en',
  namespaces: ['common', 'checkout'],
  loader: createFetchLoader({ url: '/locales/{locale}/{namespace}.json' })
});
```

Concurrent requests for the same locale and namespace set are deduplicated. Loading is explicit and asynchronous; `t()` never starts network I/O. Configure authentication, caching, integrity, and trusted origins at the fetch/deployment layer.

## React, Server Components, and hydration

Server Components should use `i18ntk/runtime/node` in Node routes or `i18ntk/runtime/static`/`fetch` in Edge routes. Resolve the locale per request and preload route namespaces before rendering. Do not call `setLocale()` on a runtime shared across requests.

Serialize only the resources needed by interactive client islands. Create the browser runtime from that exact snapshot before hydration:

```js
// Client Component module
import React from 'react';
import { createRuntime } from 'i18ntk/runtime/static';
import { createReactBindings } from 'i18ntk/runtime/react';

const { I18nProvider, useTranslation } = createReactBindings(React);
const runtime = createRuntime({ locale, fallbackLocale: 'en', resources: serverResources });

export function AppI18nProvider({ children }) {
  return React.createElement(I18nProvider, { runtime }, children);
}
```

The bindings use `useSyncExternalStore`, so locale/resource updates are safe with concurrent React rendering. Server and client must use the same locale, namespaces, resource version, and fallback settings to avoid hydration mismatches. Loading or creating a runtime during render is unsupported.

Vue/Nuxt, Svelte/SvelteKit, Angular, Astro, Remix, and other frameworks should inject the universal runtime into their own request/application context and subscribe to changes using `subscribe()`. SSR integrations must keep mutable locale selection request-scoped. React Native and Expo should use static/imported resources or a platform fetch/asset loader; the core does not require AsyncStorage.

## Resources, plugins, and lifecycle

```js
const unsubscribe = i18n.subscribe(event => instrumentation.record(event));
i18n.addResources('en', 'account', { title: 'Account' });
const removePlugin = i18n.addPlugin({
  name: 'trim',
  transform: value => value.trim()
});

unsubscribe();
removePlugin();
i18n.dispose();
```

Plugins are synchronous and ordered. Plugin and listener failures are isolated from translation and recorded as bounded diagnostics. `dispose()` is idempotent, prevents an in-flight loader from repopulating resources, and clears resources, listeners, plugins, and load tracking; it creates no global process listeners or timers.

Formatting helpers use the host's `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`, `Intl.ListFormat`, and `Intl.PluralRules`. The runtime returns plain translation text and does not HTML-escape it. React, Vue, template engines, URL builders, and rich-text renderers must escape for their own output context. Raw HTML execution is intentionally not provided.

## Missing keys and load failures

`missingKeyPolicy` supports `key` (default), `empty`, `throw`, or a callback. `loadErrorPolicy` supports `throw` (universal initialization default) or `report-and-fallback`. `getDiagnostics()` returns bounded structured events without exposing Node absolute paths.

Use `has(key, options)` when presence matters. Do not infer presence by comparing `t(key)` with the key string.

## Enhanced migration

`i18ntk/runtime/enhanced` remains a compatibility wrapper for 5.x and will be removed in the next major release. It no longer installs process handlers, creates timers, injects sample English strings, shares `initI18nRuntime()` state, or HTML-escapes output. Partial nested configuration updates preserve defaults, metrics report real counts and derived averages, and encryption is loaded only from the explicit Node crypto adapter.

Migration mapping:

| Legacy enhanced API | Unified API |
| --- | --- |
| `initI18nRuntime()` | `initRuntime()` for Node, or `createRuntime()`/async loader initialization elsewhere |
| `defaultLanguage` | `language` / `locale` |
| `addNamespace(name, resources)` | `addResources(locale, name, resources)` |
| `getAvailableLanguages()` | `getAvailableLanguages()` (Node) or `listLocales()` (universal) |
| `cleanup()` | `dispose()` |

The runtime is zero-dependency. The React adapter uses dependency injection and does not install React; applications provide React 18 or newer.
