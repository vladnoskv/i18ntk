# 🌐 i18nTK - I18N Management Toolkit

[![GitHub Repository](https://img.shields.io/badge/GitHub-i18n--management--toolkit-blue?logo=github)](https://github.com/vladnoskv/i18n-management-toolkit.git)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D16.0.0-green?logo=node.js)](https://nodejs.org/)
[![i18next](https://img.shields.io/badge/i18next-25.3.2-orange)](https://www.i18next.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-1.3.7-brightgreen)](https://github.com/vladnoskv/i18n-management-toolkit-main)

A comprehensive internationalization (i18n) management toolkit for JavaScript/TypeScript projects. **i18nTK** (i18n Toolkit) helps you manage the constant need to track translations effectively, especially in large and complex projects with multiple languages. It prevents i18n debug errors by ensuring translation keys exist, and when visible, clearly displays "NOT_TRANSLATED" text to users, making missing translations immediately apparent.

## 🌍 Multi-Language Support

The toolkit itself supports multiple languages for its interactive interface and reports, allowing developers to work in their preferred language:

- 🇺🇸 **English** (en) - Default
- 🇩🇪 **German** (de) - Deutsch
- 🇪🇸 **Spanish** (es) - Español
- 🇫🇷 **French** (fr) - Français
- 🇷🇺 **Russian** (ru) - Русский
- 🇯🇵 **Japanese** (ja) - 日本語
- 🇨🇳 **Chinese** (zh) - 中文

**All interactive scripts, reports, and error messages are provided in the user's selected language for easier diagnosis and management.**

## 🆕 What's New in Version 1.3.7

### ✨ Latest Features

- **⚙️ Advanced Settings Management**: New interactive settings CLI with comprehensive configuration options
  - **Settings Menu**: Access via `npm run i18ntk:settings` or `node i18ntk-manage.js --command=settings`
  - **Configuration Management**: View, edit, and validate user-config.json settings
  - **Language Preferences**: Change UI language and report language settings
  - **Path Configuration**: Manage input/output directories and file paths
  - **Admin Settings**: Configure admin authentication and security options
- **🐛 Built-in Bug Reporting**: Integrated bug reporting system for easier issue submission
  - **GitHub Integration**: Direct links to create issues with pre-filled templates
  - **System Information**: Automatic collection of relevant system details
  - **Error Context**: Streamlined process for reporting bugs with proper context
- **🔧 Terminal Interface Fixes**: Critical fixes for double character input issues
  - **Readline Configuration**: Enhanced terminal interface stability
  - **Input Handling**: Improved user input processing across all interactive scripts
  - **Cross-platform Compatibility**: Better support for different terminal environments

### 🎯 Previous Major Features (1.3.0)

### ✨ Major New Features

- **🔧 Debug Tools**: Comprehensive debugging system for i18n projects
  - **Full System Debug**: Complete project analysis and health check
  - **Configuration Debug**: Validate user-config.json and package.json settings
  - **Translation Debug**: Deep analysis of translation files and structure
  - **Performance Debug**: Identify performance bottlenecks and optimization opportunities
- **🎯 Dynamic Path Support**: All tools now properly handle custom input/output paths from user configuration
- **📊 Enhanced Reporting**: Improved debug reports with detailed issue categorization and recommendations
- **🛠️ Better Error Detection**: Advanced detection of configuration issues, missing files, and structural problems
- **📦 NPM Package Ready**: Fully prepared for npm package distribution with proper binary commands

### 🎯 Key Improvements

- **New Debug Command**: `npm run i18ntk:debug` or `node i18ntk-manage.js --command=debug`
- **Binary Command**: Direct access via `i18ntk-debug` for standalone debugging
- **Interactive Debug Menu**: Choose specific debug types through an intuitive interface
- **Detailed Debug Reports**: Comprehensive reports saved to `debug-report.txt` with actionable insights
- **Dynamic Configuration**: No more hardcoded paths - all tools respect user-defined directories
- **Enhanced CLI Experience**: Improved help text and command descriptions

### 🔄 Previous Improvements (1.2.1)

- **🏷️ i18nTK Branding**: Introduced new i18nTK branding with consistent file naming (`i18ntk-*` prefix)
- **📦 Enhanced NPM Integration**: Added comprehensive npm scripts and binary commands for all tools
- **🔧 Critical Bug Fixes**: Fixed 'Analyze Sizing' step failure and incorrect default paths
- **📁 Nested File Support**: Improved support for nested directory structures in translations
- **⚡ Performance Improvements**: Enhanced error handling and processing efficiency

### 🔄 Migration from 1.2.x

- All existing functionality remains unchanged
- New debug tools are additive and optional
- Enhanced configuration validation helps identify and fix setup issues
- Improved dynamic path handling ensures tools work with any project structure

## 📋 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [📦 Requirements](#-requirements)
- [🛠️ Installation](#️-installation)
- [📁 Project Structure](#-project-structure)
- [🔧 Scripts Overview](#-scripts-overview)
- [⚙️ Configuration](#️-configuration)
- [📊 Workflow Guide](#-workflow-guide)
- [📈 Visual Reports](#-visual-reports)
- [🎯 Best Practices](#-best-practices)
- [🔍 Troubleshooting](#-troubleshooting)
- [🤝 Contributing](#-contributing)

## 🚀 Quick Start

### 🎯 NPM Scripts (Recommended)

```bash
# Run complete i18nTK workflow
npm run i18ntk

# Individual commands
npm run i18ntk:init        # Initialize i18n structure
npm run i18ntk:analyze     # Analyze translations
npm run i18ntk:validate    # Validate translations
npm run i18ntk:usage       # Check usage
npm run i18ntk:complete    # Complete translations
npm run i18ntk:sizing      # Analyze sizing
npm run i18ntk:debug       # Run debug tools
npm run i18ntk:settings    # Manage settings and configuration
npm run i18ntk:summary     # Generate summary
```

### 🔧 Direct Node.js Execution

```bash
# Interactive mode with language selection - recommended for first-time users
node i18ntk-manage.js

# Interactive mode with specific UI language
node i18ntk-manage.js --ui-language=de
node i18ntk-manage.js --ui-language=es
node i18ntk-manage.js --ui-language=fr

# Direct command execution
node i18ntk-manage.js --command=init
node i18ntk-manage.js --command=analyze
node i18ntk-manage.js --command=validate
node i18ntk-manage.js --command=usage
node i18ntk-manage.js --command=complete
node i18ntk-manage.js --command=sizing
node i18ntk-manage.js --command=debug
node i18ntk-manage.js --command=status
node i18ntk-manage.js --command=workflow
node i18ntk-manage.js --command=delete
node i18ntk-manage.js --command=settings
node i18ntk-manage.js --command=help

# Generate reports in specific language
node i18ntk-analyze.js --report-language=de
```

### 📦 Binary Commands (After Installation)

```bash
# If installed globally or via package.json bin
i18ntk-manage
i18ntk-init
i18ntk-analyze
i18ntk-validate
i18ntk-usage
i18ntk-complete
i18ntk-sizing
i18ntk-debug
i18ntk-summary
```

### 🌍 Language Selection

On first run, the toolkit will ask you to select your preferred language for the interface:

```
🌍 SELECT YOUR PREFERRED LANGUAGE / WÄHLEN SIE IHRE SPRACHE
============================================================
1. 🇺🇸 English
2. 🇩🇪 Deutsch (German)
3. 🇪🇸 Español (Spanish)
4. 🇫🇷 Français (French)
5. 🇷🇺 Русский (Russian)
6. 🇯🇵 日本語 (Japanese)
7. 🇨🇳 中文 (Chinese)

Please select (1-7): 
```

Your language preference will be saved and used for all future interactions, reports, and error messages.

## 📦 Requirements

### Dependencies

- **Node.js**: >= 16.0.0
- **i18next**: ^25.3.2 (supported and tested)
- **react-i18next**: ^15.6.0 (for React projects)

### Supported Project Types

- ✅ React/Next.js applications
- ✅ Vue.js applications
- ✅ Angular applications
- ✅ Vanilla JavaScript/TypeScript
- ✅ Node.js backend applications

## 🛠️ Installation

### Option 1: Clone from GitHub Repository

```bash
# Clone the repository
git clone https://github.com/vladnoskv/i18n-management-toolkit.git

# Copy the scripts to your project
cp -r i18n-management-toolkit/ your-project/i18ntk/

# Or use the scripts directly from the cloned repository
cd i18n-management-toolkit
node i18ntk-manage.js

# Or run via npm scripts
npm run i18ntk
```

### Option 2: Manual Installation

#### 1. Ensure i18next is installed

```bash
# For React projects
npm install i18next@^25.3.2 react-i18next@^15.6.0 i18next-browser-languagedetector

# For Vue projects
npm install i18next@^25.3.2 vue-i18next

# For vanilla JS/Node.js
npm install i18next@^25.3.2
```

#### 2. Copy the i18nTK management scripts

Copy the entire i18nTK directory to your project:

```
your-project/
├── i18ntk/
│   ├── i18ntk-manage.js
│   ├── i18ntk-init.js
│   ├── i18ntk-analyze.js
│   ├── i18ntk-validate.js
│   ├── i18ntk-usage.js
│   ├── i18ntk-complete.js
│   ├── i18ntk-sizing.js
│   ├── i18ntk-summary.js
│   ├── auto-run.js              # Automated workflow
│   ├── dev/
│   │   └── debug/
│   │       └── debugger.js      # Debug tools and system analysis
│   ├── package.json             # NPM scripts and dependencies
│   ├── ui-locales/              # Multi-language UI support
│   └── README.md
```

### 3. Initialize your i18n structure

```bash
cd your-project/i18ntk

# Using npm scripts (recommended)
npm run i18ntk:init

# Or direct execution
node i18ntk-manage.js --command=init
```

This will create:
```
your-project/
├── locales/
│   ├── en/
│   │   └── common.json
│   ├── de/
│   │   └── common.json
│   ├── es/
│   │   └── common.json
│   ├── fr/
│   │   └── common.json
│   └── ru/
│       └── common.json
└── i18n-reports/
    └── (generated reports)
```

## 📁 Project Structure

```
i18ntk/
├── i18ntk-manage.js           # 🎛️  Main management interface
├── i18ntk-init.js             # 🚀 Initialize new languages
├── i18ntk-analyze.js          # 📊 Analyze translation completeness
├── i18ntk-validate.js         # ✅ Validate translation files
├── i18ntk-usage.js            # 🔍 Check translation key usage
├── i18ntk-complete.js         # 🎯 Complete translations (100% coverage)
├── i18ntk-sizing.js           # 📏 Analyze translation sizing and layout impact
├── i18ntk-summary.js          # 📋 Generate summary reports
├── auto-run.js                # 🔄 Automated workflow execution
├── dev/
│   └── debug/
│       └── debugger.js        # 🔧 Debug tools and system analysis
├── package.json               # 📦 NPM scripts and dependencies
├── CHANGELOG.md               # 📝 Version history and changes
├── i18n-reports/              # 📈 Generated reports
├── ui-locales/                # 🌍 Multi-language UI support
└── README.md                  # 📖 This documentation
```

## 🔧 Scripts Overview

### 🎛️ i18ntk-manage.js - Main Management Interface

The central hub for all i18n operations with both interactive and command-line interfaces. **Designed specifically for large and complex projects** where managing multiple languages becomes challenging.

**Features:**
- 🌍 **Multi-language UI support** - Interface in your preferred language
- 🖥️ Interactive menu system with language-specific prompts
- 📊 Project status overview with visual indicators
- 🔄 Orchestrates all other scripts seamlessly
- 🚀 Comprehensive workflow execution for large projects
- 🗑️ Advanced report management and cleanup
- 🛡️ **Prevents i18n debug errors** by ensuring translation keys exist
- 🎯 **Clear "NOT TRANSLATED" markers** for immediate visibility
- 📈 **Scalable for enterprise-level projects** with hundreds of translation keys

**Usage:**
```bash
# NPM Scripts (Recommended)
npm run i18ntk              # Interactive mode
npm run i18ntk:init          # Initialize
npm run i18ntk:analyze       # Analyze translations
npm run i18ntk:validate      # Validate translations
npm run i18ntk:usage         # Check usage
npm run i18ntk:complete      # Complete translations
npm run i18ntk:sizing        # Analyze sizing
npm run i18ntk:summary       # Generate summary

# Direct Node.js execution
node i18ntk-manage.js        # Interactive mode
node i18ntk-manage.js --ui-language=de
node i18ntk-manage.js --ui-language=es

# Direct commands
node i18ntk-manage.js --command=status
node i18ntk-manage.js --command=workflow
node i18ntk-manage.js --command=sizing
node i18ntk-manage.js --command=settings
node i18ntk-manage.js --help

# Sizing analysis with options
node i18ntk-manage.js --command=sizing --sizing-threshold=30
node i18ntk-manage.js --command=sizing --sizing-format=json
```

**Interactive Menu (Example in English):**
```
🌐 I18N MANAGEMENT MENU
============================================================
1. 🚀 Initialize new languages
2. 🔍 Analyze translations
3. ✅ Validate translations
4. 📊 Check key usage
5. 🎯 Complete translations (100% coverage)
6. 📏 Analyze sizing
7. 🔄 Run full workflow
8. 📋 Show project status
9. 🗑️  Delete all reports
10. 🌍 Change interface language
11. ⚙️  Settings
12. ❓ Help
0. 🚪 Exit
```

**Interactive Menu (Example in German):**
```
🌐 I18N VERWALTUNGSMENÜ
============================================================
1. 🚀 Neue Sprachen initialisieren
2. 🔍 Übersetzungen analysieren
3. ✅ Übersetzungen validieren
4. 📊 Schlüsselverwendung prüfen
5. 🎯 Übersetzungen vervollständigen (100% Abdeckung)
6. 📏 Größenanalyse
7. 🔄 Vollständigen Workflow ausführen
8. 📋 Projektstatus anzeigen
9. 🗑️  Alle Berichte löschen
10. 🌍 Sprache der Benutzeroberfläche ändern
11. ⚙️  Einstellungen
12. ❓ Hilfe
0. 🚪 Beenden
```

### 🚀 i18ntk-init.js - Language Initialization

Initializes new language files with automatic directory creation and sample content.

**Features:**
- 📁 Creates language directories and files automatically
- 🔄 Preserves existing translations
- 🏷️ Marks missing translations with `NOT_TRANSLATED`
- 🎯 Interactive language selection
- 📝 Generates sample translation files
- 🛡️ Safe operation (won't overwrite existing translations)

**Usage:**
```bash
# NPM Script (Recommended)
npm run i18ntk:init

# Direct execution - Interactive mode
node i18ntk-init.js

# Specific languages
node i18ntk-init.js --languages=de,fr,es

# Custom source directory
node i18ntk-init.js --source-dir=./locales
```

### 📊 i18ntk-analyze.js - Translation Analysis

Comprehensive analysis of translation completeness with detailed reporting.

**Features:**
- 📈 Translation completeness statistics
- 🏗️ Structural consistency checking
- 🐛 Issue identification (missing, empty, partial translations)
- 📄 Detailed per-file analysis
- 📊 Visual progress indicators
- 📝 Generates comprehensive reports

**Usage:**
```bash
# NPM Script (Recommended)
npm run i18ntk:analyze

# Direct execution - Analyze all languages
node i18ntk-analyze.js

# Specific language
node i18ntk-analyze.js --language=de

# Generate detailed reports
node i18ntk-analyze.js --output-reports
```

**Sample Output:**
```
🔄 Analyzing de...
   📄 Files: 1/1
   🔤 Keys: 0/14 (0%)
   ⚠️  Missing: 14
   🐛 Issues: 14
   📄 Report saved: ./i18n-reports/analysis-de.txt
```

### ✅ i18ntk-validate.js - Translation Validation

Validates translation files for syntax, structure, and completeness.

**Features:**
- 🔍 JSON syntax validation
- 🏗️ Structural consistency checking
- ✅ Translation completeness validation
- ⚠️ Error and warning reporting
- 🎯 Strict mode for enhanced validation
- 📊 Detailed validation statistics

**Usage:**
```bash
# NPM Script (Recommended)
npm run i18ntk:validate

# Direct execution - Validate all languages
node i18ntk-validate.js

# Specific language
node i18ntk-validate.js --language=de

# Strict mode
node i18ntk-validate.js --strict
```

### 🔍 i18ntk-usage.js - Usage Analysis

Analyzes source code to find unused translation keys and missing translations.

**Features:**
- 🔍 Scans source code for translation key usage
- 🗑️ Identifies unused translation keys
- ⚠️ Finds missing translations referenced in code
- 🔄 Detects dynamic translation patterns
- 📊 Generates detailed usage reports
- 🎯 Supports multiple i18n patterns

**Supported Translation Patterns:**
- `t('key')` - Standard i18next
- `$t('key')` - Vue i18n
- `i18n.t('key')` - Direct i18next
- `translate('key')` - Custom functions
- `formatMessage({ id: 'key' })` - React Intl

**Usage:**
```bash
# NPM Script (Recommended)
npm run i18ntk:usage

# Direct execution - Analyze usage
node i18ntk-usage.js

# Custom source directory
node i18ntk-usage.js --source-dir=./src

# Generate detailed report
node i18ntk-usage.js --output-report
```

### 🎯 i18ntk-complete.js - Translation Completion

Helps achieve 100% translation coverage with guided completion.

**Features:**
- 🎯 Identifies incomplete translations
- 📝 Guided translation completion
- 🔄 Batch processing capabilities
- ✅ Validation during completion
- 📊 Progress tracking

**Usage:**
```bash
# NPM Script (Recommended)
npm run i18ntk:complete

# Direct execution
node i18ntk-complete.js

# Dry run mode
node i18ntk-complete.js --dry-run

# Specific languages
node i18ntk-complete.js --languages=de,fr
```

### 📏 i18ntk-sizing.js - Translation Sizing Analysis

Analyzes translation file sizes and their impact on UI layouts and performance.

**Features:**
- 📊 File size analysis and comparison
- 📏 Character count statistics per language
- 🎯 Key-level size variation detection
- 🖥️ UI layout impact assessment
- 📈 Size optimization recommendations
- 📄 Detailed sizing reports with visual indicators
- ⚡ Performance impact analysis

**Usage:**
```bash
# NPM Script (Recommended)
npm run i18ntk:sizing

# Direct execution - Basic sizing analysis
node i18ntk-sizing.js

# With custom threshold for size variations
node i18ntk-sizing.js --threshold=50

# Generate detailed JSON report
node i18ntk-sizing.js --format=json

# Analyze specific languages
node i18ntk-sizing.js --languages=de,fr,es
```

**Sample Output:**
```
📏 TRANSLATION SIZING ANALYSIS
============================================================
📁 Source directory: ./locales
🔤 Source language: en
📊 Languages analyzed: 4

📊 FILE SIZE SUMMARY:
============================================================
📄 common.json:
   🇺🇸 en: 1.2 KB (baseline)
   🇩🇪 de: 1.4 KB (+16.7%)
   🇪🇸 es: 1.3 KB (+8.3%)
   🇫🇷 fr: 1.5 KB (+25.0%)

⚠️  SIZE VARIATIONS DETECTED:
============================================================
🔤 Key 'navigation.contact':
   🇫🇷 fr: 'Contactez-nous' (+100% vs 'Contact')
   
🎯 RECOMMENDATIONS:
============================================================
• 3 keys have significant size variations (>50%)
• Consider shorter alternatives for French translations
• Review UI layout for keys with large variations
```

### 📋 i18ntk-summary.js - Summary Reports

Generates comprehensive project-wide translation summaries.

**Features:**
- 📊 Project-wide statistics
- 🌐 Multi-language overview
- 📈 Progress tracking
- 🎯 Priority recommendations
- 📄 Exportable reports

**Usage:**
```bash
# NPM Script (Recommended)
npm run i18ntk:summary

# Direct execution
node i18ntk-summary.js

# Generate detailed report
node i18ntk-summary.js --detailed

# Export to specific format
node i18ntk-summary.js --format=json
```

### 🔧 Debug Tools - System Analysis & Troubleshooting

Comprehensive debugging system for i18n projects with advanced diagnostics and issue detection.

**Features:**
- 🔍 **Full System Debug**: Complete project health check and analysis
- ⚙️ **Configuration Debug**: Validate user-config.json and package.json settings
- 🌐 **Translation Debug**: Deep analysis of translation files and structure
- ⚡ **Performance Debug**: Identify bottlenecks and optimization opportunities
- 📊 **Dynamic Path Support**: Respects custom input/output paths from configuration
- 📄 **Detailed Reports**: Comprehensive debug reports with actionable recommendations
- 🛠️ **Issue Detection**: Advanced detection of configuration and structural problems

**Usage:**
```bash
# NPM Script (Recommended)
npm run i18ntk:debug

# Direct execution - Interactive debug menu
node i18ntk-manage.js --command=debug

# Direct debugger execution
node dev/debug/debugger.js

# Binary command (if installed)
i18ntk-debug
```

**Interactive Debug Menu:**
```
🔧 DEBUG TOOLS
============================================================
1. 🔍 Full System Debug
2. ⚙️  Configuration Debug
3. 🌐 Translation Debug
4. ⚡ Performance Debug
0. 🔙 Back to main menu

Select debug type (0-4):
```

**Debug Types:**

#### 🔍 Full System Debug
Comprehensive analysis of the entire i18n project:
- ✅ Configuration file validation
- 📁 Directory structure verification
- 🌐 Translation file integrity checks
- 🔗 Dependency validation
- 📊 Performance analysis
- 🛠️ Issue identification and recommendations

#### ⚙️ Configuration Debug
Validates project configuration:
- 📄 `user-config.json` structure and paths
- 📦 `package.json` dependencies and scripts
- 🔗 File path validation
- ⚙️ Settings consistency checks

#### 🌐 Translation Debug
Deep analysis of translation files:
- 📁 Translation file structure
- 🔤 Key consistency across languages
- 🌍 Missing translation detection
- 📊 Translation completeness analysis

#### ⚡ Performance Debug
Identifies performance issues:
- 📏 File size analysis
- 🔍 Unused key detection
- ⚡ Loading performance assessment
- 🎯 Optimization recommendations

**Sample Debug Report:**
```
🔧 I18N TOOLKIT DEBUG REPORT
============================================================
Generated: 2024-01-15 14:30:25
Project Root: /path/to/your/project
Debug Type: Full System Debug

📊 SUMMARY
============================================================
✅ Issues Found: 2
⚠️  Warnings: 1

🔍 ISSUES
============================================================
❌ Missing user-config.json file
❌ Translation key 'header.title' missing in de.json

⚠️  WARNINGS
============================================================
⚠️  Large translation file detected: common.json (>50KB)

🎯 RECOMMENDATIONS
============================================================
• Create user-config.json with proper directory paths
• Add missing translation keys to maintain consistency
• Consider splitting large translation files for better performance

📄 Report saved to: debug-report.txt
```

### ⚙️ Settings Management

Comprehensive configuration management for all i18n toolkit settings and preferences.

**Features:**
- 🔧 **Interactive Configuration** - Guided setup through command-line interface
- 🌍 **Multi-language Support** - Settings interface in your preferred language
- 💾 **Persistent Settings** - Automatically saves preferences for future use
- 🔄 **Flexible Configuration** - Multiple ways to configure the toolkit
- 🛡️ **Backup & Restore** - Automatic backups before major changes
- 🔧 **Advanced Settings** - Fine-tune performance and behavior options

**Usage:**
```bash
# Access settings through interactive menu
node i18ntk-manage.js
# Then select: 11. ⚙️ Settings

# Or use direct command
node i18ntk-manage.js --command=settings
```

**Configuration Methods:**
1. **Interactive Menu** - User-friendly guided configuration
2. **Command Line Arguments** - Direct parameter passing
3. **Environment Variables** - System-level configuration
4. **Configuration File** - Project-specific settings file

**Settings Categories:**
- **🌍 UI Language & Preferences** - Interface language and display options
- **📁 Directory Configuration** - Source and output directory paths
- **🔤 Language Settings** - Source language and target languages
- **📊 Analysis Options** - Translation analysis and reporting settings
- **🔄 Behavior Settings** - Auto-save, notifications, and validation preferences
- **⚙️ Advanced Options** - Performance tuning and enterprise features

## 🔐 Admin Authentication

The toolkit includes an optional admin authentication system to protect sensitive operations with PIN-based security.

### Admin Authentication Features
- **🔒 PIN Protection**: 4-digit PIN authentication for administrative operations
- **🛡️ Secure Storage**: Encrypted PIN storage with salt-based hashing
- **👁️ Hidden Input**: PIN input is hidden for enhanced security
- **✅ Confirmation Prompts**: Double confirmation for destructive operations
- **📝 Audit Trail**: Security event logging for all admin operations
- **🔄 Optional**: Can be enabled/disabled as needed
- **🔧 CLI & Interactive**: Works in both command-line and interactive modes

### Protected Operations
The following operations require admin authentication when enabled:
- **Project Initialization** (`init`) - Setting up new i18n projects
- **Project Deletion** (`delete`) - Removing translation files and reports
- **Workflow Management** (`workflow`) - Running automated workflows

### Admin Commands

#### Setting Up Admin Protection
```bash
# Enable admin PIN protection
node i18ntk-validate.js --setup-admin
node i18ntk-manage.js --setup-admin

# Or through interactive menu
node i18ntk-manage.js
# Then use admin commands in the interface
```

#### Managing Admin Authentication
```bash
# Check admin protection status
node i18ntk-validate.js --admin-status
node i18ntk-manage.js --admin-status

# Disable admin protection
node i18ntk-validate.js --disable-admin
node i18ntk-manage.js --disable-admin
```

### Admin Setup Process

1. **Enable Protection**:
   ```bash
   node i18ntk-manage.js --setup-admin
   ```

2. **Set 4-Digit PIN**:
   ```
   🔐 Setting up Admin PIN Protection
   This will require a 4-digit PIN for administrative operations.
   
   Do you want to enable admin PIN protection? (y/N): y
   Enter a 4-digit PIN: ****
   Confirm PIN: ****
   
   ✅ Admin PIN protection enabled successfully!
   ⚠️  Remember your PIN - it cannot be recovered if lost.
   ```

3. **Authentication Required**:
   ```
   🔐 Admin authentication required for: project initialization
   Enter admin PIN: ****
   ✅ Authentication successful!
   ```

### Security Features

- **Encrypted Storage**: PINs are stored using PBKDF2 with 100,000 iterations
- **Salt Protection**: Each PIN uses a unique salt for additional security
- **Lockout Protection**: Failed attempts are tracked and logged
- **Session Management**: Temporary authentication sessions for convenience
- **Audit Logging**: All authentication events are logged for security auditing

### Admin Status Display

```bash
node i18ntk-manage.js --admin-status
```

**Output when enabled**:
```
🔐 Admin Protection Status
========================
Status: ENABLED
Protection: 4-digit PIN required for admin operations
Protected Operations: init, delete, workflow
```

**Output when disabled**:
```
🔐 Admin Protection Status
========================
Status: DISABLED
Protection: No authentication required
Risk: Administrative operations are unprotected
```

### Best Practices

- **Enable for Production**: Always enable admin protection in production environments
- **Secure PIN**: Choose a PIN that's not easily guessable
- **Regular Review**: Periodically review admin authentication logs
- **Team Access**: Share PIN securely with authorized team members only
- **Backup Strategy**: Document PIN recovery procedures for your team

### Integration with Existing Workflows

Admin authentication integrates seamlessly with existing workflows:
- **Backward Compatible**: Existing scripts work unchanged when admin auth is disabled
- **Optional Protection**: Enable only for operations that need protection
- **Team Friendly**: Multiple team members can use the same PIN
- **CI/CD Compatible**: Can be disabled for automated environments

## ⚙️ Configuration Management

The toolkit uses a comprehensive configuration system that provides default values, examples, and helpful hints to guide users through setup.

### Configuration Features
- **Smart Defaults**: Pre-configured with recommended values
- **Inline Examples**: Clear examples for each setting
- **Validation**: Automatic validation with helpful error messages
- **Backup System**: Automatic configuration backups
- **Schema-based**: Type-safe configuration with validation

### Configuration Methods

1. **Configuration File** (Recommended):
   ```bash
   # Create or edit config.json
   {
     "language": "en",
     "sourceDir": "./locales",
     "notifications": {
       "enabled": true,
       "types": ["success", "error", "warning"]
     }
   }
   ```

2. **Command Line Arguments**:
   ```bash
   node 00-manage-i18n.js --language=de --sourceDir=./my-locales
   ```

3. **Environment Variables**:
   ```bash
   export I18N_LANGUAGE=fr
   export I18N_SOURCE_DIR=./translations
   ```

### Key Configuration Categories

- **Language Settings**: UI language and locale preferences
- **Directory Configuration**: Source and output directories
- **Processing Options**: File handling and translation patterns
- **Notification Settings**: Alert preferences and types
- **Advanced Performance**: Memory limits and processing tuning

## 🔔 Notification System

The toolkit includes a comprehensive notification system to keep you informed about translation operations, errors, and progress.

### How Notifications Work

The notification system operates on multiple levels:

1. **Console Messages** (Default): Colored text output in your terminal
   ```bash
   ✅ SUCCESS: Translation analysis completed
   ⚠️  WARNING: 5 missing translations found
   ❌ ERROR: Invalid JSON syntax in de.json
   ℹ️  INFO: Processing 150 translation keys
   ```

2. **Desktop Notifications** (Optional): Native OS notifications
   - Windows: Toast notifications
   - macOS: Notification Center alerts
   - Linux: Desktop environment notifications

3. **Sound Alerts** (Optional): System sounds for important events
   - Success sound for completed operations
   - Error sound for critical issues
   - Warning sound for attention-needed items

4. **Log Files** (Automatic): Detailed logs saved to files
   - `./logs/i18n-toolkit.log` - General operations
   - `./logs/errors.log` - Error details
   - `./logs/audit.log` - Change tracking

### Notification Types

- **Success** 🟢: Operations completed successfully
  - Translation analysis finished
  - Files validated without errors
  - Reports generated successfully

- **Error** 🔴: Critical issues requiring attention
  - JSON syntax errors
  - Missing files or directories
  - Permission issues

- **Warning** 🟡: Important but non-critical issues
  - Missing translations
  - Unused translation keys
  - File size concerns

- **Info** 🔵: General information and progress
  - Processing status updates
  - Configuration changes
  - Statistics and summaries

### Configuring Notifications

```javascript
// Example notification configurations

// Minimal notifications (errors only)
{
  "notifications": {
    "enabled": true,
    "types": ["error"],
    "console": true,
    "desktop": false,
    "sound": false
  }
}

// Full notifications (everything)
{
  "notifications": {
    "enabled": true,
    "types": ["success", "error", "warning", "info"],
    "console": true,
    "desktop": true,
    "sound": true,
    "logLevel": "debug"
  }
}

// Silent mode (logs only)
{
  "notifications": {
    "enabled": false,
    "console": false,
    "desktop": false,
    "sound": false
  }
}
```

### Command Line Notification Control

```bash
# Disable all notifications for this run
node 00-manage-i18n.js --silent

# Enable desktop notifications
node 00-manage-i18n.js --desktop-notifications

# Set specific log level
node 00-manage-i18n.js --log-level=debug

# Enable sound notifications
node 00-manage-i18n.js --sound-notifications
```

## ⚙️ Configuration

### 🎯 Enhanced Default Configuration

All scripts use consistent default configuration optimized for large-scale projects with comprehensive settings and examples:

```javascript
const DEFAULT_CONFIG = {
  // Basic Configuration
  sourceDir: './locales',                    // I18n files location
  sourceLanguage: 'en',                      // Source language
  notTranslatedMarker: 'NOT_TRANSLATED', // Marker for missing translations
  defaultLanguages: ['de', 'es', 'fr', 'ru'], // Default target languages
  outputDir: './i18n-reports',               // Reports output directory
  excludeFiles: ['.DS_Store', 'Thumbs.db'],  // Files to ignore
  strictMode: false,                         // Strict validation mode
  
  // Multi-language UI support
  uiLanguage: 'auto',                        // UI language (auto-detect or specific)
  supportedUILanguages: ['en', 'de', 'es', 'fr', 'ru', 'ja', 'zh'],
  reportLanguage: 'auto',                    // Report generation language
  
  // File Size and Limits
  maxFileSize: '10MB',                       // Maximum individual file size
  maxTotalSize: '100MB',                     // Maximum total project size
  
  // Report Generation Settings
  reports: {
    enabled: true,                           // Enable report generation
    format: 'txt',                          // Options: 'txt', 'json', 'html'
    includeStats: true,                     // Include detailed statistics
    autoOpen: false,                        // Auto-open reports after generation
    compression: false                      // Compress large reports
  },
  
  // UI Preferences
  ui: {
    theme: 'auto',                          // Options: 'light', 'dark', 'auto'
    colorOutput: true,                      // Colored console output
    compactMode: false,                     // Compact display mode
    showProgress: true,                     // Show progress indicators
    animations: true                        // Enable UI animations
  },
  
  // Behavior Settings
  behavior: {
    autoSave: true,                         // Auto-save changes
    createBackups: true,                    // Create backups before changes
    validateOnSave: true,                   // Auto-validate after changes
    promptBeforeOverwrite: true             // Confirm before overwriting
  },
  
  // Notification Settings - How the toolkit communicates with you
   notifications: {
     enabled: true,                          // Master switch for all notifications
     types: ['success', 'error', 'warning'], // Which types to show: success, error, warning, info
     sound: false,                           // Play system sounds for notifications
     desktop: false,                         // Show OS desktop notifications (Windows/macOS/Linux)
     console: true,                          // Show colored console messages
     logLevel: 'info'                        // Logging detail: 'error', 'warn', 'info', 'debug'
   },
  
  // Date and Time Formatting
  dateFormat: 'DD/MM/YYYY',                 // Example: 'MM/DD/YYYY', 'YYYY-MM-DD'
  timeFormat: '24h',                        // Options: '12h', '24h'
  timezone: 'auto',                         // Auto-detect or specific timezone
  
  // Processing Settings
  processing: {
    includeExtensions: ['.js', '.jsx', '.ts', '.tsx', '.vue'],
    excludeDirs: ['node_modules', 'coverage', 'dist', 'build'],
    translationPatterns: ['t(', '$t(', 'i18n.t(', 'translate('],
    caseSensitive: true,                    // Case-sensitive key matching
    trimWhitespace: true                    // Trim whitespace from translations
  },
  
  // Sizing analysis configuration
  sizingThreshold: 50,                       // Threshold for size variation warnings (%)
  sizingFormat: 'table',                     // Output format: 'table' or 'json'
  enableSizingReports: true,                 // Generate detailed sizing reports
  
  // Large project optimizations
  batchSize: 100,                            // Keys processed per batch
  enableProgressBars: true,                  // Visual progress indicators
  maxConcurrentFiles: 10,                    // Concurrent file processing
  
  // Advanced Performance Settings
  advanced: {
    memoryLimit: '512MB',                   // Memory limit for large projects
    timeout: 30000,                         // Operation timeout (milliseconds)
    cacheEnabled: true,                     // Enable result caching
    parallelProcessing: true,               // Enable parallel processing
    optimizeMemory: true                    // Optimize memory usage
  },
  
  // Enterprise features
  enableAuditLog: false,                     // Track all changes
  backupBeforeChanges: true,                 // Create backups
  validateOnSave: true                       // Auto-validate after changes
};
```

### Customization Options

#### 1. Command Line Arguments
```bash
# Basic configuration
node i18ntk-manage.js --source-dir=./locales --source-language=en

# Multi-language UI
node i18ntk-manage.js --ui-language=de --report-language=de

# Sizing analysis options
node i18ntk-manage.js --command=sizing --sizing-threshold=50 --sizing-format=json

# Large project optimizations
node i18ntk-manage.js --batch-size=200 --max-concurrent=20

# Enterprise features
node i18ntk-manage.js --enable-audit-log --backup-before-changes
```

#### 2. Environment Variables
```bash
# Basic settings
export I18N_SOURCE_DIR=./locales
export I18N_SOURCE_LANGUAGE=en
export I18N_DEFAULT_LANGUAGES=de,es,fr,ru,ja,zh

# UI language settings
export I18N_UI_LANGUAGE=de
export I18N_REPORT_LANGUAGE=de

# Performance settings
export I18N_BATCH_SIZE=200
export I18N_MAX_CONCURRENT_FILES=20

# Enterprise settings
export I18N_ENABLE_AUDIT_LOG=true
export I18N_BACKUP_BEFORE_CHANGES=true
```

#### 3. Configuration File (Recommended for Large Projects)
Create `i18n.config.js` in your project root:
```javascript
module.exports = {
  // Basic configuration
  sourceDir: './locales',
  sourceLanguage: 'en',
  defaultLanguages: ['de', 'es', 'fr', 'ru', 'ja', 'zh', 'pt', 'it'],
  outputDir: './reports/i18n',
  strictMode: true,
  
  // Multi-language UI
  uiLanguage: 'de',              // German interface
  reportLanguage: 'de',          // German reports
  
  // Large project optimizations
  batchSize: 200,                // Process 200 keys at once
  maxConcurrentFiles: 20,        // Process 20 files simultaneously
  enableProgressBars: true,      // Show progress for long operations
  enableColorOutput: true,       // Colored console output
  
  // Enterprise features
  enableAuditLog: true,          // Track all translation changes
  backupBeforeChanges: true,     // Create backups before modifications
  validateOnSave: true,          // Auto-validate after changes
  
  // Custom patterns for large codebases
  translationPatterns: [
    /t\(['"](.*?)['"]\)/g,       // Standard i18next
    /\$t\(['"](.*?)['"]\)/g,     // Vue i18n
    /i18n\.t\(['"](.*?)['"]\)/g, // Direct i18next
    /translate\(['"](.*?)['"]\)/g, // Custom function
    /formatMessage\(\{\s*id:\s*['"](.*?)['"]\s*\}\)/g // React Intl
  ],
  
  // Exclude patterns for large projects
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/*.test.js',
    '**/*.spec.js',
    '**/coverage/**'
  ]
};
```

## 📊 Workflow Guide

### 🚀 Initial Setup

1. **Install dependencies:**
   ```bash
   npm install i18next@^25.3.2 react-i18next@^15.6.0
   ```

2. **Initialize your project:**
   ```bash
   node i18ntk-manage.js --command=init
   ```

3. **Validate the setup:**
   ```bash
   node i18ntk-manage.js --command=validate
   ```

### 🔄 Regular Maintenance

1. **Check project status:**
   ```bash
   node i18ntk-manage.js --command=status
   ```

2. **Analyze translations:**
   ```bash
   node i18ntk-manage.js --command=analyze
   ```

3. **Analyze sizing impact:**
   ```bash
   node i18ntk-manage.js --command=sizing
   ```

4. **Run full workflow:**
   ```bash
   node i18ntk-manage.js --command=workflow
   ```

### 🎯 Development Workflow

1. **Add new translation keys** to your source language files
2. **Run analysis** to identify missing translations
3. **Complete translations** for target languages
4. **Analyze sizing impact** to ensure UI compatibility
5. **Validate** all translation files
6. **Check usage** to find unused keys
7. **Generate reports** for team review

## 📈 Visual Reports

The system generates comprehensive, easy-to-read reports **in your preferred language** for better understanding and team collaboration:

### 🌍 Multi-Language Report Generation

Reports are automatically generated in the user's selected language, making it easier for international teams to understand translation status and issues.

**Supported Report Languages:**
- 🇺🇸 English (en)
- 🇩🇪 German (de) 
- 🇪🇸 Spanish (es)
- 🇫🇷 French (fr)
- 🇷🇺 Russian (ru)
- 🇯🇵 Japanese (ja)
- 🇨🇳 Chinese (zh)

### 📊 Analysis Report Example (English)

```
TRANSLATION ANALYSIS REPORT FOR DE
Generated: 2025-07-24T02:39:44.763Z
Status: 0/14 translated (0%)
Files analyzed: 1/1
Keys needing translation: 14

FILE BREAKDOWN:
==================================================
```

### 📊 Analysis Report Example (German)

```
ÜBERSETZUNGSANALYSE-BERICHT FÜR DE
Erstellt: 2025-07-24T02:39:44.763Z
Status: 0/14 übersetzt (0%)
Analysierte Dateien: 1/1
Schlüssel, die Übersetzung benötigen: 14

DATEI-AUFSCHLÜSSELUNG:
==================================================
```

### 📊 Analysis Report Example (Spanish)

```
INFORME DE ANÁLISIS DE TRADUCCIÓN PARA DE
Generado: 2025-07-24T02:39:44.763Z
Estado: 0/14 traducido (0%)
Archivos analizados: 1/1
Claves que necesitan traducción: 14

DESGLOSE DE ARCHIVOS:
==================================================

📄 common.json
   📊 Translation: 0/14 (0%)
   🏗️  Structure: Consistent
   ⚠️  Issues: 14
      not translated: 14

KEYS TO TRANSLATE:
==================================================

Key: common.welcome
English: "Welcome"
de: [NEEDS TRANSLATION]

Key: common.hello
English: "Hello"
de: [NEEDS TRANSLATION]
```

### 📋 Console Output Features

- 🎨 **Color-coded status indicators**
- 📊 **Progress bars and percentages**
- 🔍 **Detailed issue breakdowns**
- 📈 **Visual completion statistics**
- 🎯 **Actionable recommendations**

### 📄 Report Types

1. **Analysis Reports** (`analysis-{lang}.txt`)
   - Translation completeness
   - Missing key details
   - File-by-file breakdown

2. **Validation Reports** (`validation-{lang}.txt`)
   - Syntax errors
   - Structural issues
   - Consistency problems

3. **Usage Reports** (`usage-analysis.txt`)
   - Unused translation keys
   - Missing translations in code
   - Dynamic key patterns

4. **Summary Reports** (`project-summary.txt`)
   - Project-wide statistics
   - Language priority recommendations
   - Overall health metrics

## 🎯 Best Practices

### 📁 File Organization for Large Projects

```
locales/
├── en/                    # Source language
│   ├── common.json        # Common UI elements (buttons, labels)
│   ├── navigation.json    # Navigation items and menus
│   ├── forms.json         # Form labels and validation messages
│   ├── errors.json        # Error messages and alerts
│   ├── dashboard.json     # Dashboard-specific content
│   ├── auth.json          # Authentication flows
│   ├── admin.json         # Admin panel content
│   └── modules/           # Feature-specific translations
│       ├── crm.json       # CRM module
│       ├── reports.json   # Reports module
│       └── settings.json  # Settings module
├── de/                    # Target languages (same structure)
│   ├── common.json
│   ├── navigation.json
│   ├── forms.json
│   ├── errors.json
│   ├── dashboard.json
│   ├── auth.json
│   ├── admin.json
│   └── modules/
│       ├── crm.json
│       ├── reports.json
│       └── settings.json
└── ...
```

### 🔑 Key Naming Conventions for Scale

```json
{
  "common.welcome": "Welcome",
  "common.buttons.save": "Save",
  "common.buttons.cancel": "Cancel",
  "navigation.main.home": "Home",
  "navigation.main.dashboard": "Dashboard",
  "forms.validation.required": "This field is required",
  "forms.validation.email.invalid": "Please enter a valid email",
  "errors.network.timeout": "Network timeout occurred",
  "errors.auth.unauthorized": "You are not authorized",
  "modules.crm.contacts.title": "Contact Management",
  "modules.reports.analytics.title": "Analytics Dashboard"
}
```

### 🛡️ Translation Safety for Large Teams

- ✅ **Always use the `NOT_TRANSLATED` marker** - prevents runtime errors
- ✅ **Run validation before deployment** - catches issues early
- ✅ **Keep translation keys descriptive** - helps team understanding
- ✅ **Use consistent namespacing** - organizes large key sets
- ✅ **Set up UI language preferences** - improves team productivity
- ✅ **Generate reports in team's language** - better communication
- ✅ **Use audit logs for large teams** - track who changed what
- ✅ **Create backups before bulk changes** - safety net for large updates
- ❌ **Don't delete keys without checking usage** - breaks functionality
- ❌ **Don't modify key names without updating code** - causes missing translations
- ❌ **Don't skip validation in CI/CD** - prevents broken deployments

### 🌍 Multi-Language Team Collaboration

#### For International Teams:
```bash
# German team members
node i18ntk-manage.js --ui-language=de

# Spanish team members  
node i18ntk-manage.js --ui-language=es

# Generate reports in team's language
node i18ntk-analyze.js --report-language=de
```

#### Team Workflow:
1. **Set team language preferences** in `i18n.config.js`
2. **Use consistent UI language** across team members
3. **Generate reports in native language** for better understanding
4. **Enable audit logging** to track changes by team members
5. **Set up automated validation** in your CI/CD pipeline

### 🔄 Automation Integration

#### GitHub Actions Example

```yaml
name: I18n Validation
on: [push, pull_request]

jobs:
  validate-translations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: node i18ntk-validate.js --strict
      - run: node i18ntk-usage.js
```

## 🔧 Troubleshooting

### Common Issues

#### ❌ "Source directory not found"
```bash
# Check if the directory exists
ls -la locales/

# Initialize if missing
node i18ntk-init.js
```

#### ❌ "JSON syntax error"
```bash
# Validate JSON files
node i18ntk-validate.js --strict

# Check specific file
node -e "console.log(JSON.parse(require('fs').readFileSync('locales/de/common.json', 'utf8')))"
```

#### ❌ "No translation keys found"
```bash
# Check source language files
node i18ntk-analyze.js --language=en

# Verify file structure
find locales/ -name "*.json" -exec echo "=== {} ===" \; -exec cat {} \;
```

#### ❌ "Module not found" errors
```bash
# Install missing dependencies
npm install i18next@25.3.2 react-i18next
```

#### ❌ Translation keys not found
```bash
# Run usage analysis
node i18ntk-usage.js

# Check for missing keys
node i18ntk-analyze.js
```

#### ❌ Performance issues with large projects (1000+ keys)
```bash
# Use batch processing for better performance
node i18ntk-manage.js --batch-size=100

# Enable progress indicators
node i18ntk-manage.js --show-progress

# Limit concurrent file processing
node i18ntk-manage.js --max-concurrent=5
```

#### ❌ Multi-language UI issues
```bash
# Reset UI language preference
node i18ntk-manage.js --reset-ui-language

# Check available UI languages
node i18ntk-manage.js --list-ui-languages

# Force specific UI language
node i18ntk-manage.js --ui-language=en --force
```

#### ❌ Report generation in wrong language
```bash
# Set default report language
node i18ntk-analyze.js --report-language=de --set-default

# Generate report in specific language
node i18ntk-analyze.js --report-language=es
```

#### ❌ Large team collaboration issues
```bash
# Enable audit logging
node i18ntk-manage.js --enable-audit-log

# Check who made recent changes
node i18ntk-manage.js --show-audit-log

# Restore from backup
node i18ntk-manage.js --restore-backup=2025-01-15
```

### Debug Mode

Run any script with debug information:
```bash
DEBUG=true node i18ntk-manage.js
```

### Getting Help

```bash
# Show help for any script
node i18ntk-manage.js --help
node i18ntk-analyze.js --help
```

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with multiple project types
5. Submit a pull request

### Testing

```bash
# Test with sample project
mkdir test-project && cd test-project
npm init -y
npm install i18next@^25.3.2

# Copy scripts and test
cp -r ../scripts .
node i18ntk-manage.js --command=init
```

### Feature Requests

We welcome feature requests! Please open an issue with:
- Clear description of the feature
- Use case examples
- Expected behavior

---

## 🌐 Repository & Installation

### 📦 Installation Methods

#### Method 1: NPM Package (Recommended)
```bash
# Install globally for use across projects
npm install -g i18n-management-toolkit

# Or install locally in your project
npm install --save-dev i18n-management-toolkit

# Start using immediately
i18n-toolkit init
```

#### Method 2: Direct Download
```bash
# Download latest release
wget https://github.com/your-username/i18n-management-toolkit/archive/main.zip

# Extract and copy to your project
unzip main.zip
cp -r i18n-management-toolkit-main/*.js ./

# Install dependencies
npm install i18next@25.3.2 react-i18next

# Start using
node i18ntk-manage.js
```

#### Method 3: Git Clone
```bash
# Clone the repository
git clone https://github.com/your-username/i18n-management-toolkit.git

# Navigate to your project
cd your-project

# Copy the toolkit
cp -r ../i18n-management-toolkit/*.js .

# Install dependencies
npm install i18next@25.3.2 react-i18next

# Start using the toolkit
node i18ntk-manage.js
```

### 🚀 Quick Start Guide

1. **Initialize your project:**
   ```bash
   i18n-toolkit init
   # or
   node i18ntk-manage.js --command=init
   ```

2. **Configure settings:**
   ```bash
   i18n-toolkit settings
   # Follow the interactive setup wizard
   ```

3. **Analyze your translations:**
   ```bash
   i18n-toolkit analyze
   # Generates comprehensive reports
   ```

4. **Validate everything:**
   ```bash
   i18n-toolkit validate
   # Ensures all translations are correct
   ```

### 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

#### Development Setup
1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/vladnoskv/i18n-management-toolkit.git
   cd i18n-management-toolkit
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Create** a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
5. **Make your changes** and test thoroughly
6. **Submit** a pull request with detailed description

#### Testing Your Changes
```bash
# Test with sample project
mkdir test-project && cd test-project
npm init -y
npm install i18next@25.3.2 react-i18next

# Copy your modified scripts
cp -r ../*.js .

# Test all functionality
node i18ntk-manage.js --command=init
node test-complete-system.js
```

#### Contribution Guidelines
- **Code Style:** Follow existing patterns and conventions
- **Documentation:** Update README.md for new features
- **Testing:** Ensure all tests pass and add new tests for features
- **Commit Messages:** Use clear, descriptive commit messages
- **Pull Requests:** Include detailed description and testing steps

### 🐛 Issues & Support

- **🐛 Bug Reports:** [GitHub Issues](https://github.com/your-username/i18n-management-toolkit/issues)
- **💡 Feature Requests:** [GitHub Discussions](https://github.com/your-username/i18n-management-toolkit/discussions)
- **📚 Documentation:** [GitHub Wiki](https://github.com/your-username/i18n-management-toolkit/wiki)
- **💬 Community Chat:** [Discord Server](https://discord.gg/your-server)
- **📧 Email Support:** support@your-domain.com

### 🏷️ Versioning

We use [Semantic Versioning](https://semver.org/) for version management:
- **MAJOR.MINOR.PATCH** (e.g., 2.1.0)
- **Major:** Breaking changes
- **Minor:** New features (backward compatible)
- **Patch:** Bug fixes (backward compatible)

### 📋 Roadmap

#### Upcoming Features
- 🔄 **Real-time collaboration** for team translation workflows
- 🤖 **AI-powered translation suggestions** with context awareness
- 🌐 **Web-based dashboard** for project management
- 📱 **Mobile app** for on-the-go translation management
- 🔌 **IDE plugins** for VS Code, WebStorm, and more
- 📊 **Advanced analytics** and translation insights
- 🔗 **Integration APIs** for popular translation services

#### Version History
- **v2.0.0** - Enhanced configuration system, AI agent support
- **v1.5.0** - Multi-language UI, comprehensive reporting
- **v1.0.0** - Initial release with core functionality

---

## 📄 License

MIT License - feel free to use in your projects!

## 🙏 Acknowledgments

- **Custom Helper Plugin** designed for large, complex multi-language projects
- **Prevents i18n debug errors** by providing `NOT_TRANSLATED` markers
- **Built for i18next ^25.3.2 compatibility** with modern React applications
- **Multi-language UI support** for international development teams
- **Enterprise-ready features** including audit logs, backups, and batch processing
- **Visual reports in native languages** for better team collaboration
- **Community-driven improvements** and open-source contributions
- **Designed for developer productivity** and translation management efficiency

### Special Thanks
- **i18next team** for the excellent internationalization framework
- **React i18next team** for seamless React integration
- **Open source community** for feedback and contributions
- **International development teams** who inspired multi-language UI features

---

**Happy translating! 🌍✨**

*Transform your translation workflow with this powerful, multi-language toolkit designed for modern development teams.*