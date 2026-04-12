# i18ntk Configuration Guide (v2)

## Overview

i18ntk v2 uses a project-local config file named `.i18ntk-config`.

- Location: project root
- Format: JSON
- Recommended: commit this file for shared team defaults

## Main Config File

Example:

```json
{
  "version": "2.3.1",
  "language": "en",
  "uiLanguage": "en",
  "projectRoot": ".",
  "sourceDir": "./locales",
  "i18nDir": "./locales",
  "outputDir": "./i18ntk-reports",
  "sourceLanguage": "en",
  "defaultLanguages": ["de", "es", "fr", "ru"],
  "framework": {
    "detected": false,
    "preference": "auto"
  },
  "setup": {
    "completed": true
  }
}
```

## Key Fields

- `sourceDir`: locale source path for scans/analysis
- `i18nDir`: locale path used by scripts that separate source vs i18n input
- `outputDir`: report output directory
- `sourceLanguage`: base language for key completeness checks
- `defaultLanguages`: target languages used by init/completion flows
- `uiLanguage`: CLI message language
- `setup.completed`: setup marker used by startup checks
- `backup.enabled`: enable or disable backup creation
- `backup.location`: separate backup root directory
- `backup.maxBackups`: how many backups to keep before auto-cleanup

## Path and Value Resolution

Value precedence (highest to lowest):

1. CLI flags
2. Environment variables (allowlist only)
3. `.i18ntk-config`
4. Built-in defaults

Common flags:

- `--source-dir`
- `--i18n-dir`
- `--output-dir`
- `--source-language`
- `--ui-language`
- `--no-prompt`

## Command Examples

```bash
# Initialize with defaults from .i18ntk-config
i18ntk --command=init

# Override directories for one run
i18ntk --command=analyze --source-dir=./locales --output-dir=./i18ntk-reports

# Non-interactive validation
i18ntk --command=validate --no-prompt
```

Standalone binaries also read `.i18ntk-config`:

```bash
i18ntk-init --no-prompt
i18ntk-analyze --source-dir=./locales
i18ntk-validate --source-language=en
```

## Legacy Config Compatibility

v2 keeps compatibility with older config locations during migration, but `.i18ntk-config` is the source of truth for current projects.

## Setup Behavior

When `setup.completed` is `true`, i18ntk treats the project as initialized and does not prompt for setup again.

Backup settings are optional:

- backups are disabled by default
- backup location is stored separately from locale source files
- backup retention is bounded so it does not recurse into backup output

## Runtime Setup Example

```js
const runtime = require('i18ntk/runtime');

runtime.initRuntime({
  baseDir: './locales',
  language: 'en',
  fallbackLanguage: 'en'
});
```

## Security Notes

- Do not store secrets in `.i18ntk-config`.
- i18ntk does not require API keys for core workflows.
- Keep config scoped to project paths, not user-home global paths.
