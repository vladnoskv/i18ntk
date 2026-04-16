# i18ntk API Reference (v2)

## Primary CLI

```bash
i18ntk
i18ntk --help
```

Direct command execution:

```bash
i18ntk --command=init
i18ntk --command=analyze
i18ntk --command=validate
i18ntk --command=usage
i18ntk --command=scanner
i18ntk --command=sizing
i18ntk --command=complete
i18ntk --command=summary
i18ntk --command=debug
```

## Standalone Executables

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

## Common Options

Most commands support:

- `--source-dir <path>`
- `--i18n-dir <path>`
- `--output-dir <path>`
- `--source-language <code>`
- `--ui-language <code>`
- `--no-prompt`
- `--dry-run`
- `--help`

## Scanner-Specific Options

`i18ntk-scanner` (or `i18ntk --command=scanner`) supports additional options:

- `--patterns <regex-list>`
- `--exclude <pattern-list>`
- `--output-report`
- `--min-length <n>`
- `--max-length <n>`
- `--include-tests`

## Sizing Command

```bash
i18ntk-sizing --source-dir ./locales --format table
i18ntk-sizing --source-dir ./locales --detailed --output-dir ./i18ntk-reports
```

## Backup Command

Backup operations are available via the standalone executable.
Manager route `i18ntk --command=backup` is disabled in current builds.

```bash
i18ntk-backup --help
i18ntk-backup create ./locales
i18ntk-backup list
i18ntk-backup restore <backup-file>
i18ntk-backup verify <backup-file>
i18ntk-backup cleanup --keep 10
```

## Runtime API

See [Runtime API Guide](../runtime.md).

## Configuration

See [Configuration Guide](./CONFIGURATION.md).
