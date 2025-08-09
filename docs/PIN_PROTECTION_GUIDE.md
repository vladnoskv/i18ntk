# PIN Protection Guide

**Version:** 1.6.3| **GitHub:** [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)

## 🔐 Quick Setup

```bash
# Enable PIN protection
npm run settings
# Navigate: Security Settings → Enable PIN Protection

# Set Admin PIN
# First-time setup will prompt automatically
```

## ⚙️ Configuration

```json
{
  "security": {
    "adminPinEnabled": true,
    "pinProtection": {
      "enabled": true,
      "protectedScripts": {
        "debugMenu": true,
        "deleteReports": true,
        "settingsMenu": true
      }
    }
  }
}
```

## 🎯 Protected Scripts

| Script | Description | Default |
|--------|-------------|---------|
| `debugMenu` | Debug utilities | ✅ |
| `deleteReports` | Report deletion | ✅ |
| `settingsMenu` | Configuration access | ✅ |

## 🔒 Security Features

- **AES-256-GCM** encryption for PIN storage
- **PBKDF2** with 100k iterations
- **Session timeout** after 30 minutes
- **Lockout** after 5 failed attempts

## 🆘 Troubleshooting

**Forgot PIN:**
```bash
npm run settings
# Navigate to Security Settings → Reset PIN
```

**Locked Out:**
- Wait 15 minutes for automatic unlock
- Or reset configuration via settings

---
*See README.md for complete security documentation*

## Migration Guide

### Upgrading from Deprecated Versions

#### From any version < 1.6.3 (DEPRECATED - use latest version) 1. **Backup your current configuration**:
   ```bash
   cp -r ./.i18ntk ./.i18ntk-backup-$(date +%Y%m%d)
   ```

2. **Install the latest version**:
   ```bash
   npm install i18ntk@1.6.3```

3. **Run configuration migration**:
   ```bash
   npx i18ntk@1.6.3--migrate
   ```

4. **Verify installation**:
   ```bash
   npx i18ntk@1.6.3--version
   npx i18ntk@1.6.3--validate
   ```

#### Preserved Features from 1.6.3
- ✅ Ultra-extreme performance improvements
- ✅ Enhanced security with PIN protection
- ✅ Comprehensive backup & recovery
- ✅ Edge case handling
- ✅ Memory optimization
- ✅ Advanced configuration management

#### Breaking Changes
- **None** - 1.6.3 is fully backward compatible

### Migration Support
If you encounter issues during migration:
1. Check the [troubleshooting guide](docs/TROUBLESHOOTING.md)
2. Open an issue on [GitHub](https://github.com/vladnoskv/i18ntk/issues)
3. Join our [Discord community](https://discord.gg/i18ntk)

