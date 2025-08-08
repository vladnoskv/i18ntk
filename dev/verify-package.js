#!/usr/bin/env node
/**
 * verify-package.js
 * Quick smoke-test before publishing to npm.
 */

const fs = require('fs');
const path = require('path');

const REQUIRED = [
  'package.json',
  'README.md',
  'LICENSE',
  'CHANGELOG.md'
];

const OPTIONAL = [
  'main/i18ntk-init.js',
  'main/i18ntk-analyze.js',
  'main/i18ntk-validate.js'
];

let ok = true;

// Check required files
REQUIRED.forEach(f => {
  if (!fs.existsSync(path.resolve(__dirname, '..', f))) {
    console.error(`❌ Missing required file: ${f}`);
    ok = false;
  }
});

// Check optional files (warn only)
OPTIONAL.forEach(f => {
  if (!fs.existsSync(path.resolve(__dirname, '..', f))) {
    console.warn(`⚠️  Missing optional file: ${f}`);
  }
});

// Read package.json version
const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));
console.log(`✅ Package version: ${pkg.version}`);

if (ok) {
  console.log('✅ Package verification passed.');
  process.exit(0);
} else {
  console.error('❌ Package verification failed.');
  process.exit(1);
}