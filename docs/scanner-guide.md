# Scanner Guide (v4.2.1)

## Purpose

`i18ntk-scanner` detects hardcoded text and i18n key usage patterns so you can close translation gaps safely.

## Run Scanner

Primary CLI:

```bash
i18ntk --command=scanner --source-dir=./src
```

Standalone binary:

```bash
i18ntk-scanner --source-dir=./src
```

## Common Options

- `--source-dir` source files to scan
- `--i18n-dir` locale directory (if different)
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
- `--source-language` source-language profile for hardcoded text detection

## Practical Examples

```bash
# Basic scan
i18ntk-scanner --source-dir=./src --i18n-dir=./locales

# CI-friendly scan
i18ntk-scanner --source-dir=./src --output-report --json --no-prompt

# Tuned scan for false-positive reduction
i18ntk-scanner --source-dir=./src --exclude="*.test.js" --min-length=4 --max-length=80

# Scan source text in another language
i18ntk-scanner --source-dir=./src --source-language=de --output-report
```

## Recommended Workflow

1. Run scanner and generate a report.
2. Review findings and add/normalize missing keys.
3. Run `i18ntk --command=usage`.
4. Run `i18ntk --command=validate`.
5. Run `i18ntk --command=complete` if keys are still missing.

## Troubleshooting

- If no files are scanned, confirm `--source-dir` path.
- If output is noisy, increase `--min-length` and add `--exclude` patterns.
- If framework detection is incorrect, set `--framework` explicitly.
