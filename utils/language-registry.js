'use strict';

// The single source of truth for every user-interface locale. Keep consumers
// data-driven: schemas, menus and validators should derive from this registry.
const LANGUAGES = Object.freeze([
  ['en', 'English', 'English', 'ltr'], ['de', 'Deutsch', 'German', 'ltr'],
  ['es', 'Español', 'Spanish', 'ltr'], ['fr', 'Français', 'French', 'ltr'],
  ['it', 'Italiano', 'Italian', 'ltr'], ['pt', 'Português', 'Portuguese', 'ltr'],
  ['nl', 'Nederlands', 'Dutch', 'ltr'], ['pl', 'Polski', 'Polish', 'ltr'],
  ['sv', 'Svenska', 'Swedish', 'ltr'], ['uk', 'Українська', 'Ukrainian', 'ltr'],
  ['cs', 'Čeština', 'Czech', 'ltr'], ['tr', 'Türkçe', 'Turkish', 'ltr'],
  ['ru', 'Русский', 'Russian', 'ltr'], ['ja', '日本語', 'Japanese', 'ltr'],
  ['ko', '한국어', 'Korean', 'ltr'], ['zh', '中文', 'Chinese', 'ltr'],
  ['ar', 'العربية', 'Arabic', 'rtl'], ['hi', 'हिन्दी', 'Hindi', 'ltr'],
  ['th', 'ไทย', 'Thai', 'ltr'], ['vi', 'Tiếng Việt', 'Vietnamese', 'ltr'],
  ['he', 'עברית', 'Hebrew', 'rtl'], ['el', 'Ελληνικά', 'Greek', 'ltr'],
  ['hu', 'Magyar', 'Hungarian', 'ltr']
].map(([code, nativeName, englishName, direction]) => Object.freeze({
  code, name: nativeName, nativeName, englishName, direction,
  aliases: Object.freeze([code])
})));

const BY_CODE = new Map(LANGUAGES.map(language => [language.code, language]));
const LEGACY_CODES = Object.freeze({ iw: 'he', in: 'id', ji: 'yi' });

function getLanguages() { return LANGUAGES.map(language => ({ ...language, aliases: [...language.aliases] })); }
function normalizeLanguageCode(code) {
  const normalized = String(code || '').trim().replace(/_/g, '-').toLowerCase();
  if (!normalized) return '';
  const base = normalized.split('-')[0];
  return LEGACY_CODES[base] || base;
}
function getLanguage(code) { return BY_CODE.get(normalizeLanguageCode(code)) || null; }
function getLanguageCodes() { return LANGUAGES.map(language => language.code); }
function isRtlLanguage(code) { return getLanguage(code)?.direction === 'rtl'; }
function getLanguageDirection(code) { return getLanguage(code)?.direction || 'ltr'; }

module.exports = { LANGUAGES, getLanguages, getLanguage, getLanguageCodes, normalizeLanguageCode,
  isRtlLanguage, getLanguageDirection };
