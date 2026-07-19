export type TranslateParams = Record<string, unknown>;
/** @deprecated Runtime translation methods return strings. Kept for source compatibility with 5.0.x. */
export type TranslationValue = string | number | boolean | null | Record<string, unknown> | unknown[];
export type TranslateBatchParams = TranslateParams | TranslateParams[];
export type MissingKeyPolicy = 'key' | 'empty' | 'throw' | ((event: RuntimeEvent) => string);

export interface TranslationOptions {
  language?: string;
  locale?: string;
  fallbackLanguage?: string;
  fallbackLocale?: string;
  namespace?: string;
  missingKeyPolicy?: MissingKeyPolicy;
}

export interface InitOptions {
  /** Node locale root. Prefer projectRoot + localeDir when the root is relative. */
  baseDir?: string;
  localeDir?: string;
  projectRoot?: string;
  language?: string;
  targetLocale?: string;
  fallbackLanguage?: string;
  sourceLocale?: string;
  keySeparator?: string;
  preload?: boolean;
  lazy?: boolean;
  missingKeyPolicy?: MissingKeyPolicy;
  loadErrorPolicy?: 'report-and-fallback' | 'throw';
  cache?: { enabled?: boolean; maxSize?: number; ttl?: number };
  /** Deterministic clock hook for tests and embedded runtimes. */
  now?: () => number;
}

export interface RuntimeEvent { type: string; [key: string]: unknown; }
export interface RuntimeDiagnostic { category?: string; type?: string; [key: string]: unknown; }
export interface RuntimeCacheInfo {
  language: string;
  fallbackLanguage: string;
  lazy: boolean;
  enabled: boolean;
  maxSize: number;
  ttl: number;
  cachedLanguages: string[];
  manifestLanguages: string[];
  loadedFileCount: number;
  eagerLoadedLanguages: string[];
}
export interface TranslationPlugin {
  name: string;
  transform?(value: string, params: TranslateParams, options: TranslationOptions): string;
}

export interface RuntimeInstance {
  t(key: string, params?: TranslateParams, options?: TranslationOptions): string;
  translate(key: string, params?: TranslateParams, options?: TranslationOptions): string;
  translateBatch(keys: string[], params?: TranslateBatchParams, options?: TranslationOptions): string[];
  has(key: string, options?: TranslationOptions): boolean;
  setLanguage(locale: string): void;
  getLanguage(): string;
  getAvailableLanguages(): string[];
  addResources(locale: string, namespace: string, data: Record<string, unknown>): void;
  removeResources(locale: string, namespace?: string): void;
  subscribe(listener: (event: RuntimeEvent) => void): () => void;
  addPlugin(plugin: TranslationPlugin): () => void;
  removePlugin(name: string): void;
  getDiagnostics(): RuntimeDiagnostic[];
  clearCache(locale?: string): void;
  getCacheInfo(): RuntimeCacheInfo;
  refresh(locale?: string): void;
  dispose(): void;
}

export class RuntimeValidationError extends Error { code: 'I18NTK_RUNTIME_VALIDATION'; details: Record<string, unknown>; }
export function initRuntime(options?: InitOptions): RuntimeInstance;
export function initDefaultRuntime(options?: InitOptions): RuntimeInstance;
export function createRuntime(options?: import('./core').RuntimeOptions): import('./core').UniversalRuntime;
export const createUniversalRuntime: typeof createRuntime;
export function translate(key: string, params?: TranslateParams, options?: TranslationOptions): string;
export const t: typeof translate;
export function translateBatch(keys: string[], params?: TranslateBatchParams, options?: TranslationOptions): string[];
export function setLanguage(locale: string): void;
export function getLanguage(): string;
export function getAvailableLanguages(): string[];
export function clearCache(locale?: string): void;
export function getCacheInfo(): RuntimeCacheInfo;
export function refresh(locale?: string): void;
export function loadKeyManifest(baseDir?: string): Map<string, string>;
