# i18ntk v5 release and update runbook

This document is for maintainers of i18ntk v5. The private workspace root contains the CLI package (`i18ntk/`) and the two VS Code extensions. Only `i18ntk/` is published to npm.

## The required release gate

Run this from the workspace root before every version update, build, package, or publish:

```bash
npm ci
npm run release:verify
```

The command is fail-fast: the next step does not run after any error. It verifies all three packages:

1. The core CLI security checks, security tests, UI-locale lint, complete test suite, isolated packed-package install, and production dependency audit.
2. The Workbench extension compilation and unit tests.
3. The Lens extension compilation and unit tests.

The packed-package test is important: it creates a temporary consumer project, installs a newly packed i18ntk tarball, loads its public entrypoints, checks every CLI target, and checks the licence marker API. This catches files or exports that source-tree tests cannot see.

`build.bat`, `update.bat`, `npm run package:public`, `npm run pack:public`, `npm run publish:public:dry-run`, and `npm run publish:public` all invoke this gate automatically. Do not bypass it. Fix the failure and rerun the command.

## Update versions safely

Use the root update command:

```bat
update.bat patch
update.bat minor
update.bat 5.0.1 1.4.1 1.3.1
update.bat --dry-run
```

The script validates the entire workspace before it changes any version file. A failed gate stops the update before the version-write step. Review the core manifest, public manifest, development manifest, extension manifests, and lockfiles after a successful update.

## Build release artifacts

```bat
build.bat
```

The build runs the full release gate before deleting old artifacts or creating new ones. On success it creates:

- `i18ntk-<version>.tgz`
- `i18ntk-workbench-<version>.vsix`
- `i18ntk-lens-<version>.vsix`

To prepare just the public npm package:

```bash
cd i18ntk
npm run pack:public
```

The public packer verifies that the staged npm package has the public manifest, README, licensing files, runtime exports, CLI files, locale data, documentation, and i18ntk skill, while excluding tests, release scripts, configuration, secrets, and private packaging files.

## Review before publishing

Update and review the public-facing changes in `CHANGELOG.md`, `README.md`, `docs/README.md`, and the relevant migration documentation. Review `LICENSE`, `COMMERCIAL-LICENSE.md`, and `SECURITY.md` whenever licensing or security behaviour changes.

i18ntk v5 uses PolyForm Noncommercial 1.0.0 for qualifying personal and noncommercial use. Commercial use requires a separate written licence; older MIT releases retain their original terms. This is operational guidance, not legal advice.

The optional `i18ntk-license` marker is public metadata only. Never include licence keys, contracts, customer details, emails, billing data, private domains, or secrets. Its local verifier makes no network request; commercial entitlement is confirmed from the licensor's private records.

## Publish

```bash
cd i18ntk
npm whoami
npm run publish:public
```

Publishing runs the mandatory release gate again before staging and publishing the public package. Confirm the exact version, generated tarball, changelog, licence terms, and npm account before executing it.

## After publishing

```bash
npm view i18ntk version dist-tags bin
npx --yes i18ntk@latest --version
```

Upload and verify the two generated VSIX files separately. Record published versions, artifact checksums, and follow-up work in the release notes.
