#!/usr/bin/env node

/**
 * i18ntk Security Check Utility - IMPROVED VERSION
 * Performs comprehensive security validation before build/publish
 * Enhanced to intelligently distinguish between safe and dangerous requires
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SecurityChecker {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.projectRoot = path.resolve(__dirname, '..');
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      error: '\x1b[31m',
      warning: '\x1b[33m',
      success: '\x1b[32m',
      info: '\x1b[36m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  addIssue(message, file = null, line = null) {
    this.issues.push({ message, file, line, type: 'error' });
  }

  addWarning(message, file = null, line = null) {
    this.warnings.push({ message, file, line, type: 'warning' });
  }

  async checkFileExists(filePath) {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async readFile(filePath) {
    try {
      return await fs.promises.readFile(filePath, 'utf8');
    } catch (error) {
      this.addIssue(`Cannot read file: ${filePath}`, filePath);
      return null;
    }
  }

  async checkPackageJson() {
    this.log('Checking package.json security...');

    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const content = await this.readFile(packageJsonPath);

    if (!content) return;

    try {
      const pkg = JSON.parse(content);

      // Check for dangerous scripts
      const dangerousScripts = ['preinstall', 'postinstall', 'preuninstall', 'postuninstall'];
      const scripts = pkg.scripts || {};

      for (const script of dangerousScripts) {
        if (scripts[script]) {
          this.addWarning(`Potentially dangerous script found: ${script}`, packageJsonPath);
        }
      }

      // Check dependencies for known vulnerabilities (basic check)
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      for (const [dep, version] of Object.entries(allDeps || {})) {
        if (version.includes('*') || version.includes('latest')) {
          this.addWarning(`Unpinned dependency version: ${dep}@${version}`, packageJsonPath);
        }
      }

      // Verify security scripts exist
      const requiredScripts = ['security:check', 'security:test', 'security:audit'];
      for (const script of requiredScripts) {
        if (!scripts[script]) {
          this.addIssue(`Missing required security script: ${script}`, packageJsonPath);
        }
      }

    } catch (error) {
      this.addIssue(`Invalid JSON in package.json: ${error.message}`, packageJsonPath);
    }
  }

  async checkSecurityUtils() {
    this.log('Checking SecurityUtils implementation...');

    const securityUtilsPath = path.join(this.projectRoot, 'utils/security.js');
    if (!(await this.checkFileExists(securityUtilsPath))) {
      this.addIssue('SecurityUtils file not found', securityUtilsPath);
      return;
    }

    const content = await this.readFile(securityUtilsPath);
    if (!content) return;

    // Check for required security methods
    const requiredMethods = [
      'safeReadFileSync',
      'safeExistsSync',
      'safeWriteFileSync',
      'validatePath',
      'sanitizeInput',
      'safeParseJSON'
    ];

    for (const method of requiredMethods) {
      if (!content.includes(method)) {
        this.addIssue(`Missing security method: ${method}`, securityUtilsPath);
      }
    }

    // Check for dangerous patterns (excluding the overly broad require pattern)
    const dangerousPatterns = [
      /fs\.readFileSync\s*\(/g,
      /fs\.writeFileSync\s*\(/g,
      /fs\.existsSync\s*\(/g,
      /eval\s*\(/g,
      /Function\s*\(/g
    ];

    for (const pattern of dangerousPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        this.addWarning(`Potentially unsafe pattern found: ${pattern}`, securityUtilsPath);
      }
    }
  }

  async checkSourceFiles() {
    this.log('Checking source files for security issues...');

    const sourceDirs = ['main', 'utils', 'scripts', 'settings'];
    const excludeFiles = ['security.js', 'security-check.js', 'security-check-improved.js'];

    for (const dir of sourceDirs) {
      const dirPath = path.join(this.projectRoot, dir);
      if (!(await this.checkFileExists(dirPath))) continue;

      try {
        const files = await fs.promises.readdir(dirPath);
        for (const file of files) {
          if (!file.endsWith('.js') || excludeFiles.includes(file)) continue;

          const filePath = path.join(dirPath, file);
          const content = await this.readFile(filePath);
          if (!content) continue;

          await this.analyzeFileSecurity(filePath, content);
        }
      } catch (error) {
        this.addIssue(`Cannot read directory: ${dirPath}`, dirPath);
      }
    }
  }

  async analyzeFileSecurity(filePath, content) {
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Check for direct fs operations
      if (line.includes('fs.readFileSync(') && !line.includes('SecurityUtils')) {
        this.addIssue('Direct fs.readFileSync usage (use SecurityUtils.safeReadFileSync)', filePath, index + 1);
      }
      if (line.includes('fs.writeFileSync(') && !line.includes('SecurityUtils')) {
        this.addIssue('Direct fs.writeFileSync usage (use SecurityUtils.safeWriteFileSync)', filePath, index + 1);
      }
      if (line.includes('fs.existsSync(') && !line.includes('SecurityUtils')) {
        this.addIssue('Direct fs.existsSync usage (use SecurityUtils.safeExistsSync)', filePath, index + 1);
      }

      // Check for dangerous patterns
      if (line.includes('eval(') || line.includes('Function(')) {
        this.addIssue('Dangerous code execution pattern detected', filePath, index + 1);
      }

      // Check for unsafe require patterns - be more intelligent
      if (line.includes('require(')) {
        this.analyzeRequireStatement(line, filePath, index + 1);
      }
    });
  }

  analyzeRequireStatement(line, filePath, lineNumber) {
    // Extract the require path
    const requireMatch = line.match(/require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
    if (!requireMatch) return;

    const requirePath = requireMatch[1];

    // Skip safe built-in modules
    const safeBuiltins = ['fs', 'path', 'crypto', 'os', 'util', 'events', 'stream', 'buffer', 'http', 'https', 'url', 'querystring', 'child_process'];
    if (safeBuiltins.includes(requirePath)) {
      return; // Safe built-in module
    }

    // Skip safe relative requires within project structure
    if (requirePath.startsWith('../') || requirePath.startsWith('./')) {
      // Check if it's going too far up (more than 2 levels)
      const upLevels = (requirePath.match(/\.\.\//g) || []).length;
      if (upLevels > 2) {
        this.addWarning('Deep relative require (more than 2 levels up)', filePath, lineNumber);
      }
      // Otherwise, relative requires within project are generally safe
      return;
    }

    // Check for dynamic requires (variables)
    if (requirePath.includes('${') || requirePath.includes('+') || requirePath.includes('variable')) {
      this.addIssue('Dynamic require statement detected (potential security risk)', filePath, lineNumber);
      return;
    }

    // Check for absolute paths outside node_modules
    if (requirePath.startsWith('/') && !requirePath.includes('node_modules')) {
      this.addWarning('Absolute path require outside node_modules', filePath, lineNumber);
      return;
    }

    // Check for suspicious patterns
    const suspiciousPatterns = ['http://', 'https://', 'ftp://', '..', '~', '$HOME', '$USER'];
    for (const pattern of suspiciousPatterns) {
      if (requirePath.includes(pattern)) {
        this.addIssue(`Suspicious require path pattern: ${pattern}`, filePath, lineNumber);
        return;
      }
    }

    // If we get here, it's likely a safe npm package require
    // No action needed for legitimate package requires
  }

  async checkFilePermissions() {
    this.log('Checking file permissions...');

    const criticalFiles = [
      'utils/security.js',
      'tests/security.test.js',
      'package.json'
    ];

    for (const file of criticalFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (!(await this.checkFileExists(filePath))) {
        this.addIssue(`Critical file not found: ${file}`, filePath);
        continue;
      }

      try {
        const stats = await fs.promises.stat(filePath);
        const permissions = (stats.mode & parseInt('777', 8)).toString(8);

        // Check if file is writable by group or others
        if (permissions[1] !== '0' || permissions[2] !== '0') {
          this.addWarning(`File has overly permissive permissions: ${file} (${permissions})`, filePath);
        }
      } catch (error) {
        this.addIssue(`Cannot check permissions for: ${file}`, filePath);
      }
    }
  }

  async checkDependencies() {
    this.log('Checking for dependency vulnerabilities...');

    const packageJsonPath = path.join(this.projectRoot, 'package.json');
    const content = await this.readFile(packageJsonPath);

    if (!content) return;

    try {
      const pkg = JSON.parse(content);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      // Check for zero dependencies claim
      if (Object.keys(allDeps || {}).length > 0) {
        this.addWarning('Package claims zero dependencies but has dependencies in package.json');
      }

      // Check for suspicious dependency names
      const suspiciousDeps = ['malicious', 'hack', 'exploit', 'trojan'];
      for (const dep of Object.keys(allDeps || {})) {
        for (const suspicious of suspiciousDeps) {
          if (dep.toLowerCase().includes(suspicious)) {
            this.addIssue(`Suspicious dependency name: ${dep}`);
          }
        }
      }
    } catch (error) {
      this.addIssue(`Cannot parse package.json: ${error.message}`, packageJsonPath);
    }
  }

  async run() {
    this.log('Starting i18ntk Security Check (IMPROVED VERSION)...', 'info');

    try {
      await this.checkPackageJson();
      await this.checkSecurityUtils();
      await this.checkSourceFiles();
      await this.checkFilePermissions();
      await this.checkDependencies();

      // Generate report
      this.generateReport();

      // Final status with detailed counts
      const totalIssues = this.issues.length + this.warnings.length;
      if (this.issues.length > 0) {
        this.log(`Security check FAILED: ${this.issues.length} critical issues, ${this.warnings.length} warnings found`, 'error');
        this.log(`Total: ${totalIssues} issues detected`, 'error');
        // Ensure output is flushed before exit
        await new Promise(resolve => setImmediate(resolve));
        process.exit(1);
      } else if (this.warnings.length > 0) {
        this.log('Security check PASSED: No critical issues found', 'success');
        this.log(`${this.warnings.length} warnings found (non-blocking)`, 'warning');
        this.log(`Total: ${totalIssues} issues detected`, 'warning');
      } else {
        this.log('Security check PASSED: No issues found', 'success');
      }
    } catch (error) {
      this.log(`Security check failed with error: ${error.message}`, 'error');
      console.error('Stack trace:', error.stack);
      process.exit(1);
    }
  }

  generateReport() {
    if (this.issues.length === 0 && this.warnings.length === 0) {
      return;
    }

    console.log('\n=== SECURITY CHECK REPORT (IMPROVED) ===\n');

    if (this.issues.length > 0) {
      console.log('🔴 CRITICAL ISSUES:');
      this.issues.forEach(issue => {
        console.log(`  • ${issue.message}`);
        if (issue.file) {
          console.log(`    File: ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
        }
      });
      console.log('');
    }

    if (this.warnings.length > 0) {
      console.log('🟡 WARNINGS:');
      this.warnings.forEach(warning => {
        console.log(`  • ${warning.message}`);
        if (warning.file) {
          console.log(`    File: ${warning.file}${warning.line ? `:${warning.line}` : ''}`);
        }
      });
      console.log('');
    }
  }
}

// Run security check if called directly
if (require.main === module) {
  const checker = new SecurityChecker();
  checker.run().catch(error => {
    console.error('Security check failed:', error);
    process.exit(1);
  });
}

module.exports = SecurityChecker;
