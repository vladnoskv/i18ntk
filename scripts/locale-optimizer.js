#!/usr/bin/env node

/**
 * Interactive Locale Optimizer Script
 * 
 * Provides an enhanced interactive experience for selecting UI locales
 * during package initialization. Integrates with i18ntk init process.
 * 
 * Usage:
 *   node scripts/locale-optimizer.js --interactive
 *   node scripts/locale-optimizer.js --list
 *   node scripts/locale-optimizer.js --keep en,es,de
 *   node scripts/locale-optimizer.js --restore
 */

const fs = require('fs');
const path = require('path');
const cliHelper = require('../utils/cli-helper');
const JsonOutput = require('../utils/json-output');

class LocaleOptimizer {
  constructor() {
    this.uiLocalesDir = path.join(__dirname, '..', 'ui-locales');
    this.allLocales = ['en', 'de', 'es', 'fr', 'ja', 'ru', 'zh'];
    this.backupDir = path.join(__dirname, '..', 'backups', 'locales');
    this.rl = getGlobalReadline();

  }

  /**
   * List all available locales and their sizes with enhanced UI
   */
  listLocales(options = {}) {
    const { json = false, indent = 2, sortKeys = false } = options;
    
    if (json) {
      const jsonOutput = new JsonOutput('locale-optimizer', '1.9.1');
      
      const available = this.getAvailableLocales();
      let totalSize = 0;
      
      const locales = available.map(locale => {
        const filePath = path.join(this.uiLocalesDir, `${locale}.json`);
        const stats = fs.statSync(filePath);
        const sizeKB = parseFloat((stats.size / 1024).toFixed(1));
        totalSize += stats.size;
        
        return {
          locale,
          name: this.getDisplayName(locale),
          size: sizeKB,
          status: locale === 'en' ? 'required' : 'optional',
          path: filePath
        };
      });
      
      const missing = this.allLocales.filter(l => !available.includes(l));
      
      jsonOutput.setStatus('ok', 'Locale analysis completed');
      jsonOutput.addStats({
        totalLocales: available.length,
        totalSize: parseFloat((totalSize / 1024).toFixed(1)),
        potentialSavings: parseFloat((totalSize/1024 - this.getLocaleSize('en')).toFixed(1)),
        missingLocales: missing.length
      });
      
      jsonOutput.addData({
        locales,
        missing: missing.map(locale => ({
          locale,
          name: this.getDisplayName(locale)
        }))
      });
      
      console.log(JSON.stringify(jsonOutput.getOutput(sortKeys), null, indent));
      return;
    }
    
    console.log('\n📊 UI Locale Package Analysis');
    console.log('═'.repeat(40));
    
    const available = this.getAvailableLocales();
    let totalSize = 0;
    
    if (available.length === 0) {
      console.log('   ❌ No locale files found');
      return;
    }
    
    console.log('   Language   Size    Status');
    console.log('   ─────────────────────────');
    
    available.forEach(locale => {
      const filePath = path.join(this.uiLocalesDir, `${locale}.json`);
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(1);
      totalSize += stats.size;
      
      const displayName = this.getDisplayName(locale);
      const status = locale === 'en' ? 'Required' : 'Optional';
      
      console.log(`   ${locale.toUpperCase()}${' '.repeat(9-locale.length)}${sizeKB.padStart(5)}KB  ${status}`);
    });
    
    const missing = this.allLocales.filter(l => !available.includes(l));
    if (missing.length > 0) {
      console.log(`\n   ⚠️  Missing: ${missing.join(', ').toUpperCase()}`);
    }
    
    console.log(`\n📦 Total package size: ${(totalSize / 1024).toFixed(1)}KB`);
    console.log(`💡 Potential savings: ${(totalSize/1024 - this.getLocaleSize('en')).toFixed(1)}KB (English only)`);
    console.log(`   Run --interactive to optimize now`);
  }

  /**
   * Get display name for locale
   */
  getDisplayName(locale) {
    const names = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'ja': 'Japanese',
      'ru': 'Russian',
      'zh': 'Chinese'
    };
    return names[locale] || locale.toUpperCase();
  }

  /**
   * Keep only specified locales, backup others with warnings
   */
  keepLocales(localesToKeep) {
    const keepList = Array.isArray(localesToKeep) ? localesToKeep : localesToKeep.split(',').map(l => l.trim().toLowerCase());
    
    console.log('🎯 Optimizing package size...');
    console.log(`   Keeping: ${keepList.join(', ').toUpperCase()}`);
    
    // Create backup directory
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    
    let removedCount = 0;
    let savedSpace = 0;
    const removedLocales = [];
    
    this.allLocales.forEach(locale => {
      const filePath = path.join(this.uiLocalesDir, `${locale}.json`);
      const backupPath = path.join(this.backupDir, `${locale}.json`);
      
      if (!keepList.includes(locale) && fs.existsSync(filePath)) {
        // Backup the file
        fs.copyFileSync(filePath, backupPath);
        
        // Remove from ui-locales
        const stats = fs.statSync(filePath);
        savedSpace += stats.size;
        fs.unlinkSync(filePath);
        removedCount++;
        removedLocales.push(locale);
        
        console.log(`   ✅ Removed ${locale.toUpperCase()} (backed up)`);
      }
    });
    
    if (removedCount > 0) {
      console.log(`\n⚠️  WARNING: Removing locales may break UI functionality`);
      console.log(`   If issues occur, restore with: node scripts/locale-optimizer.js --restore`);
      console.log(`   Or reinstall the package: npm install -g i18ntk`);
      
      // Create warning file
      const warningPath = path.join(this.backupDir, 'REMOVED_LOCALES.txt');
      fs.writeFileSync(warningPath, `Removed locales: ${removedLocales.join(',')}\nRestore with: node scripts/locale-optimizer.js --restore`);
    }
    
    const savedKB = (savedSpace / 1024).toFixed(1);
    console.log(`\n🎉 Optimization complete!`);
    console.log(`   Removed: ${removedCount} locales`);
    console.log(`   Saved: ${savedKB}KB`);
    console.log(`   Backup location: ${this.backupDir}`);
  }

  /**
   * Restore locales from backup
   */
  restoreLocales() {
    console.log('🔄 Restoring locales from backup...');
    
    if (!fs.existsSync(this.backupDir)) {
      console.log('   ❌ No backup directory found');
      return;
    }
    
    const backupFiles = fs.readdirSync(this.backupDir).filter(f => f.endsWith('.json'));
    
    if (backupFiles.length === 0) {
      console.log('   ❌ No backup files found');
      return;
    }
    
    let restoredCount = 0;
    
    backupFiles.forEach(file => {
      const backupPath = path.join(this.backupDir, file);
      const restorePath = path.join(this.uiLocalesDir, file);
      
      fs.copyFileSync(backupPath, restorePath);
      restoredCount++;
      console.log(`   ✅ Restored ${file.replace('.json', '').toUpperCase()}`);
    });
    
    console.log(`\n🎉 Restoration complete!`);
    console.log(`   Restored: ${restoredCount} locales`);
  }

  /**
   * Dry run mode - show optimization scenarios without making changes
   */
  dryRun() {
    console.log('🔍 LOCALE OPTIMIZER - DRY RUN MODE');
    console.log('═'.repeat(50));
    
    const available = this.getAvailableLocales();
    const totalSize = this.getTotalSize();
    
    console.log(`📊 Current state:`);
    console.log(`   Total locales: ${available.length}`);
    console.log(`   Total package size: ${totalSize.toFixed(1)}KB`);
    console.log(`   Individual locale sizes:`);
    
    available.forEach(locale => {
      const size = this.getLocaleSize(locale);
      const status = locale === 'en' ? 'REQUIRED' : 'Optional';
      console.log(`   - ${locale.toUpperCase()}: ${size.toFixed(1)}KB (${status})`);
    });

    console.log('\n🎯 Optimization scenarios:');
    
    // Scenario 1: English only
    const enSize = this.getLocaleSize('en');
    console.log(`   Scenario 1: Keep only English (minimal)`);
    console.log(`   - Size: ${enSize.toFixed(1)}KB`);
    console.log(`   - Savings: ${(totalSize - enSize).toFixed(1)}KB (${(((totalSize - enSize) / totalSize) * 100).toFixed(1)}%)`);

    // Scenario 2: English + Spanish
    const esSize = this.getLocaleSize('es');
    const enEsSize = enSize + esSize;
    console.log('\n   Scenario 2: Keep English + Spanish');
    console.log(`   - Size: ${enEsSize.toFixed(1)}KB`);
    console.log(`   - Savings: ${(totalSize - enEsSize).toFixed(1)}KB (${(((totalSize - enEsSize) / totalSize) * 100).toFixed(1)}%)`);

    // Scenario 3: English + Spanish + French
    const frSize = this.getLocaleSize('fr');
    const enEsFrSize = enSize + esSize + frSize;
    console.log('\n   Scenario 3: Keep English + Spanish + French');
    console.log(`   - Size: ${enEsFrSize.toFixed(1)}KB`);
    console.log(`   - Savings: ${(totalSize - enEsFrSize).toFixed(1)}KB (${(((totalSize - enEsFrSize) / totalSize) * 100).toFixed(1)}%)`);

    console.log('\n💡 To run actual optimization:');
    console.log('   node scripts/locale-optimizer.js --interactive');
    console.log('\n✅ Dry run complete - no files were modified');
  }

  /**
   * Interactive locale selection with enhanced UI
   */
  async interactiveSelect() {
    console.log('\n🌍 i18ntk Locale Optimizer');
    console.log('═'.repeat(50));
    console.log('Select which UI locales to keep (English is always kept)');
    console.log('This will reduce package size by removing unused language files\n');
    
    const available = this.getAvailableLocales();
    const selections = new Set(['en']); // Always keep English
    
    console.log('📊 Available locales and sizes:');
    available.forEach(locale => {
      const size = this.getLocaleSize(locale);
      const status = locale === 'en' ? '✅ (Required)' : '○';
      console.log(`   ${status} ${locale.toUpperCase()}: ${size}KB`);
    });
    
    console.log('\n💡 Type locale codes separated by commas (e.g., en,es,de)');
    console.log('   Press Enter to keep all, or type "cancel" to abort\n');
    
    const answer = await cliHelper.prompt('Select locales to keep: ');
    
    if (answer.toLowerCase() === 'cancel') {
      console.log('❌ Operation cancelled');
      cliHelper.close();
      return false;
    }
    
    if (answer.trim() === '') {
      console.log('✅ Keeping all locales');
      cliHelper.close();
      return true;
    }
    
    const selected = answer.split(',').map(l => l.trim().toLowerCase());
    const valid = selected.filter(l => available.includes(l));
    
    if (valid.length === 0) {
      console.log('⚠️  No valid locales selected, keeping all');
      cliHelper.close();
      return true;
    }
    
    // Always include English
    valid.push('en');
    const unique = [...new Set(valid)];
    
    console.log(`\n🎯 Selected: ${unique.join(', ').toUpperCase()}`);
    this.showImpact(unique);
    
    const confirm = await cliHelper.prompt('\nProceed? (y/N): ');
    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
      this.keepLocales(unique.join(','));
      console.log('\n🎉 Package optimized successfully!');
      console.log('💡 Use --restore to bring back removed locales');
    } else {
      console.log('❌ Operation cancelled');
    }
    cliHelper.close();
    return true;
  }

  /**
   * Show size impact of selections
   */
  showImpact(selectedLocales) {
    const allSize = this.getTotalSize();
    const selectedSize = selectedLocales.reduce((sum, locale) => {
      return sum + this.getLocaleSize(locale);
    }, 0);
    
    const saved = allSize - selectedSize;
    const percentage = ((saved / allSize) * 100).toFixed(1);
    
    console.log(`\n📈 Impact Analysis:`);
    console.log(`   Current: ${allSize.toFixed(1)}KB`);
    console.log(`   New:     ${selectedSize.toFixed(1)}KB`);
    console.log(`   Saved:   ${saved.toFixed(1)}KB (${percentage}%)`);
  }

  /**
   * Get available locales
   */
  getAvailableLocales() {
    return this.allLocales.filter(locale => {
      const filePath = path.join(this.uiLocalesDir, `${locale}.json`);
      return fs.existsSync(filePath);
    });
  }

  /**
   * Get locale file size
   */
  getLocaleSize(locale) {
    const filePath = path.join(this.uiLocalesDir, `${locale}.json`);
    if (fs.existsSync(filePath)) {
      return fs.statSync(filePath).size / 1024;
    }
    return 0;
  }

  /**
   * Get total package size
   */
  getTotalSize() {
    return this.getAvailableLocales().reduce((sum, locale) => {
      return sum + this.getLocaleSize(locale);
    }, 0);
  }

  /**
   * Get current active locales
   */
  getActiveLocales() {
    const activeLocales = [];
    
    this.allLocales.forEach(locale => {
      const filePath = path.join(this.uiLocalesDir, `${locale}.json`);
      if (fs.existsSync(filePath)) {
        activeLocales.push(locale);
      }
    });
    
    return activeLocales;
  }
}

  /**
   * Run the optimizer with specified options
   */
  run(options = {})
    const { interactive = false, dryRun = false, list = false, keep = null, restore = false, json = false, indent = 2, sortKeys = false } = options;
    
    if (restore) {
      if (json) {
        const jsonOutput = new JsonOutput('locale-optimizer', '1.9.1');
        jsonOutput.setStatus('ok', 'Locales restored successfully');
        console.log(JSON.stringify(jsonOutput.getOutput(sortKeys), null, indent));
      } else {
        this.restoreLocales();
      }
      return;
    }
    
    if (list) {
      this.listLocales({ json, indent, sortKeys });
      return;
    }
    
    if (keep) {
      if (json) {
        const jsonOutput = new JsonOutput('locale-optimizer', '1.9.1');
        const keepList = Array.isArray(keep) ? keep : keep.split(',').map(l => l.trim().toLowerCase());
        
        // Calculate impact
        const allSize = this.getTotalSize();
        const selectedSize = keepList.reduce((sum, locale) => sum + this.getLocaleSize(locale), 0);
        const saved = allSize - selectedSize;
        
        jsonOutput.setStatus('ok', 'Locales optimized successfully');
        jsonOutput.addStats({
          kept: keepList.length,
          removed: this.allLocales.length - keepList.length,
          originalSize: parseFloat(allSize.toFixed(1)),
          newSize: parseFloat(selectedSize.toFixed(1)),
          saved: parseFloat(saved.toFixed(1))
        });
        
        this.keepLocales(keep);
        console.log(JSON.stringify(jsonOutput.getOutput(sortKeys), null, indent));
      } else {
        this.keepLocales(keep);
      }
      return;
    }
    
    if (dryRun) {
      if (json) {
        const jsonOutput = new JsonOutput('locale-optimizer', '1.9.1');
        const available = this.getAvailableLocales();
        const totalSize = this.getTotalSize();
        const enSize = this.getLocaleSize('en');
        
        jsonOutput.setStatus('ok', 'Dry run analysis completed');
        jsonOutput.addStats({
          totalLocales: available.length,
          totalSize: parseFloat(totalSize.toFixed(1)),
          potentialSavings: parseFloat((totalSize - enSize).toFixed(1))
        });
        
        jsonOutput.addData({
          scenarios: [
            {
              name: 'English only',
              locales: ['en'],
              size: parseFloat(enSize.toFixed(1)),
              savings: parseFloat((totalSize - enSize).toFixed(1))
            }
          ]
        });
        
        console.log(JSON.stringify(jsonOutput.getOutput(sortKeys), null, indent));
      } else {
        this.dryRun();
      }
      return;
    }
    
    if (interactive) {
      if (json) {
        const jsonOutput = new JsonOutput('locale-optimizer', '1.9.1');
        jsonOutput.setStatus('error', 'Interactive mode not supported with JSON output');
        console.log(JSON.stringify(jsonOutput.getOutput(sortKeys), null, indent));
        return;
      }
      await this.interactiveSelect();
      return;
    }
    
    // Default to list mode
    this.listLocales({ json, indent, sortKeys });

// CLI Handler
async function main() {
  const optimizer = new LocaleOptimizer();
  const args = process.argv.slice(2);
  
  // Parse arguments
  const options = {
    interactive: args.includes('--interactive'),
    list: args.includes('--list'),
    restore: args.includes('--restore'),
    dryRun: args.includes('--dry-run'),
    json: args.includes('--json')
  };
  
  // Extract JSON formatting options
  const jsonArgs = {
    indent: 2,
    sortKeys: false,
    newline: 'lf'
  };
  
  const indentArg = args.find(arg => arg.startsWith('--indent='));
  if (indentArg) {
    jsonArgs.indent = parseInt(indentArg.split('=')[1]) || 2;
  }
  
  if (args.includes('--sort-keys')) {
    jsonArgs.sortKeys = true;
  }
  
  const newlineArg = args.find(arg => arg.startsWith('--newline='));
  if (newlineArg) {
    jsonArgs.newline = newlineArg.split('=')[1] || 'lf';
  }
  
  // Handle --keep with value extraction
  const keepArg = args.find(arg => arg.startsWith('--keep='));
  if (keepArg) {
    options.keep = keepArg.split('=')[1];
  }
  
  // Handle --remove with value extraction (converted to keep)
  const removeArg = args.find(arg => arg.startsWith('--remove='));
  if (removeArg) {
    const localesToRemove = removeArg.split('=')[1].split(',').map(x => x.trim());
    const keepLocales = optimizer.allLocales.filter(l => !localesToRemove.includes(l));
    options.keep = keepLocales.join(',');
  }
  
  // Handle --init
  if (args.includes('--init')) {
    console.log('\n📦 Package Size Optimization');
    console.log('═'.repeat(30));
    optimizer.listLocales();
    
    const answer = await cliHelper.prompt('\nOptimize package size now? (Y/n): ');
    if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
      console.log('   Skipping optimization (you can run later with --interactive)');
      cliHelper.close();
      return;
    } else {
      cliHelper.close();
      options.interactive = true;
    }
  }
  
  if (!options.interactive && !options.list && !options.keep && !options.restore && !options.dryRun && !args.includes('--init')) {
    console.log('🌍 i18ntk Locale Optimizer v2.0');
    console.log('═'.repeat(35));
    console.log('Interactive package size optimization for UI locales');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/locale-optimizer.js --interactive  🎯 Interactive selection');
    console.log('  node scripts/locale-optimizer.js --list        📊 List all locales');
    console.log('  node scripts/locale-optimizer.js --keep en,es,de  ⚡ Quick keep');
    console.log('  node scripts/locale-optimizer.js --restore     🔄 Restore all locales');
    console.log('  node scripts/locale-optimizer.js --init       🚀 Called during init');
    console.log('  node scripts/locale-optimizer.js --dry-run    🔍 Simulation mode');
    console.log('');
    console.log('💡 Example: Keep only English and Spanish');
    console.log('   node scripts/locale-optimizer.js --keep en,es');
    return;
  }
  
  await optimizer.run({
    ...options,
    json: jsonArgs,
    indent: jsonArgs.indent,
    sortKeys: jsonArgs.sortKeys
  });
}

if (require.main === module) {
  main();
}

module.exports = LocaleOptimizer;