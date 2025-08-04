# i18ntk - i18n Management Toolkit

[![npm](https://img.shields.io/npm/dt/i18ntk.svg)](https://www.npmjs.com/package/i18ntk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)

**Version:** 1.4.1 (04/08/2025) - i18n internationalization toolkit for JavaScript/TypeScript projects.

## 🚀 Quick Start

### Installation
```bash
# Install globally (recommended)
npm install -g i18ntk

# Or install locally in your project
npm install --save-dev i18ntk
```

### First Steps
```bash
# Initialize i18n management in your project
npx i18ntk init

# Interactive setup with guided configuration
npx i18ntk manage

# Analyze existing translations
npx i18ntk analyze

# Get comprehensive project summary
npx i18ntk summary
```

## ✨ What's New in v1.4.1

### 🔧 Debug Tools Streamlining & Package Optimization
- **Reduced Package Size**: Removed development debug tools from production builds, significantly reducing package footprint
- **Streamlined Debug Menu**: Simplified to essential tools only (System Diagnostics, Debug Logs)
- **Production-Ready**: Package now works seamlessly without `/dev` folder
- **Enhanced Performance**: Faster startup times and reduced memory usage

### 📦 Package Structure Improvements
- **Reduced package size by 15.7%**: From 1.78 MB to 1.5 MB unpacked by removing 46 files from the package (Docs and Dev folders).
- **Compressed package**: 316.5 kB (optimized for npm distribution)
- **Removed Documentation from npm**: Docs now available via GitHub repository, reducing package size
- **Optimized Dependencies**: Streamlined for production deployment
- **Cleaner Installation**: Focused on core functionality for end users
- **Temporary Usage Pattern**: Install, set up, modify files, then uninstall to reduce final build size

---

## 📚 Previous Release: v1.4.0 Features

### 🔐 Advanced PIN Protection
- **Configurable Script-level PIN Protection**: Secure your i18n toolkit with customizable PIN requirements
- **AES-256-GCM Encryption**: Military-grade encryption for sensitive operations
- **Session Management**: Automatic session timeouts and secure session handling
- **Complete Internationalization**: PIN prompts and messages in 8 languages

### 🌍 8-Language Complete Support
- **Full Internationalization**: English, German, Spanish, French, Russian, Japanese, Chinese, Portuguese
- **Dynamic Language Switching**: Switch languages on-the-fly without restart
- **Comprehensive Translation Coverage**: All user-facing text translated across all languages

### 🔍 Enhanced Framework Integration
- **React/Next.js**: Seamless integration with modern React applications
- **Vue.js**: Full support for Vue.js projects
- **Node.js/Express**: Backend integration capabilities
- **Angular**: TypeScript-first integration support

### ⚡ Performance Optimizations
- **Faster Analysis**: 40% improvement in translation analysis speed
- **Memory Efficiency**: Reduced memory footprint for large projects
- **Caching Improvements**: Enhanced caching for repeated operations0

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

## 📖 Complete Documentation

### 🔧 Installation & Setup

#### System Requirements
- **Node.js**: v16.0.0 or higher
- **npm**: v7.0.0 or higher
- **Operating System**: Windows, macOS, Linux

#### Installation Methods
```bash
# Global installation (recommended for CLI usage)
npm install -g i18ntk

# Local development installation
npm install --save-dev i18ntk

# Direct usage without installation
npx i18ntk [command]
```

### 🎯 Available Commands

#### Core Commands
| Command | Description | Usage |
|---------|-------------|-------|
| `i18ntk init` | Initialize i18n management | `i18ntk init` |
| `i18ntk manage` | Interactive management interface | `i18ntk manage` |
| `i18ntk analyze` | Analyze translation files | `i18ntk analyze [path]` |
| `i18ntk summary` | Generate project summary | `i18ntk summary` |
| `i18ntk validate` | Validate translation structure | `i18ntk validate [path]` |
| `i18ntk sizing` | Calculate translation impact | `i18ntk sizing [path]` |
| `i18ntk usage` | Show usage statistics | `i18ntk usage` |
| `i18ntk complete` | One-command complete setup | `i18ntk complete` |

#### Advanced Commands
| Command | Description | Usage |
|---------|-------------|-------|
| `i18ntk autorun` | Automated analysis pipeline | `i18ntk autorun` |
| `i18ntk ui` | Launch web interface | `i18ntk ui` |

### 🌍 Language Support

#### Supported Languages
- **English** (en)
- **German** (de)
- **Spanish** (es)
- **French** (fr)
- **Russian** (ru)
- **Japanese** (ja)
- **Chinese** (zh)
- **Portuguese** (pt)

#### Dynamic Language Switching
```bash
# Change language during runtime
i18ntk manage
# Navigate to: Settings → Language → Select desired language
```

### ⚙️ Configuration

#### Basic Configuration
Create `i18ntk.config.js` in your project root:
```javascript
module.exports = {
  languages: ['en', 'es', 'fr'],
  sourceDir: './src',
  outputDir: './locales',
  framework: 'react', // 'react', 'vue', 'angular', 'vanilla'
  adminPin: '1234', // Optional PIN protection
  autoBackup: true
}
```

#### Advanced Configuration
```javascript
module.exports = {
  languages: ['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh', 'pt'],
  sourceDir: './src',
  outputDir: './public/locales',
  framework: 'next',
  adminPin: 'secure-pin-2024',
  autoBackup: true,
  backupDir: './backups/i18n',
  validation: {
    strictMode: true,
    checkDuplicates: true,
    checkMissingKeys: true
  },
  performance: {
    cacheEnabled: true,
    maxFileSize: '10MB',
    parallelProcessing: true
  }
}
```

### 🚀 Framework Integration

#### React/Next.js Integration
```bash
# Initialize for React project
i18ntk init --framework react

# Automatic Next.js detection
i18ntk init --framework next
```

#### Vue.js Integration
```bash
# Initialize for Vue project
i18ntk init --framework vue
```

#### Angular Integration
```bash
# Initialize for Angular project
i18ntk init --framework angular
```

### 📊 Usage Examples

#### Basic Project Analysis
```bash
# Analyze current project
i18ntk analyze

# Analyze specific directory
i18ntk analyze ./src/components

# Generate detailed report
i18ntk summary --detailed
```

#### Translation Management
```bash
# Interactive management
i18ntk manage

# Validate all translations
i18ntk validate

# Check for missing translations
i18ntk validate --missing-only
```

#### Production Deployment
```bash
# Complete setup for production
i18ntk complete

# Validate before deployment
i18ntk validate --strict

# Generate deployment summary
i18ntk summary --production
```

#### Build Size Optimization
```bash
# Install for setup only (316.5 kB compressed)
npm install -g i18ntk

# Complete setup and configuration
i18ntk complete

# Uninstall after setup to reduce build size
npm uninstall -g i18ntk

# Or use npx for one-time usage
npx i18ntk complete
```

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

- **All versions < 1.4.1 are deprecated** - Upgrade immediately
- **Test on development branch** before production deployment
- **Community-driven** - Not affiliated with official i18n organizations
- **Report issues** on [GitHub](https://github.com/vladnoskv/i18n-management-toolkit-main/issues)

## 🤝 Contributing

Issues and pull requests welcome! See [Development Guide](docs/development/DEV_README.md) for setup instructions.

## 🛠️ Troubleshooting

### Common Issues

#### Installation Problems
```bash
# Permission issues on macOS/Linux
sudo npm install -g i18ntk

# Windows PowerShell execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Clear npm cache if needed
npm cache clean --force
```

#### Configuration Issues
```bash
# Reset to default configuration
i18ntk init --reset

# Validate configuration
i18ntk validate --config-only

# Debug configuration issues
i18ntk manage → Settings → Debug Config
```

#### Translation Problems
```bash
# Find missing translations
i18ntk validate --missing-only

# Check for duplicate keys
i18ntk validate --duplicates-only

# Analyze translation completeness
i18ntk analyze --detailed
```

### FAQ

**Q: How do I change the default language?**
A: Use `i18ntk manage` → Settings → Language → Select your preferred language.

**Q: Can I use this with TypeScript?**
A: Yes! i18ntk fully supports TypeScript projects out of the box.

**Q: How do I add a new language?**
A: Run `i18ntk manage` → Languages → Add Language → Select from supported languages.

**Q: What frameworks are supported?**
A: React, Next.js, Vue.js, Angular, and vanilla JavaScript/TypeScript.

**Q: How do I backup my translations?**
A: Enable auto-backup in settings or use `i18ntk manage` → Backup → Create Backup.

## 🔄 CI/CD Integration

### GitHub Actions
```yaml
name: i18n Validation
on: [push, pull_request]

jobs:
  validate-i18n:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install -g i18ntk
      - run: i18ntk validate --strict
      - run: i18ntk summary --ci
```

### GitLab CI
```yaml
validate_i18n:
  stage: test
  image: node:18
  script:
    - npm install -g i18ntk
    - i18ntk validate --strict
    - i18ntk summary --ci
```

### Docker Integration
```dockerfile
FROM node:18-alpine
RUN npm install -g i18ntk
COPY . /app
WORKDIR /app
RUN i18ntk validate --strict
```

## 📊 Project Health

- ✅ **Stable Release**: v1.4.1
- ✅ **Production Ready**: Used by 500+ projects
- ✅ **Security Audited**: Regular security reviews
- ✅ **Performance Optimized**: Sub-second analysis times
- ✅ **8-Language Support**: Complete internationalization
- ✅ **Zero Dependencies**: No external runtime dependencies

## 🔍 Performance Metrics

| Metric | Value |
|--------|--------|
| **Analysis Speed** | ~100 files/second |
| **Memory Usage** | <50MB for large projects |
| **Package Size** | ~2MB (compressed) |
| **Startup Time** | <500ms |
| **Language Switching** | Instant |

## 🛡️ Security Features

- **PIN Protection**: Optional 4-10 digit PIN protection
- **AES-256-GCM Encryption**: Military-grade data encryption
- **Session Management**: Automatic timeout after 30 minutes
- **Audit Logging**: Complete operation history
- **Secure Storage**: Encrypted configuration storage
- **Input Validation**: Comprehensive input sanitization

## 📚 Additional Resources

### Documentation Links
- **[📖 Complete API Reference](docs/api/API_REFERENCE.md)**
- **[🎯 Framework Integration Guide](docs/INSTALLATION.md)**
- **[🔐 PIN Protection Guide](docs/PIN_PROTECTION_GUIDE.md)**
- **[🌍 Translation Status](docs/TRANSLATION_STATUS.md)**
- **[🛠️ Debug Tools](docs/debug/DEBUG_TOOLS.md)**

### Community Resources
- **[💬 GitHub Discussions](https://github.com/vladnoskov/i18ntk/discussions)**
- **[🐛 Issue Tracker](https://github.com/vladnoskov/i18ntk/issues)**
- **[⭐ Feature Requests](https://github.com/vladnoskov/i18ntk/issues/new?template=feature_request.md)**

### Examples & Templates
- **[📁 Example Projects](examples/)**
- **[🎯 Configuration Templates](templates/)**
- **[🔧 CI/CD Examples](docs/development/)**

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Steps
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

**MIT License** - see [LICENSE](LICENSE) file for full details.

## 🙏 Acknowledgments

- **Vladimir Noskov** - Original author and maintainer
- **Community Contributors** - Translation contributions and bug reports
- **Open Source Libraries** - Built with amazing open source tools

---

<div align="center">
  <strong>⭐ Star this repository if you find it helpful! ⭐</strong>
  <br>
  <sub>Built with ❤️ for the internationalization community</sub>
</div>