#!/usr/bin/env node
/*
  Runtime helper integration test
  - Verifies env override (I18NTK_RUNTIME_DIR)
  - Verifies config-manager env override (I18NTK_I18N_DIR)
  - Verifies default resolution from process.cwd (simulating node_modules consumer)
*/

const fs = require('fs');
const path = require('path');
const os = require('os');

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function writeJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); }
function assert(cond, msg) { if (!cond) { throw new Error(`Assertion failed: ${msg}`); } }

(async function main() {
  const startCwd = process.cwd();
  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-runtime-'));

  // Scenario A: I18NTK_RUNTIME_DIR override
  const A_locales = path.join(tmpBase, 'A_locales');
  ensureDir(path.join(A_locales, 'en'));
  ensureDir(path.join(A_locales, 'fr'));
  writeJson(path.join(A_locales, 'en', 'common.json'), { greeting: 'Hi {name}' });
  writeJson(path.join(A_locales, 'fr', 'common.json'), { greeting: 'Salut {name}' });

  process.env.I18NTK_RUNTIME_DIR = A_locales;
  const runtime1 = require('../runtime');
  runtime1.initRuntime({ preload: true, language: 'en', fallbackLanguage: 'en' });
  // No implicit namespacing by filename; keys are taken as-is from JSON content
  assert(runtime1.t('greeting', { name: 'Ada' }) === 'Hi Ada', 'env override EN');
  runtime1.setLanguage('fr');
  assert(runtime1.translate('greeting', { name: 'Ada' }) === 'Salut Ada', 'env override FR');

  // Scenario B: I18NTK_I18N_DIR via config-manager env (single-file per lang)
  const B_locales = path.join(tmpBase, 'B_locales');
  ensureDir(B_locales);
  writeJson(path.join(B_locales, 'en.json'), { nav: { home: 'Home' } });
  writeJson(path.join(B_locales, 'fr.json'), { nav: { home: 'Accueil' } });
  delete process.env.I18NTK_RUNTIME_DIR;
  process.env.I18NTK_I18N_DIR = B_locales;

  // Reuse same module: re-init should pick new base via config-manager
  runtime1.initRuntime({ preload: true, language: 'fr', fallbackLanguage: 'en' });
  const langs = runtime1.getAvailableLanguages();
  assert(Array.isArray(langs) && langs.includes('en') && langs.includes('fr'), 'available languages from config-manager');
  assert(runtime1.t('nav.home') === 'Accueil', 'config-manager FR value');

  // Scenario C: Default resolution from CWD (simulate consumer project root)
  const C_project = path.join(tmpBase, 'C_project');
  const C_locales = path.join(C_project, 'locales');
  ensureDir(path.join(C_locales, 'en'));
  ensureDir(path.join(C_locales, 'de'));
  writeJson(path.join(C_locales, 'en', 'ui.json'), { ui: { title: 'Dashboard' } });
  writeJson(path.join(C_locales, 'de', 'ui.json'), { ui: { /* missing title to test fallback */ } });

  delete process.env.I18NTK_I18N_DIR;
  process.chdir(C_project);

  runtime1.initRuntime({ preload: true, language: 'de', fallbackLanguage: 'en' });
  assert(runtime1.t('ui.title') === 'Dashboard', 'fallback from EN when DE missing');

  // Cleanup and report
  process.chdir(startCwd);
  console.log('✅ runtime.test.js passed');
})().catch(err => {
  console.error('❌ runtime.test.js failed:', err && err.stack || err);
  process.exit(1);
});
