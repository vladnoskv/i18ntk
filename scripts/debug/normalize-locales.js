#!/usr/bin/env node

/**
 * normalize-locales.js
 *
 * Recursively aligns the structure and nesting of all locale files to match en.json.
 * - Fills missing keys with a placeholder (e.g., "[MISSING]").
 * - Reports extra keys not present in en.json.
 * - Optionally can fix files in-place or just report (dry run).
 *
 * Usage:
 *   node normalize-locales.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.resolve(__dirname, '../../ui-locales');
const REFERENCE_LANG = 'en.json';
const PLACEHOLDER = '[NOT TRANSLATED]';
const DRY_RUN = process.argv.includes('--dry-run');

function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`Failed to parse ${filePath}:`, e.message);
    return null;
  }
}

function hasDuplicateKeys(jsonString) {
  const keyStack = [];
  const keySetStack = [new Set()];
  let inString = false, key = '', expectingKey = false, depth = 0;
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];
    if (char === '"' && jsonString[i - 1] !== '\\') {
      inString = !inString;
      if (!inString && expectingKey) {
        if (keySetStack[depth].has(key)) return true;
        keySetStack[depth].add(key);
        key = '';
        expectingKey = false;
      }
      continue;
    }
    if (inString) {
      if (expectingKey) key += char;
      continue;
    }
    if (char === '{') {
      depth++;
      keySetStack[depth] = new Set();
    } else if (char === '}') {
      keySetStack.pop();
      depth--;
    } else if (char === ':' && !inString) {
      expectingKey = false;
    } else if (char === ',' && !inString) {
      expectingKey = true;
    } else if (!inString && expectingKey && /[\w\d_]/.test(char)) {
      key += char;
    }
  }
  return false;
}

function saveJson(filePath, data) {
  const jsonString = JSON.stringify(data, null, 2);
  if (hasDuplicateKeys(jsonString)) {
    console.error(`Duplicate keys detected in ${filePath}. File not saved.`);
    return;
  }
  fs.writeFileSync(filePath, jsonString, 'utf8');
}

function normalizeObject(ref, target, pathArr = [], report = {missing: [], extra: []}) {
  // Add missing keys from ref to target
  for (const key of Object.keys(ref)) {
    if (!(key in target)) {
      target[key] = typeof ref[key] === 'object' && ref[key] !== null ? {} : PLACEHOLDER;
      report.missing.push([...pathArr, key].join('.'));
    }
    if (typeof ref[key] === 'object' && ref[key] !== null) {
      if (typeof target[key] !== 'object' || target[key] === null) {
        target[key] = {};
      }
      normalizeObject(ref[key], target[key], [...pathArr, key], report);
    }
  }
  // Find extra keys in target not in ref
  for (const key of Object.keys(target)) {
    if (!(key in ref)) {
      report.extra.push([...pathArr, key].join('.'));
    }
  }
  return report;
}

function replaceMissingPlaceholders(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      replaceMissingPlaceholders(obj[key]);
    } else if (obj[key] === '[MISSING]') {
      obj[key] = PLACEHOLDER;
    }
  }
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
    const report = normalizeObject(refJson, targetJson);
    replaceMissingPlaceholders(targetJson);
    if (report.missing.length || report.extra.length) {
      console.log(`\n[${file}]`);
      if (report.missing.length) {
        console.log('  Missing keys:');
        report.missing.forEach(k => console.log('    -', k));
      }
      if (report.extra.length) {
        console.log('  Extra keys:');
        report.extra.forEach(k => console.log('    -', k));
      }
      if (!DRY_RUN) {
        saveJson(filePath, targetJson);
        console.log('  File updated.');
      } else {
        console.log('  (Dry run: no changes made)');
      }
    } else {
      console.log(`\n[${file}] No changes needed.`);
    }
  }
  console.log('\nNormalization complete.');
}

main();