'use strict';

const { createRuntime, initRuntime, RuntimeLoadError } = require('./core');

function createFetchLoader(options = {}) {
  const fetchImpl = options.fetch || globalThis.fetch;
  if (typeof fetchImpl !== 'function') throw new RuntimeLoadError('Fetch API is not available');
  const template = options.url || '/locales/{locale}/{namespace}.json';
  return {
    async load(locale, namespaces = ['common']) {
      const requested = namespaces && namespaces.length ? namespaces : ['common'];
      const entries = await Promise.all(requested.map(async namespace => {
        const url = template.replace('{locale}', encodeURIComponent(locale)).replace('{namespace}', encodeURIComponent(namespace));
        const response = await fetchImpl(url, { signal: options.signal, headers: options.headers });
        if (!response.ok) throw new RuntimeLoadError(`Locale request failed with HTTP ${response.status}`, { locale, namespace, status: response.status });
        return [namespace, await response.json()];
      }));
      return Object.fromEntries(entries);
    }
  };
}

module.exports = { createRuntime, initRuntime, createFetchLoader };
