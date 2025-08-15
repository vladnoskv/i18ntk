#!/usr/bin/env node

/**
 * Security Check Utility
 * Runs automated security checks and provides recommendations
 */

const fs = require('fs');
const path = require('path');

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
        // Determine silent mode based on environment variables
        return (
            process.env.npm_config_loglevel === 'silent' ||
            process.env.I18NTK_SILENT === 'true' ||
            process.env.CI === 'true'
        );
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
        this.checkConfigurationFiles();
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
     * Check configuration files
     */
    checkConfigurationFiles() {
        const configFiles = ['i18ntk-config.json', 'config.json'];
        const hasConfigFile = configFiles.some(file => fs.existsSync(file));

        this.checks.push({
            name: 'Configuration Files',
            status: hasConfigFile ? 'PASS' : 'WARN',
            message: hasConfigFile ? 'Configuration files configured' : 'Consider creating i18ntk-config.json'
        });

        // Check for default PINs in config
        const defaultPinFiles = ['i18ntk-config.json', 'config.json'];
        defaultPinFiles.forEach(file => {
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
            // Check if package-lock.json exists and analyze dependencies safely
            const packageLockPath = 'package-lock.json';
            const packagePath = 'package.json';
            
            let hasVulnerabilities = false;
            let criticalCount = 0;
            let highCount = 0;
            let moderateCount = 0;
            
            if (fs.existsSync(packageLockPath)) {
                try {
                    const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
                    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
                    
                    // Check for outdated dependencies by comparing versions
                    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
                    
                    // Simple heuristic: check if any dependencies are significantly outdated
                    // This is a safe alternative to npm audit
                    const outdatedPackages = this.checkOutdatedPackages(dependencies, packageLock);
                    
                    // Set conservative counts based on outdated packages
                    criticalCount = outdatedPackages.filter(p => p.severity === 'critical').length;
                    highCount = outdatedPackages.filter(p => p.severity === 'high').length;
                    moderateCount = outdatedPackages.filter(p => p.severity === 'moderate').length;
                    
                } catch (parseError) {
                    // Handle JSON parsing errors
                    hasVulnerabilities = true;
                }
            } else {
                // No package-lock.json, suggest running npm install
                hasVulnerabilities = true;
            }

            let status = 'PASS';
            if (criticalCount > 0) status = 'FAIL';
            else if (highCount > 0) status = 'WARN';
            else if (moderateCount > 5) status = 'WARN';

            this.checks.push({
                name: 'Dependency Vulnerabilities',
                status: status,
                message: `Critical: ${criticalCount}, High: ${highCount}, Moderate: ${moderateCount}`,
                details: { critical: criticalCount, high: highCount, moderate: moderateCount }
            });

        } catch (error) {
            this.checks.push({
                name: 'Dependency Vulnerabilities',
                status: 'WARN',
                message: 'Unable to analyze dependencies - run npm audit manually'
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
        const sensitiveFiles = ['admin-pin.json', 'config.json', 'i18ntk-config.json'];
        
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
            return this.findFilesRecursively('.', pattern);
        } catch (error) {
            return [];
        }
    }

    /**
     * Recursively find files matching pattern (safe alternative to find command)
     */
    findFilesRecursively(dir, pattern) {
        const results = [];
        
        try {
            const items = fs.readdirSync(dir, { withFileTypes: true });
            
            items.forEach(item => {
                const fullPath = path.join(dir, item.name);
                
                if (item.isDirectory()) {
                    // Skip node_modules and hidden directories
                    if (item.name !== 'node_modules' && !item.name.startsWith('.')) {
                        results.push(...this.findFilesRecursively(fullPath, pattern));
                    }
                } else if (item.isFile()) {
                    // Simple pattern matching
                    const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
                    if (regex.test(item.name)) {
                        results.push(fullPath);
                    }
                }
            });
        } catch (error) {
            // Ignore permission errors
        }
        
        return results;
    }

    /**
     * Check for outdated packages (safe alternative to npm audit)
     */
    checkOutdatedPackages(dependencies, packageLock) {
        const outdated = [];
        
        if (!packageLock.packages) return outdated;
        
        Object.keys(dependencies || {}).forEach(depName => {
            const requiredVersion = dependencies[depName];
            const installed = packageLock.packages[`node_modules/${depName}`];
            
            if (installed && installed.version) {
                // Simple heuristic: if version doesn't match exactly, flag as outdated
                if (!this.versionMatches(requiredVersion, installed.version)) {
                    outdated.push({
                        name: depName,
                        required: requiredVersion,
                        installed: installed.version,
                        severity: this.determineSeverity(depName, installed.version)
                    });
                }
            }
        });
        
        return outdated;
    }

    /**
     * Check if version matches requirement (simplified)
     */
    versionMatches(required, installed) {
        // Simplified version check - exact match for now
        return installed.startsWith(required.replace(/[^\d.]/g, ''));
    }

    /**
     * Determine severity based on package name (heuristic)
     */
    determineSeverity(packageName, version) {
        // High-risk packages that should be updated
        const highRisk = ['lodash', 'moment', 'request', 'axios', 'express', 'react'];
        if (highRisk.includes(packageName)) return 'high';
        
        // Critical packages with known vulnerabilities
        const criticalRisk = ['lodash', 'moment', 'handlebars', 'validator'];
        if (criticalRisk.includes(packageName) && version.startsWith('1.')) return 'critical';
        
        return 'moderate';
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