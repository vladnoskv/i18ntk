# Configuration reference

## Precedence

Use values in this order: CLI flags, supported environment variables, project `.i18ntk-config`, built-in defaults. Verify command-specific aliases with `--help`; prefer current names over legacy `--source-dir` uses.

## Recommended baseline

```json
{
  "version": "5.0.0",
  "sourceDir": "./src",
  "i18nDir": "./locales",
  "sourceLanguage": "en",
  "defaultLanguages": ["en", "de", "es"],
  "keyStyle": "dot.notation",
  "englishContentThresholdPercent": 10,
  "allowedEnglishTerms": ["BrandName", "PRODUCT_CODE"],
  "excludeDirs": ["node_modules", ".next", "dist", "build", "coverage"],
  "autoTranslate": {
    "placeholderMode": "preserve",
    "onlyMissingOrEnglish": true,
    "concurrency": 12,
    "protectionEnabled": true,
    "protectionFile": "./i18ntk-auto-translate.json"
  },
  "extensions": {
    "workbench": {
      "localeDirectory": "./locales",
      "sourceLocale": "en",
      "customWrappers": []
    },
    "lens": {
      "localeDirectory": "./locales",
      "sourceLocale": "en",
      "keyFormats": ["dot", "snake"],
      "customWrappers": []
    }
  }
}
```

Adapt rather than copy blindly:

- `sourceDir` is application source for scanning; `i18nDir` is the locale root.
- Keep `defaultLanguages` explicit. An empty list is meaningful and must not silently become a default subset.
- Preserve a user-specified extension list; do not replace it with framework defaults.
- Merge scanner exclusions from `exclude`, `excludeFiles`, and `excludeDirs` where supported.
- Use regional locale identifiers when the repository does; i18ntk normalizes common regional, underscore, and legacy aliases for discovery.
- Configure `allowedEnglishTerms` narrowly. Add translation-preservation rules to the protection file instead of globally suppressing quality checks.

## Framework template upgrades

On the next i18ntk run, a new or outdated configuration is upgraded after framework detection. i18ntk merges framework-specific source extensions, build-output exclusions, and common generated-file/lockfile exclusions while preserving user values. Inspect `setup.version` and `framework.templateVersion` when troubleshooting an upgrade.

Do not replace a user's explicit framework preference, locale paths, language list, exclusions, or report settings. In non-interactive environments, surface the update notice instead of changing the saved configuration.

## Auto Translate protection

```json
{
  "version": 1,
  "terms": ["BrandName", "Auto Translate"],
  "keys": ["app.brandName", "product.*.symbol"],
  "values": ["BrandName Ltd"],
  "patterns": ["[A-Z]{2,}-\\d+"]
}
```

Protected terms must also be treated as allowed English during only-missing planning, so translated sentences containing a brand are not repeatedly retranslated.

## CI and environment

Common safe overrides include `I18NTK_SOURCE_DIR`, `I18NTK_I18N_DIR`, `I18NTK_OUTDIR`, `I18NTK_UI_LANGUAGE`, `I18NTK_SILENT`, and `I18NTK_LOG_LEVEL`. Provider credentials include `DEEPL_API_KEY` and `LIBRETRANSLATE_API_KEY`. Never commit their values.

Use `CI=true` and explicit `--no-prompt` for deterministic automation. Treat exit code `0` as success, `1` as validation/runtime failure, and `2` as invalid arguments or missing setup.
