# i18ntk - i18n Internationalization Management Toolkit

[![npm](https://img.shields.io/npm/dt/i18ntk.svg)](https://www.npmjs.com/package/i18ntk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)

**Version:** 1.5.0 (2025-05-08) - i18n internationalization toolkit for JavaScript/TypeScript projects. PRODUCTION READY with complete core functionality and enhanced internationalization! 🌍

Important Note on Versions: We strongly recommend using the latest stable version (currently 1.5.0) of i18ntk. Older versions contain known bugs that have been resolved in v1.5.0 with significant improvements in all areas of the package, with a large focus on performance, security, and functionality. Reducing the package size by 68% compared to v1.4.0.

**Key Features of v1.5.0:**
- Complete overhaul of the internationalization system
- Enhanced performance with optimized loading times
- Improved security measures to protect sensitive translation data
- Expanded functionality with additional features for better project management
- Reduced package size by 68% compared to v1.4.0
- Improved documentation with detailed guides and examples


## 🚀 Quick Start

### Installation Options
Choose the installation method that best fits your workflow:

#### Global Installation (Recommended)
```bash
npm install -g i18ntk
```
Perfect for team-wide usage and CI/CD pipelines. Available system-wide as `i18ntk` command.

#### Local Project Installation
```bash
npm install --save-dev i18ntk
```
Ideal for project-specific configurations and when working with different versions across projects.

#### NPX Usage (No Installation)
```bash
npx i18ntk init
```
Great for one-time usage or testing the toolkit without permanent installation.

### First Steps - Complete Setup Guide

#### 1. Initialize Your Project
```bash
# Create complete i18n infrastructure
npx i18ntk init

# This creates:
# ├── settings/i18ntk-config.json    # Main configuration
# ├── locales/                      # Translation files directory
# │   └── en/common.json           # Default English translations
# ├── ui-locales/                  # UI-specific translations (optional)
# └── package.json scripts         # npm integration
```

#### 2. Interactive Configuration
```bash
# Guided setup with visual interface
npx i18ntk manage

# Configure:
# • Supported languages (7 languages available)
# • Translation file structure
# • Framework integration
# • Validation rules
# • Performance settings
```

#### 3. Analyze Existing Translations
```bash
# Comprehensive analysis of current translations
npx i18ntk analyze

# Provides:
# • Missing translation keys across languages
# • Usage statistics and coverage
# • Duplicate key detection
# • Validation errors
# • Performance metrics
```

#### 4. Project Health Summary
```bash
# Complete project overview
npx i18ntk summary

# Shows:
# • Translation completeness
# • Language coverage
# • Configuration health
# • Performance recommendations
# • Security status
```

#### 5. Advanced Usage Patterns
```bash
# Validate translations before deployment
npx i18ntk validate

# Export translations for external review
npx i18ntk export

# Sync translations across environments
npx i18ntk sync

# Generate usage reports
npx i18ntk usage
```

## ✨ What's New in v1.5.0

### 🌍 Completed Internationalization Overhaul
- **Fixed all hardcoded error messages** - Replaced remaining hardcoded English strings with proper translation keys
- **Enhanced validation error handling** - All error messages now support full internationalization across 8 languages
- **Added comprehensive validation keys** - New translation keys for file operations, directory validation, and error states
- **Complete error message coverage** - All console error messages now support full internationalization
- **Translation consistency** - All language files synchronized with new validation keys across EN, DE, ES, FR, JA, ZH, RU, PT

### 🔧 Validation & Error Handling Improvements
- **Source directory validation** - Enhanced error messages for missing source directories
- **JSON file discovery** - Better error handling when no JSON files found in source directories
- **I18n directory validation** - Improved error messages for missing i18n directories
- **File path validation** - Enhanced validation for invalid file paths and directory structures
- **Write operation feedback** - Clearer error messages for file write failures
- **Sample file creation** - Better error handling for sample translation file creation

### 🎯 Translation Key Additions
- **Added 7 new validation keys** across all language files:
  - `noJsonFilesFound` - When no JSON files found in source directory
  - `i18nDirectoryNotFound` - When i18n directory is missing
  - `invalidDirectoryPaths` - When directory paths are invalid
  - `invalidSampleFilePath` - When sample file path is invalid
  - `failedToCreateSampleTranslationFile` - When sample file creation fails
  - `invalidFilePathDetected` - When invalid file paths are detected
  - `failedToWriteFile` - When file write operations fail

### 🛠️ Code Quality & Consistency
- **Standardized error handling** - Consistent error message patterns across all scripts
- **Translation fallback support** - All translation keys include English fallback messages
- **Improved error context** - Better contextual information in error messages
- **Cross-language consistency** - All 8 language files updated with identical key structures
- **Backward compatibility** - Maintained existing functionality while adding new features

### 🌍 Complete Internationalization Overhaul
- **Fixed all hardcoded English strings** - Comprehensive translation support across all UI components
- **Enhanced admin-pin.js** - Full translation key support for all PIN management operations
- **Added missing translation keys** - 15+ new keys for PIN setup, verification, and security warnings
- **Complete UI language coverage** - All console messages now support full internationalization
- **Translation validation** - All language files synchronized across 8 supported languages

### 🎯 Zero Dependencies 
- **Removed i18next dependency** - Package now has zero runtime dependencies
- **Universal framework compatibility** - Works with React, Vue, Angular, Next.js, and vanilla JavaScript
- **Faster installation** - No additional packages to download
- **Enhanced portability** - Framework-agnostic design

### ⚡ **VERIFIED PERFORMANCE** - August 5, 2025 Benchmarks
- **🔥 Ultra-lightweight**: 1.7MB → 536KB unpacked (68% reduction)
- **📊 Translation throughput**:
  - 400 keys (100 × 4 languages): 1578 keys/sec (63.4ms avg)
  - 4,000 keys (1K × 4 languages): 1944 keys/sec (514.4ms avg)
  - 40,000 keys (10K × 4 languages): 1909 keys/sec (5238.8ms avg)
  - 200,000 keys (50K × 4 languages): 1623 keys/sec (30809.7ms avg)
- **⚡ Configuration validation**:
  - Minimal: 15.7ms avg
  - Standard: 15.7ms avg
  - Full: 20.4ms avg
- **💾 Memory efficiency**: 413KB avg usage (400 keys), optimized for 25K+ datasets
- **🎯 Multi-language scale testing**: Validated across 4 languages × 50K keys each
- **🔧 Zero runtime dependencies**: Pure Node.js implementation
- **📈 Verified metrics**: Windows 10 / Node.js v22.14.0 / Intel i7-6700K

#### 📊 v1.5.0 Performance Metrics
Based on comprehensive benchmarking with real datasets:

| Dataset Size | Avg Execution Time | Throughput | Memory Usage |
|-------------|-------------------|------------|--------------|
| 100 keys    | 57.80 ms          | 1,730 ops/sec | 329 KB |
| 1,000 keys  | 515.09 ms         | 1,941 ops/sec | 11 KB |
| 10,000 keys | 5,221.74 ms       | 1,915 ops/sec | -298 KB |
| 50,000 keys | 30,290.34 ms      | 1,651 ops/sec | 1.06 MB |

#### 🎯 Performance Characteristics
- **Linear scaling**: Performance scales predictably with dataset size
- **Zero dependencies**: No external dependencies affecting performance
- **Memory efficient**: Excellent garbage collection with negative heap usage
- **Consistent throughput**: Maintains 1,600-1,900 operations/second across all scales
- **Validation performance**: Minimal validation 16.14ms, Standard 13.80ms, Full 25.07ms

#### 🔧 Running Performance Tests
```bash
# Full benchmark suite
npm run benchmark

# Quick regression check (CI mode)
npm run benchmark:ci

# Update baseline measurements
npm run benchmark:baseline
```

📈 **Detailed Performance Analysis**: See [benchmarks/PERFORMANCE_ANALYSIS.md](benchmarks/PERFORMANCE_ANALYSIS.md) for comprehensive performance data, regression thresholds, and usage guidelines.

## 🛠️ Framework Integration Guide

### React / Next.js Integration
```javascript
// package.json scripts for React projects
{
  "scripts": {
    "i18n:init": "i18ntk init",
    "i18n:analyze": "i18ntk analyze",
    "i18n:validate": "i18ntk validate",
    "i18n:build": "i18ntk export && npm run build"
  }
}
```

### Vue.js Integration
```javascript
// Vue.js specific configuration in i18ntk-config.json
{
  "translationsPath": "src/locales",
  "sourcePatterns": ["src/**/*.vue", "src/**/*.js"],
  "languages": ["en", "es", "de", "fr"]
}
```

### Angular Integration
```typescript
// Angular project structure
{
  "translationsPath": "src/assets/i18n",
  "sourcePatterns": ["src/**/*.ts", "src/**/*.html"],
  "defaultLanguage": "en"
}
```

### Node.js / Express Backend
```javascript
// Backend configuration
{
  "translationsPath": "locales",
  "sourcePatterns": ["src/**/*.js", "routes/**/*.js"],
  "languages": ["en", "es", "de"]
}
```

## 🔍 Troubleshooting Guide

### Common Issues & Solutions

#### "Command not found" errors
```bash
# Solution 1: Install globally
npm install -g i18ntk

# Solution 2: Use npx
npx i18ntk init

# Solution 3: Check npm path
echo $PATH
npm config get prefix
```

#### Translation files not found
```bash
# Verify directory structure
ls -la locales/
ls -la settings/i18ntk-config.json

# Check configuration
i18ntk manage

# Reset configuration
rm -rf settings/i18ntk-config.json
i18ntk init
```

#### Performance issues with large datasets
```bash
# Use CI mode for faster analysis
i18ntk analyze --mode=ci

# Exclude node_modules
i18ntk analyze --exclude="node_modules/**"

# Memory optimization
export NODE_OPTIONS="--max-old-space-size=4096"
i18ntk analyze
```

#### Missing translation keys
```bash
# Generate missing keys report
i18ntk analyze --output=missing-keys.json

# Auto-fix missing keys
i18ntk manage --fix-missing

# Validate specific language
i18ntk validate --language=es
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=i18ntk:* i18ntk analyze

# Verbose output
i18ntk analyze --verbose

# Performance profiling
i18ntk analyze --profile
```

### CI/CD Integration Examples

#### GitHub Actions
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
      - run: i18ntk analyze --output=report.json
```

#### GitLab CI
```yaml
validate_i18n:
  stage: test
  image: node:18
  script:
    - npm install -g i18ntk
    - i18ntk validate --strict
    - i18ntk analyze --output=i18n-report.json
  artifacts:
    reports:
      json: i18n-report.json
```

#### Docker Integration
```dockerfile
FROM node:18-alpine
RUN npm install -g i18ntk
COPY . /app
WORKDIR /app
RUN i18ntk validate
```

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

### 🔄 CI/CD & Automation
- **GitHub Actions workflows** - Automated release and security scanning
- **Cross-platform testing** - Windows (Tested), macOS (Not Tested), and Linux (Not Tested) compatibility
- **Security scanning** - Automated vulnerability detection
- **Performance CI** - Prevents performance regressions in PRs
- **npm benchmark scripts** - `benchmark`, `benchmark:ci`, `benchmark:baseline`

### 📦 Package Optimization
- **Enhanced .npmignore** - Excludes benchmarks, docs, and dev files
- **46 files removed** from production package
- **Production-ready package** - Optimized for npm distribution
- **Security hardening** - Reduced attack surface
- **Streamlined dependencies** - Zero runtime dependencies

### 🛠️ Developer Experience
- **Framework-agnostic design** - Works with any i18n solution
- **Simplified integration** - No framework-specific setup required
- **Enhanced documentation** - Updated for zero dependencies architecture
- **Improved error messages** - Better debugging experience


## 📚 Previous Release: v1.4.2 Features

### 🚨 Critical Bug Fix
- **Fixed MODULE_NOT_FOUND Error**: Resolved critical issue in v1.4.1 where `npx i18ntk` would fail with missing debug scripts
- **Relocated Debug Tools**: Moved debug scripts from `/dev/debug/` to `/scripts/debug/` to ensure proper npm package inclusion
- **Updated All References**: Fixed all internal path references to work with new debug script location
- **Immediate Update Recommended**: Do not use v1.4.1 and any v1.4.1 users should update to v1.4.2 immediately. Apologies for the issue, due to the local testing environments, the bug was missed in testing.

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

### 🔐 Advanced PIN Protection
- **Configurable Script-level PIN Protection**: Secure your i18n toolkit with customizable PIN requirements
- **AES-256-GCM Encryption**: Military-grade encryption for sensitive operations
- **Session Management**: Automatic session timeouts and secure session handling
- **Complete Internationalization**: PIN prompts and messages in 8 languages

### 🌍 7-Languages Complete Support
- **Full Internationalization**: English, German, Spanish, French, Russian, Japanese, Chinese
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
- Industry-standard AES-256-GCM encryption for PIN protection
- See [PIN Protection Guide](docs/PIN_PROTECTION_GUIDE.md) for security best practices

### 🌍 Complete Internationalization
- **7 languages with 100% complete translation coverage - ZERO missing keys errors guaranteed**
- **All UI elements, error messages, and help text fully translated**
- **Comprehensive validation ensures no translation gaps**
- **PIN protection and security features fully localized across all languages**

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

#### ✅ Guaranteed 100% Translation Coverage
All 7 languages are **completely translated with zero missing keys** - verified by our automated validation system:

- **English** (en) - Complete ✅
- **German** (de) - Complete ✅  
- **Spanish** (es) - Complete ✅
- **French** (fr) - Complete ✅
- **Russian** (ru) - Complete ✅
- **Japanese** (ja) - Complete ✅
- **Chinese** (zh) - Complete ✅

**🎯 Translation Quality Guarantee**: Every UI element, error message, tooltip, and help text is fully localized. Our validation scripts ensure no missing keys across any language.


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
  languages: ['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'],
  sourceDir: './src',
  outputDir: './public/locales',
  framework: 'next',
  adminPin: 'your-secure-pin', // Use strong PINs, never commit to version control
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

## 🎨 Visual Interface Showcase

### 🖥️ Interactive Management Dashboard
Experience our fully translated management interface across all 7 languages:

![i18nTK Management Dashboard](./docs/screenshots/i18ntk-settings.PNG)
*Interactive dashboard showing complete translation status, language switcher, and real-time validation results*

### 📊 Translation Analysis & Validation
See how our validation system ensures 100% translation completeness:

![Translation Analysis Summary](./docs/screenshots/i18ntk-summary.PNG)
*Complete analysis showing zero missing keys across all 7 supported languages*

### 🔐 Security & PIN Configuration
Fully localized security settings for all users:

![PIN Security Settings](./docs/screenshots/i18ntk-init-admin.PNG)
*PIN protection interface available in all 7 languages with complete localization*

### 🌐 Language Switching in Action
Demonstration of seamless language switching:

![Language Switcher](./docs/screenshots/i18ntk-usage.PNG)
*Real-time language switching showing complete UI translation*

**📸 Screenshots Available**: The screenshots above are real interface captures. Multilingual variants are stored in `./docs/screenshots/` for reference.

---

## ⚙️ CLI Interaction Showcase

Explore how the command-line workflow looks in practice. All prompts and confirmations are fully localized and consistent with the UI experience.

| Screenshot | Description |
|------------|-------------|
| ![NPX Init – Decline](./docs/screenshots/i18ntk-npx-n.PNG) | The `npx i18ntk init` command detects no existing i18n framework and shows a confirmation prompt (user selected **No**). |
| ![NPX Init – Accept](./docs/screenshots/i18ntk-npx-y.PNG) | The same prompt when the user selects **Yes**, proceeding with toolkit initialization. |
| ![Analyze Command](./docs/screenshots/i18ntk-analyze.PNG) | Output from `i18ntk analyze` summarising translation coverage and detected issues. |
| ![Validate Command](./docs/screenshots/i18ntk-validate.PNG) | `i18ntk validate` ensuring 100 % key coverage before deployment. |
| ![Delete Reports](./docs/screenshots/i18ntk-delete.PNG) | Safety prompt when removing obsolete validation reports via `i18ntk delete`. |
| ![Completion Summary](./docs/screenshots/i18ntk-complete.PNG) | Success message after all tasks complete with zero errors. |
| ![Manage Interface](./docs/screenshots/i18ntk-manage.PNG) | Snapshot of the interactive `i18ntk manage` flow in the terminal. |
| ![PIN Setup – After Confirmation](./docs/screenshots/i18ntk-init-admin-1.PNG) | Final step of admin PIN setup showing confirmation screen. |

These terminal screenshots complement the graphical dashboard, giving a full picture of both **UI** and **CLI** workflows.

### 🎯 UI Features Highlight
- **Complete translation coverage** across all interface elements
- **Real-time validation** showing translation status
- **Seamless language switching** without restart
- **Localized error messages** and help text
- **Cultural adaptation** for each supported language

### 📋 Changelog & Release Notes

For detailed information about what's changed in each version, see our [CHANGELOG.md](CHANGELOG.md) which follows [Keep a Changelog](https://keepachangelog.com/) principles.

### Version History Highlights
- **v1.5.0** (2025-08-05): **MAJOR OPTIMIZATION** - 68% package size reduction (1.7MB → 536KB), zero runtime dependencies, updated August 2025 benchmarks, 100% translation guarantee
- **v1.4.3** (2025-08-09): **100% Translation Guarantee** - Zero missing keys across all 7 languages, enhanced validation system, improved UI documentation
- **v1.4.2** (2025-08-08): Critical bug fix for MODULE_NOT_FOUND error in v1.4.1
- **v1.4.1** (2025-08-08): Package optimization and debug tools streamlining
- **v1.4.0** (2025-08-07): Advanced PIN protection, 7-language support, enhanced security

## 🤝 Contributing

We welcome contributions! Please see our comprehensive [Contributing Guide](CONTRIBUTING.md) for:
- Development setup instructions
- Code standards and guidelines
- Testing requirements
- Security best practices
- Issue and PR templates

### Community Health Files
- [Code of Conduct](CODE_OF_CONDUCT.md) - Our community standards
- [Security Policy](SECURITY.md) - How to report vulnerabilities
- [Contributing Guide](CONTRIBUTING.md) - How to contribute

## 🚀 Framework Integration

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

### 🎯 Translation Quality Assurance

#### **100% Translation Guarantee**
Our enhanced validation system ensures **zero missing translation keys** across all 7 supported languages:

```bash
# Validate complete translation coverage
i18ntk validate

# Verify no missing keys across all languages
i18ntk validate --missing-only

# Run comprehensive translation analysis
i18ntk analyze --complete
```

#### **Automated Quality Checks**
- ✅ **Zero missing keys** guaranteed across all languages
- ✅ **Complete UI coverage** - every interface element translated
- ✅ **Real-time validation** with immediate feedback
- ✅ **Automated detection** of translation gaps
- ✅ **Multi-language consistency** validation

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
# Interactive management with complete translation visibility
i18ntk manage

# Validate all translations - 100% coverage guaranteed
i18ntk validate

# Check for missing translations - zero tolerance policy
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

Issues and pull requests welcome! See [Contributing Guide](CONTRIBUTING.md) for detailed setup instructions and development workflow.

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

- ✅ **Stable Release**: v1.4.2
- ✅ **Production Ready**: Available on npm with growing adoption
- ✅ **Security Audited**: Regular security reviews
- ✅ **Performance Optimized**: Sub-second analysis times
- ✅ **8-Language Support**: Complete internationalization
- ✅ **Zero Dependencies**: No runtime dependencies - works with any framework
- ✅ **Framework Agnostic**: Compatible with React, Vue, Angular, and vanilla JS
- ✅ **CI/CD Ready**: Complete GitHub Actions integration
- ✅ **Benchmarked**: Performance monitoring and regression detection
- ✅ **Optimized Package**: 15.7% smaller package size

## 🔍 Performance Metrics

| Metric | Value |
|--------|--------|
| **Analysis Speed** | ~1,700-2,060 files/second |
| **Memory Usage** | <50MB for large projects |
| **Package Size** | ~1.5MB (compressed) |
| **Startup Time** | <500ms |
| **Language Switching** | Instant |
| **Zero Dependencies** | No runtime dependencies |
| **Framework Support** | Universal compatibility |
| **Large Dataset Performance** | 50K translations in ~29 seconds |
| **Memory Efficiency** | Stable memory usage across all dataset sizes |

## 🚀 Latest Improvements (v1.4.2+)

### 🎯 Zero Dependencies Achievement
- **Removed i18next dependency**: Package now has zero runtime dependencies
- **Universal compatibility**: Works with any i18n framework or vanilla JavaScript
- **Faster installation**: No additional packages to download
- **Smaller footprint**: Reduced package size by 15.7%
- **Framework agnostic**: Compatible with React, Vue, Angular, Next.js, and more

### ⚡ Performance & Benchmarking (Available on GitHub Only)
- **Performance benchmarking framework**: Complete suite for measuring translation analysis performance
- **Regression detection**: Automated performance monitoring with baseline comparisons
- **Dataset testing**: Tested across 100, 1K, 10K, and 50K translation datasets
- **Memory profiling**: Detailed memory usage analysis for optimization
- **Throughput metrics**: Real-time performance tracking and reporting

### 🔄 CI/CD Integration
- **GitHub Actions workflows**: Automated release and security scanning
- **Performance regression testing**: Prevents performance degradation in PRs
- **Security scanning**: Automated vulnerability detection
- **Cross-platform testing**: Windows is supported, Linux and Mac has not been tested.
- **npm scripts**: `benchmark`, `benchmark:ci`, `benchmark:baseline` commands

### 📦 Package Optimization
- **15.7% size reduction**: From 1.78MB to 1.5MB unpacked
- **Multiple files removed**: Optimized package contents for production
- **Enhanced .npmignore**: Excludes benchmarks, docs, and dev files from npm package
- **Streamlined dependencies**: Zero runtime dependencies
- **Faster startup**: Improved initialization performance

## 🛡️ Security Features

- **PIN Protection**: Optional 4-10 digit PIN protection
- **AES-256-GCM Encryption**: High-grade data encryption
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

## 📋 Versioning Policy

This project follows [Semantic Versioning (SemVer)](https://semver.org/) with the format `MAJOR.MINOR.PATCH`:

- **MAJOR**: Incompatible API changes
- **MINOR**: Backward-compatible functionality additions
- **PATCH**: Backward-compatible bug fixes

Version numbers and release dates are synchronized across:
- `package.json` version field
- GitHub releases and tags
- CHANGELOG.md entries
- README.md documentation

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