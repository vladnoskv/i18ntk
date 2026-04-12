# Package Optimization Prompt for i18ntk

Use this prompt when asking an LLM to optimize or harden the i18ntk package.

## Prompt

You are reviewing the `i18ntk` repository.

Your task is to optimize the package while keeping it zero dependency, backward compatible, and safe to publish.

Focus on these goals:

1. Remove unnecessary publish surface area.
2. Reduce package size without removing required runtime functionality.
3. Eliminate heuristic security warnings where possible.
4. Keep runtime translation behavior stable.
5. Keep the CLI, runtime API, and setup flow working.
6. Improve documentation only where it reflects actual behavior.
7. Preserve the zero-dependency guarantee.

Important constraints:

- Do not introduce new runtime dependencies.
- Do not break existing public CLI commands.
- Do not remove `i18ntk/runtime` or the main CLI entry points.
- Do not change translation key semantics unless a bug requires it.
- Prefer minimal, reviewable patches.
- Avoid speculative refactors.
- Treat setup-complete projects as already initialized.
- Keep backup, validation, and report generation behavior bounded and predictable.

What to inspect:

- `package.json`
- `README.md`
- `CHANGELOG.md`
- `SECURITY.md`
- `docs/`
- `main/`
- `utils/`
- `settings/`
- `runtime/`

What to look for:

- Dynamic `require()` patterns
- Hardcoded external URLs or unnecessary third-party references
- Unused files included in the npm package
- Legacy duplicate entry points
- Missing or mismatched translation keys
- Startup or setup paths that mis-detect initialization
- Backup or cleanup paths that can recurse into their own outputs

Expected output:

- A concise summary of findings
- Specific files that need changes
- Minimal code patches
- Validation notes
- Remaining risks if anything cannot be fixed safely

When in doubt:

- Preserve functionality.
- Prefer explicit static imports over dynamic loading.
- Keep the package surface small.
- Keep the docs aligned with the code.
