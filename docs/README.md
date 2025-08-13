# Documentation Overview

**Version:** 1.9.0
**Last Updated:** 2025-08-11
**GitHub Repository:** [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)

Version 1.9.0 delivers smart framework detection, a plugin architecture for custom workflows, enhanced security with PIN authentication and AES encryption, and major performance gains. With over 2,000 downloads, this release is considered fully stable.

## Structure

### Core Guides
- [Installation Guide](./INSTALLATION.md) - Detailed installation instructions
- [PIN Protection Guide](./PIN_PROTECTION_GUIDE.md) - Configure PIN-based security
- [Ultra Performance Guide](./ULTRA_PERFORMANCE_GUIDE.md) - Optimize for maximum speed

### Reference
- [API Reference](./api/API_REFERENCE.md) - Complete API documentation
- [Configuration Guide](./api/CONFIGURATION.md) - Configuration options

### Development
- [Development Rules](./development/DEVELOPMENT_RULES.md) - Coding standards and practices
- [AI Agent Guidelines](./development/AGENTS.md) - Instructions for AI-assisted changes

### Additional Resources
 - [Release Notes](./release-notes/) - Version history and upgrade notes
 - [Reports](./reports/) - Analysis and validation reports
 - [Screenshots](./screenshots/) - Visual examples
 - [Version 1.9.0 Docs](./version-1.9.0/) - Archived documentation for v1.8.3 (deprecated)
 - [TODO & Roadmap](./TODO_ROADMAP.md) - Planned features and upcoming work
 - [License](./LICENSE) - MIT License information
 - [Contributing](./CONTRIBUTING.md) - Guidelines for contributing to i18ntk
 - [Development Scripts and Tools](./dev/) - Scripts and tools for development


## Highlights in 1.9.0

- **Smart Framework Detection** automatically configures rules for i18next, Lingui, and FormatJS projects.
- **Extensible Plugin System** enables custom extractors and format managers.
- **Enhanced Security** with PIN authentication, AES-256-GCM encryption, and strict path validation.
- **Performance Boost** delivering up to 97% faster processing while keeping memory usage under 1MB.

## Migration Guide

### Upgrading to 1.9.0 (Recommended)

#### From any version < 1.9.0
1. **Backup your current configuration**:
   ```bash
   cp -r ./settings ./settings-backup-$(date +%Y%m%d)
   ```

2. **Install the latest secure version**:
    ```bash
    npm install i18ntk@1.8.3
    ```

3. **Run security validation**:
    ```bash
    npx i18ntk@1.9.0 --security-check
    ```

4. **Verify installation**:
    ```bash
    npx i18ntk@1.9.0 --version
    npx i18ntk@1.9.0 --validate
    ```

#### Preserved Features from 1.7.x
- ✅ Ultra-extreme performance improvements
- ✅ Enhanced security with PIN protection
- ✅ Comprehensive backup & recovery
- ✅ Edge case handling
- ✅ Memory optimization
- ✅ Advanced configuration management
- ✅ **Zero shell access security**

#### Breaking Changes
- **None** - 1.9.0 is fully backward compatible with enhanced security

### Migration Support
If you encounter issues during migration:
1. Check the [troubleshooting guide](docs/TROUBLESHOOTING.md)
2. Open an issue on [GitHub](https://github.com/vladnoskv/i18ntk/issues)

