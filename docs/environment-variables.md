# Environment Variables (v3)

i18ntk uses a fixed allowlist of environment variables.

Update-check environment flags were removed. i18ntk no longer performs npm registry
update checks during CLI startup.

## Supported Variables

| Variable | Default | Purpose |
|---|---|---|
| `I18NTK_LOG_LEVEL` | `error` | Logging level (`error`, `warn`, `info`, `debug`, `silent`) |
| `I18NTK_OUTDIR` | `./i18ntk-reports` | Output/report directory |
| `I18NTK_UI_LANGUAGE` | `en` | CLI UI language |
| `I18NTK_SILENT` | `false` | Reduce interactive prompts/output |
| `I18NTK_DEBUG_LOCALES` | `0` | Locale loading debug logs |
| `I18NTK_RUNTIME_DIR` | `null` | Runtime locale base directory override |
| `I18NTK_I18N_DIR` | `./locales` | i18n directory override |
| `I18NTK_SOURCE_DIR` | `./locales` | source directory override |
| `I18NTK_PROJECT_ROOT` | `.` | project root override |
| `I18NTK_FRAMEWORK_PREFERENCE` | `auto` | framework preference |
| `I18NTK_FRAMEWORK_FALLBACK` | `vanilla` | framework fallback |
| `I18NTK_FRAMEWORK_DETECT` | `true` | enable/disable framework detection |
| `I18NTK_DISABLE_AUTOSAVE` | `0` | Disable config disk writes (keep in-memory only) |
| `DEBUG_MODE` | `false` | Enable verbose build/runtime diagnostics (`info`, `warn`, `debug`) |
| `JSON_LOG` | `false` | Emit structured JSON log lines for CI/build systems |
| `I18NTK_ENABLE_SECURITY_LOGS` | `false` | Opt-in security event console logging (`[SECURITY ...]`) |

## Usage Examples

```bash
# Non-interactive validation with explicit output folder
I18NTK_SILENT=true I18NTK_OUTDIR=./i18ntk-reports i18ntk --command=validate --no-prompt

# Force scanner framework preference
I18NTK_FRAMEWORK_PREFERENCE=react i18ntk-scanner --source-dir=./src

# Runtime override
I18NTK_RUNTIME_DIR=./locales node app.js

# Opt-in troubleshooting logs
DEBUG_MODE=true I18NTK_ENABLE_SECURITY_LOGS=true i18ntk --command=validate
```

PowerShell:

```powershell
$env:I18NTK_LOG_LEVEL = "debug"
$env:I18NTK_SOURCE_DIR = "./locales"
i18ntk --command=analyze
```

## Precedence

Configuration order (highest to lowest):

1. CLI flags
2. Environment variables
3. `.i18ntk-config`
4. Built-in defaults

## Security

- Only allowlisted `I18NTK_*` variables are used.
- Secret-like variable names are blocked by policy.
- Keep secrets out of i18ntk config and environment settings.
- Security and config diagnostics are silent by default; opt in with `DEBUG_MODE=true` and/or `I18NTK_ENABLE_SECURITY_LOGS=true`.
