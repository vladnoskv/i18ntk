#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist-lite');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src)) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Clean dist directory
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist);

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

for (const entry of pkg.files || []) {
  const src = path.join(root, entry);
  const dest = path.join(dist, entry);
  if (!fs.existsSync(src)) continue;
  const stat = fs.statSync(src);
  if (entry === 'ui-locales/' && stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    fs.copyFileSync(path.join(src, 'en.json'), path.join(dest, 'en.json'));
  } else if (stat.isDirectory()) {
    copyDir(src, dest);
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

const litePkg = { ...pkg, name: pkg.name + '-lite' };
litePkg.files = (pkg.files || []).map(f => f === 'ui-locales/' ? 'ui-locales/en.json' : f);
fs.writeFileSync(path.join(dist, 'package.json'), JSON.stringify(litePkg, null, 2));

console.log('Lite package created at', dist);