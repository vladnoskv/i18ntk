#!/usr/bin/env node
/**
 * Security Check Script
 * Validates that no child_process usage exists in production code
 */
 
 const fs = require('fs');
 const path = require('path');
 const SecurityUtils = require('../utils/security');
 
 class SecurityCheck {
   constructor() {
    this.productionDirs = ['main', 'utils', 'settings', 'scripts'];
    this.forbiddenPatterns = [
      /require\(['"]child_process['"]\)/,
      /import.*child_process/,
      /execSync\(/,
      /spawnSync\(/,
      /execFileSync\(/,
      /spawn\(/,
      /execFile\(/
    ];
    this.allowedFiles = [
      'dev/',           // Development files allowed to use child_process
      'benchmarks/',    // Benchmark scripts
      'test/',          // Test files
      'scripts/',       // Scripts directory
      'verify-package.js' // Package verification (development)
    ];
    this.violations = [];
  }
 
  async run() {
    console.log('🔒 i18ntk Security Check - Production Code Validation');
    console.log('═'.repeat(55));
    
    for (const dir of this.productionDirs) {
      await this.checkDirectory(dir);
    }
    
    if (this.violations.length > 0) {
      console.error('\n❌ SECURITY VIOLATIONS FOUND:');
      this.violations.forEach(violation => {
        console.error(`   ${violation.file}:${violation.line} - ${violation.pattern}`);
      });
      console.error('\n💡 Production code must not use child_process');
      process.exit(1);
    } else {
      console.log('\n✅ All security checks passed - no child_process usage in production code');
    }
  }
 
  async checkDirectory(dir) {
    const dirPath = path.join(process.cwd(), dir);
    
    if (!SecurityUtils.safeExistsSync(dirPath)) {
      return;
    }

    const files = this.getAllFiles(dirPath);
    
    for (const file of files) {
      await this.checkFile(file);
    }
  }
 
  getAllFiles(dirPath) {
    const files = [];
    try {
      const cwd = process.cwd();
      
      if (typeof dirPath !== 'string') {
        return files;
      }
      
      const entries = SecurityUtils.safeReaddirSync(dirPath, {}, cwd);
      
      if (!entries || entries.length === 0) {
        return files;
      }
      
      for (const entry of entries) {
        if (typeof entry === 'string') {
          const fullPath = path.join(dirPath, entry);
          const stats = SecurityUtils.safeStatSync(fullPath, cwd);
          
          if (stats && stats.isDirectory()) {
            files.push(...this.getAllFiles(fullPath));
          } else if (stats && stats.isFile() && entry.endsWith('.js')) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Silently handle directory access errors for security scanning
    }
    
    return files;
  }
 
  async checkFile(filePath) {
    const content = SecurityUtils.safeReadFileSync(filePath, 'utf8');
    if (!content) return;
    
    const relativePath = path.relative(process.cwd(), filePath);
    
    // Skip test files and development files
    if (relativePath.startsWith('test/') || 
        relativePath.includes('/test/') ||
        relativePath.includes('test-') ||
        relativePath.includes('benchmarks/')) {
      return;
    }
    
    // Skip smoke-pack.js as it's a build/test script
    if (relativePath.endsWith('smoke-pack.js')) {
      return;
    }
    
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip comments and string literals
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*') || trimmedLine.startsWith('/*')) {
        continue;
      }
      
      // Skip setup-validator.js compatibility check
      if (relativePath.endsWith('setup-validator.js') && line.includes('child_process')) {
        continue; // Skip compatibility check
      }
      
      // Check for actual child_process usage patterns (excluding compatibility checks)
      // Check for actual child_process usage patterns (excluding compatibility checks)
      const childProcessPatterns = [
        // Module imports
        /require\s*\(\s*['"]child_process['"]\s*\)/,
        /import\s+.*\s+from\s+['"]child_process['"]/,
        // Direct API calls with namespace
        /child_process\.(exec|execSync|execFile|execFileSync|spawn|spawnSync)\s*\(/,
        // Destructured or imported API calls
        /\b(execSync|spawnSync|execFileSync)\s*\([^)]*['"`]/,
        /\b(spawn|execFile)\s*\([^)]*['"`]/,
        // Special handling for exec to avoid false positives
        /(?<!\.)\bexec\s*\([^)]*['"`]/
      ];
      
      for (const pattern of childProcessPatterns) {
        if (pattern.test(line)) {
          this.violations.push({
            file: relativePath,
            line: i + 1,
            pattern: pattern.toString()
          });
          break; // Avoid duplicate violations for the same line
        }
      }
      for (const pattern of childProcessPatterns) {
        if (pattern.test(line) && !/\.exec\(/.test(line)) {
          this.violations.push({
            file: relativePath,
            line: i + 1,
            pattern: pattern.toString()
          });
        }
      }
    }
  }
 }
 
 if (require.main === module) {
   const check = new SecurityCheck();
   check.run().catch(console.error);
 }
 
 module.exports = SecurityCheck;