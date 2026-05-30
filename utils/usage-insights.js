const path = require('path');

const KEY_BOUNDARY = /[A-Za-z0-9_.:*-]/;
const HUMAN_TEXT_MIN = 3;
const HUMAN_TEXT_MAX = 120;
const MAX_DYNAMIC_EXPANSIONS = 25;

function stripComments(content) {
  return String(content || '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function findLineColumn(content, index) {
  const before = content.slice(0, Math.max(0, index));
  const lines = before.split(/\r?\n/);
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

function isBoundaryAt(content, index) {
  if (index < 0 || index >= content.length) return true;
  return !KEY_BOUNDARY.test(content[index]);
}

function findLiteralKeyReferences(content, availableKeys) {
  const source = stripComments(content);
  const references = [];

  for (const key of Array.from(availableKeys || []).sort((a, b) => b.length - a.length)) {
    if (!key || typeof key !== 'string') continue;
    let fromIndex = 0;

    while (fromIndex < source.length) {
      const index = source.indexOf(key, fromIndex);
      if (index === -1) break;

      const beforeOk = isBoundaryAt(source, index - 1);
      const afterOk = isBoundaryAt(source, index + key.length);
      const lineStart = source.lastIndexOf('\n', index) + 1;
      const beforeOnLine = source.slice(lineStart, index);
      const looksLikeObjectValue = /:\s*['"`]?$/.test(beforeOnLine);
      if (beforeOk && afterOk && !looksLikeObjectValue) {
        references.push({
          key,
          matchType: 'literal',
          ...findLineColumn(source, index),
        });
        break;
      }

      fromIndex = index + key.length;
    }
  }

  return references;
}

function parseStringList(raw) {
  const values = [];
  const source = String(raw || '');
  const stringPattern = /['"`]([^'"`\r\n$]+)['"`]/g;
  let match;

  while ((match = stringPattern.exec(source)) !== null) {
    const value = String(match[1] || '').trim();
    if (/^[A-Za-z0-9_.:-]+$/.test(value)) values.push(value);
  }

  return values;
}

function parseObjectKeyValues(raw) {
  const entries = [];
  const source = String(raw || '');
  const propertyPattern = /(?:^|[,{])\s*['"]?([A-Za-z_$][\w$-]*)['"]?\s*:\s*['"`]([^'"`\r\n$]+)['"`]/g;
  let match;

  while ((match = propertyPattern.exec(source)) !== null) {
    const value = String(match[2] || '').trim();
    if (/^[A-Za-z0-9_.:-]+$/.test(value)) {
      entries.push([match[1], value]);
    }
  }

  return entries;
}

function collectSimpleBindings(content) {
  const source = stripComments(content);
  const bindings = new Map();
  const declarationPattern = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([^;\n]+)/g;
  let match;

  while ((match = declarationPattern.exec(source)) !== null) {
    const name = match[1];
    const rawValue = String(match[2] || '').trim();

    if (rawValue.startsWith('[') || rawValue.startsWith('{')) {
      const values = parseStringList(rawValue);
      if (values.length > 0 && values.length <= MAX_DYNAMIC_EXPANSIONS) {
        bindings.set(name, values);
      }
      if (rawValue.startsWith('{')) {
        for (const [property, value] of parseObjectKeyValues(rawValue)) {
          bindings.set(`${name}.${property}`, [value]);
        }
      }
      continue;
    }

    const values = parseStringList(rawValue);
    if (values.length === 1 && /^['"`]/.test(rawValue)) {
      bindings.set(name, values);
    }
  }

  const iteratorPattern = /\b([A-Za-z_$][\w$]*)\s*\.\s*(?:map|forEach|filter|some|every)\s*\(\s*([A-Za-z_$][\w$]*)\s*=>/g;
  while ((match = iteratorPattern.exec(source)) !== null) {
    const sourceValues = bindings.get(match[1]);
    if (sourceValues && sourceValues.length <= MAX_DYNAMIC_EXPANSIONS) {
      bindings.set(match[2], sourceValues);
    }
  }

  return bindings;
}

function expandTemplateLiteral(template, bindings) {
  const parts = [];
  let index = 0;
  const expressionPattern = /\$\{\s*([A-Za-z_$][\w$]*)\s*\}/g;
  let match;

  while ((match = expressionPattern.exec(template)) !== null) {
    parts.push([template.slice(index, match.index)]);
    const values = bindings.get(match[1]);
    if (!values || values.length === 0) return [];
    parts.push(values);
    index = match.index + match[0].length;
  }

  parts.push([template.slice(index)]);

  let expanded = [''];
  for (const values of parts) {
    const next = [];
    for (const prefix of expanded) {
      for (const value of values) {
        next.push(prefix + value);
        if (next.length > MAX_DYNAMIC_EXPANSIONS) return [];
      }
    }
    expanded = next;
  }

  return expanded.filter(key => /^[A-Za-z0-9_.:*-]+$/.test(key));
}

function expressionToAvailableKeys(expression, bindings, availableKeys) {
  const available = availableKeys || new Set();
  const source = String(expression || '').trim();
  const results = [];

  const literal = source.match(/^['"`]([^'"`\r\n$]+)['"`]$/);
  if (literal && available.has(literal[1])) return [literal[1]];

  const identifier = source.match(/^([A-Za-z_$][\w$]*)$/);
  if (identifier) {
    const values = bindings.get(identifier[1]) || [];
    return values.filter(value => available.has(value));
  }

  const memberLookup = source.match(/^([A-Za-z_$][\w$]*)\s*\[[^\]]+\]$/);
  if (memberLookup) {
    const values = bindings.get(memberLookup[1]) || [];
    return values.filter(value => available.has(value));
  }

  const propertyLookup = source.match(/^([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$-]*)$/);
  if (propertyLookup) {
    const values = bindings.get(`${propertyLookup[1]}.${propertyLookup[2]}`) || [];
    return values.filter(value => available.has(value));
  }

  const ternary = source.match(/^[^?]+?\?\s*([^:]+)\s*:\s*(.+)$/);
  if (ternary) {
    return [
      ...expressionToAvailableKeys(ternary[1], bindings, available),
      ...expressionToAvailableKeys(ternary[2], bindings, available),
    ].filter((key, index, keys) => keys.indexOf(key) === index);
  }

  const template = source.match(/^`([^`]*)`$/);
  if (template) {
    return expandTemplateLiteral(template[1], bindings).filter(key => available.has(key));
  }

  return results;
}

function inferDynamicKeyReferences(content, availableKeys) {
  const source = stripComments(content);
  const bindings = collectSimpleBindings(source);
  const references = [];
  const seen = new Set();
  const callPattern = /(?:\bt|\bi18n\.t|\$t|\btranslate)\s*\(\s*(`[^`]*`|['"][^'"\r\n]+['"]|[^,\)\r\n]+)/g;
  let match;

  while ((match = callPattern.exec(source)) !== null) {
    const keys = expressionToAvailableKeys(match[1], bindings, availableKeys);
    if (keys.length === 0) continue;

    const location = findLineColumn(source, match.index);
    for (const key of keys) {
      if (seen.has(key)) continue;
      seen.add(key);
      references.push({
        key,
        matchType: match[1].startsWith('`') ? 'dynamic-template' : 'dynamic-variable',
        ...location,
      });
    }
  }

  return references;
}

function inferDynamicPrefix(expression) {
  const source = String(expression || '').trim();
  const template = source.match(/^`([^`]*)\$\{[^}]+\}/);
  if (template && /^[A-Za-z0-9_.:-]+$/.test(template[1])) return template[1];

  const concat = source.match(/^['"]([A-Za-z0-9_.:-]+)['"]\s*\+/);
  if (concat) return concat[1];

  return null;
}

function findUnresolvedDynamicReferences(content, availableKeys) {
  const source = stripComments(content);
  const bindings = collectSimpleBindings(source);
  const unresolved = [];
  const seen = new Set();
  const callPattern = /(?:\bt|\bi18n\.t|\$t|\btranslate)\s*\(\s*(`[^`]*`|['"][^'"\r\n]+['"]|[^,\)\r\n]+)/g;
  let match;

  while ((match = callPattern.exec(source)) !== null) {
    const expression = String(match[1] || '').trim();
    if (!expression || expressionToAvailableKeys(expression, bindings, availableKeys).length > 0) continue;
    if (!/[`+$[\]?]/.test(expression) && !/^[A-Za-z_$][\w$]*$/.test(expression)) continue;

    const location = findLineColumn(source, match.index);
    const key = `${expression}\0${location.line}\0${location.column}`;
    if (seen.has(key)) continue;
    seen.add(key);

    unresolved.push({
      expression,
      prefix: inferDynamicPrefix(expression),
      reason: 'Could not resolve expression to literal translation keys without executing code.',
      line: location.line,
      column: location.column,
    });
  }

  return unresolved;
}

function normalizeSegment(segment) {
  return String(segment || '')
    .replace(/\.(jsx?|tsx?|vue|svelte|html|py)$/i, '')
    .replace(/^\[+|\]+$/g, '')
    .replace(/^\(+|\)+$/g, '')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .toLowerCase();
}

function deriveNamespaceCandidates(relativePath) {
  const rawParts = String(relativePath || '').split(/[\\/]+/).map(normalizeSegment).filter(Boolean);
  const ignored = new Set([
    'src', 'app', 'pages', 'page', 'route', 'routes', 'index', 'layout',
    'components', 'component', 'ui', 'lib', 'utils', 'hooks', 'shared',
  ]);
  const candidates = [];

  for (const part of rawParts) {
    if (ignored.has(part)) continue;
    if (/^\d+$/.test(part)) continue;
    if (!candidates.includes(part)) candidates.push(part);
  }

  return candidates.slice(0, 3);
}

function createTextKey(text, namespace = 'ui') {
  const slug = String(text || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);

  return `${namespace || 'ui'}.${slug || 'text'}`;
}

function looksLikeHumanText(text) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (value.length < HUMAN_TEXT_MIN || value.length > HUMAN_TEXT_MAX) return false;
  if (!/[A-Za-z]/.test(value)) return false;
  if (/^[A-Z0-9_./:-]+$/.test(value)) return false;
  if (/^[a-z0-9_.:-]+$/.test(value) && value.includes('.')) return false;
  if (/^(true|false|null|undefined|className|href|src|type)$/i.test(value)) return false;
  return true;
}

function collectHardcodedText(content, relativePath, translationValueIndex) {
  const source = stripComments(content);
  const namespace = deriveNamespaceCandidates(relativePath)[0] || 'ui';
  const results = [];
  const seen = new Set();

  const patterns = [
    />\s*([^<>{}\n][^<>{}\n]*?[A-Za-z][^<>{}\n]*?)\s*</g,
    /\b(?:aria-label|title|alt|placeholder|label)=["']([^"']+)["']/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source)) !== null) {
      const text = String(match[1] || '').replace(/\s+/g, ' ').trim();
      if (!looksLikeHumanText(text)) continue;

      const location = findLineColumn(source, match.index);
      const key = `${text}\0${location.line}`;
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        text,
        suggestedKey: createTextKey(text, namespace),
        existingKey: translationValueIndex && translationValueIndex.get(text),
        filePath: relativePath,
        line: location.line,
        column: location.column,
      });
    }
  }

  return results;
}

function buildNamespaceRecommendation(relativePath, keyReferences, availableKeys) {
  const namespace = deriveNamespaceCandidates(relativePath)[0];
  if (!namespace) return null;

  const keys = keyReferences.map(ref => ref.key).filter(Boolean);
  const namespacePrefix = `${namespace}.`;
  const hasNamespaceKey = keys.some(key => key.startsWith(namespacePrefix));
  const hasAvailableNamespace = Array.from(availableKeys || []).some(key => key.startsWith(namespacePrefix));

  if (hasNamespaceKey) return null;
  if (keys.length === 0 && !hasAvailableNamespace) return null;

  return {
    namespace,
    expectedFile: `${namespace}.json`,
    message: `Source path suggests namespace "${namespace}". Prefer ${namespace}.* keys and a ${namespace}.json locale file for this page/feature.`,
  };
}

function analyzeSourceForUsageInsights({
  content,
  relativePath,
  availableKeys,
  directKeys = [],
  translationValueIndex = new Map(),
}) {
  const references = [];
  const seen = new Set();
  const dynamicReferences = inferDynamicKeyReferences(content, availableKeys);
  const unresolvedDynamicReferences = findUnresolvedDynamicReferences(content, availableKeys);
  const literalReferences = findLiteralKeyReferences(content, availableKeys);
  const exactInferredKeys = new Set([
    ...dynamicReferences.map(ref => ref.key),
    ...literalReferences.map(ref => ref.key),
  ]);

  for (const key of directKeys || []) {
    if (!key || seen.has(key)) continue;
    if (key.endsWith('*')) {
      const prefix = key.slice(0, -1);
      if (Array.from(exactInferredKeys).some(inferredKey => inferredKey.startsWith(prefix))) {
        continue;
      }
      if (unresolvedDynamicReferences.some(ref => ref.prefix === prefix)) {
        continue;
      }
    }
    seen.add(key);
    references.push({ key, matchType: 'direct', line: null, column: null });
  }

  for (const ref of dynamicReferences) {
    if (seen.has(ref.key)) continue;
    seen.add(ref.key);
    references.push(ref);
  }

  for (const ref of literalReferences) {
    if (seen.has(ref.key)) continue;
    seen.add(ref.key);
    references.push(ref);
  }

  return {
    keyReferences: references,
    unresolvedDynamicReferences,
    hardcodedTexts: collectHardcodedText(content, relativePath, translationValueIndex),
    namespaceRecommendation: buildNamespaceRecommendation(relativePath, references, availableKeys),
  };
}

module.exports = {
  analyzeSourceForUsageInsights,
  createTextKey,
  deriveNamespaceCandidates,
  findLiteralKeyReferences,
  inferDynamicKeyReferences,
  findUnresolvedDynamicReferences,
  looksLikeHumanText,
};
