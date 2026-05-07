# Migration Guide: i18ntk v3.1.2

## What's New in v3.1.2

v3.1.2 is a release-readiness update for Auto Translate and npm publishing.

## Upgrade

```bash
npm install -g i18ntk@3.1.2
npm install --save-dev i18ntk@3.1.2
```

## Auto Translate

- Selecting a locale root such as `./locales` now works when the source JSON files live in a language child folder such as `./locales/en`.
- The manager first checks the selected folder for JSON files. If none are found, it checks `<selected folder>/<source language>` and uses that folder automatically when JSON files exist.
- Direct source folders such as `./locales/en` continue to work unchanged.

## Publishing

- `npm run publish:public` stages from `package.public.json` into `.release/i18ntk-public` and publishes from that staged directory.
- Staging now verifies root `package.json` and `package.public.json` agree on public release metadata before any pack or publish step.
- Staging embeds `README.md` into the generated package metadata so npm can render the package README.
- `npm run publish:public:dry-run` is available for validating the exact publish path without publishing.

## Package Contents

The public package continues to exclude development-only content such as tests, scripts, docs, release staging folders, local config files, generated backup folders, and private settings.

## Compatibility

No breaking changes are expected for v3.1.2.
