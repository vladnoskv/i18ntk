# i18ntk Debug Tools

**Version:** 1.4.0 (04/08/2025)

## Overview

Comprehensive debugging toolkit for i18ntk - diagnose issues, analyze performance, and maintain translation quality.

## Core Debug Tools

### System Debugger
```bash
npm run i18ntk:debug                    # Full system debug
npm run i18ntk:debug -- --verbose       # Verbose output
npm run i18ntk:debug -- --performance   # Performance analysis
```

**Features:**
- System diagnostics
- Performance analysis
- Memory usage monitoring
- Configuration validation
- Dependency checking

### Console Tools

#### Key Validation
```bash
node scripts/debug/console-key-checker.js
```

**Features:**
- Console message key validation
- Missing key detection
- Unused key identification
- Format validation

#### Translation Manager
```bash
node scripts/debug/console-translations.js
```

**Features:**
- Dynamic console message translation
- Language switching
- Message formatting
- Fallback handling

#### Complete Coverage
```bash
node scripts/debug/complete-console-translations.js
```

**Features:**
- Scan console messages
- Identify untranslated messages
- Auto-complete translations
- Batch processing

### Code Transformation

#### Replace Hardcoded Messages
```bash
node scripts/debug/replace-hardcoded-console.js
```

**Transforms:**
```javascript
// Before
console.log('Analysis complete');

// After
console.log(this.ui.t('analysis.complete'));
```

### Data Export

#### Export Missing Keys
```bash
node scripts/debug/export-missing-keys.js --format=csv --output=missing-keys.csv
node scripts/debug/export-missing-keys.js --format=json --language=es
node scripts/debug/export-missing-keys.js --format=xliff --all-languages
```

**Supported formats:**
- JSON
- CSV
- XLSX
- XLIFF
- PO files

## Usage Examples

### Basic Debugging
```javascript
const { I18nManager } = require('i18n-management-toolkit');

const manager = new I18nManager();
const debug = await manager.debug();
console.log(debug.summary);
```

### Performance Analysis
```javascript
const analyzer = new PerformanceAnalyzer();
const metrics = await analyzer.analyze();
console.log(`Memory: ${metrics.memoryUsage}MB`);
console.log(`Time: ${metrics.analysisTime}ms`);
```

### Key Validation
```javascript
const checker = new ConsoleKeyChecker();
const results = await checker.validateConsoleKeys();
console.log(`Missing: ${results.missing.length}`);
console.log(`Unused: ${results.unused.length}`);
```

## Quick Commands

| Command | Purpose |
|---------|---------|
| `npm run i18ntk:debug` | Full system diagnostics |
| `node scripts/debug/console-key-checker.js` | Validate console keys |
| `node scripts/debug/complete-console-translations.js` | Ensure 100% coverage |
| `node scripts/debug/export-missing-keys.js --format=csv` | Export missing keys |

## Output Examples

### Debug Report
```
🔍 i18ntk Debug Analysis
========================
✅ Configuration: Valid
✅ Dependencies: All installed
⚠️  Memory Usage: 85%
❌ Missing Keys: 15 found

📊 Performance
- Startup: 1.2s
- Analysis: 3.4s
- Memory: 156MB
```

### Key Validation
```
🔍 Scanning console messages...
📁 Found 156 console messages
✅ Translated: 145
❌ Missing: 11
🔧 Auto-completed: 11
```