# Development Scripts and Tools

**Version:** 1.6.0  
**Last Updated:** 2025-08-08  
**GitHub Repository:** [vladnoskv/i18ntk](https://github.com/vladnoskv/i18ntk)

This folder contains development scripts, test files, and debugging tools to help maintain and improve the i18nTK toolkit.

## 📁 Folder Structure

```
dev/
├── tests/           # Test scripts and test data
├── debug/           # Debugging tools and utilities
├── reports/         # Development reports and analysis
└── scripts/         # Development helper scripts
```

## 🧪 Test Scripts

- **test-complete-system.js** - Complete system integration tests
- **test-features.js** - Feature-specific tests
- **test-console-i18n.js** - Console i18n functionality tests

## 🐛 Debug Tools

- **debugger.js** - Main debugging utility for identifying issues
- **debug-config.js** - Configuration debugging helper
- **debug-security.js** - Security diagnostics and sanitization checks
- **console-key-checker.js** - Detects missing console translation keys
- **benchmark.js** - Performance benchmarking tool

## 📊 Reports

Development reports are organized by type:
- **analysis/** - Translation analysis reports
- **validation/** - Validation reports
- **usage/** - Usage analysis reports
- **sizing/** - File sizing reports
- **summary/** - Summary reports

## 🔧 Development Rules

See `DEVELOPMENT_RULES.md` for coding standards and best practices.

## ⚙️ Diagnostic Commands (v1.6.0)

```bash
# Run performance benchmarks
npm run benchmark

# Optimize included locales interactively
node scripts/locale-optimizer.js --interactive

# View current settings
i18ntk --settings

# Switch performance mode
i18ntk --config performance.mode=extreme

# Validate configuration schema
i18ntk --validate-config

# Check for missing console keys
node scripts/console-key-checker.js

# Run security diagnostics
node scripts/debug-security.js

# Generate performance report
npm run report:performance

# Generate sizing report
npm run report:sizing

# Generate summary report
npm run report:summary

```
