// runtime/index.d.ts
// Public runtime API types for i18ntk

export interface InitOptions {
  /** Locale base directory. Defaults to config/env resolution when omitted. */
  baseDir?: string;
  language?: string;
  fallbackLanguage?: string;
  keySeparator?: string;
  /** Eagerly cache the active and fallback languages during initialization. */
  preload?: boolean;
  /** Build a key manifest and load matching JSON files on first key access. */
  lazy?: boolean;
}

export type TranslateParams = Record<string, unknown>;
export interface TranslationOptions {
  /** Translate this call with a different language without mutating runtime state. */
  language?: string;
  /** Fallback language for this call. */
  fallbackLanguage?: string;
}
export type TranslationValue = string | number | boolean | null | object | unknown[];
export type TranslateBatchParams = TranslateParams | TranslateParams[];

export interface RuntimeCacheInfo {
  language: string;
  fallbackLanguage: string;
  lazy: boolean;
  cachedLanguages: string[];
  manifestLanguages: string[];
  loadedFileCount: number;
  eagerLoadedLanguages: string[];
}

export interface RuntimeInstance {
  t(key: string, params?: TranslateParams, options?: TranslationOptions): TranslationValue;
  translate(key: string, params?: TranslateParams, options?: TranslationOptions): TranslationValue;
  translateBatch(keys: string[], params?: TranslateBatchParams, options?: TranslationOptions): TranslationValue[];
  setLanguage(lang: string): void;
  getLanguage(): string;
  getAvailableLanguages(): string[];
  clearCache(lang?: string): void;
  getCacheInfo(): RuntimeCacheInfo;
  refresh(lang?: string): void;
}

export function translate(key: string, params?: TranslateParams, options?: TranslationOptions): TranslationValue;
export const t: typeof translate;
export function translateBatch(keys: string[], params?: TranslateBatchParams, options?: TranslationOptions): TranslationValue[];

export function initRuntime(options?: InitOptions): RuntimeInstance;

export function setLanguage(lang: string): void;
export function getLanguage(): string;
export function getAvailableLanguages(): string[];
export function clearCache(lang?: string): void;
export function getCacheInfo(): RuntimeCacheInfo;
export function refresh(lang?: string): void;
export function loadKeyManifest(baseDir?: string): Map<string, string>;
