# Documentation Overview

**Version:** 1.7.5
**Last Updated:** 2025-08-11
**GitHub Repository:** [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)

Version 1.7.5 introduces **critical security fixes** eliminating shell access vulnerabilities, enhanced security logging, flexible 4-6 digit PIN authentication, configuration stability improvements, and CI/CD silent mode support.

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


## Security Updates in 1.7.5

### Critical Security Fixes
Version 1.7.5 addresses **shell access vulnerabilities** by eliminating direct shell execution across the entire production codebase:

- **Eliminated `child_process.execSync()`**: Replaced with direct file system operations
- **Removed `child_process.spawnSync()`**: Replaced with safe module execution
- **Zero shell access**: No direct shell commands in production code
- **Maintained functionality**: All features work identically with enhanced security

### Security Improvements
- **File system security**: All operations use validated file system paths
- **Input sanitization**: Enhanced validation for all user inputs
- **Module execution**: Scripts execute as modules instead of shell commands
- **Cross-platform safety**: Eliminated platform-specific shell dependencies

## Migration Guide

### Upgrading to 1.7.5 (Recommended)

#### From any version < 1.7.5
1. **Backup your current configuration**:
   ```bash
   cp -r ./settings ./settings-backup-$(date +%Y%m%d)
   ```

2. **Install the latest secure version**:
    ```bash
    npm install i18ntk@1.7.5
    ```

3. **Run security validation**:
    ```bash
    npx i18ntk@1.7.5 --security-check
    ```

4. **Verify installation**:
    ```bash
    npx i18ntk@1.7.5 --version
    npx i18ntk@1.7.5 --validate
    ```

#### Preserved Features from 1.7.2
- ✅ Ultra-extreme performance improvements
- ✅ Enhanced security with PIN protection
- ✅ Comprehensive backup & recovery
- ✅ Edge case handling
- ✅ Memory optimization
- ✅ Advanced configuration management
- ✅ **Zero shell access security**

#### Breaking Changes
- **None** - 1.7.5 is fully backward compatible with enhanced security

### Migration Support
If you encounter issues during migration:
1. Check the [troubleshooting guide](docs/TROUBLESHOOTING.md)
2. Open an issue on [GitHub](https://github.com/vladnoskv/i18ntk/issues)

