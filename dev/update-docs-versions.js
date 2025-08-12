#!/usr/bin/env node

/**
 * i18ntk Documentation Version Updater
 * Updates all version references across documentation files to the latest version
 * 
 * @version 1.8.3
 * @author i18ntk Team
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class VersionUpdater {
  constructor() {
    this.currentVersion = '1.8.3';
    this.targetFiles = [
      'README.md',
      'CHANGELOG.md',
      'docs/*.md',
      'docs/**/*.md',
      'docs/api/*.md',
      'main/*.js',
      'utils/*.js',
      'settings/*.js',
      'scripts/*.js',
      'test/*.js',
      '.github/workflows/*.yml',
      '.github/*.md',
      'INSTALLATION.md',
      'SECURITY.md'
    ];
    
    this.versionPatterns = [
      // Semantic version patterns
      /(\d+\.\d+\.\d+)/g,
      // Version in package.json format
      /"version":\s*"(\d+\.\d+\.\d+)"/g,
      // Version in markdown headers
      /#+.*v(\d+\.\d+\.\d+)/g,
      // Version in badges
      /badge\/version-(\d+\.\d+\.\d+)/g,
      // Version in URLs
      /\/v(\d+\.\d+\.\d+)/g,
      // Version in changelog
      /##\s*\[?(\d+\.\d+\.\d+)\]?/g,
      // Version in code comments
      /@version\s+(\d+\.\d+\.\d+)/g,
      // Version in release notes
      /Release\s+(\d+\.\d+\.\d+)/g
    ];
    
    this.deprecatedVersions = [
      '1.5.x', '1.6.x', '1.7.x'
    ];
    
    this.stats = {
      filesProcessed: 0,
      versionsUpdated: 0,
      deprecatedFound: 0,
      warnings: 0,
      errors: 0
    };
  }

  /**
   * Main execution method
   */
  async run() {
    console.log('🔄 i18ntk Documentation Version Updater');
    console.log(`📦 Current version: ${this.currentVersion}`);
    console.log('📝 Scanning and updating version references...\n');

    try {
      await this.updateAllVersions();
      this.printSummary();
    } catch (error) {
      console.error('❌ Error during version update:', error.message);
      this.stats.errors++;
      process.exit(1);
    }
  }

  /**
   * Update all version references across target files
   */
  async updateAllVersions() {
    const files = await this.getAllTargetFiles();
    
    for (const file of files) {
      await this.processFile(file);
    }
  }

  /**
   * Get all target files recursively
   */
  async getAllTargetFiles() {
    const allFiles = new Set();
    
    for (const pattern of this.targetFiles) {
      const files = await this.globFiles(pattern);
      files.forEach(file => allFiles.add(file));
    }
    
    return Array.from(allFiles).sort();
  }

  /**
   * Simple glob implementation
   */
  async globFiles(pattern) {
    const files = [];
    const baseDir = process.cwd();
    
    if (pattern.includes('*')) {
      const parts = pattern.split('/');
      const dir = path.join(baseDir, ...parts.slice(0, -1));
      const filePattern = parts[parts.length - 1];
      
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        entries.forEach(entry => {
          if (entry.isFile() && this.matchesPattern(entry.name, filePattern)) {
            files.push(path.join(dir, entry.name));
          }
        });
      } catch (error) {
        // Directory doesn't exist, skip
      }
    } else {
      const fullPath = path.join(baseDir, pattern);
      if (fs.existsSync(fullPath)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * Check if filename matches pattern
   */
  matchesPattern(filename, pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(filename);
  }

  /**
   * Process a single file
   */
  async processFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      let updated = false;
      
      // Update version references
      for (const pattern of this.versionPatterns) {
        const newContent = content.replace(pattern, (match, version) => {
          if (this.shouldUpdateVersion(version)) {
            this.stats.versionsUpdated++;
            updated = true;
            return match.replace(version, this.currentVersion);
          }
          return match;
        });
        content = newContent;
      }
      
      // Handle deprecated versions
      const deprecatedContent = this.handleDeprecatedVersions(content);
      if (deprecatedContent !== content) {
        content = deprecatedContent;
        updated = true;
      }
      
      if (updated) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated: ${path.relative(process.cwd(), filePath)}`);
      } else {
        console.log(`ℹ️  No changes: ${path.relative(process.cwd(), filePath)}`);
      }
      
      this.stats.filesProcessed++;
      
    } catch (error) {
      console.error(`❌ Error processing ${filePath}: ${error.message}`);
      this.stats.errors++;
    }
  }

  /**
   * Check if version should be updated
   */
  shouldUpdateVersion(version) {
    // Don't update if it's already the current version
    if (version === this.currentVersion) return false;
    
    // Don't update if it's a future version
    if (this.isNewerVersion(version, this.currentVersion)) return false;
    
    // Update all other versions
    return true;
  }

  /**
   * Check if version is newer than current
   */
  isNewerVersion(version1, version2) {
    const v1 = version1.split('.').map(Number);
    const v2 = version2.split('.').map(Number);
    
    for (let i = 0; i < 3; i++) {
      if (v1[i] > v2[i]) return true;
      if (v1[i] < v2[i]) return false;
    }
    
    return false;
  }

  /**
   * Handle deprecated version references - Clean up excessive deprecation notices
   */
  handleDeprecatedVersions(content) {
    let updated = content;
    
    // Remove excessive deprecation notices
    const excessiveDeprecationPattern = /(\(DEPRECATED - use latest version\)\s*){2,}/g;
    updated = updated.replace(excessiveDeprecationPattern, '(DEPRECATED - use latest version)');
    
    // Clean up version strings with excessive deprecated notices
    const versionWithExcessiveDeprecated = /@1\.6\.3\s*(\(DEPRECATED - use latest version\)\s*)+/g;
    updated = updated.replace(versionWithExcessiveDeprecated, '@1.6.3');
    
    // Clean up version numbers in package installations
    const packageVersionPattern = /i18ntk@1\.6\.3\s*(\(DEPRECATED - use latest version\)\s*)+/g;
    updated = updated.replace(packageVersionPattern, 'i18ntk@1.6.3');
    
    // Clean up version strings in headings and comments
    const versionHeadingPattern = /Version:\*\*\s*1\.6\.3\s*(\(DEPRECATED - use latest version\)\s*)+/g;
    updated = updated.replace(versionHeadingPattern, 'Version:** 1.6.3');
    
    if (updated !== content) {
      this.stats.deprecatedFound++;
    }
    
    return updated;
  }

  /**
   * Print summary of changes
   */
  printSummary() {
    console.log('\n📊 Version Update Summary:');
    console.log(`📁 Files processed: ${this.stats.filesProcessed}`);
    console.log(`🔄 Versions updated: ${this.stats.versionsUpdated}`);
    console.log(`⚠️  Deprecated versions found: ${this.stats.deprecatedFound}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    console.log(`✅ Current version: ${this.currentVersion}`);
    
    if (this.stats.errors > 0) {
      console.log('\n⚠️  Some files had errors. Check the output above.');
    }
    
    console.log('\n🎉 Version update complete!');
  }

  /**
   * Get current package version
   */
  getCurrentPackageVersion() {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return packageJson.version;
    } catch (error) {
      return this.currentVersion;
    }
  }

  /**
   * Validate version format
   */
  validateVersion(version) {
    return /^\d+\.\d+\.\d+$/.test(version);
  }

  // Additional cleanup for repeated tags in code blocks and commands
  cleanRedundantNotices(content) {
    let updated = content;

    // Collapse multiple occurrences anywhere
    updated = updated.replace(/(\(DEPRECATED - use latest version\)\s*){2,}/g, '(DEPRECATED - use latest version) ');

    // Remove any deprecation notice that follows the latest version references in commands
    const cmdPatterns = [
      /npm\s+install\s+i18ntk@1\.6\.3\s*(\(DEPRECATED - use latest version\)\s*)+/gi,
      /npx\s+i18ntk@1\.6\.3\s*(\(DEPRECATED - use latest version\)\s*)+/gi,
      /Version:\*\*\s*1\.6\.3\s*(\(DEPRECATED - use latest version\)\s*)+/g,
    ];
    for (const r of cmdPatterns) {
      updated = updated.replace(r, (m) => m.replace(/\s*\(DEPRECATED - use latest version\)+/gi, ''));
    }

    // Normalize spacing in code blocks
    updated = updated.replace(/\s+\)\s*\n/g, ')\n');
    return updated;
  }
}

// CLI interface
if (require.main === module) {
  const updater = new VersionUpdater();
  
  // Allow custom version override
  const customVersion = process.argv[2];
  if (customVersion && updater.validateVersion(customVersion)) {
    updater.currentVersion = customVersion;
  }
  
  updater.run().catch(console.error);
}

module.exports = VersionUpdater;