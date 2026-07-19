'use strict';

// Universal runtime core. This module intentionally imports no Node.js APIs so
// it can run in browsers, Edge workers, React Native, Deno, Bun, and SSR bundles.

class RuntimeError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
  }
}

class RuntimeValidationError extends RuntimeError {
  constructor(message, details) { super(message, 'I18NTK_RUNTIME_VALIDATION', details); }
}

class RuntimeLoadError extends RuntimeError {
  constructor(message, details) { super(message, 'I18NTK_RUNTIME_LOAD', details); }
}

function canonicalizeLocale(value, fallback = 'en') {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const locale = value.trim().replace(/_/g, '-');
  try { return Intl.getCanonicalLocales(locale)[0] || fallback; }
  catch (_) { return fallback; }
}

function requireValidLocale(value, label = 'locale') {
  if (typeof value !== 'string' || !value.trim() || value.length > 100) {
    throw new RuntimeValidationError(`${label} must be a valid locale identifier`, { value });
  }
  const locale = value.trim().replace(/_/g, '-');
  try {
    const canonical = Intl.getCanonicalLocales(locale)[0];
    if (!canonical) throw new Error('Locale is empty');
    return canonical;
  } catch (_) {
    throw new RuntimeValidationError(`${label} must be a valid locale identifier`, { value });
  }
}

function cloneResource(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) throw new RuntimeValidationError('Translation resources cannot contain cycles');
  seen.add(value);
  if (Array.isArray(value)) return value.map(item => cloneResource(item, seen));
  const result = Object.create(null);
  for (const [key, child] of Object.entries(value)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') continue;
    result[key] = cloneResource(child, seen);
  }
  seen.delete(value);
  return result;
}

function deepMerge(target, source) {
  const output = cloneResource(target || {});
  for (const [key, value] of Object.entries(source || {})) {
    const current = output[key];
    output[key] = value && typeof value === 'object' && !Array.isArray(value) &&
      current && typeof current === 'object' && !Array.isArray(current)
      ? deepMerge(current, value)
      : cloneResource(value);
  }
  return output;
}

function resolvePath(resource, key, separator) {
  let current = resource;
  for (const segment of key.split(separator)) {
    if (!current || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, segment)) return undefined;
    current = current[segment];
  }
  return current;
}

function fallbackChain(locale, fallbackLocale) {
  const result = [];
  const add = value => { if (value && !result.includes(value)) result.push(value); };
  const addWithParents = value => {
    const canonical = canonicalizeLocale(value, '');
    if (!canonical) return;
    const parts = canonical.split('-');
    while (parts.length) { add(parts.join('-')); parts.pop(); }
  };
  addWithParents(locale);
  addWithParents(fallbackLocale);
  return result;
}

function interpolate(value, params) {
  if (typeof value !== 'string') return value;
  const safeParams = params && typeof params === 'object' ? params : {};
  return value.replace(/\{\{?(\w+)\}?\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(safeParams, name) ? String(safeParams[name]) : match);
}

function createRuntime(options = {}) {
  const config = {
    locale: requireValidLocale(options.locale || options.language || options.defaultLanguage || 'en', 'locale'),
    fallbackLocale: requireValidLocale(options.fallbackLocale || options.fallbackLanguage || 'en', 'fallbackLocale'),
    keySeparator: typeof options.keySeparator === 'string' && options.keySeparator ? options.keySeparator : '.',
    missingKeyPolicy: options.missingKeyPolicy || 'key',
    loadErrorPolicy: options.loadErrorPolicy || 'throw',
    maxKeyLength: Number.isInteger(options.maxKeyLength) ? Math.max(1, Math.min(options.maxKeyLength, 10000)) : 1000
  };
  const resources = new Map();
  const discoveredLocales = new Set();
  const listeners = new Set();
  const plugins = [];
  const diagnostics = [];
  const inFlight = new Map();
  let disposed = false;
  const metrics = { translationCount: 0, translationDurationMsTotal: 0, missingKeyCount: 0, loadCount: 0, loadErrorCount: 0 };

  const assertActive = () => { if (disposed) throw new RuntimeError('Runtime has been disposed', 'I18NTK_RUNTIME_DISPOSED'); };
  const emit = event => {
    for (const listener of [...listeners]) {
      try { listener(Object.freeze({ ...event })); }
      catch (_) { /* Listener failures must not corrupt runtime state. */ }
    }
  };
  const addDiagnostic = diagnostic => {
    const safe = Object.freeze({ timestamp: new Date().toISOString(), ...diagnostic });
    diagnostics.push(safe);
    if (diagnostics.length > 100) diagnostics.shift();
    emit({ type: 'diagnostic', diagnostic: safe });
  };
  const localeNamespaces = locale => {
    const canonical = requireValidLocale(locale);
    if (!resources.has(canonical)) resources.set(canonical, new Map());
    return resources.get(canonical);
  };
  const resolveLocales = translateOptions => ({
    locale: requireValidLocale(translateOptions.locale || translateOptions.language || config.locale, 'locale'),
    fallbackLocale: requireValidLocale(
      translateOptions.fallbackLocale || translateOptions.fallbackLanguage || config.fallbackLocale,
      'fallbackLocale'
    )
  });

  const runtime = {
    t(key, params = {}, translateOptions = {}) {
      assertActive();
      if (typeof key !== 'string' || !key || key.length > config.maxKeyLength) {
        const error = new RuntimeValidationError('Translation key must be a non-empty string within maxKeyLength', { keyType: typeof key });
        emit({ type: 'translationError', error });
        throw error;
      }
      const started = Date.now();
      const { locale, fallbackLocale } = resolveLocales(translateOptions);
      const namespace = translateOptions.namespace || 'default';
      let value;
      let resolvedLocale;
      for (const candidate of fallbackChain(locale, fallbackLocale)) {
        const namespaceResource = resources.get(candidate)?.get(namespace);
        value = resolvePath(namespaceResource, key, config.keySeparator);
        if (value !== undefined) { resolvedLocale = candidate; break; }
      }
      if (value === undefined) {
        metrics.missingKeyCount++;
        const event = { type: 'missingKey', key, locale, namespace };
        addDiagnostic({ category: 'missing-key', key, locale, namespace });
        const policy = translateOptions.missingKeyPolicy || config.missingKeyPolicy;
        if (policy === 'throw') throw new RuntimeError(`Missing translation key: ${key}`, 'I18NTK_RUNTIME_MISSING_KEY', event);
        value = typeof policy === 'function' ? policy(event) : policy === 'empty' ? '' : key;
      }
      value = interpolate(value, params);
      for (const plugin of plugins) {
        if (typeof plugin.transform !== 'function') continue;
        try { value = plugin.transform(value, params, { ...translateOptions, locale, namespace }); }
        catch (error) {
          addDiagnostic({ category: 'plugin-error', plugin: plugin.name, code: error?.code, message: error?.message || String(error) });
          emit({ type: 'translationError', key, locale, namespace, plugin: plugin.name, error });
        }
      }
      metrics.translationCount++;
      metrics.translationDurationMsTotal += Date.now() - started;
      emit({ type: 'translation', key, locale: resolvedLocale || locale, namespace, value });
      return typeof value === 'string' ? value : String(value ?? '');
    },
    translate(key, params, translateOptions) { return runtime.t(key, params, translateOptions); },
    has(key, translateOptions = {}) {
      if (typeof key !== 'string' || !key) return false;
      const { locale, fallbackLocale } = resolveLocales(translateOptions);
      const namespace = translateOptions.namespace || 'default';
      return fallbackChain(locale, fallbackLocale)
        .some(candidate => resolvePath(resources.get(candidate)?.get(namespace), key, config.keySeparator) !== undefined);
    },
    translateBatch(keys, params = {}, translateOptions = {}) {
      return Array.isArray(keys) ? keys.map((key, index) => runtime.t(key, Array.isArray(params) ? params[index] || {} : params, translateOptions)) : [];
    },
    setLocale(locale) {
      assertActive();
      const next = requireValidLocale(locale);
      if (next !== config.locale) { const previous = config.locale; config.locale = next; emit({ type: 'localeChanged', locale: next, previous }); }
    },
    setLanguage(locale) { runtime.setLocale(locale); },
    getLocale() { return config.locale; },
    getLanguage() { return config.locale; },
    listLocales() { return [...new Set([...discoveredLocales, ...resources.keys()])].sort(); },
    getAvailableLanguages() { return runtime.listLocales(); },
    addResources(locale, namespace = 'default', data, resourceOptions = {}) {
      assertActive();
      if (typeof namespace !== 'string' || !namespace || !data || typeof data !== 'object') {
        throw new RuntimeValidationError('Resources require a namespace and object data');
      }
      const current = localeNamespaces(locale).get(namespace) || {};
      const precedence = resourceOptions.precedence || 'override';
      if (precedence !== 'override' && precedence !== 'fallback') {
        throw new RuntimeValidationError('Resource precedence must be override or fallback', { precedence });
      }
      localeNamespaces(locale).set(namespace, precedence === 'fallback' ? deepMerge(data, current) : deepMerge(current, data));
      emit({ type: 'resourcesChanged', locale: requireValidLocale(locale), namespace });
      return runtime;
    },
    removeResources(locale, namespace) {
      const canonical = requireValidLocale(locale);
      if (!resources.has(canonical)) return;
      if (namespace) resources.get(canonical).delete(namespace); else resources.delete(canonical);
      emit({ type: 'resourcesChanged', locale: canonical, namespace: namespace || null });
    },
    async load(locale = config.locale, namespaces) {
      assertActive();
      if (!options.loader || typeof options.loader.load !== 'function') return runtime;
      const canonical = requireValidLocale(locale);
      const requested = namespaces === undefined ? undefined : (Array.isArray(namespaces) ? namespaces : [namespaces]);
      const loadKey = `${canonical}\0${(requested || []).join(',')}`;
      if (inFlight.has(loadKey)) return inFlight.get(loadKey);
      const promise = Promise.resolve().then(() => options.loader.load(canonical, requested)).then(loaded => {
        if (disposed) return runtime;
        if (!loaded || typeof loaded !== 'object') throw new RuntimeLoadError('Loader returned an invalid resource', { locale: canonical });
        const namespaced = requested || loaded.default !== undefined || Object.keys(loaded).some(key => key !== 'default');
        if (namespaced) Object.entries(loaded).forEach(([namespace, data]) => runtime.addResources(canonical, namespace, data));
        else runtime.addResources(canonical, 'default', loaded);
        metrics.loadCount++;
        return runtime;
      }).catch(error => {
        metrics.loadErrorCount++;
        const wrapped = error instanceof RuntimeError ? error : new RuntimeLoadError(error.message, { locale: canonical });
        addDiagnostic({ category: 'load-error', locale: canonical, code: wrapped.code, message: wrapped.message });
        if (config.loadErrorPolicy === 'throw') throw wrapped;
        return runtime;
      }).finally(() => inFlight.delete(loadKey));
      inFlight.set(loadKey, promise);
      return promise;
    },
    async refresh(locale = config.locale, namespaces) {
      runtime.removeResources(locale);
      return runtime.load(locale, namespaces);
    },
    async refreshLocales() {
      assertActive();
      if (!options.loader || typeof options.loader.listLocales !== 'function') return runtime.listLocales();
      try {
        const listed = await options.loader.listLocales();
        if (!Array.isArray(listed)) throw new RuntimeLoadError('Loader listLocales() must return an array');
        const next = listed.map(locale => requireValidLocale(locale, 'loader locale'));
        discoveredLocales.clear();
        next.forEach(locale => discoveredLocales.add(locale));
        return runtime.listLocales();
      } catch (error) {
        const wrapped = error instanceof RuntimeError ? error : new RuntimeLoadError(error.message);
        metrics.loadErrorCount++;
        addDiagnostic({ category: 'load-error', operation: 'list-locales', code: wrapped.code, message: wrapped.message });
        if (config.loadErrorPolicy === 'throw') throw wrapped;
        return runtime.listLocales();
      }
    },
    subscribe(listener) {
      if (typeof listener !== 'function') throw new RuntimeValidationError('Runtime listener must be a function');
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    addPlugin(plugin) {
      if (!plugin || typeof plugin !== 'object' || typeof plugin.name !== 'string') throw new RuntimeValidationError('Plugin requires a name');
      if (plugins.some(existing => existing.name === plugin.name)) throw new RuntimeValidationError(`Plugin already registered: ${plugin.name}`);
      plugins.push(plugin);
      return () => runtime.removePlugin(plugin.name);
    },
    removePlugin(name) {
      const index = plugins.findIndex(plugin => plugin.name === name);
      if (index >= 0) plugins.splice(index, 1);
    },
    getDiagnostics() { return diagnostics.map(item => ({ ...item })); },
    getMetrics() {
      return {
        ...metrics,
        averageTranslationDurationMs: metrics.translationCount ? metrics.translationDurationMsTotal / metrics.translationCount : 0
      };
    },
    formatNumber(value, formatOptions, locale = config.locale) { return new Intl.NumberFormat(locale, formatOptions).format(value); },
    formatDate(value, formatOptions, locale = config.locale) { return new Intl.DateTimeFormat(locale, formatOptions).format(value); },
    formatRelativeTime(value, unit, formatOptions, locale = config.locale) { return new Intl.RelativeTimeFormat(locale, formatOptions).format(value, unit); },
    formatList(value, formatOptions, locale = config.locale) { return new Intl.ListFormat(locale, formatOptions).format(value); },
    getPluralCategory(value, pluralOptions, locale = config.locale) { return new Intl.PluralRules(locale, pluralOptions).select(value); },
    getConfig() { return Object.freeze({ ...config }); },
    dispose() {
      if (disposed) return;
      disposed = true;
      resources.clear(); listeners.clear(); plugins.length = 0; inFlight.clear();
    }
  };

  for (const [locale, localeResources] of Object.entries(options.resources || {})) {
    const looksNamespaced = localeResources && typeof localeResources === 'object' &&
      Object.values(localeResources).some(value => value && typeof value === 'object' && !Array.isArray(value));
    if (looksNamespaced && options.resourcesAreNamespaced !== false) {
      for (const [namespace, data] of Object.entries(localeResources)) runtime.addResources(locale, namespace, data);
    } else runtime.addResources(locale, 'default', localeResources);
  }
  return runtime;
}

async function initRuntime(options = {}) {
  const runtime = createRuntime(options);
  if (options.loader && typeof options.loader.listLocales === 'function') await runtime.refreshLocales();
  if (options.loader && options.preload !== false) {
    await runtime.load(runtime.getLocale(), options.namespaces);
    const fallback = runtime.getConfig().fallbackLocale;
    if (fallback && fallback !== runtime.getLocale()) await runtime.load(fallback, options.namespaces);
  }
  return runtime;
}

module.exports = {
  createRuntime,
  initRuntime,
  canonicalizeLocale,
  requireValidLocale,
  RuntimeError,
  RuntimeValidationError,
  RuntimeLoadError
};
