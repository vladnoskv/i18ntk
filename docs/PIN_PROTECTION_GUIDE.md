# PIN Protection Guide

**Version:** 1.6.0 | **GitHub:** [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)

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