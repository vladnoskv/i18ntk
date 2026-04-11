# Migration Guide: v1.x to v2.0.0

## What Changed

- Primary config file is `.i18ntk-config` in project root.
- Primary command model is `i18ntk --command=<name>`.
- Standalone binaries remain available (`i18ntk-init`, `i18ntk-analyze`, etc.).
- Runtime package remains zero dependency.

## Command Mapping

Use these v2 commands:

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

Standalone alternatives:

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

## Config Migration

v2 reads `.i18ntk-config` as the canonical project config.

Recommended minimum:

```json
{
  "version": "2.0.0",
  "sourceDir": "./locales",
  "i18nDir": "./locales",
  "outputDir": "./i18ntk-reports",
  "sourceLanguage": "en",
  "setup": { "completed": true }
}
```

## Verification Checklist

```bash
i18ntk --help
i18ntk --command=init --no-prompt
i18ntk --command=analyze --no-prompt
i18ntk --command=validate --no-prompt
i18ntk --command=complete --no-prompt
```

Confirm:

- no setup loop when running `init`
- no backup directory treated as a language in `complete`
- reports generated under `./i18ntk-reports`

## Rollback

If needed:

```bash
npm install -g i18ntk@1.10.2
```

Then restore backup files created before migration.
