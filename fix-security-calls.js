#!/usr/bin/env node

/**
 * Script to fix incorrect SecurityUtils.safeWriteFileSync calls
 * that should be SecurityUtils.safeReadFileSync for reading files
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing incorrect SecurityUtils.safeWriteFileSync calls...\n');

// Function to find all JS files recursively
function findJSFiles(dir, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && item !== 'node_modules' && item !== '.git') {
      findJSFiles(fullPath, files);
    } else if (item.endsWith('.js') && !fullPath.includes('node_modules')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Find all JavaScript files
const allFiles = findJSFiles('.');
const files = allFiles.filter(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    return content.includes('SecurityUtils.safeWriteFileSync');
  } catch (error) {
    return false;
  }
});

console.log(`Found ${files.length} files with SecurityUtils.safeWriteFileSync calls`);

let fixedCount = 0;

files.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    let modified = false;
    let newContent = content;

    // Pattern 1: JSON.parse(SecurityUtils.safeReadFileSync(path, 'utf8'))
    // This should be JSON.parse(SecurityUtils.safeReadFileSync(path, 'utf8'))
    const pattern1 = /JSON\.parse\(\s*SecurityUtils\.safeWriteFileSync\(\s*([^,)]+),\s*['"]utf8['"]\s*\)\s*\)/g;
    if (pattern1.test(newContent)) {
      newContent = newContent.replace(pattern1, 'JSON.parse(SecurityUtils.safeReadFileSync($1, \'utf8\'))');
      modified = true;
    }

    // Pattern 2: Direct SecurityUtils.safeWriteFileSync calls for reading
    // Look for patterns where the result is used in string operations or parsing
    const lines = newContent.split('\n');
    const modifiedLines = lines.map(line => {
      // Skip lines that are clearly writing (contain JSON.stringify or similar)
      if (line.includes('JSON.stringify') || line.includes('JSON.parse') === false) {
        return line;
      }

      // If line contains SecurityUtils.safeWriteFileSync and is used for reading
      if (line.includes('SecurityUtils.safeWriteFileSync') &&
          (line.includes('JSON.parse') || line.includes('.split(') || line.includes('.trim(') || line.includes('const ') || line.includes('let '))) {
        return line.replace(/SecurityUtils\.safeWriteFileSync/g, 'SecurityUtils.safeReadFileSync');
      }

      return line;
    });

    if (modifiedLines.join('\n') !== newContent) {
      newContent = modifiedLines.join('\n');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log(`✅ Fixed: ${file}`);
      fixedCount++;
    }

  } catch (error) {
    console.log(`❌ Error processing ${file}: ${error.message}`);
  }
});

console.log(`\n🎉 Fixed ${fixedCount} files with incorrect SecurityUtils.safeWriteFileSync calls`);
console.log('\n📝 Summary of changes:');
console.log('- JSON.parse(SecurityUtils.safeReadFileSync(...)) → JSON.parse(SecurityUtils.safeReadFileSync(...))');
console.log('- SecurityUtils.safeWriteFileSync(path, \'utf8\') → SecurityUtils.safeReadFileSync(path, \'utf8\') (for reading operations)');
console.log('\n⚠️  Note: Some files may still need manual review for complex cases');