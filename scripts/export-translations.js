#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { loadTranslations, t } = require('../utils/i18n-helper');

// Load translations
loadTranslations('en');

// Configuration
const SOURCE_DIR = path.join(__dirname, '..', 'resources', 'i18n', 'ui-locales');
const TARGET_LANGUAGES = ['de', 'fr', 'es', 'ru', 'ja', 'zh'];

function createLanguageTemplate(lang) {
  const langDir = path.join(SOURCE_DIR, lang);
  
  if (!SecurityUtils.safeExistsSync(langDir)) {
    fs.mkdirSync(langDir, { recursive: true });
    console.log(t('exportTranslations.createdDirectory', { dir: langDir }));
  }
  
  const enDir = path.join(SOURCE_DIR, 'en');
  const enFiles = fs.readdirSync(enDir).filter(file => file.endsWith('.json'));
  
  console.log(t('exportTranslations.foundFiles', { count: enFiles.length }));
  enFiles.forEach(file => {
    console.log(`  - ${file}`);
  });
  
  enFiles.forEach(file => {
    const sourceFile = path.join(enDir, file);
    const targetFile = path.join(langDir, file);
    
    if (!SecurityUtils.safeExistsSync(targetFile)) {
      const sourceContent = JSON.parse(SecurityUtils.safeReadFileSync(sourceFile, path.dirname(sourceFile), 'utf8'));
      const templateContent = createTemplateFromEnglish(sourceContent);
      SecurityUtils.safeWriteFileSync(targetFile, JSON.stringify(templateContent, null, 2));
      console.log(t('exportTranslations.createdTemplate', { lang, file }));
    } else {
      console.log(t('exportTranslations.skippedExisting', { lang, file }));
    }
  });
}

function createTemplateFromEnglish(obj) {
  if (typeof obj === 'string') {
    return '⚠️ TRANSLATION NEEDED ⚠️';
  } else if (typeof obj === 'object' && obj !== null) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = createTemplateFromEnglish(value);
    }
    return result;
  }
  return obj;
}

function main() {
  console.log(`\n${t('exportTranslations.title')}\n`);
  console.log(t('exportTranslations.creatingTemplates', { count: TARGET_LANGUAGES.length }));
  console.log();
  
  TARGET_LANGUAGES.forEach(lang => {
    createLanguageTemplate(lang);
  });
  
  const enFiles = fs.readdirSync(path.join(SOURCE_DIR, 'en')).filter(file => file.endsWith('.json'));
  
  console.log(`\n${t('exportTranslations.summary')}`);
  console.log(t('exportTranslations.summaryLanguages', { count: TARGET_LANGUAGES.length }));
  console.log(t('exportTranslations.summaryFilesPerLanguage', { count: enFiles.length }));
  console.log(t('exportTranslations.summaryTotalFiles', { count: TARGET_LANGUAGES.length * enFiles.length }));
  
  console.log(`\n${t('exportTranslations.success')}`);
  console.log(t('exportTranslations.location', { dir: SOURCE_DIR }));
  console.log(t('exportTranslations.nextSteps'));
  console.log();
}

if (require.main === module) {
  main();
}

module.exports = { createLanguageTemplate };