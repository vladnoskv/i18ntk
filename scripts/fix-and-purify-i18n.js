#!/usr/bin/env node
/**
 * fix-and-purify-i18n.js
 *
 * - Scans source for all i18n keys (CLI/UI/console usage)
 * - Ensures EN has all keys, generating readable defaults
 * - For all other languages:
 *    * Fill missing keys with `[LANGCODE] English text`
 *    * Replace markers with `[LANGCODE] English text`
 *    * Replace wrong country code leftovers with correct one
 *    * Replace pure English leftovers with `[LANGCODE] English text`
 * - Optionally prune extras
 * - Outputs both a fix report and a purity report
 */

const fs = require('fs');
const path = require('path');
const SecurityUtils = require('../utils/security');

// ---------------- CLI ARGUMENTS ----------------
const argv = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
  })
);
const SOURCE_DIR   = path.resolve(argv['source-dir'] || './');
const I18N_DIR     = path.resolve(argv['i18n-dir']   || './ui-locales');
const LANGS        = (argv.languages || 'en,de,es,fr,ru,ja,zh').split(',').map(s => s.trim());
const WRITE        = !!argv.write;
const PRUNE_EXTRAS = !!argv['prune-extras'];

// Regex patterns to detect keys (same as i18ntk-usage.js)
const KEY_PATTERNS = [
  /(?:^|[^.\w])t\(['"`]([^'"`]+)['"`]/g,
  /i18n\.t\(['"`]([^'"`]+)['"`]/g,
  /useTranslation\(\)\.t\(['"`]([^'"`]+)['"`]/g,
  /t\(`([^`]+)`\)/g,
  /i18nKey=['"`]([^'"`]+)['"`]/g,
  /\$t\(['"`]([^'"`]+)['"`]/g,
  /getTranslation\(['"`]([^'"`]+)['"`]/g
];

const EXCLUDE_DIRS = new Set(['node_modules', '.git', path.basename(I18N_DIR)]);
const COUNTRY_CODES = { de: 'DE', es: 'ES', fr: 'FR', ru: 'RU', ja: 'JA', zh: 'ZH' };

// ---------------- HELPERS ----------------
function readUTF8(p) {
  try { return SecurityUtils.safeReadFileSync(p, path.dirname(p), 'utf8'); } catch { return null; }
}
function writeJSON(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  SecurityUtils.safeWriteFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}
function isDir(p) { try { return fs.statSync(p).isDirectory(); } catch { return false; } }
function isFile(p) { try { return fs.statSync(p).isFile(); } catch { return false; } }

function listFilesRecursive(dir, exts = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']) {
  const out = [];
  (function walk(d) {
    for (const name of fs.readdirSync(d)) {
      const full = path.join(d, name);
      if (EXCLUDE_DIRS.has(name)) continue;
      try {
        const st = fs.statSync(full);
        if (st.isDirectory()) walk(full);
        else if (st.isFile() && exts.includes(path.extname(name))) out.push(full);
      } catch {}
    }
  })(dir);
  return out;
}

function extractKeysFromSource(file, patterns = KEY_PATTERNS) {
  const content = readUTF8(file);
  if (!content) return [];
  const keys = [];
  for (const re of patterns) {
    re.lastIndex = 0;
    let m; let guard = 0;
    while ((m = re.exec(content)) && guard++ < 10000) {
      if (m[1]) keys.push(m[1]);
    }
  }
  return keys;
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

function unflatten(map) {
  const root = {};
  for (const [k, v] of Object.entries(map)) {
    const parts = k.split('.');
    let cur = root;
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] = cur[parts[i]] || {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = v;
  }
  return root;
}

function humanizeFromKey(keyPath) {
  const tail = keyPath.split('.').pop().split(':').pop();
  return tail.replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ').replace(/^./, c => c.toUpperCase()).trim();
}

function loadLanguage(lang) {
  const monolith = path.join(I18N_DIR, `${lang}.json`);
  if (isFile(monolith)) {
    try { return { type: 'monolith', path: monolith, data: JSON.parse(readUTF8(monolith) || '{}') }; } catch { return { type: 'monolith', path: monolith, data: {} }; }
  }
  const dir = path.join(I18N_DIR, lang);
  if (isDir(dir)) {
    const data = {};
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
      const p = path.join(dir, f);
      const name = path.basename(f, '.json');
      try { data[name] = JSON.parse(readUTF8(p) || '{}'); } catch { data[name] = {}; }
    }
    return { type: 'dir', path: dir, data };
  }
  return { type: 'monolith', path: monolith, data: {} };
}

function saveLanguage(lang, langObj) {
  if (!WRITE) return;
  if (langObj.type === 'monolith') writeJSON(langObj.path, langObj.data);
  else for (const [ns, obj] of Object.entries(langObj.data)) writeJSON(path.join(langObj.path, `${ns}.json`), obj);
}

// ---------------- MAIN ----------------
(async function main() {
  console.log('🔎 Fix-and-Purify i18n starting...');

  // Scan source files for keys
  const srcFiles = listFilesRecursive(SOURCE_DIR);
  const usedKeys = new Set();
  for (const f of srcFiles) extractKeysFromSource(f).forEach(k => usedKeys.add(k));
  console.log(`📦 Found ${usedKeys.size} unique keys in source.`);

  // EN baseline
  if (!LANGS.includes('en')) LANGS.unshift('en');
  const en = loadLanguage('en');
  const enFlat = flatten(en.data);
  let addedToEn = 0;
  for (const key of usedKeys) {
    if (!(key in enFlat)) {
      enFlat[key] = humanizeFromKey(key);
      addedToEn++;
    }
  }
  en.data = unflatten(enFlat);
  saveLanguage('en', en);

  // Sync & Purify others
  const report = {};
  for (const lang of LANGS.filter(l => l !== 'en')) {
    const langObj = loadLanguage(lang);
    const flat = flatten(langObj.data);
    const missing = [], extras = [], replacedMarkers = [], replacedCountryCodes = [], replacedEnglish = [];

    for (const k of Object.keys(enFlat)) {
      if (!(k in flat)) {
        flat[k] = `[${lang.toUpperCase()}] ${enFlat[k]}`;
        missing.push(k);
      }
    }

    for (const k of Object.keys(flat)) {
      if (!(k in enFlat)) extras.push(k);
      const val = flat[k];
      if (typeof val === 'string') {
        if (/TRANSLATION NEEDED/i.test(val)) {
          flat[k] = `[${lang.toUpperCase()}] ${enFlat[k]}`;
          replacedMarkers.push(k);
        }
        if (/^\[[A-Z]{2}\]/.test(val) && !val.startsWith(`[${COUNTRY_CODES[lang]}]`)) {
          flat[k] = `[${COUNTRY_CODES[lang]}] ${enFlat[k]}`;
          replacedCountryCodes.push(k);
        }
        if (/^[A-Za-z0-9 ,.'!?:;-]+$/.test(val) && val === enFlat[k]) {
          flat[k] = `[${lang.toUpperCase()}] ${enFlat[k]}`;
          replacedEnglish.push(k);
        }
      }
    }

    if (PRUNE_EXTRAS) extras.forEach(k => delete flat[k]);
    langObj.data = unflatten(flat);
    saveLanguage(lang, langObj);

    report[lang] = { missing: missing.length, extras: extras.length, replacedMarkers: replacedMarkers.length, replacedCountryCodes: replacedCountryCodes.length, replacedEnglish: replacedEnglish.length };
    console.log(`🌐 ${lang.toUpperCase()}: +${missing.length}, markers→${replacedMarkers.length}, cc→${replacedCountryCodes.length}, en→${replacedEnglish.length}, extras: ${extras.length}`);
  }

  // Save reports
  const summary = { timestamp: new Date().toISOString(), addedToEnglish: addedToEn, perLanguage: report };
  writeJSON(path.join(I18N_DIR, 'fix-and-purify-report.json'), summary);
  console.log(`📄 Fix-and-purify report saved.`);
})();
