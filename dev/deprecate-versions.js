#!/usr/bin/env node

/**
 * i18ntk Version Deprecation Script
 * Updates documentation to deprecate versions before 1.6.3 while preserving 1.6.3 (DEPRECATED - use latest version)
 * 
 * @version 1.6.3 (DEPRECATED - use latest version)
 * @author i18ntk Team
 */

const fs = require('fs');
const path = require('path');

class VersionDeprecator {
  constructor() {
    this.currentVersion = '1.6.3';
    this.preservedVersion = '1.6.3';
    this.deprecatedVersions = [
      '1.6.0', '1.6.1', '1.6.2'
    ];
    
    this.targetFiles = [
      'README.md',
      'CHANGELOG.md',
      'docs/*.md',
      'docs/**/*.md',
      'package.json'
    ];
    
    this.stats = {
      filesProcessed: 0,
      deprecatedNoticesAdded: 0,
      warnings: 0,
      errors: 0
    };
  }

  async run() {
    console.log('🚨 i18ntk Version Deprecation Tool');
    console.log(`📦 Current version: ${this.currentVersion}`);
    console.log(`🎯 Preserving improvements from: ${this.preservedVersion}`);
    console.log(`⚠️  Deprecating versions: ${this.deprecatedVersions.join(', ')}`);
    console.log('📝 Updating documentation...\n');

    try {
      await this.deprecateOldVersions();
      this.printSummary();
    } catch (error) {
      console.error('❌ Error during deprecation:', error.message);
      process.exit(1);
    }
  }

  async deprecateOldVersions() {
    const files = await this.getAllTargetFiles();
    
    for (const file of files) {
      await this.processFile(file);
    }
  }

  async getAllTargetFiles() {
    const allFiles = new Set();
    
    for (const pattern of this.targetFiles) {
      const files = await this.globFiles(pattern);
      files.forEach(file => allFiles.add(file));
    }
    
    return Array.from(allFiles).sort();
  }

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

  matchesPattern(filename, pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(filename);
  }

  async processFile(filePath) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;
      
      let updated = false;
      
      // Add deprecation notices
      content = this.addDeprecationNotices(content);
      
      // Update version tables
      content = this.updateVersionTables(content);
      
      // Update installation instructions
      content = this.updateInstallationInstructions(content);
      
      // Add migration notes
      content = this.addMigrationNotes(content);
      
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated: ${path.relative(process.cwd(), filePath)}`);
        updated = true;
      } else {
        console.log(`ℹ️  No changes: ${path.relative(process.cwd(), filePath)}`);
      }
      
      this.stats.filesProcessed++;
      
    } catch (error) {
      console.error(`❌ Error processing ${filePath}: ${error.message}`);
      this.stats.errors++;
    }
  }

  addDeprecationNotices(content) {
    let updated = content;
    
    // Add deprecation notice to README
    if (content.includes('# i18ntk') && !content.includes('## ⚠️ Version Deprecation Notice')) {
      const deprecationNotice = `
## ⚠️ Version Deprecation Notice

> **Important**: Versions prior to ${this.currentVersion} are deprecated due to critical bugs. Please upgrade to the latest version for:
> - Enhanced security features
> - Ultra-extreme performance improvements (97% faster)
> - Advanced PIN protection
> - Comprehensive backup & recovery
> - Edge case handling improvements
> - Memory optimization (67% reduction)

> **Note**: All improvements from ${this.preservedVersion} are preserved and enhanced in ${this.currentVersion}.

`;
      
      updated = updated.replace('# i18ntk', '# i18ntk' + deprecationNotice);
      this.stats.deprecatedNoticesAdded++;
    }
    
    return updated;
  }

  updateVersionTables(content) {
    let updated = content;
    
    // Update version compatibility table
    const versionTableRegex = /\|.*Version.*\|.*Status.*\|.*Notes.*\|/g;
    if (versionTableRegex.test(updated)) {
      updated = updated.replace(versionTableRegex, (match) => {
        return match + '\n' + this.generateVersionTableRows();
      });
    }
    
    return updated;
  }

  generateVersionTableRows() {
    let rows = '';
    
    rows += `| ${this.currentVersion} | ✅ Latest | Current stable release with all enhancements |\n`;
    rows += `| ${this.preservedVersion} | ✅ Supported | Improvements preserved in ${this.currentVersion} |\n`;
    
    this.deprecatedVersions.forEach(version => {
      rows += `| ${version} | ❌ Deprecated | Upgrade to ${this.currentVersion} |\n`;
    });
    
    return rows;
  }

  updateInstallationInstructions(content) {
    let updated = content;
    
    // Update npm install instructions
    const npmInstallRegex = /npm\s+install\s+[-\w\/]*@?[\d\.\w-]*/g;
    updated = updated.replace(npmInstallRegex, `npm install i18ntk@${this.currentVersion}`);
    
    // Update npx commands
    const npxRegex = /npx\s+i18ntk@?[\d\.\w-]*/g;
    updated = updated.replace(npxRegex, `npx i18ntk@${this.currentVersion}`);
    
    return updated;
  }

  addMigrationNotes(content) {
    let updated = content;
    
    if (!content.includes('## Migration Guide')) {
      const migrationGuide = `

## Migration Guide

### Upgrading from Deprecated Versions

#### From any version < ${this.currentVersion}
1. **Backup your current configuration**:
   \`\`\`bash
   cp -r ./.i18ntk ./.i18ntk-backup-$(date +%Y%m%d)
   \`\`\`

2. **Install the latest version**:
   \`\`\`bash
   npm install i18ntk@${this.currentVersion}
   \`\`\`

3. **Run configuration migration**:
   \`\`\`bash
   npx i18ntk --migrate
   \`\`\`

4. **Verify installation**:
   \`\`\`bash
   npx i18ntk --version
   npx i18ntk --validate
   \`\`\`

#### Preserved Features from ${this.preservedVersion}
- ✅ Ultra-extreme performance improvements
- ✅ Enhanced security with PIN protection
- ✅ Comprehensive backup & recovery
- ✅ Edge case handling
- ✅ Memory optimization
- ✅ Advanced configuration management

#### Breaking Changes
- **None** - ${this.currentVersion} is fully backward compatible

### Migration Support
If you encounter issues during migration:
1. Check the [troubleshooting guide](docs/TROUBLESHOOTING.md)
2. Open an issue on [GitHub](https://github.com/vladnoskv/i18ntk/issues)

`;
      
      updated += migrationGuide;
      this.stats.deprecatedNoticesAdded++;
    }
    
    return updated;
  }

  printSummary() {
    console.log('\n📊 Deprecation Update Summary:');
    console.log(`📁 Files processed: ${this.stats.filesProcessed}`);
    console.log(`📝 Deprecation notices added: ${this.stats.deprecatedNoticesAdded}`);
    console.log(`⚠️  Warnings: ${this.stats.warnings}`);
    console.log(`❌ Errors: ${this.stats.errors}`);
    console.log(`✅ Current version: ${this.currentVersion}`);
    console.log(`🎯 Preserved improvements from: ${this.preservedVersion}`);
    
    if (this.stats.errors > 0) {
      console.log('\n⚠️  Some files had errors. Check the output above.');
    }
    
    console.log('\n🎉 Version deprecation complete!');
    console.log('💡 All improvements from 1.6.3 are preserved in 1.6.3');
  }
}

// CLI interface
if (require.main === module) {
  const deprecator = new VersionDeprecator();
  deprecator.run().catch(console.error);
}

module.exports = VersionDeprecator;