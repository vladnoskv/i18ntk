# DEVUPDATE.md - v2 Release and Publish Runbook

## Purpose

Use this checklist to ship a new i18ntk v2 release to npm and keep docs/readme in sync.

## 1. Pre-Release Checks

```bash
npm ci
npm run security:check
npm run security:test
npm run lint:locales
node main/manage/index.js --help
node main/i18ntk-init.js --help
node main/i18ntk-complete.js --help
```

Recommended smoke tests:

```bash
i18ntk --command=init --no-prompt
i18ntk --command=analyze --no-prompt
i18ntk --command=validate --no-prompt
i18ntk --command=complete --no-prompt
```

## 2. Update Version and Changelog

```bash
# choose one
npm version patch
npm version minor
npm version major
```

Then update:

- `CHANGELOG.md`
- `README.md`
- `docs/README.md`
- `docs/migration-guide-v2.1.0.md` (or new migration file for the target release)

## 3. README v2 Badge/Icon Refresh

Check these entries in `README.md` before publish:

- npm version badge
- npm downloads badge
- node support badge
- zero-dependency badge
- socket badge link/version
- logo/image path validity

If socket badge is version-pinned, update it to the new package version.

## 4. Publish to npm

```bash
npm whoami
npm publish --access public
```

If publishing from CI, ensure `NPM_TOKEN` is configured in CI secrets.

## 5. Post-Publish Verification

```bash
npm view i18ntk version
npm view i18ntk dist-tags
npm view i18ntk bin
```

Validate a clean install:

```bash
npm i -g i18ntk@latest
i18ntk --help
i18ntk-init --help
i18ntk-backup --help
```

## 6. Release Follow-Up

- Push commit/tag created by `npm version`.
- Confirm README badges render correctly on npm and GitHub.
- Confirm Socket score and warnings for the published version.
- Announce the release notes.
