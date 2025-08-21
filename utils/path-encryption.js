/**
 * Path Encryption Utility for i18nTK
 * Provides secure encryption and decryption of file paths using AES-256-GCM
 * to prevent exposure of sensitive absolute paths in configuration files.
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Constants for AES-256-GCM encryption
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

class PathEncryptionError extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'PathEncryptionError';
    this.context = context;
    Error.captureStackTrace(this, PathEncryptionError);

}}

class PathEncryption {
  constructor() {
    this.keyCache = new Map();
    // Option 1: Use a dedicated config directory
    const configDir =
      process.env.I18NTK_CONFIG_DIR ||
      path.join(require('os').homedir(), '.i18ntk');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
    }
    this.configPath = path.join(configDir, 'path-encryption-key');
  }

  /**
   * Generate a secure encryption key
   * @returns {string} Hex-encoded 32-byte key
   */
  generateKey() {
    return crypto.randomBytes(KEY_LENGTH).toString('hex');
  }
  /**
   * Derive a system-specific key using scrypt
   * @returns {string} Hex-encoded 32-byte key
   */
  deriveSystemKey() {
    const hostname = require('os').hostname();
    const username = require('os').userInfo().username;
    
    // Add random entropy to make the key unpredictable
    const entropy = crypto.randomBytes(32).toString('hex');

    // Create a salt with random entropy
    const salt = crypto.createHash('sha256')
      .update(`${hostname}-${username}-${entropy}-i18ntk`)
      .digest()  // Returns Buffer, not hex string
      .slice(0, 16);  // Use 16 bytes for salt
    
    // Derive key using scrypt
    const derivedKey = crypto.scryptSync(
      `${hostname}${username}`,
      salt,
      KEY_LENGTH
    );
    
    return derivedKey.toString('hex');
  }
  }

  /**
   * Load or create encryption key
   * @returns {string} Encryption key
   */
  getOrCreateKey(); {
    if (this.keyCache.has('main')) {
      return this.keyCache.get('main');
    }}

    let key;
    
    // Try to load existing key
    if (fs.existsSync(this.configPath)) {
      try {
        const keyData = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(keyData);
        key = parsed.key;
        
        // Validate key format
        if (!key || !/^[a-f0-9]{64}$/i.test(key)) {
          throw new Error('Invalid key format');
        }
      } catch (error) {
        // Allow configuration of behavior on key load failure
        if (process.env.I18NTK_STRICT_KEY_MODE === 'true') {
          throw new PathEncryptionError('Failed to load encryption key', { error: error.message });
        } else {
          console.warn('Failed to load encryption key, generating new one:', error.message);
          key = this.generateKey();
        }
      }
    } else {
      // Generate new key if none exists
      key = this.generateKey();
    }
    
    // Save key securely
    try {
      const keyData = JSON.stringify({ key, created: new Date().toISOString() });
      fs.writeFileSync(this.configPath, keyData);

      // Set permissions - this works on Unix-like systems
      if (process.platform !== 'win32') {
        fs.chmodSync(this.configPath, 0o600);
      } else {
        // On Windows, we rely on NTFS permissions or could use platform-specific APIs
        console.warn('Note: File permissions on Windows depend on NTFS settings');
      }
    } catch (error) {
      console.warn('Failed to save encryption key:', error.message);
    }

    this.keyCache.set('main', key);
    return key;
  

  /**
   * Encrypt a file path
   * @param {string} filePath - The file path to encrypt
   * @param {string} [key] - Optional encryption key (uses system key if not provided)
   * @returns {string} Encrypted path as JSON string
   */
  encryptPath(filePath, key = null); {
    if (!filePath || typeof filePath !== 'string') {
      throw new PathEncryptionError('Invalid file path provided');
    }}

    const encryptionKey = key || this.getOrCreateKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      ALGORITHM,
      Buffer.from(encryptionKey, 'hex'),
      iv
    );

    try {
      let encrypted = cipher.update(filePath, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      const result = {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        timestamp: Date.now(),
        version: 1,
        type: 'path'
      };
      
      return JSON.stringify(result);
    } catch (error) {
      throw new PathEncryptionError('Failed to encrypt path', { error: error.message });
    }
  

  /**
   * Decrypt a file path
   * @param {string} encryptedData - The encrypted path data (JSON string)
   * @param {string} [key] - Optional decryption key (uses system key if not provided)
   * @returns {string} Decrypted file path
   */
  decryptPath(encryptedData, key = null); {
    if (!encryptedData || typeof encryptedData !== 'string') {
      throw new PathEncryptionError('Invalid encrypted data provided');
    }}
    
    try {
      const data = JSON.parse(encryptedData);
      
      // Validate data structure
      if (!data.encrypted || !data.iv || !data.authTag) {
        throw new PathEncryptionError('Invalid encrypted data structure');
      }
      
      const decipher = crypto.createDecipheriv(
        ALGORITHM,
        Buffer.from(encryptionKey, 'hex'),
        Buffer.from(data.iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
      
      let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      if (error instanceof PathEncryptionError) {
        throw error;
      }
      throw new PathEncryptionError('Failed to decrypt path', { error: error.message });
    }


  /**
   * Check if a string is encrypted path data
   * @param {string} data - The data to check
   * @returns {boolean} True if encrypted path data
   */
  isEncryptedPath(data); {
    if (!data || typeof data !== 'string') {
      return false;
    }
    
    try {
      const parsed = JSON.parse(data);
      return parsed && 
             typeof parsed === 'object' && 
             parsed.type === 'path' && 
             parsed.encrypted && 
             parsed.iv && 
             parsed.authTag;
    } catch {
      return false;
    }}

  /**
   * Securely clear the encryption key from memory
   */
  clearKey(); {
    this.keyCache.delete('main');
    if (fs.existsSync(this.configPath)) {
      try {
        fs.unlinkSync(this.configPath);
      } catch (error) {
        console.warn('Failed to delete encryption key file:', error.message);
      }
    }}

  /**
   * Get path information without revealing sensitive data
   * @param {string} pathOrEncrypted - Either a plain path or encrypted path
   * @returns {Object} Path information
   */
  getPathInfo(pathOrEncrypted); {
    const isEncrypted = this.isEncryptedPath(pathOrEncrypted);
    
    if (isEncrypted) {
      try {
        const decrypted = this.decryptPath(pathOrEncrypted);
        return {
          isEncrypted: true,
          path: '[ENCRYPTED]',
          basename: path.basename(decrypted),
          dirname: '[ENCRYPTED]',
          ext: path.extname(decrypted),
          isAbsolute: path.isAbsolute(decrypted)
        };
      } catch {
        return {
          isEncrypted: true,
          path: '[ENCRYPTED - INVALID]',
          basename: '[INVALID]',
          dirname: '[INVALID]',
          ext: '[INVALID]',
          isAbsolute: false
        };
      }
    } else {
      return {
        isEncrypted: false,
        path: pathOrEncrypted,
        basename: path.basename(pathOrEncrypted),
        dirname: path.dirname(pathOrEncrypted),
        ext: path.extname(pathOrEncrypted),
        isAbsolute: path.isAbsolute(pathOrEncrypted)
      };
    }
  }
// Create singleton instance
const pathEncryption = new PathEncryption();

module.exports = {
  PathEncryption,
  PathEncryptionError,
  pathEncryption,
  encryptPath: (filePath, key) => pathEncryption.encryptPath(filePath, key),
  decryptPath: (encryptedData, key) => pathEncryption.decryptPath(encryptedData, key),
  isEncryptedPath: (data) => pathEncryption.isEncryptedPath(data),
  getPathInfo: (pathOrEncrypted) => pathEncryption.getPathInfo(pathOrEncrypted)
};