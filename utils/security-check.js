#!/usr/bin/env node

/**
 * Security Check Utility
 * Runs automated security checks and provides recommendations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SecurityChecker {
    constructor() {
        this.checks = [];
        this.recommendations = [];
        this.isSilent = this.shouldBeSilent();
    }

    /**
     * Check if we should suppress output (e.g., during npm install)
     */
    shouldBeSilent() {
        // Check if running during npm install/postinstall
        const npmCommand = process.env.npm_command || '';
        const npmLifecycleEvent = process.env.npm_lifecycle_event || '';
        
        // Suppress output during install, postinstall, prepublishOnly
        const silentEvents = ['install', 'postinstall', 'prepublishOnly', 'publish'];
        
        return silentEvents.includes(npmCommand) || 
               silentEvents.includes(npmLifecycleEvent) ||
               process.env.NODE_ENV === 'production' ||
               process.env.SILENT === 'true';
    }

    /**
     * Log message only if not silent
     */
    log(message) {
        if (!this.isSilent) {
            console.log(message);
        }
    }

    /**
     * Run all security checks
     */
    async runSecurityChecks() {
        this.log('🔍 Running security checks...\n');

        this.checkSensitiveFiles();
        this.checkEnvironmentConfig();
        this.checkDependencies();
        this.checkEncryptionConfig();
        this.checkAccessPermissions();

        this.generateReport();
    }

    /**
     * Check for sensitive files that shouldn't be committed
     */
    checkSensitiveFiles() {
        const sensitivePatterns = [
            '.env',
            '*.key',
            '*.pem',
            'admin-pin.json',
            'config.json',
            'secrets.json'
        ];

        const gitignorePath = '.gitignore';
        let gitignoreContent = '';
        
        if (fs.existsSync(gitignorePath)) {
            gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
        }

        const issues = [];
        sensitivePatterns.forEach(pattern => {
            const files = this.findFiles(pattern);
            files.forEach(file => {
                if (!gitignoreContent.includes(file)) {
                    issues.push(file);
                }
            });
        });

        this.checks.push({
            name: 'Sensitive Files Protection',
            status: issues.length === 0 ? 'PASS' : 'WARN',
            issues: issues,
            message: issues.length > 0 ? `${issues.length} sensitive files not in .gitignore` : 'All sensitive files protected'
        });
    }

    /**
     * Check environment configuration
     */
    checkEnvironmentConfig() {
        const envFiles = ['.env', '.env.local', '.env.production'];
        const hasEnvFile = envFiles.some(file => fs.existsSync(file));
        const hasEnvExample = fs.existsSync('.env.example');

        this.checks.push({
            name: 'Environment Configuration',
            status: hasEnvFile || hasEnvExample ? 'PASS' : 'WARN',
            message: hasEnvFile ? 'Environment files configured' : hasEnvExample ? 'Environment template available' : 'Consider creating .env.example'
        });

        // Check for default PINs in config
        const configFiles = ['i18ntk-config.json', 'config.json'];
        configFiles.forEach(file => {
            if (fs.existsSync(file)) {
                try {
                    const config = JSON.parse(fs.readFileSync(file, 'utf8'));
                    if (config.adminPin && ['1234', '0000', 'admin', 'password'].includes(config.adminPin)) {
                        this.checks.push({
                            name: 'Default PIN Check',
                            status: 'FAIL',
                            message: `Default PIN detected in ${file}: ${config.adminPin}`
                        });
                    }
                } catch (error) {
                    // Ignore parse errors
                }
            }
        });
    }

    /**
     * Check dependencies for vulnerabilities
     */
    checkDependencies() {
        try {
            const auditResult = execSync('npm audit --json', { encoding: 'utf8', stdio: 'pipe' });
            const audit = JSON.parse(auditResult);
            
            const critical = audit.metadata?.vulnerabilities?.critical || 0;
            const high = audit.metadata?.vulnerabilities?.high || 0;
            const moderate = audit.metadata?.vulnerabilities?.moderate || 0;

            let status = 'PASS';
            if (critical > 0) status = 'FAIL';
            else if (high > 0) status = 'WARN';
            else if (moderate > 5) status = 'WARN';

            this.checks.push({
                name: 'Dependency Vulnerabilities',
                status: status,
                message: `Critical: ${critical}, High: ${high}, Moderate: ${moderate}`,
                details: { critical, high, moderate }
            });

        } catch (error) {
            this.checks.push({
                name: 'Dependency Vulnerabilities',
                status: 'WARN',
                message: 'Unable to run npm audit - run manually'
            });
        }
    }

    /**
     * Check encryption configuration
     */
    checkEncryptionConfig() {
        const adminPinPath = 'admin-pin.json';
        
        if (fs.existsSync(adminPinPath)) {
            try {
                const pinData = JSON.parse(fs.readFileSync(adminPinPath, 'utf8'));
                
                // Check for old encryption methods
                if (pinData.hash && pinData.hash.length === 64) {
                    // SHA256 hash - old method
                    this.checks.push({
                        name: 'Encryption Method',
                        status: 'WARN',
                        message: 'Old SHA256 hashing detected - consider upgrading to scrypt'
                    });
                }
                
                // Check for secure algorithm
                if (pinData.algorithm && ['scrypt', 'pbkdf2'].includes(pinData.algorithm)) {
                    this.checks.push({
                        name: 'Hashing Algorithm',
                        status: 'PASS',
                        message: `Using secure hashing: ${pinData.algorithm}`
                    });
                }

            } catch (error) {
                this.checks.push({
                    name: 'Encryption Configuration',
                    status: 'WARN',
                    message: 'Unable to read PIN configuration'
                });
            }
        } else {
            this.checks.push({
                name: 'Encryption Configuration',
                status: 'INFO',
                message: 'No PIN configuration found - will be created on first admin setup'
            });
        }
    }

    /**
     * Check file permissions
     */
    checkAccessPermissions() {
        const sensitiveFiles = ['admin-pin.json', '.env', 'config.json'];
        
        sensitiveFiles.forEach(file => {
            if (fs.existsSync(file)) {
                try {
                    const stats = fs.statSync(file);
                    const mode = stats.mode & parseInt('777', 8);
                    
                    if (mode > parseInt('600', 8)) {
                        this.checks.push({
                            name: `File Permissions (${file})`,
                            status: 'WARN',
                            message: `File permissions are ${mode.toString(8)} - consider 600 or stricter`
                        });
                    } else {
                        this.checks.push({
                            name: `File Permissions (${file})`,
                            status: 'PASS',
                            message: 'File permissions are secure'
                        });
                    }
                } catch (error) {
                    // Ignore permission errors
                }
            }
        });
    }

    /**
     * Find files matching pattern
     */
    findFiles(pattern) {
        try {
            const files = execSync(`find . -name "${pattern}" -type f`, { encoding: 'utf8' });
            return files.trim().split('\n').filter(f => f && !f.includes('node_modules'));
        } catch (error) {
            return [];
        }
    }

    /**
     * Generate security report
     */
    generateReport() {
        if (this.isSilent) {
            // In silent mode, just exit without showing any output
            const summary = {
                PASS: 0,
                WARN: 0,
                FAIL: 0,
                INFO: 0
            };

            this.checks.forEach(check => {
                summary[check.status]++;
            });

            // Still exit with appropriate code for CI/CD
            if (summary.FAIL > 0) {
                process.exit(1);
            } else {
                process.exit(0);
            }
            return;
        }

        this.log('\n📊 Security Check Report\n');
        
        const summary = {
            PASS: 0,
            WARN: 0,
            FAIL: 0,
            INFO: 0
        };

        this.checks.forEach(check => {
            summary[check.status]++;
            const icon = {
                PASS: '✅',
                WARN: '⚠️',
                FAIL: '❌',
                INFO: 'ℹ️'
            }[check.status];
            
            this.log(`${icon} ${check.name}: ${check.message}`);
            if (check.issues) {
                check.issues.forEach(issue => this.log(`   - ${issue}`));
            }
        });

        this.log('\n📈 Summary:');
        this.log(`✅ PASS: ${summary.PASS}`);
        this.log(`⚠️  WARN: ${summary.WARN}`);
        this.log(`❌ FAIL: ${summary.FAIL}`);
        this.log(`ℹ️  INFO: ${summary.INFO}`);

        // Provide recommendations
        this.log('\n🔧 Recommendations:');
        
        if (summary.FAIL > 0) {
            this.log('🚨 Critical issues found - address immediately:');
            this.log('   - Run: npm audit fix');
            this.log('   - Review and update default passwords');
            this.log('   - Check .gitignore for sensitive files');
        }
        
        if (summary.WARN > 0) {
            this.log('⚠️  Warnings to address:');
            this.log('   - Review file permissions');
            this.log('   - Update dependencies');
            this.log('   - Create .env.example if missing');
        }

        this.log('\n📚 For more information, see:');
        this.log('   - SECURITY.md - Complete security guide');
        this.log('   - npm run security:config - Generate secure configuration');
        this.log('   - npm run security:audit - Run vulnerability scan');

        // Exit with appropriate code
        if (summary.FAIL > 0) {
            process.exit(1);
        } else if (summary.WARN > 0) {
            process.exit(0); // Warnings don't fail the build
        }
    }
}

// Run security checks if called directly
if (require.main === module) {
    const checker = new SecurityChecker();
    checker.runSecurityChecks().catch(console.error);
}

module.exports = SecurityChecker;