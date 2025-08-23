# Environment Variables

The i18n Toolkit supports a fixed allowlist of environment variables for configuration. These variables provide a convenient way to customize behavior without modifying configuration files.

## 🆕 v1.10.2 Updates

### Enhanced Environment Variable Management
- **Centralized Configuration**: All environment variables now use the `I18NTK_` prefix for consistency
- **Security Filtering**: Automatic blocking of sensitive variables (secrets, passwords, tokens)
- **Debug Support**: Enhanced debug logging for environment variable processing
- **Validation**: Comprehensive validation with helpful error messages

### Critical Fix: projectRoot Path
- **Fixed Default**: `I18NTK_PROJECT_ROOT` now defaults to `/` instead of `./` when resetting settings
- **Migration Impact**: Fresh installs work out-of-the-box without path configuration issues
- **Backward Compatibility**: Existing configurations remain unchanged

## Supported Environment Variables

### Logging and Output

| Variable | Description | Default | Valid Values |
|----------|-------------|---------|--------------|
| `I18NTK_LOG_LEVEL` | Controls the logging verbosity | `error` | `error`, `warn`, `info`, `debug`, `silent` |
| `I18NTK_OUTDIR` | Directory for reports and generated files | `./i18ntk-reports` | Any valid directory path |

### UI and Interaction

| Variable | Description | Default | Valid Values |
|----------|-------------|---------|--------------|
| `I18NTK_LANG` | UI language for messages and prompts | `en` | `en`, `de`, `es`, `fr`, `ru`, `ja`, `zh` |
| `I18NTK_SILENT` | Suppress interactive prompts and reduce output | `false` | `true`, `false`, `1`, `0`, `yes`, `no` |

### Debug and Development

| Variable | Description | Default | Valid Values |
|----------|-------------|---------|--------------|
| `I18NTK_DEBUG_LOCALES` | Enable debug logging for locale loading | `0` | `0`, `1`, `true`, `false` |

### Runtime Configuration

| Variable | Description | Default | Valid Values |
|----------|-------------|---------|--------------|
| `I18NTK_RUNTIME_DIR` | Custom runtime directory path | `null` | Any valid directory path or `null` |
| `I18NTK_I18N_DIR` | Directory containing i18n/locale files | `./locales` | Any valid directory path |
| `I18NTK_SOURCE_DIR` | Source directory for scanning translation files | `./locales` | Any valid directory path |
| `I18NTK_PROJECT_ROOT` | Project root directory | `/` | Any valid directory path |

### Framework Detection

| Variable | Description | Default | Valid Values |
|----------|-------------|---------|--------------|
| `I18NTK_FRAMEWORK_PREFERENCE` | Preferred framework detection | `auto` | `auto`, `vanilla`, `react`, `vue`, `angular`, `svelte`, `i18next`, `nuxt`, `next`, `django`, `flask`, `fastapi`, `spring-boot`, `laravel` |
| `I18NTK_FRAMEWORK_FALLBACK` | Fallback framework when auto-detection fails | `vanilla` | `vanilla`, `react`, `vue`, `angular`, `svelte`, `i18next`, `nuxt`, `next`, `django`, `flask`, `fastapi`, `spring-boot`, `laravel` |
| `I18NTK_FRAMEWORK_DETECT` | Enable automatic framework detection | `true` | `true`, `false`, `1`, `0`, `yes`, `no` |

## Usage Examples

### Command Line Usage

```bash
# Set log level to debug
I18NTK_LOG_LEVEL=debug npx i18ntk analyze

# Use custom output directory
I18NTK_OUTDIR=./reports npx i18ntk validate

# Run in silent mode
I18NTK_SILENT=true npx i18ntk complete --source-dir=./locales

# Set UI language to German
I18NTK_LANG=de npx i18ntk init
```

### Cross-Platform Usage

#### Windows (Command Prompt)
```cmd
set I18NTK_LOG_LEVEL=debug
set I18NTK_OUTDIR=./reports
npx i18ntk analyze
```

#### Windows (PowerShell)
```powershell
$env:I18NTK_LOG_LEVEL="debug"
$env:I18NTK_OUTDIR="./reports"
npx i18ntk analyze
```

#### Linux/macOS
```bash
export I18NTK_LOG_LEVEL=debug
export I18NTK_OUTDIR=./reports
npx i18ntk analyze
```

## CLI Flag Equivalents

All environment variables have corresponding CLI flags:

| Environment Variable | CLI Flag | Example |
|---------------------|----------|---------|
| `I18NTK_LOG_LEVEL` | `--log-level` | `--log-level=debug` |
| `I18NTK_OUTDIR` | `--output-dir` | `--output-dir=./reports` |
| `I18NTK_LANG` | `--ui-language` | `--ui-language=de` |
| `I18NTK_SILENT` | `--silent` | `--silent=true` |
| `I18NTK_DEBUG_LOCALES` | `--debug-locales` | `--debug-locales=true` |
| `I18NTK_SOURCE_DIR` | `--source-dir` | `--source-dir=./locales` |
| `I18NTK_I18N_DIR` | `--i18n-dir` | `--i18n-dir=./locales` |
| `I18NTK_FRAMEWORK_PREFERENCE` | `--framework` | `--framework=react` |

## Precedence Rules

Configuration values are resolved in the following order (highest to lowest):

1. **CLI flags** (e.g., `--log-level=debug`)
2. **Environment variables** (e.g., `I18NTK_LOG_LEVEL=debug`)
3. **Configuration file** (i18ntk-config.json)
4. **Default values**

## Security Considerations

### Blocked Variables
The toolkit explicitly blocks access to sensitive environment variables to prevent security issues. The following patterns are blocked:

- Variables containing `SECRET`, `PASSWORD`, `KEY`, `TOKEN`, `API_KEY`, `PRIVATE`, `AUTH`, `CREDENTIAL`
- AWS, GitHub, NPM specific variables
- System variables like `PATH`, `HOME`, `USER`, `SHELL`

### No Secrets Policy
**Important**: Never store sensitive information like API keys, passwords, or tokens in environment variables for this toolkit. The toolkit is designed to work without any secrets.

### Validation
All environment variables are validated against:
- Type checking (string, boolean, etc.)
- Value constraints (allowed values, ranges)
- Path validation for directory paths
- Security filtering

## Configuration File vs Environment Variables

While environment variables provide quick configuration, the configuration file (`i18ntk-config.json`) is recommended for:

- Team-wide settings
- Complex configurations
- Persistent settings across sessions
- Version control integration

Environment variables are ideal for:
- CI/CD pipelines
- Temporary overrides
- Docker/container environments
- Development/testing scenarios

## Migration Guide: projectRoot Path Change

### v1.10.2 Critical Fix
In v1.10.2, we fixed a critical issue where resetting settings would incorrectly restore `projectRoot` to `"./"` instead of `"/"`. This caused fresh installations to fail.

#### Before (v1.10.1 and earlier)
```json
{
  "projectRoot": "./"
}
```

#### After (v1.10.2+)
```json
{
  "projectRoot": "/"
}
```

### Impact Assessment
- **✅ Fresh installs**: Now work out-of-the-box without configuration issues
- **✅ Existing users**: Your current `projectRoot` settings remain unchanged
- **✅ Reset operations**: Settings reset now uses the correct default path

### Manual Migration (if needed)
If you experience issues, manually update your configuration:

```bash
# Check current projectRoot
i18ntk settings get projectRoot

# Update to new default (if needed)
i18ntk settings set projectRoot "/"
```

## Troubleshooting

### Debug Mode
Enable debug logging to see how environment variables are being processed:

```bash
I18NTK_LOG_LEVEL=debug I18NTK_DEBUG_LOCALES=1 npx i18ntk analyze
```

### Validation Errors
If an environment variable has an invalid value, the toolkit will:
1. Log a warning message
2. Use the default value
3. Continue execution

### Common Issues

| Issue | Solution |
|-------|----------|
| Variable not taking effect | Check for typos in variable names |
| Invalid path errors | Ensure paths are absolute or relative to project root |
| Language not changing | Verify the language code is supported |
| Silent mode not working | Check if CLI flags override environment variables |
| projectRoot issues | Use `I18NTK_PROJECT_ROOT=/` for fresh installs |

## Integration Examples

### Docker
```dockerfile
ENV I18NTK_LOG_LEVEL=info
ENV I18NTK_OUTDIR=/app/reports
ENV I18NTK_SILENT=true
```

### GitHub Actions
```yaml
- name: Run i18n validation
  env:
    I18NTK_LOG_LEVEL: info
    I18NTK_OUTDIR: ./reports
  run: npx i18ntk validate
```

### npm scripts
```json
{
  "scripts": {
    "i18n:validate": "I18NTK_LOG_LEVEL=info npx i18ntk validate",
    "i18n:analyze": "I18NTK_DEBUG_LOCALES=1 npx i18ntk analyze"
  }
}