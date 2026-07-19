export { createRuntime, initRuntime } from './core';
export function createStaticLoader(resources?: Record<string, Record<string, Record<string, unknown>>>): import('./core').RuntimeLoader;
