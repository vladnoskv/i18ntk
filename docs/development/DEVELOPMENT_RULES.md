# i18nTK Development Rules

This document outlines the essential rules and guidelines that must be followed to maintain code quality, prevent issues, and ensure the stability of the i18nTK project.

## 🚨 Critical Rules (MUST FOLLOW)

### 1. File Naming Conventions
- **NEVER** use old numbered naming conventions (e.g., `01-init-i18n.js`, `04-check-usage.js`)
- **ALWAYS** use the `i18ntk-` prefix for core scripts (e.g., `i18ntk-init.js`, `i18ntk-usage.js`)
- **ALWAYS** update ALL references when renaming files (code, documentation, package.json, etc.)

### 2. Translation Key Management
- **NEVER** commit code with missing translation keys
- **ALWAYS** ensure all UI locale files have complete translation coverage
- **ALWAYS** run translation validation before committing
- **NEVER** hardcode text strings in code - use translation keys

### 3. Configuration Management
- **ALWAYS** use the `SettingsManager` class for configuration access
- **NEVER** hardcode file paths or settings in scripts
- **ALWAYS** validate configuration before using it
- **ALWAYS** provide fallback values for optional settings

### 4. Code References
- **ALWAYS** update ALL file references when renaming scripts
- **NEVER** leave dead references to old file names
- **ALWAYS** use relative paths consistently
- **ALWAYS** check for references in: code files, package.json, documentation, locale files

## 📋 Development Guidelines

### File Organization
```
project-root/
├── i18ntk-*.js           # Core scripts with i18ntk- prefix
├── dev/                   # Development tools and tests
│   ├── tests/            # Test scripts
│   ├── debug/            # Debug tools
│   └── scripts/          # Development utilities
├── i18n-reports/         # Organized report structure
│   ├── analysis/         # Analysis reports
│   ├── validation/       # Validation reports
│   ├── usage/            # Usage reports
│   ├── sizing/           # Sizing reports
│   └── summary/          # Summary reports
├── ui-locales/           # UI translation files
├── locales/              # Project translation files
└── i18ntk-config.json    # Main configuration
```

### Testing Requirements
- **ALWAYS** test scripts after making changes
- **ALWAYS** run the full workflow: `npx i18ntk`
- **ALWAYS** check for errors in all supported languages
- **ALWAYS** validate configuration changes

### Documentation Standards
- **ALWAYS** update README.md when changing commands or structure
- **ALWAYS** update CHANGELOG.md for version changes
- **ALWAYS** document new features and breaking changes
- **ALWAYS** keep documentation in sync with code

## 🔧 Pre-Commit Checklist

Before committing any changes, ensure:

- [ ] All tests pass: `npm test` (if available)
- [ ] Full workflow runs successfully: `npx i18ntk`
- [ ] No missing translation keys: `node dev/debug/debugger.js`
- [ ] No old file references remain
- [ ] Documentation is updated
- [ ] Configuration is valid
- [ ] No hardcoded paths or settings

## 🚫 Common Mistakes to Avoid

### File Naming Issues
- ❌ Using numbered prefixes: `01-script.js`
- ❌ Inconsistent naming: `i18n-script.js` vs `i18ntk-script.js`
- ❌ Leaving old files after renaming

### Translation Issues
- ❌ Missing translation keys in any language
- ❌ Inconsistent key structures across languages
- ❌ Hardcoded text in code
- ❌ Invalid JSON in locale files

### Configuration Issues
- ❌ Hardcoded file paths
- ❌ Missing fallback values
- ❌ Invalid configuration structure
- ❌ Not using SettingsManager

### Reference Issues
- ❌ Dead references to renamed files
- ❌ Inconsistent path formats
- ❌ Missing updates in package.json
- ❌ Outdated documentation

## 🛠️ Debug and Validation Tools

### Available Tools
- `node dev/debug/debugger.js` - Main debugging script
- `npx i18ntk` - Full workflow validation
- `npx i18ntk validate` - Translation validation
- `npx i18ntk usage` - Usage analysis

### When to Use Debug Tools
- Before committing changes
- After renaming files
- When adding new translations
- When modifying configuration
- When encountering errors

## 📝 Version Control Guidelines

### Commit Messages
- Use clear, descriptive commit messages
- Reference issue numbers when applicable
- Use conventional commit format when possible

### Branch Management
- Create feature branches for significant changes
- Test thoroughly before merging
- Keep main branch stable

### Release Process
- Update version in package.json
- Update CHANGELOG.md
- Run full test suite
- Validate all translations
- Test installation process

## 🔍 Code Review Requirements

When reviewing code changes, check for:
- Compliance with naming conventions
- Complete translation coverage
- Proper configuration usage
- Updated documentation
- No hardcoded values
- Consistent code style

## 📞 Getting Help

If you encounter issues:
1. Run the debugger: `node dev/debug/debugger.js`
2. Check the logs in `dev/debug/logs/`
3. Review this rules document
4. Check existing issues and documentation
5. Create a detailed issue report if needed

## 🎯 Quality Metrics

Maintain these quality standards:
- 0 missing translation keys
- 0 dead file references
- 100% test coverage for critical paths
- Clear, up-to-date documentation
- Consistent code style
- Proper error handling

---

**Remember: Following these rules prevents issues and maintains project quality. When in doubt, run the debugger and validate your changes!**