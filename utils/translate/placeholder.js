const DEFAULT_PLACEHOLDER_PATTERNS = [
  /\{\{[^}]+\}\}/g,         // {{variable}} - double curly (Handlebars, Mustache)
  /\{[a-zA-Z_]\w*\}/g,       // {name} - single curly (i18next, Python format named)
  /\{\d+\}/g,                // {0} - indexed curly
  /%\d?\$?[sd]/g,            // %d, %s, %1$s, %2$d (printf-style)
  /:[a-zA-Z_]\w*/g,          // :param - colon-style (Rails, Swift)
  /%\{[a-zA-Z_]\w*\}/g,      // %{name} - Ruby/Perl named
  /%\([a-zA-Z_]\w*\)[sd]/g,  // %(name)s - Python named format (with type)
  /\$\{[a-zA-Z_]\w*\}/g,     // ${variable} - JS template literal style
  /<[a-zA-Z_]\w*>/g,         // <name> - XML/HTML-style
  /@[a-zA-Z_]\w*/g,          // @param - Java/Spring-style
  /&[a-zA-Z_]\w*;?/g,        // &amp; HTML entity style (careful, broad match)
];

function compilePatterns(customPatterns) {
  const patterns = [...DEFAULT_PLACEHOLDER_PATTERNS];
  if (customPatterns) {
    const customs = Array.isArray(customPatterns) ? customPatterns : [customPatterns];
    for (const pat of customs) {
      if (typeof pat === 'string') {
        try {
          patterns.push(new RegExp(pat, 'g'));
        } catch (e) {
          console.warn('Invalid custom regex pattern ignored:', pat, e.message);
        }
      } else if (pat instanceof RegExp) {
        if (!pat.global) {
          patterns.push(new RegExp(pat.source, 'g'));
        } else {
          patterns.push(pat);
        }
      }
    }
  }
  return patterns;
}

function detectPlaceholders(value, customPatterns) {
  if (!value || typeof value !== 'string') return [];
  const patterns = compilePatterns(customPatterns);
  const found = new Set();
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    const matches = value.match(pattern);
    if (matches) {
      for (const m of matches) found.add(m);
    }
  }
  return Array.from(found);
}

function hasPlaceholders(value, customPatterns) {
  if (!value || typeof value !== 'string') return false;
  const patterns = compilePatterns(customPatterns);
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    if (pattern.test(value)) return true;
  }
  return false;
}

function splitByPlaceholders(value, customPatterns) {
  if (!value || typeof value !== 'string') {
    return [{ type: 'text', value: value || '' }];
  }

  const patterns = compilePatterns(customPatterns);
  const matches = [];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(value)) !== null) {
      if (!match[0]) {
        pattern.lastIndex++;
        continue;
      }
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        value: match[0],
      });
    }
  }

  if (matches.length === 0) {
    return [{ type: 'text', value }];
  }

  matches.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return (b.end - b.start) - (a.end - a.start);
  });

  const accepted = [];
  for (const match of matches) {
    const overlaps = accepted.some((item) => match.start < item.end && match.end > item.start);
    if (!overlaps) accepted.push(match);
  }
  accepted.sort((a, b) => a.start - b.start);

  const segments = [];
  let cursor = 0;
  for (const match of accepted) {
    if (match.start > cursor) {
      segments.push({ type: 'text', value: value.slice(cursor, match.start) });
    }
    segments.push({ type: 'placeholder', value: match.value });
    cursor = match.end;
  }
  if (cursor < value.length) {
    segments.push({ type: 'text', value: value.slice(cursor) });
  }

  return segments;
}

function maskPlaceholders(value, customPatterns) {
  if (!value || typeof value !== 'string') return { masked: value, map: new Map() };
  const patterns = compilePatterns(customPatterns);
  const map = new Map();
  let idx = 0;
  let masked = value;
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    masked = masked.replace(pattern, (match) => {
      const ph = `\uE000${idx}\uE001`;
      map.set(ph, match);
      idx++;
      return ph;
    });
  }
  return { masked, map };
}

function unmaskPlaceholders(value, map) {
  if (!map || map.size === 0) return value;
  let result = value;
  map.forEach((original, placeholder) => {
    result = result.split(placeholder).join(original);
  });
  return result;
}

module.exports = {
  DEFAULT_PLACEHOLDER_PATTERNS,
  compilePatterns,
  detectPlaceholders,
  hasPlaceholders,
  splitByPlaceholders,
  maskPlaceholders,
  unmaskPlaceholders,
};
