#!/usr/bin/env node

/**
 * Basic Security Monitor for i18nTK
 * Lightweight security monitoring without complex dependencies
 */

const fs = require('fs');
const path = require('path');

class SecurityMonitor {
  constructor() {
    this.logPath = path.join(process.cwd(), 'security-monitor.log');
    this.checkInterval = null;
  }

  /**
   * Initialize security monitor
   */
  initialize() {
    console.log('🔍 Starting Security Monitor...');

    // Ensure log directory exists
    const logDir = path.dirname(this.logPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true, mode: 0o700 });
    }

    // Start monitoring
    this.startMonitoring();

    this.log('security_monitor_started', 'info', {
      logPath: this.logPath,
      interval: '5 minutes'
    });

    return true;
  }

  /**
   * Start periodic security monitoring
   */
  startMonitoring() {
    this.checkInterval = setInterval(() => {
      this.performBasicChecks();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Perform basic security checks
   */
  performBasicChecks() {
    const timestamp = new Date().toISOString();

    try {
      // 1. Check file system basics
      this.checkFileSystemBasics();

      // 2. Check for suspicious files
      this.checkForSuspiciousFiles();

      // 3. Check permissions
      this.checkPermissions();

      this.log('security_check_completed', 'info', {
        timestamp,
        status: 'healthy'
      });

    } catch (error) {
      this.log('security_check_error', 'error', {
        timestamp,
        error: error.message
      });
    }
  }

  /**
   * Check basic file system functionality
   */
  checkFileSystemBasics() {
    try {
      // Test basic directory operations
      const testDir = './temp-security-test';
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      // Test file operations
      const testFile = path.join(testDir, 'test.txt');
      fs.writeFileSync(testFile, 'test content');
      const content = fs.readFileSync(testFile, 'utf8');

      if (content !== 'test content') {
        throw new Error('File read/write test failed');
      }

      // Cleanup
      fs.unlinkSync(testFile);
      fs.rmdirSync(testDir);

    } catch (error) {
      this.log('filesystem_basic_check_failed', 'error', {
        error: error.message
      });
    }
  }

  /**
   * Check for suspicious files
   */
  checkForSuspiciousFiles() {
    const suspiciousPatterns = [
      /\.env$/,
      /.*\.key$/,
      /.*\.pem$/,
      /config.*\.json$/
    ];

    const scanDirs = ['.', './settings', './backups'];

    for (const dir of scanDirs) {
      if (fs.existsSync(dir)) {
        try {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            if (suspiciousPatterns.some(pattern => pattern.test(file))) {
              const filePath = path.join(dir, file);
              try {
                const stats = fs.statSync(filePath);
                console.log(`🔍 Checking permissions for ${filePath}: ${stats.mode.toString(8)} (expected: 600)`);
                if ((stats.mode & 0o777) !== 0o600) {
                  this.log('insecure_file_permissions', 'warning', {
                    file: filePath,
                    permissions: stats.mode.toString(8),
                    expected: '600'
                  });
                }
              } catch (error) {
                this.log('cannot_check_file_permissions', 'warning', {
                  file: filePath,
                  error: error.message
                });
              }
            }
          }
        } catch (error) {
          this.log('directory_scan_error', 'warning', {
            directory: dir,
            error: error.message
          });
        }
      }
    }
  }

  /**
   * Check file permissions
   */
  checkPermissions() {
    const criticalFiles = [
      'package.json',
      'package-lock.json',
      './.i18ntk-settings/.i18ntk-admin-config.json'
    ];

    for (const file of criticalFiles) {
      if (fs.existsSync(file)) {
        try {
          const stats = fs.statSync(file);
          // Check if file is readable by others
          if (stats.mode & 0o004) {
            this.log('file_world_readable', 'warning', {
              file,
              permissions: stats.mode.toString(8)
            });
          }
        } catch (error) {
          this.log('permission_check_error', 'warning', {
            file,
            error: error.message
          });
        }
      }
    }
  }

  /**
   * Log security event
   */
  log(event, level = 'info', details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      level,
      details,
      source: 'SecurityMonitor'
    };

    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(this.logPath, logLine);
    } catch (error) {
      console.error('Failed to write security log:', error.message);
    }

    // Also output to console for immediate visibility
    const levelEmoji = {
      'error': '❌',
      'warning': '⚠️',
      'info': 'ℹ️'
    };

    console.log(`${levelEmoji[level] || '🔍'} [SECURITY ${level.toUpperCase()}] ${event}`, details);
  }

  /**
   * Generate security status report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      system: 'i18nTK',
      version: '2.0.0',
      status: 'monitoring',
      lastCheck: new Date().toISOString(),
      recommendations: [
        'Regularly review security logs',
        'Ensure sensitive files have proper permissions (600)',
        'Keep system updated with latest security patches',
        'Monitor file system changes regularly'
      ]
    };

    return report;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Export singleton
const securityMonitor = new SecurityMonitor();

module.exports = {
  SecurityMonitor,
  securityMonitor
};

// Run if called directly
if (require.main === module) {
  const monitor = new SecurityMonitor();

  // Handle command line arguments
  const args = process.argv.slice(2);
  if (args.includes('--report')) {
    const report = monitor.generateReport();
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  } else if (args.includes('--check')) {
    monitor.performBasicChecks();
    console.log('✅ Security check completed');
    process.exit(0);
  } else if (args.includes('--start')) {
    monitor.initialize();
    console.log('🔍 Security monitor started. Press Ctrl+C to stop.');
    // Keep process running
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping security monitor...');
      monitor.cleanup();
      process.exit(0);
    });
  } else {
    console.log('Usage: node security-monitor.js [options]');
    console.log('  --start:  Start continuous monitoring');
    console.log('  --check:  Perform one-time security check');
    console.log('  --report: Generate security status report');
    process.exit(0);
  }
}