// runtime/enhanced.js
// Enhanced runtime API with AES-256-GCM encryption and full TypeScript support

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

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
      },
      cache: {
        enabled: true,
        maxSize: 1000,
        ttl: 300000, // 5 minutes
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
    this.plugins = [];
    this.metrics = {
      totalTranslations: 0,
      cacheHitRate: 0,
      averageTranslationTime: 0,
      encryptionTime: 0,
      memoryUsage: 0,
    };
    this.namespaces = new Map();
    
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

  // AES-256-GCM encryption implementation
  async encryptData(data, key = this.encryptionKey) {
    if (!key) throw new Error('Encryption key not set');
    
    const startTime = Date.now();
    
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      const result = {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        timestamp: Date.now(),
      };
      
      this.metrics.encryptionTime += Date.now() - startTime;
      return JSON.stringify(result);
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
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

  // Generate secure encryption key
  generateEncryptionKey() {
    return crypto.randomBytes(KEY_LENGTH).toString('hex');
  }

  // Hash key for storage (using Argon2id-like approach with crypto)
  hashKey(key) {
    return crypto.scryptSync(key, 'i18ntk-salt', KEY_LENGTH).toString('hex');
  }

  // Enhanced translation with TypeScript support
  async translate(key, params = {}, options = {}) {
    const startTime = Date.now();
    
    try {
      // Validate inputs
      if (this.config.security.validateInputs) {
        this.validateTranslationKey(key);
        this.validateParams(params);
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

  // Cache management
  getCacheKey(key, params, language) {
    return `${language}:${key}:${JSON.stringify(params)}`;
  }

  setCache(key, value) {
    if (this.cache.size >= this.config.cache.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  // Configuration management
  async updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    this.cache.clear();
    
    if (updates.encryption?.enabled && !this.encryptionKey) {
      this.encryptionKey = this.generateEncryptionKey();
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
    };
  }

  getCacheInfo() {
    return {
      size: this.cache.size,
      maxSize: this.config.cache.maxSize,
      hits: this.metrics.cacheHitRate,
      misses: this.metrics.totalTranslations - this.metrics.cacheHitRate,
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