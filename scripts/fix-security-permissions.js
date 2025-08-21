#!/usr/bin/env node

/**
 * Security Permissions Fix Script
 * Fixes insecure file permissions identified by security monitoring
 */

const fs = require('fs');
const path = require('path');

class SecurityPermissionsFixer {
  constructor() {
    this.fixedFiles = [];
    this.errors = [];
  }

  /**
   * Fix permissions for sensitive files
   */
  fixPermissions() {
    console.log('🔒 Fixing Security Permissions...\n');

    // Files that should have restrictive permissions (600)
    const sensitiveFiles = [
      '.env',
      '.i18ntk-settings/.i18ntk-admin-config.json',
      'i18ntk-config.json',
      '.i18ntk-settings/framework-config.json',
      '.i18ntk-settings/i18ntk-config.json',
      '.i18ntk-settings/language-config.json',
      'security-monitor.log',
      'security-audit.log'
    ];

    // Files that should have read-only permissions for others (644)
    const publicFiles = [
      'package.json',
      'package-lock.json',
      'README.md',
      'LICENSE'
    ];

    console.log('1. Fixing sensitive files (600 permissions)...');
    for (const file of sensitiveFiles) {
      if (fs.existsSync(file)) {
        try {
          const beforeStats = fs.statSync(file);
          console.log(`   🔧 Before: ${file} -> ${beforeStats.mode.toString(8)}`);
          fs.chmodSync(file, 0o600);
          const afterStats = fs.statSync(file);
          console.log(`   🔧 After: ${file} -> ${afterStats.mode.toString(8)}`);
          this.fixedFiles.push({ file, permissions: '600' });
          console.log(`   ✅ ${file} -> 600`);
        } catch (error) {
          this.errors.push({ file, error: error.message });
          console.log(`   ❌ ${file} -> Failed: ${error.message}`);
        }
      }
    }

    console.log('\n2. Fixing public files (644 permissions)...');
    for (const file of publicFiles) {
      if (fs.existsSync(file)) {
        try {
          const beforeStats = fs.statSync(file);
          console.log(`   🔧 Before: ${file} -> ${beforeStats.mode.toString(8)}`);
          fs.chmodSync(file, 0o644);
          const afterStats = fs.statSync(file);
          console.log(`   🔧 After: ${file} -> ${afterStats.mode.toString(8)}`);
          this.fixedFiles.push({ file, permissions: '644' });
          console.log(`   ✅ ${file} -> 644`);
        } catch (error) {
          this.errors.push({ file, error: error.message });
          console.log(`   ❌ ${file} -> Failed: ${error.message}`);
        }
      }
    }

    // Fix permissions recursively for settings directory
    console.log('\n3. Fixing settings directory permissions...');
    this.fixDirectoryPermissions('./.i18ntk-settings', 0o700);

    // Fix permissions for logs directory
    console.log('\n4. Fixing logs directory permissions...');
    if (fs.existsSync('./logs')) {
      this.fixDirectoryPermissions('./logs', 0o700);
    }

    this.generateReport();
  }

  /**
   * Fix permissions for all files in a directory
   */
  fixDirectoryPermissions(dirPath, dirPerm = 0o700, filePerm = 0o600) {
    if (!fs.existsSync(dirPath)) {
      return;
    }

    try {
      // Set directory permissions
      fs.chmodSync(dirPath, dirPerm);
      console.log(`   ✅ ${dirPath} -> ${dirPerm.toString(8)}`);

      // Fix permissions for all files in directory
      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        try {
          const stats = fs.statSync(filePath);
          if (stats.isDirectory()) {
            this.fixDirectoryPermissions(filePath, dirPerm, filePerm);
          } else {
            const beforeStats = fs.statSync(filePath);
            console.log(`   🔧 Before: ${filePath} -> ${beforeStats.mode.toString(8)}`);
            fs.chmodSync(filePath, filePerm);
            const afterStats = fs.statSync(filePath);
            console.log(`   🔧 After: ${filePath} -> ${afterStats.mode.toString(8)}`);
            this.fixedFiles.push({ file: filePath, permissions: filePerm.toString(8) });
          }
        } catch (error) {
          this.errors.push({ file: filePath, error: error.message });
          console.log(`   ❌ ${filePath} -> Failed: ${error.message}`);
        }
      }
    } catch (error) {
      this.errors.push({ file: dirPath, error: error.message });
      console.log(`   ❌ ${dirPath} -> Failed: ${error.message}`);
    }
  }

  /**
   * Generate security fix report
   */
  generateReport() {
    console.log('\n📋 Security Permissions Fix Report');
    console.log('═'.repeat(40));

    if (this.fixedFiles.length > 0) {
      console.log(`\n✅ Files Fixed (${this.fixedFiles.length}):`);
      this.fixedFiles.forEach(({ file, permissions }) => {
        console.log(`   ${file} -> ${permissions}`);
      });
    }

    if (this.errors.length > 0) {
      console.log(`\n❌ Errors (${this.errors.length}):`);
      this.errors.forEach(({ file, error }) => {
        console.log(`   ${file}: ${error}`);
      });
    }

    const success = this.errors.length === 0;
    console.log(`\n${success ? '🎉' : '⚠️'} Security permissions fix ${success ? 'completed successfully' : 'completed with errors'}`);

    if (success) {
      console.log('\n🔒 Security Recommendations:');
      console.log('   • Keep sensitive files with 600 permissions');
      console.log('   • Regularly audit file permissions');
      console.log('   • Use security monitoring to detect issues early');
      console.log('   • Consider using file system access controls');
    }
  }
}

// Run if called directly
if (require.main === module) {
  const fixer = new SecurityPermissionsFixer();
  fixer.fixPermissions();
}

module.exports = SecurityPermissionsFixer;