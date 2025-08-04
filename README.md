# i18ntk - i18n Management Toolkit

[![npm](https://img.shields.io/npm/dt/i18ntk.svg)](https://www.npmjs.com/package/i18ntk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)

**Version:** 1.4.0 (04/08/2025) - Enterprise-grade internationalization toolkit for JavaScript/TypeScript projects.

## 🚀 Quick Start

```bash
# Install
npm install i18ntk --save-dev

# Initialize project
npx i18ntk init

# Run analysis
npx i18ntk analyze
```

## ✨ What's New in v1.4.0

### 🔐 Advanced PIN Protection
- Configurable PIN protection for individual scripts
- Session-based authentication with 30-minute timeout
- AES-256-GCM encryption for secure storage
- Failed attempt tracking with lockout protection

### 🛡️ Enhanced Security
- Granular script-level security controls
- Automatic session cleanup
- Secure configuration file permissions (0o600)
- Comprehensive audit logging

### 🌍 Complete Internationalization
- 8 languages with 100% coverage
- Portuguese support added
- PIN protection fully translated across all languages

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `npx i18ntk` | Interactive management menu |
| `npx i18ntk init` | Initialize i18n structure |
| `npx i18ntk analyze` | Analyze translation completeness |
| `npx i18ntk validate` | Validate translation files |
| `npx i18ntk usage` | Check key usage in source |
| `npx i18ntk complete` | Complete missing translations |
| `npx i18ntk sizing` | Analyze file sizes |
| `npx i18ntk summary` | Generate comprehensive reports |
| `npx i18ntk autorun` | Run complete workflow |

### 🔄 CI/CD Automation
All commands support `--no-prompt` flag for non-interactive usage:
```bash
# In CI/CD pipelines
npx i18ntk analyze --no-prompt
npx i18ntk validate --no-prompt --fix
npx i18ntk usage --no-prompt
npx i18ntk complete --no-prompt --auto
npx i18ntk autorun --no-prompt
```

## 🌟 Key Features

### Core Capabilities
- **Translation Management**: Complete lifecycle from initialization to completion
- **Quality Assurance**: Validation, analysis, and reporting
- **Automation**: Single-command workflow execution
- **Security**: Advanced PIN protection and session management

### Developer Experience
- **Zero Configuration**: Works out of the box
- **Framework Agnostic**: Compatible with React, Vue, Angular, Next.js
- **TypeScript Support**: Full TypeScript project compatibility
- **Modern CLI**: Interactive and direct command execution

### Reporting & Analytics
- **Real-time Analysis**: Live translation completeness tracking
- **Visual Reports**: HTML, JSON, and CSV output formats
- **Performance Metrics**: File sizing and memory usage analysis
- **Audit Trails**: Complete security and configuration logging

## 🌍 Language Support

| Language | Code | Status |
|----------|------|--------|
| English | en | ✅ Complete |
| German | de | ✅ Complete |
| Spanish | es | ✅ Complete |
| French | fr | ✅ Complete |
| Portuguese | pt | ✅ Complete |
| Japanese | ja | ✅ Complete |
| Russian | ru | ✅ Complete |
| Chinese | zh | ✅ Complete |

## 📊 Reports

Generated in `i18ntk-reports/`:
- **Analysis**: Translation completeness
- **Validation**: File integrity checks
- **Usage**: Key utilization patterns
- **Sizing**: Performance metrics
- **Summary**: Project overview

## 🔧 Configuration

Minimal `i18ntk-config.json`:
```json
{
  "sourceDirectory": "./src",
  "localesDirectory": "./locales",
  "defaultLanguage": "en",
  "supportedLanguages": ["en", "es", "fr", "de", "pt", "ja", "ru", "zh"]
}
```

## 📚 Documentation

- **[Complete Guide](docs/README.md)** - Comprehensive documentation
- **[API Reference](docs/api/API_REFERENCE.md)** - Command reference
- **[Configuration](docs/api/CONFIGURATION.md)** - Setup options
- **[PIN Protection Guide](docs/PIN_PROTECTION_GUIDE.md)** - Security features

## ⚠️ Important Notes

- **All versions < 1.4.0 are deprecated** - Upgrade immediately
- **Test on development branch** before production deployment
- **Community-driven** - Not affiliated with official i18n organizations
- **Report issues** on [GitHub](https://github.com/vladnoskv/i18n-management-toolkit-main/issues)

## 🤝 Contributing

Issues and pull requests welcome! See [Development Guide](docs/development/DEV_README.md) for setup instructions.

---

**Made with ❤️ by the community, for the community**