# 🧪 Local Testing Scripts

This directory contains scripts to test the i18ntk package locally, emulating the exact user experience.

## 📋 Available Test Scripts

### 1. **test-exact.js** (Node.js Script)
**Purpose**: Exact emulation of the npm-test.md commands
**Usage**:
```bash
node test-exact.js
```

**What it does**:
- Creates `test-i18ntk7` directory
- Runs `npm pack` to create tarball
- Initializes npm project
- Installs the local package
- Tests `npx i18ntk --help`
- Tests package resolution

### 2. **test-package.bat** (Windows Batch)
**Purpose**: Windows-specific testing script
**Usage**:
```cmd
test-package.bat
```

**What it does**:
- Same as test-exact.js but with Windows batch commands
- Includes additional functionality testing
- Preserves test directory for inspection

### 3. **test-local-package.js** (Comprehensive)
**Purpose**: Full functionality testing
**Usage**:
```bash
node test-local-package.js
```

**What it does**:
- Creates `test-i18ntk-local` directory
- Tests all CLI commands
- Creates sample translation files
- Tests initialization and analysis

## 🎯 Quick Start

For the **exact** user experience:
```bash
node test-exact.js
```

## 📊 Test Results

All scripts will output:
- ✅ Success messages for each step
- 📁 Location of test artifacts
- 🔍 Error messages if any issues occur

## 🧹 Cleanup

Test directories are **preserved** after testing for manual inspection:
- `test-i18ntk7/` - Created by test-exact.js
- `test-i18ntk-local/` - Created by test-local-package.js

To clean up manually:
```bash
rm -rf test-i18ntk7 test-i18ntk-local
```