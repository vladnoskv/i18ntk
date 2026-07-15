# i18ntk v5 Release and Update Runbook

Use this runbook for v5 maintenance releases. The workspace root is private; the publishable npm package is `i18ntk/`.

## Release gate: required and automatic

From the workspace root, run:

```bash
npm ci
npm run release:verify
```

`release:verify` fails on the first error and runs:

1. Core security checks, security tests, locale lint, full CLI tests, and production dependency audit.
2. Workbench compile and unit tests.
3. Lens compile and unit tests.

The same gate runs automatically before `build.bat`, `update.bat`, `npm run package:public`, `npm run pack:public`, and both publish commands. Do not bypass a failure: fix it, rerun the gate, then continue.

## Update versions

From the workspace root:

```bat
update.bat patch
update.bat minor
update.bat 5.0.1 1.4.1 1.3.1
```

`update.bat` validates the entire workspace before changing version files. If validation fails, it exits before writing any version change. Review the updated package manifests, public manifest, and lockfiles before committing.

## Build release artifacts

```bat
build.bat
```

The build runs the full release gate before deleting or creating artifacts. It produces the core `.tgz` and both `.vsix` files only when all checks pass.

For the core package alone:

```bash
cd i18ntk
npm run pack:public
npm run verify:packed-install
```

The packed-install verifier installs the produced tarball in a fresh temporary consumer project and checks public entrypoints.

## Documentation and licensing review

Before publishing, update and review:

- `CHANGELOG.md`, `README.md`, `docs/README.md`, and the relevant migration guide.
- `LICENSE`, `COMMERCIAL-LICENSE.md`, and `SECURITY.md` whenever terms or verification behavior changes.
- `docs/migration-v4-to-v5.md` for changes that affect v4 upgrades, configuration migration, CI, or agents.

i18ntk v5 is available for qualifying personal and noncommercial use under PolyForm Noncommercial 1.0.0. Commercial use requires a separate written commercial license. Earlier MIT releases retain their original terms. This runbook is operational guidance, not legal advice.

For licensed public deployments, the optional `i18ntk-license` marker is public metadata only. Never put keys, contracts, names, email addresses, billing data, private domains, or secrets in it. The local verifier makes no network request; commercial entitlement is confirmed against the licensor's private records.

## Publish

```bash
cd i18ntk
npm whoami
npm run publish:public
```

Publishing runs the required release gate again. Publish only from the core package after confirming the exact tarball, changelog, licensing documentation, and intended npm version.

## After publishing

```bash
npm view i18ntk version dist-tags bin
npx --yes i18ntk@latest --version
```

Verify the Marketplace artifacts separately after uploading the generated VSIX files. Record the published version, artifact checksums, and any follow-up actions in the release notes.
