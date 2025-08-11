#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { getUnifiedConfig, parseCommonArgs, displayHelp } = require('../utils/config-helper');

const ExitCodes = require('../utils/exit-codes');

function hasBOM(content) {
  return content.charCodeAt(0) === 0xFEFF;
}

function collectPluralKeys(obj, prefix = '', set = new Set()) {
  for (const [key, value] of Object.entries(obj || {})) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const pluralForms = ['zero', 'one', 'two', 'few', 'many', 'other'];
      const keys = Object.keys(value);
      if (keys.some(k => pluralForms.includes(k))) {
        set.add(fullKey);
      }
      collectPluralKeys(value, fullKey, set);
    }
  }
  return set;
}

function compareTypes(src, tgt, prefix = '', issues = []) {
  for (const key of Object.keys(src)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (!(key in tgt)) continue;
    const sVal = src[key];
    const tVal = tgt[key];
    if (sVal && typeof sVal === 'object' && !Array.isArray(sVal) && tVal && typeof tVal === 'object' && !Array.isArray(tVal)) {
      compareTypes(sVal, tVal, fullKey, issues);
    } else if (typeof sVal !== typeof tVal) {
      issues.push(fullKey);
    }
  }
  return issues;
}

(async () => {
  const args = parseCommonArgs(process.argv.slice(2));
  if (args.help) {
    displayHelp('i18ntk-doctor');
    process.exit(0);
  }
  const config = await getUnifiedConfig('doctor', args);
  const dirs = {
    projectRoot: config.projectRoot,
    sourceDir: config.sourceDir,
    i18nDir: config.i18nDir,
    outputDir: config.outputDir,
  };
  
  let exitCode = ExitCodes.SUCCESS;
  const issues = [];

  console.log('i18ntk doctor');
  for (const [name, dir] of Object.entries(dirs)) {
    const rel = path.relative(config.projectRoot, dir);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      issues.push(`path traversal detected: ${dir}`);
      exitCode = Math.max(exitCode, ExitCodes.SECURITY_VIOLATION);
      continue;
    }
    const exists = fs.existsSync(dir);
    console.log(`${name}: ${dir} ${exists ? '✅' : '❌'}`);
    if (!exists) {
      if (name !== 'outputDir') {
        issues.push(`Missing directory: ${dir}`);
        exitCode = Math.max(exitCode, ExitCodes.CONFIG_ERROR);
      }
      continue;
    }
    try {
      fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
    } catch (e) {
      issues.push(`Permission issue: ${dir}`);
      exitCode = Math.max(exitCode, ExitCodes.CONFIG_ERROR);
    }
  }

  const pkgVersion = require('../package.json').version;
  if (config.version && config.version !== pkgVersion) {
    issues.push(`Config version mismatch: ${config.version} != ${pkgVersion}`);
    exitCode = Math.max(exitCode, ExitCodes.CONFIG_ERROR);
  }

  const sourceLang = config.sourceLanguage || 'en';
  const languages = config.defaultLanguages || [];
  const srcDir = path.join(config.i18nDir, sourceLang);
  const srcFiles = fs.existsSync(srcDir) ? fs.readdirSync(srcDir).filter(f => f.endsWith('.json')) : [];

  for (const lang of languages) {
    const langDir = path.join(config.i18nDir, lang);
    if (!fs.existsSync(langDir)) {
      issues.push(`Missing locale directory: ${lang}`);
      exitCode = Math.max(exitCode, ExitCodes.CONFIG_ERROR);
      continue;
    }
    const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      if (!srcFiles.includes(file)) {
        issues.push(`Dangling namespace file: ${lang}/${file}`);
        exitCode = Math.max(exitCode, ExitCodes.CONFIG_ERROR);
      }
      const srcPath = path.join(srcDir, file);
      const tgtPath = path.join(langDir, file);
      if (!fs.existsSync(srcPath) || !fs.existsSync(tgtPath)) continue;
      const srcContent = fs.readFileSync(srcPath, 'utf8');
      const tgtContent = fs.readFileSync(tgtPath, 'utf8');
      if (hasBOM(srcContent) || hasBOM(tgtContent)) {
        issues.push(`BOM detected in ${lang}/${file}`);
        exitCode = Math.max(exitCode, ExitCodes.CONFIG_ERROR);
      }
      let srcJson, tgtJson;
      try {
        srcJson = JSON.parse(srcContent.replace(/^\uFEFF/, ''));
      } catch (e) {
        issues.push(`Invalid JSON in source ${file}: ${e.message}`);
        exitCode = Math.max(exitCode, ExitCodes.CONFIG_ERROR);
        continue;
      }
      try {
        tgtJson = JSON.parse(tgtContent.replace(/^\uFEFF/, ''));
      } catch (e) {
        issues.push(`Invalid JSON in ${lang}/${file}: ${e.message}`);
        exitCode = Math.max(exitCode, ExitCodes.CONFIG_ERROR);
        continue;
      }
      const srcPlurals = collectPluralKeys(srcJson);
      const tgtPlurals = collectPluralKeys(tgtJson);
      for (const key of srcPlurals) {
        if (!tgtPlurals.has(key)) {
          issues.push(`Inconsistent plural forms in ${lang}/${file}: missing ${key}`);
          exitCode = Math.max(exitCode, ExitCodes.CONFIG_ERROR);
        }
      }
      const typeMismatches = compareTypes(srcJson, tgtJson);
      typeMismatches.forEach(k => {
        issues.push(`Type mismatch for key ${k} in ${lang}/${file}`);
        exitCode = Math.max(exitCode, ExitCodes.CONFIG_ERROR);
      });
    }
  }

  if (issues.length > 0) {
    console.log('\nIssues found:');
    issues.forEach(i => console.log(` - ${i}`));
  }
  process.exit(exitCode);
})();