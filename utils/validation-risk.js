const DEFAULT_ENGLISH_THRESHOLD_PERCENT = 10;

const URL_PATTERN = /https?:\/\/[^\s"'<>]+/i;
const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PRIVATE_KEY_PATTERN = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const BEARER_TOKEN_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/i;
const CREDENTIAL_ASSIGNMENT_PATTERN = /\b(api[_-]?key|access[_-]?token|auth[_-]?token|refresh[_-]?token|secret|password|private[_-]?key|client[_-]?secret)\b\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{16,}/i;
const CREDENTIAL_KEY_PATTERN = /\b(api[_-]?key|access[_-]?token|auth[_-]?token|refresh[_-]?token|secret|password|private[_-]?key|client[_-]?secret)\b/i;
const OPAQUE_SECRET_PATTERN = /\b(AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|sk_live_[0-9A-Za-z]{16,}|xox[baprs]-[0-9A-Za-z-]{16,}|gh[pousr]_[0-9A-Za-z_]{20,}|[A-Za-z0-9._~+/=-]{32,})\b/;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/;

const ENGLISH_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'all', 'also', 'an', 'and', 'any', 'are', 'as', 'at', 'available',
  'back', 'based', 'be', 'because', 'before', 'below', 'best', 'book', 'build', 'by',
  'can', 'cash', 'challenge', 'change', 'check', 'choose', 'click', 'close', 'coming', 'complete', 'confirm',
  'continue', 'copy', 'create', 'current',
  'data', 'delete', 'depth', 'details', 'done', 'down',
  'earn', 'edit', 'email', 'empty', 'enter', 'error', 'exchange',
  'failed', 'file', 'filter', 'for', 'from',
  'governance',
  'has', 'have', 'help', 'hide', 'history', 'home',
  'if', 'in', 'into', 'is', 'it', 'its',
  'key', 'keys',
  'language', 'last', 'latest', 'learn', 'live', 'loading', 'log', 'login', 'logout',
  'market', 'markets', 'message', 'missing', 'more',
  'new', 'next', 'no', 'not',
  'of', 'off', 'on', 'open', 'or', 'order', 'other', 'out', 'over', 'overview',
  'page', 'participate', 'players', 'please', 'platform', 'predict', 'prediction', 'previous', 'public',
  'real', 'record', 'remove', 'required', 'reset', 'result', 'results', 'rewards',
  'save', 'search', 'select', 'settings', 'show', 'soon', 'start', 'status', 'structured', 'submit', 'success',
  'the', 'their', 'this', 'through', 'to', 'track', 'try',
  'up', 'update', 'use', 'used', 'using',
  'value', 'view',
  'warning', 'when', 'with', 'without'
]);

const DEFAULT_ALLOWED_ENGLISH_TERMS = new Set([
  'api',
]);

function normalizeLanguage(language) {
  return String(language || '').toLowerCase().split(/[-_]/)[0];
}

function toAllowedTermSet(terms) {
  const allowed = new Set(DEFAULT_ALLOWED_ENGLISH_TERMS);
  if (Array.isArray(terms)) {
    terms.forEach(term => {
      if (typeof term === 'string' && term.trim()) {
        allowed.add(term.trim().toLowerCase());
      }
    });
  }
  return allowed;
}

function stripNonLanguageTokens(value) {
  return String(value || '')
    .replace(URL_PATTERN, ' ')
    .replace(EMAIL_PATTERN, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\{\{[^}]+\}\}|\{[^}]+\}|%[sdifjoO]/g, ' ');
}

function isIgnoredEnglishToken(word, allowedTerms) {
  const normalized = word.toLowerCase().replace(/^['-]+|['-]+$/g, '');
  if (!normalized || normalized.length <= 2) return true;
  if (allowedTerms.has(normalized)) return true;
  if (/^[A-Z0-9_-]{2,}$/.test(word)) return true;
  if (/\d/.test(word)) return true;
  return false;
}

function analyzeEnglishContent(value, options = {}) {
  const allowedTerms = toAllowedTermSet(options.allowedEnglishTerms);
  const words = stripNonLanguageTokens(value).match(/[A-Za-z][A-Za-z'-]*/g) || [];
  const countedWords = [];
  const englishWords = [];

  words.forEach(word => {
    if (isIgnoredEnglishToken(word, allowedTerms)) return;

    const normalized = word.toLowerCase().replace(/^['-]+|['-]+$/g, '');
    countedWords.push(normalized);
    if (ENGLISH_WORDS.has(normalized)) {
      englishWords.push(normalized);
    }
  });

  const totalWordCount = countedWords.length;
  const englishWordCount = englishWords.length;
  const englishPercentage = totalWordCount === 0
    ? 0
    : Number(((englishWordCount / totalWordCount) * 100).toFixed(2));

  return {
    englishPercentage,
    englishWordCount,
    totalWordCount,
    englishWords: [...new Set(englishWords)].slice(0, 8)
  };
}

function hasSecretLikeValue(value, keyPath = '') {
  const valueStr = String(value || '');
  if (
    PRIVATE_KEY_PATTERN.test(valueStr) ||
    BEARER_TOKEN_PATTERN.test(valueStr) ||
    CREDENTIAL_ASSIGNMENT_PATTERN.test(valueStr) ||
    JWT_PATTERN.test(valueStr)
  ) {
    return true;
  }

  return CREDENTIAL_KEY_PATTERN.test(keyPath) && OPAQUE_SECRET_PATTERN.test(valueStr);
}

function detectTranslationContentRisks(value, options = {}) {
  const valueStr = String(value || '');
  const issues = [];

  if (URL_PATTERN.test(valueStr)) {
    issues.push({
      type: 'url',
      reason: 'Contains a URL; verify it is intentional and localized where needed.'
    });
  }

  if (EMAIL_PATTERN.test(valueStr)) {
    issues.push({
      type: 'email',
      reason: 'Contains an email address; verify it is intentional public contact content.'
    });
  }

  if (hasSecretLikeValue(valueStr, options.keyPath)) {
    issues.push({
      type: 'secret',
      reason: 'Looks like a credential or secret value, not ordinary translated content.'
    });
  }

  const sourceLanguage = normalizeLanguage(options.sourceLanguage || 'en');
  const targetLanguage = normalizeLanguage(options.targetLanguage);
  if (targetLanguage && targetLanguage !== sourceLanguage) {
    const threshold = Number.isFinite(Number(options.englishThresholdPercent))
      ? Number(options.englishThresholdPercent)
      : DEFAULT_ENGLISH_THRESHOLD_PERCENT;
    const english = analyzeEnglishContent(valueStr, options);

    if (
      english.englishPercentage > threshold &&
      english.englishWordCount >= 3
    ) {
      issues.push({
        type: 'english_content',
        reason: `Possible untranslated English content (${english.englishPercentage}% English words, threshold ${threshold}%).`,
        englishPercentage: english.englishPercentage,
        englishThresholdPercent: threshold,
        englishWordCount: english.englishWordCount,
        totalWordCount: english.totalWordCount,
        englishWords: english.englishWords
      });
    }
  }

  return issues;
}

module.exports = {
  DEFAULT_ENGLISH_THRESHOLD_PERCENT,
  analyzeEnglishContent,
  detectTranslationContentRisks,
  hasSecretLikeValue
};
