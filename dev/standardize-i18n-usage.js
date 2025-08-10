#!/usr/bin/env node

/**
 * i18n Usage Standardization Script
 * 
 * This script standardizes i18n usage across the codebase by:
 * 1. Converting this.ui.t(...) calls to shared t(...) helper
 * 2. Ensuring proper imports of { loadTranslations, t } from i18n-helper
 * 3. Adding loadTranslations() calls where needed
 * 4. Removing redundant UIi18n instantiations where possible
 */

const fs = require('fs');
const path = require('path');

class I18nStandardizer {
  constructor() {
    this.changes = [];
    this.errors = [];
    this.targetFiles = [
      'main/i18ntk-manage.js',
      'main/i18ntk-init.js',
      'main/i18ntk-complete.js',
      'settings/settings-cli.js',
      'dev/tests/test-complete-system.js',
      'dev/tests/test-features.js',
      'dev/debug/replace-hardcoded-console.js',
      'dev/debug/complete-console-translations.js'
    ];
  }

  run() {
    console.log('🔄 Starting i18n standardization process...\n');
    
    for (const filePath of this.targetFiles) {
      const fullPath = path.resolve(filePath);
      if (fs.existsSync(fullPath)) {
        this.processFile(fullPath, filePath);
      } else {
        console.log(`⚠️  File not found: ${filePath}`);
      }
    }

    this.printSummary();
  }

  processFile(fullPath, relativePath) {
    console.log(`📝 Processing: ${relativePath}`);
    
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const modified = this.standardizeFile(content, relativePath);
      
      if (modified !== content) {
        // Create backup
        const backupPath = fullPath + '.backup';
        fs.writeFileSync(backupPath, content, 'utf8');
        
        // Write modified content
        fs.writeFileSync(fullPath, modified, 'utf8');
        
        this.changes.push({
          file: relativePath,
          backup: backupPath,
          hasChanges: true
        });
        
        console.log(`   ✅ Modified (backup: ${path.basename(backupPath)})`);
      } else {
        console.log(`   ⏭️  No changes needed`);
        this.changes.push({
          file: relativePath,
          hasChanges: false
        });
      }
    } catch (error) {
      console.error(`   ❌ Error processing ${relativePath}: ${error.message}`);
      this.errors.push({ file: relativePath, error: error.message });
    }
  }

  standardizeFile(content, filePath) {
    let modified = content;
    
    // Step 1: Ensure i18n-helper import exists
    modified = this.ensureI18nHelperImport(modified, filePath);
    
    // Step 2: Ensure loadTranslations call exists (for CLI scripts)
    if (filePath.startsWith('main/')) {
      modified = this.ensureLoadTranslationsCall(modified);
    }
    
    // Step 3: Convert this.ui.t(...) to t(...)
    modified = this.convertUiTCalls(modified);
    
    // Step 4: Convert standalone ui.t(...) to t(...)
    modified = this.convertStandaloneUiTCalls(modified);
    
    // Step 5: Remove redundant UIi18n usage where possible
    modified = this.optimizeUIi18nUsage(modified, filePath);
    
    return modified;
  }

  ensureI18nHelperImport(content, filePath) {
    // Check if i18n-helper import already exists
    if (content.includes("require('../utils/i18n-helper')") || 
        content.includes("require('../../utils/i18n-helper')")) {
      return content;
    }

    // Determine correct relative path
    const depth = filePath.split('/').length - 1;
    const relativePath = '../'.repeat(depth) + 'utils/i18n-helper';
    
    // Find a good place to insert the import (after other requires, before loadTranslations)
    const lines = content.split('\n');
    let insertIndex = -1;
    
    // Look for existing require statements
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('require(') && !line.includes('loadTranslations')) {
        insertIndex = i + 1;
      }
      // Stop before loadTranslations call if it exists
      if (line.includes('loadTranslations(')) {
        break;
      }
    }
    
    // If no good spot found, insert after initial comments
    if (insertIndex === -1) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && !line.startsWith('/*') && !line.startsWith('*') && !line.startsWith('//') && !line.startsWith('#!')) {
          insertIndex = i;
          break;
        }
      }
    }
    
    if (insertIndex !== -1) {
      const importLine = `const { loadTranslations, t } = require('${relativePath}');`;
      lines.splice(insertIndex, 0, importLine);
      return lines.join('\n');
    }
    
    return content;
  }

  ensureLoadTranslationsCall(content) {
    // Check if loadTranslations call already exists
    if (content.includes('loadTranslations(')) {
      return content;
    }
    
    // Add loadTranslations call after the import
    const lines = content.split('\n');
    let insertIndex = -1;
    
    // Find the i18n-helper import line
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("require('../utils/i18n-helper')") || 
          lines[i].includes("require('../../utils/i18n-helper')")) {
        insertIndex = i + 1;
        break;
      }
    }
    
    if (insertIndex !== -1) {
      lines.splice(insertIndex, 0, "loadTranslations(process.env.I18NTK_LANG || 'en');");
      return lines.join('\n');
    }
    
    return content;
  }

  convertUiTCalls(content) {
    // Convert this.ui.t(...) to t(...)
    return content.replace(/this\.ui\.t\(/g, 't(');
  }

  convertStandaloneUiTCalls(content) {
    // Convert ui.t(...) or uiI18n.t(...) to t(...)
    // Be careful not to match console.log(ui.t(...)) patterns
    let modified = content;
    
    // Match patterns like: uiI18n.t(, ui.t( but not this.ui.t(
    modified = modified.replace(/(?<!this\.)ui\.t\(/g, 't(');
    modified = modified.replace(/uiI18n\.t\(/g, 't(');
    
    return modified;
  }

  optimizeUIi18nUsage(content, filePath) {
    let modified = content;
    
    // For files that primarily use UI for translations, consider optimization
    if (filePath.startsWith('main/')) {
      // Check if UIi18n is only used for translations
      const uiUsages = (content.match(/this\.ui\./g) || []).length;
      const uiTUsages = (content.match(/this\.ui\.t\(/g) || []).length;
      
      // If UI is only used for translations, we can remove it
      if (uiUsages === uiTUsages && uiTUsages > 0) {
        // Remove UIi18n import
        modified = modified.replace(/const UIi18n = require\(['"]\.\/i18ntk-ui['"]\);\s*\n?/g, '');
        
        // Remove UIi18n instantiation
        modified = modified.replace(/this\.ui = new UIi18n\(\);\s*\n?/g, '');
        
        // Add comment explaining the change
        const lines = modified.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('class ') && lines[i].includes('{')) {
            lines.splice(i + 1, 0, '    // Using shared t() helper from i18n-helper instead of UIi18n for translations');
            break;
          }
        }
        modified = lines.join('\n');
      }
    }
    
    return modified;
  }

  printSummary() {
    console.log('\n📊 Standardization Summary:');
    console.log('=' .repeat(50));
    
    const changedFiles = this.changes.filter(c => c.hasChanges);
    const unchangedFiles = this.changes.filter(c => !c.hasChanges);
    
    console.log(`✅ Files modified: ${changedFiles.length}`);
    console.log(`⏭️  Files unchanged: ${unchangedFiles.length}`);
    console.log(`❌ Errors: ${this.errors.length}`);
    
    if (changedFiles.length > 0) {
      console.log('\n📝 Modified files:');
      changedFiles.forEach(change => {
        console.log(`   - ${change.file}`);
      });
    }
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.errors.forEach(error => {
        console.log(`   - ${error.file}: ${error.error}`);
      });
    }
    
    console.log('\n🔍 Next steps:');
    console.log('1. Review the changes in each modified file');
    console.log('2. Test the affected functionality');
    console.log('3. Remove backup files if changes are satisfactory');
    console.log('4. Run: node dev/cleanup-i18n-backups.js (to clean backups)');
    
    if (changedFiles.length > 0) {
      console.log('\n💡 To rollback changes if needed:');
      changedFiles.forEach(change => {
        if (change.backup) {
          console.log(`   mv "${change.backup}" "${change.file}"`);
        }
      });
    }
  }
}

// Run the standardizer
if (require.main === module) {
  const standardizer = new I18nStandardizer();
  standardizer.run();
}

module.exports = I18nStandardizer;