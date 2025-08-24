#!/usr/bin/env node
/**
 * Fix-all i18n script with auto-copy translations:
 * - Scans source for used i18n keys (console/UI/CLI)
 * - Ensures EN has all used keys (auto-generates readable EN values)
 * - Ensures all target locales have identical key structure as EN
 * - Fills missing values with country code + EN value (instead of generic marker)
 * - Optional: prune extra keys not present in EN
 */

const fs = require('fs');
const path = require('path');

const argv = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
  })
);

const SOURCE_DIR   = path.resolve(argv['source-dir'] || './');
const I18N_DIR     = path.resolve(argv['i18n-dir']   || './resources/i18n/ui-locales');
const LANGS        = (argv.languages || 'en,de,es,fr,ru,ja,zh').split(',').map(s => s.trim());
const WRITE        = !!argv.write;
const PRUNE_EXTRAS = !!argv['prune-extras'];

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

function readUTF8(p) { try { return SecurityUtils.safeWriteFileSync(p, 'utf8'); } catch { return null; } }
function writeJSON(p, obj) { fs.mkdirSync(path.dirname(p), { recursive: true }); SecurityUtils.safeWriteFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8'); }
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
    const txt = readUTF8(monolith);
    try { return { type: 'monolith', path: monolith, data: JSON.parse(txt || '{}') }; } catch { return { type: 'monolith', path: monolith, data: {} }; }
  }
  const dir = path.join(I18N_DIR, lang);
  if (isDir(dir)) {
    const data = {};
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
      const p = path.join(dir, f);
      const name = path.basename(f, '.json');
      const txt = readUTF8(p);
      try { data[name] = JSON.parse(txt || '{}'); } catch { data[name] = {}; }
    }
    return { type: 'dir', path: dir, data };
  }
  return { type: 'monolith', path: monolith, data: {} };
}

function saveLanguage(lang, langObj) {
  if (!WRITE) return;
  if (langObj.type === 'monolith') {
    writeJSON(langObj.path, langObj.data);
  } else {
    for (const [ns, obj] of Object.entries(langObj.data)) {
      const p = path.join(langObj.path, `${ns}.json`);
      writeJSON(p, obj);
    }
  }
}

(async function main() {
  console.log('🔎 Fix-all i18n starting...');
  console.log(`• sourceDir: ${SOURCE_DIR}`);
  console.log(`• i18nDir:   ${I18N_DIR}`);
  console.log(`• languages: ${LANGS.join(', ')}`);
  console.log(`• write:     ${WRITE ? 'yes' : 'no'}`);
  console.log(`• prune:     ${PRUNE_EXTRAS ? 'yes' : 'no'}`);

  const srcFiles = listFilesRecursive(SOURCE_DIR);
  const usedKeys = new Set();
  for (const f of srcFiles) {
    extractKeysFromSource(f).forEach(k => usedKeys.add(k));
  }
  console.log(`📦 Found ${usedKeys.size} unique keys used in source.`);

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
  console.log(`✅ EN normalized. Added ${addedToEn} missing keys from usage scan.`);

  const report = { added: {}, missingBefore: {}, extrasBefore: {} };
  for (const lang of LANGS.filter(l => l !== 'en')) {
    const langObj = loadLanguage(lang);
    const flat = flatten(langObj.data);
    const missing = [];
    const extras = [];

    for (const k of Object.keys(enFlat)) if (!(k in flat)) missing.push(k);
    for (const k of Object.keys(flat)) if (!(k in enFlat)) extras.push(k);

    for (const k of missing) {
      flat[k] = `[${lang.toUpperCase()}] ${enFlat[k]}`;
    }

    if (PRUNE_EXTRAS) {
      for (const k of extras) delete flat[k];
    }

    langObj.data = unflatten(flat);
    saveLanguage(lang, langObj);

    report.added[lang] = missing.length;
    report.missingBefore[lang] = missing;
    report.extrasBefore[lang]  = extras;
    console.log(`🌐 ${lang.toUpperCase()}: +${missing.length} keys ${PRUNE_EXTRAS ? `, pruned ${extras.length}` : `(extras: ${extras.length})`}`);
  }

  const summaryPath = path.join(I18N_DIR, 'fix-all-report.json');
  const summary = {
    timestamp: new Date().toISOString(),
    sourceDir: SOURCE_DIR,
    i18nDir: I18N_DIR,
    languages: LANGS,
    write: !!WRITE,
    pruneExtras: !!PRUNE_EXTRAS,
    usageKeysFound: usedKeys.size,
    addedToEnglish: addedToEn,
    perLanguage: report
  };
  writeJSON(summaryPath, summary);

  const needsHuman = Object.values(report.added).reduce((a,b)=>a+b,0);
  console.log('\n📄 Report saved:', summaryPath);
  console.log(`\n🎯 Done. ${needsHuman ? `${needsHuman} new keys copied from EN with language code.` : 'All locales at parity with EN.'}`);
  if (!WRITE) console.log('\n(Preview mode) Re-run with --write to persist changes.');
  process.exit(needsHuman ? 2 : 0);
})();
