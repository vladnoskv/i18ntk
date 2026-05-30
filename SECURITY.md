# Security Policy

## Supported Versions

The supported production line is `4.x`.

Versions earlier than `4.2.0` are not recommended for production use because later releases include Auto Translate provider hardening, dynamic-require elimination, path-validation hardening, runtime language validation, lazy loading with manifest validation, incremental backup hash-chain verification, and post-4.0.0 critical bug fixes for runtime staleness, backup verification, and CLI flag parsing.

## Security Model

i18ntk is a local developer CLI and runtime helper. It is expected to read and write project files, but it must do so with conservative path validation and without external runtime dependencies.

Security priorities:

- zero runtime dependencies
- no install-time lifecycle commands in the public package manifest
- no shipped local setup state, admin PINs, backup files, reports, logs, credentials, or generated artifacts
- centralized environment-variable access through `utils/env-manager.js` with a strict allowlist
- path containment checks based on resolved paths and `path.relative()`
- timing-safe comparison for authentication hashes or tokens
- silent-by-default logging for production-like contexts

## Published Package Controls

The npm package uses a stripped public manifest. It must not contain install-time lifecycle commands, dependency fields, local setup state, or development tooling.

## Socket.dev Analysis Disclaimer

Socket.dev scans the published npm package and may flag the following alerts. These are **expected behaviors** for a developer CLI/i18n toolkit and are mitigated as described:

| Alert | Design Rationale | Mitigation |
|---|---|---|
| **Network access** | Contacts configured translation providers via HTTPS only when user explicitly invokes auto-translate. No telemetry, no beaconing, no background network activity. | `utils/translate/safe-network.js` enforces HTTPS, host/path allowlists, response-size limits, private-network blocking, and redacted security logging for Google, DeepL, and LibreTranslate provider requests. |
| **Environment variable access** | Reads env vars for logging level, output directory, UI language, and project paths. Required for CLI configuration. | `utils/env-manager.js` uses a fixed allowlist (28 vars). Blocks `SECRET`, `PASSWORD`, `KEY`, `TOKEN`, `AWS_*`, `GITHUB_*`, `NPM_*`, `NODE_*`, `PATH`, `HOME`, `USER`, `SHELL`, and 8 more patterns. |
| **Filesystem access** | Reads/writes locale JSON files, config files, and reports within the user's project. Core function of the toolkit. | All FS operations are gated by `SecurityUtils.validatePath()` with path-traversal detection, symlink resolution, and base-path containment checks. |
| **URL strings** | Contains hardcoded translation provider endpoint URLs for Google, DeepL, and LibreTranslate defaults. | Only used when user invokes `i18ntk-translate`. Custom provider URLs remain HTTPS-only and are validated before use. |

The v3.3.0 release **resolved** the previously actionable Socket.dev alert:
- **Dynamic require** — all 21 instances eliminated (20 converted to static string literals, 1 gated with `SecurityUtils.validatePath`).

The v4.0.0 release adds the following security hardening:
- **Watch module**: all watched directories validated against project root with containment checks; capped at 50 directories.
- **Runtime lazy loading**: key-to-file manifest entries validated for path containment; manifest size capped at 100KB.
- **Incremental backups**: hash-chain verification before restore; chain depth capped at 10 increments; circular parent references detected.
- **Protection context rules**: DSL-parsed context rules — never raw user-controlled regex from config; bounded at 200 chars per rule, 100 rules total; Unicode-aware `\p{P}` word boundaries for non-ASCII language support.
- **Scanner multi-language detection**: source-language propagation fixed; stopword-less language profiles now still enforce valid-character ratios.
- **Usage dead key detection**: optimized O(n+m) comment scanning instead of O(n*m); all CLI boolean flags validated with strict `toBool()` conversion.

The v4.2.0 release adds the following security hardening:
- **Shared path validation**: artifact-like filenames no longer bypass base containment; cross-drive absolute paths and environment-added internal prefixes are constrained.
- **Backup restore**: backup entry names must be plain `.json` filenames and are restored through stable output-directory containment.
- **Runtime locale loading**: language identifiers are validated before locale path resolution.
- **Auto Translate networking**: IPv4-mapped IPv6 loopback/private hosts are blocked by provider URL validation.

## Reporting Vulnerabilities

Do not report security vulnerabilities in public GitHub issues.

Use GitHub Security Advisories for private vulnerability reports. Include:

- affected version
- clear reproduction steps
- expected and actual behavior
- impact assessment
- proof of concept, if safe to share privately

## Disclosure Process

Security reports are reviewed privately first. Confirmed issues should receive:

- a fix or mitigation
- a release note or migration note when user action is required
- an npm release when the fix affects published users

## User Guidance

- Keep i18ntk updated to `4.2.0` or newer.
- Do not commit `.i18ntk-config`, admin PIN files, backup directories, generated reports, logs, npm credentials, or secret material.
- Run i18ntk only in project directories you trust.
- Review generated translation changes before committing them.
