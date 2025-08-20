# 🌍 i18ntk - The Ultimate i18n Translation Management Toolkit

![i18ntk Logo](docs/screenshots/i18ntk-logo-public.PNG)

**Version:** 1.10.1
**Last Updated:** 2025-08-20
**GitHub Repository:** [vladnoskv/i18n-management-toolkit](https://github.com/vladnoskv/i18n-management-toolkit)

[![npm version](https://badge.fury.io/js/i18ntk.svg)](https://badge.fury.io/js/i18ntk) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Performance](https://img.shields.io/badge/Performance-97%25%20faster-blue.svg)](https://github.com/vladnoskv/i18ntk#performance) 
[![npm downloads](https://img.shields.io/npm/dt/i18ntk.svg?label=npm%20downloads)](https://www.npmjs.com/package/i18ntk) [![GitHub stars](https://img.shields.io/github/stars/vladnoskv/i18ntk?style=social&label=github%20stars)](https://github.com/vladnoskv/i18ntk) [![Socket Badge](https://socket.dev/api/badge/npm/package/i18ntk/1.10.0)](https://socket.dev/npm/package/i18ntk/overview/1.10.0)

A powerful i18n **internationalization management toolkit** with framework detection and comprehensive translation management capabilities.

## 🚀 Quick Start

### 1. One-Time Setup

```bash
# Install the CLI globally (recommended)
npm install -g i18ntk

# Or use with npx (no installation required)
npx i18ntk

# Run the setup wizard
i18ntk
```

The toolkit will automatically detect your environment and guide you through the initial configuration.

### 2. Basic Commands

```bash
# Start the interactive interface
i18ntk

# Direct commands
i18ntk analyze [--dry-run]     # Analyze translation files
i18ntk validate                # Validate translations
i18ntk usage                   # Check translation usage
i18ntk complete                # Complete missing translations
i18ntk summary                 # Show project status
i18ntk sizing                  # Analyze sizing requirements
i18ntk debug                   # Debug translation issues
```

### 3. Specialized Tools

```bash
# Translation scanner for hardcoded text
i18ntk-scanner --source-dir=./src --framework=react

# Translation fixer for broken translations
i18ntk-fixer --languages de,fr --markers NOT_TRANSLATED

# Translation verification (NEW in v1.10.1)
node scripts/verify-translations.js  # Comprehensive translation validation

# Backup & Restore
i18ntk-backup create           # Create a new backup
i18ntk-backup list            # List available backups
i18ntk-backup restore <backup-id>  # Restore from backup
```

## 🎯 Key Features

### 🚀 Enhanced Runtime Translation API (v1.10.0)

#### New in 1.10.0
- **Improved TypeScript Support**: Better type inference and autocomplete
- **Framework Detection**: Automatic detection of Next.js, Nuxt.js, and SvelteKit projects
- **Performance**: Optimized translation lookups with reduced memory footprint
- **DNR Functionality**: Fixed persistence of "Do Not Remind" settings across versions

#### Core Features
- **Universal Runtime**: Framework-agnostic API for any JavaScript/TypeScript project
- **TypeScript First**: Full type definitions with autocomplete support
- **Lightweight**: Zero dependencies, minimal bundle size impact
- **Dynamic Loading**: Load translations on demand or preload
- **Pluralization**: Full CLDR plural rules support
- **Interpolation**: Named and nested placeholders
- **Formatting**: Number, date, and time formatting
- **Fallback Chains**: Graceful fallback between languages
- **Hot Reloading**: Update translations without page reload

#### Framework Integration
```javascript
// React
const { t } = useTranslation();

// Vue 3
const { t } = useI18n();

// Angular
@Injectable()
class MyService {
  constructor(private i18n: I18nService) {}
}

// Svelte
$t('key')
```

#### Language Support
- **JavaScript/TypeScript**: Native JSON/JSON5 support
- **Python**: .po/.mo file support
- **Java**: ResourceBundle and properties files
- **PHP**: Array and Laravel JSON format
- **Go**: TOML/JSON/YAML with go-i18n compatibility

#### Performance Optimizations
- **Tree-shaking**: Only include used translations
- **Code Splitting**: Split translations by route/feature
- **Caching**: In-memory and persistent caching
- **Lazy Loading**: Load translations only when needed
- **V8 JSON Optimization**: Leverages Node.js 22's improved `JSON.stringify` performance for 2-3x faster processing and 50% memory reduction with Unicode/emoji handling
- **Ultra-Performance Mode**: Advanced optimization algorithms for extreme-scale translation processing

### 🔍 Framework Detection & Analysis
- **Automatic Detection**: Identifies frameworks and configurations
- **Code Analysis**: Finds untranslated strings
- **Validation**: Checks for common i18n issues
- **Optimization**: Suggests improvements

### 🛠️ Developer Tools
- **CLI**: Full-featured command-line interface
- **API**: Programmatic access to all features
- **Plugins**: Extend functionality with plugins
- **Debugging**: Built-in debugging tools

### 🔍 Framework Detection
- **JavaScript/TypeScript Support**: Works with common JavaScript frameworks

### Installation

```bash
# Install globally
npm install -g i18ntk

# Or use with npx (no installation required)
npx i18ntk
```

### Basic Commands

```bash
# Initialize a new project
i18ntk init

# Analyze translation files
i18ntk analyze

# Validate translations
i18ntk validate

# Check translation usage
i18ntk usage
```

## ✨ Core Features

### 🔍 Translation Management
- **Comprehensive Analysis**
  - Find missing translations
  - Identify unused strings
  - Detect duplicate keys
  - Analyze translation coverage

- **Advanced Validation**
  - Syntax checking
  - Placeholder validation
  - Plural form verification
  - HTML/XML tag matching

- **Translation Verification** (NEW in v1.10.1)
  - Comprehensive key scanning across all locale files
  - Language-specific prefixing for missing translations (`[FR]`, `[DE]`, `[ES]`)
  - Interactive directory selection with validation
  - Real-time progress tracking and detailed reporting
  - Automatic backup creation before applying changes
  - Uses English (en.json) as base for comparison across all languages
  - **[📖 Full Guide](docs/translation-verification.md)** - Complete documentation and usage examples

- **Optimization**
  - Remove unused translations
  - Minify JSON files
  - Sort keys alphabetically
  - Normalize formatting

- **Backup & Versioning**
  - Automatic backups
  - Version history
  - One-click restore
  - Export/import functionality

### Framework & Language Support

i18ntk provides specialized support for multiple programming languages and frameworks, with optimized handling for each:

#### 🌐 Web Frameworks
- **React**
  - `react-i18next` integration
  - Next.js with `next-i18next`
  - Automatic key extraction from JSX/TSX
  - Hooks and HOCs support

- **Vue.js**
  - `vue-i18n` (v9+)
  - Nuxt.js with `nuxt-i18n`
  - Composition API support
  - Automatic key extraction from SFCs

- **Angular**
  - Built-in i18n pipeline
  - AOT compilation support
  - XLIFF/XMB/XTB format handling

#### 📱 Mobile & Desktop
- **React Native**
  - `react-native-localize` integration
  - Expo support via `expo-localization`
  - Platform-specific translations

- **Electron**
  - Main and renderer process support
  - Automatic locale detection
  - Built-in auto-update handling

#### 🐍 Python Support
- **Frameworks**:
  - Django (with `django-i18n`)
  - Flask (with `Flask-Babel`)
  - FastAPI (with `fastapi-i18n`)
- **Features**:
  - `.po`/`.mo` file handling
  - Python string extraction
  - Plural forms support
  - Lazy translation detection

#### ☕ Java Support
- **Frameworks**:
  - Spring Boot i18n
  - ResourceBundle handling
  - JSP/Thymeleaf templates
- **Features**:
  - `messages.properties` support
  - UTF-8 encoding
  - Parameterized messages

#### 🐘 PHP Support
- **Frameworks**:
  - Laravel (built-in i18n)
  - Symfony Translation
  - WordPress
- **Features**:
  - `.php` array files
  - JSON translation support
  - Blade template parsing

#### 🐹 Go Support
- **Libraries**:
  - `golang.org/x/text`
  - `github.com/nicksnyder/go-i18n`
- **Features**:
  - JSON/TOML/YAML support
  - Plural and gender rules
  - Nested key structures

#### 🚀 JavaScript/TypeScript (Vanilla)
- **Features**:
  - JSON/JSON5 translations
  - Dynamic imports
  - Type-safe translations
  - Custom formatters
  - Nested structures

### 🧪 v1.10.0 Framework Validation Results

**Comprehensive Testing Environment Successfully Validated** ✅

#### Test Results Summary
- **16/17 Tests Passed** (94% success rate)
- **Framework Coverage**: 4 major frameworks tested
- **Cross-Platform**: Windows, macOS, Linux compatibility verified
- **Security**: Zero vulnerabilities confirmed

#### Validated Framework Configurations
| Framework | Library | Test Status | Validation Score |
|-----------|---------|-------------|------------------|
| **React** | `react-i18next` | ✅ Passed | 100% |
| **Vue.js** | `vue-i18n` | ✅ Passed | 100% |
| **Node.js** | `i18n-node` | ✅ Passed | 100% |
| **Python** | `Flask-Babel` | ✅ Passed | 100% |

#### Test Environment Features
- **Admin PIN Security**: Secure authentication system implemented
- **Framework Detection**: Automatic detection and configuration
- **Translation Validation**: Multi-framework validation support
- **Performance Monitoring**: 97% performance improvement maintained
- **Cross-Platform Testing**: Verified on all major platforms

#### Quick Start Commands for Each Framework
```bash
# React project
npx i18ntk setup --framework react-i18next

# Vue.js project  
npx i18ntk setup --framework vue-i18n

# Node.js project
npx i18ntk setup --framework i18n-node

# Python project
npx i18ntk setup --framework flask-babel
```

## 🌐 Supported Languages

i18ntk comes with built-in support for 7 major languages, with complete UI translations for each:

| Language | Native Name | Code | Status |
|----------|-------------|------|--------|
| English | English | `en` | ✅ Complete |
| Spanish | Español | `es` | ✅ Complete |
| French | Français | `fr` | ✅ Complete |
| German | Deutsch | `de` | ✅ Complete |
| Russian | Русский | `ru` | ✅ Complete |
| Japanese | 日本語 | `ja` | ✅ Complete |
| Chinese | 中文 | `zh` | ✅ Complete |

### Language Limitations
**Note:** Some newer features and fixes in v1.10.0 may be hardcoded in English due to recent updates. The UI is not fully translated into all supported languages yet. Please expect some interface elements to appear in English while translations are being completed.

### Adding New Languages

You can easily add support for additional languages by:

1. Creating a new JSON file in the `ui-locales` directory (e.g., `it.json` for Italian)
2. Following the existing translation structure
3. Submitting a pull request to contribute your translations

The toolkit supports all CLDR languages with built-in pluralization rules and RTL language support.

## 🔒 Security

### Key Security Features (v1.10.0+)
- **Local-Only**: No network access or external dependencies
- **Minimal Permissions**: Only accesses explicitly specified directories
- **Zero Dependencies**: Reduces attack surface and potential vulnerabilities
- **Memory Protection**: Secure handling of sensitive data in memory
- **Secure Defaults**: All security features enabled by default
- **SecurityUtils API**: Comprehensive security utilities for safe file operations
- **Encrypted Configuration**: AES-256-GCM encryption for absolute file paths
- **Symlink Attack Prevention**: Validation against symlink-based attacks
- **No Known Vulnerabilities**: Successfully passed comprehensive security audits

### Security Architecture

#### 🛡️ Security Hardening in v1.10.0
- **Path Traversal Fix**: Complete resolution of directory traversal vulnerabilities
- **SecurityUtils Integration**: All file operations use secure wrapper functions
- **Input Sanitization**: Comprehensive validation and sanitization of all user inputs
- **Symlink Protection**: Validation of symlink targets to prevent attacks
- **Secure File Operations**: Replaced all direct `fs` calls with secure wrappers
- **Enhanced Encryption**: Verified AES-256-GCM with PBKDF2 key derivation

### SecurityUtils API (NEW in v1.10.0)
Comprehensive security utilities for safe file operations:

```javascript
const { SecurityUtils } = require('i18ntk/utils/security');

// Safe file operations with path validation
const content = await SecurityUtils.safeReadFile('translations/en.json', {
  baseDir: '/app/translations',
  allowedExtensions: ['.json']
});

// Path sanitization against traversal attacks
const safePath = SecurityUtils.safeSanitizePath('../config.json', {
  baseDir: '/app/translations',
  allowTraversal: false
});

// Secure file writing
await SecurityUtils.safeWriteFile('translations/new.json', content, {
  baseDir: '/app/translations',
  allowedExtensions: ['.json']
});
```

#### Data Protection
- **Encryption**: AES-256-GCM with PBKDF2 key derivation
- **Secure Storage**: Configuration files stored with restricted permissions (600 for files, 700 for directories)
- **Memory Safety**: Sensitive data is zeroed out after use
- **Input Validation**: All user inputs are strictly validated and sanitized

#### Access Control
- **Admin PIN**: Required for sensitive operations
- **Session Management**: Automatic timeout after 15 minutes of inactivity
- **Rate Limiting**: Protection against brute force attacks
- **Path Validation**: Prevents directory traversal attacks

### Security Configuration

Customize security settings in `security-config.json`:

```json
{
  "pin": {
    "minLength": 4,
    "maxLength": 32,
    "requireStrongPin": true,
    "maxAttempts": 5,
    "lockDuration": 900000,
    "sessionTimeout": 900000
  },
  "encryption": {
    "enabled": true,
    "algorithm": "aes-256-gcm",
    "keyDerivation": {
      "iterations": 100000,
      "digest": "sha512"
    }
  },
  "filePermissions": {
    "files": 384,    // 600 in octal
    "directories": 448 // 700 in octal
  }
}
```

### Security Best Practices

1. **Regular Updates**
   - Keep i18ntk updated to the latest version
   - Subscribe to security announcements

2. **Access Control**
   - Run with minimal required permissions
   - Restrict access to configuration files
   - Use strong, unique PINs

3. **Monitoring**
   - Review security logs regularly
   - Monitor for unusual activity
   - Report any security concerns immediately

4. **Backup & Recovery**
   - Maintain regular backups
   - Store backups securely
   - Test restore procedures

### Exit Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 0    | Success | Operation completed successfully |
| 1    | Configuration error | Invalid or missing configuration |
| 2    | Validation failed | Input validation error |
| 3    | Security violation | Authentication or authorization failure |
| 4    | Resource error | File system or resource access issue |
| 5    | Runtime error | Unexpected error during execution |

## ⚡ Runtime API Quick Start

Add i18ntk to your app with just a few lines of code:

```javascript
// Initialize once at app startup
import { initRuntime, t } from 'i18ntk/runtime';

initRuntime({
  baseDir: './locales',  // path to your locale files
  language: 'en',        // default language
});

// Use anywhere in your app
function Welcome() {
  return (
    <div>
      <h1>{t('welcome.title')}</h1>
      <p>{t('welcome.subtitle', { name: 'User' })}</p>
    </div>
  );
}
```

### Key Features
- **Type Safety**: Full TypeScript support with beta autocomplete support
- **Framework Agnostic**: Works with React, Vue, Angular, or vanilla JS
- **Dynamic Loading**: Load translations on demand
- **Pluralization & Interpolation**: Built-in support for all i18n features

## 💾 Backup & Restore

i18ntk provides a secure backup system to protect your translation files and configuration.

### Backup Commands

```bash
# Create a new backup with timestamp
i18ntk-backup create [directory]

# List all available backups
i18ntk-backup list

# Restore from a specific backup
i18ntk-backup restore <backup-file>

# Verify backup integrity
i18ntk-backup verify <backup-file>

# Remove old backups (keeps last 10 by default)
i18ntk-backup cleanup [--keep=10]
```

### Backup Features

- **Security-First**: Path traversal protection and safe file operations
- **Interactive Prompts**: User-friendly directory creation and configuration
- **Automatic Cleanup**: Configurable retention policy
- **Metadata**: Includes version and timestamp information
- **Verification**: Integrity validation for backup files
- **Configuration Persistence**: Settings saved to project configuration

### Backup Configuration

Configure backup settings in your project configuration (`.i18ntk/settings.json`):

```json
{
  "backup": {
    "directory": "./i18ntk-backup",
    "maxBackups": 10
  }
}
```

Configuration is automatically updated when you interactively set up your backup directory.

### Automatic Backups

Enable automatic backups in your project configuration:

```json
{
  "autoBackup": {
    "enabled": true,
    "frequency": "daily",
    "time": "02:00",
    "maxBackups": 7
  }
}
```

### Restoring from Backup

1. List available backups:
   ```bash
   i18ntk backup list
   ```

2. Verify backup contents:
   ```bash
   i18ntk backup info <backup-id>
   ```

3. Restore backup:
   ```bash
   i18ntk backup restore <backup-id>
   ```

4. Verify restoration:
   ```bash
   i18ntk validate
   ```

### Best Practices

- **Regular Backups**: Set up automatic daily backups
- **Offsite Storage**: Copy backups to a secure, offsite location
- **Test Restores**: Periodically verify backup integrity
- **Retention Policy**: Keep at least 7 days of backups
- **Monitor Space**: Ensure sufficient disk space for backups

## 🚀 Why Use i18ntk?

- **Simple**: Easy to use with minimal setup
- **Fast**: Quick analysis and validation
- **Lightweight**: Small footprint, no dependencies
- **Flexible**: Works with most JavaScript projects

## 📁 Project Structure

```
i18ntk/
├── main/                    # CLI commands
│   ├── i18ntk-manage.js    # Main interface
│   ├── i18ntk-analyze.js   # Analysis
│   └── i18ntk-validate.js  # Validation
├── utils/                  # Core utilities
│   ├── framework-detector.js
│   └── logger.js
├── settings/               # Configuration
├── package.json            # Package info
└── README.md               # Documentation
```

## ⚙️ Configuration

### Environment Variables

```bash
# Source directory for translation files
I18N_SOURCE_DIR=./locales

# Output directory for reports and exports
I18N_OUTPUT_DIR=./i18n-reports

# Default locale (e.g., 'en', 'es', 'fr')
I18N_DEFAULT_LOCALE=en

# Enable debug mode
I18N_DEBUG=false

# Log level (error, warn, info, debug, trace)
I18N_LOG_LEVEL=info
```

### Configuration File

Create an `i18n.config.json` file in your project root:

```json
{
  "sourceDir": "./locales",
  "outputDir": "./i18n-reports",
  "defaultLocale": "en",
  "locales": ["en", "es", "fr", "de", "ja", "zh"],
  "framework": "auto",
  "backup": {
    "enabled": true,
    "directory": "./i18n-backups"
  },
  "features": {
    "autoBackup": true,
    "validation": true,
    "analysis": true
  }
}
```

## ❓ Common Issues & Solutions

### Missing Translations

```
Warning: Translation key not found: my.key
```

**Solution**:
1. Add the missing key to your translation files
2. Run `i18ntk validate` to check for other missing translations
3. Use `i18ntk analyze` to find unused translations

### Permission Issues

```
Error: EACCES: permission denied
```

**Solution**:
```bash
# Fix directory permissions
chmod 755 /path/to/project

# Or run with sudo (not recommended for production)
sudo chown -R $USER:$USER /path/to/project
```

### Backup Issues

**Problem**: Backup fails with encryption error  
**Solution**: Ensure you have proper permissions and sufficient disk space

**Problem**: Can't restore from backup  
**Solution**: Verify backup integrity and check version compatibility

### Performance Issues

**Problem**: Slow analysis with large projects  
**Solution**:
- Exclude node_modules and other large directories
- Use `.i18nignore` to skip files
- Increase Node.js memory limit: `NODE_OPTIONS=--max-old-space-size=4096 i18ntk analyze`

## 📊 Troubleshooting

### Enable Debug Mode

```bash
# Set debug environment variable
export I18N_DEBUG=true

# Or use the debug flag
i18ntk --debug <command>
```

### View Logs

Logs are stored in `.i18ntk/logs/` by default. Check the latest log for detailed error information.

### Get Help

```bash
# Show help for all commands
i18ntk --help

# Get help for a specific command
i18ntk <command> --help

# Check version
i18ntk --version
```

## 🔒 Security

### Key Security Features
## 🌍 Locale Optimization

Optimize your translation files to reduce bundle size:

```bash
# Optimize all locales
i18ntk optimize

# Optimize specific languages
i18ntk optimize --lang=en,es,de
```

**Example:** 830.4KB → 115.3KB for English-only optimization

## 📊 i18ntk vs Traditional Tools

| Feature | i18ntk 1.10.0 | Traditional Tools | Manual Process |
|---------|--------------|-------------------|----------------|
| **Speed** | 15.38ms (200k keys) | 2-5 minutes | Hours |
| **Memory** | <2MB | 50-200MB | Variable |
| **Package Size** | 315KB packed | 5-50MB | N/A |
| **Dependencies** | Zero | 10-50 packages | Zero |
| **Framework Support** | Auto-detect 8+ frameworks | Manual config | Manual |
| **Security** | AES-256 + PIN | Basic | None |
| **Languages** | 7 UI languages | Usually 1-2 | Manual |
| **CI/CD Ready** | ✅ JSON output | ❌ Manual | ❌ |

## 🎯 Enhanced Translation Fixer

Interactive tool with automatic detection and repair:

```bash
# Enhanced guided mode
i18ntk fixer --interactive

# Fix specific languages with custom markers
i18ntk fixer --languages en,es,fr --markers "{{NOT_TRANSLATED}},__MISSING__"

# Auto-fix with reporting
i18ntk fixer --source ./src/locales --auto-fix --report

# Detect custom placeholder styles
i18ntk fixer --markers "TODO_TRANSLATE,PLACEHOLDER_TEXT,MISSING_TRANSLATION"

# Fix all languages
i18ntk fixer --languages all
```

**Features:**
- 7-language UI support
- Smart marker detection
- Selective fixing by language/file
- Comprehensive reporting
- Secure backup creation
- Real-time progress tracking

## 🛠️ Troubleshooting

### Common Issues & Solutions

#### Setup Completion Issues
If you see "Incomplete Setup" messages repeatedly:
```bash
# Force re-run setup (v1.10.1+)
i18ntk setup --force

# Check setup status
i18ntk doctor
```

#### Command Hanging
If commands hang or freeze:
```bash
# Clear cache and restart
i18ntk --clear-cache

# Use debug mode for detailed logging
DEBUG=i18ntk i18ntk [command]
```

#### Security Validation Issues
If you encounter path validation errors:
```bash
# Verify security settings
i18ntk security-check

# Reset security configuration
i18ntk settings --reset-security
```

#### Cross-Platform Issues
- **Windows**: Ensure paths use forward slashes or escaped backslashes
- **macOS/Linux**: Check file permissions with `ls -la`
- **All platforms**: Run `i18ntk doctor` for environment diagnostics

## 📚 Documentation

All documentation is built into the toolkit. Use:

```bash
i18ntk --help        # General help
i18ntk [command] --help  # Command-specific help
```

### 📊 Technical Documentation
- **[JSON Performance Analysis](./JSON_PERFORMANCE_ANALYSIS.md)** - Detailed analysis of V8 JSON performance improvements and Node.js 22 optimization benefits

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔄 Changelog

## 🆕 What's New in 1.10.1 - Setup & Stability Release

### 🔧 Setup & Initialization Fixes
- **✅ Setup Completion Detection** - Fixed persistent "Incomplete Setup" messages when setup was already completed
- **🔄 Initialization Loop Resolution** - Eliminated infinite initialization requests on every command execution
- **⚡ Command Reliability** - Fixed hanging issues with `npm run i18ntk` and other CLI commands
- **🛡️ Enhanced Security Validation** - Optimized path traversal rules to prevent excessive blocking while maintaining security
- **🔧 Cross-Platform Path Resolution** - Improved path handling across Windows, macOS, and Linux environments

### 🔒 Security Features (v1.10.0)
- **🔒 Zero Vulnerabilities** - All security issues resolved, npm audit clean
- **🛡️ Secure File Permissions** - Fixed i18ntk-config.json permissions (600/700)
- **🚫 Zero Shell Access** - Complete removal of all shell command dependencies
- **🔐 Enhanced Security** - AES-256 encryption with PBKDF2 key derivation verified
- **🛡️ Path Traversal Protection** - Fixed directory traversal vulnerabilities with comprehensive input sanitization and path validation
- **📋 Security Audit** - Comprehensive security validation passed
- **🧪 Production Testing** - All core commands verified functional
- **🔍 SecurityUtils Integration** - All file operations now use secure wrapper functions with path validation
- **🛡️ Input Sanitization** - Comprehensive sanitization of all user inputs before file operations
- **🔒 Symlink Attack Prevention** - Validation of symlink targets to prevent symlink attacks

### 🚀 Major Features
- **🌐 Enhanced Runtime API** - Improved framework-agnostic translation runtime with better TypeScript support
- **🔌 Extended Framework Support** - Better detection and integration with Next.js, Nuxt.js, and SvelteKit
- **📊 Performance Optimizations** - Up to 97% faster processing for large translation sets
- **🔒 Security Enhancements** - Improved DNR functionality with proper persistence
- **🛠️ Developer Experience** - Added reset script for clean package publishing
- **✅ Production Ready** - All critical fixes completed, comprehensive testing passed, zero breaking changes

### 🔧 Technical Improvements
- **🔄 Circular Dependencies** - Fixed all circular dependency issues (removed self-referencing tarball)
- **📦 Package Integrity** - Verified all core commands functionality
- **🧪 Framework Validation** - 16/17 tests passed (94% success rate), raise an issue if you experience a bug.
- **🌍 Cross-Platform** - Windows, macOS, Linux compatibility (Beta)
- **📊 Memory Optimization** - <2MB memory usage maintained
- **🚀 Smoke Tests** - All validation tests passed successfully

### 🔄 Changelog

#### v1.10.0 - Production Ready Release
- **🌐 Runtime API** - Improved TypeScript definitions and autocomplete
- **🚀 Framework Detection** - Enhanced support for Next.js, Nuxt.js, and SvelteKit
- **📊 Performance** - Optimized translation lookups and reduced memory usage
- **🔒 Security** - Fixed DNR (Do Not Remind) persistence and version-based reset
- **🛠️ Developer Tools** - Added reset script for clean package publishing
- **✅ Production Verification** - Security audit passed, all commands functional

#### v1.9.2 - Secure Backup Release
- **🔒 Secure Backups** - Encrypted backup system with admin PIN
- **🔐 Strong Encryption** - AES-256-GCM with PBKDF2 key derivation
- **🔄 Backup Management** - Create, restore, verify, and manage backups

#### v1.9.1 - Production Release
- **🐍 Beta Python Support** - Full i18n framework detection and analysis
- **⚡ Performance** - 97% faster processing with zero shell access
- **🛡️ Security** - Complete removal of child_process dependencies

#### v1.10.0 - Enhanced Runtime & Framework Support
- Enhanced framework detection with language info
- Language-specific best practices
- Improved user experience

#### v1.8.0 - Performance
- 87% performance improvement
- Memory optimization
- Multiple optimization modes

#### v1.7.0 - Security
- Admin PIN protection
- Session management
- Input validation improvements

### 🔥 Major Enhancements
- **Python Support**: Full i18n analysis for Django, Flask, FastAPI, and generic Python projects
- **Security Overhaul**: Complete elimination of child_process dependencies - 100% Node.js native
- **Enhanced Framework Detection**: Improved accuracy across all supported frameworks
- **Performance Optimizations**: Further refinements to ultra-extreme mode
- **Code Quality**: Improved readability and maintainability across all modules

### 🛡️ Security Improvements
- **Zero Shell Access**: All child_process.exec/spawn calls removed
- **Memory-Safe Operations**: 100% Node.js fs/path API usage
- **Dependency Cleanup**: Removed all shell access vulnerabilities
- **Enhanced Validation**: Improved input sanitization and path validation

### 📁 File Structure Updates
- **Added**: `locales/common.json` - Common translation patterns
- **Removed**: Outdated test files and debug tools
- **Optimized**: Package structure reduced to 84 production files
- **Enhanced**: Framework detection patterns for Python projects

### 🐍 Python-Specific Features
- **Django**: Automatic gettext pattern detection
- **Flask**: Flask-Babel integration support
- **FastAPI**: i18n middleware recognition
- **Generic Python**: Standard gettext and babel support

---

## 📸 Screenshots

| **Framework Detection** | **Main Menu** |
|:-----------------------:|:-------------:|
| ![Framework Detection](docs/screenshots/I18NTK-FRAMEWORK.PNG) | ![Main Menu](docs/screenshots/I18NTK-MENU.PNG) |

| **Initialization** | **Initilization Language Select** |
|:------------------:|:---------------------------------:|
| ![Initialization](docs/screenshots/I18NTK-INIT.PNG) | ![Init Summary](docs/screenshots/I18NTK-INIT-LANG-SELECT.PNG) | 

| **Language Selection** | **Language Changed** |
|:----------------------:|:--------------------:|
| ![Language Selection](docs/screenshots/I18NTK-LANGUAGE-UI.PNG) | ![Language Changed](docs/screenshots/I18NTK-LANGUAGE-UI-CHANGED.PNG) |

| **Settings Manager (v1.8.3)** | **Translation Fixer (v1.8.3)** |
|:-----------------------------:|:-------------------------------:|
| ![Settings Manager](docs/screenshots/I18NTK-SETTINGS.PNG) | ![Translation Fixer](docs/screenshots/I18NTK-FIXER.PNG) |

| **Analyze** | **Complete** | **Usage** |
|:-----------:|:------------:|:----------:|
| ![Analyze](docs/screenshots/I18NTK-ANALYZE.PNG) | ![Complete](docs/screenshots/I18NTK-COMPLETE.PNG) | ![Usage](docs/screenshots/I18NTK-USAGE.PNG) |

| **Sizing (Overview)** | **Sizing (List)** |
|:---------------------:|:-----------------:|
| ![Sizing](docs/screenshots/I18NTK-SIZING.PNG) | ![Sizing List](docs/screenshots/I18NTK-SIZING-LIST.PNG) |

| **Validate** | **Validate End** |
|:-----------:|:-----------------:|
| ![Validate](docs/screenshots/I18NTK-VALIDATE.PNG) | ![Validate End](docs/screenshots/I18NTK-VALIDATE-END.PNG) |

| **Summary** | **Summary Report** | **Summary Completed** |
|:-----------:|:-----------------:|:-----------------:|
| ![Summary Start](docs/screenshots/I18NTK-SUMMARY-1.PNG) | ![Summary End](docs/screenshots/I18NTK-SUMMARY-2.PNG) | ![Summary Options](docs/screenshots/I18NTK-SUMMARY-3.PNG) |


| **Admin Pin** | **Admin Pin Setup** | **Admin Pin Success** | **Admin Pin Ask** |
|:-----------:|:-----------------:|:-----------------:|:-----------------:|
| ![Admin Pin](docs/screenshots/I18NTK-ADMIN-PIN.PNG) | ![Admin Pin Setup](docs/screenshots/I18NTK-ADMIN-PIN-SETUP.PNG) | ![Success](docs/screenshots/I18NTK-ADMIN-PIN-SUCCESS.PNG) | ![Admin Pin Ask](docs/screenshots/I18NTK-ADMIN-PIN-ASK.PNG) |


| **Delete Options** | **Delete Full** | **Delete None** |
|:------------------:|:------------------:|:------------------:|
| ![Delete Options](docs/screenshots/I18NTK-DELETE-CHOOSE.PNG) | ![Delete Full](docs/screenshots/I18NTK-DELETE-FULL.PNG) | ![Delete None](docs/screenshots/I18NTK-DELETE-NONE.PNG) | 

---
## 🤝 Contributing & Support

- **Issues:** [GitHub Issues](https://github.com/vladnoskv/i18ntk/issues)
- **Docs:** `./docs` (full walkthroughs and examples)
- **Benchmarks:** `./benchmarks/results`
- **Version:** `i18ntk --version`

**Made for the global dev community.** ❤️
**Last Updated:** 2025-01-19
**Version:** 1.10.1