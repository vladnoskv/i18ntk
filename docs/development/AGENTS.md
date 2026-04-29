# AI Agent Guidelines for i18ntk v2.5.1

## Current Project State

i18ntk is a zero-dependency CommonJS npm package for internationalization setup, scanning, analysis, validation, fixing, reporting, and lightweight runtime translation loading.

Current release baseline: `2.5.1`.

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
npm run package:public
```

The root `package.json` is the development manifest and contains maintainer scripts. It is marked private and must not be published directly. The public npm manifest is `package.public.json`; `npm run package:public`, `npm run pack:public`, and `npm run publish:public` stage that manifest as `.release/i18ntk-public/package.json`.

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
- top-level community/security files: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `FUNDING.md`, and `SECURITY.md`

Do not re-add broad package exports such as `./utils/*`, `./main/*`, or `./settings/*` unless there is a deliberate public API decision and the shipped files match that API.

Do not pack or publish the repository root with `npm pack` or `npm publish`. Use `npm run package:public`, `npm run pack:public`, or `npm run publish:public` so the public manifest has no dev scripts, no dependencies, and no local release tooling.

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
npm run package:public
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
npm run package:public
```

Use `npm run release:reset` before release packaging.

## Known v2.5.1 Hardening Decisions

- `AdminAuth.verifyPin()` must fail closed when admin PIN config is missing, disabled, or malformed.
- If settings require admin PIN protection but admin config is unusable, auth-required checks must require auth and verification must fail closed.
- Admin sessions store both `expires` and `expiresAt`; cleanup must support both formats.
- Environment access is intentionally centralized in `utils/env-manager.js`.
- Filesystem access is expected because this is a local-file CLI, but all user-controlled paths should be validated.
- The npm package intentionally excludes docs, tests, scripts, benchmarks, local state, backup artifacts, and dev-only security tooling.
- The npm package is staged from `package.public.json`; root `package.json` is development-only.
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
