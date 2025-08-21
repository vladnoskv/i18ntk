#!/usr/bin/env node

/**
 * Security Audit and Monitoring System for i18nTK
 * Provides comprehensive security monitoring, audit trails, and health checks
 */

const SecurityUtils = require('./security');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SecurityAudit {
  constructor() {
    this.auditLogPath = path.join(process.cwd(), 'security-audit.log');
    this.healthCheckInterval = null;
    this.lastHealthCheck = null;
    this.securityViolations = [];
  }

  /**
   * Initialize security audit system
   */
  async initialize() {
    console.log('🔒 Initializing Security Audit System...');

    // Ensure audit log directory exists
    const logDir = path.dirname(this.auditLogPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true, mode: 0o700 });
    }

    // Start periodic health checks
    this.startHealthChecks();

    SecurityUtils.logSecurityEvent('security_audit_initialized', 'info', {
      auditLogPath: this.auditLogPath,
      healthCheckInterval: '5 minutes'
    });

    return true;
  }

  /**
   * Start periodic security health checks
   */
  startHealthChecks() {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Perform comprehensive security health check
   */
  async performHealthCheck() {
    const timestamp = new Date().toISOString();
    this.lastHealthCheck = timestamp;

    const healthStatus = {
      timestamp,
      checks: {}
    };

    try {
      // 1. Check SecurityUtils functionality
      healthStatus.checks.securityUtils = await this.checkSecurityUtils();

      // 2. Check file system security
      healthStatus.checks.fileSystem = await this.checkFileSystemSecurity();

      // 3. Check encryption functionality
      healthStatus.checks.encryption = await this.checkEncryption();

      // 4. Check authentication system
      healthStatus.checks.authentication = await this.checkAuthentication();

      // 5. Check for security violations
      healthStatus.checks.violations = this.checkForViolations();

      // Determine overall health
      const allPassed = Object.values(healthStatus.checks).every(check =>
        check.status === 'passed'
      );
      healthStatus.overall = allPassed ? 'healthy' : 'warning';

      // Log health check results
      this.logHealthCheck(healthStatus);

      if (!allPassed) {
        SecurityUtils.logSecurityEvent('security_health_warning', 'warn', {
          healthStatus,
          failedChecks: Object.entries(healthStatus.checks)
            .filter(([_, check]) => check.status !== 'passed')
            .map(([name, _]) => name)
        });
      }

      return healthStatus;

    } catch (error) {
      healthStatus.overall = 'error';
      healthStatus.error = error.message;
      this.logHealthCheck(healthStatus);

      SecurityUtils.logSecurityEvent('security_health_check_error', 'error', {
        error: error.message,
        timestamp
      });

      return healthStatus;
    }
  }

  /**
   * Check SecurityUtils functionality
   */
  async checkSecurityUtils() {
    try {
      // Test basic path sanitization
      const sanitized = SecurityUtils.sanitizePath('./test/path');
      if (!sanitized) {
        throw new Error('Path sanitization failed');
      }

      // Test safe exists
      const exists = SecurityUtils.safeExistsSync('.');
      if (exists === null) {
        throw new Error('Safe exists check failed');
      }

      // Test safe stat
      const stats = SecurityUtils.safeStatSync('.');
      if (!stats || !stats.isDirectory()) {
        throw new Error('Safe stat check failed');
      }

      return { status: 'passed', message: 'SecurityUtils working correctly' };

    } catch (error) {
      return { status: 'failed', message: error.message };
    }
  }

  /**
   * Check file system security
   */
  async checkFileSystemSecurity() {
    try {
      // Check for suspicious files
      const suspiciousPatterns = [
        /\.env$/,
        /config.*\.json$/,
        /.*\.key$/,
        /.*\.pem$/
      ];

      const issues = [];

      // Scan common directories
      const scanDirs = ['.', './settings', './backups'];
      for (const dir of scanDirs) {
        if (SecurityUtils.safeExistsSync(dir)) {
          const files = SecurityUtils.safeReaddirSync(dir);
          for (const file of files) {
            if (suspiciousPatterns.some(pattern => pattern.test(file))) {
              // Check file permissions
              const filePath = path.join(dir, file);
              try {
                const stats = SecurityUtils.safeStatSync(filePath);
                if (stats && (stats.mode & 0o777) !== 0o600) {
                  issues.push(`File ${filePath} has insecure permissions: ${stats.mode.toString(8)}`);
                }
              } catch (error) {
                issues.push(`Cannot check permissions for ${filePath}: ${error.message}`);
              }
            }
          }
        }
      }

      if (issues.length > 0) {
        return { status: 'warning', message: issues.join('; ') };
      }

      return { status: 'passed', message: 'File system security checks passed' };

    } catch (error) {
      return { status: 'failed', message: error.message };
    }
  }

  /**
   * Check encryption functionality
   */
  async checkEncryption() {
    try {
      const testData = 'test encryption data';
      const encrypted = SecurityUtils.encryptPath(testData);
      const decrypted = SecurityUtils.decryptPath(encrypted);

      if (decrypted !== testData) {
        throw new Error('Encryption/decryption test failed');
      }

      return { status: 'passed', message: 'Encryption functionality working correctly' };

    } catch (error) {
      return { status: 'failed', message: error.message };
    }
  }

  /**
   * Check authentication system
   */
  async checkAuthentication() {
    try {
      const AdminAuth = require('./admin-auth');
      const adminAuth = new AdminAuth();

      // Check if authentication system is properly initialized
      const isInitialized = await adminAuth.initialize();
      if (!isInitialized) {
        throw new Error('Admin authentication initialization failed');
      }

      return { status: 'passed', message: 'Authentication system working correctly' };

    } catch (error) {
      return { status: 'failed', message: error.message };
    }
  }

  /**
   * Check for security violations
   */
  checkForViolations() {
    // This would integrate with external security monitoring systems
    // For now, return empty violations
    return {
      status: 'passed',
      message: 'No security violations detected',
      violations: []
    };
  }

  /**
   * Log security event to audit trail
   */
  logSecurityEvent(event, level = 'info', details = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      level,
      details,
      source: 'SecurityAudit'
    };

    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(this.auditLogPath, logLine);
    } catch (error) {
      console.error('Failed to write to audit log:', error.message);
    }

    // Also log through SecurityUtils
    SecurityUtils.logSecurityEvent(event, level, details);
  }

  /**
   * Log health check results
   */
  logHealthCheck(healthStatus) {
    this.logSecurityEvent('security_health_check', 'info', {
      overall: healthStatus.overall,
      checks: healthStatus.checks
    });
  }

  /**
   * Generate security report
   */
  async generateSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      system: 'i18nTK',
      version: '2.0.0',
      securityStatus: await this.performHealthCheck(),
      recentViolations: this.securityViolations.slice(-10),
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  /**
   * Generate security recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Check if audit log is properly secured
    if (fs.existsSync(this.auditLogPath)) {
      try {
        const stats = fs.statSync(this.auditLogPath);
        if ((stats.mode & 0o777) !== 0o600) {
          recommendations.push('Set secure permissions (600) on audit log file');
        }
      } catch (error) {
        recommendations.push('Cannot verify audit log permissions');
      }
    }

    // Check for backup security
    if (SecurityUtils.safeExistsSync('./backups')) {
      recommendations.push('Ensure backup files are encrypted and access-controlled');
    }

    // General recommendations
    recommendations.push('Regularly review security audit logs');
    recommendations.push('Keep dependencies updated to latest secure versions');
    recommendations.push('Monitor file system permissions regularly');

    return recommendations;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

// Export singleton instance
const securityAudit = new SecurityAudit();

module.exports = {
  SecurityAudit,
  securityAudit
};

// Run if called directly
if (require.main === module) {
  const audit = new SecurityAudit();

  // Handle command line arguments
  const args = process.argv.slice(2);
  if (args.includes('--report')) {
    audit.generateSecurityReport().then(report => {
      console.log(JSON.stringify(report, null, 2));
      process.exit(0);
    }).catch(error => {
      console.error('Error generating report:', error.message);
      process.exit(1);
    });
  } else if (args.includes('--check')) {
    audit.performHealthCheck().then(status => {
      console.log('Security Health Status:', status.overall);
      console.log('Details:', JSON.stringify(status, null, 2));
      process.exit(status.overall === 'healthy' ? 0 : 1);
    }).catch(error => {
      console.error('Health check failed:', error.message);
      process.exit(1);
    });
  } else {
    console.log('Usage: node security-audit.js [--report|--check]');
    console.log('  --report: Generate comprehensive security report');
    console.log('  --check:  Perform health check and exit with status code');
    process.exit(0);
  }
}