// utils/safe-json.js
const path = require('path');
const fs = require('fs');
const SecurityUtils = require('./security');

function stripBOM(s) {
  if (typeof s === 'string' && s.charCodeAt(0) === 0xFEFF) return s.slice(1);
  return s;
}

function stripPrototypePollution(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => stripPrototypePollution(item));
  }
  const clean = {};
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    const value = obj[key];
    clean[key] = (value && typeof value === 'object') ? stripPrototypePollution(value) : value;
  }
  return clean;
}

async function readJsonSafe(filePath, { maxBytes = 1_000_000 } = {}) {
  const baseDir = path.dirname(filePath);
  const raw = SecurityUtils.safeReadFileSync(filePath, baseDir, null);
  if (raw === null) {
    const err = new Error('Unable to read JSON file');
    err.code = 'EJSONREAD';
    err.path = filePath;
    throw err;
  }

  const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw, 'utf8');

  if (buf.length === 0) {
    const err = new Error('Empty JSON file');
    err.code = 'EJSONEMPTY';
    err.path = filePath;
    throw err;
  }
  if (buf.length > maxBytes) {
    const err = new Error(`JSON too large (${buf.length} bytes)`);
    err.code = 'EJSONTOOBIG';
    err.path = filePath;
    throw err;
  }
  try {
    return stripPrototypePollution(JSON.parse(stripBOM(buf.toString('utf8'))));
  } catch (e) {
    const err = new Error('Invalid JSON');
    err.code = 'EJSONPARSE';
    err.path = filePath;
    err.cause = e;
    throw err;
  }
}

module.exports = { readJsonSafe, stripPrototypePollution };
