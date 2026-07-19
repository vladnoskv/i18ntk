'use strict';

const { createRuntime, initRuntime } = require('./core');

function createStaticLoader(resources = {}) {
  return {
    async listLocales() { return Object.keys(resources); },
    async load(locale, namespaces) {
      const localeResources = resources[locale] || {};
      if (!namespaces) return localeResources;
      return Object.fromEntries(namespaces.filter(name => localeResources[name] !== undefined).map(name => [name, localeResources[name]]));
    }
  };
}

module.exports = { createRuntime, initRuntime, createStaticLoader };
