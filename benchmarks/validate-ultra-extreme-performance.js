/**
 * Ultra-Extreme Performance Validation
 * Tests if ultra-extreme performance targets are achievable
 * Targets: 35ms processing, 10MB memory for 200k keys
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const UltraPerformanceOptimizer = require('../utils/ultra-performance-optimizer');

class UltraExtremePerformanceValidator {
  constructor() {
    this.testData = {
      keys: 200000,
      languages: 8,
      fileCount: 1000,
      totalSize: 12500000, // 12.5MB
      validation: {
        targetProcessingTime: 35.0,      // ms
        targetMemoryUsage: 10.0,          // MB
        targetThroughput: 5714286,        // keys/sec (5.7M)
        stretchProcessingTime: 30.0,      // stretch goal
        stretchMemoryUsage: 8.0,          // stretch goal
        stretchThroughput: 6666667        // stretch goal
      }
    };
    
    this.results = {
      processingTime: 0,
      memoryUsage: 0,
      throughput: 0,
      status: 'PENDING',
      details: {}
    };
  }

  /**
   * Generate ultra-optimized test data
   */
  generateUltraTestData() {
    const data = [];
    const languages = ['en', 'es', 'fr', 'de', 'ja', 'ru', 'zh', 'pt'];
    
    for (let i = 0; i < this.testData.keys; i++) {
      const key = `test.key.${Math.floor(i / 1000)}.${i % 1000}`;
      const translations = {};
      
      languages.forEach(lang => {
        translations[lang] = `${key}_${lang}_translation_${i}`;
      });
      
      data.push({ key, translations });
    }
    
    return data;
  }

  /**
   * Create ultra-optimized test files
   */
  async createUltraTestFiles() {
    const tempDir = path.join(__dirname, '.ultra-temp');
    
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    fs.mkdirSync(tempDir, { recursive: true });
    
    const testData = this.generateUltraTestData();
    const chunkSize = Math.ceil(testData.length / this.testData.fileCount);
    
    const files = [];
    for (let i = 0; i < this.testData.fileCount; i++) {
      const chunk = testData.slice(i * chunkSize, (i + 1) * chunkSize);
      const filePath = path.join(tempDir, `ultra-locale-${i}.json`);
      
      // Ultra-compact JSON
      const compactJson = JSON.stringify(chunk, null, 0);
      fs.writeFileSync(filePath, compactJson);
      files.push(filePath);
    }
    
    return { files, tempDir };
  }

  /**
   * Run ultra-extreme validation
   */
  async validateUltraExtreme() {
    console.log('🚀 Starting Ultra-Extreme Performance Validation');
    console.log('='.repeat(60));
    console.log(`Target: ${this.testData.validation.targetProcessingTime}ms processing`);
    console.log(`Target: ${this.testData.validation.targetMemoryUsage}MB memory usage`);
    console.log(`Target: ${(this.testData.validation.targetThroughput / 1000000).toFixed(2)}M keys/sec throughput`);
    console.log('');

    const { files, tempDir } = await this.createUltraTestFiles();
    
    try {
      const optimizer = new UltraPerformanceOptimizer({
        batchSize: 2000,
        concurrency: 32,
        memoryLimit: 256 * 1024 * 1024,
        cacheEnabled: true,
        cacheTTL: 180000,
        streaming: true,
        gcInterval: 250
      });

      console.log('📊 Processing ultra-extreme dataset...');
      console.log(`Files: ${files.length}`);
      console.log(`Total Keys: ${this.testData.keys}`);
      console.log(`Languages: ${this.testData.languages}`);
      console.log('');

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const startMemory = process.memoryUsage();
      const startTime = performance.now();

      const results = await optimizer.runUltraBenchmark(files);
      
      const endTime = performance.now();
      const endMemory = process.memoryUsage();

      // Calculate final metrics
      this.results.processingTime = Math.round((endTime - startTime) * 100) / 100;
      this.results.memoryUsage = Math.round((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024 * 100) / 100;
      this.results.throughput = Math.round(this.testData.keys / ((endTime - startTime) / 1000));

      await optimizer.shutdown();

      // Cleanup
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      return this.validateResults();
      
    } catch (error) {
      console.error('❌ Validation failed:', error);
      this.results.status = 'ERROR';
      this.results.details.error = error.message;
      return this.results;
    }
  }

  /**
   * Validate results against targets
   */
  validateResults() {
    const { targetProcessingTime, targetMemoryUsage, targetThroughput } = this.testData.validation;
    const { stretchProcessingTime, stretchMemoryUsage, stretchThroughput } = this.testData.validation;

    const timeValid = this.results.processingTime <= targetProcessingTime;
    const memoryValid = this.results.memoryUsage <= targetMemoryUsage;
    const throughputValid = this.results.throughput >= targetThroughput;

    const stretchTimeValid = this.results.processingTime <= stretchProcessingTime;
    const stretchMemoryValid = this.results.memoryUsage <= stretchMemoryUsage;
    const stretchThroughputValid = this.results.throughput >= stretchThroughput;

    this.results.status = timeValid && memoryValid && throughputValid ? '✅ VALID' : '❌ FAILED';
    this.results.details = {
      processingTime: {
        actual: this.results.processingTime,
        target: targetProcessingTime,
        stretch: stretchProcessingTime,
        status: stretchTimeValid ? '🎯 STRETCH' : timeValid ? '✅ PASS' : '❌ FAIL'
      },
      memoryUsage: {
        actual: this.results.memoryUsage,
        target: targetMemoryUsage,
        stretch: stretchMemoryUsage,
        status: stretchMemoryValid ? '🎯 STRETCH' : memoryValid ? '✅ PASS' : '❌ FAIL'
      },
      throughput: {
        actual: this.results.throughput,
        target: targetThroughput,
        stretch: stretchThroughput,
        status: stretchThroughputValid ? '🎯 STRETCH' : throughputValid ? '✅ PASS' : '❌ FAIL'
      },
      improvement: {
        baseline: 300,
        actual: this.results.processingTime,
        improvement: Math.round(((300 - this.results.processingTime) / 300) * 100 * 100) / 100
      }
    };

    return this.results;
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const { details } = this.results;
    
    console.log('\n📊 Ultra-Extreme Performance Report');
    console.log('='.repeat(50));
    
    console.log(`\n🎯 Processing Time:`);
    console.log(`  Actual: ${details.processingTime.actual}ms`);
    console.log(`  Target: ${details.processingTime.target}ms`);
    console.log(`  Stretch: ${details.processingTime.stretch}ms`);
    console.log(`  Status: ${details.processingTime.status}`);
    
    console.log(`\n💾 Memory Usage:`);
    console.log(`  Actual: ${details.memoryUsage.actual}MB`);
    console.log(`  Target: ${details.memoryUsage.target}MB`);
    console.log(`  Stretch: ${details.memoryUsage.stretch}MB`);
    console.log(`  Status: ${details.memoryUsage.status}`);
    
    console.log(`\n⚡ Throughput:`);
    console.log(`  Actual: ${(details.throughput.actual / 1000000).toFixed(2)}M keys/sec`);
    console.log(`  Target: ${(details.throughput.target / 1000000).toFixed(2)}M keys/sec`);
    console.log(`  Stretch: ${(details.throughput.stretch / 1000000).toFixed(2)}M keys/sec`);
    console.log(`  Status: ${details.throughput.status}`);
    
    console.log(`\n📈 Improvement:`);
    console.log(`  Baseline: 300ms`);
    console.log(`  Actual: ${details.improvement.actual}ms`);
    console.log(`  Improvement: ${details.improvement.improvement}%`);
    
    console.log(`\n${this.results.status} Ultra-Extreme Performance Validation`);
    
    return this.results;
  }

  /**
   * Save validation results
   */
  async saveResults() {
    const report = {
      timestamp: new Date().toISOString(),
      testData: this.testData,
      results: this.results,
      summary: {
        ultraExtremeAchieved: this.results.status === '✅ VALID',
        stretchGoalsAchieved: this.results.details.processingTime.status === '🎯 STRETCH',
        finalStatus: this.results.status
      }
    };

    const reportPath = path.join(__dirname, 'ultra-extreme-performance-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Results saved to: ${reportPath}`);
    return report;
  }
}

// CLI usage
async function main() {
  const validator = new UltraExtremePerformanceValidator();
  
  try {
    const results = await validator.validateUltraExtreme();
    validator.generateReport();
    await validator.saveResults();
    
    console.log('\n✅ Ultra-Extreme validation completed!');
    process.exit(results.status === '✅ VALID' ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Validation error:', error);
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = UltraExtremePerformanceValidator;

// CLI execution
if (require.main === module) {
  main();
}