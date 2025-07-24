# Debug Tools

This folder contains debugging tools and utilities for the i18nTK project.

## Debug Scripts

- **debugger.js** - Main debugging script for identifying issues
- **config-validator.js** - Configuration validation debugger
- **translation-debugger.js** - Translation-specific debugging tools
- **performance-profiler.js** - Performance analysis and profiling

## Usage

```bash
# Run main debugger
node dev/debug/debugger.js

# Validate configuration
node dev/debug/config-validator.js

# Debug translations
node dev/debug/translation-debugger.js

# Profile performance
node dev/debug/performance-profiler.js
```

## Debug Output

Debug logs and reports are saved to `dev/debug/logs/` with timestamps.