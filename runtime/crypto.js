'use strict';

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function normalizeKey(key) {
  if (typeof key !== 'string' || !/^[a-f0-9]{64}$/i.test(key)) {
    const error = new Error('Encryption key must be a 32-byte hexadecimal string');
    error.code = 'I18NTK_RUNTIME_ENCRYPTION_KEY';
    throw error;
  }
  return Buffer.from(key, 'hex');
}

function generateEncryptionKey() { return crypto.randomBytes(32).toString('hex'); }

async function encryptData(value, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, normalizeKey(key), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return { encrypted: encrypted.toString('hex'), iv: iv.toString('hex'), authTag: cipher.getAuthTag().toString('hex') };
}

async function decryptData(payload, key) {
  if (!payload || typeof payload !== 'object') throw new TypeError('Encrypted payload must be an object');
  const decipher = crypto.createDecipheriv(ALGORITHM, normalizeKey(key), Buffer.from(payload.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(payload.encrypted, 'hex')), decipher.final()]).toString('utf8');
}

module.exports = { ALGORITHM, generateEncryptionKey, encryptData, decryptData };
