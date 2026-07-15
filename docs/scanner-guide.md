# Scanner Guide (v4.5.4)

## Purpose

`i18ntk-scanner` detects hardcoded text and i18n key usage patterns so you can close translation gaps safely.

## Run Scanner

Primary CLI:

```bash
i18ntk --command=scanner --code-dir=./src
```

Standalone binary:

```bash
i18ntk-scanner --code-dir=./src
```

## Common Options

- `--code-dir` or `--source-code-dir` source files to scan
- `--source-dir` legacy alias for source files
- `--locales-dir` or `--i18n-dir` locale directory (if different)
- `--output-dir` report output directory
- `--framework` framework hint (`auto`, `react`, `vue`, `angular`, `vanilla`, etc.)
- `--exclude` exclude patterns
- `--patterns` custom regex patterns
- `--min-length` minimum candidate text length
- `--max-length` maximum candidate text length
- `--include-tests` include test files
- `--output-report` write report files
- `--json` JSON terminal output
- `--no-prompt` non-interactive mode
- `--source-locale` source-language profile for hardcoded text detection
- `--source-language` legacy alias for `--source-locale`

## Practical Examples

```bash
# Basic scan
i18ntk-scanner --code-dir=./src --locales-dir=./locales

# CI-friendly scan
i18ntk-scanner --code-dir=./src --output-report --json --no-prompt

# Tuned scan for false-positive reduction
i18ntk-scanner --code-dir=./src --exclude="*.test.js" --min-length=4 --max-length=80

# Scan source text in another language
i18ntk-scanner --code-dir=./src --source-locale=de --output-report
```

## Recommended Workflow

1. Run scanner and generate a report.
2. Review findings and add/normalize missing keys.
3. Run `i18ntk --command=usage`.
4. Run `i18ntk --command=validate`.
5. Run `i18ntk --command=complete` if keys are still missing.

`--exclude` is merged with `excludeFiles`/`excludeDirs` from project configuration and standard framework build/dependency exclusions. The scanner also omits module imports, route/CSS tokens, metadata literals, and strings already passed to common translation wrappers; results are intended to represent likely user-facing hardcoded text.

## Troubleshooting

- If no files are scanned, confirm the `--code-dir` path.
- If output is noisy, increase `--min-length` and add `--exclude` patterns.
- If framework detection is incorrect, set `--framework` explicitly.
