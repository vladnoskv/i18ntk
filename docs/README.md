# i18ntk Documentation (v5.1.0)

Choose what you want to do and jump straight to the relevant guide.

## New to i18ntk?

- [Getting Started](./getting-started.md)
- [Configuration Guide](./api/CONFIGURATION.md)

## Solve a translation problem

- [Auto Translate](./auto-translate.md) — fill missing translations while preserving placeholders and protected terms
- [Scanner](./scanner-guide.md) — find user-facing text that has not been internationalized
- [Runtime](./runtime.md) — load and switch translations in an application
- [Environment Variables](./environment-variables.md) — configure providers and automation safely

## Look up technical details

- [API Reference](./api/API_REFERENCE.md)
- [Reliability and extraction APIs](./reliability.md)
- [Upgrade from v4 to v5](./migration-v4-to-v5.md)

## Everyday workflow

Primary CLI:

```bash
i18ntk
i18ntk --command=init
i18ntk --command=analyze
i18ntk --command=validate
i18ntk --command=usage
```

Run `i18ntk` without arguments for the interactive menu. In a local project installation, prefix commands with `npx`.

Other focused commands:

```bash
i18ntk-init
i18ntk-analyze
i18ntk-validate
i18ntk-usage
i18ntk-scanner
i18ntk-sizing
i18ntk-complete
i18ntk-summary
i18ntk-doctor
i18ntk-fixer
i18ntk-backup
i18ntk-translate
```

Use `i18ntk --help` or `<command> --help` when you need flags and examples. Backup operations are exposed through `i18ntk-backup`.

## Configuration Source

i18ntk reads project settings from the project-local `.i18ntk-config` file. CLI flags override config values for one run, and the documented environment variables can override selected defaults.

## Setup Notes

- Run `i18ntk` or `i18ntk --command=init` to initialize a project.
- Use `--no-prompt` for CI or automated workflows.
- CI and non-TTY runs do not prompt. Commands use exit code `0` for success, `1` for validation/report/runtime failures, and `2` for invalid arguments or missing required setup.
- Prefer `--code-dir` or `--source-code-dir` for application source files, `--locales-dir` or `--i18n-dir` for locale files, and `--source-locale` for the source language. Legacy `--source-dir`, `--i18n-dir`, and `--source-language` remain supported.
- Backup behavior is optional and disabled by default during setup.
- Default target languages are `en`, `de`, `es`, `fr`, and `ru`.
- Init and analysis reports default to Markdown. Set `reports.format` to `markdown`, `json`, or `text` to change the report format.

## Maintainer and contributor notes

- The workspace root `package.json` is private; `i18ntk/package.json` is the publishable npm manifest.
- `npm run package:public` stages the public package and runs a dry-run pack.
- `npm run pack:public` creates the public tarball from the staged package.
- `npm run publish:public` publishes the staged package after `npm whoami` succeeds.
- `npm run verify:packed-install` verifies the exact tarball in a fresh randomized consumer project.

## Community Files

- [Licensing](../COMMERCIAL-LICENSE.md)
- [Contributing](../CONTRIBUTING.md)
- [Code of Conduct](../CODE_OF_CONDUCT.md)
- [Security Policy](../SECURITY.md)
- [Funding](../FUNDING.md)
