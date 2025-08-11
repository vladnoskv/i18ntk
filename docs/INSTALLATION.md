# Installation Guide

**Version:** 1.8.1
**Last Updated:** 2025-08-11
**GitHub Repository:** [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)

## Quick Start

```bash
# Install locally (recommended)
npm install i18ntk@1.8.1 --save-dev

# Initialize project
npx i18ntk@1.8.1 init

# Run analysis
npx i18ntk@1.8.1 analyze
```

### Watch Helper & Lite Package

```bash
# Watch for changes and re-run analysis automatically
npx i18ntk@1.8.1 analyze --watch

# Build a lite English-only UI locale bundle
npm run build:lite

# Use the new interactive translation fixer
npx i18ntk@1.8.1 fixer --interactive
```

## System Requirements

- **Node.js:** ≥16.0.0
- **npm:** Latest stable version
- **Operating System:** Windows, macOS, Linux

## Installation Options

### Local Installation (Recommended)
```bash
npm install i18ntk@1.8.1 --save-dev
```

### Global Installation
```bash
npm install -g i18ntk@1.8.1
```

### Using npx (No Installation)
```bash
npx i18ntk@1.8.1 <command>
```

### Using Yarn
```bash
yarn add -D i18ntk
# or globally
yarn global add i18ntk
```

## Framework Setup

**Note:** Frameworks are optional - i18ntk auto-detects popular i18n libraries (React i18next, Vue i18n, i18next, Nuxt i18n, Svelte i18n) but works without a framework. We recommend using a framework for larger projects.

### React
```bash
npm install i18ntk@1.8.1 --save-dev
npx i18ntk@1.8.1 init
```

### Vue.js
```bash
npm install i18ntk@1.8.1 --save-dev
npx i18ntk@1.8.1 init
```

### Angular
```bash
npm install i18ntk@1.8.1 --save-dev
npx i18ntk@1.8.1 init
```

### Next.js
```bash
npm install i18ntk@1.8.1 --save-dev
npx i18ntk@1.8.1 init
```

### Framework-Free Usage
```bash
npm install i18ntk@1.8.1 --save-dev
npx i18ntk@1.8.1 init --no-framework
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

1. **Initialize:** Run `npx i18ntk@1.8.1 init` to set up project structure
2. **Analyze:** Run `npx i18ntk@1.8.1 analyze` to check translation completeness
3. **Fix:** Run `npx i18ntk@1.8.1 fixer --interactive` to fix broken translations
4. **Configure:** Adjust settings via `npx i18ntk@1.8.1` → Settings menu

## Support

- **Issues:** [GitHub Issues](https://github.com/vladnoskv/i18ntk/issues)
- **Documentation:** [Complete Guide](README.md)
- **Examples:** [Framework Examples](examples/)

## Migration Guide

### Upgrading from Deprecated Versions

#### From any version < 1.8.1 (DEPRECATED - use latest version)
1. **Backup your current configuration**:
   ```bash
   cp -r ./settings ./settings-backup-$(date +%Y%m%d)
   ```

2. **Install the latest version**:
   ```bash
   npm install i18ntk@1.8.1
   ```

3. **Run configuration migration**:
   ```bash
   npx i18ntk@1.8.1 --migrate
   ```

4. **Verify installation**:
   ```bash
   npx i18ntk@1.8.1 --version
   npx i18ntk@1.8.1 --validate
   ```

#### Preserved Features from 1.6.x
- ✅ Ultra-extreme performance improvements
- ✅ Enhanced security with PIN protection
- ✅ Comprehensive backup & recovery
- ✅ Edge case handling
- ✅ Memory optimization
- ✅ Advanced configuration management

#### Security Updates in 1.8.1
- **Zero Shell Access** - All shell command vulnerabilities eliminated
- **Enhanced Security** - Direct file system operations replacing shell commands
- **Socket.dev Compliance** - Addresses all security scanning warnings
- **Production Safety** - Zero shell access in production codebase

#### Breaking Changes
- **None** - 1.8.1 is fully backward compatible with enhanced security

### Migration Support
If you encounter issues during migration:
1. Check the [troubleshooting guide](docs/TROUBLESHOOTING.md)
2. Open an issue on [GitHub](https://github.com/vladnoskv/i18ntk/issues)

