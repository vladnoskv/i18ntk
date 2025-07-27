# I18N Management Toolkit - Installation Guide

**Version:** 1.1.2  
**Release Date:** July 27, 2024  
**Status:** Stable Release - Enhanced CLI & Local Usage  

## 📦 Installation Options

### 📁 Local Project Installation (Recommended)

Install i18ntk globally to use it across all your projects:

#### NPM
```bash
npm install i18ntk --save-dev
```

#### Yarn
```bash
yarn add -D i18ntk
```

#### Verification
```bash
# Verify installation
npx i18ntk --version

# Or check all available commands
npm list i18ntk
```

### 🌍 Global Installation (Optional)

While local installation is recommended, you can still install i18ntk globally:

#### NPM
```bash
npm install -g i18ntk
```

#### Yarn
```bash
yarn global add i18ntk
```

#### Using with npx (No Installation Required)

`npx` allows you to run i18ntk commands without installing it globally or locally. This is useful for one-off tasks or CI/CD environments.

```bash
npx i18ntk <command> # e.g., npx i18ntk init, npx i18ntk usage
```

## 🔧 System Requirements

### Minimum Requirements
- **Node.js:** >=16.0.0
- **NPM:** >=7.0.0 (or Yarn >=1.22.0)
- **Operating System:** Windows, macOS, Linux
- **Memory:** 512MB RAM minimum
- **Disk Space:** 50MB for installation

### Recommended Requirements
- **Node.js:** >=18.0.0 (LTS)
- **NPM:** >=8.0.0 (or Yarn >=3.0.0)
- **Memory:** 1GB RAM for large projects
- **Disk Space:** 200MB for reports and backups

### Compatibility Check
```bash
# Check Node.js version
node --version

# Check NPM version
npm --version

# Check Yarn version (if using Yarn)
yarn --version
```

## 🚀 Quick Setup

### 1. Install i18ntk
```bash
# Local installation (recommended)
npm install i18ntk --save-dev
```

### 2. Initialize Your Project
```bash
# Navigate to your project directory
cd your-project

# Initialize i18n structure
npx i18ntk init
```

### 3. Configure Your Project
```bash
# Run the main management interface
npx i18ntk manage

# Or use automated setup
npx i18ntk autorun
```

### 4. Verify Installation
```bash
# Run tests to verify everything works
npm test
```

## 🏗️ Framework-Specific Setup

### React with react-i18next

#### 1. Install Dependencies
```bash
npm install react-i18next i18next
# or
yarn add react-i18next i18next
```

#### 2. Install i18ntk
```bash
npm install i18ntk --save-dev
# or use npx directly without installation
```

#### 3. Initialize
```bash
npx i18ntk init --framework react-i18next
```

#### 4. Project Structure
```
your-react-project/
├── src/
│   ├── components/
│   ├── pages/
│   └── i18n/           # i18n configuration
├── public/
│   └── locales/        # Translation files
│       ├── en/
│       ├── es/
│       └── fr/
└── package.json
```

### Vue with vue-i18n

#### 1. Install Dependencies
```bash
npm install vue-i18n
# or
yarn add vue-i18n
```

#### 2. Install i18ntk
```bash
npm install i18ntk --save-dev
# or use npx directly without installation
```

#### 3. Initialize
```bash
npx i18ntk init --framework vue-i18n
```

### Angular with Angular i18n

#### 1. Install Dependencies
```bash
ng add @angular/localize
```

#### 2. Install i18ntk
```bash
npm install i18ntk --save-dev
# or use npx directly without installation
```

#### 3. Initialize
```bash
npx i18ntk init --framework angular-i18n
```

### Next.js with next-i18next

#### 1. Install Dependencies
```bash
npm install next-i18next react-i18next i18next
```

#### 2. Install i18ntk
```bash
npm install -g i18ntk
```

#### 3. Initialize
```bash
i18ntk-init --framework next-i18next
```

## ⚙️ Configuration

### Automatic Configuration
When you run `i18ntk-init`, it automatically creates:

```
your-project/
├── i18ntk-config.json   # User preferences
├── admin-config.json    # Admin settings (if needed)
├── locales/            # Translation files
│   ├── en/
│   ├── es/
│   └── fr/
└── i18ntk-reports/     # Generated reports
```

### Manual Configuration
If you prefer manual setup, create `i18ntk-config.json`:

```json
{
  "version": "1.0.0",
  "project": {
    "name": "Your Project Name",
    "framework": "react-i18next"
  },
  "directories": {
    "source": "./src",
    "locales": "./public/locales"
  },
  "languages": {
    "default": "en",
    "supported": ["en", "es", "fr", "de"]
  }
}
```

## 🔍 Verification & Testing

### Basic Verification
```bash
# Check if i18ntk is installed correctly
i18ntk-manage --help

# Run a quick analysis
i18ntk-analyze

# Validate your setup
i18ntk-validate
```

### Comprehensive Testing
```bash
# Run the full test suite
npm test

# Expected output:
# ✅ Passed: 25/25 (100%)
# ❌ Failed: 0/25 (0%)
# ⚠️  Warnings: 0
# 📊 Overall Status: 🟢 READY
```

### Test Individual Components
```bash
# Test translation loading
i18ntk-analyze --detailed

# Test validation
i18ntk-validate --strict

# Test usage analysis
i18ntk-usage --unused
```

## 🛠️ Available Commands

After installation, these commands are available:

### Core Commands
```bash
i18ntk-manage      # Main management interface
i18ntk-init        # Initialize i18n setup
i18ntk-analyze     # Analyze translations
i18ntk-validate    # Validate translation files
i18ntk-usage       # Check translation usage
i18ntk-complete    # Complete missing translations
i18ntk-sizing      # Analyze file sizes
i18ntk-summary     # Generate summary reports
i18ntk-autorun     # Run automated workflow
```

### NPM Scripts (if installed locally)
```bash
npm run i18ntk           # Main interface
npm run i18ntk:init      # Initialize
npm run i18ntk:analyze   # Analyze
npm run i18ntk:validate  # Validate
npm run i18ntk:autorun   # Automated workflow
npm test                 # Run tests
```

## 🚨 Troubleshooting

### Common Installation Issues

#### Permission Errors (Global Installation)
```bash
# On macOS/Linux, use sudo if needed
sudo npm install -g i18ntk

# Or configure npm to use a different directory
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

#### Node.js Version Issues
```bash
# Check your Node.js version
node --version

# If too old, update Node.js
# Visit: https://nodejs.org/
```

#### NPM Cache Issues
```bash
# Clear npm cache
npm cache clean --force

# Reinstall
npm install -g i18ntk
```

#### Yarn Issues
```bash
# Clear yarn cache
yarn cache clean

# Reinstall
yarn global add i18ntk
```

### Command Not Found

If `i18ntk-manage` command is not found after installation:

```bash
# Check if it's in your PATH
which i18ntk-manage

# If not found, check npm global bin directory
npm config get prefix

# Add to your PATH (add to ~/.bashrc or ~/.zshrc)
export PATH="$(npm config get prefix)/bin:$PATH"
```

### Windows-Specific Issues

#### PowerShell Execution Policy
```powershell
# Check current policy
Get-ExecutionPolicy

# If restricted, set to RemoteSigned
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Path Issues
```cmd
# Check if npm global directory is in PATH
echo %PATH%

# Add npm global directory to PATH if missing
# Usually: C:\Users\YourName\AppData\Roaming\npm
```

## 🔄 Updating

### Update to Latest Version
```bash
# Global update
npm update -g i18ntk

# Or with Yarn
yarn global upgrade i18ntk

# Local update
npm update i18ntk
```

### Check Current Version
```bash
# Check installed version
i18ntk-manage --version

# Check latest available version
npm view i18ntk version
```

### Migration Between Versions
Version 1.0.0 is the first stable release. Previous 0.x.x-dev versions can be upgraded seamlessly.

## 🆘 Getting Help

### Documentation
- **[Main Documentation](./README.md)** - Complete guide
- **[API Reference](./docs/api/API_REFERENCE.md)** - All commands
- **[Configuration Guide](./docs/api/CONFIGURATION.md)** - Setup options
- **[Debug Tools](./docs/debug/DEBUG_TOOLS.md)** - Troubleshooting

### Community Support
- **[GitHub Issues](https://github.com/vladnoskv/i18n-management-toolkit/issues)** - Bug reports
- **[GitHub Discussions](https://github.com/vladnoskv/i18n-management-toolkit/discussions)** - Questions
- **[Email Support](mailto:vladnoskv@gmail.com)** - Direct contact

### Professional Support
For enterprise installations, custom configurations, or consulting services, contact the maintainer directly.

---

## ✅ Installation Checklist

- [ ] Node.js >=16.0.0 installed
- [ ] NPM >=7.0.0 or Yarn >=1.22.0 installed
- [ ] i18ntk installed globally or locally
- [ ] Project initialized with `i18ntk-init`
- [ ] Configuration files created
- [ ] Commands working (`i18ntk-manage --help`)
- [ ] Tests passing (`npm test`)
- [ ] Framework dependencies installed (if applicable)
- [ ] Translation files structure created
- [ ] First analysis completed (`i18ntk-analyze`)

**Congratulations!** 🎉 You're ready to start managing your internationalization with i18ntk!

---

**Need help?** Don't hesitate to reach out through our [support channels](#-getting-help).