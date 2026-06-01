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

function leadingIdentifierFromPattern(pattern) {
  const source = pattern instanceof RegExp ? pattern.source : String(pattern || '');
  const match = /^([A-Za-z_$][A-Za-z0-9_$]*)\\(?:\(|s|b|.)?/.exec(source);
  return match ? match[1] : null;
}

function hasIdentifierCallBoundary(content, index) {
  if (index <= 0) return true;
  return !/[A-Za-z0-9_$.]/.test(content[index - 1]);
}

function extract(content, patterns = []) {
  const keys = new Set();
  if (!Array.isArray(patterns)) return [];
  if (content === null || content === undefined) return [];
  const contentStr = String(content);
  for (const pattern of patterns) {
    try {
      let regex = pattern instanceof RegExp ? new RegExp(pattern.source, 'g') : new RegExp(pattern, 'g');
      const leadingIdentifier = leadingIdentifierFromPattern(pattern);
      let match;
      while ((match = regex.exec(contentStr)) !== null) {
        if (leadingIdentifier && match[0].startsWith(leadingIdentifier) && !hasIdentifierCallBoundary(contentStr, match.index)) {
          if (regex.lastIndex === 0) break;
          continue;
        }
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
