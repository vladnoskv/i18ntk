#!/usr/bin/env node
/**
 * Lightweight Build Script for Lite Distribution
 * 
 * Creates an optimized package containing only essential files
 * and the English UI locale to reduce bundle size.
 * 
 * @version 1.10.0
 * @since 2025-08-08
 */

const fs = require('fs');
const path = require('path');

class LiteBuild {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.buildDir = path.join(this.projectRoot, 'dist-lite');
    this.packageJson = require('../package.json');
  }

  async build() {
    console.log('🚀 Starting lite build process...');
    
    try {
      // Clean previous build
      await this.cleanBuildDir();
      
      // Create build directory structure
      await this.createBuildStructure();
      
      // Copy essential files
      await this.copyEssentialFiles();
      
      // Copy only English locale
      await this.copyEnglishLocale();
      
      // Create optimized package.json
      await this.createOptimizedPackageJson();
      
      // Create .npmignore for lite package
      await this.createNpmIgnore();
      
      // Generate build report
      await this.generateBuildReport();
      
      console.log('✅ Lite build completed successfully!');
      console.log(`📦 Build directory: ${this.buildDir}`);
      
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      process.exit(1);
    }
  }

  async cleanBuildDir() {
    if (fs.existsSync(this.buildDir)) {
      fs.rmSync(this.buildDir, { recursive: true, force: true });
    }
    fs.mkdirSync(this.buildDir, { recursive: true });
  }

  async createBuildStructure() {
    const dirs = [
      'main',
      'utils',
      'settings',
      'ui-locales/en',
      'scripts'
    ];

    dirs.forEach(dir => {
      fs.mkdirSync(path.join(this.buildDir, dir), { recursive: true });
    });
  }

  async copyEssentialFiles() {
    const essentialFiles = [
      // Main CLI scripts
      { src: 'main/i18ntk-manage.js', dest: 'main/i18ntk-manage.js' },
      { src: 'main/i18ntk-init.js', dest: 'main/i18ntk-init.js' },
      { src: 'main/i18ntk-analyze.js', dest: 'main/i18ntk-analyze.js' },
      { src: 'main/i18ntk-validate.js', dest: 'main/i18ntk-validate.js' },
      { src: 'main/i18ntk-ui.js', dest: 'main/i18ntk-ui.js' },
      
      // Utilities
      { src: 'utils/security.js', dest: 'utils/security.js' },
      { src: 'utils/i18n-helper.js', dest: 'utils/i18n-helper.js' },
      { src: 'utils/admin-auth.js', dest: 'utils/admin-auth.js' },
      { src: 'utils/cli-helper.js', dest: 'utils/cli-helper.js' },
      
      // Settings
      { src: 'settings/i18ntk-config.json', dest: 'settings/i18ntk-config.json' },
      { src: 'settings/settings-manager.js', dest: 'settings/settings-manager.js' },
      { src: 'settings/settings-cli.js', dest: 'settings/settings-cli.js' },
      
      // Scripts
      { src: 'scripts/build-lite.js', dest: 'scripts/build-lite.js' },
      
      // Root files
      { src: 'README.md', dest: 'README.md' },
      { src: 'LICENSE', dest: 'LICENSE' }
    ];

    essentialFiles.forEach(({ src, dest }) => {
      const srcPath = path.join(this.projectRoot, src);
      const destPath = path.join(this.buildDir, dest);
      
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
      }
    });
  }

  async copyEnglishLocale() {
    const enLocaleDir = path.join(this.projectRoot, 'ui-locales', 'en');
    const destDir = path.join(this.buildDir, 'ui-locales', 'en');
    
    if (fs.existsSync(enLocaleDir)) {
      const files = fs.readdirSync(enLocaleDir);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          fs.copyFileSync(
            path.join(enLocaleDir, file),
            path.join(destDir, file)
          );
        }
      });
    }
  }

  async createOptimizedPackageJson() {
    const litePackageJson = {
      name: this.packageJson.name + '-lite',
      version: this.packageJson.version,
      description: 'Lite version of i18n Management Toolkit with English UI only',
      main: this.packageJson.main,
      bin: this.packageJson.bin,
      scripts: {
        start: 'node main/i18ntk-manage.js',
        analyze: 'node main/i18ntk-analyze.js',
        validate: 'node main/i18ntk-validate.js'
      },
      keywords: this.packageJson.keywords,
      author: this.packageJson.author,
      license: this.packageJson.license,
      engines: this.packageJson.engines,
      repository: this.packageJson.repository,
      bugs: this.packageJson.bugs,
      homepage: this.packageJson.homepage
    };

    fs.writeFileSync(
      path.join(this.buildDir, 'package.json'),
      JSON.stringify(litePackageJson, null, 2)
    );
  }

  async createNpmIgnore() {
    const npmIgnoreContent = `
# Development files
dev/
tests/
benchmarks/
docs/
.github/
.i18ntk/

# Non-English locales
ui-locales/es/
ui-locales/fr/
ui-locales/de/
ui-locales/ja/
ui-locales/ru/
ui-locales/zh/

# Debug and test files
*.test.js
*.spec.js
debug-*.js
test-*.html

# Build artifacts
node_modules/
dist/
*.log
.DS_Store
*.tmp
*.temp

# Source control
.git/
.gitignore
.gitattributes

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS files
Thumbs.db
.DS_Store
`;

    fs.writeFileSync(
      path.join(this.buildDir, '.npmignore'),
      npmIgnoreContent.trim()
    );
  }

  async generateBuildReport() {
    const stats = this.getBuildStats();
    const report = {
      version: this.packageJson.version,
      buildDate: new Date().toISOString(),
      totalFiles: stats.totalFiles,
      totalSize: stats.totalSize,
      languages: ['en'],
      optimization: {
        sizeReduction: stats.sizeReduction,
        fileReduction: stats.fileReduction
      }
    };

    fs.writeFileSync(
      path.join(this.buildDir, 'build-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n📊 Build Statistics:');
    console.log(`   Files: ${stats.totalFiles}`);
    console.log(`   Size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
    console.log(`   Languages: English only`);
    console.log(`   Size reduction: ${stats.sizeReduction}%`);
  }

  getBuildStats() {
    let totalFiles = 0;
    let totalSize = 0;
    
    const countFiles = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          countFiles(filePath);
        } else {
          totalFiles++;
          totalSize += stat.size;
        }
      });
    };

    countFiles(this.buildDir);

    // Calculate size reduction (rough estimate)
    const originalSize = 2500 * 1024; // ~2.5MB original
    const sizeReduction = Math.round(((originalSize - totalSize) / originalSize) * 100);

    return {
      totalFiles,
      totalSize,
      sizeReduction
    };
  }
}

// Run if called directly
if (require.main === module) {
  const builder = new LiteBuild();
  builder.build();
}

module.exports = LiteBuild;