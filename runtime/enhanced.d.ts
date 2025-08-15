// runtime/enhanced.d.ts
// Enhanced runtime API with TypeScript support and AES-256-GCM encryption

export interface TranslationParams extends Record<string, unknown> {
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
}

export interface TranslationResult {
  text: string;
  language: string;
  key: string;
  params: TranslationParams;
  encrypted: boolean;
}

export interface I18nConfig {
  baseDir: string;
  defaultLanguage: string;
  fallbackLanguage: string;
  keySeparator: string;
  preload: boolean;
  encryption: {
    enabled: boolean;
    algorithm: string;
    keyLength: number;
    ivLength: number;
    authTagLength: number;
  };
  cache: {
    enabled: boolean;
    maxSize: number;
    ttl: number;
  };
  security: {
    validateInputs: boolean;
    sanitizeOutput: boolean;
    maxKeyLength: number;
    maxValueLength: number;
  };
}

export interface TranslationKey<T = string> {
  key: string;
  defaultValue?: T;
  description?: string;
  context?: string;
  plural?: boolean;
}

export interface PluralizationRule {
  rule: (count: number) => number;
  examples: string[];
}

export interface LanguageConfig {
  code: string;
  name: string;
  direction: 'ltr' | 'rtl';
  pluralRules: PluralizationRule;
  dateFormat: string;
  numberFormat: string;
}

// Enhanced TypeScript-compatible translation functions
export function translate<T = string>(key: string, params?: TranslationParams, options?: TranslationOptions): T;
export function translate<T = string>(key: TranslationKey<T>, params?: TranslationParams, options?: TranslationOptions): T;

export const t: typeof translate;

// Type-safe translation with strict typing
export function tTyped<T = string>(key: string, params?: TranslationParams, options?: TranslationOptions): T;

// Translation with encryption support
export function translateEncrypted<T = string>(key: string, params?: TranslationParams, options?: TranslationOptions): Promise<T>;

// Batch translation operations
export function translateBatch<T = string>(keys: string[], params?: TranslationParams[], options?: TranslationOptions): T[];
export function translateBatchEncrypted<T = string>(keys: string[], params?: TranslationParams[], options?: TranslationOptions): Promise<T[]>;

// Configuration and initialization
export function initI18nRuntime(options?: Partial<I18nConfig>): Promise<I18nRuntimeInstance>;

export interface I18nRuntimeInstance {
  t: typeof translate;
  translate: typeof translate;
  translateEncrypted: typeof translateEncrypted;
  translateBatch: typeof translateBatch;
  translateBatchEncrypted: typeof translateBatchEncrypted;
  
  // Language management
  setLanguage: (lang: string) => Promise<void>;
  getLanguage: () => string;
  getAvailableLanguages: () => string[];
  refresh: (lang?: string) => Promise<void>;
  
  // Configuration
  getConfig: () => I18nConfig;
  updateConfig: (updates: Partial<I18nConfig>) => Promise<void>;
  
  // Security and encryption
  setEncryptionKey: (key: string) => void;
  getEncryptionStatus: () => boolean;
  encryptData: (data: string) => Promise<string>;
  decryptData: (encryptedData: string) => Promise<string>;
  
  // Validation and utilities
  validateTranslationKey: (key: string) => boolean;
  sanitizeTranslation: (text: string) => string;
  getTranslationMetadata: (key: string) => TranslationResult;
  
  // Type utilities
  createTypedTranslator<T>(): TypedTranslator<T>;
}

export interface TypedTranslator<T> {
  t: (key: string, params?: TranslationParams, options?: TranslationOptions) => T;
  translate: (key: string, params?: TranslationParams, options?: TranslationOptions) => T;
}

// Utility types for better TypeScript support
export type TranslationNamespace = string;
export type TranslationKeyPath = string;
export type TranslationValue = string | number | boolean | null;

export interface TranslationSchema {
  [key: string]: TranslationValue | TranslationSchema;
}

// Error handling types
export interface TranslationError extends Error {
  code: string;
  key: string;
  language: string;
  params?: TranslationParams;
}

export interface ValidationError extends TranslationError {
  validationErrors: string[];
}

// Plugin system for extensibility
export interface TranslationPlugin {
  name: string;
  version: string;
  transform?: (text: string, params: TranslationParams, options: TranslationOptions) => string;
  validate?: (key: string, params: TranslationParams) => boolean;
  encrypt?: (data: string, key: string) => Promise<string>;
  decrypt?: (encryptedData: string, key: string) => Promise<string>;
}

// Event system for monitoring
export interface TranslationEvent {
  type: 'translation' | 'error' | 'validation' | 'encryption';
  key: string;
  language: string;
  params?: TranslationParams;
  result?: string;
  error?: TranslationError;
  timestamp: Date;
  duration: number;
}

export type TranslationEventHandler = (event: TranslationEvent) => void;

// Performance monitoring
export interface PerformanceMetrics {
  totalTranslations: number;
  cacheHitRate: number;
  averageTranslationTime: number;
  encryptionTime: number;
  memoryUsage: number;
}

// Advanced configuration builders
export class I18nConfigBuilder {
  static create(): I18nConfigBuilder;
  withBaseDir(dir: string): I18nConfigBuilder;
  withDefaultLanguage(lang: string): I18nConfigBuilder;
  withEncryption(key: string): I18nConfigBuilder;
  withCache(enabled: boolean, maxSize?: number, ttl?: number): I18nConfigBuilder;
  withSecurity(options: Partial<I18nConfig['security']>): I18nConfigBuilder;
  build(): I18nConfig;
}

// Namespace management
export interface NamespaceManager {
  addNamespace(name: string, translations: TranslationSchema): Promise<void>;
  removeNamespace(name: string): Promise<void>;
  getNamespace(name: string): TranslationSchema | null;
  listNamespaces(): string[];
}

// Migration utilities
export interface MigrationOptions {
  fromVersion: string;
  toVersion: string;
  backup: boolean;
  dryRun: boolean;
}

export function migrateTranslations(options: MigrationOptions): Promise<MigrationResult>;

export interface MigrationResult {
  success: boolean;
  migratedKeys: number;
  errors: string[];
  warnings: string[];
  backupPath?: string;
}

// Export compatibility with existing runtime
export * from './index.d.ts';