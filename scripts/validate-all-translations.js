#!/usr/bin/env node
/**
 * validate-all-translations.js
 * ----------------------------
 * Validates i18n translation files:
 *  1. All locales have same keys as English
 *  2. No missing or extra keys
 *  3. No placeholder markers
 *  4. No leftover country code prefixes in non-English locales
 *  5. Reports English-equal values in two buckets:
 *     - raw: exact string equality with English
 *     - actionable: likely untranslated user-facing text
 */

const fs = require('fs');
const path = require('path');
const SecurityUtils = require('../utils/security');

const argv = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
  })
);

const I18N_DIR = path.resolve(argv['i18n-dir'] || './resources/i18n/ui-locales');
const LANGS = (argv.languages || 'en,de,es,fr,ru,ja,zh').split(',').map((s) => s.trim());
const MARKER = argv.marker || 'TRANSLATION NEEDED';
const SHARED_TERMS = new Set(['error', 'errors', 'no', 'yes', 'navigation', 'system', 'modular', 'long']);

function readJSON(p) {
  try {
    const raw = SecurityUtils.safeReadFileSync(p, path.dirname(p), 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
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
  if (SecurityUtils.safeExistsSync(file, path.dirname(file))) return file;
  throw new Error(`Locale file not found: ${file}`);
}

function isActionableEnglishLeftover(value) {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (!v) return false;

  if (!/[A-Za-z]/.test(v)) return false;
  if (/^[=\-_*#\s]+$/.test(v)) return false;
  if (/^[•✅❌⚠️📄📝🔑\s]+$/.test(v)) return false;

  if (/^[-•]?\s*\{[^}]+\}$/.test(v)) return false;
  if (/^\{[^}]+\}[:%\s]/.test(v)) return false;
  if (/^[a-z]+(?:_[a-z0-9]+)+$/i.test(v)) return false;

  if (/^(?:node|npm|npx|pnpm|yarn|i18ntk)\b/i.test(v)) return false;
  if (/^[A-Za-z]:\\/.test(v) || /^https?:\/\//i.test(v)) return false;
  if (v === '\\n') return false;
  if (/^[yn]$/i.test(v)) return false;

  const compact = v.replace(/[^\w]/g, '').toLowerCase();
  if (SHARED_TERMS.has(compact)) return false;

  const scrubbed = v
    .replace(/\{[^}]+\}/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/[•✅❌⚠️📄📝🔑→:()"'[\].,_/%-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!/[A-Za-z]/.test(scrubbed)) return false;

  const words = scrubbed.split(/\s+/).map((w) => w.toLowerCase()).filter(Boolean);
  const technicalWords = new Set([
    'react',
    'vue',
    'nuxt',
    'svelte',
    'i18n',
    'i18next',
    'nuxtjs',
    'index',
    'displayname',
    'current',
    'filename',
    'language',
    'file',
    'path',
    'keypath',
    'value',
    'stepname',
    'status',
    'number',
    'recommendation',
    'message'
  ]);
  if (words.length > 0 && words.every((word) => technicalWords.has(word))) return false;

  return true;
}

function validate() {
  console.log(`Validating translations in: ${I18N_DIR}`);
  console.log(`Languages: ${LANGS.join(', ')}`);
  console.log('');

  const enFlat = flatten(readJSON(listLocaleFile('en')));
  const report = {};

  LANGS.forEach((lang) => {
    const langFile = listLocaleFile(lang);
    const flat = flatten(readJSON(langFile));

    const missing = [];
    const extra = [];
    const markers = [];
    const countryCodeLeftovers = [];
    const englishLeftovers = [];
    const actionableEnglishLeftovers = [];

    for (const k of Object.keys(enFlat)) {
      if (!(k in flat)) {
        missing.push(k);
      } else {
        const val = flat[k];
        if (typeof val === 'string') {
          if (val.includes(MARKER)) {
            markers.push(k);
          }
          if (lang !== 'en' && /^\[[A-Z]{2}\]/.test(val.trim())) {
            countryCodeLeftovers.push(k);
          }
          if (lang !== 'en' && val.trim() === enFlat[k]?.trim()) {
            englishLeftovers.push(k);
            if (isActionableEnglishLeftover(val)) {
              actionableEnglishLeftovers.push(k);
            }
          }
        }
      }
    }

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
      englishLeftovers,
      actionableEnglishLeftovers
    };

    console.log(`${lang.toUpperCase()}:`);
    console.log(`  Missing: ${missing.length}`);
    console.log(`  Extra: ${extra.length}`);
    console.log(`  Markers: ${markers.length}`);
    if (lang !== 'en') {
      console.log(`  Country code leftovers: ${countryCodeLeftovers.length}`);
      console.log(`  English leftovers (raw): ${englishLeftovers.length}`);
      console.log(`  English leftovers (actionable): ${actionableEnglishLeftovers.length}`);
    }
    console.log('');
  });

  const reportFile = path.join(I18N_DIR, 'validation-purity-report.json');
  SecurityUtils.safeWriteFileSync(reportFile, JSON.stringify(report, null, 2), path.dirname(reportFile), 'utf8');
  console.log(`Validation report saved: ${reportFile}`);
}

try {
  validate();
} catch (err) {
  console.error('Validation failed:', err.message);
  process.exit(1);
}
