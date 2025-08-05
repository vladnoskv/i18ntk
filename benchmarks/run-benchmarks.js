#!/usr/bin/env node

/**
 * i18n Management Toolkit - Performance Benchmarking Framework
 * 
 * Provides reproducible performance measurements for:
 * - Translation analysis speed
 * - Memory usage patterns
 * - File processing throughput
 * - Configuration validation performance
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const os = require('os');

class BenchmarkRunner {
  constructor() {
    this.results = {
      metadata: {},
      benchmarks: {},
      timestamp: new Date().toISOString()
    };
  }

  async collectEnvironment() {
    this.results.metadata = {
      environment: {
        os: `${os.platform()} ${os.release()}`,
        nodeVersion: process.version,
        npmVersion: process.env.npm_version || 'unknown',
        cpu: os.cpus()[0]?.model || 'unknown',
        cpuCount: os.cpus().length,
        memory: {
          total: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 100) / 100 + ' GB',
          free: Math.round(os.freemem() / 1024 / 1024 / 1024 * 100) / 100 + ' GB'
        },
        architecture: os.arch()
      },
      configuration: {
        benchmarkVersion: '1.0.0',
        datasetSizes: [100, 1000, 10000, 50000], // translation keys
        iterations: 3,
        warmupIterations: 1
      }
    };
  }

  async createTestDataset(size) {
    const dataset = {
      en: {},
      es: {},
      de: {},
      fr: {}
    };

    for (let i = 0; i < size; i++) {
      const key = `test.key.${i}`;
      dataset.en[key] = `English text ${i}`;
      dataset.es[key] = `Spanish text ${i}`;
      dataset.de[key] = `German text ${i}`;
      dataset.fr[key] = `French text ${i}`;
    }

    const tempDir = path.join(__dirname, 'temp-datasets');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const datasetPath = path.join(tempDir, `dataset-${size}.json`);
    fs.writeFileSync(datasetPath, JSON.stringify(dataset, null, 2));
    
    return datasetPath;
  }

  async measureMemoryUsage(fn) {
    const before = process.memoryUsage();
    const start = performance.now();
    
    const result = await fn();
    
    const end = performance.now();
    const after = process.memoryUsage();
    
    return {
      executionTime: end - start,
      memory: {
        heapUsed: after.heapUsed - before.heapUsed,
        heapTotal: after.heapTotal - before.heapTotal,
        external: after.external - before.external,
        rss: after.rss - before.rss
      },
      result
    };
  }

  async runTranslationAnalysisBenchmark() {
    console.log('🏃 Running translation analysis benchmark...');
    
    const results = {};
    
    for (const size of this.results.metadata.configuration.datasetSizes) {
      console.log(`📊 Testing with ${size} translation keys...`);
      
      const datasetPath = await this.createTestDataset(size);
      const iterations = this.results.metadata.configuration.iterations;
      
      const measurements = [];
      
      // Warmup
      for (let i = 0; i < this.results.metadata.configuration.warmupIterations; i++) {
        await this.measureMemoryUsage(async () => {
          const { analyzeTranslations } = require('../main/i18ntk-analyze.js');
          return await analyzeTranslations(datasetPath);
        });
      }
      
      // Actual measurements
      for (let i = 0; i < iterations; i++) {
        const measurement = await this.measureMemoryUsage(async () => {
          const { analyzeTranslations } = require('../main/i18ntk-analyze.js');
          return await analyzeTranslations(datasetPath);
        });
        
        measurements.push(measurement);
      }
      
      // Calculate statistics
      const times = measurements.map(m => m.executionTime);
      const memoryUsages = measurements.map(m => m.memory.heapUsed);
      
      results[size] = {
        executionTime: {
          mean: times.reduce((a, b) => a + b) / times.length,
          min: Math.min(...times),
          max: Math.max(...times),
          stdDev: Math.sqrt(times.reduce((sq, n) => sq + Math.pow(n - times.reduce((a, b) => a + b) / times.length, 2), 0) / times.length)
        },
        memory: {
          mean: memoryUsages.reduce((a, b) => a + b) / memoryUsages.length,
          min: Math.min(...memoryUsages),
          max: Math.max(...memoryUsages),
          stdDev: Math.sqrt(memoryUsages.reduce((sq, n) => sq + Math.pow(n - memoryUsages.reduce((a, b) => a + b) / memoryUsages.length, 2), 0) / memoryUsages.length)
        },
        throughput: size / (times.reduce((a, b) => a + b) / times.length) * 1000 // keys per second
      };
    }
    
    this.results.benchmarks.translationAnalysis = results;
  }

  async runConfigurationValidationBenchmark() {
    console.log('⚙️ Running configuration validation benchmark...');
    
    const testConfigs = [
      { name: 'minimal', config: { languages: ['en', 'es'], sourceDir: './src' } },
      { name: 'standard', config: { languages: ['en', 'es', 'de', 'fr'], sourceDir: './src', outputDir: './locales' } },
      { name: 'full', config: { languages: ['en', 'es', 'de', 'fr', 'ru', 'ja', 'zh'], sourceDir: './src', outputDir: './locales', adminPin: 'test123', autoBackup: true } }
    ];

    const results = {};

    for (const { name, config } of testConfigs) {
      console.log(`🔧 Testing ${name} configuration...`);
      
      const measurements = [];
      const iterations = this.results.metadata.configuration.iterations;
      
      // Warmup
      for (let i = 0; i < this.results.metadata.configuration.warmupIterations; i++) {
        await this.measureMemoryUsage(async () => {
          const { validateConfiguration } = require('../utils/security-config.js');
          return await validateConfiguration(config);
        });
      }
      
      for (let i = 0; i < iterations; i++) {
        const measurement = await this.measureMemoryUsage(async () => {
          const { validateConfiguration } = require('../utils/security-config.js');
          return await validateConfiguration(config);
        });
        
        measurements.push(measurement);
      }
      
      const times = measurements.map(m => m.executionTime);
      results[name] = {
        executionTime: {
          mean: times.reduce((a, b) => a + b) / times.length,
          min: Math.min(...times),
          max: Math.max(...times),
          stdDev: Math.sqrt(times.reduce((sq, n) => sq + Math.pow(n - times.reduce((a, b) => a + b) / times.length, 2), 0) / times.length)
        }
      };
    }

    this.results.benchmarks.configurationValidation = results;
  }

  async runMemoryUsageBenchmark() {
    console.log('💾 Running memory usage benchmark...');
    
    const largeDatasetPath = await this.createTestDataset(25000);
    
    const measurement = await this.measureMemoryUsage(async () => {
      const { analyzeTranslations } = require('../main/i18ntk-analyze.js');
      return await analyzeTranslations(largeDatasetPath);
    });

    this.results.benchmarks.memoryUsage = {
      largeDatasetSize: 25000,
      memoryUsage: measurement.memory,
      executionTime: measurement.executionTime
    };
  }

  async saveResults() {
    const resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const filename = `benchmark-${new Date().toISOString().split('T')[0]}.json`;
    const filepath = path.join(resultsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));
    console.log(`📈 Results saved to: ${filepath}`);
    
    return filepath;
  }

  async compareWithBaseline() {
    const resultsDir = path.join(__dirname, 'results');
    const baselineFile = path.join(__dirname, 'baseline.json');
    
    if (!fs.existsSync(baselineFile)) {
      console.log('ℹ️ No baseline found, creating new baseline...');
      fs.writeFileSync(baselineFile, JSON.stringify(this.results, null, 2));
      return { hasBaseline: false };
    }

    const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
    const comparison = {
      timestamp: new Date().toISOString(),
      regressions: [],
      improvements: [],
      summary: {}
    };

    // Compare translation analysis performance
    for (const size of Object.keys(this.results.benchmarks.translationAnalysis || {})) {
      const current = this.results.benchmarks.translationAnalysis[size];
      const previous = baseline.benchmarks?.translationAnalysis?.[size];
      
      if (previous) {
        const timeDiff = current.executionTime.mean - previous.executionTime.mean;
        const timePercent = (timeDiff / previous.executionTime.mean) * 100;
        
        if (Math.abs(timePercent) > 10) { // 10% threshold
          if (timePercent > 0) {
            comparison.regressions.push({
              test: `translationAnalysis-${size}`,
              metric: 'executionTime',
              change: `${timePercent.toFixed(2)}% slower`,
              details: {
                previous: previous.executionTime.mean,
                current: current.executionTime.mean
              }
            });
          } else {
            comparison.improvements.push({
              test: `translationAnalysis-${size}`,
              metric: 'executionTime',
              change: `${Math.abs(timePercent).toFixed(2)}% faster`,
              details: {
                previous: previous.executionTime.mean,
                current: current.executionTime.mean
              }
            });
          }
        }
      }
    }

    const comparisonFile = path.join(resultsDir, `comparison-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(comparisonFile, JSON.stringify(comparison, null, 2));
    
    return {
      hasBaseline: true,
      comparison,
      file: comparisonFile
    };
  }

  async runAll() {
    const isCI = process.env.CI === 'true' || process.argv.includes('--ci-mode');
    
    if (isCI) {
      console.log('🚀 Running i18n Management Toolkit Benchmark Suite (CI Mode)...\n');
      // Reduce iterations for faster CI runs
      this.results.metadata.configuration.iterations = 2;
      this.results.metadata.configuration.warmupIterations = 0;
    } else {
      console.log('🚀 Starting i18n Management Toolkit Benchmark Suite...\n');
    }
    
    await this.collectEnvironment();
    
    try {
      await this.runTranslationAnalysisBenchmark();
      await this.runConfigurationValidationBenchmark();
      await this.runMemoryUsageBenchmark();
      
      const resultsPath = await this.saveResults();
      const comparison = await this.compareWithBaseline();
      
      console.log('\n📊 Benchmark Summary:');
      console.log(`Environment: ${this.results.metadata.environment.os} / Node ${this.results.metadata.environment.nodeVersion}`);
      console.log(`Results saved: ${resultsPath}`);
      
      if (comparison.hasBaseline) {
        console.log(`Regressions: ${comparison.comparison.regressions.length}`);
        console.log(`Improvements: ${comparison.comparison.improvements.length}`);
        
        if (isCI && comparison.comparison.regressions.length > 0) {
          console.log('\n❌ Performance regressions detected in CI mode');
          process.exit(1);
        }
      }
      
      // Print key metrics
      const analysis = this.results.benchmarks.translationAnalysis;
      if (analysis) {
        console.log('\n📈 Key Performance Metrics:');
        Object.keys(analysis).forEach(size => {
          const data = analysis[size];
          console.log(`${size} keys: ${data.executionTime.mean.toFixed(2)}ms avg (${data.throughput.toFixed(0)} keys/sec)`);
        });
      }
      
    } catch (error) {
      console.error('❌ Benchmark failed:', error.message);
      process.exit(1);
    }
  }
}

// CLI interface
if (require.main === module) {
  const runner = new BenchmarkRunner();
  runner.runAll();
}

module.exports = BenchmarkRunner;