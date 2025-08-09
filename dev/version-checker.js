#!/usr/bin/env node

/**
 * i18ntk Version Checker
 * Validates version consistency across all project files
 * 
 * @version 1.6.3
 * @author i18ntk Team
 */

const fs = require('fs');
const path = require('path');

class VersionChecker {
  constructor() {
    this.currentVersion = '1.6.3';
    this.versionSources = [];
    this.inconsistencies = [];
    this.warnings = [];
  }

  async run() {
    console.log('🔍 i18ntk Version Consistency Checker');
    console.log(`📦 Expected version: ${this.currentVersion}`);
    console.log('🔎 Scanning all version references...\n');

    try {
      await this.checkAllVersions();
      this.printReport();
    } catch (error) {
      console.error('❌ Error during version check:', error.message);
      process.exit(1);
    }
  }

  async checkAllVersions() {
    // Check package.json
    this.checkPackageJson();
    
    // Check main files
    this.checkMainFiles();
    
    // Check documentation
    this.checkDocumentation();
    
    // Check changelog
    this.checkChangelog();
    
    // Check scripts
    this.checkScripts();
  }

  checkPackageJson() {
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      this.versionSources.push({
        source: 'package.json',
        version: packageJson.version,
        correct: packageJson.version === this.currentVersion,
        file: packagePath
      });
      
      // Check versionInfo
      if (packageJson.versionInfo) {
        this.versionSources.push({
          source: 'package.json versionInfo.version',
          version: packageJson.versionInfo.version,
          correct: packageJson.versionInfo.version === this.currentVersion,
          file: packagePath
        });
      }
      
    } catch (error) {
      this.warnings.push(`Could not check package.json: ${error.message}`);
    }
  }

  checkMainFiles() {
    const mainFiles = [
      'main/i18ntk-manage.js',
      'main/i18ntk-init.js',
      'main/i18ntk-analyze.js',
      'main/i18ntk-validate.js',
      'utils/i18n-helper.js',
      'settings/settings-cli.js'
    ];

    mainFiles.forEach(file => {
      try {
        const filePath = path.join(process.cwd(), file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Check for version comments
          const versionMatch = content.match(/@version\s+(\d+\.\d+\.\d+)/);
          if (versionMatch) {
            this.versionSources.push({
              source: file,
              version: versionMatch[1],
              correct: versionMatch[1] === this.currentVersion,
              file: filePath
            });
          }
        }
      } catch (error) {
        this.warnings.push(`Could not check ${file}: ${error.message}`);
      }
    });
  }

  checkDocumentation() {
    const docFiles = [
      'README.md',
      'CHANGELOG.md',
      'docs/README.md',
      'docs/INSTALLATION.md',
      'docs/USAGE.md'
    ];

    docFiles.forEach(file => {
      try {
        const filePath = path.join(process.cwd(), file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Find all version references
          const versionRegex = /(\d+\.\d+\.\d+)/g;
          let match;
          
          while ((match = versionRegex.exec(content)) !== null) {
            this.versionSources.push({
              source: file,
              version: match[1],
              correct: match[1] === this.currentVersion,
              file: filePath,
              line: this.getLineNumber(content, match.index)
            });
          }
        }
      } catch (error) {
        this.warnings.push(`Could not check ${file}: ${error.message}`);
      }
    });
  }

  checkChangelog() {
    try {
      const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
      if (fs.existsSync(changelogPath)) {
        const content = fs.readFileSync(changelogPath, 'utf8');
        
        // Check for current version in changelog
        const currentVersionHeader = new RegExp(`##\\s*\\[?${this.currentVersion}\\]?`);
        const hasCurrentVersion = currentVersionHeader.test(content);
        
        this.versionSources.push({
          source: 'CHANGELOG.md',
          version: hasCurrentVersion ? this.currentVersion : 'missing',
          correct: hasCurrentVersion,
          file: changelogPath
        });
      }
    } catch (error) {
      this.warnings.push(`Could not check CHANGELOG.md: ${error.message}`);
    }
  }

  checkScripts() {
    const scriptFiles = [
      'scripts/smoke-pack.js',
      'scripts/prepublish.js',
      'scripts/test-runner.js'
    ];

    scriptFiles.forEach(file => {
      try {
        const filePath = path.join(process.cwd(), file);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Check for version references
          const versionRegex = /(\d+\.\d+\.\d+)/g;
          let match;
          
          while ((match = versionRegex.exec(content)) !== null) {
            this.versionSources.push({
              source: file,
              version: match[1],
              correct: match[1] === this.currentVersion,
              file: filePath,
              line: this.getLineNumber(content, match.index)
            });
          }
        }
      } catch (error) {
        this.warnings.push(`Could not check ${file}: ${error.message}`);
      }
    });
  }

  getLineNumber(content, index) {
    const lines = content.substring(0, index).split('\n');
    return lines.length;
  }

  printReport() {
    const correctVersions = this.versionSources.filter(v => v.correct);
    const incorrectVersions = this.versionSources.filter(v => !v.correct);
    
    console.log('\n📊 Version Consistency Report:');
    console.log(`📋 Total version references: ${this.versionSources.length}`);
    console.log(`✅ Correct versions: ${correctVersions.length}`);
    console.log(`❌ Incorrect versions: ${incorrectVersions.length}`);
    console.log(`⚠️  Warnings: ${this.warnings.length}`);
    
    if (incorrectVersions.length > 0) {
      console.log('\n❌ Inconsistent versions found:');
      incorrectVersions.forEach(v => {
        console.log(`  ${v.source}: ${v.version} (expected ${this.currentVersion})`);
      });
    }
    
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(w => {
        console.log(`  ${w}`);
      });
    }
    
    if (incorrectVersions.length === 0) {
      console.log('\n🎉 All versions are consistent!');
    } else {
      console.log('\n💡 Run: npm run docs:update-versions to fix inconsistencies');
      process.exit(1);
    }
  }
}

// CLI interface
if (require.main === module) {
  const checker = new VersionChecker();
  checker.run().catch(console.error);
}

module.exports = VersionChecker;