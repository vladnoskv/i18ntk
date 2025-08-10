# TODO & Roadmap

This document outlines planned features and improvements for upcoming versions of i18ntk.

## Near-Term
- Expand test coverage for edge cases
- Improve documentation and examples for additional frameworks
- Streamline configuration through interactive prompts

## Future Ideas
- Plugin system for custom translation workflows
- Web-based dashboard for viewing reports
- Continuous integration helpers for automated localization checks

## Long-Term
- AI-assisted translation tools
- Multi-language support for console output
- Integration with popular translation services

Contributions and suggestions are welcome. Please refer to the following resources:

    - **GitHub Repository:** [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)
    - **Issue Tracker:** [vladnoskv/i18ntk/issues](https://github.com/vladnoskv/i18ntk/issues)
    - **Pull Requests:** [vladnoskv/i18ntk/pulls](https://github.com/vladnoskv/i18ntk/pulls)
    - **Discussions:** [vladnoskv/i18ntk/discussions](https://github.com/vladnoskv/i18ntk/discussions)




## Migration Guide

### Upgrading from Deprecated Versions

#### From any version < 1.7.1 (DEPRECATED - use latest version)
1. **Backup your current configuration**:
   ```bash
   cp -r ./.i18ntk ./.i18ntk-backup-$(date +%Y%m%d)
   ```

2. **Install the latest version**:
   ```bash
   npm install i18ntk@1.7.1
   ```

3. **Run configuration migration**:
   ```bash
   npx i18ntk@1.7.1 --migrate
   ```

4. **Verify installation**:
   ```bash
   npx i18ntk@1.7.1 --version
   npx i18ntk@1.7.1 --validate
   ```

#### Preserved Features from 1.6.x
- ✅ Ultra-extreme performance improvements
- ✅ Enhanced security with PIN protection
- ✅ Comprehensive backup & recovery
- ✅ Edge case handling
- ✅ Memory optimization
- ✅ Advanced configuration management

#### Breaking Changes
- **None** - 1.7.1 is fully backward compatible

### Migration Support
If you encounter issues during migration:
1. Check the [troubleshooting guide](docs/TROUBLESHOOTING.md)
2. Open an issue on [GitHub](https://github.com/vladnoskv/i18ntk/issues)

