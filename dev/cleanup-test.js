#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Enhanced cleanup script for test directory management
 * Handles multiple test directories and provides detailed cleanup reporting
 */

class TestCleanupManager {
    constructor() {
        this.testDirectories = [
            'test-i18ntk-local',
            'temp-test-i18ntk',
            'i18ntk-test-output',
            'test-locales',
            'test-reports',
            'temp-framework-tests',
            'temp-security-tests',
            'test-backups',
            'i18ntk-test-config'
        ];
        
        this.logFile = path.join(process.cwd(), 'i18ntk-test-cleanup.log');
        this.cleanupReport = {
            timestamp: new Date().toISOString(),
            directories: [],
            errors: [],
            summary: {}
        };
    }

    /**
     * Log cleanup operations
     */
    log(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}`;
        console.log(logEntry);
        
        try {
            if (!fs.existsSync(this.logFile)) {
                fs.writeFileSync(this.logFile, '', 'utf8');
            }
            fs.appendFileSync(this.logFile, logEntry + '\n', 'utf8');
        } catch (error) {
            console.warn('Could not write to log file:', error.message);
        }
    }

    /**
     * Clean up a specific directory
     */
    cleanupDirectory(dirPath) {
        try {
            if (fs.existsSync(dirPath)) {
                const stats = fs.statSync(dirPath);
                const size = this.getDirectorySize(dirPath);
                
                fs.rmSync(dirPath, { recursive: true, force: true });
                
                this.cleanupReport.directories.push({
                    path: dirPath,
                    status: 'removed',
                    size: size,
                    exists: false
                });
                
                this.log(`✅ Removed: ${dirPath} (${this.formatBytes(size)})`);
                return true;
            } else {
                this.cleanupReport.directories.push({
                    path: dirPath,
                    status: 'not_found',
                    size: 0,
                    exists: false
                });
                
                this.log(`ℹ️  Skipped: ${dirPath} (not found)`);
                return false;
            }
        } catch (error) {
            this.cleanupReport.errors.push({
                path: dirPath,
                error: error.message
            });
            
            this.log(`❌ Error removing ${dirPath}: ${error.message}`);
            return false;
        }
    }

    /**
     * Calculate directory size
     */
    getDirectorySize(dirPath) {
        let totalSize = 0;
        
        try {
            if (fs.existsSync(dirPath)) {
                const files = fs.readdirSync(dirPath);
                
                for (const file of files) {
                    const filePath = path.join(dirPath, file);
                    const stats = fs.statSync(filePath);
                    
                    if (stats.isDirectory()) {
                        totalSize += this.getDirectorySize(filePath);
                    } else {
                        totalSize += stats.size;
                    }
                }
            }
        } catch (error) {
            // Ignore errors in size calculation
        }
        
        return totalSize;
    }

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Find additional test directories
     */
    findAdditionalTestDirectories() {
        const additionalDirs = [];
        
        try {
            const files = fs.readdirSync(process.cwd());
            
            for (const file of files) {
                const filePath = path.join(process.cwd(), file);
                const stats = fs.statSync(filePath);
                
                if (stats.isDirectory() && 
                    (file.startsWith('test-') || file.includes('temp') || file.includes('i18ntk-test'))) {
                    if (!this.testDirectories.includes(file)) {
                        additionalDirs.push(file);
                    }
                }
            }
        } catch (error) {
            // Ignore errors in directory scanning
        }
        
        return additionalDirs;
    }

    /**
     * Generate cleanup report
     */
    generateReport() {
        const removed = this.cleanupReport.directories.filter(d => d.status === 'removed').length;
        const skipped = this.cleanupReport.directories.filter(d => d.status === 'not_found').length;
        const errors = this.cleanupReport.errors.length;
        
        const totalSize = this.cleanupReport.directories
            .filter(d => d.status === 'removed')
            .reduce((sum, d) => sum + d.size, 0);
        
        this.cleanupReport.summary = {
            totalDirectories: this.cleanupReport.directories.length,
            removed,
            skipped,
            errors,
            totalSpaceFreed: totalSize
        };

        this.log(`\n📊 Cleanup Summary:`);
        this.log(`   Total directories processed: ${this.cleanupReport.directories.length}`);
        this.log(`   Directories removed: ${removed}`);
        this.log(`   Directories skipped: ${skipped}`);
        this.log(`   Errors encountered: ${errors}`);
        this.log(`   Total space freed: ${this.formatBytes(totalSize)}`);

        // Save report to file
        try {
            const reportPath = path.join(process.cwd(), 'i18ntk-cleanup-report.json');
            fs.writeFileSync(reportPath, JSON.stringify(this.cleanupReport, null, 2), 'utf8');
            this.log(`📄 Detailed report saved: ${reportPath}`);
        } catch (error) {
            this.log(`⚠️  Could not save report: ${error.message}`);
        }
    }

    /**
     * Run complete cleanup
     */
    async runCleanup() {
        this.log('🧹 Starting i18ntk test directory cleanup...\n');

        // Clean standard test directories
        for (const dir of this.testDirectories) {
            await this.cleanupDirectory(dir);
        }

        // Clean additional discovered directories
        const additionalDirs = this.findAdditionalTestDirectories();
        if (additionalDirs.length > 0) {
            this.log(`\n🔍 Found ${additionalDirs.length} additional test directories:`);
            for (const dir of additionalDirs) {
                await this.cleanupDirectory(dir);
            }
        }

        this.generateReport();
        this.log('\n✨ Cleanup completed successfully!');
    }
}

// Run cleanup if script is executed directly
if (require.main === module) {
    const cleaner = new TestCleanupManager();
    cleaner.runCleanup().catch(error => {
        console.error('Cleanup failed:', error);
        process.exit(1);
    });
}

module.exports = TestCleanupManager;
    