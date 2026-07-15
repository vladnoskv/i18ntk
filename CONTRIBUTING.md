# Contributing to i18ntk

Thanks for helping improve i18ntk.

## Contribution licensing

i18ntk uses a noncommercial and commercial dual-license model. By intentionally submitting a contribution, you represent that you have the right to submit it and grant Vlad Noskov a perpetual, worldwide, irrevocable, non-exclusive, royalty-free license to use, reproduce, modify, distribute, sublicense, and commercially license that contribution as part of i18ntk.

You retain ownership of your contribution. Do not submit employer-owned or third-party code unless you have written authority to grant these rights. Maintainers may request confirmation of that authority before accepting a contribution.

## Project Priorities

- Keep the npm package zero-dependency.
- Keep the published package minimal and free of tests, local setup state, reports, backups, logs, credentials, and generated artifacts.
- Preserve backward compatibility unless a breaking change is intentional and documented.
- Prefer small, well-tested fixes over broad refactors.

## Development Setup

Clone the repository, install with npm, and run the project validation checks before opening a pull request.

## Release Validation

Maintainer release commands are documented in the repository development guide. The package published to npm uses a stripped public manifest.

## Security

Follow the security guidance in `SECURITY.md` and `docs/development/AGENTS.md`.

Report vulnerabilities through GitHub Security Advisories. Do not open public issues for sensitive security reports.

## Translations

When editing `ui-locales/`, preserve JSON structure, placeholders, command names, file paths, and config keys.

Run:

Run the locale lint check before submitting translation changes.

## Pull Requests

Include:

- the problem being fixed
- the user-visible behavior change
- validation commands that were run
- any remaining risk or unverified behavior
- confirmation that you agree to the contribution licensing terms above
