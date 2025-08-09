# Ultra-Performance Guide

**See main README.md for complete performance specifications**

## 🚀 Ultra-Extreme Mode

| Mode | Processing Time | Memory | Improvement |
|------|-----------------|---------|-------------|
| **Ultra-Extreme** | **15.38ms** | **1.62MB** | **94.87%** |

## ⚙️ Quick Configuration

```bash
# Enable ultra-extreme mode
i18ntk-analyze --performance-mode=ultra-extreme

# Validate performance
npm run benchmark:ultra-extreme
```

## 📊 Performance Targets
- **Processing:** <35ms for 200k keys
- **Memory:** <10MB usage
- **Throughput:** >5M keys/sec

## 🔧 Optimization Files
- `benchmarks/ultra-extreme-performance-config.js`
- `utils/ultra-performance-optimizer.js`

---
*See README.md for detailed performance benchmarks and configuration options*

## Migration Guide

### Upgrading from Deprecated Versions

#### From any version < 1.6.3 (DEPRECATED - use latest version) 1. **Backup your current configuration**:
   ```bash
   cp -r ./.i18ntk ./.i18ntk-backup-$(date +%Y%m%d)
   ```

2. **Install the latest version**:
   ```bash
   npm install i18ntk@1.6.3```

3. **Run configuration migration**:
   ```bash
   npx i18ntk@1.6.3--migrate
   ```

4. **Verify installation**:
   ```bash
   npx i18ntk@1.6.3--version
   npx i18ntk@1.6.3--validate
   ```

#### Preserved Features from 1.6.3
- ✅ Ultra-extreme performance improvements
- ✅ Enhanced security with PIN protection
- ✅ Comprehensive backup & recovery
- ✅ Edge case handling
- ✅ Memory optimization
- ✅ Advanced configuration management

#### Breaking Changes
- **None** - 1.6.3 is fully backward compatible

### Migration Support
If you encounter issues during migration:
1. Check the [troubleshooting guide](docs/TROUBLESHOOTING.md)
2. Open an issue on [GitHub](https://github.com/vladnoskv/i18ntk/issues)
3. Join our [Discord community](https://discord.gg/i18ntk)

