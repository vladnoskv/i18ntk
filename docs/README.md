# i18ntk Documentation (v3.0.0)

This documentation set is for **i18ntk 3.x**.

## Start Here

- [Getting Started](./getting-started.md)
- [API Reference](./api/API_REFERENCE.md)
- [Configuration Guide](./api/CONFIGURATION.md)
- [Runtime API Guide](./runtime.md)
- [Auto Translate Guide](./auto-translate.md)
- [Scanner Guide](./scanner-guide.md)
- [Environment Variables](./environment-variables.md)
- [Migration Guide v3.0.0](./migration-guide-v3.0.0.md)
- [Migration Guide v2.6.0](./migration-guide-v2.6.0.md)
- [Migration Guide v2.5.1](./migration-guide-v2.5.1.md)
- [Migration Guide v2.5.0](./migration-guide-v2.5.0.md)
- [Migration Guide v2.4.0](./migration-guide-v2.4.0.md)
- [Package Optimization Prompt](./development/package-optimization-prompt.md)

## Community Files

- [Contributing](../CONTRIBUTING.md)
- [Code of Conduct](../CODE_OF_CONDUCT.md)
- [Security Policy](../SECURITY.md)
- [Funding](../FUNDING.md)

## Command Model

Primary CLI:

```bash
i18ntk
i18ntk --command=init
i18ntk --command=analyze
i18ntk --command=validate
i18ntk --command=translate
```

Standalone binaries also exist for script-specific flows:

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

Note: backup operations are exposed through `i18ntk-backup` (standalone CLI).
The manager-command route `i18ntk --command=backup` is disabled in current builds.

## Configuration Source

i18ntk reads project settings from:

- `.i18ntk-config`

## Setup Notes

- Run `i18ntk` or `i18ntk --command=init` to initialize a project.
- Use `--no-prompt` for CI or automated workflows.
- Backup behavior is optional and disabled by default during setup.

## Maintainer Packaging Notes

- The root `package.json` is development-only.
- The public npm metadata lives in `package.public.json`.
- `npm run package:public` stages the public package and runs a dry-run pack.
- `npm run pack:public` creates the public tarball from the staged package.
- `npm run publish:public` publishes the staged package after `npm whoami` succeeds.
