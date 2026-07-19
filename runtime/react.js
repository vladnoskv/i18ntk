'use strict';

function createReactBindings(React) {
  if (!React?.createContext || !React?.useContext || !React?.useSyncExternalStore) {
    throw new TypeError('createReactBindings requires React 18 or newer');
  }
  const RuntimeContext = React.createContext(null);
  const stores = new WeakMap();
  function getStore(runtime) {
    let store = stores.get(runtime);
    if (store) return store;
    store = {
      revision: 0,
      getSnapshot: () => store.revision,
      subscribe: notify => runtime.subscribe(() => { store.revision++; notify(); })
    };
    stores.set(runtime, store);
    return store;
  }
  function I18nProvider({ runtime, children }) {
    if (!runtime) throw new TypeError('I18nProvider requires a preloaded runtime instance');
    return React.createElement(RuntimeContext.Provider, { value: runtime }, children);
  }
  function useRuntime() {
    const runtime = React.useContext(RuntimeContext);
    if (!runtime) throw new Error('i18ntk hooks must be used within I18nProvider');
    return runtime;
  }
  function useLocale() {
    const runtime = useRuntime();
    return React.useSyncExternalStore(runtime.subscribe, runtime.getLocale, runtime.getLocale);
  }
  function useTranslation(namespace) {
    const runtime = useRuntime();
    const store = getStore(runtime);
    React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    return React.useCallback((key, params, options) => runtime.t(key, params, { ...options, namespace: options?.namespace || namespace }), [runtime, namespace]);
  }
  return { RuntimeContext, I18nProvider, useRuntime, useLocale, useTranslation };
}

module.exports = { createReactBindings };
