function normalizeKeyCandidate(rawKey) {
  if (rawKey === null || rawKey === undefined) return null;

  let key = String(rawKey).trim();
  if (!key) return null;

  // Normalize dynamic template segments to wildcard form.
  key = key.replace(/\$\{[^}]+\}/g, '*');

  // Reject multiline keys and obvious code fragments.
  if (/[\r\n\t]/.test(key)) return null;
  if (/\s/.test(key)) return null;
  if (/(=>|\|\||&&|function\b|return\b|includes\()/i.test(key)) return null;

  // Allow typical i18n key character sets only.
  if (!/^[A-Za-z0-9_.:*-]+$/.test(key)) return null;

  // Reject malformed key shapes.
  if (key.startsWith('.') || key.endsWith('.')) return null;
  if (key.includes('..')) return null;

  return key;
}

function extract(content, patterns = []) {
  const keys = new Set();
  if (!Array.isArray(patterns)) return [];
  if (content === null || content === undefined) return [];
  const contentStr = String(content);
  for (const pattern of patterns) {
    try {
      let regex = pattern instanceof RegExp ? new RegExp(pattern.source, 'g') : new RegExp(pattern, 'g');
      let match;
      while ((match = regex.exec(contentStr)) !== null) {
        if (match[1]) {
          const normalized = normalizeKeyCandidate(match[1]);
          if (normalized) keys.add(normalized);
        }
        if (regex.lastIndex === 0) break;
      }
    } catch (e) {
      // skip invalid patterns
    }
  }
  return Array.from(keys);
}

module.exports = { extract };
