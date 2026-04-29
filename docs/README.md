# i18ntk Documentation (v2.5.0)

This documentation set is for **i18ntk 2.x**.

## Start Here

- [Getting Started](./getting-started.md)
- [API Reference](./api/API_REFERENCE.md)
- [Configuration Guide](./api/CONFIGURATION.md)
- [Runtime API Guide](./runtime.md)
- [Scanner Guide](./scanner-guide.md)
- [Environment Variables](./environment-variables.md)
- [Migration Guide v2.5.0](./migration-guide-v2.5.0.md)
- [Migration Guide v2.4.0](./migration-guide-v2.4.0.md)
- [Package Optimization Prompt](./development/package-optimization-prompt.md)

## Command Model

Primary CLI:

```bash
i18ntk
i18ntk --command=init
i18ntk --command=analyze
i18ntk --command=validate
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
