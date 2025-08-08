/**
 * Non-changing unit tests for utils/i18n-helper.js
 * These tests validate default behaviour without mutating any package state.
 */

const { expect } = require('chai');
const path = require('path');

// Path to module under test
const i18nHelperPath = path.join(__dirname, '..', '..', 'utils', 'i18n-helper.js');
const i18nHelper = require(i18nHelperPath);

describe('i18n-helper Utility Tests', () => {
  before(() => {
    // Ensure English translations are loaded before assertions
    i18nHelper.loadTranslations('en');
  });

  it('should expose a default language of "en" after initialization', () => {
    const lang = i18nHelper.getCurrentLanguage();
    expect(lang).to.equal('en');
  });

  it('should return the key itself for missing translations', () => {
    const missingKey = 'this.key.does.not.exist';
    const result = i18nHelper.t(missingKey);
    expect(result).to.equal(missingKey);
  });

  it('should list available languages and include "en"', () => {
    const languages = i18nHelper.getAvailableLanguages();
    expect(languages).to.be.an('array').that.includes('en');
  });
});