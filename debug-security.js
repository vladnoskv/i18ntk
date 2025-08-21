const SecurityUtils = require('./utils/security');
const fs = require('fs');
const path = require('path');

console.log('Testing security validation in detail...');

const langDir = './locales/en';
console.log('Testing directory:', langDir);
console.log('Full path:', path.resolve(langDir));

// Test standard fs
console.log('\n=== Standard FS ===');
try {
  const exists = fs.existsSync(langDir);
  console.log('fs.existsSync:', exists);

  if (exists) {
    const stat = fs.lstatSync(langDir);
    console.log('fs.lstatSync.isDirectory:', stat.isDirectory());
    console.log('fs.lstatSync.isSymbolicLink:', stat.isSymbolicLink());

    const dirents = fs.readdirSync(langDir, { withFileTypes: true });
    const files = dirents
      .filter(d => d.isFile())
      .map(d => d.name);
    console.log('fs.readdirSync files:', files);

    const jsonFiles = files
      .filter(f => f.toLowerCase().endsWith('.json'));
    console.log('JSON files:', jsonFiles);
  }
} catch (error) {
  console.error('Standard FS error:', error.message);
}

// Test SecurityUtils
console.log('\n=== SecurityUtils ===');
try {
  const exists = SecurityUtils.safeExistsSync(langDir);
  console.log('SecurityUtils.safeExistsSync:', exists);
  
  if (exists) {
    const files = SecurityUtils.safeReaddirSync(langDir);
    console.log('SecurityUtils.safeReaddirSync files:', files);
    console.log('JSON files:', files.filter(f => f.endsWith('.json')));
  }
} catch (error) {
  console.error('SecurityUtils error:', error.message);
}
let hasLanguageFiles = false;
let standardResult = false;
let securityResult = false;

try {
  standardResult = fs.existsSync(langDir) && fs.lstatSync(langDir).isDirectory();
  console.log('Standard check result (exists + isDirectory):', standardResult);
  if (standardResult) {
    const files = fs.readdirSync(langDir, { withFileTypes: true })
      .filter(d => d.isFile())
      .map(d => d.name);
    standardResult = files.some(f => f.toLowerCase().endsWith('.json'));
    console.log('Standard JSON files present:', standardResult);
  }
} catch (error) {
  console.log('Standard check threw, will try SecurityUtils next...');
}

if (!standardResult) {
  console.log('Trying SecurityUtils...');
  try {
    const exists = SecurityUtils.safeExistsSync(langDir);
    const files = exists ? SecurityUtils.safeReaddirSync(langDir) : [];
    securityResult = exists && Array.isArray(files) && files.some(f => f.toLowerCase().endsWith('.json'));
    console.log('SecurityUtils check result:', securityResult);
  } catch (secError) {
    console.error('SecurityUtils check failed:', secError.stack || secError);
    securityResult = false;
  }
}

hasLanguageFiles = standardResult || securityResult;
try {
    console.log('SecurityUtils check result:', hasLanguageFiles);
} catch (secError) {
    console.error('SecurityUtils check failed:', secError.message);
    hasLanguageFiles = false;
  }


console.log('Final hasLanguageFiles:', hasLanguageFiles);