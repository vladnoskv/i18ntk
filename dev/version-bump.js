#!/usr/bin/env node

/**
 * i18ntk Version Bump Script
 * Safely bumps version across all project files
 *
 * @version 1.6.3 (DEPRECATED - use latest version) * @author i18ntk Team
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getGlobalReadline, closeGlobalReadline } = require('../utils/cli');

class VersionBumper {
  constructor() {
    this.currentVersion = '1.6.3 (DEPRECATED - use latest version) ';
    this.newVersion = null;
    this.versionType = process.argv[2] || 'patch';
  }

  async run() {
    console.log('🚀 i18ntk Version Bumper');
    console.log(`📦 Current version: ${this.currentVersion}`);
    console.log(`🔧 Bump type: ${this.versionType}`);

    try {
      this.calculateNewVersion();
      console.log(`🆕 New version: ${this.newVersion}`);

      await this.confirmBump();
      await this.performBump();

      console.log('\n🎉 Version bump complete!');
      console.log(`💡 Run: npm run docs:update-versions to update documentation`);

    } catch (error) {
      console.error('❌ Error during version bump:', error.message);
      process.exit(1);
    }
  }

  calculateNewVersion() {
    const parts = this.currentVersion.split('.').map(Number);

    switch (this.versionType) {
      case 'major':
        parts[0] += 1;
        parts[1] = 0;
        parts[2] = 0;
        break;
      case 'minor':
        parts[1] += 1;
        parts[2] = 0;
        break;
      case 'patch':
        parts[2] += 1;
        break;
      default:
        if (/^\d+\.\d+\.\d+$/.test(this.versionType)) {
          this.newVersion = this.versionType;
          return;
        }
        throw new Error(`Invalid version type: ${this.versionType}`);
    }

    this.newVersion = parts.join('.');
  }

  async confirmBump() {  
    const rl = getGlobalReadline();

    return new Promise((resolve, reject) => {
      rl.question(`\n⚠️  Are you sure you want to bump from ${this.currentVersion} to ${this.newVersion}? (y/N): `, (answer) => {
        closeGlobalReadline();
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          resolve();
        } else {
          reject(new Error('Version bump cancelled by user'));
        }
      });
    });
  }

  async performBump() {
    console.log('\n🔄 Performing version bump...');

    // Update package.json
    this.updatePackageJson();

    // Update CHANGELOG.md
    this.updateChangelog();

    // Update README.md
    this.updateReadme();

    // Update main files
    this.updateMainFiles();

    // Update scripts
    this.updateScripts();

    console.log('✅ All files updated successfully');
  }

  updatePackageJson() {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    packageJson.version = this.newVersion;
    if (packageJson.versionInfo) {
      packageJson.versionInfo.version = this.newVersion;
    }

    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log(`✅ Updated package.json: ${this.currentVersion} → ${this.newVersion}`);
  }

  updateChangelog() {
    const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
    if (fs.existsSync(changelogPath)) {
      let content = fs.readFileSync(changelogPath, 'utf8');

      // Add new version section
      const newSection = `## [${this.newVersion}] - ${new Date().toISOString().split('T')[0]}

### Added
- New features and improvements

### Changed
- Version bump from ${this.currentVersion} to ${this.newVersion}

### Fixed
- Bug fixes and improvements

### Security
- Security enhancements

---

`;

      // Insert new section after the header
      const lines = content.split('\n');
      const insertIndex = lines.findIndex(line => line.startsWith('## [')) + 1;
      lines.splice(insertIndex, 0, newSection.trim());

      fs.writeFileSync(changelogPath, lines.join('\n'));
      console.log(`✅ Updated CHANGELOG.md with ${this.newVersion}`);
    }
  }

  updateReadme() {
    const readmePath = path.join(process.cwd(), 'README.md');
    if (fs.existsSync(readmePath)) {
      let content = fs.readFileSync(readmePath, 'utf8');

      // Update version badges
      content = content.replace(
        /badge\/version-(\d+\.\d+\.\d+)/g,
        `badge/version-${this.newVersion}`
      );

      // Update version references
      content = content.replace(
        new RegExp(`v${this.currentVersion}`, 'g'),
        `v${this.newVersion}`
      );

      fs.writeFileSync(readmePath, content);
      console.log(`✅ Updated README.md version references`);
    }
  }

  updateMainFiles() {
    const mainFiles = [
      'main/i18ntk-manage.js',
      'main/i18ntk-init.js',
      'main/i18ntk-analyze.js',
      'main/i18ntk-validate.js',
      'utils/i18n-helper.js',
      'settings/settings-cli.js'
    ];

    mainFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');

        // Update @version comments
        content = content.replace(
          /@version\s+(\d+\.\d+\.\d+)/g,
          `@version ${this.newVersion}`
        );

        fs.writeFileSync(filePath, content);
      }
    });

    console.log(`✅ Updated main files version comments`);
  }

  updateScripts() {
    const scriptFiles = [
      'scripts/smoke-pack.js',
      'scripts/prepublish.js',
      'scripts/test-runner.js',
      'scripts/update-docs-versions.js',
      'scripts/version-checker.js'
    ];

    scriptFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');

        // Update version comments
        content = content.replace(
          /@version\s+(\d+\.\d+\.\d+)/g,
          `@version ${this.newVersion}`
        );

        fs.writeFileSync(filePath, content);
      }
    });

    console.log(`✅ Updated scripts version comments`);
  }
}

// CLI interface
if (require.main === module) {
  const bumper = new VersionBumper();
  bumper.run().catch(console.error);
}

module.exports = VersionBumper;