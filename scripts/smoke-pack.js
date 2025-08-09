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

// 1) Verify locales exist in installed package
const pkgLocales = path.join(tmp, 'node_modules', 'i18ntk', 'ui-locales', 'en.json');
console.log('Checking path:', pkgLocales);
console.log('Temp directory:', tmp);

if (!fs.existsSync(pkgLocales)) {
  console.error('Missing packaged ui-locales/en.json at:', pkgLocales);
  console.error('Absolute path:', path.resolve(pkgLocales));
  
  // Also check the actual structure
  const actualPath = path.join(tmp, 'node_modules', 'i18ntk');
  console.log('Checking node_modules/i18ntk path:', actualPath);
  
  if (fs.existsSync(actualPath)) {
    console.log('Package contents:', fs.readdirSync(actualPath));
    const uiLocalesPath = path.join(actualPath, 'ui-locales');
    console.log('ui-locales path:', uiLocalesPath);
    console.log('ui-locales exists:', fs.existsSync(uiLocalesPath));
    if (fs.existsSync(uiLocalesPath)) {
      console.log('ui-locales contents:', fs.readdirSync(uiLocalesPath));
    }
  } else {
    console.log('node_modules/i18ntk does not exist at:', actualPath);
    // Check what's in the temp directory
    console.log('Temp directory contents:', fs.readdirSync(tmp));
    const nodeModulesPath = path.join(tmp, 'node_modules');
    if (fs.existsSync(nodeModulesPath)) {
      console.log('node_modules contents:', fs.readdirSync(nodeModulesPath));
    }
  }
  process.exit(2);
}

// 2) Verify loader can load and produce a title
const script = "const {loadTranslations,t}=require('i18ntk/utils/i18n-helper'); loadTranslations('en'); const v=t('menu.title'); console.log('Loaded title:', v); if(!v||v==='menu.title'){process.exit(3)}; console.log('✅ Translation loaded successfully');";
try { execSync(`node -e "${script}"`, { cwd: tmp, stdio: 'inherit' }); } catch { process.exit(3); }

console.log('✅ smoke-pack ok');