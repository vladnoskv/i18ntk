/** @deprecated Use i18ntk/runtime, /runtime/node, /runtime/static, or /runtime/fetch. */
import type { InitOptions, RuntimeEvent, RuntimeInstance, TranslateParams, TranslationOptions } from './index';

export interface EnhancedOptions extends InitOptions {
  defaultLanguage?: string;
  encryption?: { enabled?: boolean };
  cache?: { enabled?: boolean; maxSize?: number; ttl?: number };
  security?: { validateInputs?: boolean; sanitizeOutput?: boolean; maxKeyLength?: number; maxValueLength?: number };
}
export class ValidationError extends Error { code: 'I18NTK_RUNTIME_VALIDATION'; details: Record<string, unknown>; }
export class I18nEnhancedRuntime {
  constructor(options?: EnhancedOptions);
  translate(key: string, params?: TranslateParams, options?: TranslationOptions): Promise<string>;
  t(key: string, params?: TranslateParams, options?: TranslationOptions): Promise<string>;
  translateBatch(keys: string[], params?: TranslateParams | TranslateParams[], options?: TranslationOptions): Promise<string[]>;
  translateEncrypted(key: string, params?: TranslateParams, options?: TranslationOptions): Promise<string | EncryptedPayload>;
  translateBatchEncrypted(keys: string[], params?: TranslateParams | TranslateParams[], options?: TranslationOptions): Promise<Array<string | EncryptedPayload>>;
  updateConfig(options: Partial<EnhancedOptions>): Promise<this>;
  getConfig(): EnhancedOptions;
  setLanguage(locale: string): void;
  getLanguage(): string;
  getAvailableLanguages(): string[];
  refresh(locale?: string): void;
  clearCache(locale?: string): void;
  has(key: string, options?: TranslationOptions): boolean;
  subscribe(listener: (event: RuntimeEvent) => void): () => void;
  on(type: string, listener: (event: RuntimeEvent) => void): this;
  off(type: string, listener: (event: RuntimeEvent) => void): this;
  addNamespace(name: string, translations: Record<string, Record<string, unknown>>): void;
  removeNamespace(name: string): void;
  getNamespace(name: string): Record<string, Record<string, unknown>> | null;
  listNamespaces(): string[];
  addPlugin(plugin: { name: string; transform?(value: string): string }): () => void;
  removePlugin(name: string): void;
  getDiagnostics(): Array<Record<string, unknown>>;
  getMetrics(): Record<string, number>;
  resetMetrics(): void;
  getCacheInfo(): import('./index').RuntimeCacheInfo;
  setEncryptionKey(key: string): void;
  getEncryptionStatus(): boolean;
  encryptData(value: string): Promise<EncryptedPayload>;
  decryptData(payload: EncryptedPayload): Promise<string>;
  createTypedTranslator(): { t: I18nEnhancedRuntime['translate']; translate: I18nEnhancedRuntime['translate'] };
  getTranslationMetadata(key: string): { text: string; language: string; key: string; params: Record<string, unknown>; encrypted: boolean };
  sanitizeTranslation(text: unknown): string;
  dispose(): void;
  cleanup(): void;
}
export interface EncryptedPayload { encrypted: string; iv: string; authTag: string; }
export function initI18nRuntime(options?: EnhancedOptions): Promise<I18nEnhancedRuntime>;
export const initRuntime: typeof initI18nRuntime;
export function getDefaultRuntime(): I18nEnhancedRuntime;
export function translate(key: string, params?: TranslateParams, options?: TranslationOptions): Promise<string>;
export const t: typeof translate;
export const tTyped: typeof translate;
export function translateBatch(keys: string[], params?: TranslateParams | TranslateParams[], options?: TranslationOptions): Promise<string[]>;
export function translateEncrypted(key: string, params?: TranslateParams, options?: TranslationOptions): Promise<string | EncryptedPayload>;
export function translateBatchEncrypted(keys: string[], params?: TranslateParams | TranslateParams[], options?: TranslationOptions): Promise<Array<string | EncryptedPayload>>;
export function generateEncryptionKey(): string;
