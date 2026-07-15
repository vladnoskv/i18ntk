# Workflow reference

## Audit an existing project

1. Inspect manifests, `.i18ntk-config`, locale layout, wrapper functions, and current reports.
2. Run `analyze` for coverage and `validate` for structure/quality.
3. Run `usage` with explicit application and locale roots.
4. Run `scanner` on a focused source tree before expanding scope.
5. Reconcile command results. Locale discovery should be consistent; a source-locale-only report must label itself accordingly.
6. Classify failures as key presence, translation quality, source usage, scanner classification, configuration, or packaging.

## Tune scanner results

- Confirm config and CLI exclusions are both applied.
- Exclude imports/module specifiers, CSS tokens, routes, metadata identifiers, translation keys, generated code, and dependencies from user-visible text findings.
- Add framework/build output directories.
- Raise minimum length only after reviewing short legitimate UI labels.
- Test project-specific wrappers and dynamic key patterns with small fixtures.

## Translate safely

1. Back up locale files.
2. Configure protected terms and allowed English terms.
3. Dry-run one representative namespace and target locale.
4. Verify placeholders, markup, source leakage, script consistency, replacement characters, and bidi controls.
5. Run a write pass only after the sample is clean.
6. Preserve `i18ntk-reports/auto-translate/<locale>.json` for every target and review the aggregate/latest report.
7. Do not call the locale complete while residual warnings remain.

A positional source file takes precedence over `--source-dir`. Prefer the unambiguous form:

```text
npx i18ntk-translate locales/en/common.json de --no-confirm --preserve-placeholders
```

## Framework verification

- Inspect dependency manifests plus source syntax; do not rely on directory names alone.
- For mixed Node stacks, distinguish platform evidence (`next`, `nuxt`, `react`, `astro`) from i18n-library evidence (`next-intl`, `react-i18next`, `vue-i18n`).
- Verify custom wrappers and framework extraction return non-empty key captures.
- Check non-Node manifests when present: Python dependency files, `Cargo.toml`, `go.mod`, `Gemfile`, Composer manifests, and Maven/Gradle files.
- Use a framework override only when automatic evidence is incomplete or the repository deliberately uses a custom integration.

## Package release verification

From the i18ntk package directory:

```text
npm test
npm run security:check
npm run lint:locales
npm run verify:packed-install
```

The packed verifier is required because source-tree tests cannot detect omitted publish files. Confirm the tarball includes every public export, CLI target, runtime type declaration, license file, UI locale, and this skill folder.

For extensions, compile and run unit tests, then package to a VSIX whose filename matches the manifest version. Confirm their packaged i18ntk dependency matches the intended core release.
