# PIN Protection Guide

## Overview

The i18n Management Toolkit v1.4.0 introduces advanced PIN protection capabilities, providing granular security control over sensitive operations. This guide covers the complete PIN protection system, from basic setup to advanced configuration.

## PIN Protection Features

### 🔐 Core Security Features
- **Global Admin PIN**: Master authentication for all sensitive settings
- **Script-Specific Protection**: Individual PIN requirements for each sensitive script
- **Configurable Protection**: Enable/disable protection per script
- **Session Management**: Secure session handling with automatic timeout
- **Failed Attempt Tracking**: Configurable lockout after failed attempts

### 🎯 Protected Scripts
The following scripts can be individually protected:

1. **Debug Tools Menu** (`debugMenu`) - Access to debugging utilities
2. **Delete Reports** (`deleteReports`) - Report deletion functionality
3. **Summary Reports** (`summaryReports`) - Report generation
4. **Settings Menu** (`settingsMenu`) - Configuration access
5. **Initialize Script** (`initScript`) - Project initialization

## Configuration

### Initial Setup

1. **Enable Global PIN Protection**:
   ```bash
   npm run settings
   ```
   Navigate to Security Settings → Enable PIN Protection

2. **Set Admin PIN**:
   - First-time setup will prompt for PIN creation
   - PIN is encrypted using AES-256-GCM
   - Minimum 4 digits, maximum 20 characters

3. **Configure Script Protection**:
   - Security Settings → Configure PIN Protected Scripts
   - Toggle protection for individual scripts
   - View current protection status

### Settings Configuration

Key settings in your configuration:

```json
{
  "security": {
    "adminPinEnabled": true,
    "pinProtection": {
      "enabled": true,
      "protectedScripts": {
        "debugMenu": true,
        "deleteReports": true,
        "summaryReports": false,
        "settingsMenu": true,
        "initScript": false
      }
    },
    "maxFailedAttempts": 5,
    "lockoutDuration": 15,
    "sessionTimeout": 30
  }
}
```

## Usage

### Accessing Protected Scripts

When PIN protection is enabled, accessing protected scripts will prompt:

```
🔐 PIN Required for [Script Name]
Enter PIN: ****
```

### Managing PIN Protection

#### Via Settings CLI
```bash
npm run settings
# Navigate: Security Settings → Configure PIN Protected Scripts
```

#### Via Direct Configuration
Edit `settings/.i18n-admin-config.json` directly (requires existing PIN):

```json
{
  "security": {
    "pinProtection": {
      "protectedScripts": {
        "debugMenu": true,
        "deleteReports": false,
        "summaryReports": true,
        "settingsMenu": true,
        "initScript": false
      }
    }
  }
}
```

## Security Features

### 🔒 Encryption
- **PIN Storage**: AES-256-GCM encryption
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Salt Generation**: Cryptographically secure random salt
- **Session Encryption**: Encrypted session tokens

### 🛡️ Failed Attempt Protection
- **Tracking**: Monitors failed PIN attempts
- **Lockout**: Temporary lockout after max attempts
- **Duration**: Configurable lockout period (default: 15 minutes)
- **Reset**: Automatic reset after lockout period

### ⏰ Session Management
- **Timeout**: Configurable session duration (default: 30 minutes)
- **Cleanup**: Automatic cleanup on process termination
- **Re-auth**: Required after timeout expiration

## Configuration Options

### Security Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `adminPinEnabled` | boolean | false | Enable global admin PIN |
| `pinProtection.enabled` | boolean | false | Enable script-specific protection |
| `maxFailedAttempts` | number | 5 | Failed attempts before lockout |
| `lockoutDuration` | number | 15 | Lockout duration in minutes |
| `sessionTimeout` | number | 30 | Session timeout in minutes |

### Script Protection Mapping

| Script | Description | Recommended |
|--------|-------------|-------------|
| `debugMenu` | Debug utilities | Yes |
| `deleteReports` | Report deletion | Yes |
| `summaryReports` | Report generation | Optional |
| `settingsMenu` | Configuration access | Yes |
| `initScript` | Project initialization | Optional |

## Internationalization

PIN protection features are fully translated across all supported languages:

- **English** (en)
- **German** (de)
- **Spanish** (es)
- **French** (fr)
- **Russian** (ru)
- **Japanese** (ja)
- **Chinese** (zh)
- **Portuguese** (pt)

All PIN prompts, error messages, and configuration options are localized.

## Troubleshooting

### Common Issues

#### Forgotten PIN
1. Reset configuration to defaults:
   ```bash
   npm run settings
   # Navigate to Security Settings → Reset All PIN Protections
   ```

2. Manual reset (advanced):
   ```bash
   rm settings/.i18n-admin-config.json
   npm run init
   ```

#### Locked Out
- **Wait**: Automatic unlock after lockout duration
- **Check**: Review failed attempt logs
- **Reset**: Use reset functionality if authorized

#### Configuration Issues
- **Verify**: Check `settings/.i18n-admin-config.json` format
- **Validate**: Use settings CLI validation
- **Reset**: Reset to defaults if corrupted

### Debug Mode

Enable debug logging:
```bash
DEBUG=i18ntk:* npm run [script]
```

## Best Practices

### Security Recommendations

1. **Use Strong PINs**: Minimum 6 digits, avoid sequential patterns
2. **Enable Protection**: Protect critical scripts (debug, delete, settings)
3. **Regular Review**: Periodically review protection settings
4. **Backup Configuration**: Keep secure backups of settings
5. **Monitor Access**: Review authentication logs regularly

### Configuration Management

1. **Version Control**: Exclude `settings/.i18n-admin-config.json` from version control
2. **Environment Specific**: Use environment-specific configurations
3. **Documentation**: Document protection requirements for team members
4. **Testing**: Test PIN protection in development before production

## API Reference

### AdminAuth Class

```javascript
const adminAuth = require('./utils/admin-auth');

// Check if PIN is required for a script
const required = adminAuth.isAuthRequiredForScript('debugMenu');

// Validate PIN
const valid = await adminAuth.validatePin('1234');

// Get session status
const session = adminAuth.getSessionStatus();
```

### Settings Manager

```javascript
const settingsManager = require('./settings/settings-manager');

// Get PIN protection configuration
const config = settingsManager.getSettings();
const protection = config.security.pinProtection;

// Update protection settings
await settingsManager.updateSetting('security.pinProtection.protectedScripts.debugMenu', true);
```

## Migration Guide

### From v1.3.x to v1.4.0

1. **Backup**: Create backup of existing configuration
2. **Update**: Install v1.4.0
3. **Configure**: Enable PIN protection as needed
4. **Test**: Verify all scripts work with new protection

### Configuration Migration
- Existing configurations remain compatible
- New PIN protection features are opt-in
- No breaking changes to existing functionality

## Support

For additional support:
- **Issues**: Create GitHub issue with PIN protection tag
- **Documentation**: Refer to project documentation
- **Examples**: Check example configurations in `/examples`
- **Community**: Join project discussions on GitHub