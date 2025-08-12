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
        if (match[1]) keys.add(match[1]);
        if (regex.lastIndex === 0) break;
      }
    } catch (e) {
      // skip invalid patterns
    }
  }
  return Array.from(keys);
}

module.exports = { extract };