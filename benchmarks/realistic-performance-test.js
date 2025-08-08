const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class RealisticPerformanceTest {
  constructor() {
    this.testCases = [
      {
        name: 'Conservative',
        settings: {
          processing: {
            batchSize: 100,
            concurrency: 4,
            timeout: 30000,
            retryAttempts: 3,
            maxFileSize: 10485760,
            validateOnLoad: true,
            cacheTTL: 300000
          }
        }
      },
      {
        name: 'Current Optimized',
        settings: {
          processing: {
            batchSize: 300,
            concurrency: 8,
            timeout: 15000,
            retryAttempts: 2,
            maxFileSize: 2097152,
            validateOnLoad: true,
            cacheTTL: 300000
          }
        }
      },
      {
        name: 'Ultra Fast',
        settings: {
          processing: {
            batchSize: 750,
            concurrency: 12,
            timeout: 10000,
            retryAttempts: 1,
            maxFileSize: 1048576,
            validateOnLoad: false,
            cacheTTL: 600000
          }
        }
      },
      {
        name: 'Memory Efficient',
        settings: {
          processing: {
            batchSize: 200,
            concurrency: 6,
            timeout: 20000,
            retryAttempts: 2,
            maxFileSize: 524288,
            validateOnLoad: true,
            cacheTTL: 180000
          }
        }
      }
    ];
  }

  generateRealisticData(count) {
    const data = {};
    const languages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'];
    const contexts = ['ui', 'error', 'success', 'warning', 'info', 'button', 'label', 'placeholder'];
    
    for (let i = 0; i < count; i++) {
      const key = `${contexts[i % contexts.length]}.test_key_${i}`;
      data[key] = {};
      
      languages.forEach(lang => {
        data[key][lang] = `Translation ${i} for ${lang}`;
      });
    }
    
    return data;
  }

  async simulateRealisticProcessing(data, settings, iterations = 3) {
    const results = [];
    
    for (let iter = 0; iter < iterations; iter++) {
      const startTime = performance.now();
      const startMemory = process.memoryUsage();

      const keys = Object.keys(data);
      const batches = Math.ceil(keys.length / settings.processing.batchSize);
      
      for (let i = 0; i < batches; i++) {
        const startIdx = i * settings.processing.batchSize;
        const endIdx = Math.min(startIdx + settings.processing.batchSize, keys.length);
        
        await new Promise(resolve => setTimeout(resolve, 0.5));
        
        if (settings.processing.validateOnLoad) {
          for (let j = startIdx; j < endIdx; j++) {
            const key = keys[j];
            if (data[key]) {
              Object.keys(data[key]).forEach(lang => {
                if (typeof data[key][lang] !== 'string') {
                  throw new Error(`Invalid translation for ${key}.${lang}`);
                }
              });
            }
          }
        }
      }

      const endTime = performance.now();
      const endMemory = process.memoryUsage();

      results.push({
        time: endTime - startTime,
        memory: endMemory.heapUsed - startMemory.heapUsed,
        batches,
        processed: keys.length
      });
    }

    const avgResult = {
      time: results.reduce((sum, r) => sum + r.time, 0) / results.length,
      memory: results.reduce((sum, r) => sum + r.memory, 0) / results.length,
      batches: results[0].batches,
      processed: results[0].processed
    };

    return avgResult;
  }

  async runComprehensiveTest() {
    console.log('🚀 Comprehensive Performance Analysis');
    console.log('====================================');
    
    const testSizes = [1000, 5000, 10000, 25000, 50000];
    const allResults = [];

    for (const testSize of testSizes) {
      console.log(`\n📊 Testing with ${testSize.toLocaleString()} keys...`);
      const data = this.generateRealisticData(testSize);
      
      const sizeResults = {
        keyCount: testSize,
        configurations: []
      };

      for (const testCase of this.testCases) {
        console.log(`   ${testCase.name}...`);
        const result = await this.simulateRealisticProcessing(data, testCase.settings);
        
        sizeResults.configurations.push({
          name: testCase.name,
          ...result,
          settings: testCase.settings.processing
        });
      }

      allResults.push(sizeResults);
    }

    this.generateDetailedReport(allResults);
    return allResults;
  }

  generateDetailedReport(results) {
    console.log('\n📊 COMPREHENSIVE PERFORMANCE REPORT');
    console.log('====================================');

    results.forEach(sizeResult => {
      const { keyCount } = sizeResult;
      console.log(`\n${keyCount.toLocaleString()} Keys:`);
      
      const sortedBySpeed = [...sizeResult.configurations].sort((a, b) => a.time - b.time);

      console.log('   Performance Results:');
      sortedBySpeed.forEach((config, index) => {
        const timeMs = config.time.toFixed(1);
        const memoryMB = (config.memory / 1024 / 1024).toFixed(2);
        console.log(`   ${index + 1}. ${config.name}: ${timeMs}ms, ${memoryMB}MB (batch: ${config.settings.batchSize}, concurrency: ${config.settings.concurrency})`);
      });
    });

    this.calculateBestOverallConfig(results);
  }

  calculateBestOverallConfig(results) {
    const configScores = {};

    this.testCases.forEach(testCase => {
      configScores[testCase.name] = {
        name: testCase.name,
        times: [],
        memories: []
      };
    });

    results.forEach(sizeResult => {
      sizeResult.configurations.forEach(config => {
        configScores[config.name].times.push(config.time);
        configScores[config.name].memories.push(config.memory);
      });
    });

    const rankedConfigs = Object.values(configScores).map(config => ({
      ...config,
      avgTime: config.times.reduce((a, b) => a + b, 0) / config.times.length,
      avgMemory: config.memories.reduce((a, b) => a + b, 0) / config.memories.length
    }));

    rankedConfigs.sort((a, b) => a.avgTime - b.avgTime);
    
    console.log('\n🏆 FINAL RECOMMENDATIONS');
    console.log('========================');
    console.log('Fastest Configuration Ranking:');
    rankedConfigs.forEach((config, index) => {
      console.log(`   ${index + 1}. ${config.name}: ${config.avgTime.toFixed(1)}ms avg, ${(config.avgMemory / 1024 / 1024).toFixed(2)}MB avg`);
    });

    const winner = rankedConfigs[0];
    console.log(`\n🎯 RECOMMENDED: ${winner.name}`);
    console.log(`   Expected performance: ${winner.avgTime.toFixed(1)}ms average processing time`);
    console.log(`   Memory efficiency: ${(winner.avgMemory / 1024 / 1024).toFixed(2)}MB average`);
  }

  saveResults(results) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `realistic-performance-${timestamp}.json`;
    const filepath = path.join(__dirname, 'results', filename);

    const output = {
      timestamp: new Date().toISOString(),
      configurations: this.testCases.length,
      testSizes: results.map(r => r.keyCount),
      detailedResults: results
    };

    try {
      if (!fs.existsSync(path.dirname(filepath))) {
        fs.mkdirSync(path.dirname(filepath), { recursive: true });
      }
      fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
      console.log(`\n📄 Results saved to: ${filepath}`);
    } catch (error) {
      console.log(`\n⚠️  Could not save results: ${error.message}`);
    }
  }
}

async function runRealisticTest() {
  const test = new RealisticPerformanceTest();
  const results = await test.runComprehensiveTest();
  test.saveResults(results);
}

if (require.main === module) {
  runRealisticTest().catch(console.error);
}

module.exports = { RealisticPerformanceTest };