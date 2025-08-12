#!/usr/bin/env node
/**
 * UI-LOCALES FIXER SCRIPT
 *
 * Ensures all UI locale files have complete matching keys with en.json
 * Specifically designed for the ui-locales directory structure
 */

const fs = require('fs');
const path = require('path');

class UiLocalesFixer {
  constructor(targetLanguage = 'de') {
    this.uiLocalesDir = path.join(__dirname, '..', 'ui-locales');
    this.sourceFile = path.join(this.uiLocalesDir, 'en.json');
    this.targetLanguage = targetLanguage;
    this.targetFile = path.join(this.uiLocalesDir, `${targetLanguage}.json`);
    this.report = {
      missingKeys: 0,
      updatedKeys: 0,
      totalKeys: 0
    };
  }

  loadJson(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`❌ Error loading JSON from ${filePath}:`, error.message);
      return {};
    }
  }

  saveJson(filePath, data) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`❌ Error saving JSON to ${filePath}:`, error.message);
      return false;
    }
  }

  createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.uiLocalesDir, `${this.targetLanguage}-backup-${timestamp}.json`);
    
    try {
      fs.copyFileSync(this.targetFile, backupPath);
      console.log(`💾 Backup created: ${path.basename(backupPath)}`);
      return backupPath;
    } catch (error) {
      console.warn(`⚠️  Could not create backup: ${error.message}`);
      return null;
    }
  }

  deepCompareKeys(source, target, currentPath = '') {
    const issues = [];
    
    for (const key in source) {
      const fullPath = currentPath ? `${currentPath}.${key}` : key;
      
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        // Handle nested objects
        if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
          issues.push({
            path: fullPath,
            type: 'missing_object',
            source: source[key],
            target: target[key]
          });
        } else {
          issues.push(...this.deepCompareKeys(source[key], target[key], fullPath));
        }
      } else {
        // Handle primitive values
        if (!(key in target)) {
          issues.push({
            path: fullPath,
            type: 'missing',
            source: source[key],
            target: undefined
          });
        } else if (typeof source[key] !== typeof target[key]) {
          issues.push({
            path: fullPath,
            type: 'type_mismatch',
            source: source[key],
            target: target[key]
          });
        }
      }
    }
    
    return issues;
  }

  ensureCompleteStructure(source, target, lang = 'de') {
    const result = JSON.parse(JSON.stringify(target)); // Deep clone target
    
    function deepMerge(sourceObj, targetObj, path = '') {
      const merged = Array.isArray(targetObj) ? [...targetObj] : { ...targetObj };
      
      for (const key in sourceObj) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (sourceObj[key] === null) {
          if (!(key in merged)) {
            merged[key] = null;
            this.report.missingKeys++;
          }
        } else if (Array.isArray(sourceObj[key])) {
          if (!Array.isArray(merged[key])) {
            merged[key] = [...sourceObj[key]];
            this.report.missingKeys++;
          } else {
            // Ensure arrays have same length and structure
            merged[key] = sourceObj[key].map((item, index) => {
              if (typeof item === 'object' && item !== null) {
                return deepMerge.call(this, item, merged[key][index] || {}, `${currentPath}[${index}]`);
              }
              return merged[key][index] !== undefined ? merged[key][index] : item;
            });
          }
        } else if (typeof sourceObj[key] === 'object' && sourceObj[key] !== null) {
          if (!merged[key] || typeof merged[key] !== 'object' || Array.isArray(merged[key])) {
            merged[key] = {};
            this.report.missingKeys++;
          }
          merged[key] = deepMerge.call(this, sourceObj[key], merged[key], currentPath);
        } else {
          // Handle primitive values
          if (!(key in merged)) {
            merged[key] = `[${lang.toUpperCase()}] ${sourceObj[key]}`;
            this.report.missingKeys++;
          }
        }
      }
      
      return merged;
    }
    
    return deepMerge.call(this, source, result);
  }

  countKeys(obj) {
    let count = 0;
    
    function countRecursive(current) {
      for (const key in current) {
        if (typeof current[key] === 'object' && current[key] !== null && !Array.isArray(current[key])) {
          countRecursive(current[key]);
        } else {
          count++;
        }
      }
    }
    
    countRecursive(obj);
    return count;
  }

  generateReport(issues, sourceData, targetData) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.uiLocalesDir, `fixer-ui-report-${this.targetLanguage}-${timestamp}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      sourceLanguage: 'en',
      targetLanguage: this.targetLanguage,
      summary: {
        sourceKeys: this.countKeys(sourceData),
        targetKeys: this.countKeys(targetData),
        missingKeys: this.report.missingKeys,
        updatedKeys: this.report.updatedKeys,
        issues: issues.length
      },
      issues: issues,
      filePaths: {
        source: this.sourceFile,
        target: this.targetFile
      }
    };
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📊 Report generated: ${path.basename(reportPath)}`);
      return reportPath;
    } catch (error) {
      console.warn(`⚠️  Could not generate report: ${error.message}`);
      return null;
    }
  }

  printIssues(issues) {
    if (issues.length === 0) {
      console.log("✅ All keys are complete and matching!");
      return;
    }

    console.log(`\n🔍 Found ${issues.length} issues to fix:\n`);
    
    issues.forEach((issue, index) => {
      const issueType = issue.type === 'missing' ? '❌ Missing' : 
                       issue.type === 'missing_object' ? '❌ Missing Object' :
                       issue.type === 'type_mismatch' ? '⚠️  Type Mismatch' : '❓ Unknown';
      
      console.log(`${index + 1}. ${issueType}: ${issue.path}`);
      if (issue.type === 'type_mismatch') {
        console.log(`   Source: ${typeof issue.source} (${issue.source})`);
        console.log(`   Target: ${typeof issue.target} (${issue.target})`);
      } else {
        console.log(`   Value: ${issue.source}`);
      }
    });
  }

  validateStructureConsistency(source, target) {
    const issues = [];
    
    function checkStructure(sourceObj, targetObj, path = '') {
      for (const key in sourceObj) {
        const currentPath = path ? `${path}.${key}` : key;
        
        // Check if key exists in target
        if (!(key in targetObj)) {
          issues.push({
            path: currentPath,
            type: 'missing',
            source: sourceObj[key],
            target: undefined
          });
          continue;
        }
        
        // Check type consistency
        const sourceType = Array.isArray(sourceObj[key]) ? 'array' : 
                         sourceObj[key] === null ? 'null' : 
                         typeof sourceObj[key];
        const targetType = Array.isArray(targetObj[key]) ? 'array' : 
                         targetObj[key] === null ? 'null' : 
                         typeof targetObj[key];
        
        if (sourceType !== targetType) {
          issues.push({
            path: currentPath,
            type: 'type_mismatch',
            sourceType,
            targetType,
            source: sourceObj[key],
            target: targetObj[key]
          });
          continue;
        }
        
        // Recursively check nested objects
        if (sourceType === 'object' && sourceObj[key] !== null) {
          checkStructure(sourceObj[key], targetObj[key], currentPath);
        }
        
        // Check array structure
        if (sourceType === 'array' && Array.isArray(sourceObj[key]) && Array.isArray(targetObj[key])) {
          if (sourceObj[key].length !== targetObj[key].length) {
            issues.push({
              path: currentPath,
              type: 'array_length_mismatch',
              sourceLength: sourceObj[key].length,
              targetLength: targetObj[key].length
            });
          }
          
          // Check array item types
          sourceObj[key].forEach((item, index) => {
            if (typeof item === 'object' && item !== null && targetObj[key][index]) {
              checkStructure(item, targetObj[key][index], `${currentPath}[${index}]`);
            }
          });
        }
      }
    }
    
    checkStructure(source, target);
    return issues;
  }

  removeExtraKeys(source, target) {
    const cleanedTarget = {};
    
    function copyMatchingStructure(sourceObj, targetObj, resultObj) {
      for (const key in sourceObj) {
        if (!(key in targetObj)) {
          // Missing key - will be handled by ensureCompleteStructure
          continue;
        }
        
        const sourceType = typeof sourceObj[key];
        const targetType = typeof targetObj[key];
        
        if (sourceType === 'object' && sourceObj[key] !== null && !Array.isArray(sourceObj[key])) {
          resultObj[key] = {};
          copyMatchingStructure(sourceObj[key], targetObj[key], resultObj[key]);
        } else if (Array.isArray(sourceObj[key]) && Array.isArray(targetObj[key])) {
          resultObj[key] = [...targetObj[key]];
        } else {
          resultObj[key] = targetObj[key];
        }
      }
    }
    
    copyMatchingStructure(source, target, cleanedTarget);
    return cleanedTarget;
  }

  async run() {
    console.log(`🚀 Starting UI-locales structure fixer for ${this.targetLanguage}...\n`);
    
    // Check if files exist
    if (!fs.existsSync(this.sourceFile)) {
      console.error(`❌ Source file not found: ${this.sourceFile}`);
      return false;
    }
    
    if (!fs.existsSync(this.targetFile)) {
      console.warn(`⚠️  Target file not found, will create: ${this.targetFile}`);
    }
    
    // Load source and target data
    const sourceData = this.loadJson(this.sourceFile);
    const targetData = this.loadJson(this.targetFile);
    
    console.log(`📁 Source: en.json (${this.countKeys(sourceData)} keys)`);
    console.log(`📁 Target: ${this.targetLanguage}.json (${this.countKeys(targetData)} keys)`);
    
    // Validate structure consistency
    const structureIssues = this.validateStructureConsistency(sourceData, targetData);
    const keyIssues = this.deepCompareKeys(sourceData, targetData);
    
    // Check for extra keys
    const extraKeys = [];
    function findExtraKeys(source, target, path = '') {
      for (const key in target) {
        const currentPath = path ? `${path}.${key}` : key;
        if (!(key in source)) {
          extraKeys.push(currentPath);
        } else if (typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key]) && typeof source[key] === 'object' && source[key] !== null) {
          findExtraKeys(source[key], target[key], currentPath);
        }
      }
    }
    findExtraKeys(sourceData, targetData);
    
    const allIssues = [...structureIssues, ...keyIssues];
    
    if (allIssues.length === 0 && extraKeys.length === 0) {
      console.log("\n🎉 Structure and keys are already 100% consistent and complete!");
      return true;
    }
    
    // Print issues
    if (allIssues.length > 0) {
      console.log(`\n🔍 Found ${allIssues.length} structural issues:`);
      allIssues.forEach((issue, index) => {
        switch(issue.type) {
          case 'missing':
            console.log(`${index + 1}. ❌ Missing: ${issue.path}`);
            break;
          case 'type_mismatch':
            console.log(`${index + 1}. ⚠️  Type mismatch: ${issue.path} (${issue.sourceType} → ${issue.targetType})`);
            break;
          case 'array_length_mismatch':
            console.log(`${index + 1}. 📏 Array length mismatch: ${issue.path} (${issue.sourceLength} → ${issue.targetLength})`);
            break;
          default:
            console.log(`${index + 1}. ❓ ${issue.type}: ${issue.path}`);
        }
      });
    }
    
    if (extraKeys.length > 0) {
      console.log(`\n🔍 Found ${extraKeys.length} extra keys to remove:`);
      extraKeys.slice(0, 10).forEach((key, index) => {
        console.log(`${index + 1}. 🗑️  Extra: ${key}`);
      });
      if (extraKeys.length > 10) {
        console.log(`... and ${extraKeys.length - 10} more extra keys`);
      }
    }
    
    // Create backup
    const backupPath = this.createBackup();
    
    // Remove extra keys and fix structure
    let cleanedData = this.removeExtraKeys(sourceData, targetData);
    const fixedData = this.ensureCompleteStructure(sourceData, cleanedData, this.targetLanguage);
    
    // Validate the fix
    const postFixIssues = this.validateStructureConsistency(sourceData, fixedData);
    const postFixKeyIssues = this.deepCompareKeys(sourceData, fixedData);
    const finalExtraKeys = [];
    function findFinalExtraKeys(source, target, path = '') {
      for (const key in target) {
        const currentPath = path ? `${path}.${key}` : key;
        if (!(key in source)) {
          finalExtraKeys.push(currentPath);
        } else if (typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key]) && typeof source[key] === 'object' && source[key] !== null) {
          findFinalExtraKeys(source[key], target[key], currentPath);
        }
      }
    }
    findFinalExtraKeys(sourceData, fixedData);
    
    // Save fixed data
    if (this.saveJson(this.targetFile, fixedData)) {
      if (this.report.missingKeys > 0) {
        console.log(`\n✅ Fixed ${this.report.missingKeys} missing keys`);
      }
      if (extraKeys.length > 0) {
        console.log(`\n🗑️  Removed ${extraKeys.length} extra keys`);
      }
      console.log(`📊 Source keys: ${this.countKeys(sourceData)}`);
      console.log(`📊 Target keys: ${this.countKeys(fixedData)}`);
      console.log(`📊 Remaining issues: ${postFixIssues.length + postFixKeyIssues.length + finalExtraKeys.length}`);
    }
    
    // Generate comprehensive report
    this.generateReport([...allIssues, ...extraKeys.map(key => ({ type: 'extra', path: key }))], sourceData, fixedData);
    
    return true;
  }

  async processAllLanguages(removeExtra = false) {
    const languages = ['es', 'fr', 'ja', 'ru', 'zh', 'de'];
    const results = [];
    
    console.log("🚀 Starting UI-locales structure fixer for ALL languages...\n");
    
    for (const lang of languages) {
      console.log(`\n📂 Processing ${lang}...`);
      
      const fixer = new UiLocalesFixer(lang);
      const sourceData = fixer.loadJson(fixer.sourceFile);
      const targetData = fixer.loadJson(fixer.targetFile);
      
      console.log(`   📁 Source: en.json (${fixer.countKeys(sourceData)} keys)`);
      console.log(`   📁 Target: ${lang}.json (${fixer.countKeys(targetData)} keys)`);
      
      const structureIssues = fixer.validateStructureConsistency(sourceData, targetData);
      const keyIssues = fixer.deepCompareKeys(sourceData, targetData);
      
      // Check for extra keys
      const extraKeys = [];
      if (removeExtra) {
        function findExtraKeys(source, target, path = '') {
          for (const key in target) {
            const currentPath = path ? `${path}.${key}` : key;
            if (!(key in source)) {
              extraKeys.push(currentPath);
            } else if (typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key]) && typeof source[key] === 'object' && source[key] !== null) {
              findExtraKeys(source[key], target[key], currentPath);
            }
          }
        }
        findExtraKeys(sourceData, targetData);
      }
      
      const allIssues = [...structureIssues, ...keyIssues];
      
      if (allIssues.length === 0 && extraKeys.length === 0) {
        console.log(`   ✅ ${lang} is already consistent and complete!`);
        results.push({ language: lang, status: 'complete', issues: 0, extraKeys: 0 });
        continue;
      }
      
      const totalIssues = allIssues.length + extraKeys.length;
      console.log(`   🔍 Found ${totalIssues} issues to fix (${allIssues.length} structural, ${extraKeys.length} extra keys)`);
      
      // Create backup
      fixer.createBackup();
      
      // Fix the structure
      let fixedData = targetData;
      if (removeExtra && extraKeys.length > 0) {
        fixedData = fixer.removeExtraKeys(sourceData, fixedData);
      }
      fixedData = fixer.ensureCompleteStructure(sourceData, fixedData, lang);
      
      // Save fixed data
      if (fixer.saveJson(fixer.targetFile, fixedData)) {
        if (fixer.report.missingKeys > 0) {
          console.log(`   ✅ Fixed ${fixer.report.missingKeys} missing keys for ${lang}`);
        }
        if (extraKeys.length > 0) {
          console.log(`   🗑️  Removed ${extraKeys.length} extra keys for ${lang}`);
        }
        fixer.generateReport([...allIssues, ...extraKeys.map(key => ({ type: 'extra', path: key }))], sourceData, fixedData);
        results.push({ 
          language: lang, 
          status: 'fixed', 
          issues: totalIssues,
          fixedKeys: fixer.report.missingKeys,
          removedKeys: extraKeys.length
        });
      } else {
        results.push({ language: lang, status: 'error', issues: totalIssues });
      }
    }
    
    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 SUMMARY REPORT");
    console.log("=".repeat(50));
    
    results.forEach(result => {
      const status = result.status === 'complete' ? '✅' : 
                    result.status === 'fixed' ? '🛠️' : '❌';
      console.log(`${status} ${result.language}: ${result.status} (${result.issues || 0} issues)`);
    });
    
    return results;
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const allLanguages = args.includes('--all-languages') || args.includes('-a');
  const removeExtra = args.includes('--remove-extra-keys') || args.includes('-r');
  const verbose = args.includes('--verbose') || args.includes('-v');
  
  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
UI Locales Fixer - Ensure consistent translations across all languages

Usage:
  node fixer-ui.js [language] [options]

Options:
  --all-languages, -a        Process all languages (es, fr, ja, ru, zh, de)
  --remove-extra-keys, -r    Remove extra keys not in English file
  --verbose, -v              Show detailed processing information
  --help, -h                 Show this help message

Examples:
  node fixer-ui.js                    # Process German (de.json)
  node fixer-ui.js es                 # Process Spanish (es.json)
  node fixer-ui.js --all-languages    # Process all languages
  node fixer-ui.js --all-languages --remove-extra-keys  # Process all + remove extras
`);
    process.exit(0);
  }
  
  if (allLanguages) {
    const fixer = new UiLocalesFixer();
    fixer.processAllLanguages(removeExtra).catch(error => {
      console.error('❌ Error running UI-locales fixer for all languages:', error);
      process.exit(1);
    });
  } else {
    const targetLang = args.find(arg => !arg.startsWith('-')) || 'de';
    const fixer = new UiLocalesFixer(targetLang);
    fixer.run(removeExtra).catch(error => {
      console.error('❌ Error running UI-locales fixer:', error);
      process.exit(1);
    });
  }
}

module.exports = UiLocalesFixer;