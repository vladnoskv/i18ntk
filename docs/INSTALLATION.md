# Installation Guide

**Version:** 1.5.2  
**Last Updated:** 2025-08-06  
**GitHub Repository:** [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)

## Quick Start

```bash
# Install locally (recommended)
npm install i18ntk --save-dev

# Initialize project
npx i18ntk init

# Run analysis
npx i18ntk analyze
```

## System Requirements

- **Node.js:** ≥16.0.0
- **npm:** Latest stable version
- **Operating System:** Windows, macOS, Linux

## Installation Options

### Local Installation (Recommended)
```bash
npm install i18ntk --save-dev
```

### Global Installation
```bash
npm install -g i18ntk
```

### Using npx (No Installation)
```bash
npx i18ntk <command>
```

### Using Yarn
```bash
yarn add -D i18ntk
# or globally
yarn global add i18ntk
```

## Framework Setup

**Note:** Frameworks are optional - i18ntk works with or without i18n frameworks. We recommend using a framework for larger projects.

### React
```bash
npm install i18ntk --save-dev
npx i18ntk init
```

### Vue.js
```bash
npm install i18ntk --save-dev
npx i18ntk init
```

### Angular
```bash
npm install i18ntk --save-dev
npx i18ntk init
```

### Next.js
```bash
npm install i18ntk --save-dev
npx i18ntk init
```

### Framework-Free Usage
```bash
npm install i18ntk --save-dev
npx i18ntk init --no-framework
```

## Configuration

Create `i18ntk-config.json` in your project root:

```json
{
  "sourceDirectory": "./src",
  "localesDirectory": "./locales",
  "defaultLanguage": "en",
  "supportedLanguages": ["en", "es", "fr", "de", "ja", "ru", "zh"]
}
```

## Next Steps

1. **Initialize:** Run `npx i18ntk init` to set up project structure
2. **Analyze:** Run `npx i18ntk analyze` to check translation completeness
3. **Configure:** Adjust settings via `npx i18ntk` → Settings menu
4. **Automate:** Use `npx i18ntk autorun` for complete workflow

## Support

- **Issues:** [GitHub Issues](https://github.com/vladnoskv/i18ntk/issues)
- **Documentation:** [Complete Guide](README.md)
- **Examples:** [Framework Examples](examples/)