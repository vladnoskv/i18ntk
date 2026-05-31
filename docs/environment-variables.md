# Environment Variables (v4.2.1)

i18ntk uses fixed allowlists for environment variables. Core configuration variables are handled by `utils/env-manager.js`; Auto Translate provider variables are read by the translation provider layer.

## Core Variables

| Variable | Default | Purpose |
|---|---:|---|
| `I18NTK_LOG_LEVEL` | `error` | Logging level: `error`, `warn`, `info`, `debug`, or `silent` |
| `I18NTK_OUTDIR` | `./i18ntk-reports` | Output/report directory override |
| `I18NTK_UI_LANGUAGE` | `en` | CLI UI language: `en`, `de`, `es`, `fr`, `ru`, `ja`, or `zh` |
| `I18NTK_SILENT` | `false` | Reduce interactive prompts/output |
| `I18NTK_DEBUG_LOCALES` | `false` | Locale loading debug logs |
| `I18NTK_RUNTIME_DIR` | `null` | Runtime locale base directory override |
| `I18NTK_I18N_DIR` | `null` | i18n directory override |
| `I18NTK_SOURCE_DIR` | `null` | source directory override |
| `I18NTK_PROJECT_ROOT` | `null` | project root override |
| `I18NTK_FRAMEWORK_PREFERENCE` | `auto` | framework preference |
| `I18NTK_FRAMEWORK_FALLBACK` | `vanilla` | framework fallback |
| `I18NTK_FRAMEWORK_DETECT` | `true` | enable/disable framework detection |
| `I18NTK_DISABLE_AUTOSAVE` | `false` | disable config disk writes and keep runtime state in memory |
| `I18NTK_ENABLE_SECURITY_LOGS` | `false` | opt in to security event console logs |
| `I18NTK_INTERNAL_PATH_PREFIXES` | empty | internal path allowlist extension; outside roots are rejected |
| `DEBUG_MODE` | `false` | enable verbose build/runtime diagnostics |
| `JSON_LOG` | `false` | emit structured JSON log lines for CI/build systems |
| `CI` | `false` | CI detection |
| `CONTINUOUS_INTEGRATION` | `false` | CI detection |
| `NO_INTERACTIVE` | `false` | non-interactive detection |

## Auto Translate Provider Variables

| Variable | Purpose |
|---|---|
| `I18NTK_TRANSLATE_PROVIDER` | default provider when `--provider` is omitted: `google`, `deepl`, or `libretranslate` |
| `DEEPL_API_KEY` | required for `--provider deepl` |
| `DEEPL_API_URL` | optional DeepL endpoint, defaults to `https://api-free.deepl.com/v2/translate` |
| `I18NTK_ALLOW_CUSTOM_TRANSLATE_HOSTS` | set to `1` only for a trusted DeepL-compatible HTTPS proxy |
| `LIBRETRANSLATE_URL` | optional LibreTranslate endpoint, defaults to `https://libretranslate.com/translate` |
| `LIBRETRANSLATE_API_KEY` | optional LibreTranslate API key |
| `I18NTK_ALLOW_PRIVATE_TRANSLATE_URLS` | set to `1` only for trusted local/private LibreTranslate testing |

## Usage Examples

```bash
# Non-interactive validation with explicit output folder
I18NTK_SILENT=true I18NTK_OUTDIR=./i18ntk-reports i18ntk --command=validate --no-prompt

# Force scanner framework preference
I18NTK_FRAMEWORK_PREFERENCE=react i18ntk-scanner --source-dir=./src

# Runtime override
I18NTK_RUNTIME_DIR=./locales node app.js

# DeepL Auto Translate
DEEPL_API_KEY=your-key i18ntk-translate locales/en/common.json de --provider deepl --no-confirm

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

Configuration order, highest to lowest:

1. CLI flags
2. Supported environment variables
3. `.i18ntk-config`
4. Built-in defaults

## Security

- Only documented `I18NTK_*` variables are used by core config.
- Secret-like variable names are blocked from the core environment manager.
- Provider keys should be set through the environment or a secret manager, not committed to locale files, reports, or config.
- Custom provider URLs must use HTTPS. Local/private provider URLs require explicit opt-in for trusted testing.
- Security and config diagnostics are silent by default; opt in with `DEBUG_MODE=true` and/or `I18NTK_ENABLE_SECURITY_LOGS=true`.
