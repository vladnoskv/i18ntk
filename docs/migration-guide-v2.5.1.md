# Migration Guide: i18ntk v2.5.1

## What's New in v2.5.1

v2.5.1 is a security hardening release for admin PIN authentication and public npm packaging.

## Security Hardening

- `AdminAuth.verifyPin()` now fails closed when the admin config is missing, disabled, or malformed.
- Auth-required checks now fail closed when settings require PIN protection but the admin config cannot be used.
- Admin sessions now store both `expires` and `expiresAt`.
- Session cleanup handles both legacy `expires` sessions and numeric/string `expiresAt` sessions.

## Packaging Hardening

- The repository root manifest is development-only and blocks direct root packing/publishing.
- The public npm manifest lives in `package.public.json` and contains no dev scripts or dependencies.
- Public package staging rejects development files such as `scripts/`, `tests/`, `docs/`, `benchmarks/`, local config, admin config, secrets, and generated tarballs.

## Upgrade

```bash
npm install -g i18ntk@2.5.1
```

or:

```bash
npm install --save-dev i18ntk@2.5.1
```

## Compatibility

Projects already using `2.5.0` do not need config migration.

If `security.adminPinEnabled` is set but the admin PIN config is missing or invalid, protected operations now fail closed instead of bypassing authentication. Re-run PIN setup or disable admin PIN protection intentionally in settings.

## Validation

After upgrading, run:

```bash
i18ntk --command=validate
i18ntk --command=doctor
```

Version: 2.5.1
