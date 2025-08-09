// scripts/smoke-pack.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function run(cmd, opts = {}) { return execSync(cmd, { stdio: 'inherit', ...opts }); }

// Create pack
const tarball = execSync('npm pack --silent', { stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim().split('\n').pop();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-smoke-'));

// Init temp project & install the packed tarball
run('npm init -y', { cwd: tmp });
run(`npm i "${path.resolve(tarball)}" --silent`, { cwd: tmp });

// 1) Verify locales exist in installed package
const pkgLocales = path.join(tmp, 'node_modules', 'i18ntk', 'ui-locales', 'en.json');
if (!fs.existsSync(pkgLocales)) {
  console.error('Missing packaged ui-locales/en.json at:', pkgLocales);
  // Also check the actual structure
  const actualPath = path.join(tmp, 'node_modules', 'i18ntk');
  if (fs.existsSync(actualPath)) {
    console.log('Package contents:', fs.readdirSync(actualPath));
    console.log('ui-locales contents:', fs.existsSync(path.join(actualPath, 'ui-locales')) ? fs.readdirSync(path.join(actualPath, 'ui-locales')) : 'ui-locales not found');
  }
  process.exit(2);
}

// 2) Verify loader can load and produce a title
const script = "const {loadTranslations,t}=require('i18ntk/utils/i18n-helper'); loadTranslations('en'); const v=t('menu.title'); console.log('Loaded title:', v); if(!v||v==='menu.title'){process.exit(3)}; console.log('✅ Translation loaded successfully');";
try { execSync(`node -e "${script}"`, { cwd: tmp, stdio: 'inherit' }); } catch { process.exit(3); }

console.log('✅ smoke-pack ok');