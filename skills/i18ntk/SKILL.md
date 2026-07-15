---
name: i18ntk
description: Configure, use, audit, troubleshoot, and release projects that use the i18ntk CLI, runtime, Workbench, or Lens. Use for i18n setup, .i18ntk-config customization, framework and locale discovery, missing or unused keys, scanner noise, translation QA, protected terms, CI validation, auto-translation, reports, runtime integration, and i18ntk upgrades.
---

# i18ntk

Use i18ntk as an evidence-producing localization tool. Adapt paths, commands, framework patterns, exclusions, quality thresholds, and translation protection to the current repository instead of imposing generic defaults.

## Work across agent environments

- Follow the host agent's repository, permission, and tool policies first. Treat commands here as portable examples, not permission to write files or call external providers.
- Do not depend on Codex-only syntax, tools, or environment variables. Use the host's available terminal and file tools; on Windows prefer PowerShell syntax and on POSIX use shell syntax.
- State the detected locale layout, framework evidence, and intended configuration patch before writing. Keep changes minimal and preserve user-owned rules.
- Report concise evidence: commands run, exit status, changed files, and unresolved translation-review items.
- For unattended agent work, never run bare `npx i18ntk`: it opens an interactive menu. Use an explicit `--command=…`, explicit paths, and `--no-prompt`; use `CI=true` when the host can set environment variables.

## Inspect before changing

1. Read repository instructions and package-manager metadata.
2. Determine the installed i18ntk version with `npx i18ntk --version`, the local package manifest, or the lockfile. Do not assume the latest version is installed.
3. Locate `.i18ntk-config`, locale roots, source locale, application source roots, framework manifests, CI workflows, and existing i18ntk reports.
4. Identify the locale layout:
   - directory per locale: `locales/en/common.json`
   - monolith files: `locales/en.json`
   - namespaced or regional layouts: `messages/pt-BR/*.json`
5. Preserve existing locale structure, formatting, key style, placeholders, and protected product terms.
6. Read [references/configuration.md](references/configuration.md) before creating or materially changing configuration. Read [references/workflows.md](references/workflows.md) before translation, CI, scanner tuning, release validation, or runtime work.

## Choose the workflow

- For initial setup, run a dry inspection first, then use `npx i18ntk --command=init` when the user authorizes file creation.
- For key coverage, run `analyze`, then `validate`.
- For source usage, missing references, and dead keys, run `usage` with explicit code and locale roots.
- For user-visible hardcoded text, run `scanner`; tune exclusions and length thresholds from observed false positives.
- For missing target keys, use `complete`, but treat generated `[LOCALE] source` values as source-copy markers requiring translation review.
- For automatic translation, start with `i18ntk-translate ... --dry-run --preserve-placeholders`; configure protected terms before a write run.
- For stable machine-readable evidence, use `report --json` and retain per-locale auto-translate residual reports.
- For application translation at runtime, use the `i18ntk/runtime` instance API and configure fallback behavior explicitly.

## Customize to the project

- Prefer explicit `--code-dir`, `--locales-dir`, and `--source-locale` in CI.
- Put persistent project defaults in `.i18ntk-config`; use CLI flags for one run and supported environment variables for CI/runtime overrides.
- Add generated folders, fixtures, vendored code, build output, and project-specific non-UI trees to exclusions.
- Add application wrappers such as `tx`, `copy`, or namespace helpers to the relevant custom-wrapper settings.
- Add brands, acronyms, and required English UI terms to `allowedEnglishTerms`; use `i18ntk-auto-translate.json` for terms, keys, values, and patterns that Auto Translate must preserve.
- Keep extension settings aligned under `extensions.workbench` and `extensions.lens` when the project uses the VS Code extensions.
- Override framework detection only after inspecting dependency and source evidence. Mixed stacks may contain both a platform and an i18n library.
- On a new or outdated configuration, merge the detected framework template's source extensions plus common generated-file, lockfile, and build-output exclusions. Never replace existing `supportedExtensions`, `excludeDirs`, or `excludeFiles`.

## Treat quality separately from coverage

Never equate key presence with translation quality. Review or fail on:

- source-copy markers and unchanged source sentences;
- missing, renamed, or duplicated placeholders;
- replacement characters, mojibake, suspicious question marks, or unsafe bidi controls;
- source-language leakage or mixed-script output;
- mismatched HTML/tags and locale-inappropriate grammar around placeholders;
- auto-translate residual reports.

Do not invent translations for languages you cannot validate. Preserve the source and surface a review queue when machine output remains uncertain.

## Operate safely

- Do not store provider keys or secrets in locale JSON, `.i18ntk-config`, protection files, or reports.
- Use environment variables or the user's secret manager for DeepL and LibreTranslate credentials.
- Do not enable private/custom translation hosts unless the user identifies a trusted endpoint.
- Back up locale files before broad completion, fixing, cleanup, or retranslation.
- Run cleanup in dry-run mode first. Do not delete unused keys solely from low-confidence dynamic analysis.
- Respect the i18ntk 5.x license: qualifying noncommercial use is covered by PolyForm Noncommercial; commercial use requires a separate license.

## Validate outcomes

Run the narrow command that proves the requested behavior, then broaden appropriately:

```text
npx i18ntk --command=analyze --code-dir=./src --locales-dir=./locales --source-locale=en --no-prompt
npx i18ntk --command=validate --locales-dir=./locales --source-locale=en --no-prompt
npx i18ntk --command=usage --code-dir=./src --locales-dir=./locales --source-locale=en --no-prompt
```

On Windows PowerShell, set variables with `$env:NAME = "value"`; on POSIX shells use `NAME=value command`. Report exact exit codes, generated report paths, unresolved residuals, and commands not run.

For i18ntk package release work, run the package test suite and packed-install verifier from the package directory. Validate Workbench and Lens separately when their integration or shared configuration changes.
