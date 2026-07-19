export type Params = Record<string, unknown>;
/** @deprecated Runtime translation methods return strings. Kept for source compatibility with 5.0.x. */
export type TranslationValue = string | number | boolean | null | Record<string, unknown> | unknown[];
export type MissingKeyPolicy = 'key' | 'empty' | 'throw' | ((event: RuntimeEvent) => string);
export interface RuntimeEvent { type: string; [key: string]: unknown; }
export interface RuntimeOptions {
  locale?: string;
  language?: string;
  defaultLanguage?: string;
  fallbackLocale?: string;
  fallbackLanguage?: string;
  keySeparator?: string;
  missingKeyPolicy?: MissingKeyPolicy;
  loadErrorPolicy?: 'throw' | 'report-and-fallback';
  maxKeyLength?: number;
  resources?: Record<string, Record<string, Record<string, unknown>>>;
  resourcesAreNamespaced?: boolean;
  loader?: RuntimeLoader;
  preload?: boolean;
  namespaces?: string | string[];
}
export interface RuntimeLoader {
  listLocales?(): Promise<string[]>;
  load(locale: string, namespaces?: string[]): Promise<Record<string, Record<string, unknown>>>;
}
export interface TranslateOptions {
  locale?: string;
  language?: string;
  fallbackLocale?: string;
  fallbackLanguage?: string;
  namespace?: string;
  missingKeyPolicy?: MissingKeyPolicy;
}
export interface UniversalRuntime {
  t(key: string, params?: Params, options?: TranslateOptions): string;
  translate(key: string, params?: Params, options?: TranslateOptions): string;
  has(key: string, options?: TranslateOptions): boolean;
  translateBatch(keys: string[], params?: Params | Params[], options?: TranslateOptions): string[];
  setLocale(locale: string): void;
  setLanguage(locale: string): void;
  getLocale(): string;
  getLanguage(): string;
  listLocales(): string[];
  getAvailableLanguages(): string[];
  addResources(locale: string, namespace: string, data: Record<string, unknown>, options?: { precedence?: 'override' | 'fallback' }): UniversalRuntime;
  removeResources(locale: string, namespace?: string): void;
  load(locale?: string, namespaces?: string | string[]): Promise<UniversalRuntime>;
  refresh(locale?: string, namespaces?: string | string[]): Promise<UniversalRuntime>;
  refreshLocales(): Promise<string[]>;
  subscribe(listener: (event: RuntimeEvent) => void): () => void;
  addPlugin(plugin: { name: string; transform?(value: string, params: Params, options: TranslateOptions): string }): () => void;
  removePlugin(name: string): void;
  getDiagnostics(): Array<Record<string, unknown>>;
  getMetrics(): Record<string, number>;
  formatNumber(value: number, options?: Intl.NumberFormatOptions, locale?: string): string;
  formatDate(value: Date | number, options?: Intl.DateTimeFormatOptions, locale?: string): string;
  formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, options?: Intl.RelativeTimeFormatOptions, locale?: string): string;
  formatList(value: Iterable<string>, options?: Intl.ListFormatOptions, locale?: string): string;
  getPluralCategory(value: number, options?: Intl.PluralRulesOptions, locale?: string): Intl.LDMLPluralRule;
  getConfig(): Readonly<Record<string, unknown>>;
  dispose(): void;
}
export class RuntimeError extends Error { code: string; details: Record<string, unknown>; }
export class RuntimeValidationError extends RuntimeError {}
export class RuntimeLoadError extends RuntimeError {}
export function canonicalizeLocale(locale: string, fallback?: string): string;
export function requireValidLocale(locale: string, label?: string): string;
export function createRuntime(options?: RuntimeOptions): UniversalRuntime;
export function initRuntime(options?: RuntimeOptions): Promise<UniversalRuntime>;
