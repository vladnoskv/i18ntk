const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');
const { existsSync, mkdirSync } = require('fs');
const { EncryptionError, ValidationError } = require('./secure-errors');

// Promisify functions
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// Constants
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;
const ALGORITHM = 'aes-256-gcm';
const BACKUP_HEADER = 'I18NTK_BACKUP';
const BACKUP_VERSION = 1;

class SecureBackupManager {
  constructor(config = {}) {
    this.config = {
      backupDir: path.join(process.cwd(), 'backups'),
      maxBackups: 10,
      compress: true,
      ...config
    };
    
    // Create backup directory synchronously in constructor
    if (!existsSync(this.config.backupDir)) {
      mkdirSync(this.config.backupDir, { recursive: true });
    }
  }

  /**
   * Derive a key from a password using PBKDF2
   */
  async deriveKey(password, salt) {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        ITERATIONS,
        KEY_LENGTH,
        'sha512',
        (err, derivedKey) => {
          if (err) {
            reject(new EncryptionError('Key derivation failed', { error: err.message }));
          } else {
            resolve(derivedKey);
          }
        }
      );
    });
  }

  /**
   * Generate a random salt
   */
  generateSalt() {
    return crypto.randomBytes(SALT_LENGTH);
  }

  /**
   * Encrypt data with a password
   */
  async encryptData(data, password) {
    try {
      // Generate a random salt
      const salt = this.generateSalt();
      
      // Derive key from password
      const key = await this.deriveKey(password, salt);
      
      // Generate a random IV
      const iv = crypto.randomBytes(IV_LENGTH);
      
      // Create cipher
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      
      // Encrypt the data
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get the auth tag
      const authTag = cipher.getAuthTag();
      
      // Return the encrypted data with metadata
      return {
        encrypted,
        iv: iv.toString('hex'),
        salt: salt.toString('hex'),
        authTag: authTag.toString('hex'),
        algorithm: ALGORITHM,
        version: BACKUP_VERSION
      };
    } catch (error) {
      throw new EncryptionError('Encryption failed', { cause: error });
    }
  }

  /**
   * Decrypt data with a password
   */
  async decryptData(encryptedData, password) {
    try {
      // Parse the encrypted data
      const { encrypted, iv, salt, authTag, version } = encryptedData;
      
      // Validate version
      if (version !== BACKUP_VERSION) {
        throw new ValidationError('Unsupported backup version');
      }
      
      // Convert from hex
      const ivBuffer = Buffer.from(iv, 'hex');
      const saltBuffer = Buffer.from(salt, 'hex');
      const authTagBuffer = Buffer.from(authTag, 'hex');
      
      // Derive the key
      const key = await this.deriveKey(password, saltBuffer);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
      decipher.setAuthTag(authTagBuffer);
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new EncryptionError('Decryption failed', { cause: error });
    }
  }

  /**
   * Create a secure backup
   */
  async createBackup(data, password, options = {}) {
    try {
      // Validate input
      if (!data) {
        throw new ValidationError('No data provided for backup');
      }
      
      if (!password) {
        throw new ValidationError('Password is required for backup');
      }
      
      // Stringify data if it's an object
      const dataString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
      
      // Compress the data if enabled
      let processedData = dataString;
      if (this.config.compress) {
        processedData = await gzip(dataString);
      }
      
      // Encrypt the data
      const encryptedData = await this.encryptData(
        processedData.toString('base64'),
        password
      );
      
      // Add metadata
      const backupData = {
        header: BACKUP_HEADER,
        version: BACKUP_VERSION,
        timestamp: new Date().toISOString(),
        compressed: this.config.compress,
        ...encryptedData
      };
      
      // Create backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup-${timestamp}.i18ntk`;
      const backupPath = path.join(this.config.backupDir, backupName);
      
      // Write the backup file
      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2), 'utf8');
      
      // Clean up old backups if we've exceeded the limit
      await this.cleanupOldBackups();
      
      return {
        success: true,
        backupPath,
        backupName,
        timestamp: backupData.timestamp,
        size: JSON.stringify(backupData).length
      };
    } catch (error) {
      throw new EncryptionError('Backup creation failed', { cause: error });
    }
  }

  /**
   * Restore a backup
   */
  async restoreBackup(backupPath, password) {
    try {
      // Read the backup file
      const backupData = JSON.parse(await fs.readFile(backupPath, 'utf8'));
      
      // Validate the backup
      if (backupData.header !== BACKUP_HEADER) {
        throw new ValidationError('Invalid backup file');
      }
      
      // Decrypt the data
      const decryptedData = await this.decryptData(backupData, password);
      
      // Decompress if needed
      let processedData = Buffer.from(decryptedData, 'base64');
      if (backupData.compressed) {
        processedData = await gunzip(processedData);
      }
      
      // Parse the data if it's JSON
      try {
        return JSON.parse(processedData.toString('utf8'));
      } catch {
        return processedData.toString('utf8');
      }
    } catch (error) {
      throw new EncryptionError('Backup restoration failed', { cause: error });
    }
  }

  /**
   * List available backups
   */
  async listBackups() {
    try {
      // Read the backup directory
      const files = (await fs.readdir(this.config.backupDir, { withFileTypes: true }))
      .filter(dirent => dirent.isFile())
      .map(dirent => dirent.name);
      
      // Filter for backup files
      const backupFiles = files.filter(file => file.endsWith('.i18ntk'));
      
      // Get file stats
      const backups = await Promise.all(
        backupFiles.map(async (file) => {
          const filePath = path.join(this.config.backupDir, file);
          const stat = await fs.stat(filePath);
          if (stat.isDirectory()) {
            throw new Error('Backup path is a directory');
          }
          return {
            name: file,
            path: filePath,
            size: stat.size,
            createdAt: stat.birthtime,
            modifiedAt: stat.mtime
          };
        })
      );
      
      // Sort by creation date (newest first)
      return backups.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      throw new Error(`Failed to list backups: ${error.message}`);
    }
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups() {
    try {
      const backups = await this.listBackups();
      
      // If we haven't exceeded the limit, do nothing
      if (backups.length <= this.config.maxBackups) {
        return [];
      }
      
      // Sort by creation date (oldest first)
      const sortedBackups = [...backups].sort((a, b) => a.createdAt - b.createdAt);
      
      // Determine how many to delete
      const toDelete = sortedBackups.slice(0, backups.length - this.config.maxBackups);
      
      // Delete the old backups
      const deleted = [];
      for (const backup of toDelete) {
        try {
          await fs.unlink(backup.path);
          deleted.push(backup.name);
        } catch (error) {
          console.error(`Failed to delete backup ${backup.name}:`, error);
        }
      }
      
      return deleted;
    } catch (error) {
      console.error('Failed to clean up old backups:', error);
      return [];
    }
  }

  /**
   * Verify a backup password
   */
  async verifyBackup(backupPath, password) {
    try {
      // Read the backup file
      const backupData = JSON.parse(await fs.readFile(backupPath, 'utf8'));
      
      // Try to decrypt a small part to verify the password
      const testData = await this.decryptData(backupData, password);
      
      // If we got here, the password is correct
      return {
        valid: true,
        timestamp: backupData.timestamp,
        compressed: backupData.compressed
      };
    } catch (error) {
      // If decryption failed, the password is likely incorrect
      if (error instanceof EncryptionError) {
        return { valid: false, reason: 'Invalid password or corrupted backup' };
      }
      
      // For other errors, rethrow
      throw error;
    }
  }
}

module.exports = {
  SecureBackupManager,
  createBackupManager: (config) => new SecureBackupManager(config)
};
