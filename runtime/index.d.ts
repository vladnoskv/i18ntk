// runtime/index.d.ts
// Public runtime API types for i18ntk

export interface InitOptions {
  baseDir?: string;
  language?: string;
  fallbackLanguage?: string;
  keySeparator?: string;
  preload?: boolean;
}

export type TranslateParams = Record<string, unknown>;

export function translate(key: string, params?: TranslateParams): string;
export const t: typeof translate;

export function initRuntime(options?: InitOptions): {
  t: typeof translate;
  translate: typeof translate;
  setLanguage: typeof setLanguage;
  getLanguage: typeof getLanguage;
  getAvailableLanguages: typeof getAvailableLanguages;
  refresh: typeof refresh;
};

export function setLanguage(lang: string): void;
export function getLanguage(): string;
export function getAvailableLanguages(): string[];
export function refresh(lang?: string): void;
