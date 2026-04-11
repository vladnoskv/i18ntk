# i18ntk Documentation (v2)

This documentation set is for **i18ntk 2.x**.

## Start Here

- [API Reference](./api/API_REFERENCE.md)
- [Configuration Guide](./api/CONFIGURATION.md)
- [Runtime API Guide](./runtime.md)
- [Scanner Guide](./scanner-guide.md)
- [Environment Variables](./environment-variables.md)
- [Migration Guide v2.0.0](./migration-guide-v2.0.0.md)

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

## Configuration Source

i18ntk reads project settings from:

- `.i18ntk-config`

## Notes

- The docs intentionally avoid internal implementation details.
- For release/update workflow, see `DEVUPDATE.md` in the repository root.
