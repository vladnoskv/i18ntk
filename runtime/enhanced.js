// runtime/enhanced.js
// Enhanced runtime API with AES-256-GCM encryption and full TypeScript support

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

// Import secure error handling
const { 
  SecureError, 
  ValidationError, 
  SecurityError, 
  EncryptionError 
} = require('../utils/secure-errors');

// Import existing runtime for backward compatibility
const baseRuntime = require('./index.js');

// Constants for AES-256-GCM encryption
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

class I18nEnhancedRuntime extends EventEmitter {
  constructor() {
    super();
    // Generate a unique salt for this instance
    const instanceSalt = crypto.randomBytes(16).toString('hex');
    
    this.config = {
      baseDir: './locales',
      defaultLanguage: 'en',
      fallbackLanguage: 'en',
      keySeparator: '.',
      preload: false,
      encryption: {
        enabled: false,
        algorithm: ALGORITHM,
        keyLength: KEY_LENGTH,
        ivLength: IV_LENGTH,
        authTagLength: AUTH_TAG_LENGTH,
        salt: instanceSalt, // Store the instance-specific salt
        saltRounds: 16, // Number of bytes for salt generation
      },
      cache: {
        enabled: true,
        maxSize: 1000, // Maximum number of entries
        maxMemoryMB: 100, // Maximum memory in MB before eviction
        ttl: 300000, // 5 minutes
        checkFrequency: 100, // Check memory every 100 operations
        entrySizeLimit: 1024 * 10, // 10KB max per entry
      },
      security: {
        validateInputs: true,
        sanitizeOutput: true,
        maxKeyLength: 1000,
        maxValueLength: 10000,
      },
    };
    this.encryptionKey = null;
    this.cache = new Map();
    this.cacheSize = 0; // Track total cache size in bytes
    this.cacheOpsSinceLastCheck = 0;
    this.plugins = [];
    this.metrics = {
      totalTranslations: 0,
      cacheHitRate: 0,
      averageTranslationTime: 0,
      encryptionTime: 0,
      memoryUsage: 0,
      cacheEvictions: 0,
      cacheSizeBytes: 0,
      cacheEntryCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
    this.namespaces = new Map();
    
    // Setup periodic memory checks
    this.memoryCheckInterval = setInterval(
      () => this.checkMemoryUsage(), 
      30000 // Check every 30 seconds
    );
    
    // Ensure cleanup on process exit
    if (process && process.on) {
      process.on('exit', () => this.cleanup());
      process.on('SIGINT', () => this.cleanup());
      process.on('uncaughtException', () => this.cleanup());
    }
    
    // Add default translations namespace
    this.addNamespace('default', {
      en: {
        greeting: 'Hello',
        welcome: 'Welcome',
        goodbye: 'Goodbye',
        thank_you: 'Thank you',
        yes: 'Yes',
        no: 'No',
        error: 'Error',
        success: 'Success',
        loading: 'Loading...',
        submit: 'Submit'
      }
    });
  }

  // Encryption/decryption methods with secure error handling
  async encryptData(data, key = this.encryptionKey) {
    if (!key) {
      throw new EncryptionError('Encryption key not set', { 
        operation: 'encrypt',
        keyType: typeof key
      });
    }
    
    const startTime = Date.now();
    
    try {
      if (typeof data !== 'string') {
        try {
          data = JSON.stringify(data);
        } catch (e) {
          throw new ValidationError('Failed to stringify data for encryption', {
            dataType: typeof data,
            error: e.message
          });
        }
      }
      
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
      
      let encrypted;
      try {
        encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
      } catch (e) {
        throw new EncryptionError('Failed to encrypt data', {
          dataLength: data ? data.length : 0,
          error: e.message
        });
      }
      
      const authTag = cipher.getAuthTag();
      
      const result = {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        timestamp: Date.now(),
        version: 1
      };
      
      this.metrics.encryptionTime += Date.now() - startTime;
      
      try {
        return JSON.stringify(result);
      } catch (e) {
        throw new EncryptionError('Failed to stringify encrypted result', {
          resultType: typeof result,
          error: e.message
        });
      }
    } catch (error) {
      if (error instanceof SecureError) throw error;
      
      // Sanitize error message to prevent information leakage
      throw new EncryptionError('Encryption failed', {
        operation: 'encrypt',
        errorId: crypto.randomBytes(4).toString('hex')
      });
    }
  }

  async decryptData(encryptedData, key = this.encryptionKey) {
    if (!key) throw new Error('Encryption key not set');
    
    try {
      const data = JSON.parse(encryptedData);
      const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, 'hex'), Buffer.from(data.iv, 'hex'));
      
      decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
      
      let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  // Generate secure encryption key with optional salt
  generateEncryptionKey(salt = null) {
    // If no salt provided, generate a new one
    if (!salt) {
      salt = crypto.randomBytes(16).toString('hex');
    }
    // Derive key using scrypt for additional security
    const key = crypto.scryptSync(
      crypto.randomBytes(32).toString('hex'),
      salt,
      KEY_LENGTH
    );
    return {
      key: key.toString('hex'),
      salt: salt
    };
  }

  // Hash key for storage with secure salt management
  hashKey(key, salt = null) {
    // Generate a new random salt if none provided
    if (!salt) {
      salt = crypto.randomBytes(16).toString('hex');
      // Store the salt in config if not already set
      if (!this.config.encryption.salt) {
        this.config.encryption.salt = salt;
      }
    }
    // Use scrypt with the salt (either provided, generated, or from config)
    const derivedKey = crypto.scryptSync(
      key, 
      salt || this.config.encryption.salt, 
      KEY_LENGTH
    );
    return {
      key: derivedKey.toString('hex'),
      salt: salt || this.config.encryption.salt
    };
  }

  // Enhanced translation with TypeScript support and secure error handling
  async translate(key, params = {}, options = {}) {
    const startTime = Date.now();
    
    try {
      // Validate inputs with secure error handling
      if (this.config.security.validateInputs) {
        try {
          this.validateTranslationKey(key);
          this.validateParams(params);
        } catch (error) {
          throw new ValidationError('Invalid translation input', {
            key: key ? 'Provided' : 'Missing',
            params: params ? 'Provided' : 'Missing',
            details: error.message
          });
        }
      }

      // Merge options with config
      const mergedOptions = { ...this.config, ...options };
      const language = mergedOptions.language || this.config.defaultLanguage;
      const fallbackLanguage = mergedOptions.fallbackLanguage || this.config.fallbackLanguage;

      // Check cache
      const cacheKey = this.getCacheKey(key, params, language);
      if (this.config.cache.enabled && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.config.cache.ttl) {
          this.metrics.cacheHitRate++;
          return cached.value;
        }
      }

      // Get translation
      let translation = await this.getTranslation(key, language, params);
      
      // Fallback to fallback language
      if (!translation && fallbackLanguage && fallbackLanguage !== language) {
        translation = await this.getTranslation(key, fallbackLanguage, params);
      }

      // Use key as fallback
      if (!translation) {
        translation = key;
      }

      // Apply plugins
      for (const plugin of this.plugins) {
        if (plugin.transform) {
          translation = plugin.transform(translation, params, mergedOptions);
        }
      }

      // Sanitize output
      if (this.config.security.sanitizeOutput) {
        translation = this.sanitizeTranslation(translation);
      }

      // Cache result
      if (this.config.cache.enabled) {
        this.setCache(cacheKey, translation);
      }

      // Update metrics
      this.metrics.totalTranslations++;
      this.metrics.averageTranslationTime += Date.now() - startTime;

      // Emit event
      this.emit('translation', {
        type: 'translation',
        key,
        language,
        params,
        result: translation,
        timestamp: new Date(),
        duration: Date.now() - startTime,
      });

      return translation;
    } catch (error) {
      this.emit('error', {
        type: 'error',
        key,
        language: this.config.defaultLanguage,
        params,
        error: error.message,
        timestamp: new Date(),
      });
      throw error;
    }
  }

  // Async translate with encryption support
  async translateEncrypted(key, params = {}, options = {}) {
    const translation = await this.translate(key, params, options);
    
    if (this.config.encryption.enabled && this.encryptionKey) {
      return await this.encryptData(translation);
    }
    
    return translation;
  }

  // Batch translation
  async translateBatch(keys, paramsArray = [], options = {}) {
    const results = [];
    
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const params = paramsArray[i] || {};
      const result = await this.translate(key, params, options);
      results.push(result);
    }
    
    return results;
  }

  // Batch translation with encryption
  async translateBatchEncrypted(keys, paramsArray = [], options = {}) {
    const results = [];
    
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const params = paramsArray[i] || {};
      const result = await this.translateEncrypted(key, params, options);
      results.push(result);
    }
    
    return results;
  }

  // Get translation with namespace support
  async getTranslation(key, language, params) {
    // Check namespaces first
    for (const [namespace, translations] of this.namespaces) {
      if (translations[language] && translations[language][key]) {
        return this.interpolate(translations[language][key], params);
      }
    }

    // Fall back to base runtime
    const baseInstance = baseRuntime.initRuntime({
      baseDir: this.config.baseDir,
      language,
      fallbackLanguage: this.config.fallbackLanguage,
    });

    return baseInstance.translate(key, params);
  }

  // Interpolation with advanced features
  interpolate(template, params) {
    if (typeof template !== 'string') return template;
    
    let result = template;
    
    // Handle pluralization
    if (params.count !== undefined) {
      const pluralRules = this.getPluralRules(this.config.defaultLanguage);
      const pluralForm = pluralRules.rule(params.count);
      
      // Simple pluralization support
      const pluralKey = result.includes('|') ? 
        result.split('|')[pluralForm] || result.split('|')[0] : 
        result;
      result = pluralKey;
    }

    // Standard interpolation
    result = result.replace(/\{\{?(\w+)\}?\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });

    return result;
  }

  // Plural rules for different languages
  getPluralRules(language) {
    const rules = {
      en: { rule: (n) => n === 1 ? 0 : 1, examples: ['one', 'other'] },
      es: { rule: (n) => n === 1 ? 0 : 1, examples: ['one', 'other'] },
      fr: { rule: (n) => n <= 1 ? 0 : 1, examples: ['one', 'other'] },
      de: { rule: (n) => n === 1 ? 0 : 1, examples: ['one', 'other'] },
      ja: { rule: () => 0, examples: ['other'] },
      ru: { rule: (n) => {
        const rem = n % 10;
        const rem100 = n % 100;
        if (rem === 1 && rem100 !== 11) return 0;
        if (rem >= 2 && rem <= 4 && (rem100 < 10 || rem100 >= 20)) return 1;
        return 2;
      }, examples: ['one', 'few', 'other'] },
      zh: { rule: () => 0, examples: ['other'] },
    };

    return rules[language] || rules.en;
  }

  // Validation methods
  validateTranslationKey(key) {
    if (typeof key !== 'string') {
      throw new Error('Translation key must be a string');
    }
    if (key.length > this.config.security.maxKeyLength) {
      throw new Error(`Translation key too long (max ${this.config.security.maxKeyLength})`);
    }
    return true;
  }

  validateParams(params) {
    if (typeof params !== 'object' || params === null) {
      throw new Error('Translation params must be an object');
    }
    return true;
  }

  sanitizeTranslation(text) {
    if (typeof text !== 'string') return text;
    
    // Basic HTML sanitization
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  // Cache management with secure key generation
  getCacheKey(key, params, language) {
    // Sanitize inputs
    const sanitizedKey = this.sanitizeCacheKey(key);
    const sanitizedLanguage = this.sanitizeLanguageCode(language);
    
    // Create a stable string representation of params
    let paramsString = '';
    if (params && typeof params === 'object') {
      try {
        // Sort keys to ensure consistent ordering
        const sortedParams = {};
        Object.keys(params).sort().forEach(k => {
          if (params[k] !== undefined && params[k] !== null) {
            sortedParams[k] = params[k];
          }
        });
        paramsString = JSON.stringify(sortedParams);
      } catch (e) {
        // If we can't stringify params, use a hash of the params object
        paramsString = crypto.createHash('sha256')
          .update(JSON.stringify(params) || '')
          .digest('hex')
          .substring(0, 16);
      }
    }
    
    // Create a hash of the combined components to prevent injection
    const cacheKey = crypto.createHash('sha256')
      .update(`${sanitizedLanguage}:${sanitizedKey}:${paramsString}`)
      .digest('hex');
      
    return `i18n:${cacheKey}`;
  }
  
  // Sanitize cache key input
  sanitizeCacheKey(key) {
    if (typeof key !== 'string') {
      throw new ValidationError('Cache key must be a string');
    }
    
    // Remove any potentially dangerous characters
    return key.replace(/[^\w\-.:@]/g, '_');
  }
  
  // Sanitize language code
  sanitizeLanguageCode(lang) {
    if (typeof lang !== 'string') {
      return 'en'; // Default to English
    }
    
    // Only allow letters and hyphens, convert to lowercase
    return lang.replace(/[^a-zA-Z\-]/g, '').toLowerCase();
  }

  // Calculate the approximate size of an object in bytes
  getObjectSize(obj) {
    if (obj === null || obj === undefined) return 0;
    
    let bytes = 0;
    
    if (typeof obj === 'string') {
      // UTF-16 uses 2 bytes per character
      bytes = obj.length * 2;
    } else if (typeof obj === 'number') {
      // Numbers are 8 bytes (64 bits)
      bytes = 8;
    } else if (typeof obj === 'boolean') {
      // Booleans are 4 bytes
      bytes = 4;
    } else if (typeof obj === 'object') {
      // For objects and arrays, sum the size of all properties
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          bytes += this.getObjectSize(obj[key]);
          // Add the size of the key itself
          bytes += key.length * 2; // UTF-16
        }
      }
    }
    
    return bytes;
  }
  
  // Check if we need to free up memory
  checkMemoryUsage(force = false) {
    this.cacheOpsSinceLastCheck++;
    
    // Only check every N operations or if forced
    if (!force && this.cacheOpsSinceLastCheck < this.config.cache.checkFrequency) {
      return;
    }
    
    this.cacheOpsSinceLastCheck = 0;
    
    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / (1024 * 1024);
    
    // If we're using too much memory, clear some cache entries
    if (heapUsedMB > this.config.cache.maxMemoryMB || force) {
      const targetReduction = Math.ceil(this.cache.size * 0.2); // Remove 20% of entries
      let removed = 0;
      
      // Sort entries by last access time (oldest first)
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest entries
      for (const [key, entry] of entries) {
        if (removed >= targetReduction) break;
        
        // Reduce cache size
        this.cacheSize -= this.getObjectSize(entry);
        this.cache.delete(key);
        removed++;
        this.metrics.cacheEvictions++;
      }
      
      this.emit('cachePruned', {
        timestamp: new Date(),
        entriesRemoved: removed,
        remainingEntries: this.cache.size,
        heapUsedMB,
        maxMemoryMB: this.config.cache.maxMemoryMB
      });
    }
    
    // Update metrics
    this.metrics.memoryUsage = heapUsedMB;
    this.metrics.cacheSizeBytes = this.cacheSize;
    this.metrics.cacheEntryCount = this.cache.size;
  }
  
  // Clean up resources
  cleanup() {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
    
    // Clear all caches
    this.cache.clear();
    this.cacheSize = 0;
    
    // Clear namespaces
    this.namespaces.clear();
    
    // Clear encryption key from memory
    if (this.encryptionKey) {
      this.encryptionKey = null;
    }
    
    // Clear any sensitive data from config
    if (this.config.encryption) {
      this.config.encryption.salt = null;
    }
  }
  
  // Add or update a cache entry
  setCache(key, value) {
    // Check entry size limit
    const entrySize = this.getObjectSize(value);
    if (entrySize > this.config.cache.entrySizeLimit) {
      this.emit('cacheReject', {
        reason: 'entry_too_large',
        key,
        size: entrySize,
        maxSize: this.config.cache.entrySizeLimit
      });
      return false;
    }
    
    // Check if we need to make space
    if (this.cache.size >= this.config.cache.maxSize) {
      // Remove the least recently used entry
      const lruKey = this.cache.keys().next().value;
      const lruEntry = this.cache.get(lruKey);
      
      if (lruEntry) {
        this.cacheSize -= this.getObjectSize(lruEntry);
        this.cache.delete(lruKey);
        this.metrics.cacheEvictions++;
      }
    }
    
    // Add the new entry
    const entry = {
      value,
      timestamp: Date.now(),
      size: entrySize
    };
    
    // Update cache size
    this.cacheSize += entrySize;
    
    // Store the entry
    this.cache.set(key, entry);
    
    // Check memory usage periodically
    this.checkMemoryUsage();
    
    return true;
  }

  // Configuration management
  async updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    this.cache.clear();
    
    if (updates.encryption?.enabled && !this.encryptionKey) {
      const { key, salt } = this.generateEncryptionKey(updates.encryption.salt);
      this.encryptionKey = key;
      this.config.encryption.salt = salt;
    }
  }

  getConfig() {
    return { ...this.config };
  }

  // Namespace management
  addNamespace(name, translations) {
    this.namespaces.set(name, translations);
  }

  removeNamespace(name) {
    this.namespaces.delete(name);
  }

  getNamespace(name) {
    return this.namespaces.get(name) || null;
  }

  listNamespaces() {
    return Array.from(this.namespaces.keys());
  }

  // Plugin system
  addPlugin(plugin) {
    this.plugins.push(plugin);
  }

  removePlugin(pluginName) {
    this.plugins = this.plugins.filter(p => p.name !== pluginName);
  }

  // Performance metrics
  getMetrics() {
    return { ...this.metrics };
  }

  resetMetrics() {
    this.metrics = {
      totalTranslations: 0,
      cacheHitRate: 0,
      averageTranslationTime: 0,
      encryptionTime: 0,
      memoryUsage: process.memoryUsage().heapUsed,
      cacheHits: 0,
      cacheMisses: 0,
      cacheEvictions: 0,
    };
  }

  getCacheInfo() {
    const memoryUsage = process.memoryUsage();
    
    return {
      entries: this.cache.size,
      maxEntries: this.config.cache.maxSize,
      sizeBytes: this.cacheSize,
      maxMemoryMB: this.config.cache.maxMemoryMB,
      entrySizeLimit: this.config.cache.entrySizeLimit,
      hits: this.metrics.cacheHits,
      misses: this.metrics.cacheMisses,
      hitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0,
      evictions: this.metrics.cacheEvictions,
      memoryUsage: {
        heapUsedMB: memoryUsage.heapUsed / (1024 * 1024),
        heapTotalMB: memoryUsage.heapTotal / (1024 * 1024),
        externalMB: memoryUsage.external / (1024 * 1024) || 0,
        arrayBuffersMB: memoryUsage.arrayBuffers / (1024 * 1024) || 0,
        rssMB: memoryUsage.rss / (1024 * 1024)
      },
      ttl: this.config.cache.ttl,
      lastChecked: new Date().toISOString()
    };
  }

  clearCache() {
    this.cache.clear();
  }
}

// Global runtime instance
let runtimeInstance = null;

// Enhanced initialization
async function initI18nRuntime(options = {}) {
  if (!runtimeInstance) {
    runtimeInstance = new I18nEnhancedRuntime();
  }
  
  await runtimeInstance.updateConfig(options);
  
  return {
    t: runtimeInstance.translate.bind(runtimeInstance),
    translate: runtimeInstance.translate.bind(runtimeInstance),
    translateEncrypted: runtimeInstance.translateEncrypted.bind(runtimeInstance),
    translateBatch: runtimeInstance.translateBatch.bind(runtimeInstance),
    translateBatchEncrypted: runtimeInstance.translateBatchEncrypted.bind(runtimeInstance),
    
    setLanguage: async (lang) => {
      await runtimeInstance.updateConfig({ defaultLanguage: lang });
    },
    
    getLanguage: () => runtimeInstance.config.defaultLanguage,
    
    getAvailableLanguages: () => {
      // This would scan the base directory for available languages
      return ['en', 'es', 'fr', 'de', 'ja', 'ru', 'zh'];
    },
    
    refresh: async (lang) => {
      runtimeInstance.cache.clear();
    },
    
    getConfig: () => runtimeInstance.getConfig(),
    updateConfig: runtimeInstance.updateConfig.bind(runtimeInstance),
    
    setEncryptionKey: (key) => {
      runtimeInstance.encryptionKey = key;
    },
    
    getEncryptionStatus: () => runtimeInstance.config.encryption.enabled && !!runtimeInstance.encryptionKey,
    
    encryptData: runtimeInstance.encryptData.bind(runtimeInstance),
    decryptData: runtimeInstance.decryptData.bind(runtimeInstance),
    
    validateTranslationKey: runtimeInstance.validateTranslationKey.bind(runtimeInstance),
    sanitizeTranslation: runtimeInstance.sanitizeTranslation.bind(runtimeInstance),
    getTranslationMetadata: (key) => ({
      text: key,
      language: runtimeInstance.config.defaultLanguage,
      key,
      params: {},
      encrypted: runtimeInstance.config.encryption.enabled,
    }),
    
    createTypedTranslator: () => ({
      t: runtimeInstance.translate.bind(runtimeInstance),
      translate: runtimeInstance.translate.bind(runtimeInstance),
    }),
    
    // Additional methods
    addNamespace: runtimeInstance.addNamespace.bind(runtimeInstance),
    removeNamespace: runtimeInstance.removeNamespace.bind(runtimeInstance),
    getNamespace: runtimeInstance.getNamespace.bind(runtimeInstance),
    listNamespaces: runtimeInstance.listNamespaces.bind(runtimeInstance),
    addPlugin: runtimeInstance.addPlugin.bind(runtimeInstance),
    removePlugin: runtimeInstance.removePlugin.bind(runtimeInstance),
    getMetrics: runtimeInstance.getMetrics.bind(runtimeInstance),
    resetMetrics: runtimeInstance.resetMetrics.bind(runtimeInstance),
  };
}

// Backward compatibility
function translate(key, params, options) {
  if (!runtimeInstance) {
    runtimeInstance = new I18nEnhancedRuntime();
  }
  return runtimeInstance.translate(key, params, options);
}

const t = translate;

// Export for both CommonJS and ES modules
module.exports = {
  initI18nRuntime,
  translate,
  t,
  translateEncrypted: async (key, params, options) => {
    if (!runtimeInstance) {
      runtimeInstance = new I18nEnhancedRuntime();
    }
    return runtimeInstance.translateEncrypted(key, params, options);
  },
  
  // TypeScript compatibility exports
  I18nEnhancedRuntime,
  
  // Encryption utilities
  generateEncryptionKey: () => {
    const runtime = new I18nEnhancedRuntime();
    return runtime.generateEncryptionKey();
  },
  
  // Constants
  ALGORITHM,
  KEY_LENGTH,
  IV_LENGTH,
  AUTH_TAG_LENGTH,
};

// ES module support
module.exports.default = {
  initI18nRuntime,
  translate,
  t,
};