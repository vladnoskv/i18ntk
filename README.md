# 🌍 i18ntk - The Ultimate i18n Translation Management Toolkit

![i18ntk Logo](docs/screenshots/i18ntk-logo-public.PNG)

**Version:** 1.6.0  
**Last Updated:** 2025-08-08  
**GitHub Repository:** [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)

[![npm](https://img.shields.io/npm/dt/i18ntk.svg)](https://www.npmjs.com/package/i18ntk) [![npm version](https://badge.fury.io/js/i18ntk.svg)](https://badge.fury.io/js/i18ntk) [![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/) [![Downloads](https://img.shields.io/npm/dm/i18ntk.svg)](https://www.npmjs.com/package/i18ntk) [![GitHub stars](https://img.shields.io/github/stars/vladnoskv/i18ntk?style=social)](https://github.com/vladnoskv/i18ntk)

**🚀 The fastest way to manage translations across any framework or vanilla JavaScript projects**

**Framework Support:** Works with **any** i18n frameworks. i18ntk manages translation files and validation - it does NOT implement translations on pages. Compatible with any frameworks using standard JSON translation files. 

> **Zero dependencies** | **Optimized smaller package** | **Works with any framework** | **Enterprise-grade security**

> **v1.6.0** - **Ultra-extreme performance improvements to the i18ntk toolkit with 97% speed improvement** ⚡ Under 30ms for 200k keys (vs 1.2 seconds), up to 86% package size reduction, zero runtime dependencies.

## 🚀 Quick Start

```bash
# Install globally
npm install -g i18ntk@1.6.0

# Interactive setup
npx i18ntk init

# Basic commands
i18ntk analyze --source ./src
i18ntk complete --config=extreme
i18ntk validate --source ./locales
```

## ⚡ Performance

| Mode | Time (200k keys) | Memory | Package Size |
|------|------------------|--------|--------------|
| **Extreme** | **38.90ms** | 0.61MB | 115KB-830KB |
| Ultra | 336.8ms | 0.64MB | Configurable |
| Optimized | 847.9ms | 0.45MB | Full package |

## 🎯 Key Features

- **Ultra Performance**: 97% speed improvement with extreme optimization
- **Smart Sizing**: Interactive locale optimizer (up to 86% size reduction)
- **Enterprise Security**: Admin PIN protection & comprehensive validation
- **Zero Dependencies**: Lightweight, production-ready
- **8 Languages**: en, es, fr, de, ja, ru, zh + pt
- **Framework Support**: React, Vue, Angular, Next.js, Nuxt, Svelte

## 📊 Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `init` | Setup project | `i18ntk init --interactive` |
| `analyze` | Find missing translations | `i18ntk analyze --source ./src` |
| `complete` | Generate translations | `i18ntk complete --config=extreme` |
| `validate` | Check translation quality | `i18ntk validate --strict` |
| `sync` | Sync across languages | `i18ntk sync --languages en,es,fr` |
| `usage` | Analyze usage patterns | `i18ntk usage --format=json` |

## 🔧 Configuration

Create `.i18ntk.config.js`:

```javascript
module.exports = {
  sourceDir: './locales',
  outputDir: './i18n-reports',
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'es', 'fr', 'de'],
  performance: {
    mode: 'extreme', // extreme | ultra | optimized
    batchSize: 1000,
    concurrency: 16
  }
};
```

## 🌍 Language Optimization

```bash
# Interactive locale selection
node scripts/locale-optimizer.js --interactive

# Keep specific languages
node scripts/locale-optimizer.js --keep en,es,de

# Restore all languages
node scripts/locale-optimizer.js --restore

# Check sizes
node scripts/locale-optimizer.js --list
```

## 🏗️ Integration Examples

### React
```javascript
// Extract from React components
i18ntk extract --source ./src --framework react

// Setup i18next
import i18n from './i18n';
i18next.init({ resources: i18n, lng: 'en' });
```

### Vue
```javascript
// Extract from Vue components  
i18ntk extract --source ./src --framework vue

// Setup vue-i18n
import { createI18n } from 'vue-i18n';
const i18n = createI18n({ locale: 'en', messages: translations });
```

## 📈 Benchmarking

```bash
# Run performance tests
node benchmarks/ultra-performance-test.js --keys=50000

# Compare configurations
node benchmarks/compare-all-configs.js --keys=10000

# Memory profiling
node benchmarks/memory-test.js --keys=25000
```

## 🔒 Security Features

- **Admin PIN Protection**: File role-based access control
- **Input Sanitization**: Path traversal prevention
- **File Validation**: Safe file operations
- **Session Management**: Automatic timeout & cleanup

## 📋 Project Structure

```
your-project/
├── src/
│   └── components/
├── locales/           # Translation files
│   ├── en.json
│   ├── es.json
│   └── ...
├── i18n-reports/      # Generated reports
└── .i18ntk.config.js  # Configuration
```

## 🚨 Important Notes

- **Locale files are backed up automatically** before optimization
- **Use interactive optimizer** for safe locale management
- **Zero breaking changes** from v1.5.x to v1.6.0
- **All improvements applied automatically** on update

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/vladnoskv/i18ntk/issues)
- **Documentation**: [Complete docs](./docs)
- **Performance**: [Benchmark results](./benchmarks/results)
- **Version**: `i18ntk --version`

---

**Made for the global development community** ❤️