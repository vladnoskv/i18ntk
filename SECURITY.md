# Security Policy

## Supported Versions

The supported production line is `2.5.x`.

Versions earlier than `2.5.0` are not recommended for production use because later releases include package, filesystem, environment, and admin-auth hardening.

## Security Model

i18ntk is a local developer CLI and runtime helper. It is expected to read and write project files, but it must do so with conservative path validation and without external runtime dependencies.

Security priorities:

- zero runtime dependencies
- no install-time lifecycle commands in the public package manifest
- no shipped local setup state, admin PINs, backups, reports, logs, credentials, or generated artifacts
- centralized environment-variable access through `utils/env-manager.js`
- path containment checks based on resolved paths and `path.relative()`
- timing-safe comparison for authentication hashes or tokens
- silent-by-default logging for production-like contexts

## Published Package Controls

The npm package uses a stripped public manifest. It must not contain install-time lifecycle commands, dependency fields, local setup state, or development tooling.

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

- Keep i18ntk updated to `2.5.0` or newer.
- Do not commit `.i18ntk-config`, admin PIN files, backup directories, generated reports, logs, npm credentials, or secret material.
- Run i18ntk only in project directories you trust.
- Review generated translation changes before committing them.
