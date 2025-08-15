// runtime/i18ntk.d.ts
// Complete TypeScript definitions for i18ntk internationalization framework
// Version 1.9.1 - Full TypeScript support with AES-256-GCM encryption

/**
 * Core translation parameters interface
 */
export interface TranslationParams {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Advanced translation options
 */
export interface TranslationOptions {
  /**
   * Target language for translation
   * @default current language
   */
  language?: string;
  
  /**
   * Fallback language if translation not found
   * @default fallback language from config
   */
  fallbackLanguage?: string;
  
  /**
   * Enable/disable interpolation
   * @default true
   */
  interpolate?: boolean;
  
  /**
   * Enable/disable pluralization
   * @default true
   */
  pluralize?: boolean;
  
  /**
   * Custom formatter functions
   */
  formatters?: Record<string, (value: any) => string>;
  
  /**
   * Namespace to use for translation
   */
  namespace?: string;
  
  /**
   * Enable encryption for sensitive data
   * @default false
   */
  encrypt?: boolean;
  
  /**
   * Cache the result
   * @default true
   */
  cache?: boolean;
  
  /**
   * Custom context for translation
   */
  context?: string;
}

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  /**
   * Enable AES-256-GCM encryption
   * @default false
   */
  enabled: boolean;
  
  /**
   * Encryption key (32 bytes hex encoded)
   * Will be auto-generated if not provided
   */
  key?: string;
  
  /**
   * Additional authenticated data
   */
  aad?: string;
  
  /**
   * Key rotation interval in milliseconds
   * @default 86400000 (24 hours)
   */
  keyRotationInterval?: number;
}

/**
 * Performance configuration
 */
export interface PerformanceConfig {
  /**
   * Performance mode
   * @default 'optimized'
   */
  mode: 'extreme' | 'ultra' | 'optimized' | 'standard';
  
  /**
   * Enable caching
   * @default true
   */
  cacheEnabled: boolean;
  
  /**
   * Cache size limit
   * @default 1000
   */
  cacheSize: number;
  
  /**
   * Cache TTL in milliseconds
   * @default 300000 (5 minutes)
   */
  cacheTTL: number;
  
  /**
   * Batch size for bulk operations
   * @default 100
   */
  batchSize: number;
  
  /**
   * Enable lazy loading
   * @default true
   */
  lazyLoading: boolean;
}

/**
 * Security configuration
 */
export interface SecurityConfig {
  /**
   * Enable input validation
   * @default true
   */
  validateInput: boolean;
  
  /**
   * Sanitize output
   * @default true
   */
  sanitizeOutput: boolean;
  
  /**
   * Maximum key length
   * @default 255
   */
  maxKeyLength: number;
  
  /**
   * Maximum value length
   * @default 1000
   */
  maxValueLength: number;
  
  /**
   * Allowed characters in keys
   */
  allowedKeyPattern?: RegExp;
}

/**
 * Main configuration interface
 */
export interface I18nConfig {
  /**
   * Base directory for locale files
   */
  baseDir: string;
  
  /**
   * Default language
   * @default 'en'
   */
  language?: string;
  
  /**
   * Fallback language
   * @default 'en'
   */
  fallbackLanguage?: string;
  
  /**
   * Supported languages
   */
  supportedLanguages?: string[];
  
  /**
   * Encryption configuration
   */
  encryption?: EncryptionConfig;
  
  /**
   * Performance configuration
   */
  performance?: PerformanceConfig;
  
  /**
   * Security configuration
   */
  security?: SecurityConfig;
  
  /**
   * Enable debug mode
   * @default false
   */
  debug?: boolean;
  
  /**
   * Custom formatters
   */
  formatters?: Record<string, (value: any) => string>;
  
  /**
   * Plugin configuration
   */
  plugins?: PluginConfig[];
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  name: string;
  version: string;
  transform?: (text: string, params: TranslationParams, options: TranslationOptions) => string;
  init?: (runtime: I18nRuntime) => Promise<void>;
  destroy?: () => Promise<void>;
}

/**
 * Translation result interface
 */
export interface TranslationResult {
  text: string;
  language: string;
  key: string;
  params: TranslationParams;
  encrypted?: boolean;
  cacheHit?: boolean;
  duration: number;
}

/**
 * Batch translation result
 */
export interface BatchTranslationResult {
  results: string[];
  metadata: {
    total: number;
    duration: number;
    cacheHitRate: number;
    encryptedCount: number;
  };
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  totalTranslations: number;
  cacheHitRate: number;
  averageTranslationTime: number;
  memoryUsage: number;
  peakMemoryUsage: number;
  encryptionTime: number;
  decryptionTime: number;
}

/**
 * Namespace interface
 */
export interface Namespace {
  name: string;
  translations: Record<string, Record<string, any>>;
  metadata: {
    created: Date;
    modified: Date;
    version: string;
  };
}

/**
 * Main runtime interface
 */
export interface I18nRuntime {
  /**
   * Translate a key with parameters
   * @param key Translation key
   * @param params Translation parameters
   * @param options Translation options
   */
  translate(key: string, params?: TranslationParams, options?: TranslationOptions): Promise<string>;
  
  /**
   * Alias for translate function
   */
  t(key: string, params?: TranslationParams, options?: TranslationOptions): Promise<string>;
  
  /**
   * Translate with encryption
   */
  translateEncrypted(key: string, params?: TranslationParams, options?: TranslationOptions): Promise<string>;
  
  /**
   * Batch translate multiple keys
   */
  translateBatch(keys: string[], params?: TranslationParams[], options?: TranslationOptions): Promise<BatchTranslationResult>;
  
  /**
   * Batch translate with encryption
   */
  translateBatchEncrypted(keys: string[], params?: TranslationParams[], options?: TranslationOptions): Promise<BatchTranslationResult>;
  
  /**
   * Get current language
   */
  getLanguage(): string;
  
  /**
   * Set current language
   */
  setLanguage(language: string): Promise<void>;
  
  /**
   * Get available languages
   */
  getAvailableLanguages(): Promise<string[]>;
  
  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[];
  
  /**
   * Add a namespace
   */
  addNamespace(name: string, translations: Record<string, Record<string, any>>): Promise<void>;
  
  /**
   * Remove a namespace
   */
  removeNamespace(name: string): Promise<void>;
  
  /**
   * Get namespace
   */
  getNamespace(name: string): Namespace | null;
  
  /**
   * List all namespaces
   */
  listNamespaces(): string[];
  
  /**
   * Refresh translations
   */
  refresh(): Promise<void>;
  
  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics;

  /**
   * Reset metrics
   */
  resetMetrics(): void;

  /**
   * Get cache information
   */
  getCacheInfo?(): CacheInfo;

  /**
   * Clear the translation cache
   */
  clearCache?(): void;
  
  /**
   * Add plugin
   */
  addPlugin(plugin: PluginConfig): void;
  
  /**
   * Remove plugin
   */
  removePlugin(name: string): void;
  
  /**
   * List plugins
   */
  listPlugins(): PluginConfig[];
  
  /**
   * Generate encryption key
   */
  generateEncryptionKey(): string;
  
  /**
   * Set encryption key
   */
  setEncryptionKey(key: string): void;
  
  /**
   * Encrypt data
   */
  encryptData(data: string): Promise<string>;
  
  /**
   * Decrypt data
   */
  decryptData(encryptedData: string): Promise<string>;
  
  /**
   * Validate translation key
   */
  validateTranslationKey(key: string): boolean;
  
  /**
   * Sanitize translation output
   */
  sanitizeTranslation(text: string): string;
  
  /**
   * Get configuration
   */
  getConfig(): I18nConfig;
  
  /**
   * Update configuration
   */
  updateConfig(updates: Partial<I18nConfig>): Promise<void>;
}

/**
 * Basic runtime interface (for backward compatibility)
 */
export interface BasicI18nRuntime {
  /**
   * Translate a key with parameters
   */
  translate(key: string, params?: TranslationParams): string;
  
  /**
   * Alias for translate function
   */
  t(key: string, params?: TranslationParams): string;
  
  /**
   * Set language
   */
  setLanguage(language: string): void;
  
  /**
   * Get current language
   */
  getLanguage(): string;
  
  /**
   * Get available languages
   */
  getAvailableLanguages(): string[];
  
  /**
   * Refresh translations
   */
  refresh(): void;
}

/**
 * Main initialization function
 */
export declare function initI18nRuntime(config: I18nConfig): Promise<I18nRuntime>;

/**
 * Basic initialization function (backward compatibility)
 */
export declare function initRuntime(config: {
  baseDir: string;
  language?: string;
}): BasicI18nRuntime;

/**
 * Type guards
 */
export declare function isI18nRuntime(obj: any): obj is I18nRuntime;
export declare function isBasicI18nRuntime(obj: any): obj is BasicI18nRuntime;

/**
 * Utility functions
 */
export declare function validateConfig(config: any): boolean;
export declare function sanitizeKey(key: string): string;
export declare function formatNumber(value: number, locale?: string): string;
export declare function formatDate(date: Date, locale?: string): string;
export declare function formatCurrency(value: number, currency?: string, locale?: string): string;

/**
 * Error types
 */
export declare class I18nError extends Error {
  constructor(message: string, code?: string);
  code: string;
  timestamp: Date;
}

export declare class EncryptionError extends I18nError {
  constructor(message: string, originalError?: Error);
}

export declare class ValidationError extends I18nError {
  constructor(message: string, field?: string);
}

/**
 * Plugin types
 */
export declare type TransformFunction = (text: string, params: TranslationParams, options: TranslationOptions) => string;
export declare type InitFunction = (runtime: I18nRuntime) => Promise<void>;
export declare type DestroyFunction = () => Promise<void>;

/**
 * Global type augmentation for Node.js
 */
declare global {
  namespace NodeJS {
    interface Global {
      i18ntk?: I18nRuntime;
    }
  }
}

/**
 * Export all interfaces and types
 */
export * from './enhanced';