#!/usr/bin/env node
/**
 * Security Check Script
 * Validates that no child_process usage exists in production code
 */

const fs = require('fs');
const path = require('path');

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
      /exec\(/,
      /execFile\(/ 
    ];
    this.allowedFiles = [
      'dev/',           // Development files allowed to use child_process
      'benchmarks/',    // Benchmark scripts
      'test/',          // Test files
      'scripts/deprecate-versions.js', // Allowed to use child_process for npm commands
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
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory()) {
        files.push(...this.getAllFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  async checkFile(filePath) {
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');

    for (const allowed of this.allowedFiles) {
      if (relativePath.startsWith(allowed)) {
        return;
      }
    }

    const content = SecurityUtils.safeReadFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const pattern of this.forbiddenPatterns) {
        if (pattern.test(line)) {
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
