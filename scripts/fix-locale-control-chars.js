#!/usr/bin/env node
/**
 * Fix control characters in locale files
 * Removes problematic newlines and other control chars from JSON strings
 */
const fs = require('fs');
const path = require('path');

const uiLocalesDir = path.join(__dirname, '..', 'ui-locales');

function sanitizeValue(value) {
  if (typeof value === 'string') {
    // Remove/escape control characters but keep the structure
    // Replace literal newlines/tabs with spaces, but preserve intended structure
    return value
      .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, '') // Remove other control chars
      .replace(/\u000A/g, ' ')  // Replace newlines with space
      .replace(/\u000D/g, '')   // Remove carriage returns
      .trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = sanitizeValue(v);
    }
    return result;
  }
  return value;
}

function fixFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    const locale = path.basename(filePath, '.json');
    
    // Sanitize all values
    const sanitized = sanitizeValue(data);
    
    // Write back with proper formatting
    fs.writeFileSync(filePath, JSON.stringify(sanitized, null, 2) + '\n', 'utf8');
    
    console.log(`✓ Fixed ${locale}.json`);
    return true;
  } catch (error) {
    console.error(`✗ Error fixing ${path.basename(filePath)}: ${error.message}`);
    return false;
  }
}

function main() {
  console.log('Fixing control characters in locale files...\n');
  
  const files = fs.readdirSync(uiLocalesDir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(uiLocalesDir, f));
  
  let fixed = 0;
  let failed = 0;
  
  for (const file of files) {
    if (fixFile(file)) {
      fixed++;
    } else {
      failed++;
    }
  }
  
  console.log(`\nFixed ${fixed} file(s)${failed ? `, ${failed} failed` : ''}`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
