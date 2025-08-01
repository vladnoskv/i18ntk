**Release Date:** July 27, 2024
**Version:** 1.1.2 (DEPRECATED - Please upgrade to 1.1.5)
**Type:** Patch Release 🩹

## Overview

⚠️ **DEPRECATED VERSION** - This version contains known bugs. Please upgrade to v1.1.5 immediately.

Version 1.1.2 was a patch release focused on enhancing the CLI experience by enabling direct command execution and resolving a critical bug related to `user-config.json` access post switch to use i18ntk-config.json instead.

## 🚀 Enhanced CLI Experience

### Direct Command Execution
- **Improved**: Enabled direct execution of commands (e.g., `i18ntk usage`, `i18ntk workflow`) from the command line, bypassing the interactive menu for specified commands.
- **Benefit**: Streamlines automation and integration into CI/CD pipelines, providing a more flexible and efficient workflow.

## 🐛 Bug Fixes & Improvements

### `user-config.json` Error Resolution
- **Fixed**: Resolved "Cannot access 'commandArg' before initialization" error and "Missing required file/directory: ./settings/user-config.json" error.
- **Root Cause**: The issue stemmed from incorrect argument handling in `i18ntk-manage.js` and an outdated global `i18ntk` installation attempting to access a non-existent `user-config.json`.
- **Solution**: Modified `i18ntk-manage.js` to correctly initialize `commandToExecute` and prioritize the `--command=` argument. Ensured the local, up-to-date version of `i18ntk` is used, which correctly utilizes `i18ntk-config.json`.

## ✅ Validation Results

### CLI Command Execution
- **Confirmed**: `i18ntk analyze` and `i18ntk workflow` now execute successfully without the `user-config.json` error, utilizing the correct `i18ntk-config.json`.
- **Verified**: Direct commands like `i18ntk usage` and `i18ntk validate` now execute as expected without launching the interactive menu.

## 🔄 Migration Guide

### For Existing Users
- **No Breaking Changes**: This patch release introduces no breaking changes.
- **Improved Experience**: Direct command execution simplifies scripting and automation.
- **Bug Fix**: The `user-config.json` error is resolved, ensuring smoother operation.

### For New Users
- **Installation**: Standard installation process via npm.
- **Usage**: All commands work as documented, with the added flexibility of direct execution.

## 🚀 Getting Started

```bash
# Install globally
npm install -g i18ntk@1.1.5

# Or update existing installation
npm update -g i18ntk

# Verify installation
i18ntk --version

# Start using the improved toolkit
i18ntk
```

## 📞 Support

If you encounter any issues with this release:

1. Check the updated documentation.
2. Review the changelog for detailed changes.
3. Report issues through the project's issue tracker.
4. Refer to the comprehensive help system: `i18ntk --help`

--- 

**Thank you for using i18ntk!** This patch release further refines the toolkit for a more robust and user-friendly experience.