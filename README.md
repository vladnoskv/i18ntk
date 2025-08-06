# 🌍 i18ntk - The Ultimate i18n Translation Management Toolkit

![i18ntk Logo](docs/screenshots/i18ntk-logo-public.PNG)

[![npm](https://img.shields.io/npm/dt/i18ntk.svg)](https://www.npmjs.com/package/i18ntk) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/) [![Downloads](https://img.shields.io/npm/dm/i18ntk.svg)](https://www.npmjs.com/package/i18ntk) [![GitHub stars](https://img.shields.io/github/stars/vladnoskv/i18ntk?style=social)](https://github.com/vladnoskv/i18ntk)

**🚀 The fastest way to manage translations across any framework or vanilla JavaScript projects**

> **Zero runtime dependencies** | **70% smaller package** | **Works with any framework** | **Enterprise-grade security**

⚠️ **Disclaimer**: This package (`i18ntk` by Vlad Noskov) is an independent internationalization management toolkit and is **not affiliated with** any other packages named "i18ntk" or similar i18n tools. This is a standalone solution focused on translation file management and validation.

**Version:** 1.5.1 (2025-08-06) - i18n internationalization toolkit

**Framework Support:** Works **with or without** i18n frameworks. i18ntk manages translation files and validation - it does NOT implement translations on pages. Compatible with i18next, LinguiJS, and other frameworks using standard JSON translation files. **No runtime dependencies!**

**Key Features of v1.5.1:**
- Complete internationalization management toolkit
- Zero runtime dependencies
- 70% package size reduction compared to 1.4.0
- Framework-agnostic JSON translation support
- Enhanced security with PIN protection
- Enterprise-grade AES-256-GCM encryption
- 7-language support (EN, DE, ES, FR, RU, JA, ZH)
- Real-time analysis and validation
- CI/CD ready workflows
- Comprehensive documentation at [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)

## 🚀 Quick Start

```bash
npm install -g i18ntk    # Install globally
npx i18ntk --help        # Show help
npx i18ntk --version     # Show version
npx i18ntk               # Run Main Manage Menu
npx i18ntk init          # Initialize project
npx i18ntk manage        # Interactive Menu
npx i18ntk analyze       # Analyze translations
```

📖 **Complete Setup Guide**: [docs/core/SETUP.md](https://github.com/vladnoskv/i18ntk/blob/main/docs/core/SETUP.md)

## ✨ Why Choose i18ntk?

### 🎯 **Universal Compatibility**
- **Works with any framework** - React, Vue, Angular, Svelte, or vanilla JavaScript
- **Zero runtime dependencies** - Won't bloat your bundle
- **Standard JSON format** - Compatible with i18next, LinguiJS, and more

### ⚡ **Lightning Fast**
- **70% package size reduction** - From 1.7MB to just 499kB (unpacked) and 100kB (packed)
- **1,600-1,900 operations/second** - Benchmarked performance
- **Instant startup** - No heavy dependencies to load

### 🔐 **Enterprise Security**
- **AES-256-GCM encryption** - Enterprise-grade PIN protection
- **7-language support** - English, German, Spanish, French, Russian, Japanese, Chinese
- **Session management** - Automatic timeouts and secure handling

### 📊 **Professional Tools**
- **Real-time analysis** - Detect missing translations instantly
- **Interactive menus** - No complex configuration required
- **CI/CD ready** - Pre-built workflows for GitHub Actions, GitLab CI
- **Comprehensive reports** - JSON, compact, or human-readable formats

## ✨ What's New in v1.5.1

### 🆕 Framework Clarification & Documentation Overhaul
- **Clear framework guidance** - Explicitly supports **with or without** i18n frameworks
- **Streamlined README** - Concise overview with detailed docs linked to GitHub
- **Updated GitHub URL** - New home at [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)
- **Enhanced compatibility** - Works with i18next, LinguiJS, and vanilla JavaScript
- **Translation file standardization** - Uses JSON format compatible with all major frameworks

### 📊 Performance & Reliability
- **Zero runtime dependencies** - Pure Node.js implementation
- **70% package size reduction** - From 1.7MB to 499kB
- **Verified benchmarks** - 1,600-1,900 operations/second across all scales

#### 🔧 Running Performance Tests
```bash
# Full benchmark suite
npm run benchmark

# Quick regression check (CI mode)
npm run benchmark:ci

# Update baseline measurements
npm run benchmark:baseline
```

📈 **Detailed Performance Analysis**: See [benchmarks/PERFORMANCE_ANALYSIS.md](benchmarks/PERFORMANCE_ANALYSIS.md)

## 🎯 Framework Integration

Works with **any** framework or vanilla JavaScript. Uses standard JSON translation files compatible with:

| Framework | Compatibility | Integration Time |
|-----------|---------------|------------------|
| **i18next** | ✅ Native | 2 minutes |
| **LinguiJS** | ✅ JSON format | 2 minutes |
| **React** | ✅ Standard imports | 3 minutes |
| **Vue.js** | ✅ Standard imports | 3 minutes |
| **Angular** | ✅ TypeScript ready | 4 minutes |
| **Vanilla JS** | ✅ Direct usage | 1 minute |

📖 **Integration Guide**: [docs/core/FRAMEWORK_INTEGRATION.md](https://github.com/vladnoskv/i18ntk/blob/main/docs/core/FRAMEWORK_INTEGRATION.md)

### 🔧 **Quick Integration Examples**

**React Example:**
```javascript
// Before i18ntk
import en from './locales/en.json'
import es from './locales/es.json'

// After i18ntk - automatically validated and optimized
import translations from './locales' // i18ntk managed
```

**Vanilla JS Example:**
```javascript
// i18ntk validates and optimizes your JSON files
const translations = await import(`./locales/${lang}.json`)
```

## 🔍 Troubleshooting & Support

📖 **Troubleshooting Guide**: [docs/core/TROUBLESHOOTING.md](https://github.com/vladnoskv/i18ntk/blob/main/docs/core/TROUBLESHOOTING.md)

## 🔄 CI/CD Integration

Pre-built workflows for GitHub Actions, GitLab CI, and Docker.

📖 **CI/CD Guide**: [docs/development/CI_CD_INTEGRATION.md](https://github.com/vladnoskv/i18ntk/blob/main/docs/development/CI_CD_INTEGRATION.md)

## 📊 Project Health Dashboard

### Quick Health Check
```bash
# One-command health check
i18ntk summary --format=json > health-report.json

# Continuous monitoring
watch -n 30 'i18ntk summary --format=compact'
```

### Key Metrics to Monitor
- **Translation completeness**: Aim for 100% across all languages
- **Missing keys**: Should be 0 in production
- **Validation errors**: Must be 0 before deployment
- **Performance**: <5 seconds for datasets <10K keys
- **Memory usage**: Monitor for datasets >25K keys

## 🎯 Best Practices

### Development Workflow
1. **Daily**: Run `i18ntk analyze` to catch missing keys early
2. **Pre-commit**: Add validation hooks with `i18ntk validate`
3. **Pre-release**: Generate comprehensive reports with `i18ntk summary`
4. **CI/CD**: Include validation in your pipeline

### Team Collaboration
- **Shared configuration**: Commit `settings/i18ntk-config.json` to version control
- **Language standards**: Define primary language for development
- **Review process**: Include translation reviews in PR templates
- **Documentation**: Maintain translation guidelines for your team

### Performance Optimization
- **Regular cleanup**: Remove unused translations monthly
- **Modular structure**: Split large translation files by feature/domain
- **Caching**: Implement caching for CI/CD environments
- **Monitoring**: Set up alerts for translation completeness drops

## 🚀 Get Started in 30 Seconds

### **Step 1: Install**
```bash
npm install -g i18ntk
```

### **Step 2: Initialize**
```bash
npx i18ntk init
```

### **Step 3: Analyze**
```bash
npx i18ntk analyze
```

### **Step 4: Manage**
```bash
npx i18ntk manage
```

---

## ⭐ Trusted by Developers Worldwide

**Join thousands of developers** who have streamlined their internationalization workflow with i18ntk.

- ✅ **Zero configuration** - Works out of the box
- ✅ **Production ready** - Battle-tested in enterprise environments  
- ✅ **Active development** - Regular updates and improvements
- ✅ **Community driven** - Built by developers, for developers

### **Made with ❤️ for the developer community**

---

## ⚖️ Package Identity & Legal Notice

### **📋 Package Attribution**
- **Package Name**: `i18ntk` 
- **Author**: Vladimir Noskov (@vladnoskv)
- **Repository**: https://github.com/vladnoskv/i18ntk
- **NPM Registry**: https://www.npmjs.com/package/i18ntk
- **License**: MIT
- **Current Version**: 1.5.1 (Released: August 6, 2025)

### **🔍 Identity Disclaimer**
This package (`i18ntk` by vladnoskv) is an **independent, standalone internationalization management toolkit** and is **not affiliated with, endorsed by, or connected to** any other packages, tools, or services using similar names.

### **✅ Version Accuracy Guarantee**
All version information is current as of **August 6, 2025**:
- **Package Version**: 1.5.1
- **Release Date**: 2025-08-06
- **Node.js Compatibility**: >=16.0.0
- **Zero Runtime Dependencies**: Verified ✓
- **Package Size**: 536KB unpacked, 111.8KB packed

## 📚 Documentation

Complete documentation available at [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk):

- **[Setup Guide](https://github.com/vladnoskv/i18ntk/blob/main/docs/core/SETUP.md)** - Getting started
- **[CLI Commands](https://github.com/vladnoskv/i18ntk/blob/main/docs/core/COMMANDS.md)** - Command reference
- **[Framework Integration](https://github.com/vladnoskv/i18ntk/blob/main/docs/core/FRAMEWORK_INTEGRATION.md)** - Framework setup
- **[Security Guide](https://github.com/vladnoskv/i18ntk/blob/main/docs/PIN_PROTECTION_GUIDE.md)** - PIN protection
- **[Language Support](https://github.com/vladnoskv/i18ntk/blob/main/docs/core/LANGUAGE_SUPPORT.md)** - Language setup
- **[Debug Tools](https://github.com/vladnoskv/i18ntk/blob/main/docs/debug/DEBUG_TOOLS.md)** - Troubleshooting
- **[Changelog](https://github.com/vladnoskv/i18ntk/blob/main/CHANGELOG.md)** - Version history
- **[Contributing](https://github.com/vladnoskv/i18ntk/blob/main/CONTRIBUTING.md)** - Development guidelines