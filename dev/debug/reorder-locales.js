#!/usr/bin/env node
/**
 * reorder-locales.js
 *
 * Reorders and nests all locale files to match en.json, moving existing translations into the correct structure/order.
 * Reports extra keys per file (does not delete them).
 *
 * Usage:
 *   node reorder-locales.js [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.resolve(__dirname, '../../ui-locales');
const REFERENCE_LANG = 'en.json';
const DRY_RUN = process.argv.includes('--dry-run');

function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`Failed to parse ${filePath}:`, e.message);
    return null;
  }
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function reorderAndMerge(ref, target, pathArr = [], extraKeys = []) {
  let result = Array.isArray(ref) ? [] : {};
  // Add keys in reference order
  for (const key of Object.keys(ref)) {
    if (typeof ref[key] === 'object' && ref[key] !== null && !Array.isArray(ref[key])) {
      result[key] = reorderAndMerge(ref[key], (target && target[key]) || {}, [...pathArr, key], extraKeys);
    } else {
      result[key] = (target && key in target) ? target[key] : '';
    }
  }
  // Find extra keys in target not in ref
  if (target && typeof target === 'object') {
    for (const key of Object.keys(target)) {
      if (!(key in ref)) {
        extraKeys.push([...pathArr, key].join('.'));
        result[key] = target[key]; // Keep extra keys at the end
      }
    }
  }
  return result;
}

function main() {
  const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'));
  const refPath = path.join(LOCALES_DIR, REFERENCE_LANG);
  const refJson = loadJson(refPath);
  if (!refJson) {
    console.error('Reference language file not found or invalid:', refPath);
    process.exit(1);
  }
  for (const file of files) {
    if (file === REFERENCE_LANG) continue;
    const filePath = path.join(LOCALES_DIR, file);
    const targetJson = loadJson(filePath);
    if (!targetJson) {
      console.warn(`Skipping invalid JSON: ${file}`);
      continue;
    }
    let extraKeys = [];
    const reordered = reorderAndMerge(refJson, targetJson, [], extraKeys);
    if (extraKeys.length) {
      console.log(`\n[${file}] Extra keys not in en.json:`);
      extraKeys.forEach(k => console.log('  -', k));
    }
    if (!DRY_RUN) {
      saveJson(filePath, reordered);
      console.log(`[${file}] File reordered and updated.`);
    } else {
      console.log(`[${file}] (Dry run: no changes made)`);
    }
  }
  console.log('\nReordering complete.');
}

main();