# Documentation Overview

**Version:** 1.7.0
**Last Updated:** 2025-08-10
**GitHub Repository:** [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)

Version 1.7.0 introduces a watch helper for real-time translation updates and a framework for building a lite English-only UI locale package.

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
 - [Version 1.6.3 Docs](./version-1.6.3/) - Archived documentation for v1.6.3 (deprecated)
 - [TODO & Roadmap](./TODO_ROADMAP.md) - Planned features and upcoming work
 - [License](./LICENSE) - MIT License information
 - [Contributing](./CONTRIBUTING.md) - Guidelines for contributing to i18ntk
 - [Development Scripts and Tools](./dev/) - Scripts and tools for development





## Migration Guide

### Upgrading from Deprecated Versions

#### From any version < 1.7.0 (DEPRECATED - use latest version)
1. **Backup your current configuration**:
   ```bash
   cp -r ./.i18ntk ./.i18ntk-backup-$(date +%Y%m%d)
   ```

2. **Install the latest version**:
    ```bash
    npm install i18ntk@1.7.0```

3. **Run configuration migration**:
    ```bash
    npx i18ntk@1.7.0 --migrate
    ```

4. **Verify installation**:
    ```bash
    npx i18ntk@1.7.0 --version
    npx i18ntk@1.7.0 --validate
    ```

#### Preserved Features from 1.6.x
- ✅ Ultra-extreme performance improvements
- ✅ Enhanced security with PIN protection
- ✅ Comprehensive backup & recovery
- ✅ Edge case handling
- ✅ Memory optimization
- ✅ Advanced configuration management

#### Breaking Changes
- **None** - 1.7.0 is fully backward compatible

### Migration Support
If you encounter issues during migration:
1. Check the [troubleshooting guide](docs/TROUBLESHOOTING.md)
2. Open an issue on [GitHub](https://github.com/vladnoskv/i18ntk/issues)
3. Join our [Discord community](https://discord.gg/i18ntk)

