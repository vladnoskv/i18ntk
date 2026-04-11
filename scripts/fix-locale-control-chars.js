#!/usr/bin/env node
/**
 * Fix control characters in locale files
 * Removes problematic newlines and other control chars from JSON strings
 */
const fs = require('fs');
const path = require('path');
const SecurityUtils = require('../utils/security');

const uiLocalesDirs = [
  path.join(__dirname, '..', 'ui-locales'),
  path.join(__dirname, '..', 'resources', 'i18n', 'ui-locales')
];

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
    const baseDir = path.dirname(filePath);
    const raw = SecurityUtils.safeReadFileSync(filePath, baseDir, 'utf8');
    if (!raw) {
      console.error(`✗ Error reading ${path.basename(filePath)}`);
      return false;
    }
    
    const data = SecurityUtils.safeParseJSON(raw);
    if (!data) {
      console.error(`✗ Error parsing ${path.basename(filePath)}`);
      return false;
    }
    
    const locale = path.basename(filePath, '.json');
    
    // Sanitize all values
    const sanitized = sanitizeValue(data);
    
    // Write back with proper formatting using SecurityUtils
    const success = SecurityUtils.safeWriteFileSync(
      filePath,
      JSON.stringify(sanitized, null, 2) + '\n',
      baseDir,
      'utf8'
    );
    
    if (success) {
      console.log(`  ✓ Fixed ${locale}.json`);
      return true;
    } else {
      console.error(`  ✗ Error writing ${path.basename(filePath)}`);
      return false;
    }
  } catch (error) {
    console.error(`✗ Error fixing ${path.basename(filePath)}: ${error.message}`);
    return false;
  }
}

function main() {
  console.log('Fixing control characters in locale files...\n');
  
  let fixed = 0;
  let failed = 0;
  
  for (const uiLocalesDir of uiLocalesDirs) {
    if (!SecurityUtils.safeExistsSync(uiLocalesDir)) {
      console.log(`ℹ️  Skipping ${uiLocalesDir} (does not exist)\n`);
      continue;
    }
    
    console.log(`Processing: ${uiLocalesDir}`);
    const files = SecurityUtils.safeReaddirSync(uiLocalesDir, path.dirname(uiLocalesDir))
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(uiLocalesDir, f));
    
    for (const file of files) {
      if (fixFile(file)) {
        fixed++;
      } else {
        failed++;
      }
    }
    console.log();
  }
  
  console.log(`\nFixed ${fixed} file(s)${failed ? `, ${failed} failed` : ''}`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
