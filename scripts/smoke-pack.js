// scripts/smoke-pack.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

function run(cmd, opts = {}) { return execSync(cmd, { stdio: 'inherit', ...opts }); }

// Ensure we're in the package root
const packageRoot = path.dirname(__dirname);
process.chdir(packageRoot);

// Create pack
const tarball = execSync('npm pack --silent', { stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim().split('\n').pop();
const tarballPath = path.resolve(tarball);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'i18ntk-smoke-'));

// Init temp project & install the packed tarball
run('npm init -y', { cwd: tmp });
run(`npm i "${tarballPath}" --silent`, { cwd: tmp });

// 1) Verify package structure and locales
const installed = path.join(tmp, 'node_modules', 'i18ntk');
const pkgLocales = path.join(installed, 'ui-locales', 'en.json');
console.log('Checking path:', pkgLocales);
console.log('Temp directory:', tmp);

['main', 'utils', 'settings', 'ui-locales'].forEach(dir => {
  const p = path.join(installed, dir);
  if (!fs.existsSync(p)) {
    console.error('Missing packaged directory:', dir);
    process.exit(2);
  }
});

if (fs.existsSync(path.join(installed, 'ui-locales', 'en'))) {
  console.error('Unexpected directory in package: ui-locales/en');
  process.exit(2);
}

if (!fs.existsSync(pkgLocales)) {
  console.error('Missing packaged ui-locales/en.json at:', pkgLocales);
 
  process.exit(2);
}

// 2) Create faulty project locales to ensure loader falls back to package
const localLocalesDir = path.join(tmp, 'ui-locales');
fs.mkdirSync(localLocalesDir, { recursive: true });
fs.writeFileSync(path.join(localLocalesDir, 'en.json'), '{', 'utf8'); // invalid JSON

// 3) Verify loader can load and produce a translated string
const script = "const {loadTranslations,t}=require('i18ntk/utils/i18n-helper'); loadTranslations('en'); const v=t('settings.title'); console.log('Loaded title:', v); if(!v||v==='settings.title'){process.exit(3)}; console.log('✅ Translation loaded successfully');";
try { execSync(`node -e "${script}"`, { cwd: tmp, stdio: 'inherit' }); } catch { process.exit(3); }

console.log('✅ smoke-pack ok');