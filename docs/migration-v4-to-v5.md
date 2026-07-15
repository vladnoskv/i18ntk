# Upgrade to i18ntk v5

i18ntk v5 gives you broader framework and file-type detection, safer project scanning, stronger translation checks, and a simpler setup experience. Your locale files continue to work as before.

## Before you upgrade: licensing

Versions of i18ntk released under MIT remain available under their original MIT terms. i18ntk 5.0.0 and later use [PolyForm Noncommercial 1.0.0](../LICENSE) for qualifying personal and noncommercial use.

If you use i18ntk for a business, client work, a paid product or service, company-internal work, or CI/CD connected to that work, you need a separate written commercial licence. Read the [commercial licensing information](../COMMERCIAL-LICENSE.md) before upgrading. If you are unsure which terms apply, please obtain written permission or independent legal advice.

## Upgrade in three steps

### 1. Install v5

From your project folder, install the current v5 release and confirm it is available:

```bash
npm install --save-dev i18ntk@^5
npx i18ntk --version
```

Commit the updated lockfile with your project so everyone on the team and in CI uses the same reviewed version.

### 2. Let i18ntk update its configuration

Run an analysis using the folders and source language that apply to your project:

```bash
npx i18ntk --command=analyze --code-dir=./src --locales-dir=./locales --source-locale=en --no-prompt
```

On its next normal run, v5 performs a **one-time configuration migration**. It detects your framework and adds sensible file extensions and exclusions for generated files, build output, and lockfiles.

Your existing `.i18ntk-config` choices are kept. In particular, custom source extensions, excluded files and folders, and framework preferences are not replaced. Review the updated config if your project intentionally scans generated files or uses an unusual source layout.

### 3. Check your translations

Run these checks before making bulk changes:

```bash
npx i18ntk --command=validate --code-dir=./src --locales-dir=./locales --source-locale=en --no-prompt
npx i18ntk --command=usage --code-dir=./src --locales-dir=./locales --source-locale=en --no-prompt
```

`validate` finds missing keys, placeholder mismatches, and translation-quality issues. `usage` helps identify keys that are no longer used. Back up your locale files before using commands that write, complete, fix, or bulk-translate values.

## What changes for your project?

| Area               | What v5 does                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Frameworks         | Recognises more JavaScript, TypeScript, mobile, and server-side frameworks so scanning starts with better defaults. |
| File types         | Scans more common source files, including Astro, MDX, modern JavaScript/TypeScript module formats, and Rust.        |
| Configuration      | Adds framework-aware defaults once while preserving your existing customisations.                                   |
| Translation checks | Understands ICU MessageFormat and Fluent placeholders, helping prevent invalid translations.                        |
| Automation         | Provides clear non-interactive commands for CI and AI coding tools.                                                 |

For the full list of framework defaults, see [framework templates](./framework-templates.md).

## If you use CI or an AI coding assistant

Use an explicit command with `--no-prompt` whenever a person will not be available to answer the menu. Do not run bare `npx i18ntk` in CI because it opens the interactive menu.

```bash
CI=true npx i18ntk --command=validate --code-dir=./src --locales-dir=./locales --source-locale=en --no-prompt
```

i18ntk also includes an optional skill for Codex, Claude Code, GitHub Copilot, and compatible tools. Preview the files it would add before installing them:

```bash
npx i18ntk --command=skills --agents=codex,claude,copilot --scope=project --dry-run --no-prompt
```

## If your commercial agreement requires a public licence marker

Most users do not need to do anything in this section. Use a public marker only when your written commercial licence specifically requires it. The marker is not a licence key and is not an authentication method.

Generate and check the marker locally with the opaque identifier supplied by the licensor:

```bash
npx i18ntk-license generate --license-id LIC-EXAMPLE-123456 --domains example.com --output ./public/i18ntk-license.json
npx i18ntk-license verify --file ./public/i18ntk-license.json --domain example.com
```

Only publish the generated JSON and the printed HTML meta tag. Never put API keys, contracts, names, email addresses, billing details, private hostnames, internal domains, or secrets in it. The verifier only checks the local file and domain format: it makes no network request, sends no telemetry, and does not inspect your site.

## Upgrade checklist

1. Confirm that the v5 licence is suitable for your use.
2. Install v5 and commit the lockfile update.
3. Run analysis once and review the one-time configuration migration.
4. Run validation and usage checks, then fix any findings you want to address.
5. Run your normal application tests and CI workflow before deploying.

If you need to stay on v4 because its MIT terms are required, keep using the version already approved for your project. Otherwise, v5 is the recommended upgrade path.
