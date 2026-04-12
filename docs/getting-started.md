# Getting Started with i18ntk (v2.3.7)

This guide covers the shortest path from install to first successful run.

## 1. Install

```bash
npm install -g i18ntk
```

Or add it to a project:

```bash
npm install --save-dev i18ntk
```

## 2. Initialize the project

Run the interactive setup:

```bash
i18ntk
```

Or run setup directly:

```bash
i18ntk --command=init
```

During setup, i18ntk will ask for:

- source directory
- source language
- UI language
- framework preference
- output directory
- backup settings

If you are in CI or want no prompts:

```bash
i18ntk --command=init --no-prompt
```

## 3. Validate the project

Run a first scan after setup:

```bash
i18ntk --command=analyze
i18ntk --command=validate
```

Validation now produces a summary report at the end of the run.

## 4. Complete missing keys

When analysis shows gaps:

```bash
i18ntk --command=complete
```

## 5. Use the runtime API in your application

```js
const runtime = require('i18ntk/runtime');

runtime.initRuntime({
  baseDir: './locales',
  language: 'en',
  fallbackLanguage: 'en',
  preload: true
});

console.log(runtime.t('common.hello'));
```

## 6. Keep configuration in sync

The project-local `.i18ntk-config` file is the source of truth for setup and command defaults.

## Suggested First Run Sequence

```bash
i18ntk
i18ntk --command=analyze
i18ntk --command=validate
i18ntk --command=usage
```

## Next Steps

- Read [docs/runtime.md](./runtime.md) for full runtime API details.
- Read [docs/api/CONFIGURATION.md](./api/CONFIGURATION.md) for config fields and precedence.
- Read [docs/scanner-guide.md](./scanner-guide.md) for scan and key discovery workflows.
