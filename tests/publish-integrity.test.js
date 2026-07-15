'use strict';
const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const FILES_SET = new Set(pkg.files || []);

function findRelativeRequires(dir, skipDirs = []) {
  const results = {};
  const stack = [dir];
  const skip = new Set(skipDirs);
  while (stack.length > 0) {
    const d = stack.pop();
    let entries;
    try { entries = fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }); }
    catch { continue; }
    for (const e of entries) {
      if (e.name.startsWith('.') || skip.has(d + '/' + e.name)) continue;
      if (e.name === 'node_modules' || e.name === 'ui-locales' || e.name === 'tests' ||
          e.name === 'sandbox' || e.name === 'test_env') continue;
      const full = path.join(ROOT, d, e.name);
      if (e.isDirectory()) {
        stack.push(d + '/' + e.name);
      } else if (e.isFile() && e.name.endsWith('.js')) {
        try {
          const content = fs.readFileSync(full, 'utf8');
          const cleanContent = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
          const re = /require\s*\(\s*['"](\.[^'"]+)['"]\)/g;
          let m;
          while ((m = re.exec(cleanContent)) !== null) {
            const resolved = path.resolve(path.dirname(full), m[1]);
            const rel = path.relative(ROOT, resolved).replace(/\\/g, '/');
            if (!rel.startsWith('..') && rel.length > 0) {
              if (!results[rel]) results[rel] = [];
              results[rel].push(path.relative(ROOT, full).replace(/\\/g, '/'));
            }
          }
        } catch (_) {}
      }
    }
  }
  return results;
}

function expandPackageFiles(filesArray) {
  // npm always includes package.json, README, LICENSE and the main/bin targets.
  const included = new Set(['package.json']);
  for (const f of filesArray) {
    if (f.endsWith('/')) {
      const dirPath = path.join(ROOT, f);
      (function walk(d) {
        if (!fs.existsSync(d)) return;
        let entries;
        try { entries = fs.readdirSync(d, { withFileTypes: true }); }
        catch { return; }
        for (const e of entries) {
          const full = path.join(d, e.name);
          const rel = path.relative(ROOT, full).replace(/\\/g, '/');
          if (e.isFile()) included.add(rel);
          else if (e.isDirectory()) walk(full);
        }
      })(dirPath);
    } else {
      included.add(f);
    }
  }
  return included;
}

// ── Module Resolution ─────────────────────────────────────────────────

describe('Module Resolution', () => {
  const allRequires = Object.assign({}, ...['main', 'settings', 'utils', 'runtime'].map(dir => findRelativeRequires(dir)));

  it('all production require() calls resolve to existing files', () => {
    const missing = [];
    for (const [mod, callers] of Object.entries(allRequires)) {
      if (!fs.existsSync(path.join(ROOT, mod)) && !fs.existsSync(path.join(ROOT, mod + '.js'))) {
        const isTestEnv = callers.every(c => c.startsWith('test_env/'));
        if (!isTestEnv) {
          missing.push({ module: mod, callers: callers.slice(0, 2) });
        }
      }
    }
    assert.strictEqual(missing.length, 0,
      'Missing modules: ' + missing.map(m => m.module + ' (from ' + m.callers.join(', ') + ')').join('; '));
  });

  it('all files in main/ and utils/ resolve when required', () => {
    const required = ['main/manage/index.js', 'utils/framework-detector.js', 'utils/language-menu.js',
      'utils/promptPin.js', 'utils/i18n-helper.js', 'utils/config-manager.js', 'utils/security.js'];
    for (const f of required) {
      assert.doesNotThrow(() => require(path.join(ROOT, f)),
        'Should be able to require ' + f);
    }
  });
});

// ── Publish Coverage ──────────────────────────────────────────────────

describe('Publish Coverage', () => {
  const included = expandPackageFiles(pkg.files);
  const allRequires = Object.assign({}, ...['main', 'settings', 'utils', 'runtime'].map(dir => findRelativeRequires(dir)));

  it('utils/language-menu.js is in package.json files array', () => {
    assert.ok(included.has('utils/language-menu.js') || FILES_SET.has('utils/language-menu.js'),
      'language-menu.js must be in files array');
  });

  it('utils/promptPin.js is in package.json files array', () => {
    assert.ok(included.has('utils/promptPin.js') || FILES_SET.has('utils/promptPin.js'),
      'promptPin.js must be in files array');
  });

  it('all required files are included in publish list', () => {
    const missing = [];
    for (const mod of Object.keys(allRequires)) {
      const isTestEnv = (allRequires[mod] || []).every(c => c.startsWith('test_env/'));
      if (!isTestEnv && !included.has(mod) && !included.has(mod + '.js')) {
        missing.push(mod);
      }
    }
    assert.deepStrictEqual(missing, [], 'Every statically required production module must be published');
  });

  it('package.json version matches package.public.json', () => {
    const pub = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.public.json'), 'utf8'));
    assert.strictEqual(pub.version, pkg.version, 'package.json and package.public.json versions must match');
  });
});

// ── Import Analysis ───────────────────────────────────────────────────

describe('Import Analysis', () => {
  it('utils/language-menu.js is imported by production code', () => {
    const indexContent = fs.readFileSync(path.join(ROOT, 'main/manage/index.js'), 'utf8');
    assert.ok(indexContent.includes('language-menu'),
      'manage/index.js should import language-menu');
  });

  it('utils/promptPin.js is imported by admin-pin.js', () => {
    const content = fs.readFileSync(path.join(ROOT, 'utils/admin-pin.js'), 'utf8');
    assert.ok(content.includes('promptPin'),
      'admin-pin.js should import promptPin');
  });
});
