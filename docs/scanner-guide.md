# i18ntk Scanner Guide

**Version:** 2.0.0 | **Updated:** 2025-08-20

Detect and extract hardcoded text from your codebase.

## Quick Start

```bash
# Scan project
i18ntk scanner --source ./src --framework react

# Auto-detect framework
i18ntk scanner --source ./src
```

## Framework Support

| Framework | Accuracy | Detection Method |
|-----------|----------|------------------|
| React     | 95%      | JSX, React components |
| Vue       | 93%      | Templates, SFC |
| Angular   | 91%      | Templates, bindings |
| Vanilla   | 87%      | DOM manipulation |

## Framework Patterns

### React
```jsx
// Detected: "Hello World"
<div>Hello World</div>
<Component title="Settings" />
```

### Vue
```vue
<!-- Detected: "Welcome" -->
<template>
  <div>Welcome</div>
</template>
```

### Angular
```html
<!-- Detected: "Welcome" -->
<div>Welcome</div>
<div [title]="'Settings'"></div>
```

## 🔧 Custom Configuration

### Without Framework Packages

When framework packages are not installed, use custom patterns:

```bash
# Vanilla JavaScript with custom patterns
i18ntk scanner --source ./src --framework vanilla --patterns "['\"([^\"]*?)\"', '\'([^\']*?)\']' --min-length=3

# Exclude test files
i18ntk scanner --source ./src --exclusions "['*.test.js', '*.spec.js']"
```

### Advanced Configuration

#### Custom Regex Patterns
```javascript
// In your i18ntk-config.json
{
  "scanner": {
    "patterns": {
      "vanilla": [
        "\"([^\"]*?)\"",           // Double quotes
        "'([^']*?)'",              // Single quotes
        "`([^`]*?)`",              // Template literals
        "textContent:\\s*['\"`]([^'\"`]*?)['\"`]", // textContent
        "innerText:\\s*['\"`]([^'\"`]*?)['\"`]"   // innerText
      ]
    },
    "exclusions": [
      "*.test.js",
      "*.spec.js",
      "node_modules/**",
      "dist/**"
    ],
    "minLength": 3,
    "maxLength": 100
  }
}
```

## 🎯 Edge Cases & Solutions

### Unicode Support
```bash
# Full Unicode support enabled by default
i18ntk scanner --source ./src --unicode-support

# Examples of detected Unicode text:
# "你好世界" (Chinese)
# "🎉 Welcome!" (Emoji)
# "Café & Résumé" (Accented characters)
```

### Empty Files & Directories
```bash
# Graceful handling of empty files
i18ntk scanner --source ./src --skip-empty-files

# Include empty directories in reports
i18ntk scanner --source ./src --report-empty-dirs
```

### Length Limits
```bash
# Custom length limits
i18ntk scanner --source ./src --min-length=3 --max-length=80

# Skip very short text (like "OK", "Hi")
i18ntk scanner --source ./src --min-length=5

# Skip very long text (like paragraphs)
i18ntk scanner --source ./src --max-length=50
```

## 📊 Report Generation

### JSON Reports
```bash
# Generate JSON report
i18ntk scanner --source ./src --output-format json --output-dir ./reports

# JSON report structure:
{
  "summary": {
    "totalFiles": 25,
    "totalInstances": 47,
    "framework": "react",
    "scanDuration": "124ms"
  },
  "results": [
    {
      "file": "src/components/Header.jsx",
      "instances": [
        {
          "text": "Welcome to our app",
          "line": 15,
          "column": 18,
          "suggestedKey": "app.welcome"
        }
      ]
    }
  ]
}
```

### Markdown Reports
```bash
# Generate human-readable markdown report
i18ntk scanner --source ./src --output-format markdown --output-dir ./reports
```

## 🚨 Troubleshooting

### Common Issues

#### "Security validation failed"
```bash
# Ensure proper file permissions
chmod 755 ./src/

# Use absolute paths
i18ntk scanner --source /absolute/path/to/src
```

#### "No framework detected"
```bash
# Manually specify framework
i18ntk scanner --source ./src --framework react

# Check package.json dependencies
npm list react-i18next
```

#### "Too many false positives"
```bash
# Adjust sensitivity
i18ntk scanner --source ./src --min-length=5 --exclusions "['*.test.js']"

# Use custom patterns
i18ntk scanner --source ./src --patterns "['user-friendly']"
```

### Performance Optimization

#### Large Codebases
```bash
# Batch processing
i18ntk scanner --source ./src --batch-size=100

# Exclude large directories
i18ntk scanner --source ./src --exclusions "['node_modules/**', 'dist/**']"

# Use streaming mode
i18ntk scanner --source ./src --streaming-mode
```

## 🧪 Testing Your Setup

### Run Scanner Tests
```bash
# Run comprehensive scanner tests
npm run test:scanner

# Test specific framework
npm run test:scanner -- --framework react

# Validate scanner output
npm run test:scanner -- --validate-output
```

### Manual Validation
```bash
# Create test file
echo "const message = 'Hello World';" > test.js

# Run scanner on test file
i18ntk scanner --source ./test.js --framework vanilla

# Verify detection
# Should detect "Hello World" as hardcoded text
```

## 📚 Best Practices

### Project Setup
1. **Install framework packages** for best accuracy
2. **Configure exclusion patterns** for test files
3. **Set appropriate length limits** for your project
4. **Generate baseline reports** for tracking progress

### Team Workflow
1. **Run scanner before commits** via pre-commit hooks
2. **Review generated reports** in pull requests
3. **Update translation keys** based on scanner suggestions
4. **Track progress** with regular scanner runs

### CI/CD Integration
```yaml
# GitHub Actions example
- name: Scan for hardcoded text
  run: |
    i18ntk scanner --source ./src --output-format json
    cat reports/scanner-report.json
```

## 🔍 Advanced Features

### Pattern Customization
```javascript
// Advanced regex patterns for complex cases
{
  "scanner": {
    "patterns": {
      "react": [
        "{t\\('([^']*?)'\\)}",           // t() function calls
        "{t\\(\"([^\"]*?)\"\\)}",         // t() with double quotes
        "useTranslation\\(\)\\.t\\('([^']*?)'\\)", // useTranslation hook
        "i18ntk\\.t\\('([^']*?)'\\)"          // i18ntk instance
      ]
    }
  }
}
```

### Framework Detection Algorithm
The scanner uses these detection methods:
1. **Package.json analysis** - Checks for framework dependencies
2. **File extension detection** - .jsx, .vue, .ts patterns
3. **Import statement analysis** - Framework-specific imports
4. **Usage pattern matching** - Framework-specific translation calls

## 📞 Support

For scanner-specific issues:
1. Check framework package installation
2. Verify file permissions and paths
3. Review exclusion patterns
4. Test with minimal configuration
5. Submit detailed bug reports with scanner output

## 🔄 Version Compatibility

| i18ntk Version | Framework Support | Notes |
| -------------- | ----------------- | ----- |
| 1.8.3+ | React 16+, Vue 2+, Angular 9+ | Full framework detection |
| 1.8.0+ | Basic vanilla support | Manual configuration required |
| < 1.8.0 | Limited support | Upgrade recommended |