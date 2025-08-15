// runtime/index.full.d.ts
// Complete TypeScript definitions for i18ntk runtime with encryption support

export interface InitOptions {
  baseDir?: string;
  language?: string;
  fallbackLanguage?: string;
  keySeparator?: string;
  preload?: boolean;
  encryption?: {
    enabled?: boolean;
    key?: string;
    algorithm?: string;
  };
  cache?: {
    enabled?: boolean;
    maxSize?: number;
    ttl?: number;
  };
  security?: {
    validateInputs?: boolean;
    sanitizeOutput?: boolean;
    maxKeyLength?: number;
    maxValueLength?: number;
  };
}

export interface TranslateParams extends Record<string, unknown> {
  count?: number;
  context?: string;
  [key: string]: unknown;
}

export interface TranslationOptions {
  language?: string;
  fallbackLanguage?: string;
  namespace?: string;
  encryptionKey?: string;
  enableEncryption?: boolean;
  context?: string;
  plural?: boolean;
}

export interface TranslationResult<T = string> {
  text: T;
  language: string;
  key: string;
  params: TranslateParams;
  encrypted: boolean;
  metadata?: {
    duration: number;
    cacheHit: boolean;
    namespace?: string;
  };
}

export interface I18nRuntime {
  // Core translation functions
  translate: typeof translate;
  t: typeof t;
  
  // Language management
  setLanguage: (lang: string) => Promise<void>;
  getLanguage: () => string;
  getAvailableLanguages: () => string[];
  refresh: (lang?: string) => Promise<void>;
  
  // Configuration
  getConfig: () => Required<InitOptions>;
  updateConfig: (updates: Partial<InitOptions>) => Promise<void>;
  
  // Encryption utilities
  setEncryptionKey: (key: string) => void;
  getEncryptionStatus: () => boolean;
  encryptData: (data: string) => Promise<string>;
  decryptData: (encryptedData: string) => Promise<string>;
  generateEncryptionKey: () => string;
  
  // Validation and utilities
  validateTranslationKey: (key: string) => boolean;
  sanitizeTranslation: (text: string) => string;
  getTranslationMetadata: <T = string>(key: string, params?: TranslateParams, options?: TranslationOptions) => TranslationResult<T>;
  
  // Batch operations
  translateBatch: <T = string>(keys: string[], params?: TranslateParams[], options?: TranslationOptions) => Promise<T[]>;
  translateBatchEncrypted: <T = string>(keys: string[], params?: TranslateParams[], options?: TranslationOptions) => Promise<T[]>;
  
  // Namespace management
  addNamespace: (name: string, translations: Record<string, Record<string, string>>) => Promise<void>;
  removeNamespace: (name: string) => Promise<void>;
  getNamespace: (name: string) => Record<string, Record<string, string>> | null;
  listNamespaces: () => string[];
  
  // Plugin system
  addPlugin: (plugin: TranslationPlugin) => void;
  removePlugin: (name: string) => void;
  listPlugins: () => TranslationPlugin[];
  
  // Performance monitoring
  getMetrics: () => PerformanceMetrics;
  resetMetrics: () => void;
  
  // Event handling
  on: (event: TranslationEventType, handler: TranslationEventHandler) => void;
  off: (event: TranslationEventType, handler: TranslationEventHandler) => void;
  emit: (event: TranslationEventType, data: any) => void;
}

// Core translation functions with full TypeScript support
export function translate<T = string>(
  key: string,
  params?: TranslateParams,
  options?: TranslationOptions
): T;

export function translate<T = string>(
  key: string,
  params?: TranslateParams,
  options?: TranslationOptions
): Promise<T>;

// Alias for translate - both i18ntk.translate and i18ntk.t are supported
export const t: typeof translate;

// Enhanced translation with encryption support
export function translateEncrypted<T = string>(
  key: string,
  params?: TranslateParams,
  options?: TranslationOptions
): Promise<T>;

// Type-safe translation with strict typing
export function translateTyped<T = string>(
  key: string,
  params?: TranslateParams,
  options?: TranslationOptions
): T;

// Batch translation operations
export function translateBatch<T = string>(
  keys: string[],
  params?: TranslateParams[],
  options?: TranslationOptions
): Promise<T[]>;

export function translateBatchEncrypted<T = string>(
  keys: string[],
  params?: TranslateParams[],
  options?: TranslationOptions
): Promise<T[]>;

// Initialization function
export function initRuntime(options?: InitOptions): Promise<I18nRuntime>;

// Legacy initialization for backward compatibility
export function initI18nRuntime(options?: InitOptions): Promise<I18nRuntime>;

// Plugin system interfaces
export interface TranslationPlugin {
  name: string;
  version: string;
  transform?: (
    text: string,
    params: TranslateParams,
    options: TranslationOptions
  ) => string;
  validate?: (key: string, params: TranslateParams) => boolean;
  encrypt?: (data: string, key: string) => Promise<string>;
  decrypt?: (encryptedData: string, key: string) => Promise<string>;
}

// Event system
export type TranslationEventType = 
  | 'translation'
  | 'error'
  | 'validation'
  | 'encryption'
  | 'cache'
  | 'config';

export interface TranslationEvent {
  type: TranslationEventType;
  key?: string;
  language?: string;
  params?: TranslateParams;
  result?: string;
  error?: Error;
  timestamp: Date;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export type TranslationEventHandler = (event: TranslationEvent) => void;

// Performance monitoring
export interface PerformanceMetrics {
  totalTranslations: number;
  cacheHitRate: number;
  averageTranslationTime: number;
  encryptionTime: number;
  memoryUsage: number;
  namespaceCount: number;
  pluginCount: number;
}

// Error handling
export interface TranslationError extends Error {
  code: string;
  key?: string;
  language?: string;
  params?: TranslateParams;
  context?: string;
}

// Validation utilities
export interface ValidationOptions {
  validateKey?: boolean;
  validateParams?: boolean;
  sanitizeOutput?: boolean;
  maxKeyLength?: number;
  maxValueLength?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Namespace management
export interface NamespaceConfig {
  name: string;
  path?: string;
  priority?: number;
  fallback?: boolean;
}

// Configuration builder for fluent API
export class RuntimeConfigBuilder {
  private config: InitOptions = {};
  
  withBaseDir(dir: string): RuntimeConfigBuilder;
  withLanguage(lang: string): RuntimeConfigBuilder;
  withFallbackLanguage(lang: string): RuntimeConfigBuilder;
  withEncryption(key: string): RuntimeConfigBuilder;
  withCache(enabled: boolean, maxSize?: number, ttl?: number): RuntimeConfigBuilder;
  withSecurity(options: Partial<InitOptions['security']>): RuntimeConfigBuilder;
  withPlugin(plugin: TranslationPlugin): RuntimeConfigBuilder;
  withNamespace(name: string, translations: Record<string, Record<string, string>>): RuntimeConfigBuilder;
  build(): InitOptions;
}

// Type utilities for better TypeScript support
export type TranslationKey<T = string> = string;
export type TranslationNamespace = string;
export type TranslationContext = string;

export interface TranslationSchema<T = string> {
  [key: string]: T | TranslationSchema<T>;
}

export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  pluralRule: (count: number) => number;
  dateFormat: string;
  numberFormat: string;
  fallback?: string;
}

// Utility types for framework integration
export type I18nFunction<T = string> = (
  key: string,
  params?: TranslateParams,
  options?: TranslationOptions
) => T;

export interface I18nContext {
  t: I18nFunction<string>;
  translate: I18nFunction<string>;
  language: string;
  setLanguage: (lang: string) => Promise<void>;
}

// Error codes for better error handling
export const TranslationErrorCodes = {
  KEY_NOT_FOUND: 'I18N_KEY_NOT_FOUND',
  INVALID_KEY: 'I18N_INVALID_KEY',
  INVALID_PARAMS: 'I18N_INVALID_PARAMS',
  ENCRYPTION_ERROR: 'I18N_ENCRYPTION_ERROR',
  DECRYPTION_ERROR: 'I18N_DECRYPTION_ERROR',
  LANGUAGE_NOT_SUPPORTED: 'I18N_LANGUAGE_NOT_SUPPORTED',
  NAMESPACE_NOT_FOUND: 'I18N_NAMESPACE_NOT_FOUND',
  PLUGIN_ERROR: 'I18N_PLUGIN_ERROR',
} as const;

export type TranslationErrorCode = typeof TranslationErrorCodes[keyof typeof TranslationErrorCodes];

// Constants
export const SUPPORTED_LANGUAGES = [
  'en', 'es', 'fr', 'de', 'ja', 'ru', 'zh', 'pt', 'it', 'ko'
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

// Encryption constants
export const ENCRYPTION_ALGORITHMS = {
  AES_256_GCM: 'aes-256-gcm',
  AES_192_GCM: 'aes-192-gcm',
  AES_128_GCM: 'aes-128-gcm',
} as const;

export type EncryptionAlgorithm = typeof ENCRYPTION_ALGORITHMS[keyof typeof ENCRYPTION_ALGORITHMS];

// Re-export existing types for backward compatibility
export * from './index.d.ts';

// Default export for ES modules
export default {
  translate,
  t,
  initRuntime,
  initI18nRuntime,
  translateEncrypted,
  translateBatch,
  translateBatchEncrypted,
  TranslationErrorCodes,
  SUPPORTED_LANGUAGES,
  ENCRYPTION_ALGORITHMS,
};