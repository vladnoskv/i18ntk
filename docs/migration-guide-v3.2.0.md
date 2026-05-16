# Migration Guide: v3.1.x → v3.2.0

## Overview

v3.2.0 is a security-hardening and stability release. There are **no breaking changes** to the public API or CLI interface. Most fixes are internal bug fixes that improve reliability and security posture.

## What Changed

### Runtime API

No changes to the public API surface of `i18ntk/runtime` or `i18ntk/runtime/enhanced`. All TypeScript definition files have been updated and cleaned up.

### Auto Translate (`i18ntk-translate`)

- Google Translate API requests now enforce **HTTPS-only** (HTTP fallback removed).
- A `User-Agent: i18ntk/3.2.0` header is now sent with requests.
- `http.get` timeout now works correctly on **Node.js 16.0–16.13** (previously only 16.14+).
- Network errors and timeouts are now retried with exponential backoff (previously only rate-limit errors were retried).

### Configuration

- `config-manager.js` now exports `loadSettings()` and `saveSettings()` as aliases for `loadConfig()`/`saveConfig()`. If your code uses `configManager.loadSettings()`, it now resolves to a real function instead of `undefined`.
- `updateConfig()` now clones the config before deep-merging, preventing in-place cache corruption when a merge fails.

### Backup Operations

- `restoreBackup()` and `verifyBackup()` now validate that the backup path is inside the backup directory.
- The `backupDir` in the constructor is now validated against the project root for path traversal protection.

### Admin PIN

- **PIN encryption redesigned**: The AES encryption key is no longer stored alongside ciphertext. It is now derived via HKDF from the scrypt hash. This change is **transparent** — existing PIN data will continue to work.
- **Lockout now survives process restarts**: Lockout state uses `lockedUntil` timestamps instead of in-memory `setTimeout` timers.
- `getPinDisplay()` no longer decrypts the PIN into memory — it uses a stored `pinLength` field instead.

### TypeScript Definitions

- `runtime/i18ntk.d.ts` version header updated from `1.10.1` to `3.2.0`.
- Phantom utility declarations (`formatNumber`, `formatDate`, `formatCurrency`, `validateConfig`, `sanitizeKey`) removed — these never existed in the actual runtime.
- `runtime/enhanced.d.ts` no longer references the non-existent `./index.d.ts`.

## Upgrade Steps

```bash
npm install -g i18ntk@latest
# or
npm install --save-dev i18ntk@latest
```

No configuration changes, data migrations, or code changes are required.
