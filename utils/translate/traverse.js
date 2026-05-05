function deepTraverse(obj, visitor, keyPath = '') {
  if (obj === null || obj === undefined) {
    visitor({ type: 'null', keyPath, value: null });
    return;
  }
  if (typeof obj === 'string') {
    visitor({ type: 'string', keyPath, value: obj });
    return;
  }
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    visitor({ type: 'leaf', keyPath, value: obj });
    return;
  }
  if (Array.isArray(obj)) {
    visitor({ type: 'array-start', keyPath, value: obj });
    for (let i = 0; i < obj.length; i++) {
      const childPath = keyPath ? `${keyPath}[${i}]` : `[${i}]`;
      deepTraverse(obj[i], visitor, childPath);
    }
    visitor({ type: 'array-end', keyPath, value: obj });
    return;
  }
  if (typeof obj === 'object') {
    visitor({ type: 'object-start', keyPath, value: obj });
    for (const key of Object.keys(obj)) {
      const childPath = keyPath ? `${keyPath}.${key}` : key;
      deepTraverse(obj[key], visitor, childPath);
    }
    visitor({ type: 'object-end', keyPath, value: obj });
    return;
  }
  visitor({ type: 'unknown', keyPath, value: String(obj) });
}

function collectLeaves(obj, prefix = '') {
  const entries = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      entries.push({ keyPath: fullKey, value });
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const itemPath = `${fullKey}[${i}]`;
        if (typeof value[i] === 'string') {
          entries.push({ keyPath: itemPath, value: value[i] });
        } else if (typeof value[i] === 'object' && value[i] !== null && !Array.isArray(value[i])) {
          entries.push(...collectLeaves(value[i], itemPath));
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      entries.push(...collectLeaves(value, fullKey));
    }
  }
  return entries;
}

function setLeaf(obj, keyPath, value) {
  const parts = [];
  let current = '';
  for (let i = 0; i < keyPath.length; i++) {
    const ch = keyPath[i];
    if (ch === '.' && keyPath[i - 1] !== '\\') {
      if (current) parts.push(current);
      current = '';
    } else if (ch === '[') {
      if (current) parts.push(current);
      current = '';
      i++;
      while (i < keyPath.length && keyPath[i] !== ']') {
        current += keyPath[i];
        i++;
      }
      parts.push(`[${current}]`);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);

  let target = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (part.startsWith('[') && part.endsWith(']')) {
      const idx = parseInt(part.slice(1, -1), 10);
      if (!(idx in target)) target[idx] = {};
      target = target[idx];
    } else {
      if (!(part in target)) target[part] = {};
      target = target[part];
    }
  }

  const last = parts[parts.length - 1];
  if (last.startsWith('[') && last.endsWith(']')) {
    target[parseInt(last.slice(1, -1), 10)] = value;
  } else {
    target[last] = value;
  }
}

function getLeaf(obj, keyPath) {
  const parts = [];
  let current = '';
  for (let i = 0; i < keyPath.length; i++) {
    const ch = keyPath[i];
    if (ch === '.' && keyPath[i - 1] !== '\\') {
      if (current) parts.push(current);
      current = '';
    } else if (ch === '[') {
      if (current) parts.push(current);
      current = '';
      i++;
      while (i < keyPath.length && keyPath[i] !== ']') {
        current += keyPath[i];
        i++;
      }
      parts.push(`[${current}]`);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);

  let target = obj;
  for (const part of parts) {
    if (target === null || target === undefined) return undefined;
    if (part.startsWith('[') && part.endsWith(']')) {
      target = target[parseInt(part.slice(1, -1), 10)];
    } else {
      target = target[part];
    }
  }
  return target;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

module.exports = {
  deepTraverse,
  collectLeaves,
  setLeaf,
  getLeaf,
  deepClone,
};
