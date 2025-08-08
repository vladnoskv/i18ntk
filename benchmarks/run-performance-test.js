/**
 * Quick Performance Test Runner
 * Runs performance comparison and updates settings
 */

const fs = require('fs');
const path = require('path');
const PerformanceBenchmark = require('./performance-comparison');

async function runPerformanceTest() {
    console.log('🚀 Starting Performance Optimization Test\n');

    try {
        // Run the benchmark
        const benchmark = new PerformanceBenchmark();
        const results = await benchmark.run();

        // Update settings with new processing configuration
        const settingsPath = path.join(__dirname, '..', 'settings', 'i18ntk-config.json');
        
        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            
            // Update processing settings to EXTREME performance values
            settings.processing = {
                batchSize: 1000,           // Maximum batch processing
                concurrency: 16,           // Maximum parallel processing
                maxFileSize: 524288,     // Optimized file size limit (512KB)
                timeout: 8000,           // Reduced timeout for speed
                retryAttempts: 0,        // No retries for speed
                retryDelay: 0,           // No retry delay
                cacheEnabled: true,      // Enable caching
                cacheTTL: 600000,       // 10-minute cache TTL
                validateOnSave: false,   // Skip validation for speed
                autoBackup: false,       // Disable backup for speed
                notTranslatedMarker: "NOT_TRANSLATED",
                excludeFiles: [
                    ".DS_Store",
                    "Thumbs.db",
                    "*.tmp",
                    "*.bak",
                    "*.log",
                    "~*",
                    "*.swp"
                ]
            };

            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
            console.log('✅ Settings updated with new processing configuration');
        }

        console.log('\n🎯 Performance Test Complete!');
        console.log('📊 Check the results in benchmarks/results/ directory');
        
    } catch (error) {
        console.error('❌ Performance test failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    runPerformanceTest();
}

module.exports = { runPerformanceTest };