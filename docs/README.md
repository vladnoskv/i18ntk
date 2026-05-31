# i18ntk Documentation (v4.3.0)

This documentation set covers the current `i18ntk` CLI, runtime API, configuration model, Auto Translate flow, and migration notes for `4.3.0`.

## Start Here

- [Getting Started](./getting-started.md)
- [API Reference](./api/API_REFERENCE.md)
- [Configuration Guide](./api/CONFIGURATION.md)
- [Runtime API Guide](./runtime.md)
- [Auto Translate Guide](./auto-translate.md)
- [Scanner Guide](./scanner-guide.md)
- [Environment Variables](./environment-variables.md)
- [Migration Guide v4.3.0](./migration-guide-v4.3.0.md)

## Command Model

Primary CLI:

```bash
i18ntk
i18ntk --help
i18ntk --version
i18ntk --command=init
i18ntk --command=analyze
i18ntk --command=validate
i18ntk --command=usage
i18ntk --command=scanner
i18ntk --command=sizing
i18ntk --command=complete
i18ntk --command=translate
i18ntk --command=summary
```

Standalone executables:

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

Backup operations are exposed through `i18ntk-backup`. The manager route `i18ntk --command=backup` is intentionally disabled in current builds.

## Configuration Source

i18ntk reads project settings from the project-local `.i18ntk-config` file. CLI flags override config values for one run, and the documented environment variables can override selected defaults.

## Setup Notes

- Run `i18ntk` or `i18ntk --command=init` to initialize a project.
- Use `--no-prompt` for CI or automated workflows.
- Backup behavior is optional and disabled by default during setup.
- Default target languages are `en`, `de`, `es`, `fr`, and `ru`.
- Init and analysis reports default to Markdown. Set `reports.format` to `markdown`, `json`, or `text` to change the report format.

## Maintainer Packaging Notes

- The root `package.json` is the development manifest.
- The public npm metadata lives in `package.public.json`.
- `npm run package:public` stages the public package and runs a dry-run pack.
- `npm run pack:public` creates the public tarball from the staged package.
- `npm run publish:public` publishes the staged package after `npm whoami` succeeds.

## Community Files

- [Contributing](../CONTRIBUTING.md)
- [Code of Conduct](../CODE_OF_CONDUCT.md)
- [Security Policy](../SECURITY.md)
- [Funding](../FUNDING.md)
