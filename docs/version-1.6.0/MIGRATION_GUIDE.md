# Migration Guide: v1.6.0

## 🎯 **Zero Migration Required**

**100% backward compatible** - all improvements automatically applied.

## 🚀 **Quick Upgrade**

```bash
# Update to v1.6.0
npm update -g i18ntk

# Verify
i18ntk --version  # Should show 1.6.0
```

## 📊 **What's New**

- **87% performance improvement**
- **67% package size reduction**
- **Enhanced security**
- **Zero breaking changes**

## 🔧 **Configuration**

**Existing configs work unchanged.** Optional new settings:

```javascript
// .i18ntk.config.js (optional)
module.exports = {
  performance: {
    mode: 'extreme',     // extreme, ultra, optimized, conservative
    batchSize: 1000,
    concurrency: 16
  }
};
```

## ✅ **Testing**

```bash
# Quick verification
i18ntk --help
i18ntk analyze --quick

# Performance test
i18ntk benchmark --keys=1000
```

---
*All features work identically - improvements are automatic*