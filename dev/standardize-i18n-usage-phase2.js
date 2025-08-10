#!/usr/bin/env node

/**
 * i18n Standardization Phase 2 Script
 * Fixes remaining issues after initial standardization:
 * 1. Remove redundant this.t assignments
 * 2. Fix recursive t() definitions
 * 3. Clean up settings-cli.js t() usage
 * 4. Remove UIi18n instantiations where only used for translations
 */

const fs = require('fs');
const path = require('path');

const TARGET_FILES = [
  'main/i18ntk-manage.js',
  'main/i18ntk-complete.js',
  'main/i18ntk-usage.js',
  'main/i18ntk-analyze.js',
  'main/i18ntk-validate.js',
  'main/i18ntk-summary.js',
  'main/i18ntk-sizing.js',
  'settings/settings-cli.js'
];

function analyzeTranslationUsage(content) {
  // Check if file uses this.ui for non-translation methods
  const uiMethods = [
    'loadLanguage',
    'refreshLanguageFromSettings',
    'getLanguageDisplayName',
    'getCurrentLanguage',
    'availableLanguages',
    'changeLanguage'
  ];
  
  const hasUiMethods = uiMethods.some(method => 
    content.includes(`this.ui.${method}`) || content.includes(`uiI18n.${method}`)
  );
  
  // Check for this.t usage
  const hasThisTUsage = content.includes('this.t(');
  
  // Check for this.t assignment
  const hasThisTAssignment = /this\.t\s*=/.test(content);
  
  return {
    hasUiMethods,
    hasThisTUsage,
    hasThisTAssignment
  };
}

function processFile(filePath) {
  console.log(`\n📝 Processing: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const backup = content;
  const analysis = analyzeTranslationUsage(content);
  
  console.log(`   🔍 Analysis:`, analysis);
  
  let modified = content;
  let hasChanges = false;
  
  // 1. Fix settings-cli.js specific issues
  if (filePath.includes('settings-cli.js')) {
    // Replace the problematic t() function definition with import usage
    if (modified.includes('t(key, params = {}) {') && modified.includes('return t(key, params);')) {
      modified = modified.replace(
        /\/\*\*\s*\n\s*\* Translation helper function\s*\n\s*\*\/\s*\n\s*t\(key, params = \{\}\) \{\s*\n\s*return t\(key, params\);\s*\n\s*\}/m,
        ''
      );
      
      // Ensure proper import
      if (!modified.includes("const { loadTranslations, t } = require('../utils/i18n-helper');")) {
        const importLine = "const { loadTranslations, t } = require('../utils/i18n-helper');";
        if (modified.includes("const { loadTranslations } = require('../utils/i18n-helper');")) {
          modified = modified.replace(
            "const { loadTranslations } = require('../utils/i18n-helper');",
            importLine
          );
        } else {
          // Add after other imports
          const insertPos = modified.indexOf('loadTranslations(process.env.I18NTK_LANG || \'en\');');
          if (insertPos !== -1) {
            modified = modified.substring(0, insertPos) + importLine + '\n' + modified.substring(insertPos);
          }
        }
      }
      
      hasChanges = true;
      console.log(`   ✅ Fixed settings-cli.js t() definition`);
    }
    
    // Replace this.t( with t(
    if (modified.includes('this.t(')) {
      modified = modified.replace(/this\.t\(/g, 't(');
      hasChanges = true;
      console.log(`   ✅ Replaced this.t() calls with t() in settings-cli.js`);
    }
  }
  
  // 2. Fix recursive t() definition in showHelp methods
  if (modified.includes('const t = this.ui && this.ui.t ? (key) => t(key) :')) {
    modified = modified.replace(
      /const t = this\.ui && this\.ui\.t \? \(key\) => t\(key\) : \(key\) => \{/,
      'const localT = this.ui && this.ui.t ? this.ui.t.bind(this.ui) : (key) => {'
    );
    
    // Replace subsequent t( calls in the function with localT(
    const lines = modified.split('\n');
    let inHelpFunction = false;
    let braceCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('const localT = this.ui')) {
        inHelpFunction = true;
        braceCount = 0;
      }
      
      if (inHelpFunction) {
        // Count braces to know when we exit the function
        braceCount += (lines[i].match(/\{/g) || []).length;
        braceCount -= (lines[i].match(/\}/g) || []).length;
        
        // Replace t( with localT( within this function
        if (lines[i].includes('console.log(t(') || lines[i].includes('return helpTexts[key]')) {
          lines[i] = lines[i].replace(/\bt\(/g, 'localT(');
        }
        
        if (braceCount <= 0 && i > 0) {
          inHelpFunction = false;
        }
      }
    }
    
    modified = lines.join('\n');
    hasChanges = true;
    console.log(`   ✅ Fixed recursive t() definition in showHelp`);
  }
  
  // 3. Remove redundant this.t assignments when using global t
  if (analysis.hasThisTAssignment && !analysis.hasUiMethods) {
    // Remove this.t = t; lines
    modified = modified.replace(/\s*this\.t = t;\s*(?:\/\/.*)?/g, '');
    
    // Replace remaining this.t( with t(
    if (modified.includes('this.t(')) {
      modified = modified.replace(/this\.t\(/g, 't(');
      console.log(`   ✅ Replaced this.t() calls with t()`);
    }
    
    hasChanges = true;
    console.log(`   ✅ Removed redundant this.t assignment`);
  }
  
  // 4. Clean up UIi18n usage when only used for translations
  if (!analysis.hasUiMethods && modified.includes('new UIi18n()')) {
    const lines = modified.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Remove UIi18n instantiation if only used for translations
      if (line.includes('this.ui = new UIi18n();') && !analysis.hasUiMethods) {
        lines[i] = '    // Using shared t() helper from i18n-helper instead of UIi18n for translations';
        hasChanges = true;
        console.log(`   ✅ Removed UIi18n instantiation (translation-only usage)`);
      }
      
      // Remove binding assignments when using global t
      if (line.includes('this.t = this.ui.t.bind(this.ui);')) {
        lines[i] = '    // Using shared t() helper from i18n-helper';
        hasChanges = true;
        console.log(`   ✅ Removed UIi18n binding assignment`);
      }
    }
    
    modified = lines.join('\n');
  }
  
  // 5. Clean up isolated UIi18n instantiations in catch blocks
  if (modified.includes('const ui = new UIi18n();') && 
      !modified.includes('ui.loadLanguage') && 
      !modified.includes('ui.refreshLanguageFromSettings')) {
    
    // Remove the instantiation and fix the t() call
    modified = modified.replace(/const ui = new UIi18n\(\);\s*\n/g, '');
    modified = modified.replace(/console\.error\(this\.t\(/g, 'console.error(t(');
    
    hasChanges = true;
    console.log(`   ✅ Cleaned up isolated UIi18n instantiation`);
  }
  
  if (hasChanges) {
    // Create backup
    const backupPath = `${filePath}.backup-phase2`;
    fs.writeFileSync(backupPath, backup, 'utf8');
    
    // Write modified content
    fs.writeFileSync(filePath, modified, 'utf8');
    
    console.log(`   💾 Changes applied, backup created: ${backupPath}`);
    return true;
  } else {
    console.log(`   ⚪ No changes needed`);
    return false;
  }
}

function main() {
  console.log('🚀 Starting i18n Standardization Phase 2...\n');
  
  const rootDir = process.cwd();
  let modifiedCount = 0;
  
  for (const targetFile of TARGET_FILES) {
    const fullPath = path.join(rootDir, targetFile);
    
    if (processFile(fullPath)) {
      modifiedCount++;
    }
  }
  
  console.log(`\n✅ Phase 2 Complete!`);
  console.log(`📊 Files modified: ${modifiedCount}/${TARGET_FILES.length}`);
  
  if (modifiedCount > 0) {
    console.log(`\n📋 Next steps:`);
    console.log(`1. Test your application: npm run workflow`);
    console.log(`2. Run tests: npm test (if available)`);
    console.log(`3. Remove backup files: find . -name "*.backup-phase2" -delete`);
    console.log(`\n🔄 To rollback changes:`);
    console.log(`for file in $(find . -name "*.backup-phase2"); do`);
    console.log(`  mv "$file" "\${file%.backup-phase2}"`);
    console.log(`done`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { processFile, analyzeTranslationUsage };