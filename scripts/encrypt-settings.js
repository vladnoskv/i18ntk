#!/usr/bin/env node
/**
 * Encrypt settings paths script
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

// Constants for AES-256-GCM
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

// Generate encryption key
function generateKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

// Encrypt data
function encryptData(data, key) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    timestamp: Date.now(),
    version: 1,
    type: 'path'
  });
}
// Main execution
const settingsFile = path.join(__dirname, '..', 'settings', 'initialization.json');
const keyFile = path.join(os.homedir(), '.i18ntk', '.path-encryption-key');

// Ensure the key directory exists with strict permissions
const keyDir = path.dirname(keyFile);
if (!fs.existsSync(keyDir)) {
  fs.mkdirSync(keyDir, { recursive: true, mode: 0o700 });
}

// Read current settings
// Check if settings file exists
if (!fs.existsSync(settingsFile)) {
  console.error('❌ Settings file not found:', settingsFile);
  process.exit(1);
}

// Read current settings
let settings;
try {
  settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
} catch (error) {
  console.error('❌ Failed to read or parse settings file:', error.message);
  process.exit(1);
}

// Generate key
const lockFile = `${keyFile}.lock`;

// Create lock file
try {
  fs.writeFileSync(lockFile, process.pid.toString(), { flag: 'wx' });
} catch (error) {
  if (error.code === 'EEXIST') {
    console.error('❌ Another encryption process is running');
    process.exit(1);
  }
  throw error;
}

try {
  // Generate key
  const key = generateKey();
  fs.writeFileSync(
    keyFile,
    JSON.stringify({ key, created: new Date().toISOString() }),
    { mode: 0o600 }
  );
} finally {
  // Clean up lock file
  try {
    fs.unlinkSync(lockFile);
  } catch (error) {
    console.warn('Failed to remove lock file:', error.message);
  }
}

// Encrypt sourceDir
const sourceDir = settings.sourceDir || path.join(process.cwd(), 'locales');
const encryptedSourceDir = encryptData(sourceDir, key);

// Create encrypted settings
const encryptedSettings = {
  ...settings,
  sourceDir: encryptedSourceDir,
  encryptionVersion: 1,
  timestamp: new Date().toISOString()
};

// Write encrypted settings
fs.writeFileSync(settingsFile, JSON.stringify(encryptedSettings, null, 2), { mode: 0o600 });

console.log('✅ Settings encrypted successfully');
console.log('🔑 Key saved to:', keyFile);
console.log('📄 Settings updated:', settingsFile);
console.log('🔒 Original path:', sourceDir);
console.log('🔐 Encrypted path:', encryptedSourceDir);