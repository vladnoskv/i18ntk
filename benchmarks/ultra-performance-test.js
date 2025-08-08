const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class UltraPerformanceTest {
  constructor() {
    this.currentSettings = {
      processing: {
        batchSize: 300,
        concurrency: 8,
        timeout: 15000,
        retryAttempts: 2,
        maxFileSize: 2097152,
        validateOnLoad: true,
        cacheTTL: 300000,
        fileFilter: "**/*.{json,js,ts,jsx,tsx}"
      }
    };

    this.ultraSettings = {
      processing: {
        batchSize: 500,
        concurrency: 12,
        timeout: 10000,
        retryAttempts: 1,
        maxFileSize: 1048576,
        validateOnLoad: false,
        cacheTTL: 300000,
        fileFilter: "**/*.json"
      }
    };

    this.extremeSettings = {
      processing: {
        batchSize: 1000,
        concurrency: 16,
        timeout: 8000,
        retryAttempts: 0,
        maxFileSize: 524288,
        validateOnLoad: false,
        cacheTTL: 600000,
        fileFilter: "**/*.json"
      }
    };
  }

  generateTestData(count) {
    const data = {};
    for (let i = 0; i < count; i++) {
      data[`key_${i}`] = {
        en: `English text ${i}`,
        es: `Spanish text ${i}`,
        fr: `French text ${i}`,
        de: `German text ${i}`
      };
    }
    return data;
  }

  async simulateProcessing(data, settings) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    const keys = Object.keys(data);
    const batches = Math.ceil(keys.length / settings.processing.batchSize);
    
    for (let i = 0; i < batches; i++) {
      const batchKeys = keys.slice(i * settings.processing.batchSize, (i + 1) * settings.processing.batchSize);
      
      await new Promise(resolve => setTimeout(resolve, 1));
      
      if (settings.processing.validateOnLoad) {
        batchKeys.forEach(key => {
          if (data[key]) {
            Object.keys(data[key]).forEach(lang => {
              if (typeof data[key][lang] !== 'string') {
                throw new Error(`Invalid translation for ${key}.${lang}`);
              }
            });
          }
        });
      }
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;

    return {
      time: endTime - startTime,
      memory: endMemory - startMemory,
      batches
    };
  }

  async runSingleTest(size, settings) {
    const data = this.generateTestData(size);
    return await this.simulateProcessing(data, settings);
  }

  async testUltraSettings() {
    console.log('🚀 Ultra Performance Test Started');
    console.log('================================');

    const testCases = [
      { name: 'Current Optimized', settings: this.currentSettings },
      { name: 'Ultra Settings', settings: this.ultraSettings },
      { name: 'Extreme Settings', settings: this.extremeSettings }
    ];

    const results = [];
    const testSizes = [100, 1000, 5000, 10000, 25000];

    for (const testCase of testCases) {
      console.log(`\n📊 Testing ${testCase.name}...`);
      const caseResults = {
        name: testCase.name,
        settings: testCase.settings,
        results: []
      };

      for (const size of testSizes) {
        const result = await this.runSingleTest(size, testCase.settings);
        caseResults.results.push({ size, ...result });
        console.log(`   ${size} keys: ${result.time.toFixed(2)}ms, ${(result.memory / 1024 / 1024).toFixed(2)}MB`);
      }

      results.push(caseResults);
    }

    this.generateComparisonReport(results);
    return results;
  }

  generateComparisonReport(results) {
    console.log('\n📊 ULTRA PERFORMANCE COMPARISON');
    console.log('================================');

    const baseline = results[0]; // Current Optimized
    
    for (let i = 1; i < results.length; i++) {
      const testCase = results[i];
      console.log(`\n${testCase.name} vs Current Optimized:`);
      
      let totalTimeImprovement = 0;
      let totalMemoryImprovement = 0;
      
      for (let j = 0; j < baseline.results.length; j++) {
        const baselineResult = baseline.results[j];
        const testResult = testCase.results[j];
        
        const timeImprovement = ((baselineResult.time - testResult.time) / baselineResult.time) * 100;
        const memoryImprovement = ((baselineResult.memory - testResult.memory) / baselineResult.memory) * 100;
        
        totalTimeImprovement += timeImprovement;
        totalMemoryImprovement += memoryImprovement;
        
        console.log(`   ${baselineResult.size} keys: ${timeImprovement.toFixed(2)}% time, ${memoryImprovement.toFixed(2)}% memory`);
      }
      
      const avgTimeImprovement = totalTimeImprovement / baseline.results.length;
      const avgMemoryImprovement = totalMemoryImprovement / baseline.results.length;
      
      console.log(`   Average: ${avgTimeImprovement.toFixed(2)}% time, ${avgMemoryImprovement.toFixed(2)}% memory`);
      
      if (avgTimeImprovement > 0) {
        console.log(`   ✅ ${testCase.name} is ${avgTimeImprovement.toFixed(2)}% faster on average`);
      }
    }

    console.log('\n💡 OPTIMIZATION INSIGHTS:');
    console.log('   • Ultra Settings: Higher batch size (500) + concurrency (12)');
    console.log('   • Extreme Settings: Maximum batch size (1000) + concurrency (16)');
    console.log('   • Both reduce validation overhead and timeout values');
    console.log('   • Memory usage may increase with extreme settings');
  }

  async testMemoryVsSpeed() {
    console.log('\n🧠 Memory vs Speed Analysis');
    console.log('============================');

    const settings = [
      { name: 'Balanced', batchSize: 300, concurrency: 8 },
      { name: 'Memory-Optimized', batchSize: 200, concurrency: 6 },
      { name: 'Speed-Optimized', batchSize: 500, concurrency: 12 },
      { name: 'Extreme-Speed', batchSize: 1000, concurrency: 16 }
    ];

    const testSize = 5000;
    const results = [];

    for (const setting of settings) {
      const config = {
        processing: {
          batchSize: setting.batchSize,
          concurrency: setting.concurrency,
          timeout: 10000,
          retryAttempts: 1,
          maxFileSize: 1048576,
          validateOnLoad: false,
          cacheTTL: 300000,
          fileFilter: "**/*.json"
        }
      };

      const result = await this.runSingleTest(testSize, config);
      results.push({
        name: setting.name,
        batchSize: setting.batchSize,
        concurrency: setting.concurrency,
        time: result.time,
        memory: result.memory
      });
    }

    results.sort((a, b) => a.time - b.time);
    
    console.log('\nSpeed Ranking (fastest first):');
    results.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.name}: ${result.time.toFixed(2)}ms, ${(result.memory / 1024 / 1024).toFixed(2)}MB (batch: ${result.batchSize}, concurrency: ${result.concurrency})`);
    });
  }
}

async function runUltraTest() {
  const test = new UltraPerformanceTest();
  await test.testUltraSettings();
  await test.testMemoryVsSpeed();
}

if (require.main === module) {
  runUltraTest().catch(console.error);
}

module.exports = { UltraPerformanceTest };