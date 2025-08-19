#!/usr/bin/env node
/**
 * validate-all-translations.js (Upgraded)
 * ---------------------------------------
 * Validates i18n translation files:
 *  1. All locales have same keys as English
 *  2. No missing or extra keys
 *  3. No placeholder markers
 *  4. No leftover country code prefixes in non-English locales
 *  5. No untranslated English values in non-English locales
 *
 * Usage:
 *  node scripts/validate-all-translations.js \
 *    --i18n-dir=./ui-locales \
 *    --languages=en,de,es,fr,ru,ja,zh
 */

const fs = require('fs');
const path = require('path');
const SecurityUtils = require('../utils/security');

const argv = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
  })
);

const I18N_DIR = path.resolve(argv['i18n-dir'] || './ui-locales');
const LANGS    = (argv.languages || 'en,de,es,fr,ru,ja,zh').split(',').map(s => s.trim());
const MARKER   = argv.marker || '⚠️ TRANSLATION NEEDED ⚠️';

// ------------ helpers ------------
function readJSON(p) {
  try { return JSON.parse(SecurityUtils.safeReadFile(p, 'utf8')); }
  catch { return {}; }
}

function flatten(obj, prefix = '') {
  const out = {};
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) {
      const full = prefix ? `${prefix}.${k}` : k;
      Object.assign(out, flatten(v, full));
    }
    return out;
  }
  out[prefix] = obj;
  return out;
}

function listLocaleFile(lang) {
  const file = path.join(I18N_DIR, `${lang}.json`);
  if (SecurityUtils.safeExists(file)) return file;
  throw new Error(`Locale file not found: ${file}`);
}

// ------------ validation ------------
function validate() {
  console.log(`🔍 Validating translations in: ${I18N_DIR}`);
  console.log(`🌐 Languages: ${LANGS.join(', ')}`);
  console.log('');

  // Load EN baseline
  const enFlat = flatten(readJSON(listLocaleFile('en')));
  const report = {};

  LANGS.forEach(lang => {
    const langFile = listLocaleFile(lang);
    const flat = flatten(readJSON(langFile));

    const missing = [];
    const extra   = [];
    const markers = [];
    const countryCodeLeftovers = [];
    const englishLeftovers = [];

    // Compare keys
    for (const k of Object.keys(enFlat)) {
      if (!(k in flat)) {
        missing.push(k);
      } else {
        const val = flat[k];
        if (typeof val === 'string') {
          // Placeholder marker check
          if (val.includes(MARKER)) {
            markers.push(k);
          }
          // Country code leftover check
          if (lang !== 'en' && /^\[[A-Z]{2}\]/.test(val.trim())) {
            countryCodeLeftovers.push(k);
          }
          // English leftover check
          if (lang !== 'en' && val.trim() === enFlat[k]?.trim()) {
            englishLeftovers.push(k);
          }
        }
      }
    }

    // Extra keys not in EN
    for (const k of Object.keys(flat)) {
      if (!(k in enFlat)) {
        extra.push(k);
      }
    }

    report[lang] = {
      missing,
      extra,
      markers,
      countryCodeLeftovers,
      englishLeftovers
    };

    console.log(`📄 ${lang.toUpperCase()}:`);
    console.log(`   Missing: ${missing.length}`);
    console.log(`   Extra: ${extra.length}`);
    console.log(`   Markers: ${markers.length}`);
    if (lang !== 'en') {
      console.log(`   Country code leftovers: ${countryCodeLeftovers.length}`);
      console.log(`   English leftovers: ${englishLeftovers.length}`);
    }
    console.log('');
  });

  const reportFile = path.join(I18N_DIR, 'validation-purity-report.json');
  SecurityUtils.safeWriteFile(reportFile, JSON.stringify(report, null, 2), 'utf8');
  console.log(`✅ Validation report saved: ${reportFile}`);
  console.log(`   Review this file for full details of problematic keys.`);
}

// Run
try {
  validate();
} catch (err) {
  console.error('❌ Validation failed:', err.message);
  process.exit(1);
}