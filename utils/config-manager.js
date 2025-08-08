const fs = require('fs');
const path = require('path');

// Determine configuration path
const projectRoot = process.cwd();
const rootCandidate = path.resolve(projectRoot, 'i18ntk-config.json');
const settingsCandidate = path.resolve(projectRoot, 'settings', 'i18ntk-config.json');
const CONFIG_PATH = fs.existsSync(rootCandidate) ? rootCandidate : settingsCandidate;

let currentConfig = null;

function loadConfig() {
  try {
    const data = fs.readFileSync(CONFIG_PATH, 'utf8');
    currentConfig = JSON.parse(data);
  } catch (err) {
    currentConfig = {};
  }
  return currentConfig;
}

function getConfig() {
  return loadConfig();
}

function findKey(obj, key) {
  const lower = key.toLowerCase();
  return Object.keys(obj).find(k => k.toLowerCase() === lower);
}

function resolvePath(obj, keyPath) {
  const parts = keyPath.split('.');
  const resolved = [];
  let current = obj;
  for (const part of parts) {
    const real = findKey(current, part);
    if (!real) return null;
    resolved.push(real);
    current = current[real];
  }
  return resolved;
}

function getValue(obj, parts) {
  return parts.reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

function setValue(obj, parts, value) {
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

function normalizePathValue(keyPath, value) {
  if (typeof value !== 'string') return value;
  const last = keyPath.split('.').pop();
  if (/dir|directory|root|path$/i.test(last)) {
    return path.resolve(projectRoot, value);
  }
  return value;
}

function saveConfig() {
  if (!currentConfig) return;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(currentConfig, null, 2), 'utf8');
}

function setConfig(keyPath, value) {
  const config = loadConfig();
  const parts = resolvePath(config, keyPath);
  if (!parts) throw new Error(`Invalid config path: ${keyPath}`);
  const existing = getValue(config, parts);
  if (existing !== undefined && existing !== null && typeof existing !== typeof value) {
    throw new Error(`Invalid type for ${keyPath}`);
  }
  const normalized = normalizePathValue(parts.join('.'), value);
  setValue(config, parts, normalized);
  saveConfig();
  return config;
}

function merge(target, updates, basePath = '') {
  for (const [key, val] of Object.entries(updates)) {
    const existingKey = findKey(target, key);
    if (!existingKey) throw new Error(`Invalid config path: ${basePath}${key}`);
    const fullPath = basePath ? `${basePath}${existingKey}` : existingKey;
    const current = target[existingKey];
    if (typeof current === 'object' && current !== null && !Array.isArray(current) &&
        typeof val === 'object' && val !== null && !Array.isArray(val)) {
      merge(current, val, `${fullPath}.`);
    } else if (typeof current === typeof val) {
      target[existingKey] = normalizePathValue(fullPath, val);
    } else {
      throw new Error(`Invalid type for ${fullPath}`);
    }
  }
}

function updateConfig(obj) {
  const config = loadConfig();
  merge(config, obj);
  saveConfig();
  return config;
}

module.exports = {
  CONFIG_PATH,
  getConfig,
  setConfig,
  updateConfig,
  saveConfig,
};