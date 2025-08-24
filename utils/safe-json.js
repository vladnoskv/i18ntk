// utils/safe-json.js
const { readFile } = require('fs/promises');

function stripBOM(s) {
  if (typeof s === 'string' && s.charCodeAt(0) === 0xFEFF) return s.slice(1);
  return s;
}

/**
 * Safe JSON load with guardrails.
 * - Max file size (default 1MB)
 * - BOM stripping
 * - Single, typed error (no loops)
 */
async function readJsonSafe(filePath, { maxBytes = 1_000_000 } = {}) {
  const buf = await readFile(filePath);
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
    return JSON.parse(stripBOM(buf.toString('utf8')));
  } catch (e) {
    const err = new Error(`Invalid JSON`);
    err.code = 'EJSONPARSE';
    err.path = filePath;
    err.cause = e;
    throw err;
  }
}

module.exports = { readJsonSafe };