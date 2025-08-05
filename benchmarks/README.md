# i18n Management Toolkit - Performance Benchmarking Framework

This directory contains reproducible performance benchmarking infrastructure for the i18n Management Toolkit.

## Overview

The benchmarking framework provides:
- **Reproducible measurements** across different environments
- **Environment metadata** capture for accurate comparisons
- **Automated regression detection** against baseline performance
- **Comprehensive metrics** including execution time, memory usage, and throughput
- **CI/CD integration** for continuous performance monitoring

## Quick Start

### Running Benchmarks

```bash
# Run all benchmarks
npm run benchmark

# Run specific benchmark suite
node benchmarks/run-benchmarks.js

# Run with custom Node.js version
nvm use 18 && npm run benchmark
```

### Understanding Results

Benchmarks generate results in the `benchmarks/results/` directory:

- `benchmark-YYYY-MM-DD.json` - Full benchmark results for the day
- `comparison-YYYY-MM-DD.json` - Comparison with baseline (if baseline exists)
- `baseline.json` - Reference baseline for regression detection

### Dataset Sizes

Benchmarks test with different translation dataset sizes:
- 100 keys (small) x 4 languages
- 1,000 keys (medium) x 4 languages
- 10,000 keys (large) x 4 languages
- 50,000 keys (extra large) x 4 languages

## Environment Capture

Each benchmark run captures:
- **Operating System**: platform, release, architecture
- **Node.js**: version, npm version
- **Hardware**: CPU model, core count, total memory
- **Configuration**: benchmark parameters, dataset sizes

## Performance Metrics

### Translation Analysis
- **Execution Time**: Time to analyze translation files
- **Memory Usage**: Heap and RSS memory consumption
- **Throughput**: Keys processed per second

### Configuration Validation
- **Validation Time**: Time to validate security configurations
- **Configuration Complexity**: Impact of different config sizes

### Memory Usage
- **Large Dataset Handling**: Performance with 25,000+ keys
- **Memory Efficiency**: Memory usage patterns

## Regression Detection

The framework automatically compares current results with baseline:

- **10% threshold** for significant performance changes
- **Detailed reporting** of regressions and improvements
- **Historical tracking** of performance trends

### Setting Baseline

```bash
# Create baseline from current results
cp benchmarks/results/benchmark-$(date +%Y-%m-%d).json benchmarks/baseline.json
```

### Custom Baseline

```bash
# Run benchmark and set as baseline
npm run benchmark
cp benchmarks/results/benchmark-*.json benchmarks/baseline.json
```

## CI/CD Integration

### GitHub Actions

The benchmarking framework integrates with GitHub Actions to:
- Run benchmarks on every PR
- Detect performance regressions
- Generate performance reports
- Block merges on significant regressions

### Local CI Testing

```bash
# Test CI integration locally
npm run benchmark:ci
```

## Reproducing Results

### Exact Environment Replication

1. **Check Node.js version** from results metadata
2. **Use same dataset sizes** as documented
3. **Run with identical configuration** parameters
4. **Compare against baseline** for verification

### Example Reproduction

```bash
# 1. Install exact Node.js version
nvm install 18.17.0
nvm use 18.17.0

# 2. Install dependencies
npm ci

# 3. Run benchmark
npm run benchmark

# 4. Compare with baseline
node -e "
  const fs = require('fs');
  const current = JSON.parse(fs.readFileSync('benchmarks/results/benchmark-latest.json'));
  const baseline = JSON.parse(fs.readFileSync('benchmarks/baseline.json'));
  console.log('Performance comparison:', current.benchmarks.translationAnalysis[1000].executionTime.mean, 'vs', baseline.benchmarks.translationAnalysis[1000].executionTime.mean);
"
```

## Advanced Usage

### Custom Benchmarks

Create custom benchmark files:

```javascript
// benchmarks/custom-benchmark.js
const BenchmarkRunner = require('./run-benchmarks');

class CustomBenchmark extends BenchmarkRunner {
  async runCustomBenchmark() {
    // Your custom benchmark logic
    const result = await this.measureMemoryUsage(async () => {
      // Test your specific functionality
    });
    
    this.results.benchmarks.custom = result;
  }
}

const runner = new CustomBenchmark();
runner.runAll().then(() => runner.runCustomBenchmark());
```

### Environment Variables

```bash
# Set custom benchmark parameters
export BENCHMARK_ITERATIONS=5
export BENCHMARK_DATASET_SIZES="100,500,1000"
export BENCHMARK_WARMUP_ITERATIONS=2

npm run benchmark
```

## Troubleshooting

### Common Issues

1. **Module not found**: Ensure all dependencies are installed
2. **Memory errors**: Reduce dataset sizes for low-memory systems
3. **Permission errors**: Check file permissions in benchmarks/temp-datasets/

### Debug Mode

```bash
# Enable debug logging
DEBUG=benchmark npm run benchmark
```

### Performance Profiling

```bash
# Profile Node.js performance
node --prof benchmarks/run-benchmarks.js
node --prof-process isolate-*.log > profile.txt
```

## Contributing Benchmarks

When adding new benchmarks:

1. **Document** the benchmark purpose and methodology
2. **Include environment capture** for reproducibility
3. **Add regression detection** with appropriate thresholds
4. **Update documentation** with new metrics
5. **Test** across different environments

## Data Retention

- **Results**: Kept indefinitely in `benchmarks/results/`
- **Temporary datasets**: Cleaned after each run
- **Baselines**: Manually managed (keep stable baselines)

## Performance Standards

Current baseline targets:
- **Translation Analysis**: <100ms for 1,000 keys
- **Configuration Validation**: <50ms for standard config
- **Memory Usage**: <100MB for 25,000 keys

These targets are continuously updated based on real-world usage patterns.