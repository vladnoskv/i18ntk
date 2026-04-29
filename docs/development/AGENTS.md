# AI Agent Guidelines for i18ntk v2.5.0

## Current Project State

i18ntk is a zero-dependency CommonJS npm package for internationalization setup, scanning, analysis, validation, fixing, reporting, and lightweight runtime translation loading.

Current release baseline: `2.5.0`.

Core release priorities:

- Keep the package zero-dependency.
- Keep first install clean: no shipped local setup state, admin config, reports, backups, logs, or generated artifacts.
- Keep the npm package minimal: ship only runtime and CLI files that are required by installed users.
- Keep developer docs, tests, benchmarks, and release tools in git only.
- Prefer small, high-confidence security and correctness fixes over broad refactors.

## Required Workflow

1. Inspect before changing.
2. Trace bugs to root cause before patching symptoms.
3. Search all affected code paths, tests, package metadata, ignore rules, and docs.
4. Preserve backward compatibility unless a breaking change is explicitly requested.
5. Validate with tests, security checks, package dry-runs, or precise reasoning.
6. Call out anything not verified.

## Release And Packaging Rules

Before any publish or release handoff:

```bash
npm run release:reset
npm run test:all
npm run lint:locales
npm audit --omit=dev
npm pack --dry-run
```

The package must not include:

- `docs/`
- `tests/`
- `scripts/`
- `benchmarks/`
- local `.i18ntk-config`
- `.i18n-admin-config.json`
- `settings/i18ntk-config.json`
- `settings/admin-pin.json`
- backups, reports, logs, npm credentials, temp config files, or generated setup reports
- dev-only utilities such as `security-check-improved.js`, `security-fixed.js`, `security-config.js`, `setup-validator.js`, or unused backup/security helpers

The package should include only:

- required `bin` entrypoints under `main/`
- required manager command/service files under `main/manage/`
- `runtime/`
- required production utilities under `utils/`
- required settings UI files under `settings/`
- `ui-locales/`
- `LICENSE`, `README.md`, and `package.json`

Do not re-add broad package exports such as `./utils/*`, `./main/*`, or `./settings/*` unless there is a deliberate public API decision and the shipped files match that API.

## First-Install State

Installed users must start from a clean setup flow.

Important:

- Do not ship project-local `.i18ntk-config`.
- Do not ship stale package defaults that mark setup as completed.
- Do not ship admin PIN/config files.
- Do not ship backup or report folders.
- The in-code default config in `utils/config-manager.js` is the fallback source of truth for first install and should keep `setup.completed: false`.

Use `npm run release:reset` to remove local runtime state before packaging.

## Security Rules

Follow secure-by-default Node.js CLI practices:

- Validate paths with `SecurityUtils.validatePath()` or containment-safe helpers before reading, writing, deleting, or listing user-controlled paths.
- Do not use string-prefix path containment checks. Use `path.relative()` and reject paths outside the intended base.
- Avoid shell execution in production code. `child_process` is allowed only in dev/release scripts when there is no production exposure.
- Keep environment-variable access centralized through `utils/env-manager.js`.
- Do not read arbitrary environment variables or secrets.
- Do not accept secrets through command-line flags when avoidable. Prefer masked prompts or config files with restricted permissions.
- Use timing-safe comparison for hashes or authentication tokens.
- Keep logs silent by default in production-like contexts.
- Do not write secrets, PINs, tokens, backup contents, npm credentials, or local config state into git or npm packages.

## Zero-Dependency Rule

Runtime and CLI production code must use Node.js built-ins only.

Do not add dependencies or devDependencies without explicit approval and a clear security/maintenance justification. If a feature can be implemented safely with built-ins, use built-ins.

After any package metadata change, verify:

```bash
npm audit --omit=dev
npm pack --dry-run
```

## Translation Rules

When changing translations:

- Preserve JSON structure and valid syntax.
- Preserve placeholders such as `{name}`, `{{name}}`, `%s`, `%d`, and framework-specific interpolation syntax.
- Do not translate keys, config field names, command flags, file paths, or code identifiers.
- Keep UI translations native and context-aware.
- Run `npm run lint:locales` after locale edits.

Supported UI locale files currently live in `ui-locales/`:

- `en.json`
- `de.json`
- `es.json`
- `fr.json`
- `ru.json`
- `ja.json`
- `zh.json`

## Core Structure

```text
main/                  CLI entrypoints
main/manage/           Primary manager, commands, services, menus
runtime/               Application runtime translation API
utils/                 Production utility modules and dev-only tools kept out of npm by package files
settings/              Settings UI and language config
ui-locales/            Toolkit UI translations
tests/                 Development tests, not shipped
scripts/               Development/release scripts, not shipped
docs/                  Development and user docs, not shipped except README.md
benchmarks/            Development benchmark data, not shipped
```

## Important Validation Commands

```bash
npm run security:check
npm run security:test
npm run test:all
npm run lint:locales
npm audit --omit=dev
npm pack --dry-run
```

Use `npm run release:reset` before release packaging.

## Known v2.5.0 Hardening Decisions

- Environment access is intentionally centralized in `utils/env-manager.js`.
- Filesystem access is expected because this is a local-file CLI, but all user-controlled paths should be validated.
- The npm package intentionally excludes docs, tests, scripts, benchmarks, local state, backup artifacts, and dev-only security tooling.
- `README.md` remains packaged because npm uses it for the package page.
- `settings/i18ntk-config.json` is not shipped; it previously contained stale completed setup state and must stay out of the npm payload.

## Response Expectations For Agents

When reporting work, use:

- Summary
- Key findings
- Changes made
- Validation
- Remaining risks

Keep responses factual. Do not invent command results or publish status. If npm publishing is requested, verify auth with `npm whoami` first and report any blocker exactly.
