'use strict';

const YES_TOKENS = {
  en: ['y', 'yes'],
  de: ['j', 'ja'],
  es: ['s', 'si', 's\u00ed'],
  fr: ['o', 'oui'],
  ru: ['\u0434', '\u0434\u0430'],
  ja: ['\u306f\u3044', '\u306f', 'y', 'yes'],
  zh: ['\u662f', '\u5bf9', '\u5c0d', '\u597d', 'y', 'yes'],
};

const NO_TOKENS = {
  en: ['n', 'no'],
  de: ['n', 'nein'],
  es: ['n', 'no'],
  fr: ['n', 'non'],
  ru: ['\u043d', '\u043d\u0435\u0442'],
  ja: ['\u3044\u3044\u3048', '\u3044\u3048', '\u3044\u3084', 'n', 'no'],
  zh: ['\u5426', '\u4e0d', '\u4e0d\u8981', 'n', 'no'],
};

function normalizeToken(value) {
  return String(value || '').trim().toLowerCase();
}

function getTokens(language, tokenMap) {
  const lang = normalizeToken(language || 'en');
  return new Set([...(tokenMap.en || []), ...(tokenMap[lang] || [])].map(normalizeToken));
}

function isAffirmative(value, language = 'en') {
  return getTokens(language, YES_TOKENS).has(normalizeToken(value));
}

function isNegative(value, language = 'en') {
  return getTokens(language, NO_TOKENS).has(normalizeToken(value));
}

function parseConfirmation(value, options = {}) {
  const { language = 'en', defaultValue = false } = options;
  const normalized = normalizeToken(value);
  if (!normalized) return Boolean(defaultValue);
  if (isAffirmative(normalized, language)) return true;
  if (isNegative(normalized, language)) return false;
  return Boolean(defaultValue);
}

module.exports = {
  YES_TOKENS,
  NO_TOKENS,
  isAffirmative,
  isNegative,
  parseConfirmation,
};
