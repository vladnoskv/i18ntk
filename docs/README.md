# Documentation Overview

**Version:** 1.10.2
**Last Updated:** 2025-08-23
**GitHub Repository:** [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)

Version 1.10.2 delivers critical fixes for projectRoot path resolution, enhanced environment variable management, improved security with path validation, and comprehensive migration support.

## Structure

### Core Guides
- [Installation Guide](./INSTALLATION.md) - Detailed installation instructions
- [PIN Protection Guide](./PIN_PROTECTION_GUIDE.md) - Configure PIN-based security
- [Ultra Performance Guide](./ULTRA_PERFORMANCE_GUIDE.md) - Optimize for maximum speed
- [Environment Variables](./environment-variables.md) - Complete environment variable reference
- [Migration Guide v1.10.2](./migration-guide-v1.10.2.md) - Critical projectRoot path fix

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
 - [Version 1.10.2 Docs](./version-1.10.0/) - Current version documentation
 - [TODO & Roadmap](./TODO_ROADMAP.md) - Planned features and upcoming work
 - [License](./LICENSE) - MIT License information
 - [Contributing](./CONTRIBUTING.md) - Guidelines for contributing to i18ntk
 - [Development Scripts and Tools](./dev/) - Scripts and tools for development


## Highlights in 1.10.2

- **🚨 Critical Fix**: Fixed projectRoot path resolution - fresh installs now work out-of-the-box
- **Enhanced Environment Variables**: Centralized management with security filtering and validation
- **Improved Security**: Enhanced path validation and secure module loading
- **Better Debugging**: Comprehensive debug logging with environment variable support
- **Performance Boost**: Maintained 97% faster processing while keeping memory usage under 1MB

## Migration Guide

### Upgrading to 1.10.2 (Recommended)

#### From any version < 1.10.2
1. **Backup your current configuration**:
   ```bash
   cp -r ./settings ./settings-backup-$(date +%Y%m%d)
   ```

2. **Install the latest secure version**:
     ```bash
     npm install i18ntk@1.10.2
     ```

3. **Run security validation**:
     ```bash
     npx i18ntk@1.10.2 --security-check
     ```

4. **Verify installation**:
     ```bash
     npx i18ntk@1.10.2 --version
     npx i18ntk@1.10.2 --validate
     ```

#### Critical Fix: projectRoot Path
- **Fixed**: Settings reset now correctly uses `/` instead of `./` for projectRoot
- **Impact**: Fresh installations work immediately without configuration
- **Compatibility**: Existing configurations remain unchanged

#### Breaking Changes
- **None** - 1.10.2 is fully backward compatible with enhanced security

### Migration Support
If you encounter issues during migration:
1. Check the [migration guide v1.10.2](./migration-guide-v1.10.2.md)
2. Check the [troubleshooting guide](./environment-variables.md#troubleshooting)
3. Open an issue on [GitHub](https://github.com/vladnoskv/i18ntk/issues)

