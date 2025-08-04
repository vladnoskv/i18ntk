# I18N Management Toolkit Documentation Index

**Version:** 1.4.1  
**Last Updated:** 04/08/2025  
**Maintainer:** Vladimir Noskov  

## 📚 Documentation Overview

This documentation index provides comprehensive guidance for the I18N Management Toolkit, a powerful internationalization management system for JavaScript/TypeScript projects.

## 🗂️ Documentation Structure

### 📖 Core Documentation
- **[Main README](../README.md)** - Project overview, installation, and quick start guide
- **[Installation Guide](./INSTALLATION.md)** - Detailed installation instructions
- **[Script Directory Guide](./docs/SCRIPT_DIRECTORY_GUIDE.md)** - Configure custom directories for each script type (v1.3.0+)
- **[Documentation Overview](./README.md)** - Documentation structure and overview
- **[TODO & Roadmap](./TODO_ROADMAP.md)** - Future development plans and roadmap
- **[Changelog](../CHANGELOG.md)** - Version history and release notes
- **[License](../LICENSE)** - MIT License information

### 🛠️ Development Documentation
- **[Development Rules](./development/DEVELOPMENT_RULES.md)** - Coding standards and best practices
- **[AI Agent Guidelines](./development/AGENTS.md)** - Guidelines for AI-assisted development
- **[Development Overview](./development/DEV_README.md)** - Development environment setup

### 🔧 API & Components
- **[API Documentation](./api/API_REFERENCE.md)** - Complete API reference
- **[Component Documentation](./api/COMPONENTS.md)** - UI components and utilities
- **[Configuration Guide](./api/CONFIGURATION.md)** - Configuration options and settings
- **[NPM Publishing Guide](./api/NPM_PUBLISHING_GUIDE.md)** - Guide for publishing to NPM

### 📊 Reports & Analysis
- **[Analysis Reports](./reports/ANALYSIS_README.md)** - Translation analysis documentation
- **[Validation Reports](./reports/VALIDATION_README.md)** - Translation validation documentation
- **[Usage Reports](./reports/USAGE_README.md)** - Translation key usage documentation
- **[Sizing Reports](./reports/SIZING_README.md)** - Translation sizing analysis documentation
- **[Summary Reports](./reports/SUMMARY_README.md)** - Project summary documentation
- **[Console Mismatch Bug Report v1.5.0](./reports/CONSOLE_MISMATCH_BUG_REPORT_v1.5.0.md)** - Console translation mismatch issues
- **[Translation Bug Report v1.5.0](./reports/TRANSLATION_BUG_REPORT_v1.5.0.md)** - Translation-related bug reports

### 📋 Release Notes
- **[Release Notes v1.3.0](./docs/release-notes/v1.3.0.md)** - Script directory configuration & path resolution fixes
- **[Release Notes v1.0.0](./release-notes/RELEASE_NOTES_v1.0.0.md)** - First stable release notes
- **[Release Notes v1.6.1](./release-notes/RELEASE_NOTES_v1.6.1.md)** - Previous release notes
- **[Release Notes v1.6.0](./release-notes/RELEASE_NOTES_v1.6.0.md)** - Previous release notes

### 🐛 Debug & Troubleshooting
- **[Debug Documentation](./debug/DEBUG_README.md)** - Debug tools and troubleshooting
- **[Debug Tools Overview](./debug/DEBUG_TOOLS.md)** - Available debug utilities

## 🆕 What's New in v1.4.1

### Major Features
- **🔐 Advanced PIN Protection** - Configurable authentication per script with AES-256-GCM encryption
- **🛡️ Enhanced Security** - Session-based authentication with 30-minute timeout
- **🌍 Complete Internationalization** - 8 languages with 100% coverage, including Portuguese
- **🎯 Per-Script Directory Configuration** - Configure custom directories for each script type
- **🔧 Fixed Path Resolution** - Analyzing logic now correctly follows settings

### Key Benefits
- **Flexibility**: Use different directory structures for different script types
- **Reliability**: Path resolution now works correctly with relative paths
- **Backward Compatibility**: Existing configurations continue to work
- **Migration Support**: Easy upgrade path from v1.2.x

## 🚀 Quick Navigation

### For New Users (v1.4.0)
1. Start with the [Main README](../README.md) for project overview
2. Check [Script Directory Guide](./docs/SCRIPT_DIRECTORY_GUIDE.md) for custom directory configuration
3. Follow the [Installation Guide](./INSTALLATION.md) for detailed setup instructions
4. Review [PIN Protection Guide](./docs/PIN_PROTECTION_GUIDE.md) for security features
5. Check [Configuration Guide](./api/CONFIGURATION.md) for project setup
6. Check [API Documentation](./api/API_REFERENCE.md) for available commands

### For Developers
1. Read [Development Rules](./development/DEVELOPMENT_RULES.md) for coding standards
2. Review [AI Agent Guidelines](./development/AGENTS.md) for AI-assisted development
3. Explore [Debug Documentation](./debug/DEBUG_README.md) for troubleshooting
4. Review [Release Notes v1.3.0](./docs/release-notes/v1.3.0.md) for migration guidance

### For Project Managers
1. Check [Summary Reports](./reports/SUMMARY_README.md) for project overview
2. Review [Analysis Reports](./reports/ANALYSIS_README.md) for translation status
3. Monitor [Validation Reports](./reports/VALIDATION_README.md) for quality assurance
4. Review [Release Notes V1.3.0](./docs/release-notes/v1.3.0.md) for latest updates
5. Check [TODO & Roadmap](./TODO_ROADMAP.md) for future development plans

## 📋 Available Commands

### ⚠️ Deployment Warning
**We do not recommend using on a deployment server without testing on a branch first to see the file changes and process.** Always test v1.3.0 configuration changes in a development environment.

### Core Commands (v1.4.0)
```bash
npm run i18ntk                    # Interactive management menu
npm run i18ntk:init              # Initialize i18n structure
npm run i18ntk:init --custom-directories  # Configure custom directories
npm run i18ntk:analyze           # Analyze translation completeness
npm run i18ntk:validate          # Validate translation files
npm run i18ntk:usage             # Check translation key usage
npm run i18ntk:complete          # Complete missing translations
npm run i18ntk:sizing            # Analyze translation sizing
npm run i18ntk:summary           # Generate summary report
npm run i18ntk:autorun           # Run full workflow
```

### Debug Commands
```bash
npm run i18ntk:debug             # Run debug analysis
npm run i18ntk:settings          # Manage settings
```

## 🔄 Version Management

**Current Version:** 1.4.1  
**Release Date:** 04/08/2025  
**Previous Versions:** 1.3.x, 1.2.x, 1.1.x, 1.0.x series 

### Version History
- **1.4.1** - 🔧 **Debug Tools Streamlining & Package Optimization** - Streamlined debug menu, removed development tools from production builds, improved package structure for production deployment
- **1.3.0** - 🎯 **Script Directory Configuration & Path Resolution** - Per-script directory configuration, fixed path resolution, enhanced internationalization support
- **1.2.3** - Documentation & metadata cleanup
- **1.1.5** - Internationalization completion
- **1.0.0** - 🎉 **First Stable Release** - Complete CLI suite with enterprise-grade features
- See [Changelog](../CHANGELOG.md) for complete version history

## 🤝 Contributing

For contribution guidelines, please refer to:
- [Development Rules](./development/DEVELOPMENT_RULES.md)
- [AI Agent Guidelines](./development/AGENTS.md)
- [Main README](../README.md) - Contributing section

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/vladnoskv/i18n-management-toolkit/issues)
- **Documentation:** This index and linked documents
- **Email:** vladnoskv@gmail.com

---

**Note:** This documentation is automatically maintained and updated with each release. Last updated on 27/07/2025 for version 1.0.0.