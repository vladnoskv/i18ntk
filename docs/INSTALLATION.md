# Installation Guide

**Version:** 1.6.3**Last Updated:** 2025-08-08
**GitHub Repository:** [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)

## Quick Start

```bash
# Install locally (recommended)
npm install i18ntk@1.6.3--save-dev

# Initialize project
npx i18ntk@1.6.3init

# Run analysis
npx i18ntk@1.6.3analyze
```

## System Requirements

- **Node.js:** ≥16.0.0
- **npm:** Latest stable version
- **Operating System:** Windows, macOS, Linux

## Installation Options

### Local Installation (Recommended)
```bash
npm install i18ntk@1.6.3--save-dev
```

### Global Installation
```bash
npm install i18ntk@1.6.3i18ntk
```

### Using npx (No Installation)
```bash
npx i18ntk@1.6.3<command>
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
npm install i18ntk@1.6.3--save-dev
npx i18ntk@1.6.3init
```

### Vue.js
```bash
npm install i18ntk@1.6.3--save-dev
npx i18ntk@1.6.3init
```

### Angular
```bash
npm install i18ntk@1.6.3--save-dev
npx i18ntk@1.6.3init
```

### Next.js
```bash
npm install i18ntk@1.6.3--save-dev
npx i18ntk@1.6.3init
```

### Framework-Free Usage
```bash
npm install i18ntk@1.6.3--save-dev
npx i18ntk@1.6.3init --no-framework
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

1. **Initialize:** Run `npx i18ntk@1.6.3init` to set up project structure
2. **Analyze:** Run `npx i18ntk@1.6.3analyze` to check translation completeness
3. **Configure:** Adjust settings via `npx i18ntk@1.6.3` → Settings menu
4. **Automate:** Use `npx i18ntk@1.6.3autorun` for complete workflow

## Support

- **Issues:** [GitHub Issues](https://github.com/vladnoskv/i18ntk/issues)
- **Documentation:** [Complete Guide](README.md)
- **Examples:** [Framework Examples](examples/)

## Migration Guide

### Upgrading from Deprecated Versions

#### From any version < 1.6.3 (DEPRECATED - use latest version) 1. **Backup your current configuration**:
   ```bash
   cp -r ./.i18ntk ./.i18ntk-backup-$(date +%Y%m%d)
   ```

2. **Install the latest version**:
   ```bash
   npm install i18ntk@1.6.3```

3. **Run configuration migration**:
   ```bash
   npx i18ntk@1.6.3--migrate
   ```

4. **Verify installation**:
   ```bash
   npx i18ntk@1.6.3--version
   npx i18ntk@1.6.3--validate
   ```

#### Preserved Features from 1.6.3
- ✅ Ultra-extreme performance improvements
- ✅ Enhanced security with PIN protection
- ✅ Comprehensive backup & recovery
- ✅ Edge case handling
- ✅ Memory optimization
- ✅ Advanced configuration management

#### Breaking Changes
- **None** - 1.6.3 is fully backward compatible

### Migration Support
If you encounter issues during migration:
1. Check the [troubleshooting guide](docs/TROUBLESHOOTING.md)
2. Open an issue on [GitHub](https://github.com/vladnoskv/i18ntk/issues)
3. Join our [Discord community](https://discord.gg/i18ntk)

