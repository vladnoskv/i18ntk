export { createRuntime, initRuntime } from './core';
export function createFetchLoader(options?: { url?: string; fetch?: typeof fetch; headers?: HeadersInit; signal?: AbortSignal }): import('./core').RuntimeLoader;
