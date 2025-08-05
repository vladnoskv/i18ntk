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
node scripts/debug/debugger.js

# Validate configuration
node scripts/debug/config-validator.js

# Debug translations
node scripts/debug/translation-debugger.js

# Profile performance
node scripts/debug/performance-profiler.js
```

## Debug Output

Debug logs and reports are saved to `scripts/debug/logs/` with timestamps.

## Version 1.5.0 Update

**Critical Bug Fix**: These debug tools were moved from `/dev/debug/` to `/scripts/debug/` in v1.5.0 to resolve MODULE_NOT_FOUND errors when using `npx i18ntk`.