# i18ntk Components (v5.1.0)

## Core Entry Points

- `main/manage/index.js`: primary CLI (`i18ntk`)
- `main/i18ntk-init.js`: initialization
- `main/i18ntk-analyze.js`: analysis
- `main/i18ntk-validate.js`: validation
- `main/i18ntk-usage.js`: key usage checks
- `main/i18ntk-scanner.js`: source scanner
- `main/i18ntk-sizing.js`: size analysis
- `main/i18ntk-complete.js`: missing-key completion
- `main/i18ntk-summary.js`: summary report
- `main/i18ntk-doctor.js`: diagnostics
- `main/i18ntk-fixer.js`: placeholder/missing marker cleanup
- `main/i18ntk-backup.js`: standalone backup lifecycle operations (`i18ntk-backup`)
- `main/i18ntk-translate.js`: standalone Auto Translate CLI (`i18ntk-translate`)

## Shared Utilities

- `utils/config-helper.js`: common CLI arg parsing and unified config loading
- `utils/config-manager.js`: project config management (`.i18ntk-config`)
- `utils/env-manager.js`: allowlisted environment variable handling
- `utils/i18n-helper.js`: UI translation loading and lookup
- `utils/security.js`: file/path safety helpers
- `utils/setup-enforcer.js`: setup-completion gate checks
- `utils/menu-layout.js`: shared manager menu layout builder
- `utils/report-writer.js`: Markdown/JSON/text report writer for init and analysis reports
- `utils/usage-source.js`: usage-analysis source directory resolver
- `utils/usage-insights.js`: key-location indexing, route namespace recommendations, and hardcoded text candidate detection for usage reports
- `utils/localized-confirm.js`: localized yes/no token parsing
- `utils/translate/`: Auto Translate placeholder handling, protected term/key rules, API calls, traversal, reports, and prompts
- `utils/validation-risk.js`: structured validation-risk detection for URLs, emails, secret-like values, and likely untranslated English text

## Runtime Package

- `runtime/core.js`: universal resource store, fallback, formatting, diagnostics, subscriptions, and loader lifecycle; contains no Node built-ins
- `runtime/index.js` / `runtime/node.js`: Node filesystem compatibility and synchronous lookup after loading
- `runtime/static.js`: imported-object loader for browser, Edge, SSR, and React Native bundles
- `runtime/fetch.js`: Fetch API loader for browser, Edge, and platform runtimes
- `runtime/react.js`: dependency-injected React 18/19 bindings using `useSyncExternalStore`
- `runtime/crypto.js`: optional Node-only encryption adapter
- `runtime/enhanced.js`: deprecated 5.x compatibility wrapper over the unified runtime; it is not a second runtime implementation

Exports:

- `createRuntime` / `initRuntime`
- `translate` / `t`
- `translateBatch`
- `setLanguage`
- `getLanguage`
- `getAvailableLanguages`
- `clearCache`
- `getCacheInfo`
- `refresh`
- `has`, `addResources`, `removeResources`, `subscribe`, `getDiagnostics`, and `dispose`

## Notes

- The CLI package is zero dependency at runtime.
- `.i18ntk-config` is the project source of truth.
- Prefer documented CLI entry points over internal modules.
- Manager-route backup execution (`i18ntk --command=backup`) is disabled in current builds.
