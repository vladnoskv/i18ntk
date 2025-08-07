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
            
            // Update processing settings to new optimized values
            settings.processing = {
                batchSize: 300,
                concurrency: 8,
                maxFileSize: 2097152,
                timeout: 15000,
                retryAttempts: 2,
                retryDelay: 500,
                cacheEnabled: true,
                cacheTTL: 7200000,
                validateOnSave: false,
                autoBackup: true,
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