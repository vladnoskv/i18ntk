import type { UniversalRuntime } from './core';
export function createReactBindings(React: typeof import('react')): {
  RuntimeContext: import('react').Context<UniversalRuntime | null>;
  I18nProvider(props: { runtime: UniversalRuntime; children?: import('react').ReactNode }): import('react').ReactElement;
  useRuntime(): UniversalRuntime;
  useLocale(): string;
  useTranslation(namespace?: string): UniversalRuntime['t'];
};
