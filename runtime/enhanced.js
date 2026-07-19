'use strict';

// Deprecated compatibility adapter. All translation and resource behavior is
// delegated to the isolated runtime implementation in ./index.

const baseRuntime = require('./index');

const DEFAULT_CONFIG = Object.freeze({
  baseDir: './locales',
  projectRoot: undefined,
  localeDir: undefined,
  defaultLanguage: 'en',
  fallbackLanguage: 'en',
  keySeparator: '.',
  preload: false,
  encryption: Object.freeze({ enabled: false }),
  cache: Object.freeze({ enabled: true, maxSize: 1000, ttl: 300000 }),
  security: Object.freeze({ validateInputs: true, sanitizeOutput: false, maxKeyLength: 1000, maxValueLength: 10000 })
});

class ValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'I18NTK_RUNTIME_VALIDATION';
    this.details = details;
  }
}

function mergeConfig(current, updates = {}) {
  return {
    ...current,
    ...updates,
    encryption: { ...current.encryption, ...(updates.encryption || {}) },
    cache: { ...current.cache, ...(updates.cache || {}) },
    security: { ...current.security, ...(updates.security || {}) }
  };
}

function validateConfig(config) {
  for (const field of ['baseDir', 'projectRoot', 'localeDir']) {
    if (config[field] !== undefined && (typeof config[field] !== 'string' || !config[field].trim())) {
      throw new ValidationError(`${field} must be a non-empty string when provided`);
    }
  }
  for (const field of ['defaultLanguage', 'fallbackLanguage', 'keySeparator']) {
    if (typeof config[field] !== 'string' || !config[field]) throw new ValidationError(`${field} must be a non-empty string`);
  }
  for (const field of ['defaultLanguage', 'fallbackLanguage']) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,35}$/.test(config[field])) throw new ValidationError(`${field} must be a valid locale identifier`);
  }
  if (typeof config.cache.enabled !== 'boolean' || !Number.isInteger(config.cache.maxSize) || config.cache.maxSize < 1 ||
      !Number.isFinite(config.cache.ttl) || config.cache.ttl < 0) {
    throw new ValidationError('cache requires enabled, a positive integer maxSize, and a non-negative ttl');
  }
  if (typeof config.security.validateInputs !== 'boolean' || typeof config.encryption.enabled !== 'boolean' ||
      !Number.isInteger(config.security.maxKeyLength) || config.security.maxKeyLength < 1 ||
      !Number.isInteger(config.security.maxValueLength) || config.security.maxValueLength < 1) {
    throw new ValidationError('security and encryption options contain invalid values');
  }
  return config;
}

function freezeConfig(config) {
  return Object.freeze({
    ...config,
    encryption: Object.freeze({ ...config.encryption }),
    cache: Object.freeze({ ...config.cache }),
    security: Object.freeze({ ...config.security })
  });
}

class I18nEnhancedRuntime {
  constructor(options = {}) {
    this.config = validateConfig(mergeConfig(DEFAULT_CONFIG, options));
    if (options.localeDir && !Object.prototype.hasOwnProperty.call(options, 'baseDir')) this.config.baseDir = undefined;
    this.config = freezeConfig(this.config);
    this.listeners = new Map();
    this.namespaces = new Map();
    this.encryptionKey = null;
    this.resetMetrics();
    this._createRuntime();
  }

  _createRuntime(config = this.config) {
    const nextRuntime = baseRuntime.initRuntime({
      baseDir: config.baseDir,
      localeDir: config.localeDir,
      projectRoot: config.projectRoot,
      language: config.defaultLanguage,
      fallbackLanguage: config.fallbackLanguage,
      keySeparator: config.keySeparator,
      preload: config.preload,
      missingKeyPolicy: config.missingKeyPolicy
    });
    for (const [name, translations] of this.namespaces) this._addNamespaceToRuntime(name, translations, nextRuntime);
    const nextUnsubscribe = nextRuntime.subscribe(event => this._emit(event.type, event));
    const previousRuntime = this.runtime;
    const previousUnsubscribe = this.unsubscribe;
    this.runtime = nextRuntime;
    this.unsubscribe = nextUnsubscribe;
    previousUnsubscribe?.();
    previousRuntime?.dispose?.();
  }

  on(type, listener) {
    if (typeof listener !== 'function') throw new ValidationError('Event listener must be a function');
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
    return this;
  }

  off(type, listener) {
    this.listeners.get(type)?.delete(listener);
    return this;
  }

  _emit(type, event) {
    for (const listener of [...(this.listeners.get(type) || [])]) {
      try { listener(event); } catch (_) { /* telemetry is observational */ }
    }
  }

  validateTranslationKey(key) {
    if (typeof key !== 'string' || !key || key.length > this.config.security.maxKeyLength) {
      throw new ValidationError('Translation key must be a non-empty string within maxKeyLength', { keyType: typeof key });
    }
    return true;
  }

  async translate(key, params = {}, options = {}) {
    const started = Date.now();
    try {
      if (this.config.security.validateInputs) this.validateTranslationKey(key);
      const value = this.runtime.translate(key, params, {
        language: options.language,
        fallbackLanguage: options.fallbackLanguage,
        missingKeyPolicy: options.missingKeyPolicy
      });
      this.metrics.translationCount++;
      this.metrics.translationDurationMsTotal += Date.now() - started;
      return value;
    } catch (error) {
      this._emit('translationError', { type: 'translationError', key, error });
      throw error;
    }
  }

  async t(key, params = {}, options = {}) { return this.translate(key, params, options); }

  async translateBatch(keys, params = {}, options = {}) {
    if (!Array.isArray(keys)) throw new ValidationError('Batch keys must be an array');
    return Promise.all(keys.map((key, index) => this.translate(key, Array.isArray(params) ? params[index] || {} : params, options)));
  }

  async translateEncrypted(key, params, options) {
    const value = await this.translate(key, params, options);
    if (!this.config.encryption.enabled) return value;
    return this.encryptData(value);
  }

  async translateBatchEncrypted(keys, params, options) {
    return Promise.all(keys.map((key, index) => this.translateEncrypted(key, Array.isArray(params) ? params[index] || {} : params, options)));
  }

  async updateConfig(updates = {}) {
    const previous = this.config;
    const next = mergeConfig(previous, updates);
    if (updates.localeDir && !Object.prototype.hasOwnProperty.call(updates, 'baseDir')) next.baseDir = undefined;
    validateConfig(next);
    const runtimeChanged = ['baseDir', 'localeDir', 'projectRoot', 'defaultLanguage', 'fallbackLanguage', 'keySeparator', 'preload']
      .some(key => next[key] !== previous[key]);
    if (runtimeChanged) this._createRuntime(next);
    this.config = freezeConfig(next);
    if (next.encryption.enabled && !this.encryptionKey) this.encryptionKey = require('./crypto').generateEncryptionKey();
    return this;
  }

  getConfig() {
    return {
      ...this.config,
      encryption: { ...this.config.encryption },
      cache: { ...this.config.cache },
      security: { ...this.config.security }
    };
  }

  setLanguage(language) {
    if (typeof language !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,35}$/.test(language)) {
      throw new ValidationError('defaultLanguage must be a valid locale identifier');
    }
    this.runtime.setLanguage(language);
    this.config = freezeConfig({ ...this.config, defaultLanguage: this.runtime.getLanguage() });
  }

  getLanguage() { return this.runtime.getLanguage(); }
  getAvailableLanguages() { return this.runtime.getAvailableLanguages(); }
  refresh(language) { this.runtime.refresh(language); }
  clearCache(language) { this.runtime.clearCache(language); }
  has(key, options) { return this.runtime.has(key, options); }
  subscribe(listener) { return this.runtime.subscribe(listener); }
  getDiagnostics() { return this.runtime.getDiagnostics(); }

  addNamespace(name, translations) {
    if (!name || !translations || typeof translations !== 'object') throw new ValidationError('Namespace requires a name and translations');
    this.namespaces.set(name, translations);
    this._addNamespaceToRuntime(name, translations);
  }
  _addNamespaceToRuntime(name, translations, targetRuntime = this.runtime) {
    for (const [language, data] of Object.entries(translations)) targetRuntime.addResources(language, name === 'default' ? 'default' : name, data);
  }
  removeNamespace(name) {
    for (const language of this.runtime.getAvailableLanguages()) this.runtime.removeResources(language, name);
    this.namespaces.delete(name);
  }
  getNamespace(name) { return this.namespaces.get(name) || null; }
  listNamespaces() { return [...this.namespaces.keys()]; }
  addPlugin(plugin) { return this.runtime.addPlugin(plugin); }
  removePlugin(name) { this.runtime.removePlugin(name); }

  setEncryptionKey(key) { this.encryptionKey = key; }
  getEncryptionStatus() { return this.config.encryption.enabled && Boolean(this.encryptionKey); }
  generateEncryptionKey() { return require('./crypto').generateEncryptionKey(); }
  encryptData(data) { return require('./crypto').encryptData(data, this.encryptionKey); }
  decryptData(data) { return require('./crypto').decryptData(data, this.encryptionKey); }

  getMetrics() {
    return {
      ...this.metrics,
      averageTranslationDurationMs: this.metrics.translationCount
        ? this.metrics.translationDurationMsTotal / this.metrics.translationCount
        : 0
    };
  }
  resetMetrics() { this.metrics = { translationCount: 0, translationDurationMsTotal: 0 }; }
  getCacheInfo() { return this.runtime.getCacheInfo(); }
  createTypedTranslator() { return { t: this.translate.bind(this), translate: this.translate.bind(this) }; }
  getTranslationMetadata(key) { return { text: this.runtime.t(key), language: this.getLanguage(), key, params: {}, encrypted: this.getEncryptionStatus() }; }
  sanitizeTranslation(text) { return String(text ?? ''); }

  dispose() {
    this.unsubscribe?.();
    this.runtime?.dispose?.();
    this.listeners.clear();
    this.namespaces.clear();
    this.encryptionKey = null;
  }
  cleanup() { this.dispose(); }
}

async function initI18nRuntime(options = {}) {
  const runtime = new I18nEnhancedRuntime(options);
  if (options.encryption?.enabled) await runtime.updateConfig(options);
  return runtime;
}

let defaultRuntime;
function getDefaultRuntime() {
  if (!defaultRuntime) defaultRuntime = new I18nEnhancedRuntime();
  return defaultRuntime;
}
const translate = (key, params, options) => getDefaultRuntime().translate(key, params, options);
const translateBatch = (keys, params, options) => getDefaultRuntime().translateBatch(keys, params, options);
const translateEncrypted = (key, params, options) => getDefaultRuntime().translateEncrypted(key, params, options);
const translateBatchEncrypted = (keys, params, options) => getDefaultRuntime().translateBatchEncrypted(keys, params, options);

module.exports = {
  initI18nRuntime,
  initRuntime: initI18nRuntime,
  getDefaultRuntime,
  translate,
  t: translate,
  tTyped: translate,
  translateEncrypted,
  translateBatch,
  translateBatchEncrypted,
  I18nEnhancedRuntime,
  ValidationError,
  generateEncryptionKey: () => require('./crypto').generateEncryptionKey()
};
module.exports.default = module.exports;
