# Reliability and extraction APIs

## Release verification

Run the complete suite and then verify the exact npm artifact:

```bash
npm test
npm run verify:packed-install
npm run package:public
```

The packed-install verifier creates a randomized temporary consumer project, runs `npm pack`, installs only the resulting tarball, loads the package and public runtime/report entry points, and verifies every declared CLI target. The temporary project and tarball are removed on completion.

The publish-integrity test walks static relative `require()` calls under `main`, `settings`, `utils`, and `runtime`. Any production module absent from the package's `files` coverage fails the test.

`npm run package:public` stages the public manifest and verifies it can be packed without including private release material, tests, scripts, secrets, or user configuration. User-facing docs listed in the manifest remain intentionally included.

## Language registry

`utils/language-registry.js` is the canonical metadata source for the 23 interface languages. Each record provides `code`, `name`, `nativeName`, `englishName`, `direction`, and `aliases`. Returned records are copies. Arabic and Hebrew have `direction: "rtl"`.

Regional and underscore-separated locale identifiers resolve automatically:

```js
const { getLanguage, normalizeLanguageCode } = require('./utils/language-registry');

getLanguage('pt-BR');                 // Portuguese metadata
normalizeLanguageCode('zh_CN');       // "zh"
normalizeLanguageCode('iw-IL');       // "he" (legacy Hebrew code)
```

## Framework detection and extraction

The original `detectProjectFramework()` API remains available. Mixed-stack projects can use `detectProjectFrameworks()`, which returns `{ primary, detected, evidence }` and distinguishes application platforms from i18n libraries.

`extractFrameworkMessages(source, framework, options)` returns normalized matches containing `value`, `kind`, `framework`, `start`, `end`, `confidence`, and `pattern`. `maxMatches` is bounded, and `includeGeneric: false` restricts matching to framework-specific patterns.

## Translation QA and RTL safety

`validateTranslation(source, target, locale)` reports placeholder drift, tag drift, likely untranslated values, and unsafe Unicode bidirectional controls. `isolateForTerminal(value, locale)` removes supplied bidi controls and wraps RTL text in directional isolation marks.

Use `validateTranslationEntries(entries, locale)` to check a group and receive totals plus key-aware issues:

```js
const { validateTranslationEntries } = require('./utils/translation-quality');

const quality = validateTranslationEntries([
  { key: 'welcome', source: 'Hi {{name}}', target: 'Hallo {{name}}' },
  { key: 'save', source: '<b>Save</b>', target: 'Speichern' }
], 'de-DE');

console.log(quality.valid, quality.errors, quality.warnings);
```

## Incremental scanner telemetry

`I18nTextScanner` caches by file metadata, language, limits, and active patterns. Disable it with `{ cache: false }`. `getScanTelemetry()` returns `{ filesScanned, cacheHits, filesSkipped, durationMs, cacheEntries }`; `clearScanCache()` invalidates it. The cache is in-memory and never writes project data.

## Public license verification markers

Generate the manifest and HTML tag assigned to a licensed public deployment:

```bash
npx i18ntk-license generate \
  --license-id LIC-CUSTOMER-ID \
  --domains example.com,www.example.com \
  --output ./public/i18ntk-license.json
```

Add the printed meta tag to the site's HTML and deploy the JSON file at `/i18ntk-license.json`. Validate a deployment manifest locally:

```bash
npx i18ntk-license verify --file ./public/i18ntk-license.json --domain example.com
npx i18ntk-license queries --license-id LIC-CUSTOMER-ID
```

The `queries` command prints exact search phrases that can locate indexed public markers. It does not perform a web search or transmit data. The marker API is also available through `require('i18ntk/license-marker')`.

Markers are public identifiers, not secrets or cryptographic proof of entitlement. Confirm validity against the licensor's commercial records. Never place personal, billing, or secret license material in a marker.
